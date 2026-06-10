import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type AiCallDashboard = {
  totalCallCount?: number | string;
  totalCallDurationSeconds?: number | string;
  stageRepaymentAmount?: number | string;
  semanticFeedbackCount?: number | string;
  positiveFeedbackCount?: number | string;
  negativeFeedbackCount?: number | string;
  neutralFeedbackCount?: number | string;
  activeCallCount?: number | string;
  todayCompletedCount?: number | string;
  todayCallDurationSeconds?: number | string;
  semanticPersonaTotal?: number | string;
  semanticPersonaDistribution?: AiCallSemanticPersonaDistribution[];
};

export type AiCallSemanticPersonaDistribution = {
  personaId?: number | string;
  personaName?: string;
  count?: number | string;
  percentage?: number | string;
};

export type AiCallTimeHint = {
  timeText?: string;
  timeValue?: string;
  originalTexts?: string[];
};

export type AiCallTranscript = {
  version?: string;
  turns?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type AiCallHandoffState =
  | 'none'
  | 'waiting_agent'
  | 'agent_claimed'
  | 'human_active'
  | 'completed'
  | 'expired'
  | 'failed';

export type AiCallAgentWebRtcConfig = {
  wsUrl?: string;
  sipUri?: string;
  password?: string;
  displayName?: string;
  agentExtension?: string;
  viaTransport?: string;
  iceServers?: RTCIceServer[];
};

export type AiCallHandoffClaimRequest = {
  callRecordId?: number | string;
  gatewayCallId: string;
  agentExtension: string;
  timeoutSeconds?: number;
};

export type AiCallHandoffClaimResult = {
  callRecordId?: number | string;
  gatewayCallId?: string;
  handoffState?: AiCallHandoffState;
  agentExtension?: string;
  claimedBy?: string;
  message?: string;
};

export type AiCallAnalysis = {
  summary?: string;
  feedbackType?: string;
  keyPoints?: string[];
  tags?: string[];
  timeHint?: AiCallTimeHint;
};

export type AiCallRecord = {
  callRecordId?: number | string;
  debtId?: number | string;
  gatewayCallId?: string;
  recordingOssId?: number | string;
  recordingUrl?: string;
  recordingOssUrl?: string;
  sysOssUrl?: string;
  identityName?: string;
  callerName?: string;
  debtNumber?: number | string;
  debtorName?: string;
  debtorPhone?: string;
  organization?: string;
  callSummary?: string;
  status?: string;
  analysisStatus?: string;
  analysisError?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationSeconds?: number | string;
  summary?: string;
  statusLabel?: string;
  failureReason?: string;
  errorMessage?: string | null;
  hangupCause?: string;
  sipStatus?: number | string;
  sipReason?: string;
  feedbackType?: string;
  keyPoints?: string[];
  tags?: string[];
  timeHint?: AiCallTimeHint;
  handoffState?: AiCallHandoffState;
  handoffCanClaim?: boolean;
  handoffLastUtterance?: string;
  handoffRequestedAt?: string;
  handoffExpiresAt?: string;
  handoffClaimedBy?: string;
  handoffAgentExtension?: string;
  handoffError?: string;
};

export type GatewayCallHandoff = {
  state?: string;
  requested_at_ms?: number | string;
  expires_at_ms?: number | string;
  can_claim?: boolean;
  last_utterance?: string;
  claimed_by?: string;
  agent_extension?: string;
  error?: string;
};

export type GatewayCallRecord = {
  call_id?: string;
  external_call_id?: string;
  status?: string;
  phase?: string;
  completed_at_ms?: number | string;
  talk_duration_ms?: number | string;
  handoff?: GatewayCallHandoff | null;
};

export type GatewayCallListResponse = {
  calls?: GatewayCallRecord[];
};

export type AiCallDebtFeedback = {
  debtId?: number | string;
  debtNumber?: number | string;
  debtorName?: string;
  debtorPhone?: string;
  organization?: string;
  callSummary?: string;
  latestCallRecordId?: number | string;
  latestIdentityName?: string;
  latestCallerName?: string;
  latestStatus?: string;
  latestAnalysisStatus?: string;
  latestAnalysisError?: string | null;
  latestStartedAt?: string | null;
  latestFinishedAt?: string | null;
  latestDurationSeconds?: number | string;
  latestSummary?: string;
  latestFeedbackType?: string;
  latestKeyPoints?: string[];
  latestTags?: string[];
  latestTimeHint?: AiCallTimeHint;
  feedbackRecordCount?: number | string;
};

export type AiCallRecordDetail = AiCallRecord & {
  analysis?: AiCallAnalysis;
  transcript?: AiCallTranscript | Record<string, unknown>;
};

export type AiCallTimelineRecord = {
  callRecordId?: number | string;
  recordingOssId?: number | string;
  identityName?: string;
  callerName?: string;
  status?: string;
  statusLabel?: string;
  analysisStatus?: string;
  analysisStatusLabel?: string;
  analysisError?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationSeconds?: number | string;
  summary?: string;
  feedbackType?: string;
  keyPoints?: string[];
  tags?: string[];
  timeHint?: AiCallTimeHint;
  transcript?: AiCallTranscript | Record<string, unknown>;
};

export type AiCallDebtTimeline = {
  debtId?: number | string;
  debtorName?: string;
  debtorPhone?: string;
  organization?: string;
  callSummary?: string;
  records?: AiCallTimelineRecord[];
};

export type AiCallRecordPageQuery = {
  pageNum?: number;
  pageSize?: number;
  debtorName?: string;
  organization?: string;
  status?: string;
  analysisStatus?: string;
  feedbackType?: string;
  dateStart?: string;
  dateEnd?: string;
};

export type AiCallDebtFeedbackPageQuery = AiCallRecordPageQuery;

const BASE = '/system/recov/ai-call';

export const getAiCallDashboard = () =>
  ruoyiRequest<AiCallDashboard>(`${BASE}/dashboard`, {
    method: 'get',
  });

export const getAiCallRecordPage = (params: AiCallRecordPageQuery) =>
  ruoyiRequest<AiCallRecord>(`${BASE}/records/page`, {
    method: 'get',
    params,
  });

export const claimAiCallHandoff = (data: AiCallHandoffClaimRequest) =>
  ruoyiRequest<AiCallHandoffClaimResult>(`${BASE}/handoff/claim`, {
    method: 'post',
    data,
  });

export const getAiCallAgentWebRtcConfig = () =>
  ruoyiRequest<AiCallAgentWebRtcConfig>(`${BASE}/agent/webrtc-config`, {
    method: 'get',
    skipErrorHandler: true,
  });

export const getGatewayCalls = async () => {
  const response = await fetch('/voice-api/calls', {
    method: 'get',
    credentials: 'same-origin',
  });
  if (!response.ok) {
    throw new Error(`gateway calls request failed: ${response.status}`);
  }
  return (await response.json()) as GatewayCallListResponse;
};

export const getAiCallDebtFeedbackPage = (
  params: AiCallDebtFeedbackPageQuery,
) =>
  ruoyiRequest<AiCallDebtFeedback>(`${BASE}/feedback/debts/page`, {
    method: 'get',
    params,
  });

export const getAiCallRecordDetail = (callRecordId: number | string) =>
  ruoyiRequest<AiCallRecordDetail>(
    `${BASE}/records/${encodeURIComponent(String(callRecordId))}`,
    {
      method: 'get',
    },
  );

export const getAiCallDebtTimeline = (debtId: number | string) =>
  ruoyiRequest<AiCallDebtTimeline>(
    `${BASE}/debts/${encodeURIComponent(String(debtId))}/timeline`,
    {
      method: 'get',
    },
  );
