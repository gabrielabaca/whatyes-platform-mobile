import {
  BID_INCREMENT_FALLBACK,
  DEFAULT_BID,
  bidIncrementAmount,
  bidStepFromFloorMajor,
  parseBidMultiplier,
  suggestedBidAmount,
} from '../src/utils/bidIncrement';

describe('bidStepFromFloorMajor', () => {
  it('sin precio base (0 / no finito) cae al paso de 1000', () => {
    expect(bidStepFromFloorMajor(0)).toBe(BID_INCREMENT_FALLBACK);
    expect(bidStepFromFloorMajor(-10)).toBe(BID_INCREMENT_FALLBACK);
    expect(bidStepFromFloorMajor(Number.NaN)).toBe(BID_INCREMENT_FALLBACK);
  });

  it('$1: 5% = 0,05 → bucket de 10 → piso 10', () => {
    expect(bidStepFromFloorMajor(1)).toBe(10);
  });

  it('$1.000: 5% = 50 → a 10 → 50', () => {
    expect(bidStepFromFloorMajor(1_000)).toBe(50);
  });

  it('$1.337: 5% = 66,85 → a 10 → 70', () => {
    expect(bidStepFromFloorMajor(1_337)).toBe(70);
  });

  it('$20.000: 5% = 1.000 → a 100 → 1.000 (igual que el paso fijo de hoy)', () => {
    expect(bidStepFromFloorMajor(20_000)).toBe(1_000);
  });

  it('$450.000: 5% = 22.500 → a 1.000 → 23.000', () => {
    expect(bidStepFromFloorMajor(450_000)).toBe(23_000);
  });
});

describe('suggestedBidAmount', () => {
  it('sin pujas, $1.000, 3×: 1000 + 50×3 = 1150', () => {
    expect(
      suggestedBidAmount({ lastBidAmount: null, floorMajor: 1_000, multiplier: 3 }),
    ).toBe(1_150);
  });

  it('sin precio base ni pujas: DEFAULT_BID', () => {
    expect(
      suggestedBidAmount({ lastBidAmount: null, floorMajor: 0, multiplier: 1 }),
    ).toBe(DEFAULT_BID);
  });

  it('con puja previa suma el paso × multiplicador', () => {
    expect(
      suggestedBidAmount({ lastBidAmount: 20_000, floorMajor: 20_000, multiplier: 2 }),
    ).toBe(22_000);
  });
});

describe('bidIncrementAmount / parseBidMultiplier', () => {
  it('1×/2×/3× sobre $20.000', () => {
    expect(bidIncrementAmount(20_000, 1)).toBe(1_000);
    expect(bidIncrementAmount(20_000, 2)).toBe(2_000);
    expect(bidIncrementAmount(20_000, 3)).toBe(3_000);
  });

  it('solo acepta 1, 2 o 3; el resto cae a 1', () => {
    expect(parseBidMultiplier(2)).toBe(2);
    expect(parseBidMultiplier('3')).toBe(3);
    expect(parseBidMultiplier(1)).toBe(1);
    expect(parseBidMultiplier(9)).toBe(1);
    expect(parseBidMultiplier(null)).toBe(1);
  });
});
