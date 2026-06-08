package com.pulpolive

import android.graphics.Bitmap
import android.graphics.Matrix
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.oney.WebRTCModule.WebRTCModule
import org.webrtc.VideoFrame
import org.webrtc.VideoSink
import org.webrtc.VideoTrack
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.atomic.AtomicBoolean

class LiveCoverCaptureModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "LiveCoverCapture"

    @ReactMethod
    fun captureVideoTrackFrame(trackId: String, quality: Double, promise: Promise) {
        try {
            val webrtc = reactContext.getNativeModule(WebRTCModule::class.java)
                ?: run { promise.reject("NO_WEBRTC", "WebRTC module not available"); return }

            val getLocalTrack = WebRTCModule::class.java
                .getDeclaredMethod("getLocalTrack", String::class.java)
                .also { it.isAccessible = true }

            val track = getLocalTrack.invoke(webrtc, trackId) as? VideoTrack
                ?: run { promise.reject("NO_TRACK", "Video track not found"); return }

            val captured = AtomicBoolean(false)
            val sink = object : VideoSink {
                override fun onFrame(frame: VideoFrame) {
                    if (!captured.compareAndSet(false, true)) {
                        frame.release()
                        return
                    }
                    track.removeSink(this)
                    frame.retain()
                    try {
                        val result = frameToJpeg(frame, quality)
                        promise.resolve(result)
                    } catch (e: Exception) {
                        promise.reject("CAPTURE_FAILED", e.message ?: "capture error", e)
                    } finally {
                        frame.release()
                    }
                }
            }

            track.addSink(sink)
            Handler(Looper.getMainLooper()).postDelayed({
                if (captured.compareAndSet(false, true)) {
                    track.removeSink(sink)
                    promise.reject("TIMEOUT", "No video frame received")
                }
            }, 3000)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message ?: "unknown error", e)
        }
    }

    private fun frameToJpeg(frame: VideoFrame, quality: Double): WritableMap {
        val i420 = frame.buffer.toI420()
            ?: throw IllegalStateException("Cannot convert buffer to I420")

        try {
            val srcW = i420.width
            val srcH = i420.height

            // Limitar lado máximo a 720 px para ahorrar memoria y tiempo
            val scale = if (srcW > 720 || srcH > 720) 720.0 / maxOf(srcW, srcH) else 1.0
            val dstW = ((srcW * scale).toInt()).let { if (it % 2 == 0) it else it - 1 }.coerceAtLeast(2)
            val dstH = ((srcH * scale).toInt()).let { if (it % 2 == 0) it else it - 1 }.coerceAtLeast(2)

            val pixels = IntArray(dstW * dstH)
            val dataY = i420.dataY
            val dataU = i420.dataU
            val dataV = i420.dataV
            val strideY = i420.strideY
            val strideU = i420.strideU
            val strideV = i420.strideV

            for (dy in 0 until dstH) {
                val sy = (dy / scale).toInt().coerceIn(0, srcH - 1)
                val baseY = sy * strideY
                val baseU = (sy / 2) * strideU
                val baseV = (sy / 2) * strideV
                for (dx in 0 until dstW) {
                    val sx = (dx / scale).toInt().coerceIn(0, srcW - 1)
                    val y = dataY.get(baseY + sx).toInt() and 0xFF
                    val u = (dataU.get(baseU + sx / 2).toInt() and 0xFF) - 128
                    val v = (dataV.get(baseV + sx / 2).toInt() and 0xFF) - 128
                    val r = (y + 1.402 * v).toInt().coerceIn(0, 255)
                    val g = (y - 0.344136 * u - 0.714136 * v).toInt().coerceIn(0, 255)
                    val b = (y + 1.772 * u).toInt().coerceIn(0, 255)
                    pixels[dy * dstW + dx] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
                }
            }

            var bitmap = Bitmap.createBitmap(pixels, dstW, dstH, Bitmap.Config.ARGB_8888)

            val rotation = frame.rotation
            if (rotation != 0) {
                val matrix = Matrix().apply { postRotate(rotation.toFloat()) }
                val rotated = Bitmap.createBitmap(bitmap, 0, 0, dstW, dstH, matrix, true)
                if (rotated !== bitmap) bitmap.recycle()
                bitmap = rotated
            }

            val q = (quality * 100.0).toInt().coerceIn(40, 90)
            val file = File(reactContext.cacheDir, "live-cover-${System.currentTimeMillis()}.jpg")
            FileOutputStream(file).use { out ->
                check(bitmap.compress(Bitmap.CompressFormat.JPEG, q, out)) { "JPEG compression failed" }
            }
            bitmap.recycle()

            return Arguments.createMap().apply {
                putString("uri", "file://${file.absolutePath}")
            }
        } finally {
            i420.release()
        }
    }
}
