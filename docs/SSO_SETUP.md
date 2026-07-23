# Login social (Google / Apple) — guía de configuración

Flujo completo ya implementado en código:

```
LoginScreen (botón)
  → AuthContext.socialLogin(provider)
    → services/socialAuth.ts   (SDK nativo Google/Apple → idToken)
    → api/authApi.socialLogin  (POST /auth/social_login con el idToken)
      → service-users verifica el token y devuelve access/refresh + is_new_user
    → getCurrentUser + setUser → App muestra Home
```

Lo que sigue son los pasos de **configuración de cuentas y binario nativo** que no se
pueden automatizar (requieren tus credenciales de Google/Apple y Xcode).

---

## 1. Backend (service-users)

En el `.env` de `service-users` (ver también `envs/.env_main`):

```
GOOGLE_CLIENT_IDS=<web-client-id>,<ios-client-id>,<android-client-id>
APPLE_CLIENT_IDS=com.pulpolive
```

- `GOOGLE_CLIENT_IDS`: **todos** los client IDs que pueden aparecer como `aud` del
  idToken (Web, iOS, Android). Sepáralos con coma.
- `APPLE_CLIENT_IDS`: el bundle id de la app iOS (`com.pulpolive`).

Migrar la BD una vez: `python scripts/run_scripts.py migrate_social`.

---

## 2. Google Cloud Console

En el proyecto de Google Cloud (APIs & Services → Credentials) crea **3 OAuth Client IDs**
en el mismo proyecto:

1. **Web application** → su Client ID va en `GOOGLE_WEB_CLIENT_ID` (mobile) y en
   `GOOGLE_CLIENT_IDS` (backend). Es el que hace que el SDK devuelva `idToken`.
2. **iOS** → bundle id `com.pulpolive`. De aquí sale:
   - `GOOGLE_IOS_CLIENT_ID` (mobile `.env`)
   - el **iOS URL scheme** (REVERSED_CLIENT_ID) para el `Info.plist` (paso 4).
3. **Android** → package `com.pulpolive` + huella **SHA-1** de tu keystore
   (debug y release). Sin el SHA-1 correcto, Google no emite `idToken` en Android.
   Obtener SHA-1 debug: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`.

Añade los 3 Client IDs a `GOOGLE_CLIENT_IDS` del backend.

---

## 3. Variables del mobile (`.env` / `env/.env_main`)

```
GOOGLE_WEB_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=<ios-client-id>.apps.googleusercontent.com
```

(react-native-config ya expone estas variables; el wrapper `services/socialAuth.ts` las lee.)

---

## 4. iOS

1. **URL scheme de Google**: setea `GOOGLE_IOS_CLIENT_ID` en `env/.env_main` (o `.env`).
   Antes de cada build iOS, `fastlane` ejecuta `scripts/patch_google_ios_url_scheme.rb`,
   que escribe el scheme `com.googleusercontent.apps.<id>` en `Info.plist`. Si la variable
   está vacía, no se añade ningún scheme (evita rechazos de App Store por placeholders).
   El valor también aparece en Google Console → client iOS → "iOS URL scheme".
2. **Sign in with Apple**: en Xcode, target PulpoLive → Signing & Capabilities →
   `+ Capability` → **Sign in with Apple**. Esto vincula el archivo de entitlements.
   Ya se dejó `ios/PulpoLive/PulpoLive.entitlements` con la clave
   `com.apple.developer.applesignin`; si Xcode crea uno nuevo, puedes borrar el nuestro
   o apuntar `CODE_SIGN_ENTITLEMENTS` a este. Además, habilita "Sign in with Apple" en
   el App ID (developer.apple.com → Identifiers → com.pulpolive).
3. **Pods**: `npm run setup:ios` (o `pod install --project-directory=ios`).

---

## 5. Android

- No requiere cambios en `AndroidManifest.xml` (google-signin se auto-vincula).
- Requisito: el OAuth client **Android** con el SHA-1 correcto (paso 2). Falla común:
  `DEVELOPER_ERROR` = SHA-1 o package no coinciden con el client de Google Console.
- El botón de **Apple** se oculta automáticamente fuera de iOS
  (`isAppleSignInSupported()`), así que en Android solo se muestra Google.

---

## 6. Probar

1. Backend con `GOOGLE_CLIENT_IDS` / `APPLE_CLIENT_IDS` seteados y migración aplicada.
2. Mobile con `GOOGLE_WEB_CLIENT_ID` seteado, `pod install` hecho, rebuild nativo.
3. En LoginScreen tocar "Continuar con Google" / "Continuar con Apple":
   - usuario nuevo → se crea (`is_new_user: true`) y entra a Home;
   - usuario existente con mismo email verificado → se vincula y entra.

> Nota: el botón de **Facebook** sigue presente en la UI pero no está cableado
> (fuera del alcance actual: solo Google/Apple).
