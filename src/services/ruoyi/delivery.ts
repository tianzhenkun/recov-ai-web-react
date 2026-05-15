import { ruoyiRequest } from '@/adapters/ruoyi/request';
import type { RuoyiResponse } from '@/adapters/ruoyi/response';

export type DeliveryWayCode = 'sms' | 'email' | 'express' | 'call';

export type DeliveryVariable = {
  key: string;
  label: string;
  scope?: string | null;
};

export type DeliveryStrategyFlowNode = {
  nodeId: string;
  nodeName: string;
  wayCode?: string;
  wayName?: string;
  status?: number | null;
  sortOrder?: number | null;
  proceedOnSuccess?: boolean;
};

export type DeliveryStrategyRow = {
  id: string;
  strategyId?: string;
  sceneCode: string;
  sceneName: string;
  sceneIcon?: string | null;
  status?: number | null;
  sortOrder?: number | null;
  deliveryObj: string;
  nodes: DeliveryStrategyFlowNode[];
};

export type DeliveryWayListRow = {
  id?: string;
  wayCode: string;
  wayName: string;
  subjectTemplate?: string | null;
  contentTemplate?: string | null;
  providerTemplateId?: string | null;
  status?: number | null;
  sortOrder?: number | null;
  tenantId?: string | null;
  nodeId: string;
  nodeName: string;
  enabled?: boolean;
  description?: string;
  icon?: string;
  sort?: number | null;
};

export type DeliveryStrategyFlowConfigNode = {
  nodeId?: string;
  nodeName?: string;
  wayCode?: string;
  wayName?: string;
  sortOrder?: number;
  proceedOnSuccess?: boolean;
};

export type DeliveryStrategyFlowPayload = {
  strategyId?: string;
  strategyName?: string;
  deliveryObj?: string;
  sceneName?: string;
  sceneIcon?: string | null;
  status?: number | null;
  sortOrder?: number | null;
  nodes: DeliveryStrategyFlowConfigNode[];
};

export type DeliveryWayUpdatePayload = {
  wayName?: string;
  subjectTemplate?: string | null;
  contentTemplate: string;
  providerTemplateId?: string | null;
  sortOrder?: number | null;
  status?: number | null;
};

export type DeliveryWayPreviewPayload = {
  subjectTemplate?: string | null;
  contentTemplate?: string | null;
};

export type DeliveryWayPreviewResult = {
  subject?: string | null;
  content?: string | null;
};

type ListCompatResponse<T> = Omit<RuoyiResponse<T[]>, 'rows'> & {
  data?: T[];
  rows?: T[];
};

const BASE = '/system/recov/delivery/config';

export const normalizeDeliveryWayCode = (
  value: unknown,
): DeliveryWayCode | null => {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'sms' || v === 'email' || v === 'express' || v === 'call') {
    return v;
  }
  if (v === 'phone') return 'call';
  return null;
};

const toArray = <T>(res: RuoyiResponse<T[]>): T[] => {
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.rows)) return res.rows as T[];
  return [];
};

const toStatus = (value: unknown, fallback = 1) => {
  if (value === 0 || value === '0' || value === false) return 0;
  if (value === 1 || value === '1' || value === true) return 1;
  return fallback;
};

const normalizeWay = (row: Partial<DeliveryWayListRow>): DeliveryWayListRow => {
  const code =
    normalizeDeliveryWayCode(row.wayCode ?? row.nodeId) ??
    String(row.wayCode ?? row.nodeId ?? '');
  const name = String(row.wayName ?? row.nodeName ?? code);
  return {
    ...row,
    wayCode: code,
    wayName: name,
    nodeId: code,
    nodeName: name,
    enabled: row.status !== 0 && row.enabled !== false,
    sort: row.sortOrder ?? row.sort ?? null,
  };
};

const normalizeNode = (
  node: Partial<DeliveryStrategyFlowNode>,
): DeliveryStrategyFlowNode | null => {
  const code =
    normalizeDeliveryWayCode(node.wayCode ?? node.nodeId) ??
    String(node.wayCode ?? node.nodeId ?? '');
  if (!code) return null;
  const name = String(node.wayName ?? node.nodeName ?? code);
  return {
    ...node,
    wayCode: code,
    wayName: name,
    nodeId: code,
    nodeName: name,
    proceedOnSuccess: node.proceedOnSuccess === true,
  };
};

const normalizeStrategy = (
  row: Partial<DeliveryStrategyRow>,
): DeliveryStrategyRow => {
  const sceneCode = String(row.sceneCode ?? row.id ?? '');
  const sceneName = String(row.sceneName ?? row.deliveryObj ?? sceneCode);
  const nodes = Array.isArray(row.nodes)
    ? row.nodes
        .map((node) => normalizeNode(node))
        .filter((node): node is DeliveryStrategyFlowNode => node !== null)
        .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    : [];
  return {
    ...row,
    id: sceneCode,
    strategyId: String(row.strategyId ?? row.id ?? ''),
    sceneCode,
    sceneName,
    deliveryObj: sceneName,
    nodes,
  };
};

export const listDeliveryVariables = () =>
  ruoyiRequest<DeliveryVariable[]>(`${BASE}/variables`, {
    method: 'get',
  });

export const listDeliveryWay = async (): Promise<
  ListCompatResponse<DeliveryWayListRow>
> => {
  const res = await ruoyiRequest<DeliveryWayListRow[]>(`${BASE}/ways`, {
    method: 'get',
  });
  const rows = toArray(res).map(normalizeWay);
  return { ...res, data: rows, rows };
};

export const getDeliveryWay = async (wayCode: string) => {
  const code = normalizeDeliveryWayCode(wayCode) ?? wayCode;
  const res = await ruoyiRequest<DeliveryWayListRow>(`${BASE}/ways/${code}`, {
    method: 'get',
  });
  return { ...res, data: res.data ? normalizeWay(res.data) : res.data };
};

export const updateDeliveryWay = (
  wayCode: string,
  data: DeliveryWayUpdatePayload,
) => {
  const code = normalizeDeliveryWayCode(wayCode) ?? wayCode;
  return ruoyiRequest(`${BASE}/ways/${code}`, {
    method: 'put',
    data: {
      ...data,
      status:
        data.status === undefined || data.status === null
          ? undefined
          : toStatus(data.status),
    },
  });
};

export const updateDeliveryWayStatus = (wayCode: string, status: number) => {
  const code = normalizeDeliveryWayCode(wayCode) ?? wayCode;
  return ruoyiRequest(`${BASE}/ways/${code}/status`, {
    method: 'put',
    data: { status: toStatus(status) },
  });
};

export const previewDeliveryWay = (
  wayCode: string,
  data: DeliveryWayPreviewPayload,
) => {
  const code = normalizeDeliveryWayCode(wayCode) ?? wayCode;
  return ruoyiRequest<DeliveryWayPreviewResult>(`${BASE}/ways/${code}/preview`, {
    method: 'post',
    data,
  });
};

export const listDeliveryStrategy = async (): Promise<
  ListCompatResponse<DeliveryStrategyRow>
> => {
  const res = await ruoyiRequest<DeliveryStrategyRow[]>(`${BASE}/strategies`, {
    method: 'get',
  });
  const rows = toArray(res).map(normalizeStrategy);
  return { ...res, data: rows, rows };
};

export const getDeliveryStrategyFlow = async (sceneCode: number | string) => {
  const res = await ruoyiRequest<DeliveryStrategyRow>(
    `${BASE}/strategies/${sceneCode}`,
    { method: 'get' },
  );
  return { ...res, data: res.data ? normalizeStrategy(res.data) : res.data };
};

export const updateDeliveryStrategyFlow = (
  sceneCode: number | string,
  data: DeliveryStrategyFlowPayload,
) =>
  ruoyiRequest(`${BASE}/strategies/${sceneCode}/flow`, {
    method: 'put',
    data: {
      sceneName: data.sceneName ?? data.strategyName ?? data.deliveryObj,
      sceneIcon: data.sceneIcon,
      status:
        data.status === undefined || data.status === null
          ? undefined
          : toStatus(data.status),
      sortOrder: data.sortOrder,
      nodes: data.nodes.map((node, index) => ({
        wayCode:
          normalizeDeliveryWayCode(node.wayCode ?? node.nodeId) ??
          String(node.wayCode ?? node.nodeId ?? ''),
        sortOrder: node.sortOrder ?? index + 1,
      })),
    },
  });

export const updateDeliveryStrategyStatus = (
  sceneCode: number | string,
  status: number,
) =>
  ruoyiRequest(`${BASE}/strategies/${sceneCode}/status`, {
    method: 'put',
    data: { status: toStatus(status) },
  });
