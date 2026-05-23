import { formatAmount, toNumber } from '@/pages/recov/settle/_shared';
import type {
  AiCallDashboard,
  AiCallDebtTimeline,
  AiCallRecord,
  AiCallRecordDetail,
  AiCallTimelineRecord,
} from './service';

export const PAGE_TITLE = '数字员工智能外呼';

export const DEFAULT_FEEDBACK_PAGE_SIZE = 6;

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
  totalTalkMinutesToday: number;
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
};

export type CommunicationLog = {
  id: string;
  date: string;
  channel: string;
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
};

const numberFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
});

const secondsToHours = (value: unknown) => toNumber(value) / 3600;

const secondsToMinutes = (value: unknown) => toNumber(value) / 60;

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
  const minutes = Math.floor(totalSeconds / 60);
  const restSeconds = totalSeconds % 60;
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
        value: secondsToHours(data.totalCallDurationSeconds),
        format: 'duration',
        unit: '小时',
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
      totalTalkMinutesToday: secondsToMinutes(data.todayCallDurationSeconds),
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
  const analysisTags =
    'analysis' in record && Array.isArray(record.analysis?.tags)
      ? record.analysis.tags
      : [];
  const tags = Array.isArray(record.tags) ? record.tags : [];
  const keyPoints = Array.isArray(record.keyPoints) ? record.keyPoints : [];
  return [...analysisTags, ...tags, ...keyPoints].filter(Boolean).slice(0, 8);
};

const toCommunicationLog = (
  record: AiCallTimelineRecord | AiCallRecordDetail,
): CommunicationLog => ({
  id: firstText(record.callRecordId, record.finishedAt, record.startedAt),
  date: firstText(record.finishedAt, record.startedAt),
  channel: 'AI 智能外呼',
  sentiment: getRecordFeedbackType(record),
  summary: getRecordSummary(record),
  keywords: getRecordKeywords(record),
  durationSeconds: toNumber(record.durationSeconds),
  transcript: record.transcript,
});

export const buildCommunicationDetail = (
  timeline?: AiCallDebtTimeline | null,
  detail?: AiCallRecordDetail | null,
): OwnerCommunicationDetail => {
  const logs =
    Array.isArray(timeline?.records) && timeline.records.length > 0
      ? timeline.records.map(toCommunicationLog)
      : detail
        ? [toCommunicationLog(detail)]
        : [];
  const currentLog = logs[0];

  return {
    ownerName: firstText(timeline?.debtorName, detail?.debtorName, '未知业主'),
    debtorPhone: firstText(timeline?.debtorPhone, detail?.debtorPhone),
    organization: firstText(timeline?.organization, detail?.organization),
    semanticSummary: firstText(
      detail?.analysis?.summary,
      detail?.summary,
      currentLog?.summary,
      '无语义摘要',
    ),
    logs,
  };
};
