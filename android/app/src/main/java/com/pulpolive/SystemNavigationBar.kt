package com.pulpolive

import android.os.Build
import android.view.View
import android.view.Window
import android.view.WindowInsets
import android.view.WindowInsetsController

/**
 * Oculta los botones de navegación del sistema (barra inferior / gesture pill) en modo
 * inmersivo "sticky": si el usuario desliza desde el borde inferior la barra reaparece
 * translúcida sobre el contenido y vuelve a ocultarse sola, sin re-layout de la app.
 *
 * Se aplica a nivel de ventana de la Activity, así el modo vale desde el splash y durante
 * todo el ciclo de vida (incluido el live como vendedor o comprador). Los `Modal` de React
 * Native copian la visibilidad de las system bars de la Activity al mostrarse
 * (ReactModalHostView#syncSystemBarsVisibility), por lo que los drawers también quedan sin
 * barra de navegación.
 */
object SystemNavigationBar {

    fun hide(window: Window) {
        // Fuerza la creación del decorView para que insetsController no sea null en onCreate.
        window.decorView

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.apply {
                systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                hide(WindowInsets.Type.navigationBars())
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                window.decorView.systemUiVisibility or
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        }
    }
}
