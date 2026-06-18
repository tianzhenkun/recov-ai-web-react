import { ruoyiRequest } from '@/adapters/ruoyi/request';
import type { RuoyiResponse } from '@/adapters/ruoyi/response';

export type CreditOwnerType = 'tenant' | 'user';

export type CreditAccount = {
  id?: string;
  tenantId?: string;
  ownerType?: CreditOwnerType | string;
  ownerId?: string;
  availablePoints?: number | string;
  frozenPoints?: number | string;
  totalGrantedPoints?: number | string;
  totalChargedPoints?: number | string;
  totalRefundedPoints?: number | string;
  status?: string;
  version?: number | string;
  createTime?: string;
  updateTime?: string;
};

export type CreditGrant = {
  id?: string;
  tenantId?: string;
  accountId?: string;
  grantType?: string;
  sourceType?: string;
  sourceId?: string;
  totalPoints?: number | string;
  remainingPoints?: number | string;
  frozenPoints?: number | string;
  chargedPoints?: number | string;
  expiredPoints?: number | string;
  consumePriority?: number;
  validFrom?: string;
  expiresAt?: string;
  status?: string;
  remark?: string;
};

export type CreditPricingRule = {
  id?: string;
  tenantId?: string;
  businessType?: string;
  scenarioCode?: string;
  pricingVersion?: string;
  ruleName?: string;
  ruleType?: string;
  fixedPoints?: number | string;
  unitPoints?: number | string;
  minPoints?: number | string;
  maxPoints?: number | string;
  ruleConfig?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status?: string;
};

export type CreditQuote = {
  pricingRuleId?: string;
  pricingVersion?: string;
  businessType?: string;
  scenarioCode?: string;
  ruleType?: string;
  usageAmount?: number | string;
  quotePoints?: number | string;
  minPoints?: number | string;
  maxPoints?: number | string;
  quoteSnapshot?: string;
};

export type CreditReservationDetail = {
  id?: string;
  chargeOrderId?: string;
  accountId?: string;
  grantId?: string;
  reservedPoints?: number | string;
  chargedPoints?: number | string;
  releasedPoints?: number | string;
  status?: string;
};

export type CreditOrder = {
  id?: string;
  tenantId?: string;
  accountId?: string;
  ownerType?: CreditOwnerType | string;
  ownerId?: string;
  operatorUserId?: string;
  businessType?: string;
  businessTaskId?: string;
  scenarioCode?: string;
  pricingRuleId?: string;
  pricingVersion?: string;
  quotePoints?: number | string;
  maxPoints?: number | string;
  reservedPoints?: number | string;
  finalPoints?: number | string;
  releasedPoints?: number | string;
  refundedPoints?: number | string;
  status?: string;
  quoteSnapshot?: string;
  usageSnapshot?: string;
  idempotencyKey?: string;
  failureReason?: string;
  reservedTime?: string;
  settledTime?: string;
  releasedTime?: string;
  createTime?: string;
  updateTime?: string;
  details?: CreditReservationDetail[];
};

export type CreditLedger = {
  id?: string;
  tenantId?: string;
  accountId?: string;
  ownerType?: CreditOwnerType | string;
  ownerId?: string;
  grantId?: string;
  chargeOrderId?: string;
  businessType?: string;
  businessTaskId?: string;
  ledgerType?: string;
  direction?: string;
  points?: number | string;
  availableAfter?: number | string;
  frozenAfter?: number | string;
  grantRemainingAfter?: number | string;
  idempotencyKey?: string;
  reasonCode?: string;
  remark?: string;
  createTime?: string;
};

export type CreditAccountEnsurePayload = {
  ownerType?: CreditOwnerType;
  ownerId?: string;
};

export type CreditGrantCreatePayload = {
  ownerType?: CreditOwnerType;
  ownerId?: string;
  grantType: string;
  sourceType?: string;
  sourceId?: string;
  points: number;
  consumePriority?: number;
  validFrom?: string;
  expiresAt?: string;
  remark?: string;
};

export type CreditRechargePayload = {
  ownerType?: CreditOwnerType;
  ownerId?: string;
  grantType?: string;
  sourceType?: string;
  sourceId: string;
  points: number;
  consumePriority?: number;
  validFrom?: string;
  expiresAt?: string;
  remark?: string;
};

export type CreditPricingRuleSavePayload = {
  id?: string;
  businessType: string;
  scenarioCode: string;
  pricingVersion: string;
  ruleName: string;
  ruleType: 'fixed' | 'unit' | 'tiered';
  fixedPoints?: number;
  unitPoints?: number;
  minPoints?: number;
  maxPoints?: number;
  ruleConfig?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status?: string;
};

export type CreditQuotePayload = {
  businessType: string;
  scenarioCode: string;
  pricingVersion?: string;
  usageAmount: number;
  usagePayload?: string;
};

export type CreditReservePayload = CreditQuotePayload & {
  ownerType?: CreditOwnerType;
  ownerId?: string;
  operatorUserId?: string;
  businessTaskId: string;
  maxPoints?: number;
  idempotencyKey?: string;
};

export type CreditSettlePayload = {
  chargeOrderId: string;
  finalPoints: number;
  idempotencyKey?: string;
  usagePayload?: string;
};

export type CreditReleasePayload = {
  chargeOrderId: string;
  idempotencyKey?: string;
  reason?: string;
};

export type CreditRefundPayload = {
  chargeOrderId: string;
  refundPoints: number;
  idempotencyKey: string;
  reason?: string;
  usagePayload?: string;
};

const BASE = '/system/recov/credit';

const unwrapData = <T>(response: RuoyiResponse<T>) =>
  response.data as T;

const unwrapList = <T>(response: RuoyiResponse<T[]>) =>
  Array.isArray(response.data) ? response.data : [];

export const ensureCreditAccount = async (data?: CreditAccountEnsurePayload) =>
  unwrapData(
    await ruoyiRequest<CreditAccount>(`${BASE}/accounts/ensure`, {
      method: 'post',
      data,
      repeatSubmit: false,
    }),
  );

export const listCreditAccounts = async (params?: {
  ownerType?: CreditOwnerType;
}) =>
  unwrapList(
    await ruoyiRequest<CreditAccount[]>(`${BASE}/accounts`, {
      method: 'get',
      params,
    }),
  );

export const createCreditGrant = async (data: CreditGrantCreatePayload) =>
  unwrapData(
    await ruoyiRequest<CreditGrant>(`${BASE}/grants`, {
      method: 'post',
      data,
      repeatSubmit: false,
    }),
  );

export const rechargeCredit = async (data: CreditRechargePayload) =>
  unwrapData(
    await ruoyiRequest<CreditGrant>(`${BASE}/recharges`, {
      method: 'post',
      data,
      repeatSubmit: false,
    }),
  );

export const listCreditGrants = async (params?: { accountId?: string }) =>
  unwrapList(
    await ruoyiRequest<CreditGrant[]>(`${BASE}/grants`, {
      method: 'get',
      params,
    }),
  );

export const saveCreditPricingRule = async (
  data: CreditPricingRuleSavePayload,
) =>
  unwrapData(
    await ruoyiRequest<CreditPricingRule>(`${BASE}/pricing-rules`, {
      method: 'put',
      data,
      repeatSubmit: false,
    }),
  );

export const listCreditPricingRules = async (params?: {
  businessType?: string;
  scenarioCode?: string;
}) =>
  unwrapList(
    await ruoyiRequest<CreditPricingRule[]>(`${BASE}/pricing-rules`, {
      method: 'get',
      params,
    }),
  );

export const quoteCredit = async (data: CreditQuotePayload) =>
  unwrapData(
    await ruoyiRequest<CreditQuote>(`${BASE}/quote`, {
      method: 'post',
      data,
      repeatSubmit: false,
    }),
  );

export const reserveCreditOrder = async (data: CreditReservePayload) =>
  unwrapData(
    await ruoyiRequest<CreditOrder>(`${BASE}/orders/reserve`, {
      method: 'post',
      data,
      repeatSubmit: false,
    }),
  );

export const settleCreditOrder = async (data: CreditSettlePayload) =>
  unwrapData(
    await ruoyiRequest<CreditOrder>(`${BASE}/orders/settle`, {
      method: 'post',
      data,
      repeatSubmit: false,
    }),
  );

export const releaseCreditOrder = async (data: CreditReleasePayload) =>
  unwrapData(
    await ruoyiRequest<CreditOrder>(`${BASE}/orders/release`, {
      method: 'post',
      data,
      repeatSubmit: false,
    }),
  );

export const refundCreditOrder = async (data: CreditRefundPayload) =>
  unwrapData(
    await ruoyiRequest<CreditOrder>(`${BASE}/orders/refund`, {
      method: 'post',
      data,
      repeatSubmit: false,
    }),
  );

export const listCreditOrders = async (params?: {
  accountId?: string;
  businessType?: string;
  businessTaskId?: string;
  status?: string;
}) =>
  unwrapList(
    await ruoyiRequest<CreditOrder[]>(`${BASE}/orders`, {
      method: 'get',
      params,
    }),
  );

export const listCreditLedgers = async (params?: {
  accountId?: string;
  chargeOrderId?: string;
}) =>
  unwrapList(
    await ruoyiRequest<CreditLedger[]>(`${BASE}/ledgers`, {
      method: 'get',
      params,
    }),
  );
