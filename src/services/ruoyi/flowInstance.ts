import { ruoyiRequest } from '@/adapters/ruoyi/request';
import type { PageQuery } from './datelligence';

export type FlowInstanceQuery = PageQuery & {
  flowStatus?: number | string;
  debtRecordId?: number | string;
  debtNumber?: number | string;
  debtorName?: string;
  city?: string;
  organization?: string;
  batchId?: number | string;
  personaId?: number | string;
};

export type FlowInstanceItem = {
  id?: number | string;
  instanceId?: number | string;
  flowId?: number | string;
  tenantId?: string;
  debtRecordId?: number | string;
  debtNumber?: number | string;
  debtorName?: string;
  city?: string;
  organization?: string;
  personaId?: number | string;
  templateId?: number | string;
  flowStatus?: number | string;
  flowStatusName?: string;
  currentStepId?: string;
  currentStepIndex?: number;
  currentNodeCode?: string;
  currentIdentity?: string;
  currentTaskId?: number | string;
  wakeUpTime?: string;
  canRetryCurrentStep?: boolean;
  canTerminate?: boolean;
  totalStepCount?: number;
  reachedStepCount?: number;
  completedStepCount?: number;
  failedStepCount?: number;
  skippedStepCount?: number;
  resultMessage?: string | null;
  errorMessage?: string | null;
  progressMessage?: string | null;
  startTime?: string;
  finishTime?: string;
  createTime?: string;
  updateTime?: string;
  flowContext?: Record<string, unknown>;
};

export type FlowInstanceDetail = FlowInstanceItem & {
  steps?: FlowTraceStep[];
  messages?: FlowTraceMessage[];
};

export type FlowTraceMessage = {
  outboxId?: number | string;
  eventType?: string;
  eventTypeName?: string;
  direction?: string;
  topic?: string;
  tags?: string;
  taskId?: number | string;
  status?: number | string;
  statusName?: string;
  retryCount?: number;
  msgId?: string;
  lastError?: string | null;
  payloadText?: string | null;
  payloadBody?: Record<string, unknown> | null;
};

export type FlowTraceAttempt = {
  recordId?: number | string;
  taskId?: number | string;
  businessId?: number | string | null;
  execStatus?: number | string;
  execStatusName?: string;
  failStrategy?: string;
  skipStrategy?: string;
  resultMessage?: string | null;
  progressMessage?: string | null;
  messages?: FlowTraceMessage[];
};

export type FlowTraceStep = {
  stepId?: string;
  stepIndex?: number;
  nodeCode?: string;
  identity?: string;
  current?: boolean;
  reached?: boolean;
  canRetry?: boolean;
  stepStatus?: string;
  stepStatusName?: string;
  latestTaskId?: number | string;
  latestExecStatus?: number | string;
  latestExecStatusName?: string;
  latestResultMessage?: string | null;
  latestProgressMessage?: string | null;
  attemptCount?: number;
  messageCount?: number;
  attempts?: FlowTraceAttempt[];
};

export type FlowExecutionTrace = {
  instanceId?: number | string;
  tenantId?: string;
  debtRecordId?: number | string;
  personaId?: number | string;
  templateId?: number | string;
  flowStatus?: number | string;
  flowStatusName?: string;
  currentStepId?: string;
  currentStepIndex?: number;
  currentNodeCode?: string;
  currentIdentity?: string;
  currentTaskId?: number | string;
  wakeUpTime?: string;
  canRetryCurrentStep?: boolean;
  canTerminate?: boolean;
  totalStepCount?: number;
  reachedStepCount?: number;
  completedStepCount?: number;
  failedStepCount?: number;
  skippedStepCount?: number;
  flowContext?: Record<string, unknown>;
  steps?: FlowTraceStep[];
  messages?: FlowTraceMessage[];
};

export type FlowEventItem = {
  id?: number | string;
  tenantId?: string;
  instanceId?: number | string;
  debtId?: number | string;
  eventType?: string;
  eventTitle?: string;
  eventContent?: string | null;
  stepId?: string;
  stepIndex?: number;
  nodeCode?: string;
  taskId?: string;
  reasonCode?: string;
  reasonText?: string | null;
  beforeData?: string | null;
  afterData?: string | null;
  sourceType?: string;
  sourceId?: string;
  createBy?: number | string;
  createTime?: string;
};

const BASE = '/system/recov/flow/instance';

export const pageFlowInstances = (params?: FlowInstanceQuery) =>
  ruoyiRequest<FlowInstanceItem>(`${BASE}/page`, {
    method: 'get',
    params,
  });

export const getFlowInstanceDetail = (instanceId: number | string) =>
  ruoyiRequest<FlowInstanceDetail>(`${BASE}/detail/${instanceId}`, {
    method: 'get',
  });

export const getFlowExecutionTrace = (instanceId: number | string) =>
  ruoyiRequest<FlowExecutionTrace>(`${BASE}/${instanceId}/trace`, {
    method: 'get',
  });

export const getFlowEvents = (instanceId: number | string) =>
  ruoyiRequest<FlowEventItem[]>(`${BASE}/${instanceId}/events`, {
    method: 'get',
  });

export const retryFlowCurrentStep = (
  instanceId: number | string,
  stepId: string,
) =>
  ruoyiRequest(`${BASE}/${instanceId}/step/${encodeURIComponent(stepId)}/retry`, {
    method: 'post',
  });

export const terminateFlowInstance = (instanceId: number | string) =>
  ruoyiRequest(`${BASE}/${instanceId}/terminate`, {
    method: 'post',
  });
