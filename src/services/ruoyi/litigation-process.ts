import { ruoyiRequest } from '@/adapters/ruoyi/request';
import type { RuoyiResponse } from '@/adapters/ruoyi/response';

export type LitigationNodeType =
  | 'MATERIAL_SUBMIT'
  | 'PRE_MEDIATION'
  | 'WAITING_FILING'
  | 'FILED'
  | 'FEE_MANAGEMENT'
  | 'COURT_MEDIATION'
  | 'WAITING_HEARING'
  | 'HEARING_DONE'
  | 'WAITING_VERDICT'
  | 'VERDICT_DONE'
  | 'APPLY_ENFORCEMENT'
  | 'ENFORCING';

export type LitigationNodeStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export type LitigationOverviewVO = {
  totalCount: number;
  materialSubmittedCount: number;
  courtAcceptedCount: number;
  nodeDebtAmount: number;
  nodeRepaymentAmount: number;
};

export type LitigationNodeStatVO = {
  nodeType: LitigationNodeType;
  nodeDesc: string;
  count: number;
};

export type FeeManagementResult = {
  paymentDeadline: string;
  paymentAmount: number;
  remainingDays: number;
  warningMessage: string | null;
  paid: boolean;
};

export type LitigationRowVO = {
  id: number;
  debtNumber: number;
  city: string;
  organization: string;
  debtorName: string;
  debtAmount: number;
  overdueAmount: number;
  overdueDays: number;
  courtName: string | null;
  caseNo: string | null;
  nodeStatus: LitigationNodeStatus;
  failReason: string | null;
  result: string | null;
};

export type LitigationPageQuery = {
  pageNum?: number;
  pageSize?: number;
  nodeType: LitigationNodeType;
  city?: string;
  organization?: string;
  nodeStatus?: LitigationNodeStatus | '';
};

export type LitigationPageResult = {
  rows: LitigationRowVO[];
  total: number;
};

export const getLitigationOverview = (nodeType: LitigationNodeType) =>
  ruoyiRequest<LitigationOverviewVO>('/system/recov/litigation/overview', {
    method: 'get',
    params: { nodeType },
  });

export const getLitigationNodeStats = () =>
  ruoyiRequest<LitigationNodeStatVO[]>('/system/recov/litigation/stats', {
    method: 'get',
  });

export const getLitigationPage = (params: LitigationPageQuery) =>
  ruoyiRequest<LitigationRowVO>('/system/recov/litigation/page', {
    method: 'get',
    params,
  });

export const unwrapLitigationOverview = (
  response: RuoyiResponse<LitigationOverviewVO>,
): LitigationOverviewVO => {
  const data = response.data;
  return {
    totalCount: Number(data?.totalCount ?? 0),
    materialSubmittedCount: Number(data?.materialSubmittedCount ?? 0),
    courtAcceptedCount: Number(data?.courtAcceptedCount ?? 0),
    nodeDebtAmount: Number(data?.nodeDebtAmount ?? 0),
    nodeRepaymentAmount: Number(data?.nodeRepaymentAmount ?? 0),
  };
};

export const unwrapLitigationNodeStats = (
  response: RuoyiResponse<LitigationNodeStatVO[]>,
): LitigationNodeStatVO[] => {
  if (Array.isArray(response.data)) return response.data;
  const rows = response.rows as unknown;
  if (Array.isArray(rows) && rows.length > 0 && rows[0] && typeof rows[0] === 'object' && 'nodeType' in rows[0]) {
    return rows as LitigationNodeStatVO[];
  }
  return [];
};

export const unwrapLitigationPage = (
  response: RuoyiResponse<LitigationRowVO>,
): LitigationPageResult => {
  const nested = response.data as
    | { rows?: LitigationRowVO[]; total?: number }
    | LitigationRowVO[]
    | undefined;

  if (nested && !Array.isArray(nested) && Array.isArray(nested.rows)) {
    return {
      rows: nested.rows,
      total: Number(nested.total) || 0,
    };
  }

  return {
    rows: Array.isArray(response.rows)
      ? response.rows
      : Array.isArray(nested)
        ? nested
        : [],
    total: Number(response.total) || 0,
  };
};
