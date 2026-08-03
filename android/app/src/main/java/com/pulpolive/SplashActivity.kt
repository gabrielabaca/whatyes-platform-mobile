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
 */
class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)
        SystemNavigationBar.hide(window)

        val versionLabel = findViewById<TextView>(R.id.splash_version)
        versionLabel.text = "V${BuildConfig.VERSION_NAME}"

        Handler(Looper.getMainLooper()).postDelayed({
            startActivity(Intent(this, MainActivity::class.java))
            finish()
        }, SPLASH_DELAY_MS)
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
