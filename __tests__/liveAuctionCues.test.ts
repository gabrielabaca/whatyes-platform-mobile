import {
  COUNTDOWN_TICK_FROM_SECONDS,
  createCountdownTickState,
  createOutbidTracker,
  shouldTickCountdown,
} from '../src/utils/liveAuctionCues';

const ME = 'user-me';
const OTHER = 'user-other';
const THIRD = 'user-third';

describe('createOutbidTracker', () => {
  it('sounds once when three third-party bids follow mine', () => {
    const tracker = createOutbidTracker();
    expect(tracker.registerBid(ME, ME)).toBe(false);
    expect(tracker.registerBid(OTHER, ME)).toBe(true);
    expect(tracker.registerBid(THIRD, ME)).toBe(false);
    expect(tracker.registerBid(OTHER, ME)).toBe(false);
  });

  it('sounds again only after I take the lead back', () => {
    const tracker = createOutbidTracker();
    tracker.registerBid(ME, ME);
    expect(tracker.registerBid(OTHER, ME)).toBe(true);
    expect(tracker.registerBid(ME, ME)).toBe(false);
    expect(tracker.registerBid(THIRD, ME)).toBe(true);
  });

  it('never sounds for third-party bids when I was not leading', () => {
    const tracker = createOutbidTracker();
    expect(tracker.registerBid(OTHER, ME)).toBe(false);
    expect(tracker.registerBid(THIRD, ME)).toBe(false);
  });

  it('seeds the lead from the init snapshot for late joins', () => {
    const tracker = createOutbidTracker();
    tracker.seed(ME, ME);
    expect(tracker.registerBid(OTHER, ME)).toBe(true);
    tracker.seed(OTHER, ME);
    expect(tracker.registerBid(THIRD, ME)).toBe(false);
  });

  it('forgets the lead on reset (new auction)', () => {
    const tracker = createOutbidTracker();
    tracker.registerBid(ME, ME);
    tracker.reset();
    expect(tracker.registerBid(OTHER, ME)).toBe(false);
  });

  it('stays silent for bids without user_id (legacy backend)', () => {
    const tracker = createOutbidTracker();
    tracker.registerBid(ME, ME);
    expect(tracker.registerBid(undefined, ME)).toBe(false);
    expect(tracker.registerBid(OTHER, ME)).toBe(false);
  });

  it('stays silent when the local user is unknown', () => {
    const tracker = createOutbidTracker();
    tracker.registerBid(ME, null);
    expect(tracker.registerBid(OTHER, null)).toBe(false);
  });
});

describe('shouldTickCountdown', () => {
  const run = (state: ReturnType<typeof createCountdownTickState>, seconds: number[]) =>
    seconds.map((s) => shouldTickCountdown(state, 'a1', s));

  it('ticks once per second in the last 5 seconds and never at 0', () => {
    const state = createCountdownTickState();
    expect(run(state, [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0])).toEqual([
      false, false, false, false, false, true, true, true, true, true, false, false,
    ]);
    expect(COUNTDOWN_TICK_FROM_SECONDS).toBe(5);
  });

  it('does not repeat a second when the effect restarts on the same value (pause/resume)', () => {
    const state = createCountdownTickState();
    expect(run(state, [5, 4, 3])).toEqual([true, true, true]);
    // Paused at 3, resumed: the immediate update() sees 3 again.
    expect(run(state, [3, 2, 1])).toEqual([false, true, true]);
  });

  it('re-arms after an extension pushes the clock back above the window', () => {
    const state = createCountdownTickState();
    expect(run(state, [5, 4, 3, 2])).toEqual([true, true, true, true]);
    // +3 s at 2 s left: 5, 4, 3, 2, 1 all sound again, none twice.
    expect(run(state, [5, 4, 3, 2, 1, 0])).toEqual([true, true, true, true, true, false]);
  });

  it('re-arms even when the extension leaves the clock above 5 for a moment', () => {
    const state = createCountdownTickState();
    expect(run(state, [5])).toEqual([true]);
    expect(run(state, [6, 5, 4])).toEqual([false, true, true]);
  });

  it('starts over for a different auction', () => {
    const state = createCountdownTickState();
    expect(shouldTickCountdown(state, 'a1', 3)).toBe(true);
    expect(shouldTickCountdown(state, 'a2', 3)).toBe(true);
  });
});
