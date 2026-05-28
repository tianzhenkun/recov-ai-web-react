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
  feedbackType?: string;
  keyPoints?: string[];
  tags?: string[];
  timeHint?: AiCallTimeHint;
};

export type AiCallDebtFeedback = {
  debtId?: number | string;
  debtNumber?: number | string;
  debtorName?: string;
  debtorPhone?: string;
  organization?: string;
  callSummary?: string;
  latestCallRecordId?: number | string;
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
