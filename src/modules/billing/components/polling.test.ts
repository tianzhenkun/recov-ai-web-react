import {
  canRetryPackagePayment,
  getExpiryRefreshDelay,
  isPackageOrderTerminal,
  isPaymentRefundTerminal,
  MAX_EXPIRY_REFRESH_DELAY_MS,
  PACKAGE_ORDER_POLL_INTERVAL_MS,
  shouldPollPackageOrder,
  shouldPollPaymentOrder,
  shouldPollPaymentRefund,
} from './polling';

describe('package order polling policy', () => {
  it('uses a three second interval', () => {
    expect(PACKAGE_ORDER_POLL_INTERVAL_MS).toBe(3_000);
  });

  it.each([
    'PAID',
    'CLOSED',
    'REFUNDED',
  ] as const)('stops for terminal package status %s', (payStatus) => {
    expect(isPackageOrderTerminal({ id: '1', payStatus })).toBe(true);
    expect(shouldPollPackageOrder({ id: '1', payStatus })).toBe(false);
  });

  it('stops after prepay creation fails because only a manual retry can advance it', () => {
    const order = {
      id: '1',
      payStatus: 'PENDING_PAYMENT',
      paymentStatus: 'FAILED',
    } as const;
    expect(canRetryPackagePayment(order)).toBe(true);
    expect(shouldPollPackageOrder(order)).toBe(false);
  });

  it('keeps polling an attached failed payment until the credit order is closed', () => {
    const order = {
      id: '2',
      payStatus: 'PENDING_PAYMENT',
      paymentOrderId: '200',
      paymentStatus: 'FAILED',
    } as const;
    expect(canRetryPackagePayment(order)).toBe(false);
    expect(shouldPollPackageOrder(order)).toBe(true);
  });

  it('keeps polling pending payment and refund processing states', () => {
    expect(
      shouldPollPackageOrder({
        id: '1',
        payStatus: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
      }),
    ).toBe(true);
    expect(
      shouldPollPackageOrder({
        id: '2',
        payStatus: 'REFUND_LOCKED',
        refundStatus: 'PROCESSING',
      }),
    ).toBe(true);
  });

  it('keeps polling after channel success until the credit order reaches its business terminal state', () => {
    expect(
      shouldPollPackageOrder({
        id: '4',
        payStatus: 'PENDING_PAYMENT',
        paymentStatus: 'SUCCESS',
      }),
    ).toBe(true);
  });

  it('stops on the final payment and refund state combinations', () => {
    expect(
      shouldPollPackageOrder({
        id: '5',
        payStatus: 'PAID',
        paymentStatus: 'SUCCESS',
      }),
    ).toBe(false);
    expect(
      shouldPollPackageOrder({
        id: '6',
        payStatus: 'REFUNDED',
        paymentStatus: 'REFUNDED',
        refundStatus: 'SUCCEEDED',
      }),
    ).toBe(false);
  });

  it('keeps polling an expired channel payment until the credit order is closed', () => {
    expect(
      shouldPollPackageOrder({
        id: '12',
        payStatus: 'PENDING_PAYMENT',
        paymentStatus: 'EXPIRED',
      }),
    ).toBe(true);
  });

  it.each([
    'SUCCESS',
    'CLOSED',
    'ABNORMAL',
  ])('stops payment refund polling for %s', (status) => {
    expect(isPaymentRefundTerminal(status)).toBe(true);
    expect(shouldPollPaymentRefund({ id: '9', status })).toBe(false);
  });

  it('keeps polling payment refund processing states', () => {
    expect(shouldPollPaymentRefund({ id: '10', status: 'PROCESSING' })).toBe(
      true,
    );
    expect(shouldPollPaymentRefund({ id: '11', status: 'CREATED' })).toBe(true);
  });

  it('polls pending payment orders and stops at every terminal state', () => {
    expect(shouldPollPaymentOrder({ id: '20', status: 'PENDING' })).toBe(true);
    for (const status of [
      'SUCCESS',
      'CLOSED',
      'FAILED',
      'EXPIRED',
      'REFUNDED',
    ]) {
      expect(shouldPollPaymentOrder({ id: '20', status })).toBe(false);
    }
  });
});

describe('entitlement expiry refresh policy', () => {
  const now = Date.parse('2026-07-14T00:00:00.000Z');

  it('refreshes just after a near expiry boundary', () => {
    expect(getExpiryRefreshDelay('2026-07-14T00:00:10.000Z', now)).toBe(10_100);
  });

  it('caps long package terms so the caller can re-arm the browser timer', () => {
    expect(getExpiryRefreshDelay('2026-10-14T00:00:00.000Z', now)).toBe(
      MAX_EXPIRY_REFRESH_DELAY_MS,
    );
  });

  it('refreshes immediately for expired values and ignores invalid dates', () => {
    expect(getExpiryRefreshDelay('2026-07-13T23:59:59.000Z', now)).toBe(0);
    expect(getExpiryRefreshDelay('invalid', now)).toBeUndefined();
  });
});
