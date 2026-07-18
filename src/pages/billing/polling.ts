import type { CreditPackageOrder } from '@/services/ruoyi/credit-billing';

export const PACKAGE_ORDER_POLL_INTERVAL_MS = 3_000;
export const MAX_EXPIRY_REFRESH_DELAY_MS = 2_147_000_000;

const PACKAGE_ORDER_TERMINAL_STATUSES = new Set(['PAID', 'CLOSED', 'REFUNDED']);

const PAYMENT_REFUND_TERMINAL_STATUSES = new Set([
  'SUCCESS',
  'CLOSED',
  'ABNORMAL',
]);

const PAYMENT_ORDER_TERMINAL_STATUSES = new Set([
  'SUCCESS',
  'CLOSED',
  'FAILED',
  'EXPIRED',
  'REFUNDED',
]);

const normalized = (value?: string | null) => String(value || '').toUpperCase();

export const canRetryPackagePayment = (order?: CreditPackageOrder | null) =>
  normalized(order?.payStatus) === 'PENDING_PAYMENT' &&
  normalized(order?.paymentStatus) === 'FAILED' &&
  !order?.paymentOrderId;

export const getExpiryRefreshDelay = (
  expiresAt?: string | null,
  now = Date.now(),
) => {
  if (!expiresAt) return undefined;
  const expiryTime = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiryTime)) return undefined;
  const remaining = expiryTime - now;
  if (remaining <= 0) return 0;
  return Math.min(remaining + 100, MAX_EXPIRY_REFRESH_DELAY_MS);
};

export const isPackageOrderTerminal = (order?: CreditPackageOrder | null) => {
  if (!order) return true;

  const orderStatus = normalized(order.payStatus);

  if (PACKAGE_ORDER_TERMINAL_STATUSES.has(orderStatus)) return true;
  return canRetryPackagePayment(order);
};

export const shouldPollPackageOrder = (order?: CreditPackageOrder | null) =>
  Boolean(order?.id) && !isPackageOrderTerminal(order);

export const isPaymentRefundTerminal = (status?: string | null) =>
  PAYMENT_REFUND_TERMINAL_STATUSES.has(normalized(status));

export const shouldPollPaymentRefund = (
  refund?: {
    id?: string;
    status?: string;
  } | null,
) => Boolean(refund?.id) && !isPaymentRefundTerminal(refund?.status);

export const shouldPollPaymentOrder = (
  order?: {
    id?: string;
    status?: string;
  } | null,
) =>
  Boolean(order?.id) &&
  !PAYMENT_ORDER_TERMINAL_STATUSES.has(normalized(order?.status));
