# Página de descarga para demo (S3)

Landing de **PulpoLive** (logo y marca) que se despliega en S3 en cada deploy. Los usuarios de prueba abren la URL del bucket y pueden:

- **Android:** descargar el APK (enlace directo).
- **iOS:** enlace a TestFlight (configurable por secret).

## Cómo funciona

1. El workflow **Deploy Demo Downloads** (`.github/workflows/deploy-demo-downloads.yml`) se ejecuta en cada push a `main` (o manualmente).
2. Construye el APK de Android (release, firmado con keystore de demo).
3. Sube el APK a S3 en `app/releases/latest.apk`.
4. Sustituye en `index.html` los placeholders `__ANDROID_APK_URL__` y `__IOS_TESTFLIGHT_URL__` por las URLs reales.
5. Sube `index.html` a la raíz del bucket.

## Secrets en GitHub

Configura en **Settings → Secrets and variables → Actions**:

| Secret | Obligatorio | Descripción |
|--------|-------------|-------------|
| `AWS_ACCESS_KEY_ID` | Sí | Usuario IAM con permisos `s3:PutObject`, `s3:PutObjectAcl` sobre el bucket. |
| `AWS_SECRET_ACCESS_KEY` | Sí | Clave del usuario IAM. |
| `AWS_REGION` | No (default `us-east-1`) | Región del bucket. |
| `S3_BUCKET` | Sí | Nombre del bucket (ej. `whatyes-demo-downloads`). |
| `IOS_TESTFLIGHT_URL` | No | URL de TestFlight para iOS (ej. `https://testflight.apple.com/join/xxxxx`). Si no está, el botón iOS apunta a `#`. |

## Configurar el bucket S3

1. **Crear el bucket** (mismo nombre que `S3_BUCKET`).

2. **Permitir acceso público** (uno de los dos):

   **Opción A – ACLs**  
   - Desbloquear “Block public access” para ACLs.  
   - El workflow hace `put-object-acl --acl public-read` en cada objeto.

   **Opción B – Solo política del bucket (recomendado)**  
   - Mantener “Block public access” activo y no usar ACLs.  
   - Añadir una política como esta (sustituir `NOMBRE-BUCKET`):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::NOMBRE-BUCKET/*"
       }
     ]
   }
   ```

3. **Opcional – Sitio estático**  
   - En el bucket: **Properties → Static website hosting → Enable**.  
   - Index document: `index.html`.  
   - La URL será:  
     `http://NOMBRE-BUCKET.s3-website-REGION.amazonaws.com`  
   En ese caso conviene que el workflow use esta URL en el HTML si quieres que el “root” abra la landing (el workflow actual usa la URL de objeto `https://BUCKET.s3.REGION.amazonaws.com/index.html`).

## URLs tras el deploy

- **Página de descarga:**  
  `https://NOMBRE-BUCKET.s3.REGION.amazonaws.com/index.html`
- **APK directo:**  
  `https://NOMBRE-BUCKET.s3.REGION.amazonaws.com/app/releases/latest.apk`

Si configuraste sitio estático:  
`http://NOMBRE-BUCKET.s3-website-REGION.amazonaws.com`

## URLs de API en el APK

El APK se construye con las variables de `env/.env_main` (o un `.env` mínimo en CI). Para que los usuarios de prueba puedan usar la app contra tu backend, usa en `env/.env_main` las URLs de producción o staging (`API_BASE_URL`, `PLATFORM_HTTP_URL`) antes de hacer push.

## iOS

Para testers en iOS, sube la build a TestFlight, obtén el enlace de invitación y guárdalo en el secret `IOS_TESTFLIGHT_URL`. El botón “iOS (TestFlight)” de la landing usará esa URL.

### Subir a TestFlight con Fastlane (local, macOS)

Requisitos: Xcode + CocoaPods, Ruby (de preferencia `bundle install` en la raíz del repo).

1. **Variables en `env/.env_main`** (no commitear secretos reales). El `Fastfile` las carga con `dotenv`:
   - `APPLE_TEAM_ID` — Team ID de Apple Developer (10 caracteres).
   - `FASTLANE_USER` — Apple ID (opcional si usás solo API key).
   - **API key de App Store Connect** (recomendado):  
     - `APP_STORE_CONNECT_API_KEY_PATH` — ruta al `.p8` o al JSON exportado de la key, o  
     - `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID` + `APP_STORE_CONNECT_API_KEY_PATH` apuntando al `.p8`.
2. **Certificados y perfiles**: abrí el workspace `ios/PulpoLive.xcworkspace` en Xcode al menos una vez y dejá firmado “Release” con el equipo correcto; el lane usa `export_method: app-store` y `-allowProvisioningUpdates`.
3. **Comandos** (desde la raíz de `platform_mobile`):

   ```sh
   bundle install
   bundle exec fastlane ios build   # solo IPA, no sube
   bundle exec fastlane ios beta    # build + upload a TestFlight
   ```

   El lane `beta` incrementa `CURRENT_PROJECT_VERSION` en `PulpoLive.xcodeproj` y sube con `upload_to_testflight` (`skip_waiting_for_build_processing: true`).

4. **Post-subida**: en App Store Connect, cuando el build esté “Processing” / listo, copiá el enlace público de TestFlight al secret `IOS_TESTFLIGHT_URL` del workflow de S3 para que la landing apunte al grupo correcto.
