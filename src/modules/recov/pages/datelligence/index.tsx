import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FieldTimeOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FileUnknownOutlined,
  FileWordOutlined,
  FileZipOutlined,
  InboxOutlined,
  LoadingOutlined,
  PhoneOutlined,
  ProjectOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import XMarkdown from '@ant-design/x-markdown';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  message,
  Pagination,
  Progress,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  theme,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PdfPreview from '@/components/PdfPreview';
import TableActions, { type TableActionItem } from '@/components/TableActions';
import { getFlowActionIcon } from '@/modules/recov/components/FlowActionIcon';
import MetricIcon, {
  type MetricTone,
} from '@/modules/recov/components/MetricIcon';
import {
  RECOV_FILTER_CONTROL_STYLE,
  RECOV_LIST_COLUMN_WIDTH,
  RECOV_ORGANIZATION_POPUP_WIDTH,
  renderRecovSelectOptionLabel,
  renderRecovSingleLineText,
} from '@/modules/recov/components/RecovFilterControls';
import {
  RecovListPage,
  RecovListStack,
  RecovStatsStrip,
  RecovTableCard,
} from '@/modules/recov/components/RecovListLayout';
import {
  type DebtRecordActionKey,
  isDebtFlowExceptionRecord,
  isFlowStartFailedRecord,
  normalizeFlowId,
  normalizeFlowStartBatchId,
  normalizePersonaId,
  resolveDebtRecordActionKeys,
} from '@/modules/recov/pages/datelligence/actionRules';
import {
  DATELLIGENCE_LIST_POLLING_INTERVAL,
  shouldPollDatelligenceList,
} from '@/modules/recov/pages/datelligence/listPolling';
import {
  resolveDebtListStatusDisplay,
  resolveDebtRawStatusDisplay,
} from '@/modules/recov/pages/datelligence/statusDisplay';
import FlowTraceDrawer from '@/modules/recov/pages/flow/components/FlowTraceDrawer';
import {
  buildCommunicationDetail,
  type OwnerCommunicationDetail,
  resolveOutboundStartDisabledReason,
  resolveOutboundStartNotice,
} from '@/modules/recov/pages/intelligentOutbound/_shared';
import { CommunicationLogContent } from '@/modules/recov/pages/intelligentOutbound/CommunicationLogModal';
import {
  type AiCallDebtTimeline,
  getAiCallDebtFeedbackPage,
  getAiCallDebtTimeline,
} from '@/modules/recov/pages/intelligentOutbound/service';
import {
  type DebtAttachmentItem,
  type DebtRecordDetail,
  type DebtRecordItem,
  type DebtRecordQuery,
  type DebtRecordUpdatePayload,
  type DebtStats,
  downloadDebtImportTemplate,
  getAssetPackagePipelineProgress,
  getAssetParseFailurePage,
  getAssetParseUnmatchedPage,
  getCurrentAssetPackagePipelineProgress,
  getDebtCityOptions,
  getDebtOrganizationOptions,
  getDebtRecordDetail,
  getDebtRecordPage,
  getPersonaClassifyFailurePage,
  type ImportFailureDetail,
  type ImportFailureStage,
  type ImportPipelineProgressResult,
  type ImportPipelineStatus,
  type ImportPipelineSubTask,
  ignoreAssetPackagePipelineFailures,
  retryAssetPackagePipelineTask,
  submitAssetPackageImport,
  updateDebtRecord,
} from '@/modules/recov/services/datelligence';
import {
  type FlowBatchStartFilter,
  getFlowBatchProgress,
  retryFailedDebtFlowStart,
  startFlowBatch,
} from '@/modules/recov/services/flowBatchStart';
import { getPersona, type PersonaItem } from '@/modules/recov/services/persona';
import { normalizeSafeResourceUrl } from '@/shared/security/url';
import {
  downloadOss,
  listOssByIds,
  uploadOssFile,
} from '@/shared/services/oss';

const { Paragraph, Text, Title } = Typography;

type QueryFormValues = {
  debtNumber?: string;
  city?: string;
  organization?: string;
};

type DebtEditFormValues = {
  debtAmount?: number | string | null;
  debtorName?: string;
  debtorPhone?: string;
  city?: string;
  organization?: string;
  debtorEmail?: string;
  reminderRemark?: string;
  address?: string;
  area?: string;
  deadlineTime?: Dayjs | null;
  debtIdCard?: string;
  overdueDays?: number | string | null;
  overdueAmount?: number | string | null;
};

type OwnerInsightTabKey = 'persona' | 'communication';

type DetailTabKey = 'classification' | 'traits' | 'dialogue' | 'keyword';

const DEFAULT_PAGE_SIZE = 20;
const TASK_POLLING_INTERVAL = 6000;
const FLOW_START_POLLING_INTERVAL = 6000;
const ANALYSIS_LOOKUP_PAGE_SIZE = 1000;
const FAILURE_PAGE_SIZE = 10;
const PIPELINE_PROGRESS_MAX_TRANSIENT_ERRORS = 3;
const PIPELINE_SETTLED_REFRESH_DELAYS = [1200, 4000];

type UploadState = {
  uploading: boolean;
  percent: number;
  phase: string;
  errorMsg: string;
  current: number;
  total: number;
};

type PipelineStageState = {
  processing: boolean;
  failed: boolean;
  progress: number;
  phase: string;
  errorMsg: string;
  current: number;
  total: number;
};

type ParseState = {
  parsing: boolean;
  failed: boolean;
  progress: number;
  phase: string;
  errorMsg: string;
  startTs: number;
  execTaskId: string;
  rootTaskId: string;
  total: number;
  current: number;
  succeeded: number;
  failedCount: number;
};

type PersonaProgressState = {
  processing: boolean;
  failed: boolean;
  taskId: string;
  progress: number;
  phase: string;
  errorMsg: string;
  total: number;
  pending: number;
  processingCount: number;
  succeeded: number;
  failedCount: number;
  timestamp: number;
};

type PipelineTimingState = {
  startedAt: number;
  finishedAt: number;
};

type AttachmentFileKind =
  | 'image'
  | 'pdf'
  | 'word'
  | 'excel'
  | 'ppt'
  | 'archive'
  | 'text'
  | 'unknown';

type AttachmentPreviewType = 'image' | 'pdf' | 'embed';

type AttachmentPreviewState = {
  open: boolean;
  ossId?: number | string;
  fileUrl: string;
  fileName: string;
  previewType?: AttachmentPreviewType;
  errorMessage?: string;
  loading?: boolean;
};

type PersonaOriginInfo = {
  currentPersonaId: string;
  initialPersonaId: string;
  initialPersonaName: string;
};

type DetailGridField = {
  label: string;
  content: React.ReactNode;
  span?: 1 | 2;
};

const detailTabs: { key: DetailTabKey; label: string }[] = [
  { key: 'classification', label: '核心区分规则' },
  { key: 'traits', label: '核心特征' },
  { key: 'dialogue', label: '沟通表现' },
  { key: 'keyword', label: '关键词与话术' },
];

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 1,
});

const compactNumberFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
});

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const toOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined;
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
};

const toText = (value: unknown) =>
  value === null || value === undefined || value === '' ? '-' : String(value);

const renderEllipsisText = (value: unknown, options?: { strong?: boolean }) => {
  const text = toText(value);
  return (
    <Text
      ellipsis={{ tooltip: text !== '-' ? text : undefined }}
      strong={options?.strong}
      style={{ display: 'block', maxWidth: '100%' }}
    >
      {text}
    </Text>
  );
};

type FailureMessageTone = 'danger' | 'warning';

const FAILURE_MESSAGE_SCROLL_THRESHOLD = 4;
const FAILURE_MESSAGE_MAX_HEIGHT = 168;
const failureLinePrefixPattern = /第\s*\d+\s*行[:：]/;

const splitFailureMessageLines = (value: unknown) => {
  const text = toText(value).trim();
  if (!text || text === '-') return ['-'];

  const normalizedText = text
    .replace(/\r\n?/g, '\n')
    .replace(/[；;，,]\s*(?=第\s*\d+\s*行[:：])/g, '\n')
    .replace(/\s+(?=第\s*\d+\s*行[:：])/g, '\n')
    .replace(/(?=第\s*\d+\s*行[:：])/g, '\n')
    .replace(/\n{2,}/g, '\n');

  const lines = normalizedText
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines : [text];
};

const getFailureMessageCount = (lines: string[]) => {
  const lineErrorCount = lines.filter((line) =>
    failureLinePrefixPattern.test(line),
  ).length;
  return lineErrorCount || lines.length;
};

const renderImportFailureMessage = (
  value: unknown,
  options?: {
    maxHeight?: number;
    showCount?: boolean;
    tone?: FailureMessageTone;
  },
) => {
  const lines = splitFailureMessageLines(value);
  const content = lines.join('\n');
  const messageCount = getFailureMessageCount(lines);
  const shouldScroll = messageCount > FAILURE_MESSAGE_SCROLL_THRESHOLD;
  const tone = options?.tone || 'danger';
  const copyable =
    content !== '-'
      ? { text: content, tooltips: ['复制原因', '已复制'] }
      : false;
  const showCount = options?.showCount !== false && messageCount > 1;
  const showHeaderCopy = shouldScroll && copyable;

  return (
    <div style={{ minWidth: 0, width: '100%' }}>
      {(showCount || showHeaderCopy) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 4,
          }}
        >
          {showCount ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              共 {messageCount} 条错误
            </Text>
          ) : (
            <span />
          )}
          {showHeaderCopy ? (
            <Text
              copyable={copyable}
              type="secondary"
              style={{ flex: 'none', fontSize: 12, whiteSpace: 'nowrap' }}
            >
              复制原因
            </Text>
          ) : null}
        </div>
      )}
      <Paragraph
        copyable={!shouldScroll ? copyable : false}
        style={{
          marginBottom: 0,
          maxHeight: shouldScroll
            ? (options?.maxHeight ?? FAILURE_MESSAGE_MAX_HEIGHT)
            : undefined,
          overflowY: shouldScroll ? 'auto' : undefined,
          paddingRight: shouldScroll ? 8 : 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.6,
        }}
        type={tone}
      >
        {content}
      </Paragraph>
    </div>
  );
};

const normalizeDebtRecordId = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
};

const getNonEmptyText = (...values: unknown[]) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const getEditTextValue = (value: unknown) =>
  value === null || value === undefined ? '' : String(value);

const getEditNumberValue = (value: unknown) => toOptionalNumber(value);

const getEditDateValue = (value: unknown) => {
  const text = getNonEmptyText(value);
  if (!text) return null;
  const date = dayjs(text);
  return date.isValid() ? date : null;
};

const toDebtEditFormValues = (record: DebtRecordItem): DebtEditFormValues => ({
  debtAmount: getEditNumberValue(record.debtAmount),
  debtorName: getEditTextValue(record.debtorName),
  debtorPhone: getEditTextValue(record.debtorPhone),
  city: getEditTextValue(record.city),
  organization: getEditTextValue(record.organization),
  debtorEmail: getEditTextValue(record.debtorEmail),
  reminderRemark: getEditTextValue(record.reminderRemark),
  address: getEditTextValue(record.address),
  area: getEditTextValue(record.area),
  deadlineTime: getEditDateValue(record.deadlineTime),
  debtIdCard: getEditTextValue(record.debtIdCard),
  overdueDays: getEditNumberValue(record.overdueDays),
  overdueAmount: getEditNumberValue(record.overdueAmount),
});

const normalizeEditText = (value: unknown) =>
  value === null || value === undefined ? '' : String(value).trim();

const normalizeEditNumber = (
  value: number | string | null | undefined,
): number | string | undefined =>
  value === null || value === undefined || value === '' ? undefined : value;

const toDebtUpdatePayload = (
  id: number | string,
  values: DebtEditFormValues,
): DebtRecordUpdatePayload => {
  const payload: DebtRecordUpdatePayload = {
    id,
    debtorName: getNonEmptyText(values.debtorName),
    debtorPhone: normalizeEditText(values.debtorPhone),
    city: normalizeEditText(values.city),
    organization: normalizeEditText(values.organization),
    debtorEmail: normalizeEditText(values.debtorEmail),
    reminderRemark: normalizeEditText(values.reminderRemark),
    address: normalizeEditText(values.address),
    area: normalizeEditText(values.area),
    debtIdCard: normalizeEditText(values.debtIdCard),
  };

  const debtAmount = normalizeEditNumber(values.debtAmount);
  if (debtAmount !== undefined) payload.debtAmount = debtAmount;
  const overdueAmount = normalizeEditNumber(values.overdueAmount);
  if (overdueAmount !== undefined) payload.overdueAmount = overdueAmount;
  const overdueDays = normalizeEditNumber(values.overdueDays);
  if (overdueDays !== undefined) payload.overdueDays = overdueDays;
  if (values.deadlineTime) {
    payload.deadlineTime = values.deadlineTime.format('YYYY-MM-DD');
  }

  return payload;
};

const getSemanticAnalysisDebtId = (source: Record<string, unknown>) =>
  getNonEmptyText(source.debtId, source.debtRecordId, source.recordId);

const hasSemanticArrayValue = (value: unknown) =>
  Array.isArray(value) && value.filter(Boolean).length > 0;

const isTruthySemanticFlag = (value: unknown) => {
  if (value === true) return true;
  const text = String(value ?? '')
    .trim()
    .toLowerCase();
  return text === 'true' || text === '1' || text === 'yes';
};

const hasInlineCommunicationAnalysis = (record: DebtRecordItem) => {
  const source = record as Record<string, unknown>;
  if (
    [
      source.hasSemanticAnalysis,
      source.hasAiCallAnalysis,
      source.hasAiCallFeedback,
      source.hasFeedback,
      source.semanticFeedbackAvailable,
    ].some(isTruthySemanticFlag)
  ) {
    return true;
  }

  if (
    [
      source.feedbackRecordCount,
      source.semanticFeedbackCount,
      source.aiCallFeedbackCount,
    ].some((value) => toNumber(value) > 0)
  ) {
    return true;
  }

  const analysisStatus = getNonEmptyText(
    source.latestAnalysisStatus,
    source.analysisStatus,
  );
  if (analysisStatus === '2' || analysisStatus === '分析成功') return true;

  return Boolean(
    getNonEmptyText(
      source.callSummary,
      source.latestSummary,
      source.summary,
      source.latestFeedbackType,
      source.feedbackType,
    ) ||
      [
        source.latestTags,
        source.tags,
        source.latestKeyPoints,
        source.keyPoints,
      ].some(hasSemanticArrayValue),
  );
};

const hasCommunicationAnalysis = (
  record: DebtRecordItem,
  feedbackDebtIds: Set<string>,
) => {
  const debtRecordId = normalizeDebtRecordId(record.id);
  return (
    hasInlineCommunicationAnalysis(record) ||
    Boolean(debtRecordId && feedbackDebtIds.has(debtRecordId))
  );
};

const getPersonaDisplayName = (
  persona?: PersonaItem | null,
  fallbackId?: string,
) => getNonEmptyText(persona?.personaName) || `画像 ID ${fallbackId || '-'}`;

const ensurePipelineProgressTaskId = (
  data: ImportPipelineProgressResult,
  fallbackTaskId?: string | number,
): ImportPipelineProgressResult => {
  const taskId = getNonEmptyText(data.taskId, fallbackTaskId);
  if (!taskId || data.taskId === taskId) return data;
  return { ...data, taskId };
};

const toFlowBatchStartFilter = (
  values: QueryFormValues | DebtRecordQuery,
): FlowBatchStartFilter => {
  const filter: FlowBatchStartFilter = {};
  const debtNumber = getNonEmptyText(values.debtNumber);
  const city = getNonEmptyText(values.city);
  const organization = getNonEmptyText(values.organization);
  if (debtNumber) filter.debtNumber = debtNumber;
  if (city) filter.city = city;
  if (organization) filter.organization = organization;
  return filter;
};

const isSameFlowBatchStartFilter = (
  left: QueryFormValues | DebtRecordQuery,
  right: QueryFormValues | DebtRecordQuery,
) => {
  const leftFilter = toFlowBatchStartFilter(left);
  const rightFilter = toFlowBatchStartFilter(right);
  return (
    leftFilter.debtNumber === rightFilter.debtNumber &&
    leftFilter.city === rightFilter.city &&
    leftFilter.organization === rightFilter.organization
  );
};

const formatCurrency = (value: unknown) =>
  currencyFormatter.format(toNumber(value));

const formatCompactCurrency = (value: unknown) => {
  const amount = toNumber(value);
  const absAmount = Math.abs(amount);

  if (absAmount >= 100000000) {
    return `¥${compactNumberFormatter.format(amount / 100000000)}亿`;
  }

  if (absAmount >= 10000) {
    return `¥${compactNumberFormatter.format(amount / 10000)}万`;
  }

  return formatCurrency(amount);
};

type StatDisplayValue = {
  primary: string;
  unit?: string;
  tooltip?: string;
};

const formatStatValue = (
  value: unknown,
  format: 'currency' | 'count',
  unit?: string,
): StatDisplayValue => {
  if (format === 'currency') {
    return {
      primary: formatCompactCurrency(value),
      tooltip: formatCurrency(value),
    };
  }

  return {
    primary: numberFormatter.format(toNumber(value)),
    unit,
  };
};

const getRowId = (record: DebtRecordItem) =>
  String(
    record.id ??
      record.debtNumber ??
      [
        record.batchId,
        record.taskId,
        record.debtorName,
        record.debtorPhone,
        record.createTime,
      ]
        .map((value) => String(value ?? ''))
        .join(':'),
  );

const normalizeTags = (tags: PersonaItem['tags']) => {
  if (Array.isArray(tags)) return tags.filter(Boolean).map(String);
  if (typeof tags === 'string') {
    return tags
      .split(/[,\s，、]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const getDebtorGenderText = (data?: DebtRecordDetail | null) =>
  toText(data?.debtorGender || data?.debtor_gender);

const getDebtorAgeText = (data?: DebtRecordDetail | null) => {
  const ageValue = data?.debtorAge ?? data?.debtor_age;
  if (ageValue === null || ageValue === undefined || ageValue === '')
    return '-';
  return `${ageValue} 岁`;
};

const renderCurrentStatusTag = (
  status: unknown,
  currentStatusReason?: unknown,
  flowStartErrorMessage?: unknown,
  options?: { preserveRaw?: boolean },
) => {
  const display = options?.preserveRaw
    ? resolveDebtRawStatusDisplay(status)
    : resolveDebtListStatusDisplay(status);
  const tag = <Tag color={display.color}>{display.text}</Tag>;
  const statusText = String(status ?? '').trim();
  const errorText =
    getNonEmptyText(currentStatusReason) ||
    (statusText === '发起失败' ? getNonEmptyText(flowStartErrorMessage) : '');
  const rawStatusText =
    !options?.preserveRaw && display.rawText && display.rawText !== display.text
      ? `细分状态：${display.rawText}`
      : '';
  const tooltipText = [rawStatusText, errorText].filter(Boolean).join('\n');

  if (tooltipText) {
    return (
      <Tooltip
        title={<span style={{ whiteSpace: 'pre-wrap' }}>{tooltipText}</span>}
      >
        {tag}
      </Tooltip>
    );
  }

  return tag;
};

const formatElapsed = (startTs: number) => {
  if (!startTs) return '0 秒';
  const seconds = Math.max(0, Math.floor((Date.now() - startTs) / 1000));
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  if (minutes < 60) return `${minutes} 分 ${remainSeconds} 秒`;
  const hours = Math.floor(minutes / 60);
  return `${hours} 小时 ${minutes % 60} 分`;
};

const formatDuration = (startTs: number, endTs: number) => {
  if (!startTs || !endTs || endTs < startTs) return '0 秒';
  const seconds = Math.max(0, Math.floor((endTs - startTs) / 1000));
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  if (minutes < 60) return `${minutes} 分 ${remainSeconds} 秒`;
  const hours = Math.floor(minutes / 60);
  return `${hours} 小时 ${minutes % 60} 分`;
};

type StatCardProps = {
  title: string;
  value: StatDisplayValue;
  icon: React.ReactNode;
  tone: MetricTone;
};

const statCardStyles = {
  body: {
    padding: 16,
  },
};

const StatCard = ({ title, value, icon, tone }: StatCardProps) => {
  const hasTooltip = Boolean(value.tooltip && value.tooltip !== value.primary);
  const valueNode = (
    <span
      style={{
        display: 'inline-flex',
        cursor: hasTooltip ? 'pointer' : 'default',
      }}
    >
      <Space align="baseline" size={4} wrap={false}>
        <Text
          strong
          style={{
            cursor: 'inherit',
            fontSize: 26,
            lineHeight: 1.2,
            wordBreak: 'keep-all',
            whiteSpace: 'nowrap',
          }}
        >
          {value.primary}
        </Text>
        {value.unit ? (
          <Text
            type="secondary"
            style={{ cursor: 'inherit', fontSize: 13, whiteSpace: 'nowrap' }}
          >
            {value.unit}
          </Text>
        ) : null}
      </Space>
    </span>
  );

  return (
    <ProCard style={{ minWidth: 0 }} styles={statCardStyles}>
      <div
        style={{
          minHeight: 82,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 12,
          minWidth: 0,
        }}
      >
        <Space align="center" size={10} wrap={false}>
          <MetricIcon
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
            icon={icon}
            tone={tone}
          />
          <Text type="secondary" style={{ lineHeight: 1.4 }} ellipsis>
            {title}
          </Text>
        </Space>
        {hasTooltip ? (
          <Tooltip title={value.tooltip}>{valueNode}</Tooltip>
        ) : (
          valueNode
        )}
      </div>
    </ProCard>
  );
};

const normalizeProgress = (value: unknown) =>
  Math.min(100, Math.max(0, Number(value) || 0));

const PIPELINE_PROCESSING_STATUSES = new Set<ImportPipelineStatus>([
  'importing',
  'processing',
]);
const PIPELINE_TERMINAL_STATUSES = new Set<ImportPipelineStatus>([
  'success',
  'failed',
  'partial_failed',
  'partial_success',
]);

const pipelineStatusTitleText: Record<ImportPipelineStatus, string> = {
  importing: '正在导入数据',
  processing: '正在处理后续任务',
  success: '全部完成',
  failed: '导入失败',
  partial_failed: '部分失败',
  partial_success: '已忽略失败',
};

const pipelineStatusDescriptionText: Record<ImportPipelineStatus, string> = {
  importing: '正在解析资产包并导入债务数据，请稍候。',
  processing: '债务数据已导入，正在进行附件解析和画像分类。',
  success: '全部任务已完成，数据已更新。',
  failed: '请修正文件后重新上传完整 ZIP。',
  partial_failed:
    '债务数据已导入，附件解析或画像分类存在失败记录，可重试或忽略后继续。',
  partial_success: '失败记录已忽略，本次导入流程已放行，仍可查看明细。',
};

const pipelineLegacyFailureDescriptionText = {
  import: '导入入库失败，请查看详情后修正文件并重新上传。',
  assetParse: '附件解析存在失败记录，请查看详情后重试或处理。',
  personaClassify: '画像分类存在失败记录，请查看详情后重试或处理。',
} as const;

const findPipelineSubTask = (
  data: ImportPipelineProgressResult,
  type: ImportPipelineSubTask['type'],
) => data.subTasks?.find((item) => item.type === type);

const isPipelineTerminal = (data?: ImportPipelineProgressResult | null) =>
  Boolean(data?.status && PIPELINE_TERMINAL_STATUSES.has(data.status));

const isPipelineProcessing = (data?: ImportPipelineProgressResult | null) =>
  Boolean(data?.status && PIPELINE_PROCESSING_STATUSES.has(data.status));

const hasRunningPipelineSubTaskInPayload = (
  data?: ImportPipelineProgressResult | null,
) =>
  Boolean(
    data?.subTasks?.some(
      (task) => task.status === 'pending' || task.status === 'processing',
    ),
  );

const normalizePipelinePayloadForRunningSubTasks = (
  data: ImportPipelineProgressResult,
): ImportPipelineProgressResult => {
  if (
    isPipelineTerminal(data) ||
    !hasRunningPipelineSubTaskInPayload(data) ||
    isPipelineProcessing(data)
  ) {
    return data;
  }
  return {
    ...data,
    status: 'processing',
    phase: '处理中',
    errorMessage: null,
    finishedAt: null,
  };
};

const getAssetParseUnmatchedCount = (task?: ImportPipelineSubTask | null) => {
  if (!task) return undefined;
  const candidates = [
    task.unmatchedCount,
    task.unmatchedAttachmentCount,
    task.unmatchedFileCount,
    task.unmatchedTotal,
  ];
  for (const value of candidates) {
    const count = toOptionalNumber(value);
    if (count !== undefined) return Math.max(0, count);
  }
  return undefined;
};

const toTimestamp = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  const timestamp =
    typeof value === 'number' ? value : new Date(String(value)).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const failureStageText: Record<ImportFailureStage, string> = {
  assetParse: '附件解析失败明细',
  assetParseUnmatched: '未匹配附件',
  personaClassify: '画像分类失败明细',
};

const pipelineTaskFallbackName: Record<string, string> = {
  debtImport: '导入入库',
  assetParse: '附件解析',
  personaClassify: '画像分类',
};

const pipelineListRefreshTaskTypes: Array<ImportPipelineSubTask['type']> = [
  'debtImport',
  'assetParse',
  'personaClassify',
];

type RetryablePipelineTaskType = 'assetParse' | 'personaClassify';

const isImportRetryStage = (
  type: ImportPipelineSubTask['type'],
): type is RetryablePipelineTaskType =>
  type === 'assetParse' || type === 'personaClassify';

const failureDetailActionText: Record<RetryablePipelineTaskType, string> = {
  assetParse: '查看明细',
  personaClassify: '查看明细',
};

const renderPersonaMarkdownContent = (value: unknown) => {
  const content = getNonEmptyText(value);
  return (
    <div className="min-h-40 text-sm leading-relaxed">
      {content ? (
        <XMarkdown>{content}</XMarkdown>
      ) : (
        <Empty description="暂无画像内容" />
      )}
    </div>
  );
};

const attachmentSuffixGroups = {
  image: new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']),
  pdf: new Set(['pdf']),
  word: new Set(['doc', 'docx']),
  excel: new Set(['xls', 'xlsx', 'csv']),
  ppt: new Set(['ppt', 'pptx']),
  archive: new Set(['zip', 'rar', '7z', 'tar', 'gz']),
  text: new Set(['txt', 'md', 'json', 'xml', 'log']),
};

const previewableAttachmentKinds = new Set<AttachmentFileKind>([
  'image',
  'pdf',
  'text',
]);

const getAttachmentSuffix = (record: DebtAttachmentItem) => {
  const explicitSuffix = getNonEmptyText(record.fileSuffix).replace(/^\./, '');
  if (explicitSuffix) return explicitSuffix.toLowerCase();

  const candidates = [
    record.originalName,
    record.fileName,
    record.name,
    record.attPath,
    record.docType,
    record.url,
    record.fileUrl,
  ];

  for (const candidate of candidates) {
    const text = getNonEmptyText(candidate);
    if (!text) continue;
    const normalized = text.replace(/^\./, '').toLowerCase();
    if (
      Object.values(attachmentSuffixGroups).some((group) =>
        group.has(normalized),
      )
    ) {
      return normalized;
    }
    const match = text.match(/\.([a-zA-Z0-9]+)(?:[?#].*)?$/);
    if (match?.[1]) return match[1].toLowerCase();
  }

  return '';
};

const getAttachmentKind = (record: DebtAttachmentItem): AttachmentFileKind => {
  const suffix = getAttachmentSuffix(record);
  if (attachmentSuffixGroups.image.has(suffix)) return 'image';
  if (attachmentSuffixGroups.pdf.has(suffix)) return 'pdf';
  if (attachmentSuffixGroups.word.has(suffix)) return 'word';
  if (attachmentSuffixGroups.excel.has(suffix)) return 'excel';
  if (attachmentSuffixGroups.ppt.has(suffix)) return 'ppt';
  if (attachmentSuffixGroups.archive.has(suffix)) return 'archive';
  if (attachmentSuffixGroups.text.has(suffix)) return 'text';
  return 'unknown';
};

const getAttachmentName = (record: DebtAttachmentItem) => {
  const name = getNonEmptyText(
    record.originalName,
    record.fileName,
    record.name,
    record.attPath,
    record.docType,
  );
  if (name) {
    return name.split(/[\\/]/).pop()?.split('?')[0] || name;
  }
  return record.ossId ? `附件_${record.ossId}` : '未命名附件';
};

const normalizeAttachmentUrl = (url: string) => {
  if (!url) return '';
  return url.replace(
    /^http:\/\/81\.68\.166\.109:9000(?=\/)/,
    'https://oss.lingchen-ai.com',
  );
};

const getAttachmentUrl = (record: DebtAttachmentItem) =>
  normalizeSafeResourceUrl(
    normalizeAttachmentUrl(getNonEmptyText(record.url, record.fileUrl)),
  ) || '';

const getAttachmentDownloadName = (record: DebtAttachmentItem) => {
  const name = getAttachmentName(record);
  const suffix = getAttachmentSuffix(record);
  return suffix && !name.toLowerCase().endsWith(`.${suffix}`)
    ? `${name}.${suffix}`
    : name;
};

const renderFailureReason = (
  value: unknown,
  type: 'danger' | 'warning' = 'danger',
) => {
  const lines = splitFailureMessageLines(value);
  const content = lines.join('\n');

  return (
    <Paragraph
      copyable={
        content !== '-'
          ? { text: content, tooltips: ['复制原因', '已复制'] }
          : false
      }
      ellipsis={{
        expandable: 'collapsible',
        rows: 2,
        symbol: (expanded) => (expanded ? '收起' : '展开'),
      }}
      style={{
        marginBottom: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
      type={type}
    >
      {content}
    </Paragraph>
  );
};

const DatelligencePage = () => {
  const [form] = Form.useForm<QueryFormValues>();
  const [debtEditForm] = Form.useForm<DebtEditFormValues>();
  const [messageApi, messageContextHolder] = message.useMessage();
  const { token } = theme.useToken();

  const [query, setQuery] = useState<DebtRecordQuery>({
    pageNum: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [loading, setLoading] = useState(false);
  const [recordList, setRecordList] = useState<DebtRecordItem[]>([]);
  const [recordTotal, setRecordTotal] = useState(0);
  const [stats, setStats] = useState<DebtStats>({});

  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<DebtRecordDetail | null>(null);
  const [attachmentPreview, setAttachmentPreview] =
    useState<AttachmentPreviewState>({
      open: false,
      fileUrl: '',
      fileName: '',
    });
  const [attachmentDownloadingKeys, setAttachmentDownloadingKeys] = useState<
    Set<string>
  >(new Set());

  const [personaOpen, setPersonaOpen] = useState(false);
  const [ownerInsightRecord, setOwnerInsightRecord] =
    useState<DebtRecordItem | null>(null);
  const [ownerInsightActiveTab, setOwnerInsightActiveTab] =
    useState<OwnerInsightTabKey>('persona');
  const [personaLoading, setPersonaLoading] = useState(false);
  const [personaData, setPersonaData] = useState<PersonaItem | null>(null);
  const [personaOriginInfo, setPersonaOriginInfo] =
    useState<PersonaOriginInfo | null>(null);
  const [personaActiveTab, setPersonaActiveTab] =
    useState<DetailTabKey>('classification');
  const [traceOpen, setTraceOpen] = useState(false);
  const [traceInstanceId, setTraceInstanceId] = useState<string>('');
  const [flowStartFailureOpen, setFlowStartFailureOpen] = useState(false);
  const [flowStartFailureRecord, setFlowStartFailureRecord] =
    useState<DebtRecordItem | null>(null);
  const [debtEditOpen, setDebtEditOpen] = useState(false);
  const [debtEditRecord, setDebtEditRecord] = useState<DebtRecordItem | null>(
    null,
  );
  const [debtEditSubmitting, setDebtEditSubmitting] = useState(false);
  const [flowStartRetrying, setFlowStartRetrying] = useState(false);
  const [communicationLogLoading, setCommunicationLogLoading] = useState(false);
  const [communicationLogDetail, setCommunicationLogDetail] =
    useState<OwnerCommunicationDetail | null>(null);
  const [communicationAnalysisDebtIds, setCommunicationAnalysisDebtIds] =
    useState<Set<string>>(new Set());

  const [uploadOpen, setUploadOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [taskDetailRefreshing, setTaskDetailRefreshing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadFileList, setUploadFileList] = useState<UploadFile[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    percent: 0,
    phase: '',
    errorMsg: '',
    current: 0,
    total: 0,
  });
  const [templateDownloading, setTemplateDownloading] = useState(false);

  const [importStageState, setImportStageState] = useState<PipelineStageState>({
    processing: false,
    failed: false,
    progress: 0,
    phase: '',
    errorMsg: '',
    current: 0,
    total: 0,
  });
  const [pipelinePhase, setPipelinePhase] = useState('');
  const [pipelineStatus, setPipelineStatus] = useState<
    ImportPipelineStatus | ''
  >('');
  const [pipelineSubTasks, setPipelineSubTasks] = useState<
    ImportPipelineSubTask[]
  >([]);
  const [assetParseUnmatchedSummary, setAssetParseUnmatchedSummary] = useState({
    taskId: '',
    total: 0,
  });

  const [parseState, setParseState] = useState<ParseState>({
    parsing: false,
    failed: false,
    progress: 0,
    phase: '',
    errorMsg: '',
    startTs: 0,
    execTaskId: '',
    rootTaskId: '',
    total: 0,
    current: 0,
    succeeded: 0,
    failedCount: 0,
  });
  const [parseElapsedTick, setParseElapsedTick] = useState(0);

  const [personaState, setPersonaState] = useState<PersonaProgressState>({
    processing: false,
    failed: false,
    taskId: '',
    progress: 0,
    phase: '',
    errorMsg: '',
    total: 0,
    pending: 0,
    processingCount: 0,
    succeeded: 0,
    failedCount: 0,
    timestamp: 0,
  });
  const [pipelineTaskId, setPipelineTaskId] = useState('');
  const [pipelineRestoring, setPipelineRestoring] = useState(true);
  const [pipelineTiming, setPipelineTiming] = useState<PipelineTimingState>({
    startedAt: 0,
    finishedAt: 0,
  });
  const [outboundStarting, setOutboundStarting] = useState(false);
  const [outboundFlowProcessing, setOutboundFlowProcessing] = useState(false);
  const [retryingPipelineTask, setRetryingPipelineTask] = useState(false);
  const [ignoringFailures, setIgnoringFailures] = useState(false);
  const [failureDrawerOpen, setFailureDrawerOpen] = useState(false);
  const [failureStage, setFailureStage] =
    useState<ImportFailureStage>('assetParse');
  const [failureLoading, setFailureLoading] = useState(false);
  const [failureRows, setFailureRows] = useState<ImportFailureDetail[]>([]);
  const [failureTotal, setFailureTotal] = useState(0);
  const [failurePage, setFailurePage] = useState({
    pageNum: 1,
    pageSize: FAILURE_PAGE_SIZE,
  });

  const requestSeqRef = useRef(0);
  const queryRef = useRef(query);
  const pipelinePollingTimerRef = useRef<number | null>(null);
  const outboundFlowPollingTimerRef = useRef<number | null>(null);
  const parseElapsedTimerRef = useRef<number | null>(null);
  const pipelineDelayedRefreshTimersRef = useRef<number[]>([]);
  const pipelineTerminalNotifiedRef = useRef<Record<string, string>>({});
  const pipelineDataRefreshMarkersRef = useRef<Record<string, true>>({});
  const pipelineProgressSeqRef = useRef(0);
  const pipelineProgressErrorCountRef = useRef(0);
  const outboundFlowProgressSeqRef = useRef(0);
  const retryingPipelineTaskRef = useRef(false);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const fetchDebtors = useCallback(
    async (params: DebtRecordQuery, options?: { silent?: boolean }) => {
      requestSeqRef.current += 1;
      const seq = requestSeqRef.current;
      const silent = Boolean(options?.silent);
      if (!silent) {
        setLoading(true);
        setCommunicationAnalysisDebtIds(new Set());
      }
      try {
        const res = await getDebtRecordPage(params);
        if (seq !== requestSeqRef.current) return;
        const data = res.data ?? {};
        const page = data.page ?? {};
        const rows = page.rows ?? [];
        const inlineAnalysisDebtIds = new Set(
          rows
            .filter(hasInlineCommunicationAnalysis)
            .map((record) => normalizeDebtRecordId(record.id))
            .filter(Boolean) as string[],
        );

        setRecordList(rows);
        setRecordTotal(Number(page.total) || 0);
        setStats(data.stats ?? {});
        setCommunicationAnalysisDebtIds(inlineAnalysisDebtIds);

        try {
          const feedbackRes = await getAiCallDebtFeedbackPage({
            pageNum: 1,
            pageSize: ANALYSIS_LOOKUP_PAGE_SIZE,
            analysisStatus: '2',
          });
          if (seq !== requestSeqRef.current) return;
          const feedbackDebtIds = new Set(inlineAnalysisDebtIds);
          for (const item of feedbackRes.rows || []) {
            const debtId = getSemanticAnalysisDebtId(
              item as Record<string, unknown>,
            );
            if (debtId) feedbackDebtIds.add(debtId);
          }
          setCommunicationAnalysisDebtIds(feedbackDebtIds);
        } catch {
          if (seq === requestSeqRef.current) {
            setCommunicationAnalysisDebtIds(inlineAnalysisDebtIds);
          }
        }
      } catch {
        if (seq === requestSeqRef.current && !silent) {
          setRecordList([]);
          setRecordTotal(0);
          setCommunicationAnalysisDebtIds(new Set());
        }
      } finally {
        if (seq === requestSeqRef.current && !silent) {
          setLoading(false);
        }
      }
    },
    [],
  );

  const loadFilterOptions = useCallback(async () => {
    setFilterLoading(true);
    try {
      const [citiesRes, projectsRes] = await Promise.all([
        getDebtCityOptions(),
        getDebtOrganizationOptions(),
      ]);
      setCityOptions(Array.isArray(citiesRes.data) ? citiesRes.data : []);
      setProjectOptions(
        Array.isArray(projectsRes.data) ? projectsRes.data : [],
      );
    } finally {
      setFilterLoading(false);
    }
  }, []);

  const stopPipelinePolling = useCallback(() => {
    if (pipelinePollingTimerRef.current) {
      window.clearInterval(pipelinePollingTimerRef.current);
      pipelinePollingTimerRef.current = null;
    }
  }, []);

  const stopParseElapsedTimer = useCallback(() => {
    if (parseElapsedTimerRef.current) {
      window.clearInterval(parseElapsedTimerRef.current);
      parseElapsedTimerRef.current = null;
    }
  }, []);

  const stopOutboundFlowPolling = useCallback(() => {
    if (outboundFlowPollingTimerRef.current) {
      window.clearInterval(outboundFlowPollingTimerRef.current);
      outboundFlowPollingTimerRef.current = null;
    }
  }, []);

  const clearPipelineDelayedRefreshTimers = useCallback(() => {
    for (const timer of pipelineDelayedRefreshTimersRef.current) {
      window.clearTimeout(timer);
    }
    pipelineDelayedRefreshTimersRef.current = [];
  }, []);

  const refreshAll = useCallback(() => {
    void loadFilterOptions().catch(() => undefined);
    void fetchDebtors(queryRef.current);
  }, [fetchDebtors, loadFilterOptions]);

  const schedulePipelineSettledRefresh = useCallback(() => {
    clearPipelineDelayedRefreshTimers();
    refreshAll();

    pipelineDelayedRefreshTimersRef.current =
      PIPELINE_SETTLED_REFRESH_DELAYS.map((delay) =>
        window.setTimeout(() => {
          refreshAll();
        }, delay),
      );
  }, [clearPipelineDelayedRefreshTimers, refreshAll]);

  const pollOutboundFlowProgress = useCallback(
    async (batchId: string | number, options?: { silent?: boolean }) => {
      outboundFlowProgressSeqRef.current += 1;
      const seq = outboundFlowProgressSeqRef.current;
      try {
        const res = await getFlowBatchProgress(batchId);
        if (seq !== outboundFlowProgressSeqRef.current) return;
        const data = res.data;
        if (!data) return;

        if (toNumber(data.pendingCount) > 0) return;

        stopOutboundFlowPolling();
        setOutboundFlowProcessing(false);
        refreshAll();

        const failedCount = toNumber(data.failedCount);
        if (failedCount > 0) {
          messageApi.warning(
            `催收流程发起完成，${numberFormatter.format(failedCount)} 条失败，可到流程管理查看`,
          );
          return;
        }

        if (!options?.silent) {
          messageApi.success('催收流程发起完成');
        }
      } catch {
        if (seq !== outboundFlowProgressSeqRef.current) return;
        stopOutboundFlowPolling();
        setOutboundFlowProcessing(false);
        refreshAll();
        messageApi.error('催收流程进度查询失败，请稍后刷新列表');
      }
    },
    [messageApi, refreshAll, stopOutboundFlowPolling],
  );

  const startOutboundFlowPolling = useCallback(
    (batchId: string | number) => {
      const normalizedBatchId = String(batchId || '');
      if (!normalizedBatchId) return;
      stopOutboundFlowPolling();
      setOutboundFlowProcessing(true);
      void pollOutboundFlowProgress(normalizedBatchId, { silent: true });
      outboundFlowPollingTimerRef.current = window.setInterval(() => {
        void pollOutboundFlowProgress(normalizedBatchId, { silent: true });
      }, FLOW_START_POLLING_INTERVAL);
    },
    [pollOutboundFlowProgress, stopOutboundFlowPolling],
  );

  const refreshDebtDataByPipelineProgress = useCallback(
    (data: ImportPipelineProgressResult) => {
      const taskId = String(data.taskId || '');
      if (!taskId) return;
      const pipelineTerminal = isPipelineTerminal(data);

      const markers: string[] = [];
      for (const taskType of pipelineListRefreshTaskTypes) {
        const task = findPipelineSubTask(data, taskType);
        if (task?.status === 'success') {
          markers.push(`${taskId}:${taskType}:success`);
        }
      }

      if (pipelineTerminal) {
        markers.push(`${taskId}:pipeline:${data.status || 'terminal'}`);
      }

      const newMarkers = markers.filter(
        (marker) => !pipelineDataRefreshMarkersRef.current[marker],
      );
      if (newMarkers.length === 0) return;

      for (const marker of newMarkers) {
        pipelineDataRefreshMarkersRef.current[marker] = true;
      }
      if (pipelineTerminal) {
        schedulePipelineSettledRefresh();
        return;
      }
      refreshAll();
    },
    [refreshAll, schedulePipelineSettledRefresh],
  );

  useEffect(() => {
    void loadFilterOptions();
    void fetchDebtors(query);
  }, [fetchDebtors, loadFilterOptions, query]);

  useEffect(() => {
    const isPageVisible = () =>
      typeof document === 'undefined' || document.visibilityState !== 'hidden';

    const refreshListByPolling = () => {
      if (
        !shouldPollDatelligenceList({
          pageVisible: isPageVisible(),
          hasPipelinePolling: Boolean(pipelinePollingTimerRef.current),
          hasOutboundFlowPolling: Boolean(outboundFlowPollingTimerRef.current),
        })
      ) {
        return;
      }

      void fetchDebtors(queryRef.current, { silent: true });
    };

    const timer = window.setInterval(
      refreshListByPolling,
      DATELLIGENCE_LIST_POLLING_INTERVAL,
    );

    document.addEventListener('visibilitychange', refreshListByPolling);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshListByPolling);
    };
  }, [fetchDebtors]);

  useEffect(
    () => () => {
      stopPipelinePolling();
      stopParseElapsedTimer();
      stopOutboundFlowPolling();
      clearPipelineDelayedRefreshTimers();
    },
    [
      clearPipelineDelayedRefreshTimers,
      stopOutboundFlowPolling,
      stopParseElapsedTimer,
      stopPipelinePolling,
    ],
  );

  const statCards = useMemo(
    () => [
      {
        key: 'totalOverdueAmount',
        title: '逾期总金额',
        value: formatStatValue(stats.totalOverdueAmount, 'currency'),
        hint: '逾期金额汇总',
        icon: <WalletOutlined />,
        tone: 'primary' as const,
      },
      {
        key: 'totalDebtorCount',
        title: '总逾期户数',
        value: formatStatValue(stats.totalDebtorCount, 'count', '户'),
        hint: '按债务人维度统计',
        icon: <TeamOutlined />,
        tone: 'info' as const,
      },
      {
        key: 'avgBillAmount',
        title: '平均单笔金额',
        value: formatStatValue(stats.avgBillAmount, 'currency'),
        hint: '逾期金额平均值',
        icon: <BarChartOutlined />,
        tone: 'warning' as const,
      },
      {
        key: 'avgOverdueDays',
        title: '加权平均账期',
        value: formatStatValue(stats.avgOverdueDays, 'count', '天'),
        hint: '按金额加权统计',
        icon: <FieldTimeOutlined />,
        tone: 'error' as const,
      },
      {
        key: 'projectCount',
        title: '覆盖项目数量',
        value: formatStatValue(stats.projectCount, 'count', '个'),
        hint: '去重后的项目数',
        icon: <ProjectOutlined />,
        tone: 'neutral' as const,
      },
    ],
    [stats],
  );

  const pipelineElapsedText = useMemo(() => {
    parseElapsedTick;
    if (!pipelineTiming.startedAt) return '0 秒';
    if (pipelineTiming.finishedAt) {
      return formatDuration(
        pipelineTiming.startedAt,
        pipelineTiming.finishedAt,
      );
    }
    return formatElapsed(pipelineTiming.startedAt);
  }, [parseElapsedTick, pipelineTiming.finishedAt, pipelineTiming.startedAt]);

  const isPipelineBusyStatus =
    pipelineStatus === 'importing' || pipelineStatus === 'processing';
  const hasPipelineRunningSubTask = pipelineSubTasks.some(
    (task) => task.status === 'processing',
  );
  const hasRetryablePipelineFailure = pipelineSubTasks.some(
    (task) =>
      isImportRetryStage(task.type) &&
      (task.status === 'failed' || Number(task.failedCount) > 0),
  );
  const isImportWorkflowProcessing =
    pipelineRestoring ||
    uploadState.uploading ||
    isPipelineBusyStatus ||
    importStageState.processing ||
    parseState.parsing ||
    personaState.processing;

  const hasImportFailureDetails =
    parseState.failedCount > 0 || personaState.failedCount > 0;
  const hasPostProcessFailureFacts =
    parseState.failed || personaState.failed || hasImportFailureDetails;
  const hasBlockingPipelineFailure =
    pipelineStatus === 'failed' || pipelineStatus === 'partial_failed';
  const hasLegacyImportFailure =
    !pipelineStatus && (importStageState.failed || hasPostProcessFailureFacts);
  const hasLegacyBlockingImportFailure =
    !pipelineStatus && hasPostProcessFailureFacts;
  const hasNonBlockingImportFailure =
    !pipelineStatus && importStageState.failed && !hasPostProcessFailureFacts;
  const showImportTaskProgress =
    Boolean(pipelineStatus) ||
    importStageState.processing ||
    importStageState.failed ||
    parseState.parsing ||
    parseState.failed ||
    personaState.processing ||
    personaState.failed ||
    hasImportFailureDetails;
  const importTaskFailed = hasBlockingPipelineFailure || hasLegacyImportFailure;
  const importTaskProcessing =
    importStageState.processing ||
    parseState.parsing ||
    personaState.processing;
  const importTaskAlertType =
    pipelineStatus === 'success'
      ? 'success'
      : pipelineStatus === 'partial_success' ||
          pipelineStatus === 'partial_failed'
        ? 'warning'
        : importTaskFailed
          ? 'error'
          : 'info';
  const canRetryPipelineFailures =
    pipelineStatus === 'partial_failed' &&
    !isPipelineBusyStatus &&
    !hasPipelineRunningSubTask &&
    hasRetryablePipelineFailure;
  const canIgnorePipelineFailures = canRetryPipelineFailures;
  const canDismissImportTaskNotice = !pipelineStatus && importTaskFailed;
  const importDisabledReason = (() => {
    if (isImportWorkflowProcessing) {
      return '当前任务处理中，请等待完成后再导入';
    }
    if (pipelineStatus === 'partial_failed') {
      return '后续处理存在失败，请先重试或忽略后再导入';
    }
    return '';
  })();
  const canImportAssetPackage = !importDisabledReason;
  const outboundDisabledReason = resolveOutboundStartDisabledReason({
    outboundStarting,
    outboundFlowProcessing,
    recordTotal,
    isImportWorkflowProcessing,
    pipelineStatus,
    hasBlockingImportFailure: hasLegacyBlockingImportFailure,
  });
  const outboundStartNotice = resolveOutboundStartNotice({
    pipelineStatus,
    hasNonBlockingImportFailure,
  });
  const canStartOutbound = !outboundDisabledReason;

  const importTaskTitle = pipelineStatus
    ? pipelineStatusTitleText[pipelineStatus]
    : importTaskFailed
      ? '导入失败'
      : '导入任务处理中';

  const importTaskDescription = useMemo(() => {
    if (pipelineStatus) {
      return pipelineStatusDescriptionText[pipelineStatus];
    }

    if (importStageState.failed) {
      return pipelineLegacyFailureDescriptionText.import;
    }

    if (parseState.failed) {
      return pipelineLegacyFailureDescriptionText.assetParse;
    }

    if (personaState.failed) {
      return pipelineLegacyFailureDescriptionText.personaClassify;
    }

    if (pipelinePhase) {
      return importTaskProcessing
        ? `${pipelinePhase}，已耗时 ${pipelineElapsedText}`
        : pipelinePhase;
    }

    if (parseState.parsing && personaState.processing) {
      return '资产解析与画像分析并行处理中';
    }

    if (importStageState.processing) {
      const countText =
        importStageState.total > 0
          ? `，已处理 ${importStageState.current}/${importStageState.total}`
          : '';
      return `导入入库：${importStageState.phase || '处理中'}${countText}`;
    }

    if (parseState.parsing) {
      return `资产解析：${parseState.phase || '处理中'}，已耗时 ${pipelineElapsedText}`;
    }

    if (personaState.processing) {
      return `画像分析：${personaState.phase || '处理中'}，已完成 ${personaState.succeeded}/${personaState.total || '-'}`;
    }

    return '后续任务准备中';
  }, [
    importStageState.current,
    importStageState.failed,
    importStageState.phase,
    importStageState.processing,
    importStageState.total,
    importTaskProcessing,
    pipelineElapsedText,
    pipelinePhase,
    pipelineStatus,
    parseState.failed,
    parseState.parsing,
    parseState.phase,
    personaState.failed,
    personaState.phase,
    personaState.processing,
    personaState.succeeded,
    personaState.total,
  ]);

  const assetParseUnmatchedProbeKey = useMemo(() => {
    const assetTask = pipelineSubTasks.find(
      (task) => task.type === 'assetParse',
    );
    if (!pipelineTaskId || !assetTask) return '';
    if (getAssetParseUnmatchedCount(assetTask) !== undefined) return '';
    if (assetTask.status === 'pending' || assetTask.status === 'processing') {
      return '';
    }
    return [
      pipelineTaskId,
      assetTask.taskId,
      assetTask.execTaskId,
      assetTask.status,
      assetTask.current,
      assetTask.total,
      assetTask.successCount,
      assetTask.failedCount,
    ]
      .map((item) => String(item ?? ''))
      .join('|');
  }, [pipelineSubTasks, pipelineTaskId]);

  useEffect(() => {
    const taskId = String(pipelineTaskId || '');
    if (!taskId || !assetParseUnmatchedProbeKey) {
      setAssetParseUnmatchedSummary((prev) =>
        prev.taskId || prev.total ? { taskId: '', total: 0 } : prev,
      );
      return;
    }

    let cancelled = false;
    const loadAssetParseUnmatchedTotal = async () => {
      try {
        const res = await getAssetParseUnmatchedPage(taskId, {
          pageNum: 1,
          pageSize: 1,
        });
        if (cancelled) return;
        setAssetParseUnmatchedSummary({
          taskId,
          total: Number(res.total) || 0,
        });
      } catch {
        if (!cancelled) {
          setAssetParseUnmatchedSummary({ taskId, total: 0 });
        }
      }
    };

    void loadAssetParseUnmatchedTotal();
    return () => {
      cancelled = true;
    };
  }, [assetParseUnmatchedProbeKey, pipelineTaskId]);

  const applyQuery = (next: DebtRecordQuery) => {
    setQuery(next);
  };

  const handleSearch = () => {
    const values = form.getFieldsValue();
    applyQuery({
      ...query,
      pageNum: 1,
      debtNumber: values.debtNumber?.trim() || undefined,
      city: values.city,
      organization: values.organization,
    });
  };

  const handleReset = () => {
    form.resetFields();
    applyQuery({
      pageNum: 1,
      pageSize: query.pageSize || DEFAULT_PAGE_SIZE,
    });
  };

  const resetUploadState = () => {
    setSelectedFile(null);
    setUploadFileList([]);
    setUploadState({
      uploading: false,
      percent: 0,
      phase: '',
      errorMsg: '',
      current: 0,
      total: 0,
    });
  };

  const openUploadDialog = () => {
    if (!canImportAssetPackage) {
      messageApi.warning(importDisabledReason);
      return;
    }
    resetUploadState();
    setUploadOpen(true);
  };

  const handleDownloadTemplate = async () => {
    setTemplateDownloading(true);
    try {
      await downloadDebtImportTemplate();
    } catch {
      messageApi.error('下载模板失败');
    } finally {
      setTemplateDownloading(false);
    }
  };

  const uploadProps: UploadProps = {
    accept: '.zip',
    maxCount: 1,
    fileList: uploadFileList,
    beforeUpload: (file) => {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        messageApi.warning('仅支持上传 zip 压缩包');
        return Upload.LIST_IGNORE;
      }
      setSelectedFile(file);
      setUploadFileList([
        {
          uid: file.uid,
          name: file.name,
          status: 'done',
        },
      ]);
      return false;
    },
    onRemove: () => {
      setSelectedFile(null);
      setUploadFileList([]);
    },
  };

  const dismissParseError = () => {
    setParseState((prev) => ({
      ...prev,
      parsing: false,
      failed: false,
      progress: 0,
      phase: '',
      errorMsg: '',
      startTs: 0,
      current: 0,
      total: 0,
      succeeded: 0,
      failedCount: 0,
    }));
  };

  const dismissPersonaError = () => {
    setPersonaState((prev) => ({
      ...prev,
      processing: false,
      failed: false,
      progress: 0,
      phase: '',
      errorMsg: '',
      total: 0,
      pending: 0,
      processingCount: 0,
      succeeded: 0,
      failedCount: 0,
    }));
  };

  const dismissImportTaskErrors = () => {
    stopPipelinePolling();
    setImportStageState({
      processing: false,
      failed: false,
      progress: 0,
      phase: '',
      errorMsg: '',
      current: 0,
      total: 0,
    });
    setPipelinePhase('');
    setPipelineStatus('');
    setPipelineSubTasks([]);
    setPipelineTiming({ startedAt: 0, finishedAt: 0 });
    if (parseState.failed) {
      dismissParseError();
    }
    if (personaState.failed) {
      dismissPersonaError();
    }
    setPipelineTaskId('');
    setTaskDetailOpen(false);
  };

  const ensureParseElapsedTimer = useCallback(() => {
    if (parseElapsedTimerRef.current) return;
    parseElapsedTimerRef.current = window.setInterval(() => {
      setParseElapsedTick((tick) => tick + 1);
    }, 1000);
  }, []);

  const applyPipelineProgress = useCallback(
    (data: ImportPipelineProgressResult) => {
      pipelineProgressErrorCountRef.current = 0;
      const taskId = String(data.taskId || '');
      const importTask = findPipelineSubTask(data, 'debtImport');
      const parseTask = findPipelineSubTask(data, 'assetParse');
      const personaTask = findPipelineSubTask(data, 'personaClassify');
      const hasSubTasks = Boolean(data.subTasks?.length);
      const importStatus = importTask?.status;
      const parseStatus = parseTask?.status;
      const personaStatus = personaTask?.status;
      const startedAt = toTimestamp(data.startedAt);
      const finishedAt = toTimestamp(data.finishedAt);
      const parseSuccessCount = Number(parseTask?.successCount ?? 0) || 0;
      const parseFailedCount = Number(parseTask?.failedCount ?? 0) || 0;
      const parseCurrent =
        Number(parseTask?.current ?? 0) || parseSuccessCount + parseFailedCount;
      const parseTotal = Number(parseTask?.total ?? 0) || 0;
      const importFinished =
        importStatus === 'success' ||
        data.status === 'processing' ||
        data.status === 'success' ||
        data.status === 'partial_failed' ||
        data.status === 'partial_success';
      const importFailed =
        importStatus === 'failed' || (!hasSubTasks && data.status === 'failed');
      const personaSuccessCount = Number(personaTask?.successCount ?? 0) || 0;
      const personaFailedCount = Number(personaTask?.failedCount ?? 0) || 0;
      const personaCurrent =
        Number(personaTask?.current ?? 0) ||
        personaSuccessCount + personaFailedCount;
      const personaTotal = Number(personaTask?.total ?? 0) || 0;
      const parseFinished =
        parseStatus === 'success' || data.status === 'success';
      const parseFailed =
        parseStatus === 'failed' ||
        (data.status === 'partial_failed' && parseFailedCount > 0);
      const personaFinished =
        personaStatus === 'success' || data.status === 'success';
      const personaFailed =
        personaStatus === 'failed' ||
        (data.status === 'partial_failed' && personaFailedCount > 0);
      const pipelineProcessing = isPipelineProcessing(data);

      if (taskId) {
        setPipelineTaskId(taskId);
      }
      setPipelineStatus(data.status || '');
      setPipelinePhase(data.phase || '');
      setPipelineSubTasks(data.subTasks ?? []);
      setPipelineTiming({
        startedAt,
        finishedAt,
      });

      setImportStageState({
        processing:
          (data.status === 'importing' || importStatus === 'processing') &&
          !importFailed,
        failed: importFailed,
        progress: normalizeProgress(
          importTask?.progress ?? (importFinished ? 100 : data.progress),
        ),
        phase:
          importTask?.phase ||
          (importFinished ? '已完成' : data.phase || '等待导入'),
        errorMsg: importTask?.errorMessage || '',
        current: Number(importTask?.current ?? 0) || 0,
        total: Number(importTask?.total ?? 0) || 0,
      });

      setParseState({
        parsing: parseStatus === 'processing' && !parseFailed,
        failed: parseFailed,
        progress: normalizeProgress(
          parseTask?.progress ?? (parseFinished ? 100 : 0),
        ),
        phase: parseTask?.phase || (parseFinished ? '已完成' : '等待附件解析'),
        errorMsg: parseTask?.errorMessage || data.errorMessage || '',
        startTs: startedAt,
        execTaskId: parseTask?.execTaskId || '',
        rootTaskId: taskId,
        total: parseTotal,
        current: parseCurrent,
        succeeded: parseSuccessCount,
        failedCount: parseFailedCount,
      });

      setPersonaState((prev) => ({
        processing: personaStatus === 'processing' && !personaFailed,
        failed: personaFailed,
        taskId: String(personaTask?.taskId || data.taskId || prev.taskId || ''),
        progress: normalizeProgress(
          personaTask?.progress ?? (personaFinished ? 100 : 0),
        ),
        phase:
          personaTask?.phase ||
          (personaFinished ? '已完成' : data.phase || '等待画像分析'),
        errorMsg:
          personaTask?.errorMessage ||
          (personaFailed ? data.errorMessage || '画像分析失败' : ''),
        total: personaTotal,
        pending: Math.max(0, personaTotal - personaCurrent),
        processingCount: personaStatus === 'processing' ? personaCurrent : 0,
        succeeded: personaSuccessCount,
        failedCount: personaFailedCount,
        timestamp: finishedAt || startedAt,
      }));

      if (pipelineProcessing) {
        ensureParseElapsedTimer();
      } else {
        stopParseElapsedTimer();
      }

      refreshDebtDataByPipelineProgress(data);
    },
    [
      ensureParseElapsedTimer,
      refreshDebtDataByPipelineProgress,
      stopParseElapsedTimer,
    ],
  );

  const notifyPipelineTerminal = useCallback(
    (data: ImportPipelineProgressResult) => {
      const taskId = String(data.taskId || '');
      if (!taskId || !isPipelineTerminal(data)) return;
      if (pipelineTerminalNotifiedRef.current[taskId] === data.status) return;

      pipelineTerminalNotifiedRef.current[taskId] = data.status || '';
      switch (data.status) {
        case 'success':
          messageApi.success('导入及后续处理完成，数据已更新');
          break;
        case 'partial_success':
          messageApi.success('导入完成，异常已忽略');
          break;
        case 'partial_failed':
          messageApi.warning('导入成功，后续处理部分失败，请查看详情后处理');
          break;
        case 'failed': {
          messageApi.error('导入失败，请查看详情或重新上传完整 ZIP');
          break;
        }
        default:
          break;
      }
    },
    [messageApi],
  );

  const pollPipelineProgress = useCallback(
    async (
      taskId: string | number,
      options?: { silent?: boolean; tolerateTransientError?: boolean },
    ) => {
      pipelineProgressSeqRef.current += 1;
      const seq = pipelineProgressSeqRef.current;
      const normalizedTaskId = String(taskId || '');
      try {
        const res = await getAssetPackagePipelineProgress(taskId);
        if (seq !== pipelineProgressSeqRef.current) return;
        const data = res.data
          ? ensurePipelineProgressTaskId(res.data, normalizedTaskId)
          : undefined;
        if (!data) return;
        const normalizedData = normalizePipelinePayloadForRunningSubTasks(data);
        applyPipelineProgress(normalizedData);
        if (isPipelineTerminal(normalizedData)) {
          stopPipelinePolling();
          if (!options?.silent) {
            notifyPipelineTerminal(normalizedData);
          }
        }
      } catch {
        if (seq !== pipelineProgressSeqRef.current) return;
        if (options?.tolerateTransientError) {
          pipelineProgressErrorCountRef.current += 1;
          if (
            pipelineProgressErrorCountRef.current <
            PIPELINE_PROGRESS_MAX_TRANSIENT_ERRORS
          ) {
            setPipelinePhase('正在确认导入任务状态');
            setImportStageState((prev) => ({
              ...prev,
              processing: true,
              failed: false,
              phase: '正在确认导入任务状态',
            }));
            return;
          }
        }
        pipelineProgressErrorCountRef.current = 0;
        stopPipelinePolling();
        stopParseElapsedTimer();
        setPipelineTaskId('');
        setPipelineStatus('');
        setPipelinePhase('');
        setPipelineSubTasks([]);
        setPipelineTiming({ startedAt: 0, finishedAt: 0 });
        setAssetParseUnmatchedSummary({ taskId: '', total: 0 });
        setImportStageState((prev) => ({
          ...prev,
          processing: false,
          failed: true,
          errorMsg: '查询导入进度失败，请刷新页面重试',
        }));
        setParseState((prev) => ({
          ...prev,
          parsing: false,
          failed: false,
          rootTaskId: '',
          failedCount: 0,
        }));
        setPersonaState((prev) => ({
          ...prev,
          processing: false,
          failed: false,
          failedCount: 0,
        }));
      }
    },
    [
      applyPipelineProgress,
      notifyPipelineTerminal,
      stopParseElapsedTimer,
      stopPipelinePolling,
    ],
  );

  const startPipelinePolling = useCallback(
    (
      taskId: string | number,
      options?: {
        silent?: boolean;
        initialStatus?: ImportPipelineStatus;
        initialPhase?: string;
      },
    ) => {
      const normalizedTaskId = String(taskId);
      if (!normalizedTaskId) return;
      stopPipelinePolling();
      clearPipelineDelayedRefreshTimers();
      pipelineProgressErrorCountRef.current = 0;
      setPipelineTaskId(normalizedTaskId);
      setPipelineStatus(options?.initialStatus || 'importing');
      setPipelinePhase(options?.initialPhase || '等待导入');
      setPipelineSubTasks([]);
      setRetryingPipelineTask(false);
      retryingPipelineTaskRef.current = false;
      setIgnoringFailures(false);
      setParseElapsedTick(0);
      setPipelineTiming({
        startedAt: Date.now(),
        finishedAt: 0,
      });
      setImportStageState({
        processing: true,
        failed: false,
        progress: 0,
        phase: '等待导入',
        errorMsg: '',
        current: 0,
        total: 0,
      });
      setParseState((prev) => ({
        ...prev,
        parsing: false,
        failed: false,
        phase: '等待附件解析',
        errorMsg: '',
        rootTaskId: normalizedTaskId,
        startTs: Date.now(),
        current: 0,
        total: 0,
        succeeded: 0,
        failedCount: 0,
      }));
      void pollPipelineProgress(normalizedTaskId, {
        ...options,
        tolerateTransientError: true,
      });
      pipelinePollingTimerRef.current = window.setInterval(() => {
        void pollPipelineProgress(normalizedTaskId, {
          tolerateTransientError: true,
        });
      }, TASK_POLLING_INTERVAL);
    },
    [
      clearPipelineDelayedRefreshTimers,
      pollPipelineProgress,
      stopPipelinePolling,
    ],
  );

  const openTaskDetail = useCallback(() => {
    setTaskDetailOpen(true);
    const taskId = String(pipelineTaskId || '');
    if (!taskId) return;

    setTaskDetailRefreshing(true);
    void pollPipelineProgress(taskId, {
      silent: true,
      tolerateTransientError: isPipelineBusyStatus || importTaskProcessing,
    }).finally(() => {
      setTaskDetailRefreshing(false);
    });
  }, [
    importTaskProcessing,
    isPipelineBusyStatus,
    pipelineTaskId,
    pollPipelineProgress,
  ]);

  const closeTaskDetail = useCallback(() => {
    setTaskDetailOpen(false);
    const taskId = String(pipelineTaskId || '');
    if (!taskId) return;

    void pollPipelineProgress(taskId, {
      silent: true,
      tolerateTransientError: isPipelineBusyStatus || importTaskProcessing,
    });
  }, [
    importTaskProcessing,
    isPipelineBusyStatus,
    pipelineTaskId,
    pollPipelineProgress,
  ]);

  useEffect(() => {
    let mounted = true;
    const restoreCurrentPipeline = async () => {
      try {
        const res = await getCurrentAssetPackagePipelineProgress();
        const data = res.data;
        if (mounted && data) {
          applyPipelineProgress(data);
          if (data.taskId && isPipelineProcessing(data)) {
            startPipelinePolling(data.taskId, {
              silent: true,
              initialStatus: data.status,
              initialPhase: data.phase || '处理中',
            });
          }
        } else if (mounted) {
          setPipelineTaskId('');
          setPipelineStatus('');
          setPipelinePhase('');
          setPipelineSubTasks([]);
        }
      } catch {
        // current 是页面恢复状态的唯一来源；失败时不使用本地任务 ID 兜底。
      } finally {
        if (mounted) {
          setPipelineRestoring(false);
        }
      }
    };

    void restoreCurrentPipeline();
    return () => {
      mounted = false;
    };
  }, [applyPipelineProgress, startPipelinePolling]);

  const submitUpload = async () => {
    if (!canImportAssetPackage) {
      messageApi.warning(importDisabledReason);
      return;
    }
    if (!selectedFile) {
      messageApi.warning('请选择要导入的 zip 文件');
      return;
    }

    setUploadState({
      uploading: true,
      percent: 0,
      phase: '准备上传',
      errorMsg: '',
      current: 0,
      total: 0,
    });

    try {
      setUploadState((prev) => ({ ...prev, phase: '上传文件至 OSS...' }));
      const uploadRes = await uploadOssFile(selectedFile, (event) => {
        const total = event.total;
        if (total) {
          setUploadState((prev) => ({
            ...prev,
            percent: Math.floor(((event.loaded || 0) / total) * 50),
          }));
        }
      });
      const ossId = uploadRes.data?.ossId;
      if (!ossId) {
        throw new Error('文件上传成功但未返回 OSS ID');
      }

      setUploadState((prev) => ({
        ...prev,
        phase: '创建导入任务中...',
        percent: Math.max(prev.percent, 70),
      }));
      const importRes = await submitAssetPackageImport({ ossId });
      const taskId = importRes.data;

      if (!taskId) {
        setUploadState((prev) => ({
          ...prev,
          phase: '查询导入任务状态...',
          percent: Math.max(prev.percent, 80),
        }));
        const currentRes = await getCurrentAssetPackagePipelineProgress();
        const currentTask = currentRes.data;
        if (!currentTask?.taskId) {
          throw new Error('导入任务已提交，但后端未返回可追踪的批次 ID');
        }
        setUploadState((prev) => ({
          ...prev,
          uploading: false,
          percent: 100,
          phase: '导入任务已创建',
        }));
        setUploadOpen(false);
        messageApi.success('资产包导入任务已创建，正在后台处理');
        refreshAll();
        applyPipelineProgress(currentTask);
        if (isPipelineProcessing(currentTask)) {
          startPipelinePolling(currentTask.taskId, {
            initialStatus: currentTask.status,
            initialPhase: currentTask.phase || '处理中',
          });
        }
        return;
      }

      setUploadState((prev) => ({
        ...prev,
        uploading: false,
        percent: 100,
        phase: '导入任务已创建',
      }));
      setUploadOpen(false);
      messageApi.success('资产包导入任务已创建，正在后台处理');
      refreshAll();
      startPipelinePolling(taskId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '系统异常，请联系管理员';
      setUploadState((prev) => ({
        ...prev,
        uploading: false,
        errorMsg: message,
      }));
    }
  };

  const getAttachmentKey = (record: DebtAttachmentItem, index = 0) =>
    String(record.ossId ?? record.fileName ?? record.docType ?? index);

  const enrichDebtAttachments = async (attachments: DebtAttachmentItem[]) => {
    const ossIds = attachments
      .map((item) => item.ossId)
      .filter((ossId) => ossId !== undefined && ossId !== null && ossId !== '')
      .map(String);

    if (!ossIds.length) return attachments;

    try {
      const response = await listOssByIds(
        Array.from(new Set(ossIds)).join(','),
      );
      const ossMap = new Map(
        (response.data ?? [])
          .filter((item) => item.ossId !== undefined && item.ossId !== null)
          .map((item) => [String(item.ossId), item]),
      );

      return attachments.map((attachment) => {
        const ossId = attachment.ossId;
        const oss =
          ossId === undefined || ossId === null
            ? undefined
            : ossMap.get(String(ossId));
        return oss ? { ...attachment, ...oss } : attachment;
      });
    } catch {
      messageApi.warning('附件文件信息加载失败，已显示基础信息');
      return attachments;
    }
  };

  const openDebtDetail = async (record: DebtRecordItem) => {
    if (record.id === undefined || record.id === null) {
      messageApi.warning('债务记录 ID 为空，无法查询详情');
      return;
    }

    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await getDebtRecordDetail(record.id);
      const attachments = Array.isArray(res.data?.attachments)
        ? await enrichDebtAttachments(res.data.attachments)
        : [];
      setDetailData({
        ...(res.data ?? {}),
        attachments,
      });
    } catch {
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openPersonaDetail = useCallback(
    async (record: DebtRecordItem) => {
      const personaId = normalizePersonaId(record.personaId);
      const debtRecordId = normalizeDebtRecordId(record.id);
      const shouldLoadCommunication = hasCommunicationAnalysis(
        record,
        communicationAnalysisDebtIds,
      );

      if (!personaId && !shouldLoadCommunication) {
        messageApi.warning('当前债务记录暂无用户画像或语义分析');
        return;
      }

      setPersonaOpen(true);
      setOwnerInsightRecord(record);
      setOwnerInsightActiveTab(personaId ? 'persona' : 'communication');
      setPersonaLoading(Boolean(personaId));
      setCommunicationLogLoading(
        Boolean(shouldLoadCommunication && debtRecordId),
      );
      setPersonaActiveTab('classification');
      setPersonaData(null);
      setPersonaOriginInfo(null);
      setCommunicationLogDetail(null);

      const tasks: Promise<void>[] = [];

      if (personaId) {
        tasks.push(
          (async () => {
            const initialPersonaId = normalizePersonaId(
              record.initialPersonaId,
            );
            const shouldShowInitialPersona =
              Boolean(initialPersonaId) && initialPersonaId !== personaId;
            try {
              const [currentResult, initialResult] = await Promise.allSettled([
                getPersona(personaId),
                shouldShowInitialPersona && initialPersonaId
                  ? getPersona(initialPersonaId)
                  : Promise.resolve(null),
              ] as const);

              if (currentResult.status !== 'fulfilled') {
                throw currentResult.reason;
              }

              setPersonaData(currentResult.value.data ?? null);
              if (shouldShowInitialPersona && initialPersonaId) {
                const initialPersona =
                  initialResult.status === 'fulfilled'
                    ? initialResult.value?.data
                    : null;
                setPersonaOriginInfo({
                  currentPersonaId: personaId,
                  initialPersonaId,
                  initialPersonaName: getPersonaDisplayName(
                    initialPersona,
                    initialPersonaId,
                  ),
                });
              }
            } catch {
              messageApi.error('加载用户画像失败');
              setPersonaData(null);
              setPersonaOriginInfo(null);
            } finally {
              setPersonaLoading(false);
            }
          })(),
        );
      }

      if (shouldLoadCommunication && debtRecordId) {
        const fallbackTimeline: AiCallDebtTimeline = {
          debtId: debtRecordId,
          debtorName: getNonEmptyText(record.debtorName, '未知业主'),
          debtorPhone: getNonEmptyText(record.debtorPhone),
          organization: getNonEmptyText(record.organization, '未归属项目'),
          callSummary: '暂无语义分析数据',
          records: [],
        };
        tasks.push(
          (async () => {
            try {
              const res = await getAiCallDebtTimeline(debtRecordId);
              const data = res.data || {};
              const timeline: AiCallDebtTimeline = {
                debtId: debtRecordId,
                debtorName: getNonEmptyText(
                  data.debtorName,
                  record.debtorName,
                  '未知业主',
                ),
                debtorPhone: getNonEmptyText(
                  data.debtorPhone,
                  record.debtorPhone,
                ),
                organization: getNonEmptyText(
                  data.organization,
                  record.organization,
                  '未归属项目',
                ),
                callSummary: getNonEmptyText(
                  data.callSummary,
                  fallbackTimeline.callSummary,
                ),
                records: Array.isArray(data.records) ? data.records : [],
              };
              setCommunicationLogDetail(
                buildCommunicationDetail(timeline, null, timeline.callSummary),
              );
            } catch {
              messageApi.error('加载语义分析失败');
              setCommunicationLogDetail(null);
            } finally {
              setCommunicationLogLoading(false);
            }
          })(),
        );
      } else {
        setCommunicationLogLoading(false);
      }

      await Promise.allSettled(tasks);
    },
    [communicationAnalysisDebtIds, messageApi],
  );

  const openFlowTrace = useCallback(
    (record: DebtRecordItem) => {
      const flowId = normalizeFlowId(record.flowId);
      if (flowId) {
        setFlowStartFailureOpen(false);
        setFlowStartFailureRecord(null);
        setTraceInstanceId(flowId);
        setTraceOpen(true);
        return;
      }

      if (isFlowStartFailedRecord(record)) {
        setTraceOpen(false);
        setTraceInstanceId('');
        setFlowStartFailureRecord(record);
        setFlowStartFailureOpen(true);
        return;
      }

      messageApi.warning('当前债务暂无流程实例');
    },
    [messageApi],
  );

  const closeDebtEdit = useCallback(() => {
    setDebtEditOpen(false);
    setDebtEditRecord(null);
    debtEditForm.resetFields();
  }, [debtEditForm]);

  const openFlowStartDebtEdit = useCallback(() => {
    if (!flowStartFailureRecord?.id) {
      messageApi.warning('债务记录 ID 为空，无法编辑');
      return;
    }
    setDebtEditRecord(flowStartFailureRecord);
    debtEditForm.setFieldsValue(toDebtEditFormValues(flowStartFailureRecord));
    setDebtEditOpen(true);
  }, [debtEditForm, flowStartFailureRecord, messageApi]);

  const submitDebtEdit = useCallback(
    async (values: DebtEditFormValues) => {
      if (!debtEditRecord?.id) {
        messageApi.warning('债务记录 ID 为空，无法保存');
        return;
      }

      setDebtEditSubmitting(true);
      try {
        await updateDebtRecord(toDebtUpdatePayload(debtEditRecord.id, values));
        messageApi.success('债务信息已保存');
        closeDebtEdit();
        try {
          const detailRes = await getDebtRecordDetail(debtEditRecord.id);
          setFlowStartFailureRecord((prev) =>
            prev && String(prev.id) === String(debtEditRecord.id)
              ? { ...prev, ...(detailRes.data ?? {}) }
              : prev,
          );
        } catch {
          // 列表刷新是兜底来源，详情刷新失败时不阻塞本次保存。
        }
        refreshAll();
      } finally {
        setDebtEditSubmitting(false);
      }
    },
    [closeDebtEdit, debtEditRecord, messageApi, refreshAll],
  );

  const retryFlowStartFailure = useCallback(async () => {
    const record = flowStartFailureRecord;
    const batchId = normalizeFlowStartBatchId(record?.flowStartBatchId);
    const debtRecordId = normalizeDebtRecordId(record?.id);
    if (!batchId || !debtRecordId) {
      messageApi.warning('缺少发起批次或债务记录 ID，无法重新发起');
      return;
    }

    setFlowStartRetrying(true);
    try {
      const res = await retryFailedDebtFlowStart(batchId, debtRecordId);
      const result = res.data;
      if (toNumber(result?.acceptedCount) > 0) {
        messageApi.success('重新发起已受理');
        setFlowStartFailureOpen(false);
        setFlowStartFailureRecord(null);
        closeDebtEdit();
        startOutboundFlowPolling(result?.batchId || batchId);
        refreshAll();
        return;
      }

      messageApi.warning('当前记录不满足重新发起条件，请刷新后查看状态');
      refreshAll();
    } finally {
      setFlowStartRetrying(false);
    }
  }, [
    closeDebtEdit,
    flowStartFailureRecord,
    messageApi,
    refreshAll,
    startOutboundFlowPolling,
  ]);

  const loadFailureDetails = useCallback(
    async (
      stage: ImportFailureStage,
      pageNum = 1,
      pageSize = FAILURE_PAGE_SIZE,
    ) => {
      if (!pipelineTaskId) {
        messageApi.warning('当前资产包批次 ID 为空，无法查询明细');
        return;
      }
      setFailureLoading(true);
      try {
        const params = { pageNum, pageSize };
        const requestMap = {
          assetParse: getAssetParseFailurePage,
          assetParseUnmatched: getAssetParseUnmatchedPage,
          personaClassify: getPersonaClassifyFailurePage,
        };
        const res = await requestMap[stage](pipelineTaskId, params);
        setFailureRows(res.rows ?? []);
        setFailureTotal(Number(res.total) || 0);
        setFailurePage({ pageNum, pageSize });
      } catch {
        setFailureRows([]);
        setFailureTotal(0);
      } finally {
        setFailureLoading(false);
      }
    },
    [messageApi, pipelineTaskId],
  );

  const openFailureDrawer = (stage: ImportFailureStage) => {
    setFailureStage(stage);
    setFailureRows([]);
    setFailureTotal(0);
    setFailurePage({ pageNum: 1, pageSize: FAILURE_PAGE_SIZE });
    setFailureDrawerOpen(true);
    void loadFailureDetails(stage, 1, FAILURE_PAGE_SIZE);
  };

  const retryPipelineTask = useCallback(async () => {
    if (!pipelineTaskId) {
      messageApi.warning('当前资产包批次 ID 为空，无法重试');
      return;
    }
    if (retryingPipelineTaskRef.current) return;

    retryingPipelineTaskRef.current = true;
    setRetryingPipelineTask(true);
    try {
      const res = await retryAssetPackagePipelineTask(pipelineTaskId);
      const data = res.data;
      if (!data) return;

      const normalizedData = normalizePipelinePayloadForRunningSubTasks(data);
      applyPipelineProgress(normalizedData);
      if (isPipelineProcessing(normalizedData) && normalizedData.taskId) {
        startPipelinePolling(normalizedData.taskId, {
          initialStatus: normalizedData.status,
          initialPhase: normalizedData.phase || '处理中',
        });
        return;
      }

      if (isPipelineTerminal(normalizedData)) {
        stopPipelinePolling();
        if (normalizedData.status === 'partial_failed') {
          messageApi.warning('重试后仍存在失败记录，请查看明细');
        } else {
          notifyPipelineTerminal(normalizedData);
        }
      }
    } finally {
      retryingPipelineTaskRef.current = false;
      setRetryingPipelineTask(false);
    }
  }, [
    applyPipelineProgress,
    messageApi,
    notifyPipelineTerminal,
    pipelineTaskId,
    startPipelinePolling,
    stopPipelinePolling,
  ]);

  const confirmIgnorePipelineFailures = useCallback(() => {
    if (!pipelineTaskId) {
      messageApi.warning('当前资产包批次 ID 为空，无法忽略');
      return;
    }

    Modal.confirm({
      title: '忽略失败并继续',
      content:
        '忽略后不会修复附件解析或画像分类失败记录，只是让本次导入链路不再阻塞后续外呼。确认继续吗？',
      okText: '确认忽略并继续',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setIgnoringFailures(true);
        try {
          const res = await ignoreAssetPackagePipelineFailures(pipelineTaskId);
          const data = res.data;
          if (!data) return;

          applyPipelineProgress(data);
          stopPipelinePolling();
          messageApi.success('已忽略后续处理失败');
          refreshAll();
        } finally {
          setIgnoringFailures(false);
        }
      },
    });
  }, [
    applyPipelineProgress,
    messageApi,
    pipelineTaskId,
    refreshAll,
    stopPipelinePolling,
  ]);

  const handleStartOutbound = useCallback(() => {
    if (!canStartOutbound) {
      messageApi.warning(outboundDisabledReason);
      return;
    }

    const formValues = form.getFieldsValue();
    if (!isSameFlowBatchStartFilter(formValues, queryRef.current)) {
      messageApi.warning('筛选条件已变更，请先点击查询刷新列表后再发起');
      return;
    }

    const filter = toFlowBatchStartFilter(queryRef.current);
    const hasEmptyFilter =
      !filter.debtNumber && !filter.city && !filter.organization;

    Modal.confirm({
      title: '确认发起催收流程',
      content: (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <Text type="secondary">资产编号</Text>
            <Text>{filter.debtNumber || '全部'}</Text>
            <Text type="secondary">所属城市</Text>
            <Text>{filter.city || '全部'}</Text>
            <Text type="secondary">所属项目</Text>
            <Text>{filter.organization || '全部'}</Text>
          </div>
          <Text type={hasEmptyFilter ? 'danger' : 'secondary'}>
            {hasEmptyFilter
              ? '未设置任何筛选条件，将按当前权限范围发起催收流程。'
              : '将对当前筛选条件发起催收流程。已发起或正在发起的债务会自动跳过。'}
          </Text>
          {outboundStartNotice ? (
            <Text type="warning">{outboundStartNotice}</Text>
          ) : null}
        </div>
      ),
      okText: '确认发起',
      cancelText: '取消',
      onOk: async () => {
        setOutboundStarting(true);
        try {
          const res = await startFlowBatch(filter);
          const result = res.data;
          if (!result) return;

          if (toNumber(result.matchedCount) === 0) {
            messageApi.warning('当前筛选条件无匹配债务');
            refreshAll();
            return;
          }

          if (toNumber(result.acceptedCount) === 0) {
            messageApi.info('当前筛选结果没有可发起的债务');
            refreshAll();
            return;
          }

          messageApi.success('催收流程发起任务已受理');
          const batchId = String(result.batchId || '');
          if (batchId) {
            startOutboundFlowPolling(batchId);
          } else {
            refreshAll();
          }
        } catch {
          messageApi.error('催收流程发起失败，请稍后重试');
        } finally {
          setOutboundStarting(false);
        }
      },
    });
  }, [
    canStartOutbound,
    form,
    messageApi,
    outboundDisabledReason,
    outboundStartNotice,
    refreshAll,
    startOutboundFlowPolling,
  ]);

  const renderDetailSection = (title: string, fields: DetailGridField[]) => {
    const border = `1px solid ${token.colorBorderSecondary}`;
    const labelCellStyle: React.CSSProperties = {
      minWidth: 0,
      padding: '10px 12px',
      borderRight: border,
      borderBottom: border,
      background: token.colorFillAlter,
      color: token.colorTextSecondary,
      fontWeight: 500,
    };
    const contentCellStyle: React.CSSProperties = {
      minWidth: 0,
      padding: '10px 12px',
      borderRight: border,
      borderBottom: border,
      color: token.colorText,
      wordBreak: 'break-word',
    };
    const cells: React.ReactNode[] = [];
    let halfFieldCount = 0;

    const appendEmptyHalfField = (key: string) => {
      cells.push(
        <div key={`${key}-label`} style={labelCellStyle} />,
        <div key={`${key}-content`} style={contentCellStyle} />,
      );
      halfFieldCount = 0;
    };

    fields.forEach((field, index) => {
      const key = `${field.label}-${index}`;

      if (field.span === 2) {
        if (halfFieldCount === 1) {
          appendEmptyHalfField(`${key}-empty`);
        }

        cells.push(
          <div key={`${key}-label`} style={labelCellStyle}>
            {field.label}
          </div>,
          <div
            key={`${key}-content`}
            style={{ ...contentCellStyle, gridColumn: 'span 3' }}
          >
            {field.content}
          </div>,
        );
        halfFieldCount = 0;
        return;
      }

      cells.push(
        <div key={`${key}-label`} style={labelCellStyle}>
          {field.label}
        </div>,
        <div key={`${key}-content`} style={contentCellStyle}>
          {field.content}
        </div>,
      );
      halfFieldCount = halfFieldCount === 1 ? 0 : 1;
    });

    if (halfFieldCount === 1) {
      appendEmptyHalfField('tail-empty');
    }

    return (
      <div>
        <Title level={5}>{title}</Title>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '150px minmax(0, 1fr) 150px minmax(0, 1fr)',
            overflow: 'hidden',
            borderTop: border,
            borderLeft: border,
            borderRadius: token.borderRadiusLG,
          }}
        >
          {cells}
        </div>
      </div>
    );
  };

  const columns = useMemo<ColumnsType<DebtRecordItem>>(
    () => [
      {
        title: '资产编号',
        dataIndex: 'debtNumber',
        width: RECOV_LIST_COLUMN_WIDTH.debtNumber,
        ellipsis: { showTitle: false },
        render: renderRecovSingleLineText,
      },
      {
        title: '所属城市',
        dataIndex: 'city',
        width: RECOV_LIST_COLUMN_WIDTH.city,
        render: toText,
      },
      {
        title: '所属项目',
        dataIndex: 'organization',
        width: RECOV_LIST_COLUMN_WIDTH.organization,
        ellipsis: { showTitle: false },
        render: renderRecovSingleLineText,
      },
      {
        title: '业主姓名',
        dataIndex: 'debtorName',
        width: 120,
        ellipsis: true,
        render: (value) => renderEllipsisText(value, { strong: true }),
      },
      {
        title: '逾期金额',
        dataIndex: 'debtAmount',
        width: 140,
        align: 'right',
        render: (value) => <Text strong>{formatCurrency(value)}</Text>,
      },
      {
        title: '违约（滞纳）金',
        dataIndex: 'overdueAmount',
        width: 150,
        align: 'right',
        render: (value) => formatCurrency(value),
      },
      {
        title: '当前状态',
        dataIndex: 'currentStatus',
        width: 130,
        align: 'center',
        render: (value, record) =>
          renderCurrentStatusTag(
            value,
            record.currentStatusReason,
            record.flowStartErrorMessage,
          ),
      },
      {
        title: '逾期天数',
        dataIndex: 'overdueDays',
        width: 120,
        align: 'center',
        render: (value) =>
          toNumber(value) > 0 ? (
            <Tag color="red">{toNumber(value)} 天</Tag>
          ) : (
            '-'
          ),
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        width: 170,
        render: (value) => (
          <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
            {toText(value)}
          </Text>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        fixed: 'right',
        align: 'left',
        render: (_, record) => {
          const isException = isDebtFlowExceptionRecord(record);
          const hasCommunicationInsight = hasCommunicationAnalysis(
            record,
            communicationAnalysisDebtIds,
          );
          const actionKeys = resolveDebtRecordActionKeys(
            record,
            hasCommunicationInsight,
          );
          const actionMap: Record<DebtRecordActionKey, TableActionItem> = {
            detail: {
              key: 'detail',
              label: '查看详情',
              icon: <EyeOutlined />,
              onClick: () => {
                void openDebtDetail(record);
              },
            },
            persona: {
              key: 'persona',
              label: '用户画像',
              icon: <UserOutlined />,
              onClick: () => {
                void openPersonaDetail(record);
              },
            },
            'flow-trace': {
              key: 'flow-trace',
              label: isException ? '处理异常' : '查看流程',
              icon: getFlowActionIcon(isException),
              onClick: () => openFlowTrace(record),
            },
          };
          const actions = actionKeys.map((key) => actionMap[key]);

          return <TableActions maxVisible={3} actions={actions} />;
        },
      },
    ],
    [communicationAnalysisDebtIds, openFlowTrace, openPersonaDetail],
  );

  const getAttachmentVisual = (kind: AttachmentFileKind) => {
    const visualMap: Record<
      AttachmentFileKind,
      { icon: React.ReactNode; color: string; background: string }
    > = {
      image: {
        icon: <FileImageOutlined />,
        color: '#722ed1',
        background: '#f9f0ff',
      },
      pdf: {
        icon: <FilePdfOutlined />,
        color: '#cf1322',
        background: '#fff1f0',
      },
      word: {
        icon: <FileWordOutlined />,
        color: '#1d39c4',
        background: '#f0f5ff',
      },
      excel: {
        icon: <FileExcelOutlined />,
        color: '#237804',
        background: '#f6ffed',
      },
      ppt: {
        icon: <FilePptOutlined />,
        color: '#d46b08',
        background: '#fff7e6',
      },
      archive: {
        icon: <FileZipOutlined />,
        color: '#7c5a00',
        background: '#fffbe6',
      },
      text: {
        icon: <FileTextOutlined />,
        color: '#08979c',
        background: '#e6fffb',
      },
      unknown: {
        icon: <FileUnknownOutlined />,
        color: token.colorTextSecondary,
        background: token.colorFillAlter,
      },
    };
    return visualMap[kind];
  };

  const canPreviewAttachment = (record: DebtAttachmentItem) =>
    Boolean(
      getAttachmentUrl(record) &&
        previewableAttachmentKinds.has(getAttachmentKind(record)),
    );

  const openAttachmentPreview = (record: DebtAttachmentItem) => {
    const fileUrl = getAttachmentUrl(record);
    if (!fileUrl) {
      messageApi.warning('当前附件没有可预览地址');
      return;
    }

    const kind = getAttachmentKind(record);
    if (!previewableAttachmentKinds.has(kind)) {
      messageApi.info('当前文件类型暂不支持在线预览');
      return;
    }

    setAttachmentPreview({
      open: true,
      ossId: record.ossId,
      fileUrl,
      fileName: getAttachmentName(record),
      previewType:
        kind === 'image' ? 'image' : kind === 'pdf' ? 'pdf' : 'embed',
      loading: kind === 'image',
      errorMessage: undefined,
    });
  };

  const downloadAttachment = async (
    record: DebtAttachmentItem,
    index: number,
  ) => {
    if (!record.ossId) {
      messageApi.warning('当前附件缺少 OSS ID，无法下载');
      return;
    }

    const rowKey = getAttachmentKey(record, index);
    if (attachmentDownloadingKeys.has(rowKey)) return;

    const messageKey = `attachment-download-${rowKey}`;
    setAttachmentDownloadingKeys((keys) => new Set(keys).add(rowKey));
    messageApi.open({
      key: messageKey,
      type: 'loading',
      content: '正在下载附件...',
      duration: 0,
    });
    try {
      await downloadOss(record.ossId, getAttachmentDownloadName(record));
      messageApi.open({
        key: messageKey,
        type: 'success',
        content: '下载已开始',
        duration: 2,
      });
    } catch (error) {
      messageApi.open({
        key: messageKey,
        type: 'error',
        content:
          error instanceof Error ? error.message : '附件下载失败，请稍后重试',
        duration: 3,
      });
    } finally {
      setAttachmentDownloadingKeys((keys) => {
        const nextKeys = new Set(keys);
        nextKeys.delete(rowKey);
        return nextKeys;
      });
    }
  };

  const renderAttachmentCard = (
    attachment: DebtAttachmentItem,
    index: number,
  ) => {
    const kind = getAttachmentKind(attachment);
    const suffix = getAttachmentSuffix(attachment);
    const visual = getAttachmentVisual(kind);
    const name = getAttachmentName(attachment);
    const rowKey = getAttachmentKey(attachment, index);
    const isDownloading = attachmentDownloadingKeys.has(rowKey);

    return (
      <Card
        key={rowKey}
        size="small"
        variant="outlined"
        style={{
          borderColor: token.colorBorderSecondary,
          background: token.colorBgContainer,
        }}
        styles={{ body: { padding: 12 } }}
      >
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-lg"
            style={{
              color: visual.color,
              background: visual.background,
              borderRadius: token.borderRadiusLG,
            }}
          >
            {visual.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <Tooltip title={name}>
                <Text
                  strong
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {name}
                </Text>
              </Tooltip>
              <Space size={4} wrap={false}>
                {canPreviewAttachment(attachment) && (
                  <Tooltip title="预览附件">
                    <Button
                      aria-label="预览附件"
                      icon={<EyeOutlined />}
                      onClick={() => openAttachmentPreview(attachment)}
                      shape="circle"
                      size="small"
                      type="text"
                    />
                  </Tooltip>
                )}
                <Tooltip title="下载附件">
                  <Button
                    aria-label="下载附件"
                    icon={<DownloadOutlined />}
                    loading={isDownloading}
                    onClick={() => {
                      void downloadAttachment(attachment, index);
                    }}
                    shape="circle"
                    size="small"
                    type="text"
                  />
                </Tooltip>
              </Space>
            </div>
            <Space size={6} style={{ marginTop: 6 }} wrap>
              {suffix && <Tag>{suffix.toUpperCase()}</Tag>}
              {attachment.ossId && (
                <Text
                  type="secondary"
                  style={{ fontSize: 12, lineHeight: '20px' }}
                >
                  {attachment.ossId}
                </Text>
              )}
            </Space>
          </div>
        </div>
      </Card>
    );
  };

  const renderFailureInlineMetaItem = (
    label: string,
    content: React.ReactNode,
  ) => (
    <span
      key={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        minWidth: 0,
      }}
    >
      <Text type="secondary">{label}</Text>
      <span className="min-w-0">{content}</span>
    </span>
  );

  const renderFailureDetailItem = (record: ImportFailureDetail) => {
    const isUnmatchedStage = failureStage === 'assetParseUnmatched';
    const isAttachmentStage = failureStage === 'assetParse' || isUnmatchedStage;
    const primaryTitle = isAttachmentStage
      ? toText(record.attPath ?? record.name)
      : toText(record.debtorName);
    const metaItems = isAttachmentStage
      ? record.statusName && isUnmatchedStage
        ? [renderFailureInlineMetaItem('状态', toText(record.statusName))]
        : []
      : [
          renderFailureInlineMetaItem('所属项目', toText(record.organization)),
          renderFailureInlineMetaItem('资产编号', toText(record.debtNumber)),
        ];
    const reasonTitle = isUnmatchedStage ? '未匹配原因' : '失败原因';
    const reasonType = isUnmatchedStage ? 'warning' : 'danger';
    const reasonPanelStyle = isUnmatchedStage
      ? {
          border: `1px solid ${token.colorWarningBorder}`,
          background: token.colorWarningBg,
        }
      : {
          border: `1px solid ${token.colorErrorBorder}`,
          background: token.colorErrorBg,
        };

    return (
      <List.Item
        key={`${record.stage || failureStage}-${record.id || record.debtId || record.name}`}
        style={{ padding: 16 }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              columnGap: 16,
              flexWrap: 'wrap',
              rowGap: 6,
            }}
          >
            <Text strong>{primaryTitle}</Text>
            {metaItems}
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: token.borderRadiusLG,
              ...reasonPanelStyle,
            }}
          >
            <Text strong type={reasonType}>
              {reasonTitle}
            </Text>
            <div style={{ marginTop: 6 }}>
              {renderFailureReason(record.errorMessage, reasonType)}
            </div>
          </div>
        </div>
      </List.Item>
    );
  };

  const personaTags = normalizeTags(personaData?.tags);
  const semanticRecordCount =
    communicationLogDetail?.logs.filter((log) => log.hasSemanticAnalysis)
      .length ?? 0;
  const ownerInsightPersonaName = personaLoading
    ? '加载中'
    : getNonEmptyText(personaData?.personaName, '暂无画像');
  const ownerInsightSemanticText = communicationLogLoading
    ? '加载中'
    : semanticRecordCount > 0
      ? `${semanticRecordCount} 条`
      : '暂无语义记录';
  const debtImportTask = pipelineSubTasks.find(
    (task) => task.type === 'debtImport',
  );
  const assetParseTask = pipelineSubTasks.find(
    (task) => task.type === 'assetParse',
  );
  const personaClassifyTask = pipelineSubTasks.find(
    (task) => task.type === 'personaClassify',
  );
  const otherPipelineTasks = pipelineSubTasks.filter(
    (task) =>
      task.type !== 'debtImport' &&
      task.type !== 'assetParse' &&
      task.type !== 'personaClassify',
  );
  const pipelineStepTasks = [
    debtImportTask,
    assetParseTask,
    personaClassifyTask,
    ...otherPipelineTasks,
  ].filter((task): task is ImportPipelineSubTask => Boolean(task));
  const resolvePipelineTaskStatus = (task: ImportPipelineSubTask) => {
    if (
      task.status === 'failed' ||
      (pipelineStatus === 'partial_failed' && Number(task.failedCount) > 0)
    ) {
      return 'failed';
    }
    return task.status || 'pending';
  };
  const resolvePipelineTaskProgress = (task: ImportPipelineSubTask) => {
    const progress = Number(task.progress);
    if (Number.isFinite(progress)) {
      return normalizeProgress(progress);
    }
    const current = Number(task.current) || 0;
    const total = Number(task.total) || 0;
    if (total > 0) {
      return normalizeProgress((current / total) * 100);
    }
    return resolvePipelineTaskStatus(task) === 'success' ? 100 : 0;
  };
  const assetParseUnmatchedCountFromTask =
    getAssetParseUnmatchedCount(assetParseTask);
  const assetParseUnmatchedCount = assetParseTask
    ? (assetParseUnmatchedCountFromTask ??
      (assetParseUnmatchedSummary.taskId === pipelineTaskId
        ? assetParseUnmatchedSummary.total
        : 0))
    : 0;
  const hasAssetParseUnmatched = assetParseUnmatchedCount > 0;
  const hasTaskDetailFooter =
    canRetryPipelineFailures || canIgnorePipelineFailures;
  const renderPipelineTaskCard = (task: ImportPipelineSubTask) => {
    const status = resolvePipelineTaskStatus(task);
    const current = Number(task.current) || 0;
    const total = Number(task.total) || 0;
    const successCount = Number(task.successCount) || 0;
    const failedCount = Number(task.failedCount) || 0;
    const hasCountSummary = total > 0;
    const progress = resolvePipelineTaskProgress(task);
    const isIgnoredFailure =
      pipelineStatus === 'partial_success' &&
      isImportRetryStage(task.type) &&
      status !== 'success';
    const progressStatus = isIgnoredFailure
      ? 'normal'
      : status === 'failed'
        ? 'exception'
        : status === 'processing'
          ? 'active'
          : 'normal';
    const progressStrokeColor = isIgnoredFailure
      ? token.colorWarning
      : status === 'success' || status === 'processing'
        ? token.colorInfo
        : undefined;
    const failureDetailStage = isImportRetryStage(task.type)
      ? task.type
      : undefined;
    const canOpenFailure =
      Boolean(failureDetailStage) &&
      total > 0 &&
      (status === 'failed' || isIgnoredFailure);
    const canOpenUnmatched =
      task.type === 'assetParse' && hasAssetParseUnmatched;
    const taskErrorTone =
      task.errorMessage && isIgnoredFailure
        ? 'warning'
        : task.errorMessage && status === 'failed'
          ? 'danger'
          : undefined;
    const taskErrorPanelStyle =
      taskErrorTone === 'warning'
        ? {
            border: `1px solid ${token.colorWarningBorder}`,
            background: token.colorWarningBg,
          }
        : taskErrorTone === 'danger'
          ? {
              border: `1px solid ${token.colorErrorBorder}`,
              background: token.colorErrorBg,
            }
          : undefined;
    const title =
      task.name ||
      (task.type ? pipelineTaskFallbackName[task.type] : '') ||
      toText(task.type);
    const statusVisual = isIgnoredFailure
      ? {
          color: token.colorWarning,
          background: token.colorWarningBg,
          borderColor: token.colorWarningBorder,
          icon: <ExclamationCircleOutlined />,
        }
      : status === 'failed'
        ? {
            color: token.colorError,
            background: token.colorErrorBg,
            borderColor: token.colorErrorBorder,
            icon: <CloseCircleOutlined />,
          }
        : status === 'success'
          ? {
              color: token.colorInfo,
              background: token.colorInfoBg,
              borderColor: token.colorInfoBorder,
              icon: <CheckCircleOutlined />,
            }
          : status === 'processing'
            ? {
                color: token.colorInfo,
                background: token.colorInfoBg,
                borderColor: token.colorInfoBorder,
                icon: <LoadingOutlined />,
              }
            : {
                color: token.colorTextTertiary,
                background: token.colorFillAlter,
                borderColor: token.colorBorderSecondary,
                icon: <ClockCircleOutlined />,
              };

    return (
      <Card
        key={`${task.type || task.name}-${task.taskId || task.execTaskId || task.name}`}
        size="small"
        variant="outlined"
        styles={{ body: { padding: 14 } }}
        style={{ borderColor: statusVisual.borderColor }}
      >
        <div className="flex gap-3">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{
              color: statusVisual.color,
              background: statusVisual.background,
            }}
          >
            {statusVisual.icon}
          </span>
          <div
            className="min-w-0 flex-1"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Text strong>{title}</Text>
                  <div style={{ marginTop: 2 }}>
                    <Text type="secondary">
                      {isIgnoredFailure
                        ? '已忽略失败'
                        : task.phase || '等待处理'}
                    </Text>
                  </div>
                </div>
                {(canOpenFailure || canOpenUnmatched) && (
                  <Space size={8} wrap>
                    {canOpenFailure && failureDetailStage && (
                      <Button
                        color={isIgnoredFailure ? 'gold' : 'danger'}
                        icon={<EyeOutlined />}
                        onClick={() => openFailureDrawer(failureDetailStage)}
                        size="small"
                        variant="filled"
                      >
                        {failureDetailActionText[failureDetailStage]}
                      </Button>
                    )}
                    {canOpenUnmatched && (
                      <Button
                        color="default"
                        icon={<FileSearchOutlined />}
                        onClick={() => openFailureDrawer('assetParseUnmatched')}
                        size="small"
                        variant="outlined"
                      >
                        未匹配附件（{assetParseUnmatchedCount}）
                      </Button>
                    )}
                  </Space>
                )}
              </div>
            </div>
            <Progress
              percent={progress}
              size="small"
              status={progressStatus}
              strokeColor={progressStrokeColor}
            />
            {hasCountSummary && (
              <Space size={12} wrap>
                <Text type="secondary">总计 {total} 条</Text>
                <Text type="secondary">成功 {successCount} 条</Text>
                <Text type="secondary">失败 {failedCount} 条</Text>
                <Text type="secondary">
                  已处理 {current}/{total}
                </Text>
              </Space>
            )}
            {task.errorMessage && taskErrorTone && taskErrorPanelStyle ? (
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: token.borderRadiusLG,
                  ...taskErrorPanelStyle,
                }}
              >
                {renderImportFailureMessage(task.errorMessage, {
                  maxHeight: 152,
                  tone: taskErrorTone,
                })}
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <RecovListPage title="数据智能解析">
      {messageContextHolder}
      <RecovListStack>
        {showImportTaskProgress && (
          <button
            type="button"
            disabled={taskDetailRefreshing}
            onClick={openTaskDetail}
            style={{
              appearance: 'none',
              width: '100%',
              padding: 0,
              border: 0,
              background: 'transparent',
              cursor: taskDetailRefreshing ? 'wait' : 'pointer',
              textAlign: 'left',
            }}
          >
            <Alert
              showIcon
              type={importTaskAlertType}
              title={
                <Space size={8} wrap>
                  <Text strong>{importTaskTitle}</Text>
                  <Text type="secondary">{importTaskDescription}</Text>
                </Space>
              }
              action={
                <Text
                  style={{ color: token.colorPrimary, whiteSpace: 'nowrap' }}
                >
                  {taskDetailRefreshing ? '刷新中' : '查看详情'}
                </Text>
              }
            />
          </button>
        )}

        <RecovStatsStrip className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card) => (
            <StatCard
              key={card.key}
              title={card.title}
              value={card.value}
              icon={card.icon}
              tone={card.tone}
            />
          ))}
        </RecovStatsStrip>

        <RecovTableCard title="债务记录明细">
          <Form
            form={form}
            initialValues={{
              debtNumber: undefined,
              city: undefined,
              organization: undefined,
            }}
            className="recov-table-toolbar"
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <Space wrap size={12}>
                <Form.Item name="debtNumber" noStyle>
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="资产编号"
                    style={RECOV_FILTER_CONTROL_STYLE}
                  />
                </Form.Item>
                <Form.Item name="city" noStyle>
                  <Select
                    allowClear
                    showSearch={{ optionFilterProp: 'label' }}
                    loading={filterLoading}
                    placeholder="选择所属城市"
                    style={RECOV_FILTER_CONTROL_STYLE}
                    options={cityOptions.map((city) => ({
                      label: city,
                      value: city,
                    }))}
                  />
                </Form.Item>
                <Form.Item name="organization" noStyle>
                  <Select
                    allowClear
                    showSearch={{ optionFilterProp: 'label' }}
                    loading={filterLoading}
                    placeholder="选择所属项目"
                    options={projectOptions.map((project) => ({
                      label: project,
                      value: project,
                    }))}
                    optionRender={(option) =>
                      renderRecovSelectOptionLabel(option.label)
                    }
                    popupMatchSelectWidth={RECOV_ORGANIZATION_POPUP_WIDTH}
                    style={RECOV_FILTER_CONTROL_STYLE}
                  />
                </Form.Item>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                >
                  查询
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
              </Space>
              <Space wrap size={8}>
                <Tooltip title={importDisabledReason || undefined}>
                  <Button
                    disabled={!canImportAssetPackage}
                    icon={<UploadOutlined />}
                    onClick={openUploadDialog}
                  >
                    导入资产包
                  </Button>
                </Tooltip>
                <Tooltip title={outboundDisabledReason || undefined}>
                  <Button
                    disabled={!canStartOutbound}
                    icon={<PhoneOutlined />}
                    loading={outboundStarting || outboundFlowProcessing}
                    onClick={handleStartOutbound}
                  >
                    启动 AI 外呼
                  </Button>
                </Tooltip>
              </Space>
            </div>
          </Form>

          <Table<DebtRecordItem>
            bordered
            className="recov-stable-pagination-table"
            columns={columns}
            dataSource={recordList}
            loading={loading}
            rowKey={getRowId}
            scroll={{ x: 1420 }}
            locale={{
              emptyText: <Empty description="暂无债务记录" />,
            }}
            pagination={{
              current: query.pageNum || 1,
              pageSize: query.pageSize || DEFAULT_PAGE_SIZE,
              total: recordTotal,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (pageNum, pageSize) => {
                applyQuery({
                  ...query,
                  pageNum,
                  pageSize,
                });
              },
            }}
          />
        </RecovTableCard>
      </RecovListStack>

      <Modal
        title="导入资产包"
        open={uploadOpen}
        width={640}
        destroyOnHidden
        closable={!uploadState.uploading || Boolean(uploadState.errorMsg)}
        mask={{
          closable: !uploadState.uploading || Boolean(uploadState.errorMsg),
        }}
        keyboard={!uploadState.uploading || Boolean(uploadState.errorMsg)}
        okText="开始导入"
        okButtonProps={{
          disabled:
            !selectedFile ||
            uploadState.uploading ||
            Boolean(uploadState.errorMsg),
          loading: uploadState.uploading,
        }}
        cancelButtonProps={{
          disabled: uploadState.uploading && !uploadState.errorMsg,
        }}
        onCancel={() => {
          if (uploadState.uploading && !uploadState.errorMsg) return;
          setUploadOpen(false);
        }}
        onOk={() => {
          void submitUpload();
        }}
      >
        <Space orientation="vertical" size={18} style={{ width: '100%' }}>
          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            style={{
              padding: 12,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              background: token.colorFillQuaternary,
            }}
          >
            <Space size={10} wrap={false}>
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                style={{
                  color: token.colorPrimary,
                  background: token.colorPrimaryBg,
                }}
              >
                <DownloadOutlined />
              </span>
              <div>
                <Text strong>标准数据模板</Text>
                <div>
                  <Text type="secondary">
                    先按模板整理数据，再上传 ZIP 文件
                  </Text>
                </div>
              </div>
            </Space>
            <Button
              icon={<DownloadOutlined />}
              loading={templateDownloading}
              onClick={() => {
                void handleDownloadTemplate();
              }}
            >
              下载模板
            </Button>
          </div>

          {!uploadState.uploading && !uploadState.errorMsg && (
            <Upload.Dragger
              {...uploadProps}
              showUploadList={{
                showPreviewIcon: false,
                showDownloadIcon: false,
              }}
            >
              <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                <InboxOutlined
                  style={{ fontSize: 42, color: token.colorTextTertiary }}
                />
                <div
                  style={{
                    marginTop: 12,
                    color: token.colorText,
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  点击或拖拽 ZIP 资产包到此处
                </div>
                <div style={{ marginTop: 6 }}>
                  <Text type="secondary">压缩包内需包含逾期业主信息.xlsx</Text>
                </div>
              </div>
            </Upload.Dragger>
          )}

          {uploadState.uploading && (
            <div
              style={{
                padding: 20,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
              }}
            >
              <Space
                align="start"
                size={14}
                style={{ width: '100%', marginBottom: 16 }}
              >
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
                  style={{
                    color: token.colorPrimary,
                    background: token.colorPrimaryBg,
                  }}
                >
                  <FileZipOutlined />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Text strong>正在上传并创建导入任务</Text>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary">
                      {uploadState.phase || '正在上传资产包'}
                    </Text>
                  </div>
                </div>
              </Space>
              <Progress
                percent={normalizeProgress(uploadState.percent)}
                status="active"
              />
              {uploadState.total > 0 && (
                <Text type="secondary">
                  已处理 {uploadState.current}/{uploadState.total}
                </Text>
              )}
            </div>
          )}

          {uploadState.errorMsg && (
            <Alert
              showIcon
              type="error"
              title="导入失败"
              description={
                <Space
                  orientation="vertical"
                  size={8}
                  style={{ width: '100%' }}
                >
                  {renderImportFailureMessage(uploadState.errorMsg, {
                    maxHeight: 180,
                    tone: 'danger',
                  })}
                  <Progress
                    percent={normalizeProgress(uploadState.percent)}
                    status="exception"
                  />
                </Space>
              }
            />
          )}
        </Space>
      </Modal>

      <Drawer
        title="导入处理详情"
        size={520}
        open={taskDetailOpen}
        destroyOnHidden
        footer={
          hasTaskDetailFooter ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <Space
                size={8}
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  width: '100%',
                }}
                wrap
              >
                <Button onClick={closeTaskDetail}>取消</Button>
                {canRetryPipelineFailures && (
                  <Button
                    color="danger"
                    disabled={ignoringFailures || retryingPipelineTask}
                    icon={<ReloadOutlined />}
                    loading={retryingPipelineTask}
                    onClick={() => {
                      void retryPipelineTask();
                    }}
                    variant="filled"
                  >
                    重试
                  </Button>
                )}
                {canIgnorePipelineFailures && (
                  <Button
                    color="gold"
                    disabled={retryingPipelineTask}
                    icon={<CheckCircleOutlined />}
                    loading={ignoringFailures}
                    onClick={confirmIgnorePipelineFailures}
                    variant="filled"
                  >
                    忽略
                  </Button>
                )}
              </Space>
            </div>
          ) : null
        }
        onClose={closeTaskDetail}
      >
        <Spin spinning={taskDetailRefreshing}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              width: '100%',
            }}
          >
            {pipelineSubTasks.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {pipelineStepTasks.map(renderPipelineTaskCard)}
              </div>
            )}

            {!pipelineSubTasks.length &&
              (parseState.failed || personaState.failed) && (
                <Space wrap>
                  {parseState.failed && (
                    <Button
                      size="small"
                      onClick={() => openFailureDrawer('assetParse')}
                    >
                      附件解析失败明细
                    </Button>
                  )}
                  {personaState.failed && (
                    <Button
                      size="small"
                      onClick={() => openFailureDrawer('personaClassify')}
                    >
                      画像分类失败明细
                    </Button>
                  )}
                </Space>
              )}

            {canDismissImportTaskNotice && (
              <Space wrap>
                <Button danger onClick={dismissImportTaskErrors}>
                  关闭异常提示
                </Button>
              </Space>
            )}
          </div>
        </Spin>
      </Drawer>

      <Drawer
        title={failureStageText[failureStage]}
        size={860}
        open={failureDrawerOpen}
        destroyOnHidden
        onClose={() => setFailureDrawerOpen(false)}
      >
        <List<ImportFailureDetail>
          bordered
          dataSource={failureRows}
          itemLayout="vertical"
          loading={failureLoading}
          locale={{
            emptyText: (
              <Empty
                description={
                  failureStage === 'assetParseUnmatched'
                    ? '暂无未匹配附件'
                    : '暂无失败明细'
                }
              />
            ),
          }}
          renderItem={renderFailureDetailItem}
          rowKey={(record) =>
            `${record.stage || failureStage}-${record.id || record.debtId || record.name}`
          }
        />
        {failureTotal > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 16,
            }}
          >
            <Pagination
              current={failurePage.pageNum}
              pageSize={failurePage.pageSize}
              responsive
              showSizeChanger
              showTotal={(total) => `共 ${total} 条`}
              total={failureTotal}
              onChange={(pageNum, pageSize) => {
                void loadFailureDetails(failureStage, pageNum, pageSize);
              }}
            />
          </div>
        )}
      </Drawer>

      <Modal
        title="业主详细资料"
        open={detailOpen}
        width={920}
        destroyOnHidden
        footer={<Button onClick={() => setDetailOpen(false)}>关闭</Button>}
        onCancel={() => setDetailOpen(false)}
      >
        <Spin spinning={detailLoading}>
          {detailData ? (
            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              {renderDetailSection('业主信息', [
                { label: '业主姓名', content: toText(detailData.debtorName) },
                { label: '电话号码', content: toText(detailData.debtorPhone) },
                {
                  label: '紧急联系人',
                  content: toText(detailData.emergencyContact),
                },
                {
                  label: '紧急联系人电话',
                  content: toText(detailData.emergencyContactPhone),
                },
                { label: '业主邮箱', content: toText(detailData.debtorEmail) },
                { label: '身份证号码', content: toText(detailData.debtIdCard) },
                { label: '性别', content: getDebtorGenderText(detailData) },
                { label: '年龄', content: getDebtorAgeText(detailData) },
              ])}

              {renderDetailSection('债务信息', [
                { label: '资产编号', content: toText(detailData.debtNumber) },
                {
                  label: '逾期金额',
                  content: formatCurrency(detailData.debtAmount),
                },
                {
                  label: '违约（滞纳）金',
                  content: formatCurrency(detailData.overdueAmount),
                },
                {
                  label: '逾期天数',
                  content: `${toNumber(detailData.overdueDays)} 天`,
                },
                {
                  label: '缴费截止日期',
                  content: toText(detailData.deadlineTime),
                },
              ])}

              {renderDetailSection('其他信息', [
                { label: '所属城市', content: toText(detailData.city) },
                { label: '所属项目', content: toText(detailData.organization) },
                { label: '房屋面积', content: toText(detailData.area) },
                { label: '房屋地址', content: toText(detailData.address) },
                {
                  label: '历史催缴说明',
                  content: <Text>{toText(detailData.reminderRemark)}</Text>,
                  span: 2,
                },
              ])}

              <div>
                <Title level={5}>关联附件</Title>
                {detailData.attachments?.length ? (
                  <div
                    style={{
                      display: 'grid',
                      gap: 12,
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(260px, 1fr))',
                    }}
                  >
                    {detailData.attachments.map(renderAttachmentCard)}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 24,
                      border: `1px dashed ${token.colorBorder}`,
                      borderRadius: token.borderRadiusLG,
                    }}
                  >
                    <Empty description="暂无关联附件" />
                  </div>
                )}
              </div>
            </Space>
          ) : (
            <Empty description="暂无详情数据" />
          )}
        </Spin>
      </Modal>

      <Modal
        title={attachmentPreview.fileName || '附件预览'}
        open={attachmentPreview.open}
        width={860}
        destroyOnHidden
        footer={
          <Space>
            <Button
              disabled={!attachmentPreview.fileUrl}
              onClick={() =>
                window.open(
                  attachmentPreview.fileUrl,
                  '_blank',
                  'noopener,noreferrer',
                )
              }
            >
              新窗口打开
            </Button>
            <Button
              onClick={() =>
                setAttachmentPreview((prev) => ({ ...prev, open: false }))
              }
            >
              关闭
            </Button>
          </Space>
        }
        onCancel={() =>
          setAttachmentPreview((prev) => ({ ...prev, open: false }))
        }
      >
        {attachmentPreview.fileUrl ? (
          attachmentPreview.previewType === 'image' ? (
            <Space orientation="vertical" size={12} style={{ width: '100%' }}>
              {attachmentPreview.errorMessage ? (
                <Alert
                  showIcon
                  type="error"
                  title={attachmentPreview.errorMessage}
                />
              ) : null}
              <Spin spinning={Boolean(attachmentPreview.loading)}>
                <img
                  alt={attachmentPreview.fileName}
                  src={attachmentPreview.fileUrl}
                  onLoad={() =>
                    setAttachmentPreview((prev) => ({
                      ...prev,
                      loading: false,
                      errorMessage: undefined,
                    }))
                  }
                  onError={() =>
                    setAttachmentPreview((prev) => ({
                      ...prev,
                      loading: false,
                      errorMessage:
                        '图片加载失败，请点击“新窗口打开”查看原始文件，或下载后查看。',
                    }))
                  }
                  style={{
                    display: 'block',
                    maxHeight: '70vh',
                    maxWidth: '100%',
                    margin: '0 auto',
                    objectFit: 'contain',
                  }}
                />
              </Spin>
            </Space>
          ) : attachmentPreview.previewType === 'pdf' ? (
            <PdfPreview
              fileName={attachmentPreview.fileName}
              height="70vh"
              ossId={attachmentPreview.ossId}
              url={attachmentPreview.fileUrl}
            />
          ) : (
            <div
              style={{
                width: '100%',
                minHeight: 320,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
              }}
            >
              <div className="flex h-[320px] flex-col items-center justify-center gap-3">
                <Text type="secondary">
                  为避免执行不受信任的活动内容，请下载后查看该附件
                </Text>
                <Button
                  type="primary"
                  onClick={() =>
                    window.open(
                      attachmentPreview.fileUrl,
                      '_blank',
                      'noopener,noreferrer',
                    )
                  }
                >
                  新窗口打开
                </Button>
              </div>
            </div>
          )
        ) : (
          <Empty description="暂无可预览附件" />
        )}
      </Modal>

      <Drawer
        title="客户洞察"
        open={personaOpen}
        size={860}
        destroyOnHidden
        onClose={() => {
          setPersonaOpen(false);
          setOwnerInsightRecord(null);
        }}
      >
        <Space orientation="vertical" size={18} style={{ width: '100%' }}>
          <div
            style={{
              padding: '12px 16px',
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              background: token.colorFillAlter,
            }}
          >
            <Space orientation="vertical" size={10} style={{ width: '100%' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '8px 16px',
                }}
              >
                <div>
                  <Text type="secondary">资产编号</Text>
                  <div>{toText(ownerInsightRecord?.debtNumber)}</div>
                </div>
                <div>
                  <Text type="secondary">业主</Text>
                  <div>
                    <Text strong>{toText(ownerInsightRecord?.debtorName)}</Text>
                  </div>
                </div>
                <div>
                  <Text type="secondary">所属项目</Text>
                  <div>{toText(ownerInsightRecord?.organization)}</div>
                </div>
                <div>
                  <Text type="secondary">当前画像</Text>
                  <div>{ownerInsightPersonaName}</div>
                </div>
                <div>
                  <Text type="secondary">语义记录</Text>
                  <div>{ownerInsightSemanticText}</div>
                </div>
              </div>
            </Space>
          </div>

          <Tabs
            activeKey={ownerInsightActiveTab}
            onChange={(key: string) =>
              setOwnerInsightActiveTab(key as OwnerInsightTabKey)
            }
            items={[
              {
                key: 'persona',
                label: '用户画像',
                children: (
                  <Spin spinning={personaLoading}>
                    {personaData ? (
                      <Space
                        orientation="vertical"
                        size={12}
                        style={{ width: '100%' }}
                      >
                        {personaData.priority ||
                        personaOriginInfo ||
                        personaTags.length > 0 ? (
                          <Space size={[8, 6]} wrap>
                            {personaData.priority ? (
                              <Tag>优先级：{personaData.priority}</Tag>
                            ) : null}
                            {personaOriginInfo ? (
                              <>
                                <Tag color="gold">当前画像已变更</Tag>
                                <Text type="secondary">
                                  初始化画像：
                                  {personaOriginInfo.initialPersonaName}
                                </Text>
                              </>
                            ) : null}
                            {personaTags.map((tag) => (
                              <Tag key={tag}>{tag}</Tag>
                            ))}
                          </Space>
                        ) : null}

                        <Tabs
                          activeKey={personaActiveTab}
                          onChange={(key: string) =>
                            setPersonaActiveTab(key as DetailTabKey)
                          }
                          items={detailTabs.map((tab) => ({
                            key: tab.key,
                            label: tab.label,
                            children: renderPersonaMarkdownContent(
                              personaData[tab.key],
                            ),
                          }))}
                        />
                      </Space>
                    ) : (
                      <Empty description="暂无画像数据" />
                    )}
                  </Spin>
                ),
              },
              {
                key: 'communication',
                label: '语义分析',
                children: (
                  <CommunicationLogContent
                    loading={communicationLogLoading}
                    detail={communicationLogDetail}
                    emptyDescription="暂无语义分析数据"
                    showSummaryCard={Boolean(
                      communicationLogDetail?.logs.length,
                    )}
                    skeletonRows={4}
                  />
                ),
              },
            ]}
          />
        </Space>
      </Drawer>

      <FlowTraceDrawer
        open={traceOpen}
        instanceId={traceInstanceId}
        onClose={() => setTraceOpen(false)}
        onChanged={refreshAll}
      />

      <Drawer
        title="流程详情"
        open={flowStartFailureOpen}
        size="large"
        destroyOnHidden
        footer={
          flowStartFailureRecord ? (
            <div className="flex justify-end gap-2">
              <Button icon={<EditOutlined />} onClick={openFlowStartDebtEdit}>
                编辑债务信息
              </Button>
              <Button
                icon={<ReloadOutlined aria-hidden={true} />}
                loading={flowStartRetrying}
                type="primary"
                onClick={() => {
                  void retryFlowStartFailure();
                }}
              >
                重新发起
              </Button>
            </div>
          ) : null
        }
        onClose={() => {
          setFlowStartFailureOpen(false);
          setFlowStartFailureRecord(null);
          closeDebtEdit();
        }}
      >
        {flowStartFailureRecord ? (
          <div className="flex flex-col gap-4">
            <Alert
              showIcon
              type="error"
              title="流程发起失败"
              description={getNonEmptyText(
                flowStartFailureRecord.flowStartErrorMessage,
                flowStartFailureRecord.currentStatusReason,
                '流程发起阶段失败，尚未生成流程实例。',
              )}
            />
            {renderDetailSection('发起信息', [
              {
                label: '资产编号',
                content: toText(flowStartFailureRecord.debtNumber),
              },
              {
                label: '业主姓名',
                content: toText(flowStartFailureRecord.debtorName),
              },
              {
                label: '所属城市',
                content: toText(flowStartFailureRecord.city),
              },
              {
                label: '所属项目',
                content: toText(flowStartFailureRecord.organization),
              },
              {
                label: '当前状态',
                content: renderCurrentStatusTag(
                  flowStartFailureRecord.currentStatus,
                  flowStartFailureRecord.currentStatusReason,
                  flowStartFailureRecord.flowStartErrorMessage,
                  { preserveRaw: true },
                ),
              },
              {
                label: '发起时间',
                content: toText(flowStartFailureRecord.flowStartTime),
              },
              {
                label: '失败原因',
                content: renderFailureReason(
                  getNonEmptyText(
                    flowStartFailureRecord.flowStartErrorMessage,
                    flowStartFailureRecord.currentStatusReason,
                  ),
                  'danger',
                ),
                span: 2,
              },
            ])}
          </div>
        ) : (
          <Empty description="暂无流程详情" />
        )}
      </Drawer>

      <Modal
        title={
          debtEditRecord?.debtNumber
            ? `编辑债务信息 · ${debtEditRecord.debtNumber}`
            : '编辑债务信息'
        }
        open={debtEditOpen}
        width={760}
        destroyOnHidden
        okText="保存"
        cancelText="取消"
        confirmLoading={debtEditSubmitting}
        onOk={() => debtEditForm.submit()}
        onCancel={closeDebtEdit}
      >
        <Form form={debtEditForm} layout="vertical" onFinish={submitDebtEdit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              columnGap: 16,
            }}
          >
            <Form.Item
              name="debtorName"
              label="业主姓名"
              rules={[{ required: true, message: '请输入业主姓名' }]}
            >
              <Input placeholder="请输入业主姓名" />
            </Form.Item>
            <Form.Item name="debtorPhone" label="电话号码">
              <Input placeholder="请输入电话号码" />
            </Form.Item>
            <Form.Item name="city" label="所属城市">
              <Input placeholder="请输入所属城市" />
            </Form.Item>
            <Form.Item name="organization" label="所属项目">
              <Input placeholder="请输入所属项目" />
            </Form.Item>
            <Form.Item name="debtAmount" label="逾期金额">
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                placeholder="请输入逾期金额"
              />
            </Form.Item>
            <Form.Item name="overdueAmount" label="违约（滞纳）金">
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                placeholder="请输入违约（滞纳）金"
              />
            </Form.Item>
            <Form.Item name="overdueDays" label="逾期天数">
              <InputNumber
                min={0}
                precision={0}
                style={{ width: '100%' }}
                placeholder="请输入逾期天数"
              />
            </Form.Item>
            <Form.Item name="deadlineTime" label="缴费截止日期">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="debtorEmail" label="业主邮箱">
              <Input placeholder="请输入业主邮箱" />
            </Form.Item>
            <Form.Item name="debtIdCard" label="身份证号码">
              <Input placeholder="请输入身份证号码" />
            </Form.Item>
            <Form.Item name="area" label="房屋面积">
              <Input placeholder="请输入房屋面积" />
            </Form.Item>
            <Form.Item
              name="address"
              label="房屋地址"
              style={{ gridColumn: '1 / -1' }}
            >
              <Input.TextArea rows={2} placeholder="请输入房屋地址" />
            </Form.Item>
            <Form.Item
              name="reminderRemark"
              label="历史催缴说明"
              style={{ gridColumn: '1 / -1' }}
            >
              <Input.TextArea rows={3} placeholder="请输入历史催缴说明" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </RecovListPage>
  );
};

export default DatelligencePage;
