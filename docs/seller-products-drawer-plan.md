# Plan: Terminar el drawer "Productos del Live" (Seller Stream)

> Documento de implementación para **Cursor Composer 2.5**.
> Autocontenido: incluye spec visual exacto del diseño Figma, archivos a crear/modificar,
> el modelo de datos real, y qué partes son sólo frontend vs qué requiere backend.
> **Stack del proyecto:** React Native 0.83 + TypeScript, estilos con `StyleSheet` (NO NativeWind),
> tipografía `Mulish` vía `FONT_FAMILY`. **No instalar Tailwind ni librerías nuevas.**

---

## 0. Contexto y objetivo

En la pantalla del vendedor (`SellerStreamScreen`) ya existe un drawer de productos
(`StreamRoomProductsDrawer`) que hoy es una **lista de solo lectura** muy básica.
El diseño de Figma ("Productos del Live", node `698:13498`) lo convierte en un panel de
**gestión de productos del vivo**: tabs de formato de venta, tarjetas ricas con acción
"Comenzar" + fijar, estado "Comienza pronto", y botón "Agregar Producto".

**Objetivo:** llevar `StreamRoomProductsDrawer` al diseño final y cablear las acciones.
La selección debe permitir **(a)** agregar productos del inventario al catálogo del vivo y
**(b)** marcar/activar cuál producto está activo (Comprar Ahora / Subasta / Sorteo).

Diseño de referencia (Figma): `MVP` file `eI9vYI57eEgLIkLiaSq0nJ`, node `698-13498`.

---

## 1. Spec visual exacto (del Figma)

Panel inferior glass, reutiliza el patrón existente `StreamBottomSheet` + `GlassBackdrop`.

### Contenedor / panel
- Fondo panel: `rgba(2, 5, 15, 0.4)` (ya lo aplica `StreamBottomSheet`).
- `borderTopLeftRadius` / `borderTopRightRadius`: `24`.
- Padding: `24` horizontal (lo da el sheet). Gap vertical entre secciones: `24`.
- `maxHeight` del panel: subir a **`88%`** (hoy está en `480`, queda corto para el nuevo contenido).
- Home indicator inferior: ya lo dibuja `StreamBottomSheet`.

### Header
- Título: **"Productos del Live"** — `Mulish ExtraBold` (usar `FONT_FAMILY.bold` con `fontWeight: '800'`), `fontSize 16`, `lineHeight 20`, color `#FFFFFF`. (Ya lo renderiza el header de `StreamBottomSheet`; sólo cambiar el texto del título vía i18n.)
- Botón cerrar `X` a la derecha, `size 24`, blanco. (Ya existe en `StreamBottomSheet`.)

### Tabs de formato de venta (segmented, fila horizontal, gap `8`)
Tres pills, alto `48`, `paddingHorizontal 12`, `borderRadius 1000`:
1. **"Comprar Ahora"** — activo: fondo `#454087`, texto `#FFFFFF`.
2. **"Subasta Rápida"** — inactivo: fondo `#DDDAFF`, texto `#18181B`.
3. **"Sorteo"** — inactivo: fondo `#DDDAFF`, texto `#18181B`, `flex: 1` (rellena el resto).
- Texto de tab: `Mulish SemiBold` (`FONT_FAMILY.semibold`), `fontSize 14`, `lineHeight 20`, centrado.
- Estado activo: la tab seleccionada usa fondo `#454087` + texto blanco; las inactivas `#DDDAFF` + texto `#18181B`.

### Lista de productos (scrollable, gap `24`)
Cada tarjeta: fila con separador inferior `borderBottomWidth 1`, `borderBottomColor #DDD`, `paddingBottom 24`.

**Tarjeta normal (estados "live"):**
- Imagen: `132 x 132`, `borderRadius 12`, `resizeMode cover`. (Si no hay imagen, placeholder gris.)
- Columna derecha (`flex: 1`, gap `8`):
  - Título: `Mulish Bold`, `fontSize 14`, `lineHeight 22`, color `#D9D9D9`, `letterSpacing 0.07`, 1 línea con `ellipsis` (`numberOfLines={1}`).
  - "**5 artículos**": `Mulish Bold`, `fontSize 12`, `lineHeight 16`, color `#FFFFFF`. (Usar key i18n `stream.itemsCount` que ya existe: `"{{count}} artículos"`.)
  - Fila precio + timer (`justifyContent: space-between`):
    - Precio: `Mulish ExtraBold` (`FONT_FAMILY.bold` + `fontWeight '800'`), `fontSize 16`, `lineHeight 28`, color `#FDC700` (gold).
    - Timer `00:00`: misma tipografía, alineado a la derecha. En tarjetas activas el color del timer es **transparente** (placeholder) salvo en la tarjeta agendada donde es blanco. Mostrar timer sólo si hay `auction_seconds_remaining`.
  - Fila de acciones (gap `8`):
    - Botón **"Comenzar"**: `flex: 1`, fondo `rgba(255,255,255,0.2)`, `borderRadius 1000`, `paddingHorizontal 12`, `paddingVertical 8`, texto `Mulish Bold` 14 blanco centrado.
    - Botón cuadrado **fijar** (icono `keep`/pin): `36 x 36`, fondo `rgba(255,255,255,0.2)`, `borderRadius 1000`, icono `20` blanco. Usar de `lucide-react-native` el icono `Pin` (equivalente al `keep` de Figma).

**Tarjeta "Comienza pronto" (estado agendado, `starts_soon === true`):**
- Encabezado con icono `alarm` (lucide `AlarmClock`, `20`, blanco) + texto **"Comienza pronto"** (`Mulish Bold` 14 blanco). Usar key i18n nueva `stream.startsSoon`.
- Título igual que arriba.
- "5 artículos" + chevron `arrow_forward_ios` (lucide `ChevronRight`, `16`, blanco) al lado.
- Fila precio + timer (`00:00` en **blanco** acá).
- **Sin** botones "Comenzar"/fijar.

### Footer
- Botón **"Agregar Producto +"**: ancho completo, alto `40`, fondo `#685CF0`, `borderRadius 1000`, texto `Mulish Bold` 14 blanco centrado + signo `+`. Reutilizar `streamSheetStyles.primaryBtn` que ya exporta `StreamBottomSheet`. Pasarlo como `footer` del sheet.

### Tokens de color (resumen)
| Uso | Color |
|---|---|
| Panel glass | `rgba(2,5,15,0.4)` |
| Tab activa | `#454087` |
| Tab inactiva | `#DDDAFF` / texto `#18181B` |
| Precio gold | `#FDC700` |
| Título producto | `#D9D9D9` |
| Botón acción translúcido | `rgba(255,255,255,0.2)` |
| Botón primario / Agregar | `#685CF0` |
| Separador | `#DDD` |
| Home indicator | `#C7C8CA` |

---

## 2. Modelo de datos (qué existe HOY)

Archivo `src/api/platformApi.ts`.

```ts
// Lo que devuelve hoy GET /rooms/{roomId}/catalog
export interface RoomCatalogProductItem {
  uuid: string;
  title: string;
  currency: string;
  base_price_cents: number;
  image_url: string | null;
  quantity_on_hand: number;
}

// Forma rica que necesita el diseño (existe para profile-products):
export interface UserProfileProductItem {
  room_uuid: string;
  status: 'draft' | 'live' | 'ended' | string;
  title: string;
  thumbnail_url?: string | null;
  article_count: number;            // -> "X artículos"
  price_cents: number;
  currency: string;
  scheduled_at?: number | null;
  starts_soon?: boolean;            // -> tarjeta "Comienza pronto"
  auction_seconds_remaining?: number | null; // -> timer 00:00
}
```

> **GAP de datos:** `RoomCatalogProductItem` (lo que lista el catálogo del room) **no tiene**
> `article_count`, `scheduled_at`, `starts_soon` ni `auction_seconds_remaining`. El diseño los usa.
> **Decisión para Composer:** construir el componente contra un **view-model interno**
> (`LiveProductCardVM`, ver §3) y mapear desde `RoomCatalogProductItem`, dejando los campos
> ausentes como opcionales (timer/“Comienza pronto” sólo se muestran si vienen). Agregar un
> `// TODO(backend): extender /rooms/{roomId}/catalog con article_count, scheduled_at, starts_soon, auction_seconds_remaining`.
> No inventar que el endpoint ya los devuelve.

---

## 3. Acciones y GAPS de backend (MUY importante — no alucinar endpoints)

Investigado en `src/api/platformApi.ts`, `src/api/productsApi.ts`, `src/hooks/useStreamChat.ts`:

| Acción del diseño | ¿Existe API? | Cómo cablear |
|---|---|---|
| Listar productos del vivo | ✅ `getRoomCatalog(token, roomId)` → `GET /rooms/{id}/catalog` | Ya se usa en `openProductCatalog`. |
| Agregar producto | ✅ flujo existente `SellerAddProductDrawer` (`POST /me/products` con `room_id`) | Botón "Agregar Producto" abre ese drawer. |
| Iniciar **Subasta Rápida** | ✅ WebSocket, **no REST**: `sendAuctionStart(durationSeconds)` envía `{ type: 'auction_start', duration_seconds }` (en `useStreamChat.ts`) | "Comenzar" con tab "Subasta Rápida" → llama `onStartAuction(product)`. |
| Marcar **Comprar Ahora** (producto activo/destacado) | ❌ **No existe endpoint** | Exponer prop `onSetActiveProduct(product)`; dejar `// TODO(backend): endpoint set-active-product`. Por ahora callback no-op o stub que el padre cablee cuando exista. |
| **Sorteo** | ❌ **No existe endpoint** | Igual: prop `onStartRaffle(product)` + `// TODO(backend)`. |
| Fijar (pin/keep) | ❌ No existe | prop `onPinProduct(product)` + `// TODO(backend)`. |

**Regla:** todas las acciones sin backend se exponen como **props callback** del drawer y se
implementan en `SellerStreamScreen` como handlers que (por ahora) muestran un
`Alert` "próximamente" usando la key existente `stream.comingSoon`, salvo **Subasta Rápida**
que sí se cablea a `sendAuctionStart`. Así el UI queda 100% terminado y el backend se enchufa después.

---

## 4. Archivos a crear / modificar

### 4.1 MODIFICAR — `src/components/organisms/stream/StreamRoomProductsDrawer.tsx`
Reescribir para implementar el diseño. Nueva API de props:

```ts
export type LiveProductSaleMode = 'buy_now' | 'auction' | 'raffle';

export interface LiveProductCardVM {
  uuid: string;
  title: string;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
  articleCount: number;            // de article_count, fallback quantity_on_hand
  startsSoon?: boolean;
  auctionSecondsRemaining?: number | null;
  status?: string;
}

export interface StreamRoomProductsDrawerProps {
  visible: boolean;
  onClose: () => void;
  loading?: boolean;
  items: LiveProductCardVM[];
  errorMessage?: string | null;
  // tabs
  saleMode: LiveProductSaleMode;          // controlado por el padre
  onSaleModeChange: (mode: LiveProductSaleMode) => void;
  // acciones
  onStartProduct: (item: LiveProductCardVM) => void;  // botón "Comenzar" (depende de saleMode)
  onPinProduct: (item: LiveProductCardVM) => void;     // botón fijar
  onAddProduct: () => void;                            // footer "Agregar Producto"
}
```

Implementación:
- Mantener `StreamBottomSheet` como contenedor; pasar el botón "Agregar Producto" como `footer`.
- Subir `panel.maxHeight` a `'88%'`.
- Renderizar tabs (componente interno `SaleModeTabs` o inline) con los 3 valores.
- `FlatList` de tarjetas con `ItemSeparatorComponent` (línea `#DDD`).
- Tarjeta: helper `renderCard` que ramifica entre estado normal y `startsSoon`.
- Formato de precio: reusar `formatCatalogPrice(cents, currency)` (ya está en el archivo).
- Formato de timer `mm:ss` desde `auctionSecondsRemaining` (helper nuevo `formatCountdown`).
- Iconos: `Pin`, `AlarmClock`, `ChevronRight` desde `lucide-react-native`.
- Textos vía `useTranslation` (ver §5).

### 4.2 MODIFICAR — `src/components/pages/SellerStreamScreen/SellerStreamScreen.tsx`
- Agregar estado `const [saleMode, setSaleMode] = useState<LiveProductSaleMode>('buy_now');`
- Mapear `catalogItems: RoomCatalogProductItem[]` → `LiveProductCardVM[]` antes de pasar al drawer:
  ```ts
  const productCards: LiveProductCardVM[] = catalogItems.map((it) => ({
    uuid: it.uuid,
    title: it.title,
    imageUrl: it.image_url,
    priceCents: it.base_price_cents,
    currency: it.currency,
    articleCount: it.quantity_on_hand, // TODO(backend): usar article_count cuando exista
  }));
  ```
- Handlers nuevos:
  ```ts
  const handleStartProduct = useCallback((item: LiveProductCardVM) => {
    if (saleMode === 'auction') {
      sendAuctionStart(DEFAULT_AUCTION_SECONDS); // reusar el flujo WS existente
      setProductCatalogVisible(false);
      return;
    }
    // buy_now / raffle: sin backend todavía
    Alert.alert(t('common.appName'), t('stream.comingSoon'));
  }, [saleMode, sendAuctionStart, t]);

  const handlePinProduct = useCallback((_item: LiveProductCardVM) => {
    Alert.alert(t('common.appName'), t('stream.comingSoon')); // TODO(backend)
  }, [t]);
  ```
  > Si `sendAuctionStart` no está disponible en este scope, traerlo del hook `useStreamChat`
  > que ya usa la pantalla (verificar de dónde sale el chat/WS actual y reutilizar esa instancia;
  > **no** crear una segunda conexión WS).
- Actualizar el render de `StreamRoomProductsDrawer` con las nuevas props:
  ```tsx
  <StreamRoomProductsDrawer
    visible={productCatalogVisible}
    onClose={closeProductCatalog}
    loading={catalogLoading}
    items={productCards}
    errorMessage={catalogError}
    saleMode={saleMode}
    onSaleModeChange={setSaleMode}
    onStartProduct={handleStartProduct}
    onPinProduct={handlePinProduct}
    onAddProduct={() => { setProductCatalogVisible(false); openAddProduct(); }}
  />
  ```
  > `onAddProduct` cierra el catálogo y abre el `SellerAddProductDrawer` existente (que ya valida
  > categoría en `openAddProduct`). Mantener `SellerAddProductDrawer` tal cual.

### 4.3 MODIFICAR — `src/i18n/locales/es.json` (y los otros locales si existen, ej. `en.json`)
Ver §5.

### 4.4 (Opcional) Subcomponentes
Si la tarjeta queda grande, extraer:
- `src/components/molecules/stream/LiveProductCard.tsx`
- `src/components/molecules/stream/SaleModeTabs.tsx`

Seguir el patrón de estilos del repo (`StyleSheet.create`, `FONT_FAMILY`).

---

## 5. i18n — keys a usar/agregar

Bajo el objeto `"stream"` en `src/i18n/locales/es.json` (camelCase, español):

Ya existen y se reutilizan:
- `stream.itemsCount` = `"{{count}} artículos"`
- `stream.comingSoon` = `"Esta función estará disponible pronto."`
- `stream.productsCatalogEmpty`, `stream.productsCatalogTitle`

Cambiar:
- `stream.productsCatalogTitle` → `"Productos del Live"` (hoy dice "Productos del vivo").

Agregar:
```json
"productsSaleModeBuyNow": "Comprar Ahora",
"productsSaleModeAuction": "Subasta Rápida",
"productsSaleModeRaffle": "Sorteo",
"productStart": "Comenzar",
"startsSoon": "Comienza pronto",
"addProductCta": "Agregar Producto"
```
Replicar las mismas keys en cualquier otro locale presente (`en.json`, etc.) con su traducción.

---

## 6. Pasos en orden (para Composer)

1. **i18n:** agregar/ajustar las keys de §5 en todos los locales.
2. **Drawer:** reescribir `StreamRoomProductsDrawer.tsx` con la nueva API de props (§4.1) y el
   spec visual (§1). Definir y exportar `LiveProductCardVM`, `LiveProductSaleMode`.
   Implementar tabs, tarjeta normal, tarjeta "Comienza pronto", footer "Agregar Producto".
   Agregar helper `formatCountdown(seconds)` → `mm:ss`.
3. **Pantalla:** en `SellerStreamScreen.tsx` agregar `saleMode` state, el `map` a `productCards`,
   los handlers `handleStartProduct` / `handlePinProduct`, y actualizar las props del render del
   drawer (§4.2). Reutilizar la instancia WS / `sendAuctionStart` existente — no crear otra.
4. **Verificación de tipos:** correr `npx tsc --noEmit` (o el script de typecheck del repo) y
   resolver errores.
5. **Lint:** correr el linter del repo si existe (`npm run lint`).
6. Revisión visual contra el screenshot del diseño.

---

## 7. Criterios de aceptación

- [ ] El drawer muestra título "Productos del Live" + X, tabs (Comprar Ahora activo por defecto), lista y footer "Agregar Producto", con el glass/blur existente.
- [ ] Tabs cambian de estado visual (activa `#454087` blanco / inactivas `#DDDAFF` `#18181B`) y actualizan `saleMode`.
- [ ] Tarjeta normal: imagen 132, título ellipsis `#D9D9D9`, "X artículos", precio gold, botón "Comenzar" + botón fijar.
- [ ] Tarjeta con `startsSoon`: icono alarma + "Comienza pronto", chevron, timer blanco, sin botones de acción.
- [ ] "Comenzar" con tab Subasta Rápida dispara `sendAuctionStart` (WS) y cierra el drawer; con Comprar Ahora/Sorteo muestra alert "próximamente".
- [ ] "Agregar Producto" cierra el catálogo y abre `SellerAddProductDrawer` (respeta el guard de categoría existente).
- [ ] Estados `loading` / `error` / vacío se siguen mostrando.
- [ ] `tsc --noEmit` pasa sin errores nuevos.

---

## 8. Restricciones / qué NO hacer

- ❌ No instalar NativeWind/Tailwind ni otras dependencias. Usar `StyleSheet` + `FONT_FAMILY`.
- ❌ No inventar endpoints REST para set-active-product, sorteo o pin: dejar `// TODO(backend)` y callback con alert "próximamente".
- ❌ No abrir una segunda conexión WebSocket: reutilizar la del chat/stream existente.
- ❌ No tocar `SellerAddProductDrawer` ni el flujo de alta de producto (sólo invocarlo).
- ✅ Mantener el patrón de `StreamBottomSheet` / `GlassBackdrop` y los tokens de color del repo.

---

## 9. Referencias de archivos

- Drawer a reescribir: `src/components/organisms/stream/StreamRoomProductsDrawer.tsx`
- Contenedor sheet (reutilizar): `src/components/organisms/stream/StreamBottomSheet.tsx` (exporta `streamSheetStyles`)
- Backdrop glass: `src/components/organisms/profile/GlassBackdrop.tsx`
- Pantalla: `src/components/pages/SellerStreamScreen/SellerStreamScreen.tsx`
- Overlay que abre el drawer (product stack): `src/components/organisms/stream/StreamSellerOverlay.tsx` → `onOpenProductCatalog`
- Add product (reutilizar): `src/components/organisms/stream/SellerAddProductDrawer.tsx`
- API: `src/api/platformApi.ts` (`getRoomCatalog`, `getRoomLiveCommerce`, tipos), `src/api/productsApi.ts`
- WS / subasta: `src/hooks/useStreamChat.ts` (`sendAuctionStart`)
- Tipografía: `src/theme/typography.ts` (`FONT_FAMILY`)
- i18n: `src/i18n/locales/es.json` (objeto `stream`)
- Diseño Figma: file `eI9vYI57eEgLIkLiaSq0nJ`, node `698-13498` ("Productos del Live")
