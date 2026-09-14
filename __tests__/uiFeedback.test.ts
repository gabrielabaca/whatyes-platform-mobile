import {
  FEEDBACK_EVENTS,
  UI_SOUND_FILES,
  enterLiveSession,
  feedback,
  feedbackForNotificationType,
  getActiveLiveSessionKind,
  leaveLiveSession,
} from '../src/utils/uiFeedback';

describe('uiFeedback event map', () => {
  it('every declared sound file is used by at least one event', () => {
    const used = new Set(
      Object.values(FEEDBACK_EVENTS)
        .map((spec) => ('sound' in spec ? spec.sound : null))
        .filter(Boolean)
    );
    const unused = UI_SOUND_FILES.filter((name) => !used.has(name));
    expect(unused).toEqual([]);
  });

  it('every event sound exists in the manifest', () => {
    const manifest = new Set<string>(UI_SOUND_FILES);
    for (const spec of Object.values(FEEDBACK_EVENTS)) {
      if ('sound' in spec && spec.sound) {
        expect(manifest.has(spec.sound)).toBe(true);
      }
    }
  });

  it('nothing sounds on the seller side except the pre-live countdown', () => {
    for (const [event, spec] of Object.entries(FEEDBACK_EVENTS)) {
      const scopes: readonly string[] = 'liveSound' in spec ? spec.liveSound : [];
      if (scopes.includes('seller')) {
        expect(['preliveCountdownTick', 'preliveCountdownGo']).toContain(event);
      }
    }
  });

  it('wallet linking sounds for the viewer inside a live; paymentSuccess does not', () => {
    expect(FEEDBACK_EVENTS.walletLinked.liveSound).toEqual(['viewer']);
    expect(FEEDBACK_EVENTS.walletLinkError.liveSound).toEqual(['viewer']);
    expect('liveSound' in FEEDBACK_EVENTS.paymentSuccess).toBe(false);
  });

  it('maps foreground notification types to a specific cue, and the rest to the pop', () => {
    expect(feedbackForNotificationType('auction_won')).toBe('winCelebration');
    expect(feedbackForNotificationType('buy_now_won')).toBe('winCelebration');
    expect(feedbackForNotificationType('raffle_won')).toBe('winCelebration');
    expect(feedbackForNotificationType('product_sold')).toBe('productSold');
    expect(feedbackForNotificationType('purchase_paid')).toBe('paymentSuccess');
    expect(feedbackForNotificationType('purchase_shipment_created')).toBe('notificationPop');
    expect(feedbackForNotificationType('seller_live_start')).toBe('notificationPop');
    expect(feedbackForNotificationType(null)).toBe('notificationPop');
  });
});

describe('live session tokens', () => {
  it('a stale token cannot clear a newer session, and the seller wins when mixed', () => {
    const a = enterLiveSession('viewer');
    const b = enterLiveSession('viewer');
    leaveLiveSession(a);
    expect(getActiveLiveSessionKind()).toBe('viewer');
    const c = enterLiveSession('seller');
    expect(getActiveLiveSessionKind()).toBe('seller');
    leaveLiveSession(c);
    expect(getActiveLiveSessionKind()).toBe('viewer');
    leaveLiveSession(b);
    leaveLiveSession(b);
    expect(getActiveLiveSessionKind()).toBeNull();
  });

  it('feedback never throws without native modules', () => {
    expect(() => feedback('outbid')).not.toThrow();
    expect(() => feedback('pullToRefresh')).not.toThrow();
  });
});
