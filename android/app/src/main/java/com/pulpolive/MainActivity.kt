package com.pulpolive

import android.app.PictureInPictureParams
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.Rational
import android.view.View
import com.facebook.react.ReactActivity
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    window.navigationBarColor = Color.rgb(231, 231, 255)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      window.decorView.systemUiVisibility =
          window.decorView.systemUiVisibility or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
    }

    SystemNavigationBar.hide(window)
  }

  /**
   * singleTask: un tap en la notificación con la app viva llega acá, no a onCreate.
   * Sin esto, RN Firebase no ve los extras del push y el destino se pierde.
   */
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
  }

  override fun onResume() {
    super.onResume()
    SystemNavigationBar.hide(window)
  }

  /**
   * Al recuperar el foco (volver de background, cerrar el teclado, cerrar un diálogo nativo)
   * el sistema puede restaurar la barra de navegación: la volvemos a ocultar.
   */
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      SystemNavigationBar.hide(window)
    }
  }

  // ---- Picture-in-Picture del vivo del vendedor (LivePipModule) -------------
  //
  // Solo se habilita mientras SellerStreamScreen tiene un vivo activo; en el resto
  // de la app la activity no entra a PiP. El vivo queda PAUSADO en la ventanita
  // (lo decide JS por AppState: PiP pasa la activity a onPause → "background").
  // Los configChanges del manifest (screenSize|smallestScreenSize|screenLayout|
  // orientation) evitan que la transición recree la activity.
  private var livePipEnabled = false

  fun setLivePipEnabled(enabled: Boolean) {
    livePipEnabled = enabled
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    try {
      // API 31+: autoEnter hace que el sistema entre a PiP con el gesto de home /
      // recientes. Deshabilitarlo también quita el PiP si el vivo terminó.
      setPictureInPictureParams(buildLivePipParams(autoEnter = enabled))
    } catch (_: Exception) {
      // Dispositivo sin PiP: el vivo igual se pausa por AppState.
    }
  }

  private fun buildLivePipParams(autoEnter: Boolean): PictureInPictureParams {
    val builder = PictureInPictureParams.Builder().setAspectRatio(Rational(9, 16))
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      builder.setAutoEnterEnabled(autoEnter)
      builder.setSeamlessResizeEnabled(false)
    }
    return builder.build()
  }

  /** API 26–30: sin autoEnter, se entra a mano cuando el usuario se va a home. */
  override fun onUserLeaveHint() {
    super.onUserLeaveHint()
    if (!livePipEnabled) return
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) return
    if (isInPictureInPictureMode) return
    try {
      enterPictureInPictureMode(buildLivePipParams(autoEnter = false))
    } catch (_: Exception) {
      // Sin PiP disponible: nada que hacer.
    }
  }

  override fun onPictureInPictureModeChanged(
      isInPictureInPictureMode: Boolean,
      newConfig: Configuration,
  ) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    val reactContext = (application as ReactApplication).reactHost.currentReactContext ?: return
    reactContext.emitDeviceEvent(
        "LivePip:modeChanged",
        Arguments.createMap().apply { putBoolean("inPip", isInPictureInPictureMode) },
    )
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "PulpoLive"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
