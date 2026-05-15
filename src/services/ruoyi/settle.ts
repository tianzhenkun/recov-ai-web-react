import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type PageQuery = {
  pageNum?: number;
  pageSize?: number;
  [key: string]: unknown;
};

export interface ServiceFeeStatistics {
  unpaidServiceFeeTotal: number;
  currentWeekServiceFee: number;
  currentWeekRepayment: number;
  processedDifferenceAmount: number;
  processedDifferenceServiceFee: number;
}

export interface SettlementRecord {
  id: number;
  period: string;
  settlementDate: string;
  repaymentAmount: number;
  serviceFee: number;
  paidServiceFee: number;
  unpaidServiceFee: number;
  status: string;
  statusDesc: string;
  createTime: string;
}

export interface ServiceFeeDetail {
  id: number;
  debtNumber: string;
  city: string;
  organization: string;
  debtorName: string;
  debtAmount: number;
  overdueAmount: number;
  repaymentAmount: number;
  feeRate: number;
  serviceFee: number;
}

export interface DifferenceServiceFeeDetail {
  id: number;
  debtNumber: string;
  city: string;
  organization: string;
  debtorName: string;
  debtAmount: number;
  overdueAmount: number;
  systemAmount: number;
  recordedAmount: number;
  differenceAmount: number;
  feeRate: number;
  serviceFee: number;
}

export type SettlementQuery = PageQuery & {
  status?: string;
};

export type ServiceFeeDetailQuery = PageQuery & {
  debtNumber?: string;
  city?: string;
  organization?: string;
  startTime?: string;
  endTime?: string;
};

export type DifferenceDetailQuery = PageQuery & {
  debtNumber?: string;
  city?: string;
  organization?: string;
};

export interface PaySettlementPayload {
  paidAmount: number;
}

/**
 * 服务费结算统计（顶部卡片）。
 */
export const getServiceFeeStatistics = () =>
  ruoyiRequest<ServiceFeeStatistics>(
    '/system/recov/service-fee/settlement/statistics',
    { method: 'get' },
  );

/**
 * 结算记录分页列表。
 */
export const getSettlementPage = (params: SettlementQuery) =>
  ruoyiRequest<SettlementRecord>('/system/recov/service-fee/settlement/page', {
    method: 'get',
    params: params as Record<string, unknown>,
  });

/**
 * 服务费明细（本周列表、结算明细弹窗共用）。
 */
export const getServiceFeeDetails = (params: ServiceFeeDetailQuery) =>
  ruoyiRequest<ServiceFeeDetail>('/system/recov/repayment/service-fee-details', {
    method: 'get',
    params: params as Record<string, unknown>,
  });

/**
 * 对账差异产生服务费明细。
 */
export const getDifferenceDetails = (params: DifferenceDetailQuery) =>
  ruoyiRequest<DifferenceServiceFeeDetail>(
    '/system/recov/repayment/difference-details',
    {
      method: 'get',
      params: params as Record<string, unknown>,
    },
  );

/**
 * 按结算单 ID 查询明细（Vue 页面未使用，保留契约对齐）。
 */
export const getSettlementDetails = (id: number, params?: PageQuery) =>
  ruoyiRequest<ServiceFeeDetail>(
    `/system/recov/service-fee/settlement/${id}/details`,
    {
      method: 'get',
      params: params as Record<string, unknown>,
    },
  );

/**
 * 录入缴费。
 */
export const paySettlement = (id: number, data: PaySettlementPayload) =>
  ruoyiRequest(`/system/recov/service-fee/settlement/${id}/pay`, {
    method: 'put',
    data,
  });
