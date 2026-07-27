import { request } from '@umijs/max';

const AI_CALL_RECORDS_PREFIX = '/ai-call-agent-api/ai-call/records';

type AiCallResponse<T> = {
  data?: T;
  rows?: T extends Array<infer Row> ? Row[] : unknown[];
  total?: number;
};

export type AiCallRecord = {
  id: string;
  callId: string;
  taskId?: string | null;
  targetId?: string | null;
  taskName?: string | null;
  customerName?: string | null;
  phoneNumber?: string | null;
  attemptNo?: number | null;
  callResult?: string | null;
  aiOutcome?: string | null;
  summary?: string | null;
  recordingPlayUrl?: string | null;
  businessType?: string | null;
  businessId?: string | null;
  sceneCode?: string | null;
  promptSourceKey?: string | null;
  entryType: string;
  roomName?: string | null;
  participantIdentity?: string | null;
  status: string;
  endReason?: string | null;
  failureStage?: string | null;
  failureMessage?: string | null;
  startedAt: string;
  answeredAt?: string | null;
  endedAt?: string | null;
  durationMs?: number | null;
};

export type AiCallRecordEvent = {
  id: string;
  eventId: string;
  callId: string;
  eventType: string;
  source: string;
  eventTime: string;
  payload: Record<string, unknown>;
};

export type AiCallRecordDetail = {
  record: AiCallRecord;
  lastEvent?: AiCallRecordEvent | null;
  executionConfig?: {
    promptProfileId?: string | null;
    promptName?: string | null;
    sceneCode?: string | null;
    promptText?: string | null;
    openingMessage?: string | null;
    voice?: string | null;
    voiceName?: string | null;
    ruleName?: string | null;
  } | null;
};

export type AiCallRecordingTrack = {
  id: string;
  trackRole: string;
  participantIdentity: string;
  status: string;
  playUrl?: string | null;
  durationMs?: number | null;
  failureMessage?: string | null;
};

export type AiCallRecording = {
  id: string;
  callId: string;
  status: string;
  playUrl?: string | null;
  durationMs?: number | null;
  failureStage?: string | null;
  failureMessage?: string | null;
  tracks?: AiCallRecordingTrack[];
};

export type AiCallDialogueSegment = {
  id?: string | null;
  callId: string;
  segmentNo: number;
  speakerType: string;
  speakerIdentity?: string | null;
  text: string;
  segmentStatus: string;
  startedAt?: string | null;
};

export type AiCallSemanticAnalysis = {
  id?: string | null;
  callId: string;
  sceneCode?: string | null;
  analysisSceneCode: string;
  analysisStatus: string;
  analysisResult?: Record<string, unknown> | null;
  analysisError?: string | null;
  analysisRetryCount: number;
  analysisStartedAt?: string | null;
  analysisFinishedAt?: string | null;
};

export type AiCallHandoff = {
  id: string;
  handoffId: string;
  callId: string;
  status: string;
  requestSource?: string | null;
  requestReason?: string | null;
  requestMessage?: string | null;
  humanAgentIdentity?: string | null;
  requestedAt: string;
  acceptedAt?: string | null;
  connectedAt?: string | null;
  endedAt?: string | null;
  failureMessage?: string | null;
};

export type AiCallRecordPage<T> = {
  rows: T[];
  total: number;
};

export type AiCallRecordQuery = {
  callId?: string;
  taskId?: string;
  targetId?: string;
  phoneNumber?: string;
  customerName?: string;
  callResult?: string;
  businessType?: string;
  businessId?: string;
  status?: string;
  entryType?: string;
  startedAtBegin?: string;
  startedAtEnd?: string;
  pageNum?: number;
  pageSize?: number;
};

const unwrapData = <T>(response: AiCallResponse<T> | T): T => {
  if (
    response &&
    typeof response === 'object' &&
    Object.hasOwn(response, 'data')
  ) {
    return (response as AiCallResponse<T>).data as T;
  }
  return response as T;
};

const unwrapPage = <T>(
  response: AiCallResponse<AiCallRecordPage<T>> | AiCallRecordPage<T>,
): AiCallRecordPage<T> => {
  const payload = unwrapData(response);
  if (payload && Array.isArray(payload.rows)) {
    return { rows: payload.rows, total: Number(payload.total) || 0 };
  }
  const direct = response as AiCallResponse<T[]>;
  return {
    rows: Array.isArray(direct.rows) ? (direct.rows as T[]) : [],
    total: Number(direct.total) || 0,
  };
};

const recordPath = (callId: string, suffix = '') =>
  `${AI_CALL_RECORDS_PREFIX}/${encodeURIComponent(callId)}${suffix}`;

export const listAiCallRecords = async (params: AiCallRecordQuery) => {
  const response = await request<
    AiCallResponse<AiCallRecordPage<AiCallRecord>>
  >(AI_CALL_RECORDS_PREFIX, {
    method: 'get',
    params,
  });
  return unwrapPage(response);
};

export const getAiCallRecordDetail = async (callId: string) => {
  const response = await request<AiCallResponse<AiCallRecordDetail>>(
    recordPath(callId),
    { method: 'get' },
  );
  return unwrapData(response);
};

export const getAiCallRecordRecording = async (callId: string) => {
  const response = await request<AiCallResponse<AiCallRecording | null>>(
    recordPath(callId, '/recording'),
    { method: 'get' },
  );
  return unwrapData(response);
};

export const getAiCallRecordDialogue = async (callId: string) => {
  const response = await request<
    AiCallResponse<AiCallRecordPage<AiCallDialogueSegment>>
  >(recordPath(callId, '/dialogue-segments'), {
    method: 'get',
    params: { limit: 1000 },
  });
  return unwrapPage(response);
};

export const getAiCallRecordSemanticAnalysis = async (callId: string) => {
  const response = await request<AiCallResponse<AiCallSemanticAnalysis | null>>(
    recordPath(callId, '/semantic-analysis'),
    { method: 'get' },
  );
  return unwrapData(response);
};

export const getAiCallRecordHandoffs = async (callId: string) => {
  const response = await request<
    AiCallResponse<AiCallRecordPage<AiCallHandoff>>
  >(recordPath(callId, '/handoffs'), { method: 'get' });
  return unwrapPage(response);
};

export const getAiCallRecordEvents = async (callId: string) => {
  const response = await request<
    AiCallResponse<AiCallRecordPage<AiCallRecordEvent>>
  >(recordPath(callId, '/events'), {
    method: 'get',
    params: { limit: 200 },
  });
  return unwrapPage(response);
};
