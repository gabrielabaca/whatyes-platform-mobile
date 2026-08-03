package com.pulpolive

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import com.facebook.react.ReactActivity
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
