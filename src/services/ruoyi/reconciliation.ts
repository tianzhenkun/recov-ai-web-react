import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type PageQuery = {
  pageNum?: number;
  pageSize?: number;
  [key: string]: unknown;
};

export type ReconciliationStatistics = {
  totalSystemAmount?: number | string;
  totalRecordedAmount?: number | string;
  totalDifferenceAmount?: number | string;
  pendingDifferenceCount?: number | string;
};

export type ReconciliationItem = {
  id?: number | string;
  debtId?: number | string;
  instanceId?: string;
  debtNumber?: string;
  city?: string;
  organization?: string;
  debtorName?: string;
  debtAmount?: number | string;
  overdueAmount?: number | string;
  systemAmount?: number | string;
  recordedAmount?: number | string;
  difference?: number | string;
  hasDifference?: boolean;
  systemMode?: number | string;
  status?: number | string;
  statusDesc?: string;
  repaymentCount?: number | string;
  serviceFee?: number | string;
  feeRate?: number | string;
  remark?: string;
  debtCreateTime?: string;
  createTime?: string;
};

export type ReconciliationQuery = PageQuery & {
  debtNumber?: string;
  city?: string;
  organization?: string;
};

export type ReconciliationListResult = {
  code?: number;
  msg?: string;
  rows?: ReconciliationItem[];
  total?: number;
};

export type DifferencePayload = {
  id: number | string;
  reason?: string;
  adjustedAmount?: number;
};

export type RepaymentPayload = {
  id: number | string;
  amount: number;
  remark?: string;
};

export type ConfirmRepaymentPayload = {
  id: number | string;
  remark?: string;
};

export const getSystemMode = () =>
  ruoyiRequest<number>('/system/recov/tenant/config/mode', {
    method: 'get',
  });

export const getSmartReconciliationStatistics = () =>
  ruoyiRequest<ReconciliationStatistics>(
    '/system/recov/repayment/smart/statistics',
    {
      method: 'get',
    },
  );

export const getSmartReconciliationList = (params: ReconciliationQuery) =>
  ruoyiRequest<ReconciliationItem>('/system/recov/repayment/smart/list', {
    method: 'get',
    params,
  });

export const handleDifference = (data: DifferencePayload) =>
  ruoyiRequest('/system/recov/repayment/difference', {
    method: 'put',
    data,
  });

export const addRepayment = (data: RepaymentPayload) =>
  ruoyiRequest('/system/recov/repayment/add', {
    method: 'post',
    data,
  });

export const updateAmount = (data: {
  id: number | string;
  recordedAmount: number;
  systemAmount?: number;
}) =>
  ruoyiRequest('/system/recov/repayment/amount', {
    method: 'put',
    data,
  });

export const confirmRepayment = (data: ConfirmRepaymentPayload) =>
  ruoyiRequest('/system/recov/repayment/confirm', {
    method: 'put',
    data,
  });
