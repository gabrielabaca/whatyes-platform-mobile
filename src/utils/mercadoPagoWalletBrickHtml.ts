/**
 * Wallet Brick de MP en WebView: evita abrir checkout/v1/redirect (loops en sandbox/emulador).
 */
export function getMercadoPagoWalletBrickHtml(publicKey: string, preferenceId: string): string {
  const key = publicKey.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const pref = preferenceId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background: #02050F;
    }
    #walletBrick_container {
      min-height: 120px;
      padding: 16px 8px;
    }
    #status {
      color: rgba(255,255,255,0.7);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      text-align: center;
      padding: 8px;
    }
    #error {
      color: #ff6b6b;
      font-size: 12px;
      text-align: center;
      padding: 8px;
      display: none;
    }
  </style>
</head>
<body>
  <div id="status">Cargando Mercado Pago…</div>
  <div id="error"></div>
  <div id="walletBrick_container"></div>
  <script>
    (function() {
      var publicKey = '${key}';
      var preferenceId = '${pref}';

      function post(obj) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(obj));
        }
      }

      function showError(msg) {
        var el = document.getElementById('error');
        el.style.display = 'block';
        el.textContent = msg || 'Error';
        post({ type: 'error', message: msg });
      }

      function initBrick() {
        if (typeof MercadoPago !== 'function') {
          showError('No se pudo cargar Mercado Pago');
          return;
        }
        try {
          var mp = new MercadoPago(publicKey, { locale: 'es-AR' });
          mp.bricks().create('wallet', 'walletBrick_container', {
            initialization: {
              preferenceId: preferenceId,
              redirectMode: 'self',
            },
            customization: {
              theme: 'default',
              texts: { valueProp: 'practicality' },
            },
            callbacks: {
              onReady: function() {
                document.getElementById('status').style.display = 'none';
                post({ type: 'ready' });
              },
              onError: function(err) {
                var msg = (err && err.message) ? err.message : 'Error en Mercado Pago';
                showError(msg);
              },
            },
          });
        } catch (e) {
          showError(e && e.message ? e.message : 'Error al iniciar Wallet Brick');
        }
      }

      function loadSdk() {
        if (typeof MercadoPago === 'function') {
          initBrick();
          return;
        }
        var s = document.createElement('script');
        s.src = 'https://sdk.mercadopago.com/js/v2';
        s.async = true;
        s.onload = initBrick;
        s.onerror = function() { showError('No se pudo descargar el SDK'); };
        document.head.appendChild(s);
      }

      loadSdk();
    })();
  </script>
</body>
</html>`;
}
