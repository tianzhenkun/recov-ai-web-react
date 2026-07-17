import { ruoyiRequest } from '@/adapters/ruoyi/request';
import type { RuoyiResponse } from '@/adapters/ruoyi/response';

export type CreditOwnerType = 'TENANT' | 'USER';
export type CreditPackageKind = 'FIXED_POINTS' | 'TERM_POINTS';
export type CreditCouponType = 'AMOUNT_OFF' | 'PERCENT_OFF';
export type CreditEnableStatus = 'ENABLED' | 'DISABLED';
export type CreditCouponReceiveMode = 'DIRECT_ISSUE' | 'SELF_CLAIM';
export type CreditCouponValidityType = 'FIXED' | 'AFTER_RECEIVE';
export type CreditPayStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'CLOSED'
  | 'REFUND_LOCKED'
  | 'REFUNDED';
export type CreditPackagePaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'CLOSED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED';
export type CreditPackageRefundStatus =
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED';
export type CreditChargeOrderStatus =
  | 'PROCESSING'
  | 'SETTLED'
  | 'PARTIAL_OUTSTANDING'
  | 'OUTSTANDING'
  | 'PARTIAL_REFUNDED'
  | 'REFUNDED'
  | 'FAILED';
export type CreditLedgerDirection = 'IN' | 'OUT';
export type CreditLedgerType =
  | 'GRANT'
  | 'CHARGE'
  | 'REFUND'
  | 'REVERSAL'
  | 'ADJUSTMENT'
  | 'ARREARS_SETTLEMENT'
  | 'EXPIRE'
  | 'CASH_REFUND_LOCK'
  | 'CASH_REFUND_RESTORE'
  | 'CASH_REFUND_VOID';
export type CreditCouponStatus =
  | 'UNUSED'
  | 'LOCKED'
  | 'USED'
  | 'EXPIRED'
  | 'VOIDED';

export type CreditProduct = {
  id?: string;
  productCode?: string;
  productName?: string;
  status?: CreditEnableStatus;
  sortOrder?: number | string;
  createTime?: string;
  updateTime?: string;
};

export type CreditMeterScenario = {
  id?: string;
  productCode?: string;
  scenarioCode?: string;
  scenarioName?: string;
  unitName?: string;
  status?: CreditEnableStatus;
  createTime?: string;
  updateTime?: string;
};

export type CreditAccount = {
  id?: string;
  tenantId?: string;
  ownerType?: CreditOwnerType;
  ownerId?: string;
  availablePoints?: number | string;
  outstandingPoints?: number | string;
  totalGrantedPoints?: number | string;
  totalChargedPoints?: number | string;
  totalSettledPoints?: number | string;
  totalRefundedPoints?: number | string;
  status?: 'NORMAL' | 'ARREARS_BLOCKED' | 'DISABLED';
  version?: number | string;
  createTime?: string;
  updateTime?: string;
};

export type CreditGrant = {
  id?: string;
  tenantId?: string;
  accountId?: string;
  grantType?: 'purchase' | 'gift' | 'compensation' | 'refund';
  sourceType?: string;
  sourceId?: string;
  packageKind?: CreditPackageKind;
  termMonths?: number | string | null;
  totalPoints?: number | string;
  remainingPoints?: number | string;
  chargedPoints?: number | string;
  lifetimeChargedPoints?: number | string;
  expiredPoints?: number | string;
  voidedPoints?: number | string;
  consumePriority?: number;
  expiresAt?: string;
  status?: 'AVAILABLE' | 'EXHAUSTED' | 'EXPIRED' | 'VOIDED' | 'REFUND_LOCKED';
  refundLockId?: string;
  refundLockedTime?: string;
  remark?: string;
};

export type CreditPricingRule = {
  id?: string;
  productCode?: string;
  scenarioCode?: string;
  pricingVersion?: string;
  unitPoints?: number | string;
  minPoints?: number | string;
  maxPoints?: number | string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status?: CreditEnableStatus;
  ruleSnapshot?: string;
  createTime?: string;
  updateTime?: string;
};

export type CreditChargeOrder = {
  id?: string;
  tenantId?: string;
  accountId?: string;
  usageEventId?: string;
  productCode?: string;
  scenarioCode?: string;
  pricingRuleId?: string;
  pricingSnapshot?: string;
  quantity?: number | string;
  occurredAt?: string;
  billedPoints?: number | string;
  settledPoints?: number | string;
  outstandingPoints?: number | string;
  refundedPoints?: number | string;
  status?: CreditChargeOrderStatus;
  sourceType?: string;
  sourceId?: string;
  createTime?: string;
};

export type CreditLedger = {
  id?: string;
  tenantId?: string;
  accountId?: string;
  ownerType?: CreditOwnerType;
  ownerId?: string;
  direction?: CreditLedgerDirection;
  ledgerType?: CreditLedgerType;
  points?: number | string;
  balanceAfter?: number | string;
  availableDelta?: number | string;
  outstandingDelta?: number | string;
  outstandingAfter?: number | string;
  sourceType?: string;
  sourceId?: string;
  idempotencyKey?: string;
  payloadHash?: string;
  remark?: string;
  createTime?: string;
};

export type CreditPackage = {
  id?: string;
  packageName?: string;
  ownerScope?: CreditOwnerType;
  packageKind?: CreditPackageKind;
  termMonths?: 1 | 3 | number | string | null;
  points?: number | string;
  price?: number | string;
  status?: 'ON_SALE' | 'OFF_SALE';
  products?: CreditPackageProduct[];
  sortOrder?: number | string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
};

export type CreditPackageProduct = {
  productCode?: string;
  productName?: string;
};

export type CreditPackageOrder = {
  id?: string;
  tenantId?: string;
  orderNo?: string;
  packageId?: string;
  packageNameSnapshot?: string;
  packageKindSnapshot?: CreditPackageKind;
  productCode?: string;
  productNameSnapshot?: string;
  termMonths?: number | string | null;
  buyerUserId?: string;
  ownerType?: CreditOwnerType;
  ownerId?: string;
  points?: number | string;
  packagePrice?: number | string;
  couponId?: string;
  couponSnapshot?: string;
  discountAmount?: number | string;
  payAmount?: number | string;
  payStatus?: CreditPayStatus;
  payTime?: string;
  paymentOrderId?: string;
  paymentOrderNo?: string;
  paymentStatus?: CreditPackagePaymentStatus;
  paymentCodeUrl?: string;
  paymentExpiresAt?: string;
  refundStatus?: CreditPackageRefundStatus;
  refundedAt?: string;
  creditGrantId?: string;
  grantExpiresAt?: string;
  expiresAt?: string;
  closeTime?: string;
  closeReason?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
};

export type CreditTermEntitlement = {
  grantId?: string;
  packageOrderId?: string;
  packageId?: string;
  packageName?: string;
  totalPoints?: number | string;
  remainingPoints?: number | string;
  expiresAt?: string;
  status?: CreditGrant['status'];
};

export type CreditProductEntitlements = {
  productCode?: string;
  productName?: string;
  termPackages?: CreditTermEntitlement[];
};

export type CreditEntitlements = {
  tenantId?: string;
  accountId?: string;
  ownerType?: CreditOwnerType;
  ownerId?: string;
  fixedPoints?: {
    totalPoints?: number | string;
    remainingPoints?: number | string;
  };
  products?: CreditProductEntitlements[];
};

export type CreditCouponTemplate = {
  id?: string;
  couponName?: string;
  campaignCode?: string;
  couponType?: CreditCouponType;
  discountAmount?: number | string;
  discountRate?: number | string;
  maxDiscountAmount?: number | string;
  minOrderAmount?: number | string;
  ownerScope?: 'TENANT' | 'USER' | 'ALL';
  packageScope?: 'ALL' | 'SPECIFIED';
  packageId?: string;
  receiveMode?: CreditCouponReceiveMode;
  totalQuota?: number | string;
  issuedCount?: number | string;
  usedCount?: number | string;
  validityType?: CreditCouponValidityType;
  validFrom?: string;
  validTo?: string;
  validDays?: number | string;
  status?: CreditEnableStatus;
  sortOrder?: number | string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
};

export type CreditCoupon = {
  id?: string;
  tenantId?: string;
  templateId?: string;
  campaignCode?: string;
  couponNo?: string;
  issueKey?: string;
  couponName?: string;
  couponType?: CreditCouponType;
  ownerType?: CreditOwnerType;
  ownerId?: string;
  packageScope?: 'ALL' | 'SPECIFIED';
  packageId?: string;
  discountAmount?: number | string;
  discountRate?: number | string;
  maxDiscountAmount?: number | string;
  minOrderAmount?: number | string;
  validFrom?: string;
  expiresAt?: string;
  receivedUserId?: string;
  receivedTime?: string;
  status?: CreditCouponStatus;
  lockOrderId?: string;
  lockExpiresAt?: string;
  usedOrderId?: string;
  usedUserId?: string;
  usedTime?: string;
  issuedByUserId?: string;
  sourceType?: string;
  sourceId?: string;
  couponSnapshot?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
};

export type CreditPricingRuleSavePayload = {
  id?: string;
  productCode: string;
  scenarioCode: string;
  pricingVersion: string;
  unitPoints?: number;
  minPoints?: number;
  maxPoints?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  status?: CreditEnableStatus;
  ruleSnapshot?: string;
};

export type AdminCreditChargeAdjustPayload = {
  chargeOrderId: string;
  adjustmentType: 'REFUND' | 'REVERSAL' | 'ADJUSTMENT';
  points: number;
  idempotencyKey: string;
  reason: string;
};

export type CreditPackageCreatePayload = {
  packageName: string;
  ownerScope: 'TENANT' | 'USER';
  packageKind: 'FIXED_POINTS' | 'TERM_POINTS';
  termMonths?: 1 | 3;
  points: number;
  price: number;
  productCodes: string[];
  sortOrder?: number;
  remark?: string;
};

export type CreditPackageStatusPayload = {
  packageStatus: 'ON_SALE' | 'OFF_SALE';
};

export type CreditPackageOrderCreatePayload = {
  packageId: string;
  productCode: string;
  idempotencyKey: string;
  couponId?: string;
  remark?: string;
};

export type CreditCouponTemplateSavePayload = {
  id?: string;
  campaignCode: string;
  couponName: string;
  couponType?: CreditCouponType;
  discountAmount?: number;
  discountRate?: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  ownerScope?: 'TENANT' | 'USER' | 'ALL';
  packageScope?: 'ALL' | 'SPECIFIED';
  packageId?: string;
  receiveMode?: CreditCouponReceiveMode;
  totalQuota?: number;
  validityType?: CreditCouponValidityType;
  validFrom?: string;
  validTo?: string;
  validDays?: number;
  status?: CreditEnableStatus;
  sortOrder?: number;
  remark?: string;
};

export type CreditCouponClaimPayload = {
  packageId?: string;
};

export type CreditCouponIssuePayload = {
  templateId: string;
  accountId: string;
  sourceType: string;
  sourceId: string;
};

export type AdminCreditGrantPayload = {
  accountId: string;
  points: number;
  grantType: 'purchase' | 'gift' | 'compensation' | 'refund';
  sourceType: string;
  sourceId: string;
  remark?: string;
};

export type CreditPageQuery = {
  pageNum?: number;
  pageSize?: number;
};

export type CreditPackageOrderQuery = CreditPageQuery & {
  payStatus?: CreditPayStatus;
};

export type CreditCouponQuery = CreditPageQuery & {
  status?: CreditCouponStatus;
  packageId?: string;
};

export type CreditLedgerQuery = CreditPageQuery & {
  sourceType?: string;
  sourceId?: string;
};

export type CreditPageResult<T> = {
  rows: T[];
  total: number;
};

export type CreditProductSavePayload = {
  id?: string;
  productCode: string;
  productName: string;
  status?: CreditEnableStatus;
  sortOrder?: number;
};

export type CreditMeterScenarioSavePayload = {
  id?: string;
  productCode: string;
  scenarioCode: string;
  scenarioName: string;
  unitName?: string;
  status?: CreditEnableStatus;
};

const BASE = '/system/credit';
export const CREDIT_ADMIN_BASE = `${BASE}/admin`;
export const CREDIT_TENANT_BASE = `${BASE}/tenant`;
export const CREDIT_ME_BASE = `${BASE}/me`;

const unwrapData = <T>(response: RuoyiResponse<T>) =>
  response.data as T;

const unwrapList = <T>(response: RuoyiResponse<T[]>): T[] =>
  Array.isArray(response.data) ? response.data : [];

const unwrapPage = <T>(response: RuoyiResponse<T>): CreditPageResult<T> => {
  return {
    rows: Array.isArray(response.rows) ? response.rows : [],
    total: Number(response.total ?? 0),
  };
};

export const saveCreditProduct = async (data: CreditProductSavePayload) =>
  unwrapData(
    await ruoyiRequest<CreditProduct>(`${CREDIT_ADMIN_BASE}/catalog/products`, {
      method: 'put',
      data,
      repeatSubmit: false,
    }),
  );

export const listCreditProducts = async (params?: {
  status?: CreditEnableStatus;
}) =>
  unwrapList(
    await ruoyiRequest<CreditProduct[]>(`${CREDIT_ADMIN_BASE}/catalog/products`, {
      method: 'get',
      params,
    }),
  );

export const saveCreditMeterScenario = async (
  data: CreditMeterScenarioSavePayload,
) =>
  unwrapData(
    await ruoyiRequest<CreditMeterScenario>(`${CREDIT_ADMIN_BASE}/catalog/meter-scenarios`, {
      method: 'put',
      data,
      repeatSubmit: false,
    }),
  );

export const listCreditMeterScenarios = async (params?: {
  productCode?: string;
  status?: CreditEnableStatus;
}) =>
  unwrapList(
    await ruoyiRequest<CreditMeterScenario[]>(`${CREDIT_ADMIN_BASE}/catalog/meter-scenarios`, {
      method: 'get',
      params,
    }),
  );

export const pageCreditAccounts = async (params?: {
  ownerType?: CreditOwnerType;
  pageNum?: number;
  pageSize?: number;
}) =>
  unwrapPage(
    await ruoyiRequest<CreditAccount>(`${CREDIT_ADMIN_BASE}/accounts`, {
      method: 'get',
      params,
    }),
  );

export const listCreditAccounts = async (params?: {
  ownerType?: CreditOwnerType;
  pageNum?: number;
  pageSize?: number;
}) => (await pageCreditAccounts(params)).rows;

export const createCreditPackage = async (
  data: CreditPackageCreatePayload,
) =>
  unwrapData(
    await ruoyiRequest<CreditPackage>(`${CREDIT_ADMIN_BASE}/packages`, {
      method: 'post',
      data,
      repeatSubmit: false,
    }),
  );

export const updateCreditPackage = async (
  id: string,
  data: CreditPackageCreatePayload,
) =>
  unwrapData(
    await ruoyiRequest<CreditPackage>(`${CREDIT_ADMIN_BASE}/packages/${id}`, {
      method: 'put',
      data,
      repeatSubmit: false,
    }),
  );

export const updateCreditPackageStatus = async (
  id: string,
  data: CreditPackageStatusPayload,
) =>
  unwrapData(
    await ruoyiRequest<CreditPackage>(`${CREDIT_ADMIN_BASE}/packages/${id}/status`, {
      method: 'put',
      data,
      repeatSubmit: false,
    }),
  );

export const listCreditPackages = async (params?: {
  ownerScope?: 'TENANT' | 'USER';
  packageStatus?: 'ON_SALE' | 'OFF_SALE';
}) =>
  unwrapList(
    await ruoyiRequest<CreditPackage[]>(`${CREDIT_ADMIN_BASE}/packages`, {
      method: 'get',
      params,
    }),
  );

export const saveCreditCouponTemplate = async (
  data: CreditCouponTemplateSavePayload,
) =>
  unwrapData(
    await ruoyiRequest<CreditCouponTemplate>(`${CREDIT_ADMIN_BASE}/coupon-templates`, {
      method: 'put',
      data,
      repeatSubmit: false,
    }),
  );

export const listCreditCouponTemplates = async (params?: {
  receiveMode?: CreditCouponReceiveMode;
  status?: CreditEnableStatus;
}) =>
  unwrapList(
    await ruoyiRequest<CreditCouponTemplate[]>(`${CREDIT_ADMIN_BASE}/coupon-templates`, {
      method: 'get',
      params,
    }),
  );

export const issueCreditCoupon = async (data: CreditCouponIssuePayload) =>
  unwrapData(
    await ruoyiRequest<CreditCoupon>(`${CREDIT_ADMIN_BASE}/coupons/issue`, {
      method: 'post',
      data,
      repeatSubmit: false,
    }),
  );

export const pageCreditCoupons = async (params?: {
  ownerType?: CreditOwnerType;
  status?: CreditCouponStatus;
  packageId?: string;
  pageNum?: number;
  pageSize?: number;
}) =>
  unwrapPage(
    await ruoyiRequest<CreditCoupon>(`${CREDIT_ADMIN_BASE}/coupons`, {
      method: 'get',
      params,
    }),
  );

export const listCreditCoupons = async (params?: {
  ownerType?: CreditOwnerType;
  status?: CreditCouponStatus;
  packageId?: string;
  pageNum?: number;
  pageSize?: number;
}) => (await pageCreditCoupons(params)).rows;

export const saveCreditPricingRule = async (
  data: CreditPricingRuleSavePayload,
) =>
  unwrapData(
    await ruoyiRequest<CreditPricingRule>(`${CREDIT_ADMIN_BASE}/catalog/pricing-rules`, {
      method: 'put',
      data,
      repeatSubmit: false,
    }),
  );

export const listCreditPricingRules = async (params?: {
  productCode?: string;
  scenarioCode?: string;
}) =>
  unwrapList(
    await ruoyiRequest<CreditPricingRule[]>(`${CREDIT_ADMIN_BASE}/catalog/pricing-rules`, {
      method: 'get',
      params,
    }),
  );

export const adjustAdminCreditCharge = async (
  data: AdminCreditChargeAdjustPayload,
) =>
  unwrapData(
    await ruoyiRequest<CreditChargeOrder>(
      `${CREDIT_ADMIN_BASE}/charge-orders/adjustments`,
      { method: 'post', data, repeatSubmit: false },
    ),
  );

export const pageCreditOrders = async (params?: {
  accountId?: string;
  productCode?: string;
  sourceId?: string;
  status?: CreditChargeOrderStatus;
  pageNum?: number;
  pageSize?: number;
}) =>
  unwrapPage(
    await ruoyiRequest<CreditChargeOrder>(`${CREDIT_ADMIN_BASE}/charge-orders`, {
      method: 'get',
      params,
    }),
  );

export const listCreditOrders = async (params?: {
  accountId?: string;
  productCode?: string;
  sourceId?: string;
  status?: CreditChargeOrderStatus;
  pageNum?: number;
  pageSize?: number;
}) => (await pageCreditOrders(params)).rows;

export const pageCreditLedgers = async (params?: {
  accountId?: string;
  ledgerType?: CreditLedgerType;
  sourceId?: string;
  pageNum?: number;
  pageSize?: number;
}) =>
  unwrapPage(
    await ruoyiRequest<CreditLedger>(`${CREDIT_ADMIN_BASE}/ledgers`, {
      method: 'get',
      params,
    }),
  );

export const listCreditLedgers = async (params?: {
  accountId?: string;
  ledgerType?: CreditLedgerType;
  sourceId?: string;
  pageNum?: number;
  pageSize?: number;
}) => (await pageCreditLedgers(params)).rows;

export const grantAdminCredit = async (
  data: AdminCreditGrantPayload,
) =>
  unwrapData(
    await ruoyiRequest<CreditGrant>(`${CREDIT_ADMIN_BASE}/accounts/grants`,
      {
        method: 'post',
        data,
        repeatSubmit: false,
      },
    ),
  );

export const listAdminCreditGrants = async (accountId: string) =>
  unwrapList(
    await ruoyiRequest<CreditGrant[]>(
      `${CREDIT_ADMIN_BASE}/accounts/${accountId}/grants`,
      { method: 'get' },
    ),
  );

const scopedCreditBase = (scope: 'tenant' | 'me') =>
  scope === 'tenant' ? CREDIT_TENANT_BASE : CREDIT_ME_BASE;

export const getScopedCreditAccount = async (scope: 'tenant' | 'me') =>
  unwrapData(
    await ruoyiRequest<CreditAccount>(`${scopedCreditBase(scope)}/account`, {
      method: 'get',
    }),
  );

export const listScopedCreditGrants = async (scope: 'tenant' | 'me') =>
  unwrapList(
    await ruoyiRequest<CreditGrant[]>(
      `${scopedCreditBase(scope)}/account/grants`,
      { method: 'get' },
    ),
  );

export const listScopedCreditPackages = async (
  scope: 'tenant' | 'me',
  productCode?: string,
) =>
  unwrapList(
    await ruoyiRequest<CreditPackage[]>(`${scopedCreditBase(scope)}/packages`, {
      method: 'get',
      params: productCode ? { productCode } : undefined,
    }),
  );

export const getScopedCreditEntitlements = async (
  scope: 'tenant' | 'me',
) =>
  unwrapData(
    await ruoyiRequest<CreditEntitlements>(
      `${scopedCreditBase(scope)}/entitlements`,
      { method: 'get' },
    ),
  );

export const createScopedCreditPackageOrder = async (
  scope: 'tenant' | 'me',
  data: CreditPackageOrderCreatePayload,
) =>
  unwrapData(
    await ruoyiRequest<CreditPackageOrder>(
      `${scopedCreditBase(scope)}/package-orders`,
      {
        method: 'post',
        data,
        repeatSubmit: false,
      },
    ),
  );

export const pageScopedCreditPackageOrders = async (
  scope: 'tenant' | 'me',
  params?: CreditPackageOrderQuery,
) =>
  unwrapPage(
    await ruoyiRequest<CreditPackageOrder>(
      `${scopedCreditBase(scope)}/package-orders`,
      { method: 'get', params },
    ),
  );

export const listScopedCreditPackageOrders = async (
  scope: 'tenant' | 'me',
  params?: CreditPackageOrderQuery,
) => (await pageScopedCreditPackageOrders(scope, params)).rows;

export const getScopedCreditPackageOrder = async (
  scope: 'tenant' | 'me',
  id: string,
) =>
  unwrapData(
    await ruoyiRequest<CreditPackageOrder>(
      `${scopedCreditBase(scope)}/package-orders/${id}`,
      { method: 'get' },
    ),
  );

export const retryScopedCreditPackagePayment = async (
  scope: 'tenant' | 'me',
  id: string,
) =>
  unwrapData(
    await ruoyiRequest<CreditPackageOrder>(
      `${scopedCreditBase(scope)}/package-orders/${id}/payment`,
      { method: 'post', repeatSubmit: false },
    ),
  );

export const pageScopedCreditCoupons = async (
  scope: 'tenant' | 'me',
  params?: CreditCouponQuery,
) =>
  unwrapPage(
    await ruoyiRequest<CreditCoupon>(`${scopedCreditBase(scope)}/coupons`, {
      method: 'get',
      params,
    }),
  );

export const listScopedCreditCoupons = async (
  scope: 'tenant' | 'me',
  params?: CreditCouponQuery,
) => (await pageScopedCreditCoupons(scope, params)).rows;

export const listScopedClaimableCouponTemplates = async (
  scope: 'tenant' | 'me',
  params?: { packageId?: string },
) =>
  unwrapList(
    await ruoyiRequest<CreditCouponTemplate[]>(
      `${scopedCreditBase(scope)}/coupon-templates/claimable`,
      { method: 'get', params },
    ),
  );

export const claimScopedCreditCoupon = async (
  scope: 'tenant' | 'me',
  templateId: string,
  data?: CreditCouponClaimPayload,
) =>
  unwrapData(
    await ruoyiRequest<CreditCoupon>(
      `${scopedCreditBase(scope)}/coupons/${templateId}/claim`,
      {
        method: 'post',
        data,
        repeatSubmit: false,
      },
    ),
  );

export const pageScopedCreditLedgers = async (
  scope: 'tenant' | 'me',
  params?: CreditLedgerQuery,
) =>
  unwrapPage(
    await ruoyiRequest<CreditLedger>(`${scopedCreditBase(scope)}/ledgers`, {
      method: 'get',
      params,
    }),
  );

export const listScopedCreditLedgers = async (
  scope: 'tenant' | 'me',
  params?: CreditLedgerQuery,
) => (await pageScopedCreditLedgers(scope, params)).rows;
