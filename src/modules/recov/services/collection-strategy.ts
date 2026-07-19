import { ruoyiRequest } from '@/api/main';

export type StepFailStrategy = 'BLOCK' | 'CONTINUE';
export type StepSkipStrategy = 'TERMINATE' | 'CONTINUE';

export interface StepExecutionConfig {
  waitMinutes?: number;
  failStrategy?: StepFailStrategy;
  skipStrategy?: StepSkipStrategy;
}

/**
 * 串行催收步骤。数组顺序就是执行顺序，不再使用 nodes/edges。
 */
export interface StrategyStep {
  id: string;
  nodeCode: string;
  identity?: string;
  config?: StepExecutionConfig;
  params?: Record<string, unknown>;
}

/**
 * 后端节点类型。
 */
export interface FlowNodeTypeVO {
  code: string;
  label: string;
  description?: string;
}

/**
 * 流程模板数据模型。
 */
export interface FlowTemplateVO {
  id: number | string;
  version?: number;
  templateName: string;
  personaId: number | string;
  steps: StrategyStep[];
  status?: '0' | '1' | '2';
  createBy?: number | string;
  createTime?: string;
  updateTime?: string;
  tenantId?: string;
}

export interface FlowTemplatePageQuery {
  pageNum?: number;
  pageSize?: number;
  personaId?: number | string;
  templateName?: string;
}

export interface CreateFlowTemplateDTO {
  templateName: string;
  personaId: number | string;
  steps: StrategyStep[];
}

export interface UpdateFlowTemplateDTO {
  templateName?: string;
  steps: StrategyStep[];
}

/**
 * 画像外呼策略。
 */
export interface CallConfigVO {
  id: number | string;
  tenantId?: string;
  identityName?: string;
  strategyCore?: string;
  speakingStyle?: string;
  openingTemplate?: string;
  personaId: number | string;
  createBy?: number | string;
  createTime?: string;
  updateBy?: number | string;
  updateTime?: string;
}

export interface UpdateCallConfigDTO {
  identityName?: string;
  strategyCore?: string;
  speakingStyle?: string;
  openingTemplate?: string;
  personaId?: number | string;
}

/**
 * 查询后端支持的节点类型。
 */
export const listFlowNodeTypes = () =>
  ruoyiRequest<FlowNodeTypeVO[]>('/system/recov/flow/template/node-types', {
    method: 'get',
  });

/**
 * 分页查询当前有效模板。
 */
export const listCurrentFlowTemplates = (query?: FlowTemplatePageQuery) =>
  ruoyiRequest<FlowTemplateVO>('/system/recov/flow/template/page', {
    method: 'get',
    params: query as Record<string, unknown> | undefined,
  });

/**
 * 创建流程模板。
 */
export const createFlowTemplate = (data: CreateFlowTemplateDTO) =>
  ruoyiRequest<number | string>('/system/recov/flow/template', {
    method: 'post',
    data,
  });

/**
 * 更新流程模板。更新成功后后端会返回新版本模板 ID。
 */
export const updateFlowTemplate = (
  id: number | string,
  data: UpdateFlowTemplateDTO,
) =>
  ruoyiRequest<number | string>(`/system/recov/flow/template/${id}`, {
    method: 'put',
    data,
  });

/**
 * 根据模板 ID 获取详情。
 */
export const getFlowTemplateDetail = (id: number | string) =>
  ruoyiRequest<FlowTemplateVO>(`/system/recov/flow/template/detail/${id}`, {
    method: 'get',
  });

/**
 * 根据用户画像 ID 查询当前有效模板。
 */
export const getFlowTemplateByPersonaId = (personaId: number | string) =>
  ruoyiRequest<FlowTemplateVO>(
    `/system/recov/flow/template/persona/${personaId}`,
    {
      method: 'get',
    },
  );

/**
 * 查询当前租户默认画像的当前有效模板。
 */
export const getDefaultPersonaFlowTemplate = () =>
  ruoyiRequest<FlowTemplateVO>('/system/recov/flow/template/default-persona', {
    method: 'get',
  });

/**
 * 删除当前有效模板。
 */
export const deleteFlowTemplate = (id: number | string) =>
  ruoyiRequest(`/system/recov/flow/template/${id}`, {
    method: 'delete',
  });

/**
 * 查询模板版本列表。
 */
export const listFlowTemplateHistory = (id: number | string) =>
  ruoyiRequest<FlowTemplateVO[]>(`/system/recov/flow/template/${id}/history`, {
    method: 'get',
  });

/**
 * 根据画像 ID 查询外呼策略。
 */
export const listPersonaCallConfigs = (personaId: number | string) =>
  ruoyiRequest<CallConfigVO[]>(`/system/persona/${personaId}/call-config`, {
    method: 'get',
  });

/**
 * 根据 ID 修改外呼策略。
 */
export const updatePersonaCallConfig = (
  id: number | string,
  data: UpdateCallConfigDTO,
) =>
  ruoyiRequest(`/system/persona/call-config/${id}`, {
    method: 'put',
    data,
  });
