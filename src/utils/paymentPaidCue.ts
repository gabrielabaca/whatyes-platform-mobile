/**
 * Payment-success cue: a TRANSITION to `paid`, never a state.
 *
 * Opening a purchase that was already paid stays silent, and polling while it
 * remains paid does not repeat the sound. Same criterion as outbid.
 */

export interface PaidCueTracker {
  /**
   * Observes a status for `saleUuid`. Returns true only when this sale moves
   * from a non-paid status to paid. The first observation of a sale (or a
   * switch to a different sale) never plays.
   */
  register(saleUuid: string, status: string): boolean;
}

export function createPaidCueTracker(): PaidCueTracker {
  let saleUuid: string | null = null;
  let status: string | null = null;
  return {
    register(nextSaleUuid, nextStatus) {
      if (saleUuid !== nextSaleUuid || status === null) {
        saleUuid = nextSaleUuid;
        status = nextStatus;
        return false;
      }
      const play = status !== 'paid' && nextStatus === 'paid';
      status = nextStatus;
      return play;
    },
  };
}
