/**
 * HTML embebido en WebView para tokenizar tarjeta con Mercado Pago CardForm.
 * PAN/CVV nunca salen del iframe de MP.
 */
export function getMercadoPagoCardFormHtml(publicKey: string): string {
  const key = publicKey.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: transparent;
      color: #fff;
    }
    .field { margin-bottom: 12px; }
    label {
      display: block;
      font-size: 10px;
      margin-bottom: 6px;
      opacity: 0.9;
    }
    .mp-field {
      width: 100%;
      height: 48px;
      min-height: 48px;
      border: 1px solid #ddd;
      border-radius: 100px;
      padding: 0 16px;
      font-size: 14px;
      color: #fff;
      background: rgba(255,255,255,0.08);
      outline: none;
    }
    .mp-field::placeholder {
      color: rgba(255,255,255,0.45);
    }
    .mp-hidden {
      position: absolute;
      left: -9999px;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
      overflow: hidden;
    }
    #error {
      color: #ff6b6b;
      font-size: 11px;
      margin-top: 8px;
      display: none;
    }
  </style>
</head>
<body>
  <form id="mp-form">
    <div class="field">
      <label>Número de tarjeta</label>
      <input type="text" id="form-checkout__cardNumber" class="mp-field" inputmode="numeric" autocomplete="cc-number" />
    </div>
    <div class="field">
      <label>Vencimiento</label>
      <input type="text" id="form-checkout__expirationDate" class="mp-field" inputmode="numeric" autocomplete="cc-exp" />
    </div>
    <div class="field">
      <label>CVC</label>
      <input type="text" id="form-checkout__securityCode" class="mp-field" inputmode="numeric" autocomplete="cc-csc" />
    </div>
    <div class="mp-hidden" aria-hidden="true">
      <input type="text" id="form-checkout__cardholderName" />
      <select id="form-checkout__issuer"><option value="">Emisor</option></select>
      <select id="form-checkout__installments"><option value="1">1</option></select>
      <select id="form-checkout__identificationType"><option value="">Tipo</option></select>
      <input type="text" id="form-checkout__identificationNumber" />
    </div>
    <div id="error"></div>
  </form>
  <script>
    (function() {
      var publicKey = '${key}';
      var cardForm = null;
      var sdkScript = null;

      function post(obj) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(obj));
        }
      }

      function formatError(err) {
        if (!err) return 'Error desconocido';
        if (Array.isArray(err)) {
          return err.map(function(e) { return e.message || String(e); }).join(' ');
        }
        if (typeof err === 'object' && err.message) return err.message;
        return String(err);
      }

      function showError(msg) {
        var el = document.getElementById('error');
        el.style.display = 'block';
        el.textContent = msg || 'Error';
        post({ type: 'error', message: msg });
      }

      function initCardForm() {
        if (typeof MercadoPago !== 'function') {
          showError('No se pudo cargar Mercado Pago. Revisá tu conexión.');
          return;
        }
        try {
          var mp = new MercadoPago(publicKey, { locale: 'es-AR' });
          cardForm = mp.cardForm({
            amount: '100',
            iframe: false,
            form: {
              id: 'mp-form',
              cardNumber: { id: 'form-checkout__cardNumber', placeholder: 'Número' },
              expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/AA' },
              securityCode: { id: 'form-checkout__securityCode', placeholder: 'CVC' },
              cardholderName: { id: 'form-checkout__cardholderName', placeholder: 'Titular' },
              issuer: { id: 'form-checkout__issuer', placeholder: 'Emisor' },
              installments: { id: 'form-checkout__installments', placeholder: 'Cuotas' },
              identificationType: { id: 'form-checkout__identificationType', placeholder: 'Documento' },
              identificationNumber: { id: 'form-checkout__identificationNumber', placeholder: 'Número' },
            },
            callbacks: {
              onFormMounted: function(err) {
                if (err) {
                  showError(formatError(err));
                }
              },
              onReady: function() {
                post({ type: 'ready' });
              },
              onSubmit: function(event) {
                event.preventDefault();
                try {
                  var data = cardForm.getCardFormData();
                  if (!data || !data.token) {
                    showError('Completá los datos de la tarjeta.');
                    return;
                  }
                  post({
                    type: 'token',
                    token: data.token,
                    paymentMethodId: data.paymentMethodId,
                    issuerId: data.issuerId || null,
                    cardholderName: data.cardholderName || null,
                    expirationMonth: data.cardExpirationMonth
                      ? parseInt(data.cardExpirationMonth, 10)
                      : null,
                    expirationYear: data.cardExpirationYear
                      ? parseInt(data.cardExpirationYear, 10)
                      : null,
                    lastFour: data.lastFourDigits || null,
                  });
                } catch (e) {
                  showError(e && e.message ? e.message : 'No se pudo tokenizar');
                }
              },
              onFetching: function() {},
              onError: function(err) {
                showError(formatError(err));
              },
            },
          });
        } catch (e) {
          showError(e && e.message ? e.message : 'Error al iniciar el formulario de pago');
        }
      }

      function loadSdk() {
        if (typeof MercadoPago === 'function') {
          initCardForm();
          return;
        }
        sdkScript = document.createElement('script');
        sdkScript.src = 'https://sdk.mercadopago.com/js/v2';
        sdkScript.async = true;
        sdkScript.onload = function() {
          initCardForm();
        };
        sdkScript.onerror = function() {
          showError('No se pudo descargar el SDK de Mercado Pago.');
        };
        document.head.appendChild(sdkScript);
      }

      window.submitMpCardForm = function(opts) {
        opts = opts || {};
        var nameEl = document.getElementById('form-checkout__cardholderName');
        var idTypeEl = document.getElementById('form-checkout__identificationType');
        var idNumEl = document.getElementById('form-checkout__identificationNumber');
        if (nameEl && opts.cardholderName) {
          nameEl.value = opts.cardholderName;
        }
        if (idTypeEl && opts.identificationType) {
          idTypeEl.value = opts.identificationType;
        } else if (idTypeEl && idTypeEl.options.length > 1 && !idTypeEl.value) {
          idTypeEl.selectedIndex = 1;
        }
        if (idNumEl && opts.identificationNumber) {
          idNumEl.value = opts.identificationNumber;
        }
        var form = document.getElementById('mp-form');
        if (form) form.requestSubmit();
      };

      loadSdk();
    })();
  </script>
</body>
</html>`;
}
