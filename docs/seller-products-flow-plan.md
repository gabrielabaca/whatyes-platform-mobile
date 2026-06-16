# Plan: Flujo completo "Productos del Live" del vendedor (mobile + backend)

> Documento de implementación para **Cursor Composer 2.5**, que tiene acceso a TODO el monorepo
> (`platform_mobile`, `service-platform`, `service-users`, `service_payments`).
> **Supersede** a `docs/seller-products-drawer-plan.md`: aquel asumía que no existían endpoints
> de set-active/auction/raffle, lo cual es **incorrecto** — el backend ya los tiene (ver §2).
> Este plan cubre el flujo entero y separa: lo que ya existe, lo que falta cablear en mobile,
> y lo que falta implementar en los microservicios.

## Arquitectura (verificada)
- **Mobile:** React Native 0.83 + TS, estilos `StyleSheet` (NO NativeWind), tipografía `Mulish` (`FONT_FAMILY`).
- **service-platform** (Python/FastAPI + Postgres async): dueño de `products`, `room_products`,
  `auctions`, `bids`, `sales`, rooms, catálogo, live-commerce, WS. El mobile le pega vía `PLATFORM_HTTP_URL`.
- **service-users** (Python/FastAPI + Postgres): auth/JWT. service-platform valida tokens vía `GET /auth/me`.
- **service_payments**: pagos (MercadoPago) — usado por "Comprar Ahora" (compra del buyer).
- Comunicación entre servicios: **DB compartida + HTTP síncrono** (no hay colas/eventos).

---

## 1. Flujo objetivo (UX)

En el vivo del vendedor (`SellerStreamScreen`):

1. Tap en el stack de productos → **drawer "Productos del Live"** (Figma `698:13498`).
   - Tabs de formato: **Comprar Ahora / Subasta Rápida / Sorteo**.
   - Lista de productos del room con acción **"Comenzar"** (según tab) + **fijar** (pin), y estado **"Comienza pronto"**.
   - Footer **"Agregar Producto +"**.
2. Tap "Agregar Producto" → **drawer de tipo de lista** (Figma `698:13700`):
   - **Crear Lista Temporaria** → `scope = room_exclusive` (solo este vivo).
   - **Crear Lista Permanente** → `scope = global` (reutilizable en todos sus vivos).
   - **Importar Stock** → **deshabilitado** por ahora (visible, no accionable).
3. Elegida Temporaria/Permanente → **formulario "Carga un producto"** (Figma `698:11652` Comprar Ahora,
   `698:11849` Subasta, `698:12046` Sorteo). El selector **Precio** (tabs Comprar Ahora/Subasta/Sorteo)
   define el `live_sale_mode` y los campos visibles. Botones **Publicar** / **Guardar Borrador**.

**Regla de negocio (scope):**
- **Permanente (`global`)**: el producto queda en el catálogo del vendedor y puede usarse en cualquiera de sus vivos.
- **Temporaria (`room_exclusive`)**: el producto existe sólo para el vivo actual (`exclusive_room_id = room_id`).

---

## 2. Estado del backend HOY (verificado en service-platform)

### Endpoints que YA existen (sólo falta cablearlos en mobile)
Archivo: `service-platform/src/controller/seller_room_catalog_controller.py`
- `POST /me/rooms/{room_id}/catalog/products/{product_id}/set-active` → `is_active=true`, `live_sale_mode=BUY_NOW`.
- `POST /me/rooms/{room_id}/catalog/products/{product_id}/pin` → pin/unpin (sort priority).
- `POST /me/rooms/{room_id}/catalog/products/{product_id}/schedule` → programar activación.
- `POST /me/rooms/{room_id}/catalog/products/{product_id}/start-auction` → crea `Auction`, `live_sale_mode=AUCTION`.
- `POST /me/rooms/{room_id}/catalog/products/{product_id}/start-raffle` → **placeholder**: marca `live_sale_mode=RAFFLE`, no corre sorteo real.

Archivo: `service-platform/src/controller/seller_products_controller.py`
- `POST /me/products/images` → sube a S3, devuelve URLs.
- `POST /me/products` → crea producto (+inventory) y, si viene `room_id`, lo linkea al catálogo (`RoomProduct`).
  Payload (`CreateProductRequest`) ya incluye: `scope` (`global|room_exclusive`), `room_id`, `sale_format`
  (`individual|lot`), `package_tier`, `weight_kg`, `condition`, `sku`, `quantity_on_hand`, etc.

Catálogo / live-commerce (lectura): `GET /rooms/{id}/catalog`, `GET /rooms/{id}/live-commerce`.

### Modelos relevantes (service-platform/src/models)
- `Product` (`products`): `scope` (`GLOBAL|ROOM_EXCLUSIVE`), `exclusive_room_id`, `sale_format`, etc.
  **No tiene** `status` (draft/published) ni config de subasta/sorteo.
- `RoomProduct` (`room_products`): `is_active`, `pinned_at`, `scheduled_at`, `sort_order`,
  `live_sale_mode` (`BUY_NOW|AUCTION|RAFFLE`). **No tiene** min-bid, duración subasta ni modo sorteo.
- `Auction` (`auctions`) + `Bid` (`bids`): subasta funcional (start vía REST o WS, bids vía WS, auto-end con ganador).
- `Sale` (`sales`): venta con `payment_status` + `payment_external_id` (integración pagos).

### WS (service-platform/src/controller/ws_controller.py)
Maneja `chat`, `like`, `auction_start`, `auction_bid`, `auction_end` (auto), `stream_pause/resume`, `ping`.
**No** maneja eventos de raffle ni broadcast de "set-active/buy_now".

### GAPS reales de backend (a implementar, §5)
- **Motor de sorteo** (start-raffle hoy es placeholder; falta participantes + draw + ganador + WS).
- **Config por formato** en alta de producto: `min_bid_cents`, `auction_duration_seconds`, `raffle_participation_mode`.
- **Estado borrador** del producto ("Guardar Borrador").
- **`GET /me/products`** (listar catálogo permanente del vendedor) para reutilizar en otros vivos.
- (Opc.) Broadcast WS al hacer set-active para que viewers actualicen sin polling.

---

## 3. PARTE A — Mobile (platform_mobile)

> Reusar patrón `StreamBottomSheet` + `GlassBackdrop`. Estilos `StyleSheet` + `FONT_FAMILY`.
> Iconos: `lucide-react-native`. NO instalar dependencias nuevas.

### A1. Drawer "Productos del Live" (Figma `698:13498`)
Seguir **íntegro** `docs/seller-products-drawer-plan.md` §1 y §4.1 para el spec visual y la API de props
(tabs `saleMode`, tarjetas, "Comienza pronto", footer). **Diferencia clave vs ese doc:** las acciones
SÍ tienen backend, así que los handlers se cablean a endpoints reales (no a alerts "próximamente"):
- "Comenzar" con tab **Comprar Ahora** → `setActiveRoomProduct(roomId, productId)`.
- "Comenzar" con tab **Subasta Rápida** → `startRoomProductAuction(roomId, productId, { durationSeconds, minBidCents })`
  (o seguir usando el WS `auction_start` existente — ver A6; preferir REST para consistencia y persistencia de config).
- "Comenzar" con tab **Sorteo** → `startRoomProductRaffle(roomId, productId, { participationMode })`.
- Botón **fijar** → `pinRoomProduct(roomId, productId)` (toggle).
Tras cada acción: cerrar drawer (o refrescar) y llamar `refreshLiveCommerce()`.

### A2. Drawer "Agregar Producto" / tipo de lista (Figma `698:13700`)
Nuevo componente: `src/components/organisms/stream/SellerAddProductTypeDrawer.tsx` (usa `StreamBottomSheet`).
Spec visual:
- Título "Agregar Producto" + X.
- 3 filas (gap `24`, separador inferior implícito por padding), cada una: ícono circular `32` fondo `#DBDBDF`
  (icono `18`), bloque de texto (título `Mulish SemiBold 14` `#FFFFFF`; subtítulo `Mulish SemiBold 12` `#D9D9D9`),
  y a la derecha un radio `24` (`bg rgba(104,92,240,0.1)`, borde `#CBCEFF`).
- Filas:
  1. **Crear Lista Temporaria** — "Crea una lista de productos rápida para usar mientras estés en este vivo". (icono reloj → lucide `Timer`).
  2. **Crear Lista Permanente** — "Crea una lista permanente que podrás usar en todos tus vivos". (icono calendario → lucide `CalendarCheck`).
  3. **Importar Stock** — "Exporta una lista de productos". **Deshabilitado** (opacidad `0.5`, sin onPress; opcional badge "Próximamente"). (icono → lucide `CloudUpload`).
- Home indicator inferior.
Props:
```ts
export type ProductListType = 'temporary' | 'permanent';
interface SellerAddProductTypeDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (type: ProductListType) => void; // 'temporary'|'permanent'
}
```
Al seleccionar → cerrar este drawer y abrir el formulario (A3) con `scope` derivado:
`temporary → 'room_exclusive'`, `permanent → 'global'`.

### A3. Formulario "Carga un producto" (Figma `698:11652` / `698:11849` / `698:12046`)
**Reconciliar con lo existente**: ya hay `AddProductScreen` (`useAddProductForm`) y un drawer in-live
`SellerAddProductDrawer` (`useSellerLiveAddProduct`). **Decisión:** extender el formulario in-live
(`SellerAddProductDrawer` + `useSellerLiveAddProduct`) para soportar el selector de formato y los campos
condicionales, manteniéndolo como sheet sobre el vivo (no navegar a pantalla con bottom-nav).
> Composer: revisar ambos (`AddProductScreen`, `SellerAddProductDrawer`) y elegir el menor duplicado;
> si `AddProductScreen` ya tiene casi todo, extraer un componente de formulario compartido. Mantener una sola fuente de verdad.

Campos comunes (todas las modalidades):
- **Fotos** (uploader, reusa `uploadProductImages`), **Categoría** (select), **Título**, **Descripción**,
  **Cantidad Disponible** (stepper −/valor/+ → `quantity_on_hand`).
- Sección **Precio** con **tabs de formato** (Comprar Ahora `buy_now` / Subasta Rápida `auction` / Sorteo `raffle`).
  Mismo estilo de tabs que el drawer (activo `#454087` blanco / inactivo `#DDDAFF` `#18181B`).

Campos condicionales por formato (del diseño):
- **Comprar Ahora**: `Precio` (→ `base_price_cents`). (Sin min-oferta ni tiempo.)
- **Subasta Rápida**: `Peso` (select tiers), `Mínimo de Oferta` (→ `min_bid_cents`),
  `Tiempo límite de subasta` (valor + unidad Segundos → `auction_duration_seconds`, rango 5–300), `SKU`.
- **Sorteo**: modo de participación (radios, single-select):
  `Solo para seguidores` (`followers_only`), `Abierto para todos` (`everyone`),
  `Premio para compradores` (`buyers`); + `Peso`, `SKU`. (Sin precio/subasta.)
  > Nota: los frames Figma comparten un master y muestran campos solapados; el mapeo de arriba es el
  > correcto por modalidad. Mostrar/ocultar según `live_sale_mode`.

Botones:
- **Publicar** (`#685CF0`) → crea el producto y lo deja activo/listo en el vivo (ver A4).
- **Guardar Borrador** (texto `#685CF0`) → crea el producto con `status='draft'` (no se activa en el vivo).

### A4. Cliente API mobile — agregar funciones
Archivo: `src/api/platformApi.ts` (mismo base URL que el catálogo). Tipar y exponer:
```ts
// Acciones de catálogo en vivo (endpoints ya existentes en backend)
export async function setActiveRoomProduct(token, roomId, productId): Promise<RoomCatalogActionResponse>;
export async function pinRoomProduct(token, roomId, productId): Promise<RoomCatalogActionResponse>;
export async function scheduleRoomProduct(token, roomId, productId, scheduledAt: number): Promise<RoomCatalogActionResponse>;
export async function startRoomProductAuction(token, roomId, productId, body: { durationSeconds: number; minBidCents?: number }): Promise<RoomCatalogActionResponse>;
export async function startRoomProductRaffle(token, roomId, productId, body: { participationMode: 'followers_only'|'everyone'|'buyers' }): Promise<RoomCatalogActionResponse>;
```
Extender `createProduct` (en `productsApi.ts`) para enviar los nuevos campos opcionales:
`min_bid_cents`, `auction_duration_seconds`, `raffle_participation_mode`, `live_sale_mode`, `status` ('draft'|'published').
Definir/actualizar tipos en `src/api/types.ts`: `LiveSaleMode = 'buy_now'|'auction'|'raffle'`,
`RaffleParticipationMode`, `ProductStatus = 'draft'|'published'`, `RoomCatalogActionResponse`.

### A5. Integración en `SellerStreamScreen.tsx`
- Estado: `saleMode` (drawer), visibilidad de los 3 drawers/forms, y `pendingScope` (de A2).
- Handlers que llaman A4 y luego `refreshLiveCommerce()`.
- Flujo de apertura: `Productos del Live` → `Agregar Producto` cierra el catálogo y abre `SellerAddProductTypeDrawer`
  → `onSelectType` setea `pendingScope` y abre el formulario (A3) con `scope` + `live_sale_mode` (= `saleMode` actual del catálogo, como default editable).
- Mantener el guard de categoría existente (`addProductNoCategory`).

### A6. Subasta: REST vs WS
Hoy el mobile inicia subasta por **WS** (`sendAuctionStart` en `useStreamChat`). El backend también ofrece
`start-auction` REST que persiste config. **Recomendación:** usar **REST** `startRoomProductAuction` para iniciar
(con `minBidCents` + `durationSeconds`), y mantener el WS para `auction_bid`/`auction_end` (tiempo real).
Verificar que el backend emita por WS el `auction_start` cuando se inicia por REST (si no, ver §5.5).
> No abrir una segunda conexión WS: reusar la del chat.

### A7. i18n
Agregar bajo `stream` en `src/i18n/locales/*.json` (y replicar en todos los locales):
```
productsSaleModeBuyNow, productsSaleModeAuction, productsSaleModeRaffle,
productStart, startsSoon, addProductCta,
addProductTypeTitle, addProductTypeTemporary, addProductTypeTemporaryDesc,
addProductTypePermanent, addProductTypePermanentDesc, addProductTypeImport, addProductTypeImportDesc, comingSoon,
addProductMinBid, addProductAuctionTime, addProductSeconds,
raffleFollowersOnly, raffleFollowersOnlyDesc, raffleEveryone, raffleEveryoneDesc, raffleBuyers, raffleBuyersDesc,
publish, saveDraft
```

---

## 4. PARTE B — service-platform (Python/FastAPI)

> Verificar nombres/firmas exactos en el repo antes de editar. Usar el patrón controller→service→model existente.
> Toda nueva columna requiere **migración** (revisar si usan Alembic o `Base.metadata.create_all`; en `src/models`).

### B1. Config por formato en alta de producto
- En `CreateProductRequest` (`src/schemas/product_schema.py`) agregar campos opcionales:
  `live_sale_mode: RoomProductLiveSaleMode | None`, `min_bid_cents: int | None`,
  `auction_duration_seconds: int | None` (5–300), `raffle_participation_mode: str | None`,
  `status: ProductStatus = 'published'`.
- En `RoomProduct` (`src/models/product_model.py`) agregar columnas nullable:
  `auction_min_bid_cents Integer`, `auction_duration_seconds Integer`,
  `raffle_participation_mode String(32)`. (Alternativa: tabla `room_product_live_config`.)
- En `seller_products_service.create_product`: al crear el `RoomProduct`, persistir `live_sale_mode`
  y la config recibida. Si `scope=room_exclusive`, setear `Product.exclusive_room_id = room_id` (verificar que hoy se haga).

### B2. Estado borrador (Guardar Borrador)
- Agregar a `Product` columna `status` (`SQLEnum(ProductStatus = draft|published)`, default `published`) **o**
  reusar un flag. "Guardar Borrador" crea el producto con `status='draft'` y **no** lo activa en el vivo
  (no marca `is_active`, no inicia auction/raffle). Asegurar que el catálogo del vivo y live-commerce
  **excluyan** drafts (filtros en `room_controller.get_room_catalog` / `live_commerce_service`).

### B3. Motor de sorteo (raffle) — el gap más grande
Hoy `start_raffle` (`src/services/seller_room_catalog_service.py`) sólo marca estado. Implementar:
- Nuevos modelos: `Raffle` (`uuid, room_id, product_id, participation_mode, status[active|ended], started_at, ends_at?`)
  y `RaffleParticipant` (`raffle_id, user_id, username, joined_at`).
- Extender `POST .../start-raffle` para aceptar `{ participation_mode }` y crear el `Raffle` activo.
- Recolección de participantes según modo:
  - `followers_only`: validar contra follows (verificar dónde viven follows; si en service-users, exponer/consultar).
  - `everyone`: cualquier viewer del room (registrar al unirse o al participar por WS).
  - `buyers`: usuarios con `Sale` (paid) en el room tras iniciar el sorteo.
- WS: agregar eventos `raffle_start`, `raffle_join`, `raffle_end` (con `winner`) en `ws_controller.py`,
  análogo al ciclo de auction. Selección de ganador aleatoria entre participantes elegibles.
  > Aleatoriedad en backend Python (`random.choice`) está OK (no aplica la restricción de los scripts de workflow).
- Endpoint para que el viewer participe (o reusar WS `raffle_join`).
- Persistir ganador (¿en `Sale` con precio 0 / premio, o tabla `raffle_winner`?). Definir y documentar.

### B4. `GET /me/products` (catálogo permanente del vendedor)
- Nuevo endpoint en `seller_products_controller.py`: lista los `Product` del `owner_user_id` con `scope=GLOBAL`
  (paginado), incluyendo inventory y flag de si ya está en el room actual. Sirve para reutilizar productos
  permanentes en otros vivos (y futura "Importar Stock"). Response item: `uuid, title, image_url, base_price_cents, currency, quantity_on_hand, status`.
- (Mobile lo usará a futuro; dejar listo aunque "Importar Stock" siga deshabilitado en UI.)

### B5. (Opcional) Broadcast en tiempo real de set-active
- En `set_active_product` / `start_raffle` REST, emitir por WS un evento (`active_product_changed`) al room
  para que los viewers actualicen live-commerce sin esperar el polling. Reusar el `manager.broadcast` del WS.

### B6. Validaciones / auth
- Todos los nuevos endpoints bajo `/me/...` requieren seller dueño del room (reusar `_verify_room_owner` y
  `_require_seller`). Mantener el middleware de token existente.

---

## 5. PARTE C — service_payments (Comprar Ahora / compra del buyer)

> El foco del seller es "set-active buy_now". La **compra** del buyer es el lado complementario.
> Verificar el estado actual de la integración (`Sale` + `payment_external_id` ya existen en service-platform).

- Confirmar/implementar el flujo: buyer toca "Comprar Ahora" sobre el `active_product` → service-platform crea
  `Sale (pending)` → service_payments genera preferencia/checkout MercadoPago → webhook de pago actualiza
  `Sale.payment_status=paid` y descuenta inventory (`ProductInventory`).
- Si ya existe parcialmente, sólo cablear el botón "Comprar Ahora" del lado buyer (fuera del alcance del seller,
  pero necesario para que "Comprar Ahora" funcione end-to-end). Documentar qué falta.
- Endpoints a verificar en `service_payments`: creación de preferencia, webhook, y el cliente HTTP que
  service-platform usa para `payment_external_id`.

---

## 6. Orden de ejecución sugerido (para Composer)

1. **Backend B1 + B2** (config por formato + draft) con migraciones. Tests de `create_product`.
2. **Mobile A4** (cliente API) + tipos.
3. **Mobile A1** (drawer "Productos del Live") cableado a endpoints reales.
4. **Mobile A2 + A3 + A5** (tipo de lista + formulario + integración).
5. **Backend B3** (motor de sorteo) + **Mobile** del lado viewer para participar (si entra en alcance).
6. **Backend B4** (`GET /me/products`).
7. **Backend B5** (broadcast WS opcional).
8. **Parte C** (Comprar Ahora end-to-end) si está en alcance.
9. i18n (A7), typecheck `tsc --noEmit`, lint, y verificación visual contra los frames.

---

## 7. Criterios de aceptación (end-to-end)

- [ ] Drawer "Productos del Live" matchea Figma `698:13498`; tabs cambian `saleMode`; acciones llaman a los endpoints correctos y refrescan live-commerce.
- [ ] "Agregar Producto" abre el drawer de tipo (Figma `698:13700`); "Importar Stock" deshabilitado.
- [ ] Temporaria → `scope=room_exclusive`; Permanente → `scope=global`. Verificable en DB (`products.scope`, `exclusive_room_id`).
- [ ] Formulario "Carga un producto" muestra los campos correctos por formato (Comprar Ahora / Subasta / Sorteo) según Figma.
- [ ] **Publicar** crea producto + lo deja listo/activo en el vivo; **Guardar Borrador** lo crea con `status=draft` y NO lo activa ni aparece en el catálogo del vivo.
- [ ] Comprar Ahora: set-active marca `is_active` + `live_sale_mode=buy_now`; el viewer ve el producto activo.
- [ ] Subasta: inicia con min-oferta + duración; bids y auto-end con ganador funcionan.
- [ ] Sorteo: inicia con modo de participación; participantes se recolectan según modo; se sortea un ganador y se notifica por WS.
- [ ] Producto permanente queda disponible para reusar en otros vivos (`GET /me/products`).
- [ ] `tsc --noEmit` y los tests del backend pasan; migraciones aplican limpio.

---

## 8. Restricciones / qué NO hacer
- ❌ No instalar NativeWind/Tailwind ni dependencias nuevas en mobile. `StyleSheet` + `FONT_FAMILY`.
- ❌ No abrir una segunda conexión WebSocket: reusar la del chat/stream.
- ❌ No duplicar el formulario de alta: reconciliar `AddProductScreen` / `SellerAddProductDrawer` en un solo origen.
- ❌ No romper el contrato actual de `createProduct`: los campos nuevos son **opcionales** y retrocompatibles.
- ❌ No exponer drafts en catálogo del vivo ni en live-commerce.
- ✅ Verificar firmas/tablas reales en cada repo antes de editar; agregar migraciones para columnas nuevas.

---

## 9. Referencias

**Figma** (file `eI9vYI57eEgLIkLiaSq0nJ`):
- Drawer Productos del Live: `698:13498`
- Drawer tipo de lista (Agregar Producto): `698:13700`
- Form Comprar Ahora: `698:11652` · Subasta: `698:11849` · Sorteo: `698:12046`

**Mobile** (`platform_mobile`):
- `src/components/organisms/stream/StreamRoomProductsDrawer.tsx` (drawer a completar)
- `src/components/organisms/stream/StreamBottomSheet.tsx` (+ `streamSheetStyles`), `GlassBackdrop.tsx`
- `src/components/organisms/stream/SellerAddProductDrawer.tsx`, hook `useSellerLiveAddProduct`
- `src/components/pages/AddProductScreen/AddProductScreen.tsx`, hook `useAddProductForm`
- `src/components/pages/SellerStreamScreen/SellerStreamScreen.tsx`
- `src/api/platformApi.ts`, `src/api/productsApi.ts`, `src/api/types.ts`
- `src/hooks/useStreamChat.ts` (`sendAuctionStart`, WS)
- Plan previo (UI del drawer): `docs/seller-products-drawer-plan.md`

**service-platform** (`../service-platform`):
- `src/controller/seller_room_catalog_controller.py` (set-active, pin, schedule, start-auction, start-raffle)
- `src/services/seller_room_catalog_service.py` (lógica; `start_raffle` placeholder)
- `src/controller/seller_products_controller.py`, `src/services/seller_products_service.py` (create_product, images)
- `src/schemas/product_schema.py` (`CreateProductRequest`)
- `src/models/product_model.py` (`Product`, `RoomProduct`, `ProductScope`, `RoomProductLiveSaleMode`, `ProductSaleFormat`)
- `src/models/auction_model.py` (`Auction`, `Bid`, `Sale`)
- `src/services/live_commerce_service.py`, `src/controller/room_controller.py` (catalog/live-commerce)
- `src/controller/ws_controller.py` (WS: auction/chat; agregar raffle)
- `src/main.py` (middleware auth)

**service-users** (`../service-users`): auth/JWT (`/auth/me`) — sin cambios salvo que B3 necesite consultar follows.

**service_payments** (`../service_payments`): compra "Comprar Ahora" (verificar integración con `Sale`).
