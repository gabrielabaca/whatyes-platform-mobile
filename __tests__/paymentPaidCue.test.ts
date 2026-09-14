import { createPaidCueTracker } from '../src/utils/paymentPaidCue';

const SALE_A = 'sale-a';
const SALE_B = 'sale-b';

describe('createPaidCueTracker', () => {
  it('stays silent when the purchase opens already paid', () => {
    const tracker = createPaidCueTracker();
    expect(tracker.register(SALE_A, 'paid')).toBe(false);
    expect(tracker.register(SALE_A, 'paid')).toBe(false);
  });

  it('sounds once on the transition to paid, not on later polls', () => {
    const tracker = createPaidCueTracker();
    expect(tracker.register(SALE_A, 'pending')).toBe(false);
    expect(tracker.register(SALE_A, 'pending')).toBe(false);
    expect(tracker.register(SALE_A, 'paid')).toBe(true);
    expect(tracker.register(SALE_A, 'paid')).toBe(false);
  });

  it('does not sound on cancelled', () => {
    const tracker = createPaidCueTracker();
    expect(tracker.register(SALE_A, 'pending')).toBe(false);
    expect(tracker.register(SALE_A, 'cancelled')).toBe(false);
  });

  it('re-seeds when switching to another sale', () => {
    const tracker = createPaidCueTracker();
    tracker.register(SALE_A, 'pending');
    expect(tracker.register(SALE_B, 'paid')).toBe(false);
    expect(tracker.register(SALE_B, 'paid')).toBe(false);
  });
});
