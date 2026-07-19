import { ruoyiRequest } from '@/api/main';

export type RecovConfKey =
  | 'flow.runtime_control'
  | 'flow.scheduler_control'
  | 'flow.outbox_control'
  | 'flow.node_control';

export type RecovConfVO<T = unknown> = {
  id?: number | string;
  confKey: RecovConfKey | string;
  confName?: string;
  confValue?: T | string;
  version?: number;
  remark?: string;
  createTime?: string;
  updateTime?: string;
};

export type UpdateRecovConfDTO<T = unknown> = {
  confValue: T;
  version: number;
  remark?: string;
};

export type FlowRuntimeControl = {
  flowEnabled: boolean;
  disabledRequeueSeconds: number;
};

export type FlowSchedulerControl = {
  enabled: boolean;
  dispatchBatchSize: number;
  dispatchIntervalSeconds: number;
};

export type FlowOutboxControl = {
  triggerDispatchEnabled: boolean;
  callbackDispatchEnabled: boolean;
  dispatchBatchSize: number;
  dispatchIntervalSeconds: number;
};

export type NodeRuntimeControl = {
  enabled: boolean;
  maxInFlight: number;
  ratePerMinute: number;
  busyRetrySeconds: number;
  permitTtlSeconds: number;
};

export type FlowNodeControl = {
  default: NodeRuntimeControl;
  nodes: Record<string, NodeRuntimeControl>;
};

export const getRecovConf = <T>(confKey: RecovConfKey) =>
  ruoyiRequest<RecovConfVO<T>>(
    `/system/recov/conf/${encodeURIComponent(confKey)}`,
    {
      method: 'get',
      skipErrorHandler: true,
    },
  );

export const updateRecovConf = <T>(
  confKey: RecovConfKey,
  data: UpdateRecovConfDTO<T>,
) =>
  ruoyiRequest<RecovConfVO<T>>(
    `/system/recov/conf/${encodeURIComponent(confKey)}`,
    {
      method: 'put',
      data,
      skipErrorHandler: true,
    },
  );
