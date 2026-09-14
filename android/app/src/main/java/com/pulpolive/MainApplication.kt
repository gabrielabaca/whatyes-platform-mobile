package com.pulpolive

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.net.Uri
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
   * FCM channels. `pulpo_default` is the manifest fallback (system sound).
   * The other four IDs must match `push_service.py` (`_PUSH_SOUND_BY_TYPE`).
   *
   * A channel is IMMUTABLE once created on a device: sound and importance
   * cannot be changed. Shipping a new sound requires a new channel ID and a
   * migration; `createNotificationChannel()` will not update an existing one.
   */
  private fun createDefaultNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java)

    val defaultChannel = NotificationChannel(
      "pulpo_default",
      "PulpoLive",
      NotificationManager.IMPORTANCE_HIGH,
    )
    defaultChannel.description = "Avisos de vivos, compras y mensajes"
    defaultChannel.enableVibration(true)
    manager.createNotificationChannel(defaultChannel)

    val attrs =
      AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
    createSoundChannel(manager, "pulpo_wins", "Compras ganadas", "Ganaste una subasta, una compra o un sorteo", "win_celebration", attrs)
    createSoundChannel(manager, "pulpo_live", "Vivos", "Un vendedor al que seguís acaba de salir en vivo", "push_live_start", attrs)
    createSoundChannel(manager, "pulpo_sales", "Ventas", "Se vendió un producto de tu catálogo", "push_product_sold", attrs)
    createSoundChannel(manager, "pulpo_payments", "Pagos", "Tu compra necesita una acción para completar el pago", "push_payment_action", attrs)
  }

  private fun createSoundChannel(
    manager: NotificationManager,
    id: String,
    name: String,
    description: String,
    soundRes: String,
    attrs: AudioAttributes,
  ) {
    val channel = NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH)
    channel.description = description
    channel.enableVibration(true)
    channel.setSound(Uri.parse("android.resource://$packageName/raw/$soundRes"), attrs)
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
