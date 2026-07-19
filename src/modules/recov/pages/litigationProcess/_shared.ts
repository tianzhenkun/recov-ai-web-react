import {
  AuditOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  DollarOutlined,
  FieldTimeOutlined,
  FileDoneOutlined,
  FileOutlined,
  FolderOpenOutlined,
  MoneyCollectOutlined,
  RocketOutlined,
  UnorderedListOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { createElement, type ReactNode } from 'react';
import type { MetricTone } from '@/modules/recov/components/MetricIcon';
import { RECOV_LIST_COLUMN_WIDTH } from '@/modules/recov/components/RecovFilterControls';
import {
  formatCompactCurrencyDisplay,
  formatCurrencyDisplay,
  toNumber,
} from '@/modules/recov/pages/settle/_shared';
import type {
  FeeManagementResult,
  LitigationNodeType,
  LitigationOverviewVO,
  LitigationRowVO,
  LitigationStatus,
} from '@/modules/recov/services/litigation-process';

export const PAGE_TITLE = '智能法律诉讼管理';
export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_NODE_TYPE: LitigationNodeType = 'MATERIAL_SUBMIT';

export type DisplayRow = LitigationRowVO & {
  _fee?: FeeManagementResult;
  _result?: LitigationResultPayload;
};

export type ColumnProp =
  | 'debtNumber'
  | 'city'
  | 'organization'
  | 'debtorName'
  | 'debtAmount'
  | 'overdueAmount'
  | 'overdueDays'
  | 'courtName'
  | 'caseNo'
  | 'status'
  | 'courtStatus'
  | 'failReason'
  | 'paymentDeadline'
  | 'paymentAmount'
  | 'remainingDays'
  | 'warningMessage'
  | 'paid';

export type ColumnSchema = {
  prop: ColumnProp;
  label: string;
  minWidth: number;
  align?: 'left' | 'center' | 'right';
  type?:
    | 'asset'
    | 'money'
    | 'days'
    | 'status'
    | 'courtStatus'
    | 'warning'
    | 'failure'
    | 'feeStatus'
    | 'remainDays'
    | 'party'
    | 'mono';
  feeOnly?: boolean;
  blankWhenEmpty?: boolean;
};

export const BASE_COLUMNS: ColumnSchema[] = [
  {
    prop: 'debtNumber',
    label: '资产编号',
    minWidth: RECOV_LIST_COLUMN_WIDTH.debtNumber,
    type: 'asset',
  },
  { prop: 'city', label: '所属城市', minWidth: RECOV_LIST_COLUMN_WIDTH.city },
  {
    prop: 'organization',
    label: '所属项目',
    minWidth: RECOV_LIST_COLUMN_WIDTH.organization,
  },
  { prop: 'debtorName', label: '业主名称', minWidth: 100, type: 'party' },
  {
    prop: 'debtAmount',
    label: '逾期金额',
    minWidth: 120,
    align: 'right',
    type: 'money',
  },
  {
    prop: 'overdueAmount',
    label: '违约（滞纳）金',
    minWidth: 120,
    align: 'right',
    type: 'money',
  },
  {
    prop: 'status',
    label: '节点状态',
    minWidth: 110,
    align: 'center',
    type: 'status',
  },
  {
    prop: 'overdueDays',
    label: '逾期天数',
    minWidth: 110,
    align: 'center',
    type: 'days',
  },
  {
    prop: 'caseNo',
    label: '案号',
    minWidth: 180,
    type: 'mono',
    blankWhenEmpty: true,
  },
  {
    prop: 'courtName',
    label: '立案法院',
    minWidth: 170,
    blankWhenEmpty: true,
  },
  {
    prop: 'failReason',
    label: '失败原因',
    minWidth: 170,
    type: 'failure',
    blankWhenEmpty: true,
  },
];

export const FEE_COLUMNS: ColumnSchema[] = [
  {
    prop: 'paymentAmount',
    label: '缴费金额',
    minWidth: 120,
    align: 'right',
    type: 'money',
    feeOnly: true,
  },
  {
    prop: 'paymentDeadline',
    label: '缴费截止日期',
    minWidth: 130,
    type: 'mono',
    feeOnly: true,
  },
  {
    prop: 'remainingDays',
    label: '剩余天数',
    minWidth: 110,
    align: 'center',
    type: 'remainDays',
    feeOnly: true,
  },
  {
    prop: 'warningMessage',
    label: '预警信息',
    minWidth: 160,
    align: 'center',
    type: 'warning',
    feeOnly: true,
  },
  {
    prop: 'paid',
    label: '缴费状态',
    minWidth: 110,
    align: 'center',
    type: 'feeStatus',
    feeOnly: true,
  },
];

export const WAITING_FILING_COLUMNS: ColumnSchema[] = [
  {
    prop: 'courtStatus',
    label: '法院状态',
    minWidth: 130,
    align: 'center',
    type: 'courtStatus',
    blankWhenEmpty: true,
  },
];

export const CITY_OPTIONS = [
  '深圳市',
  '广州市',
  '上海市',
  '北京市',
  '杭州市',
  '成都市',
];

export const LITIGATION_STATUS_FILTER_OPTIONS: {
  value: LitigationStatus;
  label: string;
}[] = [
  { value: '0', label: '待处理' },
  { value: '1', label: '处理中' },
  { value: '2', label: '已完成' },
  { value: '3', label: '失败' },
  { value: '4', label: '已跳过' },
];

export const ORGANIZATION_OPTIONS = [
  '金地格林',
  '万科城',
  '恒大名都',
  '阳光城小区',
  '月亮湾公寓',
  '星河湾别墅',
  '保利花园',
];

export type NodeVisual = {
  icon: ReactNode;
  accent: string;
  line: string;
  soft: string;
  shadow: string;
};

export const NODE_VISUAL_MAP: Record<LitigationNodeType, NodeVisual> = {
  MATERIAL_SUBMIT: {
    icon: createElement(FileOutlined),
    accent: '#4f46e5',
    line: '#22d3ee',
    soft: 'rgba(224, 231, 255, 0.96)',
    shadow: 'rgba(79, 70, 229, 0.22)',
  },
  PRE_MEDIATION: {
    icon: createElement(CommentOutlined),
    accent: '#0f766e',
    line: '#2dd4bf',
    soft: 'rgba(204, 251, 241, 0.96)',
    shadow: 'rgba(15, 118, 110, 0.22)',
  },
  WAITING_FILING: {
    icon: createElement(ClockCircleOutlined),
    accent: '#ca8a04',
    line: '#f59e0b',
    soft: 'rgba(254, 249, 195, 0.96)',
    shadow: 'rgba(202, 138, 4, 0.22)',
  },
  FILED: {
    icon: createElement(CheckCircleOutlined),
    accent: '#059669',
    line: '#34d399',
    soft: 'rgba(209, 250, 229, 0.96)',
    shadow: 'rgba(5, 150, 105, 0.22)',
  },
  FEE_MANAGEMENT: {
    icon: createElement(MoneyCollectOutlined),
    accent: '#ea580c',
    line: '#fb923c',
    soft: 'rgba(255, 237, 213, 0.96)',
    shadow: 'rgba(234, 88, 12, 0.22)',
  },
  COURT_MEDIATION: {
    icon: createElement(AuditOutlined),
    accent: '#7c3aed',
    line: '#8b5cf6',
    soft: 'rgba(237, 233, 254, 0.96)',
    shadow: 'rgba(124, 58, 237, 0.22)',
  },
  WAITING_HEARING: {
    icon: createElement(FieldTimeOutlined),
    accent: '#2563eb',
    line: '#38bdf8',
    soft: 'rgba(219, 234, 254, 0.96)',
    shadow: 'rgba(37, 99, 235, 0.22)',
  },
  HEARING_DONE: {
    icon: createElement(FileDoneOutlined),
    accent: '#0891b2',
    line: '#22d3ee',
    soft: 'rgba(207, 250, 254, 0.96)',
    shadow: 'rgba(8, 145, 178, 0.22)',
  },
  WAITING_VERDICT: {
    icon: createElement(BarChartOutlined),
    accent: '#9333ea',
    line: '#c084fc',
    soft: 'rgba(243, 232, 255, 0.96)',
    shadow: 'rgba(147, 51, 234, 0.22)',
  },
  VERDICT_DONE: {
    icon: createElement(FolderOpenOutlined),
    accent: '#16a34a',
    line: '#4ade80',
    soft: 'rgba(220, 252, 231, 0.96)',
    shadow: 'rgba(22, 163, 74, 0.22)',
  },
  APPLY_ENFORCEMENT: {
    icon: createElement(RocketOutlined),
    accent: '#dc2626',
    line: '#f97316',
    soft: 'rgba(254, 226, 226, 0.96)',
    shadow: 'rgba(220, 38, 38, 0.22)',
  },
  ENFORCING: {
    icon: createElement(DollarOutlined),
    accent: '#0f766e',
    line: '#14b8a6',
    soft: 'rgba(204, 251, 241, 0.96)',
    shadow: 'rgba(15, 118, 110, 0.22)',
  },
};

export type OverviewCardMeta = {
  key: keyof LitigationOverviewVO;
  label: string;
  format: 'count' | 'currency';
  unit?: string;
  icon: ReactNode;
  tone: MetricTone;
};

export const OVERVIEW_CARD_METAS: OverviewCardMeta[] = [
  {
    key: 'totalCount',
    label: '进入诉讼流程数量',
    format: 'count',
    unit: '件',
    icon: createElement(UnorderedListOutlined),
    tone: 'primary',
  },
  {
    key: 'materialSubmittedCount',
    label: '已提交诉讼材料数量',
    format: 'count',
    unit: '件',
    icon: createElement(FileOutlined),
    tone: 'info',
  },
  {
    key: 'courtAcceptedCount',
    label: '法院已受理数量',
    format: 'count',
    unit: '件',
    icon: createElement(CheckCircleOutlined),
    tone: 'success',
  },
  {
    key: 'nodeDebtAmount',
    label: '本阶段案涉金额',
    format: 'currency',
    icon: createElement(WalletOutlined),
    tone: 'warning',
  },
  {
    key: 'nodeRepaymentAmount',
    label: '本阶段回款金额',
    format: 'currency',
    icon: createElement(WalletOutlined),
    tone: 'success',
  },
];

export type LitigationResultPayload = {
  nodeType?: string;
  nodeStatus?: string;
  courtStatusRaw?: string | null;
  courtStatusCode?: string | null;
  courtCaseNo?: string | null;
  rejectReason?: string | null;
  supplementRequired?: boolean;
  supplementItems?: string[];
  screenshots?: { name?: string; ossId?: string }[];
  attributes?: Record<string, unknown>;
  rawSummary?: string;
  paymentDeadline?: string;
  paymentAmount?: string;
  remainingDays?: number;
  warningMessage?: string | null;
  paid?: boolean;
};

const HIDE_CASE_NO_NODE_TYPES = new Set<LitigationNodeType>([
  'MATERIAL_SUBMIT',
  'PRE_MEDIATION',
  'WAITING_FILING',
]);

const getBaseColumns = (nodeType: LitigationNodeType) =>
  HIDE_CASE_NO_NODE_TYPES.has(nodeType)
    ? BASE_COLUMNS.filter((item) => item.prop !== 'caseNo')
    : BASE_COLUMNS;

export const getVisibleColumns = (nodeType: LitigationNodeType) => {
  const baseColumns = getBaseColumns(nodeType);

  if (nodeType === 'FEE_MANAGEMENT') {
    return [...baseColumns, ...FEE_COLUMNS];
  }

  if (nodeType === 'WAITING_FILING') {
    const statusIndex = baseColumns.findIndex((item) => item.prop === 'status');
    return [
      ...baseColumns.slice(0, statusIndex + 1),
      ...WAITING_FILING_COLUMNS,
      ...baseColumns.slice(statusIndex + 1),
    ];
  }

  return baseColumns;
};

export const parseLitigationResult = (
  result: string | null,
): LitigationResultPayload | undefined => {
  if (!result) return undefined;
  try {
    return JSON.parse(result) as LitigationResultPayload;
  } catch {
    return undefined;
  }
};

export const parseFeeResult = (
  result: string | null,
): FeeManagementResult | undefined => {
  const parsed = parseLitigationResult(result);
  if (!parsed?.paymentDeadline && parsed?.paymentAmount === undefined) {
    return undefined;
  }
  return {
    paymentDeadline: String(parsed.paymentDeadline ?? ''),
    paymentAmount: String(parsed.paymentAmount ?? '0'),
    remainingDays: Number(parsed.remainingDays ?? 0),
    warningMessage: parsed.warningMessage ?? null,
    paid: Boolean(parsed.paid),
  };
};

export const formatDebtNumber = (value: number | null | undefined) => {
  if (value == null) return '-';
  return String(value);
};

export const formatDisplayMoney = (value: unknown) => {
  const amount = toNumber(value);
  return `¥${amount.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
};

export const formatText = (value: unknown, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

export const buildRangeText = (
  _pageNum: number,
  _pageSize: number,
  total: number,
) => {
  return `共 ${total} 条`;
};

export const getLitigationStatusLabel = (status: LitigationStatus) =>
  LITIGATION_STATUS_FILTER_OPTIONS.find((item) => item.value === status)
    ?.label ?? status;

export const getLitigationStatusColor = (
  status: LitigationStatus,
): 'default' | 'processing' | 'success' | 'error' => {
  const map: Record<
    LitigationStatus,
    'default' | 'processing' | 'success' | 'error'
  > = {
    '0': 'default',
    '1': 'processing',
    '2': 'success',
    '3': 'error',
    '4': 'default',
  };
  return map[status] ?? 'default';
};

export const getCourtStatusColor = (
  statusCode?: string | null,
): 'default' | 'processing' | 'success' | 'warning' | 'error' => {
  const code = String(statusCode || '').toUpperCase();
  if (['FILED', 'APPROVED'].includes(code)) return 'success';
  if (['PENDING_REVIEW', 'DRAFT'].includes(code)) return 'processing';
  if (['NEED_SUPPLEMENT', 'WITHDRAWN'].includes(code)) return 'warning';
  if (['REJECTED', 'NOT_ACCEPTED'].includes(code)) return 'error';
  return 'default';
};

export const getOverdueDaysColor = (days: number) => {
  if (days >= 180) return 'error';
  if (days >= 90) return 'warning';
  return 'gold';
};

export const getFeeStatusLabel = (paid?: boolean) => {
  if (paid === true) return '已缴费';
  if (paid === false) return '未缴费';
  return '-';
};

export const getFeeStatusColor = (paid?: boolean) => {
  if (paid === true) return 'success';
  if (paid === false) return 'warning';
  return 'default';
};

export const getRemainDaysColor = (remainingDays?: number, paid?: boolean) => {
  if (paid) return 'success';
  if ((remainingDays ?? 99) <= 5) return 'error';
  return undefined;
};

export { formatCompactCurrencyDisplay, formatCurrencyDisplay, toNumber };
