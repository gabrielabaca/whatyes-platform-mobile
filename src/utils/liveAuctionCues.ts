/**
 * Pure helpers behind the live auction sound cues. They hold no React state so
 * `useStreamChat` stays lean and the edge cases can be unit-tested:
 *
 *  - outbid is a TRANSITION ("I was leading and now I am not"), never a state,
 *    so three third-party bids in a row after mine sound exactly once;
 *  - the countdown tick fires once per remaining second, survives anti-sniping
 *    extensions and stays quiet while the auction is paused (the caller simply
 *    stops calling it).
 */

const isSameUser = (a: string | null | undefined, b: string | null | undefined): boolean =>
  !!a && !!b && a === b;

export interface OutbidTracker {
  /** New auction (or none): nobody leads. */
  reset(): void;
  /** Late join / reconnect: seed from the last bid of the `init` snapshot. */
  seed(lastBidUserId: string | null | undefined, myUserId: string | null | undefined): void;
  /**
   * Registers an incoming bid. Returns true only on the transition from
   * "leading" to "not leading". A bid without `user_id` (legacy backend) can't
   * be attributed: it never sounds and leaves the local user as not leading.
   */
  registerBid(bidUserId: string | null | undefined, myUserId: string | null | undefined): boolean;
}

export function createOutbidTracker(): OutbidTracker {
  let leading = false;
  return {
    reset() {
      leading = false;
    },
    seed(lastBidUserId, myUserId) {
      leading = isSameUser(lastBidUserId, myUserId);
    },
    registerBid(bidUserId, myUserId) {
      const attributable = !!bidUserId;
      const mine = attributable && isSameUser(bidUserId, myUserId);
      const outbid = leading && attributable && !mine;
      leading = mine;
      return outbid;
    },
  };
}

/** Seconds remaining at which the countdown starts ticking (inclusive). */
export const COUNTDOWN_TICK_FROM_SECONDS = 5;

export interface CountdownTickState {
  auctionId: string | null;
  lastSecond: number | null;
}

export const createCountdownTickState = (): CountdownTickState => ({
  auctionId: null,
  lastSecond: null,
});

/**
 * Decides whether the tick should sound for `remaining` seconds. Mutates
 * `state`. Rules:
 *  - only within the last `COUNTDOWN_TICK_FROM_SECONDS` seconds, never at 0
 *    (the grace window after the close is not a countdown);
 *  - once per remaining second, so the immediate `update()` after an effect
 *    restart (pause/resume, clock re-sync) doesn't repeat the last tick;
 *  - leaving the window (an extension pushes the clock back up) re-arms it, so
 *    the seconds are counted again on the way back down.
 */
export function shouldTickCountdown(
  state: CountdownTickState,
  auctionId: string,
  remaining: number
): boolean {
  if (state.auctionId !== auctionId) {
    state.auctionId = auctionId;
    state.lastSecond = null;
  }
  if (remaining > COUNTDOWN_TICK_FROM_SECONDS) {
    state.lastSecond = null;
    return false;
  }
  if (remaining < 1) {
    return false;
  }
  if (state.lastSecond === remaining) {
    return false;
  }
  state.lastSecond = remaining;
  return true;
}
