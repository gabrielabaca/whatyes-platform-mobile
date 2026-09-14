# UI and push sounds

Every file in `files/` is referenced by name from `src/utils/uiFeedback.ts`
(in-app sounds) or from the backend push payload (`service-platform`,
`src/services/push_service.py`). The file names are the contract: the code never
knows about paths, only about these base names.

## Where each platform reads them from

| Platform | Location | How it gets there |
|---|---|---|
| iOS | Main bundle (`PulpoLive.app/<name>.wav`) | `react-native.config.js` lists `assets/sounds/files` under `iosAssets`; `npx react-native-asset` adds every file to the Xcode target's *Copy Bundle Resources* (same mechanism as the fonts). Run it again after adding or replacing a file, then rebuild. |
| Android | `android/app/src/main/res/raw/<name>.wav` | A **second copy** of every file, committed by hand. `react-native-asset` only routes `.mp3` to `res/raw`, so WAV files are not linked automatically. |

Keep both copies identical. If you replace a file, replace it in both places.

## Format rules (they fail silently when broken)

- **iOS**: CAF, AIFF or WAV (Linear PCM). **An MP3 does not play** for push
  notifications: iOS falls back to the default alert sound without any error.
  Push sounds must be shorter than **30 s**. WAV also works for in-app playback
  through `AVAudioPlayer`. Convert with `afconvert -f caff -d LEI16 in.wav out.caf`
  if you want CAF.
- **Android**: the resource name must be **lowercase letters, digits and
  underscores only** (no hyphens, no capitals) and is referenced **without the
  extension** (`outbid`, not `outbid.wav`). A bad name fails the Gradle build,
  which is the good case; a name that differs from the manifest fails silently
  at runtime (`resource not found`, swallowed by the feedback module).
- **All files normalized to the same perceived loudness**, and clearly below the
  level of the live audio: they play on top of the seller's voice.
- **No leading silence.** Trim the head of every file; 100 ms of silence makes a
  UI sound feel late. Most freesound downloads have it.
- Mono is fine. 44.1 kHz / 16-bit is the safe choice for both platforms.
- Licensing: CC0 only (see `docs/plan-sonidos.md` §F).

## In-app manifest (16 files, played by `uiFeedback.ts`)

| File | Event | Character / target length |
|---|---|---|
| `outbid` | Someone outbid you (transition only) | Urgent alert, distinct from everything else, 0.3–0.5 s |
| `countdown_tick` | Last 5 s of the auction timer, once per second | Dry clock tick, < 0.15 s |
| `auction_start` | An auction / buy-now offer starts | Gavel or short bell, ~0.4 s |
| `auction_extend` | Anti-sniping extension (+N s) | Subtle whoosh, ~0.2 s |
| `bid_placed` | Your bid was sent | Minimal confirmation, ~0.15 s |
| `bid_rejected` | Your bid was below the floor | Short soft error, ~0.3 s |
| `win_celebration` | You won the auction / buy-now | Celebration with sparkle, 1–1.5 s. **Same file the push uses.** |
| `payment_success` | Purchase became `paid`; also wallet linked (same file) | Success, ~0.8 s |
| `payment_error` | Wallet / card link failed | Soft error, ~0.4 s (no harsh buzzer) |
| `product_created` | Product created | Light success, ~0.5 s |
| `notification_pop` | Notification arrived while the app is open | Very short pop, ~0.2 s |
| `message_sent` | 1-to-1 message sent | Classic messenger "sent", < 0.2 s |
| `message_received` | 1-to-1 message received | Classic messenger "received", < 0.2 s, different from `message_sent` |
| `prelive_countdown_tick` | Seller pre-live 3-2-1 (plays 3 times) | Rising tone, short |
| `prelive_countdown_go` | Seller goes live | Final tone, brighter |
| `push_product_sold` | Seller sold a product (foreground notification) | Cash register "cha-ching", ~0.6 s |

## Push-only files (2 files + `win_celebration` / `push_product_sold`, named by the backend payload)

| File | Notification type | Character |
|---|---|---|
| `win_celebration` | `auction_won`, `buy_now_won`, `raffle_won` | Same file as the in-app win, on purpose: the user has to associate them |
| `push_live_start` | `seller_live_start` | Short, cheerful bell, ~0.5 s |
| `push_product_sold` | `product_sold` (seller) | Same file as the in-app product-sold cue |
| `push_payment_action` | `purchase_payment_action_required` | Attention, **not** error, ~0.5 s |

Every other notification type keeps the system default sound.

On Android the push sound belongs to the **notification channel**, which is
immutable once created. Channels are created in `MainApplication.kt`
(`pulpo_default`, `pulpo_wins`, `pulpo_live`, `pulpo_sales`, `pulpo_payments`)
and must match `push_service.py`. Changing a sound later requires a new
channel ID and a migration.

## Placeholders

While a file is listed in `PLACEHOLDER.md` it is 0.1 s of silence. Delete the
entry from that list when you drop the real file.
