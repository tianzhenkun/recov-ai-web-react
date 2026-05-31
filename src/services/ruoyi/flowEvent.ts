import { ruoyiRequest } from '@/adapters/ruoyi/request';
import type { PageQuery } from './datelligence';

export type FlowEventPageQuery = PageQuery & {
  debtRecordId?: number | string;
  unreadOnly?: boolean;
  orderByColumn?: string;
  isAsc?: string;
};

export type FlowEventUnreadCountQuery = {
  debtRecordId?: number | string;
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
  read?: boolean;
};

export type FlowEventPageResult = {
  rows: FlowEventPageItem[];
  total: number;
};

const BASE = '/system/recov/flow/events';

const trimText = (value: unknown) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue || undefined;
};

const getFlowEventAccountPrefix = (event: FlowEventPageItem) =>
  event.debtNumber !== null && event.debtNumber !== undefined
    ? `${event.debtNumber}号账户`
    : '账户';

const getFlowEventNodeName = (event: FlowEventPageItem) => {
  const nodeName = trimText(event.nodeName);
  if (nodeName) return nodeName;

  const title = trimText(event.eventTitle);
  if (!title) return '当前节点';

  return (
    title.replace(
      /(开始执行|执行完成|执行失败|重新执行|等待执行|延期执行|已跳过)$/,
      '',
    ) || '当前节点'
  );
};

const includesAny = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword));

const resolveFailedDescription = (event: FlowEventPageItem) => {
  const nodeName = getFlowEventNodeName(event);
  const rawText = `${event.eventContent ?? ''} ${event.reasonText ?? ''}`;

  if (
    includesAny(rawText, [
      '印章',
      'sealCode',
      'company_seal',
      '未找到匹配印章配置',
    ])
  ) {
    return `${nodeName}执行失败，请检查印章配置。`;
  }

  if (
    includesAny(rawText, ['账号配置', '用户名', '密码', 'lawyer_']) ||
    rawText.toLowerCase().includes('lawyer')
  ) {
    return event.nodeCode === 'filing_material_submit'
      ? `${nodeName}执行失败，请检查立案账号配置。`
      : `${nodeName}执行失败，请检查账号配置。`;
  }

  if (includesAny(rawText, ['画像', '分类'])) {
    return `${nodeName}执行失败，请先完善画像分类。`;
  }

  if (includesAny(rawText, ['债务人姓名', '必填字段'])) {
    return `${nodeName}执行失败，请完善债务人基础信息。`;
  }

  return `${nodeName}执行失败，请处理后重试。`;
};

export const resolveFlowEventDisplayDescription = (
  event: FlowEventPageItem,
) => {
  const eventType = String(event.eventType || '').toLowerCase();
  const nodeName = getFlowEventNodeName(event);

  if (eventType === 'flow_started') {
    return trimText(event.eventContent) || '催收流程已开启。';
  }
  if (eventType === 'flow_completed') return '催收流程已完成。';
  if (eventType === 'flow_terminated') return '催收流程已终止。';
  if (eventType === 'node_triggered') return `${nodeName}已开始执行。`;
  if (eventType === 'node_completed') return `${nodeName}执行完成。`;
  if (eventType === 'manual_retry') return `${nodeName}已重新提交执行。`;
  if (eventType === 'node_failed') return resolveFailedDescription(event);
  if (eventType === 'node_skipped') return `${nodeName}已跳过。`;
  if (eventType === 'node_scheduled') return `${nodeName}已进入等待执行。`;
  if (eventType === 'node_delayed') return `${nodeName}暂不可执行，已延期。`;

  return (
    trimText(event.eventTitle) ||
    trimText(event.eventContent) ||
    '流程事件已更新，可进入事件中心查看详情。'
  );
};

export const buildFlowEventDisplaySummary = (event: FlowEventPageItem) =>
  `${getFlowEventAccountPrefix(event)} ${resolveFlowEventDisplayDescription(
    event,
  )}`;

export const getFlowEventPage = (params?: FlowEventPageQuery) =>
  ruoyiRequest<FlowEventPageItem>(`${BASE}/page`, {
    method: 'get',
    params,
  });

export const getFlowEventUnreadCount = (params?: FlowEventUnreadCountQuery) =>
  ruoyiRequest<number>(`${BASE}/unread/count`, {
    method: 'get',
    params,
  });

export const markAllFlowEventsRead = () =>
  ruoyiRequest<void>(`${BASE}/read`, {
    method: 'post',
    repeatSubmit: false,
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

export const normalizeFlowEventUnreadCount = (response: unknown) => {
  if (typeof response === 'number') {
    return toNumber(response);
  }

  if (!isRecord(response)) {
    return 0;
  }

  if (typeof response.data === 'number') {
    return toNumber(response.data);
  }

  return 0;
};
