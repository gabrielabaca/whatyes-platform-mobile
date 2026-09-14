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

**`react-native.config.js` must keep `iosAssets` pointed at `./assets/sounds/files`
and NEVER at `./assets/sounds`.** If it pointed at the parent folder,
`react-native-asset` would copy the `.mp3` files from `_source/` into
`android/app/src/main/res/raw/`, where `outbid.mp3` and `outbid.wav` collide
as the same resource name and the Gradle build fails.

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

Lengths are the real WAV duration (PCM frames / 44.1 kHz), not the generation target.

| File | Event | Character / actual length |
|---|---|---|
| `outbid` | Someone outbid you (transition only) | Urgent alert, distinct from everything else. **0.55 s** |
| `countdown_tick` | Last 5 s of the auction timer, once per second | Dry clock tick. **0.15 s** |
| `auction_start` | An auction / buy-now offer starts | Gavel or short bell. **1.00 s** |
| `auction_extend` | Anti-sniping extension (+N s) | Subtle whoosh. **0.48 s** |
| `bid_placed` | Your bid was sent | Minimal confirmation. **0.30 s** |
| `bid_rejected` | Your bid was below the floor | Short soft error. **0.50 s** |
| `win_celebration` | You won the auction / buy-now | Celebration with sparkle. **1.55 s**. **Same file the push uses.** |
| `payment_success` | Purchase became `paid`; also wallet linked (same file) | Success. **0.81 s** |
| `payment_error` | Wallet / card link failed | Soft error. **0.60 s** (no harsh buzzer) |
| `product_created` | Product created | Light success. **0.09 s** |
| `notification_pop` | Notification arrived while the app is open | Very short pop. **0.11 s** |
| `message_sent` | 1-to-1 message sent | Classic messenger "sent". **0.31 s** |
| `message_received` | 1-to-1 message received | Classic messenger "received". **0.60 s**, different from `message_sent` |
| `prelive_countdown_tick` | Seller pre-live 3-2-1 (plays 3 times) | Rising tone. **0.40 s** |
| `prelive_countdown_go` | Seller goes live | Final tone, brighter. **0.62 s** |
| `push_product_sold` | Seller sold a product (foreground notification) | Cash register "cha-ching". **0.44 s** |

## Push-only files (2 files + `win_celebration` / `push_product_sold`, named by the backend payload)

| File | Notification type | Character / actual length |
|---|---|---|
| `win_celebration` | `auction_won`, `buy_now_won`, `raffle_won` | Same file as the in-app win, on purpose: the user has to associate them. **1.55 s** |
| `push_live_start` | `seller_live_start` | Short, cheerful bell. **1.00 s** |
| `push_product_sold` | `product_sold` (seller) | Same file as the in-app product-sold cue. **0.44 s** |
| `push_payment_action` | `purchase_payment_action_required` | Attention, **not** error. **0.70 s** |

Every other notification type keeps the system default sound.

On Android the push sound belongs to the **notification channel**, which is
immutable once created. Channels are created in `MainApplication.kt`
(`pulpo_default`, `pulpo_wins`, `pulpo_live`, `pulpo_sales`, `pulpo_payments`)
and must match `push_service.py`. Changing a sound later requires a new
channel ID and a migration.

## Origin of every file (licensing trail)

All 18 sounds were **generated with ElevenLabs Text to Sound Effects on 2026-09-14**,
on a paid **Starter** plan, which grants a commercial licence and leaves the rights to
the output with us. No CC0 downloads were used. The original MP3s are kept in
`_source/<name>.mp3`, named after the manifest, so a file can be re-derived with a
different trim or level without spending credits again.

Every prompt is the specific description below, followed by the shared style tail that
keeps the eighteen sounding like one family:

`, game UI sound effect, underwater nautical theme, dry, no reverb tail, no music bed, no ambience, mono, clean, punchy, mobile app`

| File | Prompt (before the shared tail) |
|---|---|
| `outbid` | two quick descending submarine sonar pings, urgent, metallic, alarming but short |
| `countdown_tick` | single sharp water droplet plink, very dry, percussive, tight, no echo |
| `auction_start` | single brass ship bell strike, bright, clear, one hit, short decay |
| `auction_extend` | short underwater bubble rush whoosh rising, airy, quick, subtle |
| `bid_placed` | single small bubble pop, crisp, bright, one only |
| `bid_rejected` | low muffled underwater thud, soft, dull, not harsh |
| `win_celebration` | **composed from two generations** (see below) |
| `payment_success` | rising bubbles resolving into a soft bright bell chime, positive, warm |
| `payment_error` | single low muffled underwater thud, gentle, deflating, not alarming |
| `product_created` | bubble pop with a small bright sparkle tail, playful, light |
| `notification_pop` | single soft bubble pop, round, gentle, bright |
| `message_sent` | small bubble released rising upward, short airy, light |
| `message_received` | small bubble arriving and popping, lower pitch, soft, gentle |
| `prelive_countdown_tick` | single clean sonar ping, mid pitch, short, dry, countdown |
| `prelive_countdown_go` | bright brass ship bell strike, higher and fuller than a ping, confident go signal |
| `push_live_start` | double brass ship bell strike, ding ding, bright, inviting, short |
| `push_product_sold` | treasure chest gold coins spilling, bright metallic, celebratory, single burst |
| `push_payment_action` | single soft sonar ping, mid pitch, attention getting but calm, not an alarm |

### Post-processing applied to every file

From the MP3 in `_source/` to the WAV shipped in both platforms: leading silence
trimmed, tail cut to the target length with a 30 ms fade-out (so the cut leaves no
click), peak normalised to **-3 dBFS**, and encoded as mono 44.1 kHz 16-bit PCM.

### `win_celebration` is a composite

The single-prompt version came out as a bell with no celebration in it: the shared style
tail (`dry, close, punchy, no ambience`, `game UI sound effect`) describes the opposite of
a cheering crowd, so the model kept dropping the crowd. The fix was to generate the two
layers separately and mix them here:

| Layer | Source | Prompt |
|---|---|---|
| Bell | `_source/win_celebration_bell.mp3` | triumphant ship bell flourish with rising bubbles and bright sparkle, celebratory, treasure found *(+ shared tail)* |
| Crowd | `_source/win_celebration_crowd.mp3` | a small crowd of people cheering and clapping in celebration, happy voices, whistles, applause building then settling, recorded close in a room, energetic and joyful, victory moment *(no shared tail, 4 s, prompt influence 40%)* |

The mix: bell at full level from t=0, crowd entering at t=0.12 s with an 80 ms ramp and
**7 dB below** the bell. The bell leads on purpose — it is what makes the sound read as an
event rather than as background ambience, and it keeps the brand's bell in the moment that
matters most. Total 1.55 s with a 250 ms fade-out, peak normalised to -3 dBFS like the rest.

To rebuild it with a different balance, both layers are in `_source/`; only the -7 dB and
the 0.12 s offset need changing.
