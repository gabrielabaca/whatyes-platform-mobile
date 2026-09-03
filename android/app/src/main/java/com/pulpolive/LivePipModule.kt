package com.pulpolive

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

/**
 * Puente JS del Picture-in-Picture del vivo (ver LivePipNative.ts).
 * Solo habilita/deshabilita el modo en MainActivity; entrar y salir lo maneja
 * la activity (autoEnter en API 31+, onUserLeaveHint en 26–30) y se reporta
 * a JS por el evento "LivePip:modeChanged".
 */
class LivePipModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "LivePip"

    @ReactMethod
    fun setEnabled(enabled: Boolean, promise: Promise) {
        val activity = currentActivity as? MainActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }
        UiThreadUtil.runOnUiThread {
            try {
                activity.setLivePipEnabled(enabled)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("live_pip", e)
            }
        }
    }

    // Requeridos por NativeEventEmitter (no-op: emitimos por RCTDeviceEventEmitter).
    @ReactMethod
    fun addListener(eventName: String) = Unit

    @ReactMethod
    fun removeListeners(count: Int) = Unit
}
