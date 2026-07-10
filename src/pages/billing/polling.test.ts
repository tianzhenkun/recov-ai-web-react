import {
  isPackageOrderTerminal,
  isPaymentRefundTerminal,
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
    expect(
      shouldPollPackageOrder({
        id: '1',
        payStatus: 'PENDING_PAYMENT',
        paymentStatus: 'PREPAY_FAILED',
      }),
    ).toBe(false);
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
