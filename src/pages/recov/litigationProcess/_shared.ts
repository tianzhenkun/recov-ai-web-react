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
import {
  formatCompactCurrencyDisplay,
  formatCurrencyDisplay,
  toNumber,
} from '@/pages/recov/settle/_shared';
import type {
  FeeManagementResult,
  LitigationNodeStatus,
  LitigationNodeType,
  LitigationOverviewVO,
  LitigationRowVO,
} from '@/services/ruoyi/litigation-process';

export const PAGE_TITLE = '智能法律诉讼管理';
export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_NODE_TYPE: LitigationNodeType = 'MATERIAL_SUBMIT';

export type DisplayRow = LitigationRowVO & { _fee?: FeeManagementResult };

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
  | 'nodeStatus'
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
    | 'nodeStatus'
    | 'warning'
    | 'feeStatus'
    | 'remainDays'
    | 'party'
    | 'mono';
  feeOnly?: boolean;
};

export const BASE_COLUMNS: ColumnSchema[] = [
  { prop: 'debtNumber', label: '资产编号', minWidth: 120, type: 'asset' },
  { prop: 'city', label: '所属城市', minWidth: 110 },
  { prop: 'organization', label: '所属项目', minWidth: 140 },
  { prop: 'debtorName', label: '当事人姓名', minWidth: 100, type: 'party' },
  {
    prop: 'debtAmount',
    label: '逾期金额',
    minWidth: 120,
    align: 'right',
    type: 'money',
  },
  {
    prop: 'overdueAmount',
    label: '违约金',
    minWidth: 120,
    align: 'right',
    type: 'money',
  },
  {
    prop: 'overdueDays',
    label: '逾期天数',
    minWidth: 110,
    align: 'center',
    type: 'days',
  },
  { prop: 'caseNo', label: '案号', minWidth: 180, type: 'mono' },
  { prop: 'courtName', label: '立案法院', minWidth: 170 },
  {
    prop: 'nodeStatus',
    label: '节点状态',
    minWidth: 110,
    align: 'center',
    type: 'nodeStatus',
  },
  { prop: 'failReason', label: '失败原因', minWidth: 170 },
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

export const CITY_OPTIONS = [
  '深圳市',
  '广州市',
  '上海市',
  '北京市',
  '杭州市',
  '成都市',
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
  color: string;
};

export const OVERVIEW_CARD_METAS: OverviewCardMeta[] = [
  {
    key: 'totalCount',
    label: '进入诉讼流程数量',
    format: 'count',
    unit: '件',
    icon: createElement(UnorderedListOutlined),
    color: '#1677ff',
  },
  {
    key: 'materialSubmittedCount',
    label: '已提交诉讼材料数量',
    format: 'count',
    unit: '件',
    icon: createElement(FileOutlined),
    color: '#4f46e5',
  },
  {
    key: 'courtAcceptedCount',
    label: '法院已受理数量',
    format: 'count',
    unit: '件',
    icon: createElement(CheckCircleOutlined),
    color: '#52c41a',
  },
  {
    key: 'nodeDebtAmount',
    label: '本阶段案涉金额',
    format: 'currency',
    icon: createElement(WalletOutlined),
    color: '#faad14',
  },
  {
    key: 'nodeRepaymentAmount',
    label: '本阶段回款金额',
    format: 'currency',
    icon: createElement(WalletOutlined),
    color: '#722ed1',
  },
];

export type LitigationDocTemplate = {
  id: string;
  title: string;
  content: string;
  courtIssued: boolean;
};

const DOC_TEMPLATES: LitigationDocTemplate[] = [
  {
    id: 'complaint',
    title: '起诉状',
    courtIssued: false,
    content: `民事起诉状

原告：[物业公司]
被告：[当事人]

诉讼请求：
1. 判令被告向原告支付欠缴的物业服务费 [逾期金额]；
2. 判令被告支付逾期违约金 [滞纳金]；
3. 判令被告承担本案诉讼费用。

事实与理由：
被告系原告提供物业服务的 [项目] 小区业主，长期拖欠物业费，经多次催告仍未履行缴费义务。截至起诉之日，被告已逾期 [逾期天数] 天。

此致
[法院]

原告：某某物业服务有限公司
[日期]`,
  },
  {
    id: 'evidence_list',
    title: '证据清单',
    courtIssued: false,
    content: `证据清单

案号：[案号]
原告：某某物业服务有限公司
被告：[当事人]

证据一：物业服务合同原件
证明对象：原被告之间存在物业服务合同关系。

证据二：欠费明细表
证明对象：被告欠费金额 [逾期金额]，逾期 [逾期天数] 天。

证据三：催款函及送达凭证
证明对象：原告已履行催告义务。

证据四：业主身份信息
证明对象：被告主体资格。

以上证据均已核对原件。

[日期]`,
  },
  {
    id: 'filing_notice',
    title: '立案通知书',
    courtIssued: true,
    content: `受理案件通知书

[案号]

某某物业服务有限公司：

本院已收到贵司与 [当事人] 物业服务合同纠纷一案的起诉状。经审查，起诉符合法定受理条件，本院决定立案受理。

请于收到本通知之日起十五日内向本院预交案件受理费。

特此通知。

[法院]
[日期]`,
  },
  {
    id: 'fee_notice',
    title: '缴费通知书',
    courtIssued: true,
    content: `诉讼费用交纳通知书

[案号]

某某物业服务有限公司：

本院已受理贵司与 [当事人] 物业服务合同纠纷一案。依照《诉讼费用交纳办法》的规定，原告应向本院预交诉讼费人民币 [缴费金额]。

请于收到本通知书之日起七日内交纳。逾期不交纳且无缓、减、免交申请的，本院将按原告撤回起诉处理。

[法院]
[日期]`,
  },
  {
    id: 'hearing_notice',
    title: '开庭通知',
    courtIssued: true,
    content: `传票

[案号]

被传唤人：[当事人]
案由：物业服务合同纠纷
传唤事由：开庭审理
应到地点：[法院] 第十五法庭

注意事项：
1. 被传唤人必须准时到达。
2. 携带身份证件及相关证据原件。

[法院]
[日期]`,
  },
  {
    id: 'judgment',
    title: '判决书',
    courtIssued: true,
    content: `民事判决书

[案号]

原告：某某物业服务有限公司
被告：[当事人]

本院审理原告与被告物业服务合同纠纷一案，现已审理终结。

本院认为，被告作为 [项目] 小区业主，应当按照合同约定交纳物业费。被告长期拖欠物业费的行为已构成违约。

判决如下：
被告 [当事人] 于本判决生效之日起十日内向原告支付物业服务费 [逾期金额] 及违约金 [滞纳金]。

如不服本判决，可在判决书送达之日起十五日内，向本院递交上诉状。

[法院]
[日期]`,
  },
  {
    id: 'enforcement_notice',
    title: '强制执行通知书',
    courtIssued: true,
    content: `执行通知书

[案号]

被执行人：[当事人]

本院受理申请执行人某某物业服务有限公司申请执行你物业服务合同纠纷一案，执行依据为 [案号] 民事判决书。

现责令你立即履行上述法律文书确定的义务：支付物业服务费 [逾期金额] 及违约金 [滞纳金]。

逾期不履行的，本院将依法强制执行。

[法院]
[日期]`,
  },
];

const NODE_DOC_MAP: Record<LitigationNodeType, string[]> = {
  MATERIAL_SUBMIT: ['complaint', 'evidence_list'],
  PRE_MEDIATION: ['complaint', 'evidence_list'],
  WAITING_FILING: ['complaint', 'evidence_list'],
  FILED: ['complaint', 'evidence_list', 'filing_notice'],
  FEE_MANAGEMENT: ['complaint', 'evidence_list', 'filing_notice', 'fee_notice'],
  COURT_MEDIATION: [
    'complaint',
    'evidence_list',
    'filing_notice',
    'fee_notice',
  ],
  WAITING_HEARING: [
    'complaint',
    'evidence_list',
    'filing_notice',
    'fee_notice',
    'hearing_notice',
  ],
  HEARING_DONE: [
    'complaint',
    'evidence_list',
    'filing_notice',
    'fee_notice',
    'hearing_notice',
  ],
  WAITING_VERDICT: [
    'complaint',
    'evidence_list',
    'filing_notice',
    'fee_notice',
    'hearing_notice',
  ],
  VERDICT_DONE: [
    'complaint',
    'evidence_list',
    'filing_notice',
    'fee_notice',
    'hearing_notice',
    'judgment',
  ],
  APPLY_ENFORCEMENT: [
    'complaint',
    'evidence_list',
    'filing_notice',
    'fee_notice',
    'hearing_notice',
    'judgment',
    'enforcement_notice',
  ],
  ENFORCING: [
    'complaint',
    'evidence_list',
    'filing_notice',
    'fee_notice',
    'hearing_notice',
    'judgment',
    'enforcement_notice',
  ],
};

export const getVisibleColumns = (nodeType: LitigationNodeType) =>
  nodeType === 'FEE_MANAGEMENT'
    ? [...BASE_COLUMNS, ...FEE_COLUMNS]
    : BASE_COLUMNS;

export const parseFeeResult = (
  result: string | null,
): FeeManagementResult | undefined => {
  if (!result) return undefined;
  try {
    return JSON.parse(result) as FeeManagementResult;
  } catch {
    return undefined;
  }
};

export const formatDebtNumber = (value: number | null | undefined) => {
  if (value == null) return '-';
  return `A1-${String(value).padStart(5, '0')}`;
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
  pageNum: number,
  pageSize: number,
  total: number,
) => {
  if (!total) return '暂无数据';
  const start = (pageNum - 1) * pageSize + 1;
  const end = Math.min(pageNum * pageSize, total);
  return `当前显示 ${start}-${end} 条，共 ${total} 条`;
};

export const getNodeStatusLabel = (status: LitigationNodeStatus) => {
  const map: Record<LitigationNodeStatus, string> = {
    PENDING: '待处理',
    IN_PROGRESS: '处理中',
    COMPLETED: '已完成',
    FAILED: '失败',
    SKIPPED: '已跳过',
  };
  return map[status] || status;
};

export const getNodeStatusColor = (
  status: LitigationNodeStatus,
): 'default' | 'processing' | 'success' | 'error' | 'warning' => {
  const map: Record<
    LitigationNodeStatus,
    'default' | 'processing' | 'success' | 'error' | 'warning'
  > = {
    PENDING: 'default',
    IN_PROGRESS: 'processing',
    COMPLETED: 'success',
    FAILED: 'error',
    SKIPPED: 'default',
  };
  return map[status] ?? 'default';
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

export const getLitigationDocTemplates = (
  nodeType: LitigationNodeType,
): LitigationDocTemplate[] => {
  const ids = NODE_DOC_MAP[nodeType] || ['complaint', 'evidence_list'];
  return ids
    .map((id) => DOC_TEMPLATES.find((item) => item.id === id))
    .filter((item): item is LitigationDocTemplate => Boolean(item));
};

export const renderDocContent = (
  template: LitigationDocTemplate,
  row: DisplayRow,
) =>
  template.content
    .replace(/\[当事人\]/g, row.debtorName)
    .replace(/\[逾期金额\]/g, formatDisplayMoney(row.debtAmount))
    .replace(/\[滞纳金\]/g, formatDisplayMoney(row.overdueAmount))
    .replace(/\[逾期天数\]/g, `${row.overdueDays}`)
    .replace(/\[案号\]/g, row.caseNo ?? '（待分配）')
    .replace(/\[法院\]/g, row.courtName ?? '（待分配）')
    .replace(/\[项目\]/g, row.organization)
    .replace(/\[物业公司\]/g, '某某物业服务有限公司')
    .replace(/\[缴费金额\]/g, formatDisplayMoney(row._fee?.paymentAmount))
    .replace(/\[开庭时间\]/g, '（待排期）')
    .replace(/\[日期\]/g, new Date().toLocaleDateString('zh-CN'));

export { formatCompactCurrencyDisplay, formatCurrencyDisplay, toNumber };
