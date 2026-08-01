import { ruoyiRequest } from '@/adapters/ruoyi/request';
import type { RuoyiResponse } from '@/adapters/ruoyi/response';

const AI_CALL_AGENT_BASE_API = '/ai-call-agent-api';
const RUNTIME_START_PATH = '/ai-call/runtime/start-call';
const RUNTIME_BOOTSTRAP_PATH = (callId: string) =>
  `/ai-call/runtime/calls/${encodeURIComponent(callId)}/bootstrap`;

export type AiCallRuntimeEntry = 'web' | 'preview' | 'direct_sip';

export type AiCallRuntimeStartRequest = {
  entryType: AiCallRuntimeEntry;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  businessType?: string;
  businessId?: string;
  sceneCode?: string;
  promptSourceKey?: string;
  allocationDeadlineAt?: string;
  sensitivePayloadCiphertext?: string;
  payloadKeyVersion?: string;
};

export type AiCallRuntimeStartAccepted = {
  commandId: string;
  callId: string;
  commandSeq: string;
  commandType: 'START_CALL' | string;
  status: string;
};

export type AiCallRuntimeBootstrap = {
  callId: string;
  entryType: AiCallRuntimeEntry | string;
  phase: 'starting' | 'ready' | 'ending' | 'terminal';
  roomName: string;
  participantIdentity?: string | null;
  runtimeFencingToken: number;
  agentMediaReadyAt?: string | null;
  terminalRequestedAt?: string | null;
  tokenAvailable: boolean;
};

const unwrapData = <T>(response: RuoyiResponse<T> | T): T => {
  if (!response || typeof response !== 'object' || !('code' in response)) {
    throw new Error('接口响应缺少 code');
  }
  const envelope = response as RuoyiResponse<T>;
  if (envelope.data === undefined) {
    throw new Error('接口响应缺少 data');
  }
  return envelope.data;
};

export const createAiCallRuntimeStartCall = async (
  data: AiCallRuntimeStartRequest,
): Promise<AiCallRuntimeStartAccepted> =>
  unwrapData(
    await ruoyiRequest<AiCallRuntimeStartAccepted>(RUNTIME_START_PATH, {
      baseApi: AI_CALL_AGENT_BASE_API,
      method: 'post',
      data,
      repeatSubmit: false,
    }),
  );

export const getAiCallRuntimeBootstrap = async (
  callId: string,
): Promise<AiCallRuntimeBootstrap> =>
  unwrapData(
    await ruoyiRequest<AiCallRuntimeBootstrap>(RUNTIME_BOOTSTRAP_PATH(callId), {
      baseApi: AI_CALL_AGENT_BASE_API,
      method: 'get',
    }),
  );
