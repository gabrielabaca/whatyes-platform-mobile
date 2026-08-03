package com.pulpolive

import android.app.Application
import android.media.AudioAttributes
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.oney.WebRTCModule.WebRTCModuleOptions
import org.webrtc.audio.JavaAudioDeviceModule

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages.apply {
        add(RecordingStoragePackage())
        add(IvsStagePackage())
      },
    )
  }

  override fun onCreate() {
    configureWebRtcAudioForLivePlayback()
    super.onCreate()
    loadReactNative(this)
  }

  /**
   * Sin esto, WebRTC usa el perfil de voz (STREAM_VOICE_CALL); el volumen y la ruta siguen el canal de llamada.
   * USAGE_MEDIA acerca el comportamiento al del reproductor / altavoz principal.
   */
  private fun configureWebRtcAudioForLivePlayback() {
    val attrs =
      AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_MOVIE)
        .build()
    WebRTCModuleOptions.getInstance().audioDeviceModule =
      JavaAudioDeviceModule.builder(this).setAudioAttributes(attrs).createAudioDeviceModule()
  }
}
