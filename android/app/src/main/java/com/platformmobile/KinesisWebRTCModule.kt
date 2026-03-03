package com.platformmobile

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Módulo para Kinesis Video WebRTC (Master/Viewer).
 * Stub: rechaza con WEBRTC_NOT_IMPLEMENTED para que la app haga fallback a ingest/HLS.
 * Para implementar: integrar amazon-kinesis-video-streams-webrtc-sdk-android y usar
 * channel_arn + credenciales para ConnectAsMaster/ConnectAsViewer.
 */
private const val TAG = "KinesisWebRTCModule"

class KinesisWebRTCModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "KinesisWebRTC"

    @ReactMethod
    fun startMaster(
        channelArn: String,
        region: String,
        accessKeyId: String,
        secretAccessKey: String,
        sessionToken: String?,
        promise: Promise
    ) {
        Log.w(TAG, "startMaster: WebRTC not implemented yet, use fallback (ingest)")
        promise.reject("WEBRTC_NOT_IMPLEMENTED", "Kinesis WebRTC Master not implemented yet")
    }

    @ReactMethod
    fun stopMaster(promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun startViewer(
        channelArn: String,
        region: String,
        accessKeyId: String,
        secretAccessKey: String,
        sessionToken: String?,
        promise: Promise
    ) {
        Log.w(TAG, "startViewer: WebRTC not implemented yet, use fallback (HLS)")
        promise.reject("WEBRTC_NOT_IMPLEMENTED", "Kinesis WebRTC Viewer not implemented yet")
    }

    @ReactMethod
    fun stopViewer(promise: Promise) {
        promise.resolve(null)
    }
}
