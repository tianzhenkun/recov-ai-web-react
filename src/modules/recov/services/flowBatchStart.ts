import { ruoyiRequest } from '@/api/main';
import type { PageQuery } from './datelligence';

export type FlowBatchStartFilter = {
  debtNumber?: number | string;
  city?: string;
  organization?: string;
};

export type FlowBatchStartResult = {
  batchId?: number | string;
  matchedCount?: number;
  acceptedCount?: number;
  skippedCount?: number;
};

export type FlowBatchProgress = {
  batchId?: number | string;
  totalCount?: number;
  pendingCount?: number;
  successCount?: number;
  failedCount?: number;
};

export type FlowBatchFailureItem = {
  debtRecordId?: number | string;
  debtNumber?: number | string;
  debtorName?: string;
  city?: string;
  organization?: string;
  personaId?: number | string | null;
  flowStartErrorMessage?: string | null;
  flowStartTime?: string | null;
};

const BASE = '/system/recov/flow/instance/batch';

export const startFlowBatch = (data: FlowBatchStartFilter) =>
  ruoyiRequest<FlowBatchStartResult>(`${BASE}/start`, {
    method: 'post',
    data,
  });

export const getFlowBatchProgress = (batchId: number | string) =>
  ruoyiRequest<FlowBatchProgress>(`${BASE}/${batchId}`, {
    method: 'get',
  });

export const getFlowBatchFailurePage = (
  batchId: number | string,
  params?: PageQuery,
) =>
  ruoyiRequest<FlowBatchFailureItem>(`${BASE}/${batchId}/failures`, {
    method: 'get',
    params,
  });

export const retryFlowBatchFailures = (batchId: number | string) =>
  ruoyiRequest<FlowBatchStartResult>(`${BASE}/${batchId}/retry-failed`, {
    method: 'post',
  });

export const retryFailedDebtFlowStart = (
  batchId: number | string,
  debtRecordId: number | string,
) =>
  ruoyiRequest<FlowBatchStartResult>(
    `${BASE}/${batchId}/debt/${debtRecordId}/retry-start`,
    {
      method: 'post',
    },
  );
