import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type DeliveryStrategyFlowNode = {
  nodeId: string;
  nodeName: string;
  proceedOnSuccess?: boolean;
};

export type DeliveryStrategyRow = {
  id: number | string;
  deliveryObj: string;
  nodes: DeliveryStrategyFlowNode[];
};

export type DeliveryWayListRow = {
  nodeId: string;
  nodeName: string;
  enabled?: boolean;
  description?: string;
  icon?: string;
  sort?: number | null;
};

export type DeliveryStrategyFlowConfigNode = {
  nodeId: string;
  nodeName?: string;
  proceedOnSuccess: boolean;
};

export type DeliveryStrategyFlowPayload = {
  strategyId?: string;
  strategyName?: string;
  deliveryObj?: string;
  nodes: DeliveryStrategyFlowConfigNode[];
};

export type DeliveryWayDetail = {
  nodeId: string;
  nodeName: string;
  messageTemplate?: string | null;
  emailSubjectTemplate?: string | null;
  emailBodyTemplate?: string | null;
  callTemplate?: string | null;
  sort?: number | null;
  tenantId?: string | null;
  emailTemplateId?: string | null;
  messageTemplateId?: string | null;
};

const BASE = '/system/recov/delivery';

/**
 * 查询全部送达策略（与业务对象一一对应）。
 */
export const listDeliveryStrategy = () =>
  ruoyiRequest<DeliveryStrategyRow>(`${BASE}/strategy/list`, {
    method: 'get',
  });

/**
 * 查询单个策略的流程节点配置。
 */
export const getDeliveryStrategyFlow = (strategyId: number | string) =>
  ruoyiRequest<{ nodes?: DeliveryStrategyFlowNode[] }>(
    `${BASE}/strategy/${strategyId}/flow`,
    { method: 'get' },
  );

/**
 * 保存某策略的流程节点配置。
 */
export const updateDeliveryStrategyFlow = (
  strategyId: number | string,
  data: DeliveryStrategyFlowPayload,
) =>
  ruoyiRequest(`${BASE}/strategy/${strategyId}/flow`, {
    method: 'put',
    data,
  });

/**
 * 查询全部送达节点（送达方式）。
 */
export const listDeliveryWay = () =>
  ruoyiRequest<DeliveryWayListRow>(`${BASE}/way/list`, {
    method: 'get',
  });

/**
 * 查询单个送达节点详情（含模板字段）。
 * 当前页面未直接调用，但保留契约用于后续接入真实模板存储。
 */
export const getDeliveryWay = (nodeId: string) =>
  ruoyiRequest<DeliveryWayDetail>(`${BASE}/way/${nodeId}`, {
    method: 'get',
  });
