/**
 * Central UI feedback: one semantic event -> { sound, haptic }.
 *
 * Call sites say WHAT happened (`feedback('bidPlaced')`), never which file to
 * play. This module owns the event map, the preloaded sound pool, the haptic
 * options and the two global rules:
 *
 *  1. Inside a live the default is silence. This is a live-video app and the
 *     seller's voice is the main audio: only the events flagged with a
 *     `liveSound` scope keep their sound while a live session is active. The
 *     screens tell the module when they mount/unmount (`enterLiveSession`).
 *     The seller transmits with the mic open, so on the seller side nothing
 *     sounds except the pre-live countdown (not transmitting yet).
 *  2. Audio never breaks the UI. The native module is loaded lazily, every
 *     call is wrapped, and a missing file just means no sound.
 *
 * Haptics are not gated by the live rule: they don't compete with the voice.
 *
 * iOS audio session: the live already has three owners (the WebRTC bootstrap
 * in AppDelegate, react-native-incall-manager and the IVS stage presets), all
 * of them PlayAndRecord. This module never touches the session while a live is
 * active. Outside a live it sets `Ambient`: mixes with other apps, obeys the
 * ring/silent switch and routes to the speaker. That last point matters:
 * incall-manager's `stop()` restores PlayAndRecord *without* DefaultToSpeaker,
 * which would send every later UI sound to the earpiece.
 *
 * Android: `mixWithOthers` is mandatory. Without it react-native-sound asks
 * for AUDIOFOCUS_GAIN on every play and pauses the user's music (and anything
 * else holding focus) for a 200 ms pop.
 */
import { Platform } from 'react-native';
import { DEFAULT_SOUND_PREFERENCES, getSoundPreferences } from './soundPreferences';

/** Base names of the in-app files (see assets/sounds/README.md). */
export const UI_SOUND_FILES = [
  'outbid',
  'countdown_tick',
  'auction_start',
  'auction_extend',
  'bid_placed',
  'bid_rejected',
  'win_celebration',
  'payment_success',
  'payment_error',
  'product_created',
  'notification_pop',
  'message_sent',
  'message_received',
  'prelive_countdown_tick',
  'prelive_countdown_go',
  'push_product_sold',
] as const;

export type UiSoundName = (typeof UI_SOUND_FILES)[number];

type HapticType =
  | 'impactLight'
  | 'impactMedium'
  | 'notificationSuccess'
  | 'notificationWarning'
  | 'notificationError';

export type LiveSessionKind = 'viewer' | 'seller';
export type LiveSessionToken = number;

interface FeedbackSpec {
  sound?: UiSoundName;
  haptic?: HapticType;
  /** Live sessions in which the SOUND still plays. Absent = muted in any live. */
  liveSound?: readonly LiveSessionKind[];
}

export const FEEDBACK_EVENTS = {
  // --- Live auction, buyer side -------------------------------------------
  /** Transition only: I was leading and someone else just bid. */
  outbid: { sound: 'outbid', haptic: 'notificationWarning', liveSound: ['viewer'] },
  /** Last 5 s of the offer timer, once per second. */
  countdownTick: { sound: 'countdown_tick', liveSound: ['viewer'] },
  auctionStart: { sound: 'auction_start', liveSound: ['viewer'] },
  auctionExtend: { sound: 'auction_extend', liveSound: ['viewer'] },
  bidPlaced: { sound: 'bid_placed', haptic: 'notificationSuccess', liveSound: ['viewer'] },
  bidRejected: { sound: 'bid_rejected', haptic: 'notificationError', liveSound: ['viewer'] },
  winCelebration: { sound: 'win_celebration', haptic: 'notificationSuccess', liveSound: ['viewer'] },
  // Slide-to-bid gesture: haptic only (the knob is under the finger).
  bidSlideStart: { haptic: 'impactLight' },
  bidSlideArmed: { haptic: 'impactMedium' },
  bidSlideDisarmed: { haptic: 'impactLight' },
  // --- Seller, before going live (mic not open yet) -----------------------
  preliveCountdownTick: { sound: 'prelive_countdown_tick', liveSound: ['seller'] },
  preliveCountdownGo: { sound: 'prelive_countdown_go', liveSound: ['seller'] },
  // --- Wallet inside the live (buyer links a method so they can bid) ------
  walletLinked: {
    sound: 'payment_success',
    haptic: 'notificationSuccess',
    liveSound: ['viewer'],
  },
  walletLinkError: {
    sound: 'payment_error',
    haptic: 'notificationError',
    liveSound: ['viewer'],
  },
  // --- Outside the live ----------------------------------------------------
  /** The purchase actually became paid. Muted inside a live on purpose. */
  paymentSuccess: { sound: 'payment_success', haptic: 'notificationSuccess' },
  productSold: { sound: 'push_product_sold', haptic: 'notificationSuccess' },
  productCreated: { sound: 'product_created', haptic: 'notificationSuccess' },
  notificationPop: { sound: 'notification_pop' },
  messageSent: { sound: 'message_sent' },
  messageReceived: { sound: 'message_received' },
  /** Confetti is enough: haptic only. */
  followSuccess: { haptic: 'notificationSuccess' },
  /** Pull-to-refresh convention: light haptic, no sound. */
  pullToRefresh: { haptic: 'impactLight' },
} as const satisfies Record<string, FeedbackSpec>;

export type FeedbackEvent = keyof typeof FEEDBACK_EVENTS;

/** Foreground in-app cue for a push type. `new_message` is handled by the chat path. */
const FOREGROUND_NOTIFICATION_FEEDBACK: Record<string, FeedbackEvent> = {
  auction_won: 'winCelebration',
  buy_now_won: 'winCelebration',
  raffle_won: 'winCelebration',
  product_sold: 'productSold',
  purchase_paid: 'paymentSuccess',
};

export function feedbackForNotificationType(type: string | null | undefined): FeedbackEvent {
  if (!type) return 'notificationPop';
  return FOREGROUND_NOTIFICATION_FEEDBACK[type] ?? 'notificationPop';
}

/** Single copy of the options that used to be duplicated per component. */
const HAPTIC_OPTIONS = { enableVibrateFallback: true, ignoreAndroidSystemSettings: false };

/** Delay before re-applying the idle audio session once the last live ends. */
const IDLE_AUDIO_SESSION_DELAY_MS = 300;

// --- Native modules, loaded lazily so a missing pod never crashes the app ---

interface SoundInstance {
  play: (onEnd?: (successfully: boolean) => void) => unknown;
  stop: (callback?: () => void) => unknown;
  isLoaded: () => boolean;
  isPlaying: () => boolean;
}

interface SoundClass {
  new (
    filename: string,
    basePath: string | undefined,
    onError?: (error: unknown) => void
  ): SoundInstance;
  setCategory: (category: string, mixWithOthers?: boolean) => void;
  setMode: (mode: string) => void;
  MAIN_BUNDLE: string;
}

interface HapticModule {
  trigger: (type: HapticType, options?: typeof HAPTIC_OPTIONS) => void;
}

let Sound: SoundClass | null = null;
let Haptics: HapticModule | null = null;

try {
  const module = require('react-native-sound');
  Sound = module?.default ?? module;
} catch {
  Sound = null;
}

try {
  const module = require('react-native-haptic-feedback');
  Haptics = module?.default ?? module;
} catch {
  Haptics = null;
}

// --- State ------------------------------------------------------------------

const pool = new Map<UiSoundName, SoundInstance>();
let preloaded = false;
let soundsEnabled = DEFAULT_SOUND_PREFERENCES.uiSoundsEnabled;

const liveSessions = new Map<LiveSessionToken, LiveSessionKind>();
let nextLiveToken: LiveSessionToken = 1;
let idleAudioTimer: ReturnType<typeof setTimeout> | null = null;

const currentLiveKind = (): LiveSessionKind | null => {
  if (liveSessions.size === 0) return null;
  for (const kind of liveSessions.values()) {
    if (kind === 'seller') return 'seller';
  }
  return 'viewer';
};

// --- Audio session -----------------------------------------------------------

/** Idle (no live) session: mixes, obeys the silent switch, speaker output. */
const applyIdleAudioSession = (): void => {
  if (!Sound) return;
  try {
    if (Platform.OS === 'ios') {
      // No options on purpose: Ambient already mixes with others, and
      // react-native-sound's `mixWithOthers` adds AllowBluetooth, which iOS
      // rejects for non-recording categories (the whole call would fail).
      Sound.setCategory('Ambient', false);
      Sound.setMode('Default');
    } else {
      // STREAM_MUSIC (same stream as the live) and NO audio focus requests.
      Sound.setCategory('Playback', true);
    }
  } catch {
    // no-op
  }
};

const cancelIdleAudioSession = (): void => {
  if (idleAudioTimer) {
    clearTimeout(idleAudioTimer);
    idleAudioTimer = null;
  }
};

const scheduleIdleAudioSession = (): void => {
  cancelIdleAudioSession();
  // Deferred: the screen's other cleanups (incall-manager stop, IVS leave) are
  // dispatched in the same tick and must land first.
  idleAudioTimer = setTimeout(() => {
    idleAudioTimer = null;
    if (liveSessions.size === 0) applyIdleAudioSession();
  }, IDLE_AUDIO_SESSION_DELAY_MS);
};

// --- Public API ---------------------------------------------------------------

/**
 * Loads every sound into memory and reads the user's preference. Call once at
 * app start; playback never reads from disk.
 */
export function preloadUiFeedback(): void {
  void getSoundPreferences()
    .then((prefs) => {
      soundsEnabled = prefs.uiSoundsEnabled;
    })
    .catch(() => {});
  if (preloaded || !Sound) return;
  preloaded = true;
  try {
    // A live can already be mounted at startup (seller resuming a room after
    // a crash): its owners have the session, don't fight them.
    if (liveSessions.size === 0) applyIdleAudioSession();
    // Android reads the category at prepare time: instances come after it.
    for (const name of UI_SOUND_FILES) {
      const file =
        Platform.OS === 'ios'
          ? `file://${encodeURI(Sound.MAIN_BUNDLE)}/${name}.wav`
          : name; // res/raw resource name, no extension
      const instance = new Sound(file, undefined, (error) => {
        if (error) {
          pool.delete(name);
          if (__DEV__) console.warn(`[uiFeedback] sound "${name}" not loaded:`, error);
        }
      });
      pool.set(name, instance);
    }
  } catch {
    // no-op: the app works without sounds
  }
}

export function setUiSoundsEnabled(enabled: boolean): void {
  soundsEnabled = enabled;
}

export function areUiSoundsEnabled(): boolean {
  return soundsEnabled;
}

/**
 * Marks a live screen as mounted. Keep the token and hand it back in the
 * effect cleanup so every unmount path (back navigation, error, screen swap)
 * clears it, and an overlapping mount can't clear someone else's session.
 */
export function enterLiveSession(kind: LiveSessionKind): LiveSessionToken {
  const token = nextLiveToken++;
  liveSessions.set(token, kind);
  cancelIdleAudioSession();
  return token;
}

export function leaveLiveSession(token: LiveSessionToken): void {
  if (!liveSessions.delete(token)) return;
  if (liveSessions.size === 0) scheduleIdleAudioSession();
}

/** Test/diagnostic hook: which live session (if any) the module believes is active. */
export function getActiveLiveSessionKind(): LiveSessionKind | null {
  return currentLiveKind();
}

const triggerHaptic = (type: HapticType): void => {
  if (!Haptics) return;
  try {
    Haptics.trigger(type, HAPTIC_OPTIONS);
  } catch {
    // no-op
  }
};

const playSound = (name: UiSoundName, liveSound?: readonly LiveSessionKind[]): void => {
  try {
    if (!soundsEnabled) return;
    const live = currentLiveKind();
    if (live && !(liveSound ?? []).includes(live)) return;
    const instance = pool.get(name);
    if (!instance || !instance.isLoaded()) return;
    if (instance.isPlaying()) {
      // Restart instead of ignoring: two quick outbids must both be heard.
      instance.stop(() => {
        try {
          instance.play();
        } catch {
          // no-op
        }
      });
      return;
    }
    instance.play();
  } catch {
    // no-op
  }
};

/** Fires the haptic and the sound mapped to `event`. Never throws. */
export function feedback(event: FeedbackEvent): void {
  const spec: FeedbackSpec = FEEDBACK_EVENTS[event];
  if (!spec) return;
  if (spec.haptic) triggerHaptic(spec.haptic);
  if (spec.sound) playSound(spec.sound, spec.liveSound);
}
