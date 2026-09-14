# Placeholder sounds

Every file below is **0.1 s of digital silence** (44.1 kHz, 16-bit, mono WAV)
generated to wire the plumbing. They are not real sounds. Replace each one in
**both** locations (`assets/sounds/files/` and `android/app/src/main/res/raw/`) and
remove it from this list.

While a push-only file (or `win_celebration`) is still a placeholder, an iOS
push of that type plays silence instead of the system default sound, because
the file exists in the bundle.

In-app (15):

- `outbid.wav`
- `countdown_tick.wav`
- `auction_start.wav`
- `auction_extend.wav`
- `bid_placed.wav`
- `bid_rejected.wav`
- `win_celebration.wav`
- `payment_success.wav`
- `payment_error.wav`
- `product_created.wav`
- `notification_pop.wav`
- `message_sent.wav`
- `message_received.wav`
- `prelive_countdown_tick.wav`
- `prelive_countdown_go.wav`

Push-only (3):

- `push_live_start.wav`
- `push_product_sold.wav`
- `push_payment_action.wav`
