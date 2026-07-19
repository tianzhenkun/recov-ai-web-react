import { formatAmount, toNumber } from '@/modules/recov/pages/settle/_shared';
import type { ImportPipelineStatus } from '@/modules/recov/services/datelligence';
import type {
  AiCallDashboard,
  AiCallDebtFeedback,
  AiCallDebtTimeline,
  AiCallRecord,
  AiCallRecordDetail,
  AiCallTimelineRecord,
} from './service';

export const PAGE_TITLE = '数字员工智能外呼';

export const DEFAULT_FEEDBACK_PAGE_SIZE = 5;

export type OutboundStartAvailabilityInput = {
  outboundStarting?: boolean;
  outboundFlowProcessing?: boolean;
  recordTotal?: number;
  isImportWorkflowProcessing?: boolean;
  pipelineStatus?: ImportPipelineStatus | '' | null;
  hasBlockingImportFailure?: boolean;
};

export const resolveOutboundStartDisabledReason = ({
  outboundStarting = false,
  outboundFlowProcessing = false,
  recordTotal = 0,
  isImportWorkflowProcessing = false,
  pipelineStatus = '',
  hasBlockingImportFailure = false,
}: OutboundStartAvailabilityInput) => {
  if (outboundStarting) return '催收流程正在发起，请稍后';
  if (outboundFlowProcessing) return '催收流程批次处理中，请稍后';
  if (recordTotal === 0) return '暂无债务记录，无法开启外呼';
  if (isImportWorkflowProcessing) {
    return '当前导入任务处理中，请等待完成后再开启外呼';
  }
  if (pipelineStatus === 'partial_failed') {
    return '后续处理存在失败，请重试或忽略后再开启外呼';
  }
  if (hasBlockingImportFailure) {
    return '导入链路存在失败，请处理后再开启外呼';
  }
  return '';
};

export type OutboundStartNoticeInput = {
  pipelineStatus?: ImportPipelineStatus | '' | null;
  hasNonBlockingImportFailure?: boolean;
};

export const resolveOutboundStartNotice = ({
  pipelineStatus = '',
  hasNonBlockingImportFailure = false,
}: OutboundStartNoticeInput) => {
  if (pipelineStatus === 'failed' || hasNonBlockingImportFailure) {
    return '最近一次导入失败，本次仅处理已入库且未开始的债务。';
  }
  return '';
};

export type MetricFormat = 'currency' | 'count' | 'duration';

export type OutboundMetric = {
  key: 'totalCalls' | 'totalTalkHours' | 'currentRepayment' | 'feedbackCount';
  label: string;
  value: number;
  format: MetricFormat;
  unit?: string;
};

export type LiveMonitorStats = {
  ongoingCalls: number;
  finishedToday: number;
  totalTalkSecondsToday: number;
};

export type DigitalIdentity = {
  key: 'staff' | 'customerService' | 'legal' | 'lawyer';
  label: string;
  description: string;
};

export type FeedbackSentiment = 'positive' | 'neutral' | 'negative';

export type FeedbackItem = {
  id: string;
  callRecordId: string;
  debtId: string;
  ownerName: string;
  project: string;
  summary: string;
  sentiment: FeedbackSentiment;
  feedbackType: string;
  semanticTags: string[];
  startedAt: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  feedbackRecordCount: number;
};

export type CommunicationLog = {
  id: string;
  recordingOssId?: string;
  date: string;
  channel: string;
  status?: string;
  statusLabel: string;
  analysisStatus?: string;
  analysisStatusLabel?: string;
  analysisError?: string;
  hasSemanticAnalysis: boolean;
  sentiment: '正向' | '中性' | '负向' | '未知';
  summary: string;
  keywords: string[];
  durationSeconds: number;
  transcript?: Record<string, unknown>;
};

export type OwnerCommunicationDetail = {
  ownerName: string;
  debtorPhone?: string;
  organization?: string;
  semanticSummary: string;
  logs: CommunicationLog[];
};

export type OutboundOverview = {
  metrics: OutboundMetric[];
  liveStats: LiveMonitorStats;
};

export const emptyDashboard: AiCallDashboard = {
  totalCallCount: 0,
  totalCallDurationSeconds: 0,
  stageRepaymentAmount: '0.00',
  semanticFeedbackCount: 0,
  positiveFeedbackCount: 0,
  negativeFeedbackCount: 0,
  neutralFeedbackCount: 0,
  activeCallCount: 0,
  todayCompletedCount: 0,
  todayCallDurationSeconds: 0,
  semanticPersonaTotal: 0,
  semanticPersonaDistribution: [],
};

const numberFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
});

export const formatCount = (value: unknown): string =>
  numberFormatter.format(toNumber(value));

export const formatCompactCount = (value: unknown): string => {
  const amount = toNumber(value);
  const absAmount = Math.abs(amount);

  if (absAmount >= 100_000_000) {
    return `${compactFormatter.format(amount / 100_000_000)}亿`;
  }
  if (absAmount >= 10_000) {
    return `${compactFormatter.format(amount / 10_000)}万`;
  }
  return numberFormatter.format(amount);
};

export const formatDuration = (seconds: unknown): string => {
  const totalSeconds = Math.max(0, Math.round(toNumber(seconds)));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const restSeconds = totalSeconds % 60;

  if (hours > 0) {
    const parts = [`${hours} 小时`];
    if (minutes > 0) parts.push(`${minutes} 分`);
    if (restSeconds > 0) parts.push(`${restSeconds} 秒`);
    return parts.join(' ');
  }

  if (minutes <= 0) return `${restSeconds} 秒`;
  if (restSeconds <= 0) return `${minutes} 分钟`;
  return `${minutes} 分 ${restSeconds} 秒`;
};

const formatCompactCurrencyAmount = (value: unknown): string => {
  const amount = toNumber(value);
  const absAmount = Math.abs(amount);

  if (absAmount >= 100_000_000) {
    return `${compactFormatter.format(amount / 100_000_000)}亿`;
  }
  if (absAmount >= 10_000) {
    return `${compactFormatter.format(amount / 10_000)}万`;
  }
  return formatAmount(amount);
};

export type MetricDisplay = {
  primary: string;
  unit?: string;
  tooltip?: string;
};

export const buildMetricDisplay = (metric: OutboundMetric): MetricDisplay => {
  if (metric.format === 'duration') {
    const primary = formatDuration(metric.value);
    const full = `${formatCount(Math.round(toNumber(metric.value)))} 秒`;
    return {
      primary,
      tooltip: primary === full ? undefined : full,
    };
  }

  if (metric.format === 'currency') {
    const compact = formatCompactCurrencyAmount(metric.value);
    const full = formatAmount(metric.value);
    return {
      primary: compact,
      unit: metric.unit ?? '元',
      tooltip: compact === full ? undefined : `${full}元`,
    };
  }

  const compact = formatCompactCount(metric.value);
  const full = formatCount(metric.value);
  return {
    primary: compact,
    unit: metric.unit,
    tooltip: compact === full ? undefined : `${full}${metric.unit ?? ''}`,
  };
};

export const buildOutboundOverview = (
  dashboard?: AiCallDashboard | null,
): OutboundOverview => {
  const data = dashboard || emptyDashboard;
  return {
    metrics: [
      {
        key: 'totalCalls',
        label: '累计 AI 外呼总数',
        value: toNumber(data.totalCallCount),
        format: 'count',
        unit: '次',
      },
      {
        key: 'totalTalkHours',
        label: '累计通话时长',
        value: toNumber(data.totalCallDurationSeconds),
        format: 'duration',
      },
      {
        key: 'currentRepayment',
        label: '本阶段回款金额',
        value: toNumber(data.stageRepaymentAmount),
        format: 'currency',
        unit: '元',
      },
      {
        key: 'feedbackCount',
        label: 'AI 语义反馈数量',
        value: toNumber(data.semanticFeedbackCount),
        format: 'count',
        unit: '条',
      },
    ],
    liveStats: {
      ongoingCalls: toNumber(data.activeCallCount),
      finishedToday: toNumber(data.todayCompletedCount),
      totalTalkSecondsToday: toNumber(data.todayCallDurationSeconds),
    },
  };
};

export const getFeedbackSentiment = (feedbackType?: string) => {
  if (feedbackType === '正向') return 'positive';
  if (feedbackType === '负向') return 'negative';
  return 'neutral';
};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

export const toFeedbackItem = (record: AiCallRecord): FeedbackItem => {
  const callRecordId = firstText(record.callRecordId);
  const tags = Array.isArray(record.tags) ? record.tags.filter(Boolean) : [];
  const keyPoints = Array.isArray(record.keyPoints)
    ? record.keyPoints.filter(Boolean)
    : [];

  return {
    id: callRecordId || firstText(record.debtId, record.startedAt),
    callRecordId,
    debtId: firstText(record.debtId),
    ownerName: firstText(record.debtorName, '未知业主'),
    project: firstText(record.organization, '未归属项目'),
    summary: firstText(record.summary, record.analysisError, '无语义摘要'),
    sentiment: getFeedbackSentiment(record.feedbackType),
    feedbackType: firstText(record.feedbackType, '中性'),
    semanticTags: tags.length > 0 ? tags : keyPoints,
    startedAt: firstText(record.startedAt),
    startTime: firstText(record.startedAt),
    endTime: firstText(record.finishedAt),
    durationSeconds: toNumber(record.durationSeconds),
    feedbackRecordCount: 1,
  };
};

export const toDebtFeedbackItem = (
  record: AiCallDebtFeedback,
): FeedbackItem => {
  const debtId = firstText(record.debtId);
  const callRecordId = firstText(record.latestCallRecordId);
  const tags = Array.isArray(record.latestTags)
    ? record.latestTags.filter(Boolean)
    : [];
  const keyPoints = Array.isArray(record.latestKeyPoints)
    ? record.latestKeyPoints.filter(Boolean)
    : [];

  return {
    id: debtId || callRecordId || firstText(record.latestFinishedAt),
    callRecordId,
    debtId,
    ownerName: firstText(record.debtorName, '未知业主'),
    project: firstText(record.organization, '未归属项目'),
    summary: firstText(
      record.callSummary,
      record.latestSummary,
      record.latestAnalysisError,
      '无语义摘要',
    ),
    sentiment: getFeedbackSentiment(record.latestFeedbackType),
    feedbackType: firstText(record.latestFeedbackType, '中性'),
    semanticTags: tags.length > 0 ? tags : keyPoints,
    startedAt: firstText(record.latestFinishedAt, record.latestStartedAt),
    startTime: firstText(record.latestStartedAt),
    endTime: firstText(record.latestFinishedAt),
    durationSeconds: toNumber(record.latestDurationSeconds),
    feedbackRecordCount: toNumber(record.feedbackRecordCount),
  };
};

export const FIXED_DIGITAL_IDENTITIES: DigitalIdentity[] = [
  {
    key: 'staff',
    label: '项目员工',
    description: '亲切自然，侧重服务满意度调查、物业关怀与日常提醒。',
  },
  {
    key: 'customerService',
    label: '企业客服',
    description: '温和礼貌，侧重提醒与沟通。',
  },
  {
    key: 'legal',
    label: '企业法务',
    description: '专业严谨，侧重企业管理流程要求与告知缴费。',
  },
  {
    key: 'lawyer',
    label: '律师',
    description:
      '第三方口吻与视角，侧重催缴沟通与法律后果告知，下一步可能措施。',
  },
];

const getRecordSummary = (
  record: AiCallTimelineRecord | AiCallRecordDetail,
): string => {
  if (!hasSuccessfulAnalysis(record)) {
    return getStatusSummary(record);
  }
  if ('analysis' in record && record.analysis?.summary) {
    return record.analysis.summary;
  }
  return firstText(
    record.summary,
    'analysisError' in record ? record.analysisError : undefined,
    '无语义摘要',
  );
};

const getRecordFeedbackType = (
  record: AiCallTimelineRecord | AiCallRecordDetail,
): '正向' | '中性' | '负向' | '未知' => {
  if (!hasSuccessfulAnalysis(record)) {
    return '未知';
  }
  const feedbackType =
    'analysis' in record && record.analysis?.feedbackType
      ? record.analysis.feedbackType
      : record.feedbackType;
  if (
    feedbackType === '正向' ||
    feedbackType === '中性' ||
    feedbackType === '负向'
  ) {
    return feedbackType;
  }
  return '未知';
};

const getRecordKeywords = (
  record: AiCallTimelineRecord | AiCallRecordDetail,
): string[] => {
  if (!hasSuccessfulAnalysis(record)) {
    return [];
  }
  const analysisTags =
    'analysis' in record && Array.isArray(record.analysis?.tags)
      ? record.analysis.tags
      : [];
  const tags = Array.isArray(record.tags) ? record.tags : [];
  const keyPoints = Array.isArray(record.keyPoints) ? record.keyPoints : [];
  return [...analysisTags, ...tags, ...keyPoints].filter(Boolean).slice(0, 8);
};

const hasTranscriptContent = (
  transcript?: AiCallTimelineRecord['transcript'],
) => {
  if (!transcript || !Array.isArray(transcript.turns)) return false;
  return transcript.turns.some((turn) => {
    if (!turn || typeof turn !== 'object') return false;
    const source = turn as Record<string, unknown>;
    return Boolean(firstText(source.text, source.content, source.message));
  });
};

const isMeaningfulCommunicationRecord = (
  record: AiCallTimelineRecord | AiCallRecordDetail,
) =>
  Boolean(
    firstText(record.status, record.finishedAt, record.startedAt) ||
      toNumber(record.durationSeconds) > 0 ||
      firstText(record.summary) ||
      ('analysisError' in record ? firstText(record.analysisError) : '') ||
      getRecordKeywords(record).length > 0 ||
      hasTranscriptContent(record.transcript),
  );

const statusLabels: Record<string, string> = {
  '0': '未开始',
  '1': '进行中',
  '2': '外呼失败',
  '3': '未接听',
  '4': '转写完成',
};

const analysisStatusLabels: Record<string, string> = {
  '0': '待分析',
  '1': '分析中',
  '2': '分析成功',
  '3': '分析失败',
  '4': '无有效用户输入',
};

const getRecordStatus = (record: AiCallTimelineRecord | AiCallRecordDetail) =>
  firstText(record.status);

const getRecordAnalysisStatus = (
  record: AiCallTimelineRecord | AiCallRecordDetail,
) => firstText(record.analysisStatus);

const getRecordStatusLabel = (
  record: AiCallTimelineRecord | AiCallRecordDetail,
) =>
  firstText(
    'statusLabel' in record ? record.statusLabel : undefined,
    statusLabels[getRecordStatus(record)],
    '未知状态',
  );

const getRecordAnalysisStatusLabel = (
  record: AiCallTimelineRecord | AiCallRecordDetail,
) =>
  firstText(
    'analysisStatusLabel' in record ? record.analysisStatusLabel : undefined,
    analysisStatusLabels[getRecordAnalysisStatus(record)],
    '未分析',
  );

const hasSuccessfulAnalysis = (
  record: AiCallTimelineRecord | AiCallRecordDetail,
) => {
  const analysisStatus = getRecordAnalysisStatus(record);
  if (analysisStatus !== '2') return false;
  if ('analysis' in record) {
    return Boolean(
      firstText(record.analysis?.summary, record.analysis?.feedbackType) ||
        (record.analysis?.tags || []).length > 0 ||
        (record.analysis?.keyPoints || []).length > 0,
    );
  }
  return Boolean(
    firstText(record.summary, record.feedbackType) ||
      (record.tags || []).length > 0 ||
      (record.keyPoints || []).length > 0,
  );
};

const getStatusSummary = (
  record: AiCallTimelineRecord | AiCallRecordDetail,
) => {
  const status = getRecordStatus(record);
  const analysisStatus = getRecordAnalysisStatus(record);
  const analysisError = firstText(
    'analysisError' in record ? record.analysisError : undefined,
  );

  if (status === '1') {
    return '外呼进行中，等待通话结束后生成结果。';
  }
  if (status === '2') {
    return '外呼失败，未产生有效通话内容。';
  }
  if (status === '3') {
    return '用户未接听，未产生有效通话内容。';
  }
  if (status === '4' && analysisStatus === '4') {
    return firstText(
      analysisError,
      '通话已接通，但未获取到用户有效话术，无需进行语义分析。',
    );
  }
  if (status === '4' && analysisStatus === '3') {
    return firstText(
      analysisError ? `语义分析失败：${analysisError}` : '',
      '语义分析失败，暂未生成摘要。',
    );
  }
  if (status === '4' && analysisStatus === '1') {
    return '通话转写已完成，语义分析处理中。';
  }
  if (status === '4') {
    return '通话转写已完成，等待语义分析结果。';
  }
  if (hasTranscriptContent(record.transcript)) {
    return '本次通话已有转写，语义分析结果尚未返回。';
  }
  if (toNumber(record.durationSeconds) > 0) {
    return '本次外呼已产生通话时长，语义分析结果尚未返回。';
  }
  return firstText(analysisError, '暂无语义摘要。');
};

const toCommunicationLog = (
  record: AiCallTimelineRecord | AiCallRecordDetail,
): CommunicationLog => ({
  id: firstText(record.callRecordId, record.finishedAt, record.startedAt),
  recordingOssId: firstText(record.recordingOssId),
  date: firstText(record.finishedAt, record.startedAt),
  channel: 'AI 智能外呼',
  status: getRecordStatus(record),
  statusLabel: getRecordStatusLabel(record),
  analysisStatus: getRecordAnalysisStatus(record),
  analysisStatusLabel: getRecordAnalysisStatusLabel(record),
  analysisError: firstText(
    'analysisError' in record ? record.analysisError : undefined,
  ),
  hasSemanticAnalysis: hasSuccessfulAnalysis(record),
  sentiment: getRecordFeedbackType(record),
  summary: getRecordSummary(record),
  keywords: getRecordKeywords(record),
  durationSeconds: toNumber(record.durationSeconds),
  transcript: record.transcript,
});

export const buildCommunicationDetail = (
  timeline?: AiCallDebtTimeline | null,
  detail?: AiCallRecordDetail | null,
  semanticSummary?: string,
): OwnerCommunicationDetail => {
  const timelineRecords = Array.isArray(timeline?.records)
    ? timeline.records.filter(isMeaningfulCommunicationRecord)
    : [];
  const logs =
    timelineRecords.length > 0
      ? timelineRecords.map(toCommunicationLog)
      : detail
        ? [toCommunicationLog(detail)]
        : [];
  const currentLog = logs[0];
  const semanticLog = logs.find((log) => log.hasSemanticAnalysis);

  return {
    ownerName: firstText(timeline?.debtorName, detail?.debtorName, '未知业主'),
    debtorPhone: firstText(timeline?.debtorPhone, detail?.debtorPhone),
    organization: firstText(timeline?.organization, detail?.organization),
    semanticSummary: firstText(
      timeline?.callSummary,
      detail?.callSummary,
      detail?.analysis?.summary,
      detail?.summary,
      semanticSummary,
      semanticLog?.summary,
      currentLog?.summary,
      '暂无成功语义分析',
    ),
    logs,
  };
};
