package com.pulpolive

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * Pantalla de carga con logo PulpoLive y versión.
 * Tras un breve delay inicia MainActivity (React Native).
 *
 * El launcher es esta activity, no MainActivity: un tap en una notificación FCM
 * abre acá. Hay que copiar extras/data al Intent de MainActivity o el destino
 * del push se pierde.
 */
class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)
        SystemNavigationBar.hide(window)

        val versionLabel = findViewById<TextView>(R.id.splash_version)
        versionLabel.text = "V${BuildConfig.VERSION_NAME}"

        val delayMs = if (isFromPush()) 0L else SPLASH_DELAY_MS
        Handler(Looper.getMainLooper()).postDelayed({
            startActivity(buildMainIntent())
            finish()
        }, delayMs)
    }

    private fun isFromPush(): Boolean {
        val extras = intent.extras ?: return false
        return extras.containsKey("google.message_id")
            || extras.containsKey("gcm.n.e")
            || extras.containsKey("google.sent_time")
            || extras.containsKey("type")
    }

    private fun buildMainIntent(): Intent {
        val next = Intent(this, MainActivity::class.java)
        next.addFlags(
            Intent.FLAG_ACTIVITY_CLEAR_TOP
                or Intent.FLAG_ACTIVITY_SINGLE_TOP
                or Intent.FLAG_ACTIVITY_NEW_TASK
        )
        intent.extras?.let { next.putExtras(it) }
        intent.data?.let { next.data = it }
        intent.action?.let { next.action = it }
        return next
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            SystemNavigationBar.hide(window)
        }
    }

    companion object {
        private const val SPLASH_DELAY_MS = 1500L
    }
}
