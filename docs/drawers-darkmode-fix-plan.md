# Plan: Unificación de drawers + dark mode completo

> ## ESTADO: EJECUTADO (jul 2026)
>
> Las 7 fases están aplicadas sobre 72 archivos. Verificación: `tsc` en 79 errores
> (baseline 80, ninguno en archivos de UI tocados), ESLint sin errores nuevos, y los
> bundles de producción de iOS y Android compilan.
>
> **Desvíos respecto de lo planificado, con su motivo:**
>
> 1. **Fase 1 — el fix es `Appearance.setColorScheme('unspecified')`, no `null`.**
>    El plan proponía `null` con try/catch. Verificando el código nativo de RN 0.83
>    (`AppearanceModule.kt:56`) el parámetro es un `String` no-nulo de Kotlin: `null`
>    crashea Android, que era exactamente lo que documentaba el comentario histórico.
>    `'unspecified'` es el valor multiplataforma correcto (iOS lo mapea a
>    `UIUserInterfaceStyleUnspecified` vía `RCTConvert.mm:495`, Android a
>    `MODE_NIGHT_FOLLOW_SYSTEM`) y limpia el override sin riesgo.
> 2. **Fase 3 — teclado: se levanta el panel, no se agregan insets de scroll.**
>    El panel inferior está anclado a `bottom: 0`, así que el teclado lo tapa entero;
>    los insets de scroll no ayudan cuando lo que queda detrás del teclado es el panel
>    completo. En iOS ahora sube por encima del teclado y se recorta el alto disponible.
> 3. **Fase 3 — el radio superior se aplica en `panelAnchor`,** que ya recortaba en ambas
>    plataformas, en lugar de sacarle la condición iOS al clip de `DrawerPanelGlass`
>    (tocar esa capa arriesgaba el blur de Android sin necesidad).
> 4. **Fase 2 — no se unificaron todos los hex, solo los duplicados por ROL.** El criterio
>    `grep #FBBF24 → 0` del plan era demasiado amplio: el ámbar de estrellas y el rojo del
>    badge "EN VIVO" son roles distintos del dorado de "Cancelar" y del rojo destructivo,
>    y se conservan.
> 5. **Agregado fuera del plan:** prop `onRequestClose` en `GlassFullScreenModal` — el botón
>    atrás de Android salteaba la confirmación de descarte del formulario del vendedor.
> 6. **Fase 7 — `npx jest` sigue fallando.** Estaba roto desde antes (el test monta la app
>    entera y faltan mocks nativos). Se destrabaron 3 bloqueos (CSS, AsyncStorage,
>    transformIgnorePatterns) y el resto quedó como tarea aparte. En su lugar la
>    verificación de integración fue compilar los bundles de producción, que valida todo
>    el grafo de imports.
> 7. **`SaleModeTabs` conserva sus píldoras claras** sobre el panel oscuro: es la
>    especificación de Figma documentada en `seller-products-drawer-plan.md`, no deriva.
> 8. **Fase 5 creció durante la ejecución:** al oscurecer el perfil quedaron al descubierto
>    `AccountMenuRow`, `PurchaseDetailScreen`, el contenido de las pestañas de perfil
>    (`ProfileShowCard`, `ProfileProductRow`, `ProfileReviewRow`, `ProfileReviewsSection`),
>    `StarRating` y `FollowSuccessCelebration`, que no estaban listados.


> Documento de correcciones para ejecutar con **Claude Opus**.
> Autocontenido: incluye el diagnóstico verificado (con referencias `archivo:línea`), las
> decisiones de diseño canónicas y las fases de ejecución con criterios de aceptación.
> **Stack:** React Native 0.83.1 + TypeScript, NativeWind 4.2.1 (solo pantallas auth/home),
> el resto con `StyleSheet`, tipografía `Mulish` vía `FONT_FAMILY`. **No instalar librerías nuevas.**
>
> Reglas para el ejecutor:
> - Textos nuevos SIEMPRE vía i18n (`src/i18n/locales/es.ts` + `en.ts`).
> - No tocar lógica de streaming/KVS/P2P, pagos ni sagas de venta — esto es solo UI/tema.
> - Ejecutar las fases en orden; cada fase deja `npx tsc --noEmit` y `npx eslint src` limpios.
> - Los ítems marcados **[DISEÑO]** cambian apariencia visible de forma opinable: implementarlos,
>   pero listarlos al final para que el usuario los valide en un build.

---

## 0. Diagnóstico (verificado por auditoría, jul 2026)

### 0.1 Dark mode — por qué "no funciona" en iPhone

El mecanismo NativeWind está bien cableado (metro + babel + `darkMode: 'class'` + preset;
verificado hasta el cache de build `node_modules/react-native-css-interop/.cache/ios.js`).
El problema es doble:

1. **Bug real — "Automático" queda congelado.** `src/context/ThemeContext.tsx:71-75` siempre
   aplica `nwColorScheme.set('light'|'dark')` y nunca limpia el override. Ese `set()` delega en
   `Appearance.setColorScheme()`, que fija `overrideUserInterfaceStyle` en las ventanas iOS.
   A partir de ahí, `useColorScheme()` (línea 41) **lee el propio override de la app**, no el
   sistema. Consecuencias: pasar de Oscuro → Automático no hace nada hasta reiniciar la app, y
   en Automático los cambios de tema del dispositivo con la app abierta nunca se siguen.
2. **Cobertura casi nula.** Solo 18 de 129 componentes usan clases `dark:` y ~16 usan
   `useTheme()`; todo el ala post-login (Account, Profile, Activity, Purchases, AddProduct,
   StreamConfig, Preferences) está hardcodeada en claro. El toggle vive en `PreferencesModal`
   (glass hardcodeado) abierto desde `BuyerAccountScreen` (claro hardcodeado): el usuario guarda
   y no ve cambiar ni un píxel → "no funciona".

### 0.2 Drawers — inconsistencias confirmadas

Hay 2 bases correctas y ~30 drawers/modales; los problemas son de adopción dispar:

- **Bases:** `StreamBottomSheet` (bottom sheet / full glass, header título-izq + X-der, slot
  `footer` fijado fuera del scroll, `cancelLabel` dorado) y `GlassFullScreenModal` (modal glass
  full-screen con slots header/subHeader/footer fijados).
- **CTA que scrollea en vez de estar al pie** (el reclamo principal):
  `StartLiveSetupDrawer.tsx:178-183`, `PreLiveSetupOverlay.tsx:713-717`,
  `SellerAddProductDrawer.tsx:308-329` (Publicar al final de un form largo — puede quedar
  fuera de pantalla), `StreamEndLiveDrawer.tsx:33-47`, `StreamFollowSellerDrawer.tsx:50-65`,
  `StreamWalletIntroDrawer.tsx:41-59`, `StreamMpWalletConnectModal.tsx:205-213`.
- **Bases ignoradas:** `SellerAddProductDrawer` (View absoluta blanca full-screen, header con
  chevron-atrás en vez de X, única pantalla clara en medio del flujo live dark) y
  `StreamMpWalletConnectModal` (Modal propio opaco sin header, "Cancelar" como pill flotante).
- **"Cancelar" con 3 colores:** dorado `#FDC700` (base + 8 copias locales), `#FBBF24`
  (`PreLiveSetupOverlay.tsx:1114-1118`), púrpura `#685CF0` (`addProductStyles.ts:312-317`).
- **Pickers internos blancos sobre modales dark:** `PreferencesModal.tsx:437-484`
  (OptionPickerModal), `ShippingAddressModal.tsx:319-367` (picker de país duplicado en vez de
  reusar `CountrySelect`), `CountrySelect.tsx:251-296` (sheet blanco que se abre sobre el
  wizard dark de Start Live). Ninguno permite cerrar tocando el fondo.
- **Cierre tocando el fondo (backdrop) incoherente:** con estado editable y backdrop-close
  activo se descartan cambios en silencio: `PreferencesModal` y `NotificationsModal` (default
  true), `StreamWalletHubDrawer` (tiene input), `BlockedWordsDrawer` y `ModeratorsDrawer`
  (`PreLiveSetupOverlay.tsx:256-265,335-345`). Otros forms sí lo desactivan.
- **Teclado:** el ScrollView del modo bottom-panel de `StreamBottomSheet` NO tiene
  `automaticallyAdjustKeyboardInsets` (`StreamBottomSheet.tsx:273-287`, el modo full sí en
  `:217`) → el teclado tapa inputs en `AddProductPackageTierDrawer`, `BlockedWordsDrawer`,
  `StreamWalletHubDrawer`. En Android la familia Glass no tiene KAV (`GlassFullScreenModal.tsx:193-200`).
- **Geometría:** declarar `maxHeight` en `panelStyle` convierte el sheet de hug-content a
  altura FIJA (`StreamBottomSheet.tsx:237`), por eso `SellerAddProductTypeDrawer` (3 filas)
  ocupa 88% de pantalla (`SellerAddProductTypeDrawer.tsx:87-89`). El radio superior 24 solo
  clipea en iOS (`GlassBackdrop.tsx:80-86` — `overflow:'hidden'` condicionado a iOS).
- **Colores duplicados/deriva:** dos verdes (`#00C566` vs `#18AF1D` en
  `StreamShippingRateDrawer.tsx:25`), dos rojos (`#EF4444` en EndLive vs `#FB2C36` en
  DeleteAccount/Button), `PRIMARY`/`CANCEL_GOLD` redeclarados en 8+ archivos, ~13 grises
  distintos, superficies de input `rgba(255,255,255,0.08)` vs `rgba(236,235,235,0.08)` vs
  `rgba(236,235,235,0.3)` (`ChangePasswordModal.tsx:537`), opacidad disabled 0.45/0.5/0.6/ausente.
- **Doble padding en footers:** `DeleteAccountModal.tsx:92,216-221` y
  `StreamAddCardDrawer.tsx:390-393` suman 24+24 por lado → botones más angostos que el resto.
- **Bugs encontrados de paso:** `UserMenu.tsx:119` usa `<Check>` sin importarlo (crash al
  abrir el menú un usuario verificado con perfil completo); `AddProductWeightDrawer.tsx`
  huérfano (nadie lo importa; lo reemplazó `AddProductPackageTierDrawer`);
  `src/theme/colors.ts:1` importa `LinearGradient` de react-native-svg sin usarlo;
  `EditProfileDrawer.tsx:72-94` elige avatar que `handleSave` nunca sube (bug funcional,
  anotar como TODO — la subida es alcance de backend/API, no de este plan).

---

## 1. Canon de drawers (decisiones de diseño)

Todo drawer/modal de la app debe cumplir estas reglas al terminar el plan:

| Regla | Definición |
|---|---|
| **Base única** | Bottom sheet → `StreamBottomSheet`. Modal full-screen glass → `GlassFullScreenModal`. Prohibido reimplementar presentación (Views absolutas, Modals ad-hoc), salvo WebViews full-screen que pueden mantener RN Modal pero con header canónico. |
| **Header** | Título a la izquierda (bold 16, blanco) + **X a la derecha** (lucide `X` 22, caja táctil 40×40). Sin chevron-atrás, salvo navegación interna multi-paso. |
| **Footer** | La CTA primaria va SIEMPRE en el slot `footer` (fijada al pie, fuera del scroll), con safe-area `max(insets.bottom, 16)` que ya aplican las bases. Nunca dentro del ScrollView. |
| **CTA primaria** | `height 40`, `borderRadius 1000`, bg `colors.primary`, texto bold 14 blanco. Disabled: `opacity 0.45`. Destructiva: mismo shape, bg `colors.danger`. |
| **Secundaria** | Text-link dorado `colors.gold` vía `cancelLabel` de la base (o mismo estilo en el slot footer). Prohibidas las copias locales. |
| **Backdrop-close** | `dismissOnBackdropPress={false}` en TODO drawer con estado editable (forms, drafts, selección múltiple). Auto-close al tocar solo en pickers de una opción sin datos que perder. |
| **Modelo de confirmación** | No se cambia el modelo UX de cada drawer (auto-close vs Confirmar responde a Figma); solo se normaliza la implementación (posición pinned, estilos, tokens). |
| **Sin grabber** | Ningún sheet lleva handle/grabber (el diseño Figma no lo tiene). No agregarlo. |
| **Glass = dark siempre** | Los overlays glass (drawers sobre video, modales account) son oscuros en ambos temas por diseño. NO tematizarlos con `isDark`. Lo que SÍ se tematiza son las pantallas (fase 5). |
| **zIndex** | Constantes compartidas en `src/theme/layers.ts` (nuevo): `SHEET=200, HOST=300, OVERLAY=350, COUNTDOWN=500` — reemplazar números mágicos. |
| **Teclado** | Inputs en bottom-panel: insets automáticos iOS + KAV Android desde la base (fase 3). Dismiss al tocar fuera ya lo da la base. |

---

## 2. Fases de ejecución

### Fase 0 — Bugs inmediatos y limpieza (sin decisiones de diseño)

1. `src/components/molecules/UserMenu/UserMenu.tsx:9` — agregar `Check` al import de
   `lucide-react-native` (hoy crashea en `:119`).
2. Borrar `src/components/organisms/addProduct/AddProductWeightDrawer.tsx` (huérfano) y
   cualquier export suyo en índices.
3. `src/theme/colors.ts:1` — eliminar `import { LinearGradient } from "react-native-svg"`.
4. `DeleteAccountModal.tsx` — quitar el `paddingHorizontal: 24` duplicado del footer
   (`:216-221`; el container ya lo aporta en `:92`).
5. `StreamAddCardDrawer.tsx:390-393` — ídem: quitar `paddingHorizontal: 24` del `styles.footer`
   (el fullPanel de la base ya lo aplica).
6. `UserMenu.tsx:127-135` — pasar los strings de estado hardcodeados en español a i18n.
7. `EditProfileDrawer.tsx` — dejar `// TODO: subir avatarUri al guardar (pendiente endpoint)`
   sobre `handleSave` (`:91-94`) para que no se pierda el hallazgo.

**Aceptación:** compila, lint limpio, abrir el menú de usuario con cuenta verificada no crashea.

### Fase 1 — Mecanismo de tema: arreglar "Automático" congelado

Archivo: `src/context/ThemeContext.tsx`.

Cambios:
1. Al pasar a preferencia `system`, **limpiar el override nativo** en lugar de fijar
   light/dark: en iOS `Appearance.setColorScheme(null)` es seguro y des-pinnea las ventanas
   (vuelve a emitir `appearanceChanged` con el valor real del dispositivo). En Android el
   comentario histórico del archivo (líneas 3-6) dice que `null` podía lanzar
   (parámetro no-nulo); en RN 0.83 hay que verificarlo en runtime: envolver en `try/catch` y,
   si lanza, mantener el fallback actual (aplicar el resolved) pero **re-sincronizar el scheme
   del dispositivo al volver la app a foreground** (`AppState` 'active' → releer
   `Appearance.getColorScheme()` tras limpiar temporalmente el override) para que Automático
   no quede congelado entre sesiones.
2. Para `light`/`dark` explícitos mantener `nwColorScheme.set(resolved)` como hoy.
3. Cuidado con el efecto en `:71-75`: al limpiar el override en modo system, `deviceScheme`
   vuelve a ser confiable; no re-aplicar `set()` en modo system o se re-pinnea (el bug actual).
4. `resolveScheme` no cambia. `isReady` gating no cambia (evita el flash de arranque conocido).

**Aceptación (probar en simulador iOS y Android):**
- Oscuro → Automático en un dispositivo claro vuelve a claro SIN reiniciar la app.
- En Automático, cambiar el tema del sistema con la app abierta la actualiza en vivo.
- Claro/Oscuro explícitos siguen funcionando y persisten tras reinicio (AsyncStorage).
- Elegir Automático en Android no crashea.
- Las pantallas auth (`LoginScreen`) reflejan el cambio (ya tienen clases `dark:`).

### Fase 2 — Tokens únicos de color y capas

1. `src/theme/colors.ts` — expandir a fuente única (mantener compat con lo existente):
   - `primary: '#685CF0'` (ya está), `gold: '#FDC700'`, `success: '#00c566'` (ya está),
     `danger: '#FB2C36'` (el que usa el atom Button; **eliminar** `#EF4444` y `#18AF1D` y
     `#FBBF24` en toda la app reemplazándolos por estos tokens).
   - Superficies glass/drawer: `glassInputBg: 'rgba(255,255,255,0.08)'`,
     `glassPlaceholder: 'rgba(255,255,255,0.5)'`, `glassBorder: '#DDDDDD'`,
     `disabledOpacity: 0.45`.
   - Arreglar `light.background`: hoy es un string CSS de gradiente inutilizable en RN
     (`colors.ts:9`); reemplazar por `backgroundTop/backgroundBottom` (como ya hace
     `home.gradientTop/Bottom`) y dejar el gradiente a los componentes SVG existentes.
2. Crear `src/theme/layers.ts` con las constantes de zIndex del canon y reemplazar los números
   mágicos en: `StreamBottomSheet.tsx:456-462` (200), `StartLiveWizardHost.tsx:55-61` y
   `AddProductHost.tsx:109-115` (300), `AddProductPhotoSourceDrawer.tsx:144-150` (350),
   `SellerAddProductDrawer.tsx:373-378` (250→300), `PreLiveSetupOverlay.tsx:1287-1295` (500),
   `UserMenu.tsx` (998/999 → dejar, es top-level de layout).
3. Reemplazar TODAS las constantes locales `PRIMARY`/`CANCEL_GOLD`/`DANGER_RED` de los
   drawers/modales por imports de `theme/colors` (EditProfile, Shipping, Contact, Preferences,
   Notifications, ChangePassword, DeleteAccount, StreamBottomSheet, EndLive, FollowSeller,
   WalletIntro, startLiveStyles, addProductStyles, PreLiveSetupOverlay).

**Aceptación:** `grep -rn "#EF4444\|#18AF1D\|#FBBF24" src` → 0 resultados; visual sin cambios
salvo los 3 colores unificados.

### Fase 3 — Bases compartidas: `StreamBottomSheet` + `GlassFullScreenModal`

`src/components/organisms/stream/StreamBottomSheet.tsx`:
1. **Teclado en bottom-panel:** agregar `automaticallyAdjustKeyboardInsets` (iOS) al ScrollView
   del modo bottom-panel (`:273-287`) igual que el full (`:217`), y envolver el panel en
   `KeyboardAvoidingView behavior="height"` SOLO Android cuando hay teclado visible (ya
   trackea el estado en `:114-123`).

   > **RESUELTO (ago 2026), distinto a lo planeado.** No se usan insets de scroll ni KAV: el
   > panel entero se levanta con `bottom: keyboardOffset`. En iOS el offset es la altura del
   > teclado. En Android **no alcanza** con el `adjustResize` de la activity —no aplica a
   > pantallas fullscreen (el vivo oculta la status bar) ni dentro de un `Modal` RN, que es
   > otra ventana—, así que se mide el solapamiento real entre el teclado (`endCoordinates
   > .screenY`) y el borde inferior del host (`measureInWindow`, remedido en cada relayout).
   > Donde el resize sí funcionó ese solapamiento da 0, así que nunca se compensa doble y no
   > hace falta prop por drawer. El modo full-panel descuenta el mismo valor por `paddingBottom`
   > para que el footer fijo quede sobre el teclado.
2. **`maxHeight` ≠ altura fija:** separar los conceptos — `panelStyle.maxHeight` debe volver a
   ser solo tope del hug; agregar prop explícita `fillToMaxHeight?: boolean` para los casos que
   realmente quieren panel fijo (`StreamRoomProductsDrawer` sí; `SellerAddProductTypeDrawer` no).
3. **Radio en Android:** quitar la condición iOS del clip en `GlassBackdrop.tsx:80-86`
   (aplicar `overflow:'hidden'` + radios también en Android). **[DISEÑO]** verificar en build
   Android que el blur no se rompa; si el BlurView Android no respeta el clip, envolver en un
   View con radio+overflow.
4. Borrar el export muerto `streamBottomDrawerProps` (`:77-79`).

`src/components/organisms/profile/GlassFullScreenModal.tsx` + nuevo header compartido:
5. Crear `GlassModalHeader` (en el mismo archivo o `organisms/profile/GlassModalHeader.tsx`):
   props `{ title, onClose, closeDisabled? }`, layout canónico (título bold 16 blanco izq +
   X 22 en caja 40×40 der, `paddingTop: insets.top + 16`, `paddingHorizontal: 24`).
   Migrar a usarlo: Shipping (`:212-220`), Contact (`:108-110`), Preferences (`:140-151`),
   Notifications (`:111-122`), ChangePassword (`:264-269`), DeleteAccount (`:94-99`).
6. Unificar padding: los consumidores usan `contentContainerStyle` con
   `paddingHorizontal: 24` (patrón Shipping); eliminar la variante `containerStyle` global de
   Contact (`:102`), ChangePassword (`:260`), DeleteAccount (`:92`) para que el footer no
   dependa de padding heredado.
7. En iOS conviven KAV `padding` + `automaticallyAdjustKeyboardInsets` (`:193-200` + `:143-151`)
   → dejar solo `automaticallyAdjustKeyboardInsets` en iOS y KAV solo Android (evita doble
   compensación).

Nuevo picker unificado:
8. Crear `src/components/molecules/AppOptionPickerSheet.tsx`: bottom sheet **oscuro glass**
   (reusar `StreamBottomSheet` en bottomPanel con `nativeModal` cuando el padre es un Modal),
   props `{ visible, title, options: {key,label,selected}[], onSelect, onClose }`, filas con
   check `colors.primary`, tap-fondo cierra. Reemplaza:
   - `OptionPickerModal` interno de `PreferencesModal.tsx:284-318` (tema e idioma),
   - el picker de país inline de `ShippingAddressModal.tsx:319-367` (reusar datos `COUNTRIES`),
   - el sheet blanco de `CountrySelect.tsx:139-296` cuando se abre en contexto dark
     (Start Live wizard). `CountrySelect` mantiene su API pero renderiza el sheet nuevo.
   **[DISEÑO]** los pickers pasan de blancos a dark glass — coherente con el sistema, validar.

**Aceptación:** teclado no tapa inputs en `AddProductPackageTierDrawer` ni `BlockedWordsDrawer`
(probar en iPhone SE/mini y un Android chico); `SellerAddProductTypeDrawer` vuelve a hug-content;
pickers de Preferencias/País son dark y cierran tocando el fondo.

### Fase 4 — Normalización drawer por drawer

Grupo startLive/addProduct:
1. `StartLiveSetupDrawer.tsx` — mover la CTA (`:178-183`) al prop `footer` (pinned).
2. `PreLiveSetupOverlay.tsx` — mover "Guardar"+"Cancelar" (`:713-720`) a footer pinned con
   safe-area; cancel → `colors.gold`; `paddingTop` hardcodeado (`:900-905`) →
   `insets.top + 16`; backdrop plano → `GlassBackdrop` (mismo glass que el resto);
   animación del Modal `fade` → `none` + slide interno como las bases **[DISEÑO]**;
   `BlockedWordsDrawer` y `ModeratorsDrawer` → `dismissOnBackdropPress={false}`;
   sheets de fecha/hora: unificar chrome con tokens (`#FEFEFE` → mantener light nativo del
   picker, pero safe-area `max(insets.bottom, 16)` y overlay `themeColors.*.overlay`).
3. Drawers addProduct (`SaleFormat`, `Condition`, `PackageTier`, `PhotoSource`) — usar el
   `addProductDrawerProps` compartido (`addProductStyles.ts:18-21`) en vez de reconstruir
   `panelStyle` local en 5 lugares; **[DISEÑO]** unificar las filas de opción claras
   (`#18181B` sobre `rgba(255,255,255,0.4)`, `addProductStyles.ts:419-454` y radios de
   `startLiveStyles.ts:156-177`) al skin white-on-dark del resto del sistema.
4. `SellerAddProductDrawer.tsx` — migrar de View blanca absoluta a `GlassFullScreenModal`:
   header canónico (título + X; el chevron-atrás desaparece), "Publicar" + "Guardar borrador"
   en footer pinned (borrador como secundaria dorada), superficie dark glass, mantener su
   `KeyboardAvoidingView`. Al cerrar con X habiendo cambios → `Alert` de confirmación de
   descarte (hoy resetea el form en silencio, `:95-98`). **[DISEÑO]** (pasa de blanco a dark).

Grupo stream/wallet:
5. `StreamEndLiveDrawer.tsx` — CTA roja → `footer` prop con `colors.danger`; cancel →
   `cancelLabel` de la base (borrar copia local `:75-82`).
6. `StreamFollowSellerDrawer.tsx` y `StreamWalletIntroDrawer.tsx` — CTA → `footer` prop;
   "ahora no"/"recordar luego" → `cancelLabel`; deduplicar los estilos headline/check
   copiados entre ambos (extraer a un componente o estilos compartidos).
7. `SellerAddProductTypeDrawer.tsx` — quitar `maxHeight:'88%'` (`:87-89`, con la fase 3.2
   vuelve a hug); quitar el radio decorativo sin estado (`:135-142`) o implementarlo.
8. `StreamWalletHubDrawer.tsx` — `dismissOnBackdropPress={false}` (tiene input); botón
   `actionBtn` local (`:162-171`) → `streamSheetStyles.primaryBtn`; ídem
   `StreamPaymentMethodsDrawer.tsx:206-215`.
9. `StreamMpWalletConnectModal.tsx` — header canónico (título + X 22) en lugar del pill
   flotante (`:221-234`); CTA h44 → h40 (`:205-213`); mantener el RN Modal (WebView).
10. `StreamWalletSuccessDrawer.tsx` — es un toast auto-dismiss (2.5s): quitar X y header de
    drawer, dejar contenido simple **[DISEÑO]**.
11. `StreamRoomProductsDrawer` / `StreamEndLiveDrawer` con `nativeModal` (`:82`/`:25`):
    quitar `nativeModal` para que rendericen inline y el blur real funcione sobre el video
    (la base documenta que dentro de un Modal el blur no tiene qué desenfocar, `:59-62`).
    Verificar layering con los overlays del seller.

Grupo account/profile:
12. `PreferencesModal.tsx` y `NotificationsModal.tsx` — `dismissOnBackdropPress={false}`
    (tienen draft state que hoy se descarta en silencio).
13. `EditProfileDrawer.tsx` — pasar el título al slot `header` pinned con X canónica (hoy el
    título scrollea y no hay X, `:133-165`); mantener Cancelar dorado en footer.
14. `ProfileReviewsDetailModal.tsx` — migrar a `GlassFullScreenModal` con header canónico
    (un solo cierre: X; borrar el chevron duplicado `:51-57`).
15. `BuyerKycModal.tsx` — fase declined: el botón "Cancelar" primario púrpura (`:163-172`) →
    secundaria dorada; pill del WebView se mantiene (overlay de navegador).
16. Inputs glass: unificar superficies a `colors.glassInputBg` y placeholder
    `colors.glassPlaceholder` en `ContactModal.tsx:236,251` (`rgba(236,235,235,0.08)`) y
    `ChangePasswordModal.tsx:537,566` (`rgba(236,235,235,0.3)`); labels de campo → semibold;
    disabled → `opacity 0.45` en todos (Contact/ChangePassword 0.5, BuyerKyc 0.6, y agregar
    estilo disabled donde falta: EditProfile, Preferences, Notifications).
17. `UserMenu.tsx` — X 24 → 22 con caja 40×40 (consistencia).

**Aceptación:** matriz manual (sección 6) — todos los drawers cumplen el canon de la sección 1;
en particular ningún CTA scrollea con el contenido y el pie respeta safe-area en iPhone con
home indicator.

### Fase 5 — Cobertura dark mode (pantallas)

Patrón para componentes `StyleSheet` (la mayoría): `const { isDark } = useTheme()` +
`const palette = themeColors[isDark ? 'dark' : 'light']` y aplicar colores dinámicos inline
sobre los estilos estáticos (posición/tipografía quedan en `StyleSheet`). Para componentes
NativeWind existentes, clases `dark:`. **No migrar de un sistema a otro.**

Orden por apalancamiento (cada ítem termina con la pantalla verificada en claro y oscuro):

1. **Atoms (máximo impacto):**
   - `atoms/Text/Text.tsx:18-25` — variantes `text-gray-900/800/700/600` sin `dark:` → agregar
     equivalentes (`dark:text-white`, `dark:text-night-muted` según variante). Esto arregla el
     texto por defecto de TODA la app.
   - `atoms/Input/Input.tsx:25-33,46,59-61` — `bg-white/text-gray-900/border-gray-300` +
     placeholder/íconos hardcodeados → variantes dark (`night.800`, `#8e9aaf`).
   - `molecules/TabSelector` — `bg-gray-100/text-gray-600` → dark.
2. **Account/Profile (donde vive el toggle — elimina el "no pasa nada"):**
   - `BuyerAccountScreen.tsx:333-431` (cards blancas, tintas `#27272A/#18181B`, borde `#CBCEFF`).
   - `HomeScreen.tsx:475` — el wrapper `bg-white` del perfil → `bg-white dark:bg-night-950`.
   - `UserProfileScreen.tsx:590-900` (fondos blancos, tintas grises).
   - `ActivityScreen`, `BuyerPurchasesScreen.tsx:47,61`.
3. **Roturas visibles hoy en dark:**
   - `InterestCategoryGrid.tsx:82,110-119` — tiles claros con labels `dark:text-white` →
     blanco sobre blanco; dar fondo dark a los tiles (`night.800`, selected `night.700`).
   - `AddProductScreen` + `addProductStyles.ts:5-16` — pantalla transparente hereda shell dark
     pero tinta `#18181B` hardcodeada → tinta por tema.
   - `BuyerCategoryStreamsScreen.tsx:81-321` — mezclar `dark:` existentes con StyleSheet claro.
4. **Resto:** `StreamConfigScreen.tsx:484-522` (hoy gris claro `#f9fafb` + acento `#2563eb`
   fuera de paleta → tokens), `SellerHomeDashboard`, `molecules/StreamCard`,
   `ProductListItem`, `HomeBottomNav` borde `#DDD` → token.
5. **No tematizar:** drawers/modales glass (dark por diseño), `PurchaseClipViewer` (video),
   `LoadingScreen` (brand), overlays de stream.

**Aceptación:** con preferencia Oscuro, recorrer Home → Explorar → Cuenta → Perfil → Actividad
→ Compras → Agregar producto → Configurar stream sin encontrar superficies blancas ni texto
oscuro-sobre-oscuro; con Claro, sin regresiones (comparar contra build actual).

### Fase 6 — Android system bars + arranque

1. Crear `android/app/src/main/res/values-night/`: `colors.xml` y `styles.xml` con
   `windowBackground` `#050f2f`, `navigationBarColor` oscuro y
   `windowLightNavigationBar=false` (hoy `values/` pin light `#E7E7FF`).
2. Verificar `statusBarColor` coherente (la app ya maneja StatusBar central en
   `App.tsx:400-411`; no agregar overrides por pantalla).
3. iOS: el flash claro de arranque con preferencia dark (gating `isReady`) se acepta como
   conocido; opcional mitigar con `LaunchScreen` neutra.

### Fase 7 — Verificación final

1. `npx tsc --noEmit` y `npx eslint src` limpios; `npx jest` verde.
2. Matriz manual de drawers — para cada uno: header canónico / CTA pinned visible con
   contenido largo / cancel dorado / backdrop-close según regla / teclado no tapa inputs /
   safe-area al pie. Lista: Intro, Setup, Categories, PreLive (+Choice, BlockedWords,
   Moderators, pickers fecha/hora), SaleFormat, Condition, PackageTier, PhotoSource,
   SellerAddProduct, AddProductType, RoomProducts, EndLive, FollowSeller, ShippingRate,
   WalletHub, WalletIntro, PaymentMethods, AddCard, WalletSuccess, MpConnect, BuyerKyc,
   EditProfile, Reviews, Shipping, Contact, Preferences (+pickers), Notifications,
   ChangePassword, DeleteAccount, UserMenu, CountrySelect.
3. Matriz de tema en iPhone y Android: Claro / Oscuro / Automático (incluye cambiar el tema
   del sistema con la app abierta en Automático — criterio de la fase 1).

---

## 3. Ítems [DISEÑO] a validar por el usuario tras el build

1. Pickers internos (tema/idioma/país) pasan de sheet blanco a dark glass (F3.8).
2. `SellerAddProductDrawer` pasa de pantalla blanca a glass dark (F4.4).
3. Filas de opción claras de addProduct/startLive → skin white-on-dark (F4.3).
4. `PreLiveSetupOverlay` cambia fade→slide y suma blur de fondo (F4.2).
5. `StreamWalletSuccessDrawer` queda como toast sin X (F4.10).
6. Radio superior de sheets clipeando también en Android (F3.3).

## 4. Fuera de alcance (anotado, no ejecutar acá)

- Subida real del avatar en `EditProfileDrawer` (necesita endpoint/API).
- Unificar el modelo de confirmación auto-close vs Confirmar entre drawers equivalentes
  (decisión de producto/Figma, no de implementación).
- Migración masiva StyleSheet → NativeWind (explícitamente descartada).

---

# Addendum — ago 2026: los drawers tapan la barra de navegación

## Problema

Los bottom sheets montados inline (`StreamBottomSheet` sin `nativeModal`) quedaban dentro
del subárbol de la pantalla. En las pantallas con `GeneralLayout` eso los encierra en el
`View` de contenido, que es hermano **anterior** a la barra de tabs: el sheet se anclaba al
borde superior de la barra y la barra seguía visible y tocable con el drawer abierto.

No era un problema de z-index. `zIndex`/`elevation` solo ordenan hermanos dentro del mismo
padre; el sheet y la barra viven en subárboles distintos, así que no hay valor de z-index
que lo arregle.

## Solución — portal raíz

`src/context/OverlayPortalContext.tsx`: `OverlayPortalProvider` se monta en `App.tsx`
envolviendo a `AppNavigator` y renderiza un host absoluto como **último hermano** del
árbol (`LAYERS.portal`). `StreamBottomSheet` en modo inline se teletransporta ahí con
`<OverlayPortal>`.

Se usa portal y **no** `Modal` de RN a propósito: el glass necesita la misma ventana
nativa que la pantalla de fondo; dentro de un `Modal` el `BlurView` no tiene nada que
difuminar.

## `ModalWindowBoundary` — la excepción obligatoria

Un sheet que se abre **dentro de un `Modal`** no debe portarse a la raíz: el host raíz
vive en la ventana principal, que queda por debajo del modal, y el sheet sería invisible.
Por eso todo `Modal` que pueda contener sheets envuelve su contenido en
`<ModalWindowBoundary>`, que hace que `OverlayPortal` renderice en el lugar:

- `GlassFullScreenModal` (slot `overlay`: pickers y sub-drawers)
- `PreLiveSetupOverlay`
- el propio `StreamBottomSheet` en su rama `nativeModal`

**Al agregar un `Modal` nuevo que pueda contener un drawer, envolverlo.** Sin eso el
drawer de adentro no aparece.

## Otros ajustes del mismo pase

- Scrim animado en los bottom panels (`dimBackdrop`, on por defecto): con el drawer
  abierto la barra tapada tiene que leerse como inactiva. Se apaga por prop.
- El área de cierre por toque se corta en el alto **real** del panel y no en
  `maxHeight`: antes quedaba una franja muerta encima del sheet.
- `SellerAddProductDrawer`: sus tres sub-drawers pasaron de `children` al slot `overlay`;
  como children se anclaban arriba del footer del modal, no a la base de la pantalla.

## Fuera de alcance (decidido, no ejecutado)

- Convertir los `GlassFullScreenModal` (formularios de cuenta/perfil) en bottom sheets
  parciales: ya entran deslizando desde abajo y ya cubren la barra; sería un rediseño.
- `UserMenu` (drawer lateral): hoy es código muerto — `HomeScreen` usa `hideChrome`, así
  que nunca se renderiza.
