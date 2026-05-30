import { ruoyiRequest } from '@/adapters/ruoyi/request';
import type { PageQuery } from './datelligence';

export type FlowEventPageQuery = PageQuery & {
  debtRecordId?: number | string;
  orderByColumn?: string;
  isAsc?: string;
};

export type FlowEventPageItem = {
  id?: number | string;
  tenantId?: string;
  instanceId?: number | string;
  debtId?: number | string;
  eventScope?: 'flow' | 'node' | 'business' | string;
  eventType?: string;
  eventTitle?: string;
  eventContent?: string | null;
  stepId?: string | null;
  stepIndex?: number | null;
  nodeCode?: string | null;
  nodeName?: string | null;
  taskId?: number | string | null;
  reasonCode?: string | null;
  reasonText?: string | null;
  beforeData?: string | null;
  afterData?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  createBy?: number | string;
  createTime?: string;
  debtNumber?: number | string | null;
};

export type FlowEventPageResult = {
  rows: FlowEventPageItem[];
  total: number;
};

const BASE = '/system/recov/flow/events';

export const getFlowEventPage = (params?: FlowEventPageQuery) =>
  ruoyiRequest<FlowEventPageItem>(`${BASE}/page`, {
    method: 'get',
    params,
  });

const toNumber = (value: unknown) => {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const toRows = (value: unknown) =>
  Array.isArray(value) ? (value as FlowEventPageItem[]) : [];

export const normalizeFlowEventPageResult = (
  response: unknown,
): FlowEventPageResult => {
  if (!isRecord(response)) {
    return {
      rows: [],
      total: 0,
    };
  }

  if (Array.isArray(response.rows)) {
    return {
      rows: toRows(response.rows),
      total: toNumber(response.total),
    };
  }

  const data = response.data;
  if (isRecord(data) && Array.isArray(data.rows)) {
    return {
      rows: toRows(data.rows),
      total: toNumber(data.total),
    };
  }

  const page = isRecord(data) ? data.page : undefined;
  if (isRecord(page) && Array.isArray(page.rows)) {
    return {
      rows: toRows(page.rows),
      total: toNumber(page.total),
    };
  }

  return {
    rows: [],
    total: 0,
  };
};
