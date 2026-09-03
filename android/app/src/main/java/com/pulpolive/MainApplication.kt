package com.pulpolive

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.os.Build
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
        add(LivePipPackage())
      },
    )
  }

  override fun onCreate() {
    configureWebRtcAudioForLivePlayback()
    createDefaultNotificationChannel()
    super.onCreate()
    loadReactNative(this)
  }

  /**
   * Canal por defecto de FCM (`pulpo_default`). targetSdk 36 exige un canal
   * para que las notificaciones se muestren; el meta-data del manifest apunta acá.
   */
  private fun createDefaultNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(
      "pulpo_default",
      "PulpoLive",
      NotificationManager.IMPORTANCE_HIGH,
    )
    channel.description = "Avisos de vivos, compras y mensajes"
    channel.enableVibration(true)
    val manager = getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(channel)
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
