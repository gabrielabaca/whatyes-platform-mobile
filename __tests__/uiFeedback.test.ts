import {
  FEEDBACK_EVENTS,
  UI_SOUND_FILES,
  enterLiveSession,
  feedback,
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
