import { ruoyiRequest } from '@/adapters/ruoyi/request';
import type { RuoyiResponse } from '@/adapters/ruoyi/response';

export type PaymentOrderStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'CLOSED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED';
export type PaymentRefundStatus =
  | 'CREATED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'CLOSED'
  | 'ABNORMAL';
export type PaymentOutboxStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'DEAD';
export type PaymentChannelOrderStatus =
  | 'PRE_CREATE'
  | 'PENDING'
  | 'SUCCESS'
  | 'CLOSED'
  | 'FAILED'
  | 'EXPIRED';
export type PaymentOutboxEventType =
  | 'PAYMENT_PAID'
  | 'PAYMENT_CLOSED'
  | 'PAYMENT_EXPIRED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_REFUND_FAILED';
export type PaymentMockScenario =
  | 'SUCCESS'
  | 'CLOSED'
  | 'TIMEOUT'
  | 'DUPLICATE_OUT_OF_ORDER'
  | 'REFUND_SUBMIT_TIMEOUT'
  | 'REFUND_QUERY_TIMEOUT'
  | 'REFUND_TIMEOUT'
  | 'REFUND_PROCESSING'
  | 'REFUND_SUCCESS'
  | 'REFUND_CLOSED'
  | 'REFUND_ABNORMAL';

export type PaymentOrder = {
  id?: string;
  tenantId?: string;
  payOrderNo?: string;
  bizType?: string;
  bizOrderId?: string;
  bizOrderNo?: string;
  subject?: string;
  description?: string;
  currency?: string;
  amountFen?: number | string;
  paidAmountFen?: number | string;
  refundedAmountFen?: number | string;
  ownerType?: 'TENANT' | 'USER';
  ownerId?: string;
  status?: PaymentOrderStatus;
  paymentExpiresAt?: string;
  paidTime?: string;
  closeTime?: string;
  refundedAt?: string;
  refundStatus?: PaymentRefundStatus;
  channelOrderId?: string;
  channelCode?: 'mock' | 'wechat';
  outTradeNo?: string;
  channelTradeNo?: string;
  channelTradeState?: string;
  channelStatus?: PaymentChannelOrderStatus;
  payScene?: 'web_qr' | 'mini_program';
  tradeType?: 'NATIVE' | 'JSAPI';
  payloadType?: 'QR_CODE' | 'MINI_PROGRAM';
  codeUrl?: string;
  appId?: string;
  requestPaymentTimestamp?: string;
  nonceStr?: string;
  packageValue?: string;
  signType?: string;
  paySign?: string;
  createTime?: string;
  updateTime?: string;
};

export type PaymentChannelConfigStatus = 'DRAFT' | 'ENABLED' | 'DISABLED';
export type PaymentChannelValidationStatus =
  | 'UNVALIDATED'
  | 'VALID'
  | 'INVALID';
export type WechatVerificationMode = 'PUBLIC_KEY' | 'PLATFORM_CERTIFICATE';

export type PaymentChannelConfig = {
  id?: string;
  channelCode: 'wechat';
  configName?: string;
  status: PaymentChannelConfigStatus;
  version: number;
  nativeEnabled?: boolean;
  miniProgramEnabled?: boolean;
  nativeAppId?: string;
  miniProgramAppId?: string;
  merchantId?: string;
  merchantSerialNumber?: string;
  verificationMode?: WechatVerificationMode;
  wechatPayPublicKeyId?: string;
  paymentNotifyUrl?: string;
  refundNotifyUrl?: string;
  merchantPrivateKeyConfigured?: boolean;
  merchantCertificateConfigured?: boolean;
  apiV3KeyConfigured?: boolean;
  wechatPayPublicKeyConfigured?: boolean;
  validationStatus: PaymentChannelValidationStatus;
  lastValidatedTime?: string;
  lastError?: string;
  lastEnabledTime?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
};

export type PaymentChannelConfigSavePayload = {
  version: number;
  configName?: string;
  nativeEnabled?: boolean;
  miniProgramEnabled?: boolean;
  nativeAppId?: string;
  miniProgramAppId?: string;
  merchantId?: string;
  merchantSerialNumber?: string;
  verificationMode?: WechatVerificationMode;
  wechatPayPublicKeyId?: string;
  paymentNotifyUrl?: string;
  refundNotifyUrl?: string;
  merchantPrivateKeyPem?: string;
  merchantCertificatePem?: string;
  apiV3Key?: string;
  wechatPayPublicKeyPem?: string;
  remark?: string;
};

export type PaymentRefundOrder = {
  id?: string;
  tenantId?: string;
  refundOrderNo?: string;
  paymentOrderId?: string;
  payOrderNo?: string;
  channelRefundNo?: string;
  refundAmountFen?: number | string;
  totalAmountFen?: number | string;
  currency?: string;
  bizType?: string;
  bizRefundId?: string;
  channelOrderId?: string;
  status?: PaymentRefundStatus;
  reason?: string;
  errorCode?: string;
  errorMessage?: string;
  createBy?: number | string;
  createByName?: string;
  successTime?: string;
  createTime?: string;
  updateTime?: string;
};

export type PaymentOutboxEvent = {
  id?: string;
  tenantId?: string;
  paymentOrderId?: string;
  refundOrderId?: string;
  bizType?: string;
  bizOrderId?: string;
  eventType?: PaymentOutboxEventType;
  eventKey?: string;
  eventStatus?: PaymentOutboxStatus;
  retryCount?: number | string;
  maxRetryCount?: number | string;
  nextRetryTime?: string;
  leaseUntil?: string;
  lastError?: string;
  processedTime?: string;
  createTime?: string;
  updateTime?: string;
};

export type PaymentReconcileResult = {
  queriedPayments?: number | string;
  closedExpiredPayments?: number | string;
  queriedRefunds?: number | string;
  failedItems?: number | string;
};

export type AdminPaymentOrderQuery = {
  tenantId?: string;
  status?: PaymentOrderStatus;
  channelCode?: 'mock' | 'wechat';
  payOrderNo?: string;
  bizType?: string;
  bizOrderId?: string;
  pageNum?: number;
  pageSize?: number;
  orderByColumn?: string;
  isAsc?: string;
};

export type AdminPaymentRefundQuery = {
  tenantId?: string;
  status?: PaymentRefundStatus;
  paymentOrderId?: string;
  refundOrderNo?: string;
  pageNum?: number;
  pageSize?: number;
  orderByColumn?: string;
  isAsc?: string;
};

export type AdminPaymentRefundCreatePayload = {
  paymentOrderId: string;
  idempotencyKey: string;
  reason: string;
  mockScenario?: PaymentMockScenario;
};

export type AdminPaymentOutboxQuery = {
  tenantId?: string;
  eventStatus?: PaymentOutboxStatus;
  eventType?: PaymentOutboxEventType;
  pageNum?: number;
  pageSize?: number;
  orderByColumn?: string;
  isAsc?: string;
};

export type AdminPaymentReconcilePayload = {
  paymentOrderId?: string;
  refundOrderId?: string;
  limit?: number;
};

export type PaymentPageResult<T> = {
  rows: T[];
  total: number;
};

export const PAYMENT_ADMIN_BASE = '/system/payment/admin';

const unwrapData = <T>(response: RuoyiResponse<T>) => response.data as T;

const unwrapPage = <T>(response: RuoyiResponse<T>): PaymentPageResult<T> => {
  return {
    rows: Array.isArray(response.rows) ? response.rows : [],
    total: Number(response.total ?? 0),
  };
};

export const pageAdminPaymentOrders = async (
  params?: AdminPaymentOrderQuery,
) =>
  unwrapPage(
    await ruoyiRequest<PaymentOrder>(`${PAYMENT_ADMIN_BASE}/orders`, {
      method: 'get',
      params,
    }),
  );

export const listAdminPaymentOrders = async (
  params?: AdminPaymentOrderQuery,
) => (await pageAdminPaymentOrders(params)).rows;

export const getAdminPaymentOrder = async (id: string) =>
  unwrapData(
    await ruoyiRequest<PaymentOrder>(`${PAYMENT_ADMIN_BASE}/orders/${id}`, {
      method: 'get',
    }),
  );

export const queryAdminPaymentOrder = async (id: string) =>
  unwrapData(
    await ruoyiRequest<PaymentOrder>(
      `${PAYMENT_ADMIN_BASE}/orders/${id}/query`,
      { method: 'post', repeatSubmit: false },
    ),
  );

export const closeAdminPaymentOrder = async (id: string) =>
  unwrapData(
    await ruoyiRequest<PaymentOrder>(
      `${PAYMENT_ADMIN_BASE}/orders/${id}/close`,
      { method: 'post', repeatSubmit: false },
    ),
  );

export const pageAdminPaymentRefunds = async (
  params?: AdminPaymentRefundQuery,
) =>
  unwrapPage(
    await ruoyiRequest<PaymentRefundOrder>(`${PAYMENT_ADMIN_BASE}/refunds`, {
      method: 'get',
      params,
    }),
  );

export const listAdminPaymentRefunds = async (
  params?: AdminPaymentRefundQuery,
) => (await pageAdminPaymentRefunds(params)).rows;

export const createAdminPaymentRefund = async (
  data: AdminPaymentRefundCreatePayload,
) =>
  unwrapData(
    await ruoyiRequest<PaymentRefundOrder>(`${PAYMENT_ADMIN_BASE}/refunds`, {
      method: 'post',
      data,
      repeatSubmit: false,
    }),
  );

export const queryAdminPaymentRefund = async (id: string) =>
  unwrapData(
    await ruoyiRequest<PaymentRefundOrder>(
      `${PAYMENT_ADMIN_BASE}/refunds/${id}/query`,
      { method: 'post', repeatSubmit: false },
    ),
  );

export const pageAdminPaymentOutbox = async (
  params?: AdminPaymentOutboxQuery,
) =>
  unwrapPage(
    await ruoyiRequest<PaymentOutboxEvent>(`${PAYMENT_ADMIN_BASE}/outbox`, {
      method: 'get',
      params,
    }),
  );

export const listAdminPaymentOutbox = async (
  params?: AdminPaymentOutboxQuery,
) => (await pageAdminPaymentOutbox(params)).rows;

export const replayAdminPaymentOutbox = async (id: string) =>
  unwrapData(
    await ruoyiRequest<PaymentOutboxEvent>(
      `${PAYMENT_ADMIN_BASE}/outbox/${id}/replay`,
      { method: 'post', repeatSubmit: false },
    ),
  );

export const reconcileAdminPayments = async (
  data?: AdminPaymentReconcilePayload,
) =>
  unwrapData(
    await ruoyiRequest<PaymentReconcileResult>(
      `${PAYMENT_ADMIN_BASE}/reconcile`,
      { method: 'post', data, repeatSubmit: false },
    ),
  );

export const listPaymentChannelConfigs = async () =>
  unwrapData(
    await ruoyiRequest<PaymentChannelConfig[]>(
      `${PAYMENT_ADMIN_BASE}/channel-configs`,
      { method: 'get' },
    ),
  );

export const getPaymentChannelConfig = async (channelCode: 'wechat') =>
  unwrapData(
    await ruoyiRequest<PaymentChannelConfig>(
      `${PAYMENT_ADMIN_BASE}/channel-configs/${channelCode}`,
      { method: 'get' },
    ),
  );

export const savePaymentChannelConfig = async (
  channelCode: 'wechat',
  data: PaymentChannelConfigSavePayload,
) =>
  unwrapData(
    await ruoyiRequest<PaymentChannelConfig>(
      `${PAYMENT_ADMIN_BASE}/channel-configs/${channelCode}`,
      { method: 'put', data, repeatSubmit: false },
    ),
  );

export const validatePaymentChannelConfig = async (channelCode: 'wechat') =>
  unwrapData(
    await ruoyiRequest<PaymentChannelConfig>(
      `${PAYMENT_ADMIN_BASE}/channel-configs/${channelCode}/validate`,
      { method: 'post', repeatSubmit: false },
    ),
  );

export const enablePaymentChannelConfig = async (channelCode: 'wechat') =>
  unwrapData(
    await ruoyiRequest<PaymentChannelConfig>(
      `${PAYMENT_ADMIN_BASE}/channel-configs/${channelCode}/enable`,
      { method: 'post', repeatSubmit: false },
    ),
  );

export const disablePaymentChannelConfig = async (channelCode: 'wechat') =>
  unwrapData(
    await ruoyiRequest<PaymentChannelConfig>(
      `${PAYMENT_ADMIN_BASE}/channel-configs/${channelCode}/disable`,
      { method: 'post', repeatSubmit: false },
    ),
  );
