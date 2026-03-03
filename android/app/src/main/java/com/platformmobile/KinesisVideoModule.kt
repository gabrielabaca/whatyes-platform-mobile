package com.platformmobile

import android.util.Log
import com.amazonaws.auth.AWSCredentials
import com.amazonaws.auth.AWSCredentialsProvider
import com.amazonaws.auth.BasicAWSCredentials
import com.amazonaws.auth.BasicSessionCredentials
import com.amazonaws.regions.Regions
import com.amazonaws.kinesisvideo.client.KinesisVideoClient
import com.amazonaws.kinesisvideo.internal.client.mediasource.MediaSource
import com.amazonaws.mobileconnectors.kinesisvideo.client.KinesisVideoAndroidClientFactory
import com.amazonaws.mobileconnectors.kinesisvideo.mediasource.android.AndroidCameraMediaSource
import com.amazonaws.mobileconnectors.kinesisvideo.mediasource.android.AndroidCameraMediaSourceConfiguration
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

private const val TAG = "KinesisVideoModule"

// Camera.CameraInfo.CAMERA_FACING_FRONT = 1
private const val CAMERA_FACING_FRONT = 1

class KinesisVideoModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "KinesisVideo"

    private var kinesisVideoClient: KinesisVideoClient? = null
    private var mediaSource: MediaSource? = null

    @ReactMethod
    fun startStream(
        streamName: String,
        regionStr: String,
        accessKeyId: String,
        secretAccessKey: String,
        sessionToken: String?,
        promise: Promise
    ) {
        try {
            if (kinesisVideoClient != null) {
                promise.reject("ALREADY_STREAMING", "Stream already started")
                return
            }
            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity")
                return
            }
            val region = try {
                Regions.fromName(regionStr.replace("-", "_"))
            } catch (_: Exception) {
                Regions.US_EAST_1
            }
            val creds: AWSCredentials = if (!sessionToken.isNullOrBlank()) {
                BasicSessionCredentials(accessKeyId, secretAccessKey, sessionToken)
            } else {
                BasicAWSCredentials(accessKeyId, secretAccessKey)
            }
            val credentialsProvider = object : AWSCredentialsProvider {
                override fun getCredentials(): AWSCredentials = creds
                override fun refresh() {}
            }
            val client = KinesisVideoAndroidClientFactory.createKinesisVideoClient(
                activity,
                region,
                credentialsProvider
            )
            kinesisVideoClient = client
            val configBuilder = AndroidCameraMediaSourceConfiguration.builder()
                .withFrameRate(30)
                .withHorizontalResolution(1280)
                .withVerticalResolution(720)
                .withCameraFacing(CAMERA_FACING_FRONT)
                .withRetentionPeriodInHours(24)
                .withEncodingMimeType("video/avc")
                .withIsEncoderHardwareAccelerated(true)
                .withEncodingBitRate(2_000_000)
            val config = configBuilder.build()
            val source = client.createMediaSource(streamName, config)
            mediaSource = source
            (source as? AndroidCameraMediaSource)?.start()
                ?: run {
                    promise.reject("CREATE_SOURCE", "Failed to create or start AndroidCameraMediaSource")
                    return
                }
            Log.i(TAG, "Kinesis stream started: $streamName")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "startStream error", e)
            cleanup()
            promise.reject("START_FAILED", e.message ?: "Unknown error", e)
        }
    }

    @ReactMethod
    fun stopStream(promise: Promise) {
        try {
            cleanup()
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "stopStream error", e)
            promise.reject("STOP_FAILED", e.message ?: "Unknown error", e)
        }
    }

    private fun cleanup() {
        val source = mediaSource
        val client = kinesisVideoClient
        try {
            (source as? AndroidCameraMediaSource)?.stop()
            if (source != null && client != null) client.unregisterMediaSource(source)
            client?.free()
        } catch (_: Exception) { }
        kinesisVideoClient = null
        mediaSource = null
    }
}
