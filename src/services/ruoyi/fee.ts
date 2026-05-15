import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type AmountRangeType = 'LT_30M' | 'M30M_100M' | 'GTE_100M';

export interface FeeRateConfig {
  configId: number;
  feeRate: number;
  editable: boolean;
}

export interface OverduePeriodRow {
  overduePeriod: string;
  periodName: string;
  rates: Record<string, FeeRateConfig>;
}

export interface CityTierMatrix {
  cityTier: string;
  tierName: string;
  rows: OverduePeriodRow[];
}

export interface FeeMatrixResponse {
  currentAmountRangeType: AmountRangeType | string;
  currentRangeLabel: string;
  matrix: CityTierMatrix[];
}

export interface FeeRateUpdate {
  configId: number;
  feeRate: number;
  overduePeriod?: string;
  cityTier?: string;
  amountRangeType?: AmountRangeType | string;
}

export interface BatchUpdateRequest {
  amountRangeType?: AmountRangeType | string;
  updates?: FeeRateUpdate[];
}

export interface MatchedRule {
  configId: number;
  cityTier: string;
  overduePeriod: string;
  amountRangeType: string;
  feeRate: number;
}

export interface SimulationResult {
  repaymentAmount: number;
  calculatedServiceFee: number;
}

export interface MatchResult {
  debtId: number;
  debtorName: string;
  city: string;
  cityTier: string;
  debtAge: string;
  debtAgeLabel: string;
  hasLitigation: number;
  currentAmountRangeType: string;
  matchedRule: MatchedRule;
  simulation: SimulationResult;
}

/**
 * 获取服务费费率矩阵。
 */
export const getFeeMatrix = () =>
  ruoyiRequest<FeeMatrixResponse>('/system/recov/service-fee/config/matrix', {
    method: 'get',
  });

/**
 * 批量更新费率或切换当前金额区间。
 */
export const batchUpdateFeeRates = (data: BatchUpdateRequest) =>
  ruoyiRequest('/system/recov/service-fee/config/batch', {
    method: 'put',
    data,
  });

/**
 * 初始化服务费配置（平台侧）。
 */
export const initServiceFeeConfig = (tenantId: string) =>
  ruoyiRequest('/system/recov/service-fee/config/init', {
    method: 'post',
    params: { tenantId },
  });

/**
 * 初始化租户服务费配置。
 */
export const initTenantConfig = (tenantId: string) =>
  ruoyiRequest('/system/recov/service-fee/config/init-tenant', {
    method: 'post',
    params: { tenantId },
  });

/**
 * 匹配费率规则（调试用）。
 */
export const matchFeeRate = (debtId: number, amount?: number) =>
  ruoyiRequest<MatchResult>('/system/recov/service-fee/config/match', {
    method: 'get',
    params: { debtId, amount },
  });
