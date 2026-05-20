import {
  formatCompactCurrencyDisplay,
  formatCurrencyDisplay,
  toNumber,
} from '@/pages/recov/settle/_shared';

export const PAGE_TITLE = '数字员工智能外呼';

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
  key: 'staff' | 'cs' | 'legal' | 'lawyer';
  label: string;
  description: string;
  tone: string;
};

export type FeedbackSentiment = 'positive' | 'neutral' | 'negative';

export type FeedbackItem = {
  id: string;
  ownerName: string;
  project: string;
  reason: string;
  sentiment: FeedbackSentiment;
  semanticTag: string;
  suggestion: string;
  status: '未转办' | '已转办' | '无需转办';
};

export type RejectReasonTone = 'negative' | 'caution' | 'neutral' | 'positive';

export type RejectReasonStat = {
  label: string;
  value: number;
  tone: RejectReasonTone;
};

export type CommunicationLog = {
  id: string;
  date: string;
  channel: string;
  sentiment: '正面' | '中性' | '负面' | '未知';
  summary: string;
  keywords: string[];
  suggestion: string;
};

export type OwnerCommunicationDetail = {
  ownerName: string;
  semanticSummary: string;
  logs: CommunicationLog[];
};

export type OutboundOverview = {
  metrics: OutboundMetric[];
  liveStats: LiveMonitorStats;
  identities: DigitalIdentity[];
  feedback: FeedbackItem[];
};

export const MOCK_METRICS: OutboundMetric[] = [
  {
    key: 'totalCalls',
    label: '累计 AI 外呼总数',
    value: 368929,
    format: 'count',
    unit: '次',
  },
  {
    key: 'totalTalkHours',
    label: '累计通话时长',
    value: 28158,
    format: 'duration',
    unit: '小时',
  },
  {
    key: 'currentRepayment',
    label: '本阶段回款金额',
    value: 36138718.01,
    format: 'currency',
  },
  {
    key: 'feedbackCount',
    label: 'AI 语义反馈数量',
    value: 1240389,
    format: 'count',
    unit: '条',
  },
];

export const MOCK_LIVE_STATS: LiveMonitorStats = {
  ongoingCalls: 128,
  finishedToday: 8215,
  totalTalkMinutesToday: 53189,
};

export const MOCK_IDENTITIES: DigitalIdentity[] = [
  {
    key: 'staff',
    label: '项目员工',
    description: '亲切自然，侧重服务满意度调查、物业关怀与日常提醒。',
    tone: '友好沟通',
  },
  {
    key: 'cs',
    label: '企业客服',
    description: '温和礼貌，侧重提醒与沟通，照顾业主情绪。',
    tone: '温和提醒',
  },
  {
    key: 'legal',
    label: '企业法务',
    description: '专业严谨，侧重企业管理流程要求与告知缴费。',
    tone: '严谨告知',
  },
  {
    key: 'lawyer',
    label: '律师',
    description: '第三方口吻，侧重催缴沟通与法律后果告知、可能的下一步措施。',
    tone: '法律告知',
  },
];

export const MOCK_FEEDBACK: FeedbackItem[] = [
  {
    id: 'F-001',
    ownerName: '张三',
    project: '金地格林',
    reason: '物业费太贵，服务跟不上',
    sentiment: 'negative',
    semanticTag: '物业服务投诉',
    suggestion: '转办物业中心',
    status: '未转办',
  },
  {
    id: 'F-002',
    ownerName: '李四',
    project: '万科城',
    reason: '漏水问题一直没修好',
    sentiment: 'negative',
    semanticTag: '工程维修诉求',
    suggestion: '转办工程部门',
    status: '已转办',
  },
  {
    id: 'F-003',
    ownerName: '王五',
    project: '金地格林',
    reason: '已通过线下渠道缴费',
    sentiment: 'positive',
    semanticTag: '已完成缴费',
    suggestion: '核对到账状态',
    status: '已转办',
  },
  {
    id: 'F-004',
    ownerName: '赵六',
    project: '恒大名都',
    reason: '对违约金计算方式有异议，要求核减',
    sentiment: 'negative',
    semanticTag: '费用争议',
    suggestion: '转办财务复核',
    status: '未转办',
  },
  {
    id: 'F-005',
    ownerName: '孙七',
    project: '万科城',
    reason: '希望增加充电桩设施',
    sentiment: 'neutral',
    semanticTag: '设施建议',
    suggestion: '记录至建议清单',
    status: '无需转办',
  },
  {
    id: 'F-006',
    ownerName: '周八',
    project: '金地格林',
    reason: '对物业费涨价不认可',
    sentiment: 'negative',
    semanticTag: '收费争议',
    suggestion: '转办物业中心',
    status: '未转办',
  },
];

export const MOCK_REJECT_REASONS: RejectReasonStat[] = [
  { label: '投诉挂钩型', value: 20, tone: 'negative' },
  { label: '习惯性拖延/博弈型', value: 18, tone: 'negative' },
  { label: '疏忽遗忘型', value: 15, tone: 'caution' },
  { label: '暂时困难型', value: 12, tone: 'caution' },
  { label: '房屋空置型', value: 8, tone: 'neutral' },
  { label: '历史遗留问题型', value: 7, tone: 'neutral' },
  { label: '产权纠纷型', value: 6, tone: 'neutral' },
  { label: '租赁推诿型', value: 5, tone: 'caution' },
  { label: '信息失联型', value: 4, tone: 'neutral' },
  { label: '恶意对抗型', value: 3, tone: 'negative' },
  { label: '其他', value: 2, tone: 'neutral' },
];

const DEFAULT_COMM_LOGS: CommunicationLog[] = [
  {
    id: 'L-001',
    date: '2026-03-20 14:30',
    channel: 'AI 智能外呼',
    sentiment: '负面',
    summary:
      '业主反馈由于出差在外忘记缴费，但对物业服务质量表示不满，特别是电梯维修不及时。',
    keywords: ['服务不满', '电梯维修', '疏忽遗忘'],
    suggestion: '优先处理电梯报修，再进行二次催收',
  },
  {
    id: 'L-002',
    date: '2026-03-15 10:15',
    channel: '短信提醒',
    sentiment: '中性',
    summary: '发送逾期提醒短信，系统显示已送达。',
    keywords: ['短信送达'],
    suggestion: '等待业主反馈',
  },
  {
    id: 'L-003',
    date: '2026-03-10 09:00',
    channel: 'AI 智能外呼',
    sentiment: '未知',
    summary: '无人接听，系统自动挂断。',
    keywords: ['未接听'],
    suggestion: '更换时间段再次外呼',
  },
];

export const buildOwnerCommunicationDetail = (
  ownerName: string,
): OwnerCommunicationDetail => ({
  ownerName,
  semanticSummary: `该业主（${ownerName}）在多次沟通中表现出明显的还款意愿，但受限于当前资金周转压力。核心诉求集中在物业服务质量的提升（尤其是电梯维护），建议通过"服务换回款"策略，优先解决其报修痛点，并提供灵活的分期还款方案。`,
  logs: DEFAULT_COMM_LOGS,
});

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

export type MetricDisplay = {
  primary: string;
  unit?: string;
  tooltip?: string;
};

export const buildMetricDisplay = (metric: OutboundMetric): MetricDisplay => {
  if (metric.format === 'currency') {
    return {
      primary: formatCompactCurrencyDisplay(metric.value),
      tooltip: formatCurrencyDisplay(metric.value),
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
