import {
  ArrowLeftOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FilePdfOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  SendOutlined,
  SyncOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Form,
  Grid,
  Input,
  Modal,
  message,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PdfPreview from '@/components/PdfPreview';
import TableActions from '@/components/TableActions';
import TemplateEditor from '@/components/TemplateEditor';
import type { TemplateEditorFeatures } from '@/components/TemplateEditor/types';
import { useTemplateVariables } from '@/hooks/useTemplateVariables';
import MetricIcon, {
  type MetricTone,
} from '@/pages/recov/components/MetricIcon';
import {
  RECOV_FILTER_CONTROL_STYLE,
  RECOV_LIST_COLUMN_WIDTH,
  RECOV_ORGANIZATION_POPUP_WIDTH,
  renderRecovSelectOptionLabel,
  renderRecovSingleLineText,
} from '@/pages/recov/components/RecovFilterControls';
import {
  RecovPage,
  RecovStatsStrip,
  RecovTableCard,
} from '@/pages/recov/components/RecovListLayout';
import {
  type DeliveryTaskItem,
  getDeliveryTaskByBusiness,
  retryDeliveryTask,
} from '@/services/ruoyi/deliveryTask';
import {
  addSupplementalInstrumentTask,
  getInstrumentTaskDetail,
  getInstrumentTaskGroupDetail,
  type InstrumentMetricItem,
  type InstrumentTaskDetail,
  type InstrumentTaskGroupDetail,
  type InstrumentTaskGroupItem,
  type InstrumentTaskItem,
  type InstrumentTaskQuery,
  type InstrumentTaskRunParams,
  listInstrumentCities,
  listInstrumentOrganizations,
  pageInstrumentTask,
  pageInstrumentTaskDebts,
  retryInstrumentTasks,
  runInstrumentTasks,
  updateInstrumentTaskContent,
} from '@/services/ruoyi/instrument';
import { downloadOss, listOssByIds } from '@/services/ruoyi/oss';
import { listSeal, type SealCode, type SealVO } from '@/services/ruoyi/seal';
import {
  matchStanding,
  type StandingMatchItem,
  type StandingMatchVO,
} from '@/services/ruoyi/standing';
import { normalizeInstrumentMetricTitle } from './_shared';
import {
  InstrumentDocumentNavItem,
  InstrumentDocumentPreviewStage,
  InstrumentDocumentWorkspaceShell,
} from './components/DocumentPreviewWorkspace';
import './index.css';

const { Text } = Typography;

type InstrumentCategory =
  | '催收函件'
  | '诉讼材料'
  | '委托授权材料'
  | '主体资格证明';
type EditorMode = 'add' | 'edit';
type EditorTab = 'edit' | 'preview';
type WorkspaceMode = 'preview' | 'edit' | 'add';
type DebtSelectorMode = 'attach' | 'generate';

type QueryValues = {
  debtNumber?: string;
  city?: string;
  organization?: string;
  displayGroupCode?: string;
};

type DebtSearchValues = {
  debtorName?: string;
  debtNumber?: string;
};

type EditFormValues = {
  instrumentName: string;
  debtorName?: string;
  sealIds?: string[];
};

type GroupContext = {
  debtId?: number | string;
  debtorName?: string;
  debtNumber?: string;
  category: string;
  displayGroupCode: string;
  displayGroupName: string;
};

type DocumentPreview = {
  visible: boolean;
  loading: boolean;
  downloading: boolean;
  ossId?: number | string;
  instrumentName: string;
  debtorName: string;
  fileName: string;
  fileUrl: string;
};

type WorkspaceFilePreview = {
  ossId?: number | string;
  fileUrl: string;
  loading: boolean;
};

const DEFAULT_PAGE_SIZE = 10;
const LITIGATION_GROUP_CODE = 'LITIGATION_MATERIALS';
const LITIGATION_GROUP_NAME = '诉讼材料';
const AUTHORIZATION_GROUP_CODE = 'AUTHORIZATION_MATERIALS';
const AUTHORIZATION_GROUP_NAME = '委托授权材料';
const SUBJECT_STANDING_GROUP_CODE = 'SUBJECT_STANDING';
const SUBJECT_STANDING_GROUP_NAME = '主体资格证明';
const DELIVERY_GROUP_CODES = new Set(['UR_CO', 'UR_LAW']);
const SEAL_STATUS_TAG_COLOR = 'purple';
const LETTER_TYPE_FILTER_OPTIONS = [
  { label: '律师催收函', value: 'UR_LAW' },
  { label: '企业催收函', value: 'UR_CO' },
];
const FILING_GROUP_CODES = new Set([
  LITIGATION_GROUP_CODE,
  AUTHORIZATION_GROUP_CODE,
  SUBJECT_STANDING_GROUP_CODE,
]);
const CURRENCY_METRIC_KEYS = new Set(['recovered', 'stageRepaymentAmount']);
const SUPPLEMENTAL_SEAL_CODES: SealCode[] = [
  'company_seal',
  'lawyer_seal',
  'law_firm_seal',
];
const HIDDEN_WORKSPACE_STATUS_CODES = new Set([8]);
const SEAL_PLACEHOLDER_BLOCK_REGEXP =
  /<div\b[^>]*\bdata-seal-placeholder-block=(["'])selected\1[^>]*>[\s\S]*?<\/div>/i;
const SEAL_PLACEHOLDER_ELEMENT_REGEXP =
  /<span\b[^>]*\bdata-seal-placeholder=(["'])[^"']+\1[^>]*>[\s\S]*?<\/span>/i;
const SEAL_PLACEHOLDER_ELEMENT_GLOBAL_REGEXP =
  /<span\b[^>]*\bdata-seal-placeholder=(["'])[^"']+\1[^>]*>[\s\S]*?<\/span>/gi;
const EMPTY_SEAL_PLACEHOLDER_BLOCK_REGEXP =
  /<div\b[^>]*\bdata-seal-placeholder-block=(["'])selected\1[^>]*>\s*(?:<p\b[^>]*>\s*<\/p>\s*)?<\/div>/gi;

const categoryGroupMap: Record<
  Exclude<InstrumentCategory, '催收函件'>,
  { displayGroupCode: string; displayGroupName: string }
> = {
  诉讼材料: {
    displayGroupCode: LITIGATION_GROUP_CODE,
    displayGroupName: LITIGATION_GROUP_NAME,
  },
  委托授权材料: {
    displayGroupCode: AUTHORIZATION_GROUP_CODE,
    displayGroupName: AUTHORIZATION_GROUP_NAME,
  },
  主体资格证明: {
    displayGroupCode: SUBJECT_STANDING_GROUP_CODE,
    displayGroupName: SUBJECT_STANDING_GROUP_NAME,
  },
};

const statusMap: Record<number, { label: string; color: string }> = {
  0: { label: '待生成', color: 'default' },
  1: { label: '生成中', color: 'processing' },
  2: { label: '已生成', color: 'blue' },
  3: { label: '生成失败', color: 'error' },
  4: { label: '盖章中', color: 'processing' },
  5: { label: '已盖章', color: SEAL_STATUS_TAG_COLOR },
  6: { label: '盖章失败', color: 'error' },
  7: { label: '送达中', color: 'warning' },
  8: { label: '盖章阻塞', color: 'orange' },
};

const deliveryStatusMap: Record<number, { label: string; color: string }> = {
  0: { label: '待送达', color: 'default' },
  1: { label: '送达中', color: 'processing' },
  2: { label: '已送达', color: 'success' },
  3: { label: '送达失败', color: 'error' },
};

const instrumentEditorFeatures: TemplateEditorFeatures = {
  textStyle: true,
  color: true,
  backgroundColor: true,
  align: true,
  image: false,
  table: false,
  variable: true,
  fontFamily: true,
  fontSize: true,
};

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 0,
});

const compactNumberFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
});

const statCardStyles = {
  body: {
    padding: 12,
  },
} satisfies { body: CSSProperties };

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const toText = (value: unknown) =>
  value === null || value === undefined || value === '' ? '-' : String(value);

const formatAmount = (value: unknown) =>
  currencyFormatter.format(toNumber(value));

const formatCompactAmount = (value: unknown) => {
  const amount = toNumber(value);
  const absAmount = Math.abs(amount);
  if (absAmount >= 100000000) {
    return `¥${compactNumberFormatter.format(amount / 100000000)}亿`;
  }
  if (absAmount >= 10000) {
    return `¥${compactNumberFormatter.format(amount / 10000)}万`;
  }
  return formatAmount(amount);
};

const trimCurrencySymbol = (value: string) => value.replace(/^CN¥|^¥/, '');

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : value;
};

const getStatusInfo = (status?: number) =>
  statusMap[Number(status)] || { label: '未知', color: 'default' };

const getDeliveryStatusInfo = (status?: number | null) =>
  deliveryStatusMap[Number(status)] || { label: '未知', color: 'default' };

const shouldShowWorkspaceDocumentStatusTag = (status?: number | null) =>
  !HIDDEN_WORKSPACE_STATUS_CODES.has(Number(status));

const getGroupStatusInfo = (record?: InstrumentTaskGroupItem | null) => {
  const explicitStatus = record?.status;
  if (
    explicitStatus !== null &&
    explicitStatus !== undefined &&
    String(explicitStatus).trim() !== ''
  ) {
    return getStatusInfo(Number(explicitStatus));
  }

  const totalCount = toNumber(record?.totalCount);
  const sealedCount = toNumber(record?.sealedCount);
  const generatedCount = toNumber(record?.generatedCount);

  if (toNumber(record?.failedCount) > 0) {
    return { label: '处理异常', color: 'error' };
  }
  if (toNumber(record?.processingCount) > 0) {
    return { label: '处理中', color: 'processing' };
  }
  if (totalCount > 0 && sealedCount >= totalCount) {
    return getStatusInfo(5);
  }
  if (sealedCount > 0) {
    return { label: '部分盖章', color: SEAL_STATUS_TAG_COLOR };
  }
  if (totalCount > 0 && generatedCount >= totalCount) {
    return getStatusInfo(2);
  }
  if (generatedCount > 0) {
    return { label: '部分生成', color: 'blue' };
  }

  return getStatusInfo(0);
};

const renderInstrumentGroupStatus = (record: InstrumentTaskGroupItem) => {
  const status = getGroupStatusInfo(record);
  return <Tag color={status.color}>{status.label}</Tag>;
};

const getGroupRowKey = (record: InstrumentTaskGroupItem) =>
  String(
    record.groupId ??
      `${record.debtId ?? record.debtNumber}:${record.displayGroupCode}`,
  );

const getDocumentRowKey = (record: InstrumentTaskItem) => String(record.id);

const isProcessingStatus = (status?: number) =>
  Number(status) === 1 || Number(status) === 4;

const getDocumentFileOssId = (
  record?: InstrumentTaskItem | null,
  detail?: InstrumentTaskDetail | null,
) =>
  detail?.displayOssId ||
  record?.displayOssId ||
  detail?.sealedOssId ||
  record?.sealedOssId ||
  detail?.draftOssId ||
  record?.draftOssId;

const isSealedDocument = (
  record?: InstrumentTaskItem | null,
  detail?: InstrumentTaskDetail | null,
) =>
  String(detail?.displayStage || record?.displayStage || '').toUpperCase() ===
    'SEALED' || Number(detail?.status ?? record?.status) === 5;

const isDeliveryGroup = (code?: string) =>
  Boolean(code && DELIVERY_GROUP_CODES.has(code));

const getCategoryGroupConfig = (category: InstrumentCategory) =>
  category === '催收函件' ? undefined : categoryGroupMap[category];

const isFilingGroup = (
  group?:
    | InstrumentTaskGroupItem
    | InstrumentTaskGroupDetail
    | GroupContext
    | null,
) =>
  Boolean(
    group &&
      (FILING_GROUP_CODES.has(String(group.displayGroupCode || '')) ||
        Object.keys(categoryGroupMap).includes(String(group.category || '')) ||
        Object.values(categoryGroupMap).some(
          (item) => item.displayGroupName === group.displayGroupName,
        )),
  );

const isSubjectStandingGroup = (
  group?:
    | InstrumentTaskGroupItem
    | InstrumentTaskGroupDetail
    | GroupContext
    | null,
) =>
  group?.displayGroupCode === SUBJECT_STANDING_GROUP_CODE ||
  group?.category === SUBJECT_STANDING_GROUP_NAME ||
  group?.displayGroupName === SUBJECT_STANDING_GROUP_NAME;

const formatStandingApplicability = (item: StandingMatchItem) => {
  if (item.wildcard || (item.startNum == null && item.endNum == null)) {
    return '全部';
  }
  if (item.startNum != null && item.endNum != null) {
    return `${item.startNum}-${item.endNum}`;
  }
  if (item.startNum != null) {
    return `${item.startNum} 起`;
  }
  if (item.endNum != null) {
    return `${item.endNum} 以内`;
  }
  return '全部';
};

const isEmptyHtml = (value: string) => {
  const text = value
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, '')
    .trim();
  return !text;
};

const hasSealPlaceholder = (value: string) =>
  /\bdata-seal-placeholder\b/i.test(value);

const escapeHtmlAttribute = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const normalizeSealRows = (response: unknown): SealVO[] => {
  const res = response as {
    data?: { page?: { rows?: SealVO[] }; rows?: SealVO[] };
    rows?: SealVO[];
  };
  return res.data?.page?.rows ?? res.data?.rows ?? res.rows ?? [];
};

const getSealOptionId = (seal: SealVO) => String(seal.id);

const isSealEnabled = (seal: SealVO) => String(seal.status) === '1';

const isSealApplicableToDebtNumber = (
  seal: SealVO,
  debtNumber?: string | number,
) => {
  if (seal.startNum == null && seal.endNum == null) return true;
  if (debtNumber === undefined || debtNumber === null || debtNumber === '') {
    return false;
  }
  const current = Number(debtNumber);
  if (!Number.isFinite(current)) return false;
  const start = seal.startNum ?? Number.NEGATIVE_INFINITY;
  const end = seal.endNum ?? Number.POSITIVE_INFINITY;
  return current >= start && current <= end;
};

const getSealRangeText = (seal: SealVO) =>
  seal.startNum != null && seal.endNum != null
    ? `${seal.startNum}-${seal.endNum}`
    : '全部资产';

const formatSealOptionLabel = (seal: SealVO) =>
  `${seal.sealName || seal.sealCode}｜${getSealRangeText(seal)}`;

const resolveSealCodes = (seals: SealVO[]) => {
  const selectedCodes = new Set(
    seals.map((seal) => seal.sealCode).filter(Boolean),
  );
  return SUPPLEMENTAL_SEAL_CODES.filter((sealCode) =>
    selectedCodes.has(sealCode),
  );
};

const buildSealPlaceholdersHtml = (seals: SealVO[]) => {
  const sealCodes = resolveSealCodes(seals);
  if (!sealCodes.length) return '';
  return `<span class="instrument-seal-placeholder" data-seal-placeholder="seal_group" data-seal-codes="${escapeHtmlAttribute(sealCodes.join(','))}" data-width-mm="36" data-height-mm="36" style="display:inline-flex;align-items:center;justify-content:center;gap:6mm;width:auto;min-width:36mm;height:36mm;border:1px dashed #cbd5e1;border-radius:4px;vertical-align:middle;"></span>`;
};

const buildSealPlaceholderParagraphHtml = (seals: SealVO[]) => {
  const placeholderHtml = buildSealPlaceholdersHtml(seals);
  return placeholderHtml
    ? `<p style="text-align:right;margin-top:32px;">${placeholderHtml}</p>`
    : '';
};

const buildSealPlaceholderBlock = (seals: SealVO[]) => {
  const placeholdersHtml = buildSealPlaceholderParagraphHtml(seals);
  return placeholdersHtml
    ? `<div data-seal-placeholder-block="selected">${placeholdersHtml}</div>`
    : '';
};

const stripAdditionalSealPlaceholders = (html: string) => {
  let hasKeptPlaceholder = false;
  return html
    .replace(SEAL_PLACEHOLDER_ELEMENT_GLOBAL_REGEXP, (match) => {
      if (hasKeptPlaceholder) return '';
      hasKeptPlaceholder = true;
      return match;
    })
    .replace(EMPTY_SEAL_PLACEHOLDER_BLOCK_REGEXP, '');
};

const ensureSealPlaceholderBlock = (html: string, selectedSeals: SealVO[]) => {
  const nextPlaceholderHtml = buildSealPlaceholdersHtml(selectedSeals);
  const nextBlock = buildSealPlaceholderBlock(selectedSeals);
  if (nextPlaceholderHtml && SEAL_PLACEHOLDER_ELEMENT_REGEXP.test(html)) {
    return stripAdditionalSealPlaceholders(
      html.replace(SEAL_PLACEHOLDER_ELEMENT_REGEXP, nextPlaceholderHtml),
    );
  }
  if (SEAL_PLACEHOLDER_BLOCK_REGEXP.test(html)) {
    return stripAdditionalSealPlaceholders(
      html.replace(SEAL_PLACEHOLDER_BLOCK_REGEXP, nextBlock),
    );
  }
  if (!nextBlock) return html;
  return stripAdditionalSealPlaceholders(`${html || '<p></p>'}${nextBlock}`);
};

const buildDefaultSupplementalHtml = (seals: SealVO[] = []) =>
  buildSealPlaceholderParagraphHtml(seals);

const previewViewerStyle = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html { background: #f3f4f6 !important; }
  body { margin: 0 !important; padding: 30px 0 44px !important; background: #f3f4f6 !important; color: #1f2937; font-family: Arial, "Microsoft YaHei", "Noto Sans CJK SC", "PingFang SC", sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .instrument-pdf-page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 22mm 24mm; background: #fff; border: 1px solid #e5e7eb; box-shadow: 0 18px 42px rgba(15, 23, 42, .10); box-sizing: border-box; }
  @media print { html, body { padding: 0 !important; background: #fff !important; } .instrument-pdf-page { margin: 0; border: 0; box-shadow: none; } }
  @media screen and (max-width: 860px) { body { padding: 18px 0 32px !important; } .instrument-pdf-page { width: calc(100vw - 32px); min-height: auto; padding: 40px 44px 56px; } }
  h1, h2, h3 { margin: 0 0 18px; color: #111827; line-height: 1.45; }
  p { margin: 0 0 12px; line-height: 1.9; }
  [data-seal-placeholder], .instrument-seal-placeholder { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 6mm; width: auto; min-width: 36mm; height: 36mm; border: 1px dashed #cbd5e1; border-radius: 4px; background: repeating-linear-gradient(45deg, #f8fafc 0, #f8fafc 8px, #f1f5f9 8px, #f1f5f9 16px); color: #94a3b8; font-size: 12px; line-height: 1.4; vertical-align: middle; }
  [data-seal-placeholder]::after, .instrument-seal-placeholder::after { content: "签章位"; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; letter-spacing: 0; pointer-events: none; }
  .instrument-seal-image { display: inline-block; width: 36mm; height: 36mm; object-fit: contain; }
  img { max-width: 100%; }
  .tiptap-variable { color: #1677ff; background: #e6f4ff; border: 1px solid #91caff; border-radius: 4px; padding: 0 4px; }
`;

const wrapFullPreviewHtml = (html: string) => {
  const styledHtml = /<\/head>/i.test(html)
    ? html.replace(
        /<\/head>/i,
        `<style data-instrument-preview-viewer>${previewViewerStyle}</style></head>`,
      )
    : `<style data-instrument-preview-viewer>${previewViewerStyle}</style>${html}`;
  if (/\binstrument-pdf-page\b/i.test(styledHtml)) return styledHtml;
  if (/<body\b[^>]*>/i.test(styledHtml)) {
    return styledHtml
      .replace(/<body\b([^>]*)>/i, '<body$1><main class="instrument-pdf-page">')
      .replace(/<\/body>/i, '</main></body>');
  }
  return `<!doctype html><html><head><meta charset="utf-8" /><style data-instrument-preview-viewer>${previewViewerStyle}</style></head><body><main class="instrument-pdf-page">${html}</main></body></html>`;
};

const renderPreviewHtml = (html: string) => {
  if (/<html[\s>]/i.test(html)) return wrapFullPreviewHtml(html);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>${previewViewerStyle}</style>
</head>
<body>
  <main class="instrument-pdf-page">${html || '<p></p>'}</main>
</body>
</html>`;
};

const parseJsonRecord = (value?: string): Record<string, unknown> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

const buildContentJson = (
  detail: InstrumentTaskDetail | null,
  instrumentName: string,
) => ({
  ...parseJsonRecord(detail?.contentJson ?? detail?.templateJson),
  instrumentName,
});

const buildTemplateJson = (instrumentName: string, sealIds: string[]) => ({
  instrumentName,
  sealIds,
});

const normalizeSealIdList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    if (text.startsWith('[')) {
      try {
        return normalizeSealIdList(JSON.parse(text));
      } catch {
        return [];
      }
    }
    return text
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (value === null || value === undefined) return [];
  return [String(value)];
};

const getDocumentEditorSealIds = (
  detail?: InstrumentTaskDetail | null,
): string[] => {
  const directSealIds = normalizeSealIdList(detail?.sealIds);
  if (directSealIds.length) return directSealIds;

  const jsonSources = [
    detail?.customTemplateJson,
    detail?.contentJson,
    detail?.templateJson,
  ];
  for (const source of jsonSources) {
    const sealIds = normalizeSealIdList(parseJsonRecord(source).sealIds);
    if (sealIds.length) return sealIds;
  }
  return [];
};

const getEditableDocumentHtml = (detail?: InstrumentTaskDetail | null) =>
  detail?.contentHtml ||
  detail?.customTemplateHtml ||
  detail?.templateHtml ||
  detail?.previewHtml ||
  '<p></p>';

const buildLocalEditedDocumentPreview = (
  record: InstrumentTaskItem,
  detail: InstrumentTaskDetail | null,
  instrumentName: string,
  html: string,
  isSupplemental: boolean,
): InstrumentTaskDetail => ({
  ...record,
  ...(detail ?? {}),
  instrumentName,
  status: 1,
  displayStage: 'DRAFT',
  displayOssId: undefined,
  draftOssId: undefined,
  sealedOssId: undefined,
  hasPendingRevision: true,
  previewHtml: html,
  ...(isSupplemental
    ? { customTemplateHtml: html }
    : {
        contentHtml: html,
      }),
});

const normalizeTaskPage = (response: unknown) => {
  const res = response as {
    data?: {
      page?: { rows?: InstrumentTaskGroupItem[]; total?: number };
      rows?: InstrumentTaskGroupItem[];
      total?: number;
      metrics?: InstrumentMetricItem[];
    };
    rows?: InstrumentTaskGroupItem[];
    total?: number;
  };
  return {
    rows: res.data?.page?.rows ?? res.data?.rows ?? res.rows ?? [],
    total: res.data?.page?.total ?? res.data?.total ?? res.total ?? 0,
    metrics: res.data?.metrics ?? [],
  };
};

const normalizeDebtPage = (response: unknown) => {
  const res = response as {
    data?: {
      page?: { rows?: InstrumentTaskItem[]; total?: number };
      rows?: InstrumentTaskItem[];
      total?: number;
    };
    rows?: InstrumentTaskItem[];
    total?: number;
  };
  return {
    rows: res.data?.page?.rows ?? res.data?.rows ?? res.rows ?? [],
    total: res.data?.page?.total ?? res.data?.total ?? res.total ?? 0,
  };
};

type StatDisplayValue = {
  primary: string;
  unit?: string;
  tooltip?: string;
};

type StatCardProps = {
  title: string;
  value: StatDisplayValue;
  tone: MetricTone;
  icon: ReactNode;
};

const StatCard = ({ title, value, tone, icon }: StatCardProps) => {
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
            fontSize: 22,
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
            style={{ cursor: 'inherit', fontSize: 12, whiteSpace: 'nowrap' }}
          >
            {value.unit}
          </Text>
        ) : null}
      </Space>
    </span>
  );

  return (
    <ProCard size="small" style={{ minWidth: 0 }} styles={statCardStyles}>
      <div
        style={{
          minHeight: 62,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 8,
          minWidth: 0,
        }}
      >
        <Space align="center" size={8}>
          <MetricIcon icon={icon} tone={tone} />
          <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.3 }}>
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

const InstrumentListPage = () => {
  const screens = Grid.useBreakpoint();
  const isNarrow = !screens.md;
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const { variables: templateVariables } = useTemplateVariables();
  const [queryForm] = Form.useForm<QueryValues>();
  const [editForm] = Form.useForm<EditFormValues>();
  const [debtForm] = Form.useForm<DebtSearchValues>();

  const [activeCategory, setActiveCategory] =
    useState<InstrumentCategory>('催收函件');
  const [queryValues, setQueryValues] = useState<QueryValues>({});
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<InstrumentTaskGroupItem[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<InstrumentMetricItem[]>([]);
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<React.Key[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [organizationOptions, setOrganizationOptions] = useState<string[]>([]);
  const [sealOptions, setSealOptions] = useState<SealVO[]>([]);
  const [sealLoading, setSealLoading] = useState(false);

  const [groupVisible, setGroupVisible] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);
  const [currentGroup, setCurrentGroup] =
    useState<InstrumentTaskGroupItem | null>(null);
  const [groupDetail, setGroupDetail] =
    useState<InstrumentTaskGroupDetail | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('preview');
  const [selectedDocument, setSelectedDocument] =
    useState<InstrumentTaskItem | null>(null);
  const [selectedDocumentDetail, setSelectedDocumentDetail] =
    useState<InstrumentTaskDetail | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [standingLoading, setStandingLoading] = useState(false);
  const [standingMatch, setStandingMatch] = useState<StandingMatchVO | null>(
    null,
  );

  const [editMode, setEditMode] = useState<EditorMode>('add');
  const [editorTab, setEditorTab] = useState<EditorTab>('edit');
  const [saveLoading, setSaveLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InstrumentTaskItem | null>(
    null,
  );
  const [editingDetail, setEditingDetail] =
    useState<InstrumentTaskDetail | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<InstrumentTaskItem | null>(
    null,
  );
  const [groupContext, setGroupContext] = useState<GroupContext | null>(null);
  const [editorValue, setEditorValue] = useState('<p></p>');

  const [debtVisible, setDebtVisible] = useState(false);
  const [debtSelectorMode, setDebtSelectorMode] =
    useState<DebtSelectorMode>('attach');
  const [debtLoading, setDebtLoading] = useState(false);
  const [debtData, setDebtData] = useState<InstrumentTaskItem[]>([]);
  const [debtTotal, setDebtTotal] = useState(0);
  const [debtPageNum, setDebtPageNum] = useState(1);
  const [debtPageSize, setDebtPageSize] = useState(10);
  const [debtQueryValues, setDebtQueryValues] = useState<DebtSearchValues>({});

  const [preview, setPreview] = useState<DocumentPreview>({
    visible: false,
    loading: false,
    downloading: false,
    instrumentName: '',
    debtorName: '',
    fileName: '',
    fileUrl: '',
  });
  const [deliveryDetailOpen, setDeliveryDetailOpen] = useState(false);
  const [deliveryDetailLoading, setDeliveryDetailLoading] = useState(false);
  const [deliveryDetail, setDeliveryDetail] = useState<DeliveryTaskItem | null>(
    null,
  );
  const [retryingDeliveryTaskId, setRetryingDeliveryTaskId] = useState<
    string | null
  >(null);
  const [workspaceFilePreview, setWorkspaceFilePreview] =
    useState<WorkspaceFilePreview>({
      loading: false,
      fileUrl: '',
    });
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const query: InstrumentTaskQuery = {
        pageNum,
        pageSize,
        category: activeCategory,
        ...queryValues,
      };
      const response = await pageInstrumentTask(query);
      const data = normalizeTaskPage(response);
      setTableData(data.rows);
      setTotal(data.total);
      setMetrics(data.metrics);
    } catch (error) {
      console.error('获取文书任务列表失败:', error);
      messageApi.error('获取文书任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, messageApi, pageNum, pageSize, queryValues]);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const [citiesRes, orgsRes] = await Promise.all([
        listInstrumentCities(),
        listInstrumentOrganizations(),
      ]);
      setCityOptions(citiesRes.data ?? []);
      setOrganizationOptions(orgsRes.data ?? []);
    } catch (error) {
      console.error('加载文书筛选项失败:', error);
    }
  }, []);

  const fetchSealOptions = useCallback(
    async (debtNumber?: string | number) => {
      setSealLoading(true);
      try {
        const results = await Promise.all(
          SUPPLEMENTAL_SEAL_CODES.map((sealCode) =>
            listSeal({ sealCode, pageNum: 1, pageSize: 1000, status: '1' }),
          ),
        );
        const deduped = new Map<string, SealVO>();
        results
          .flatMap((response) => normalizeSealRows(response))
          .filter(isSealEnabled)
          .filter((seal) => isSealApplicableToDebtNumber(seal, debtNumber))
          .forEach((seal) => {
            deduped.set(getSealOptionId(seal), seal);
          });
        setSealOptions(Array.from(deduped.values()));
      } catch (error) {
        console.error('获取签章印章失败:', error);
        setSealOptions([]);
        messageApi.error('获取签章印章失败');
      } finally {
        setSealLoading(false);
      }
    },
    [messageApi],
  );

  const resolveSelectedSeals = useCallback(
    (selectedSealIds: string[] = []) => {
      const selectedSet = new Set(selectedSealIds.map(String));
      return sealOptions.filter((seal) =>
        selectedSet.has(getSealOptionId(seal)),
      );
    },
    [sealOptions],
  );

  const handleSealSelectionChange = (selectedSealIds: string[]) => {
    const selectedSeals = resolveSelectedSeals(selectedSealIds);
    setEditorValue((value) => ensureSealPlaceholderBlock(value, selectedSeals));
    setEditorTab('preview');
  };

  const loadStandingMatch = useCallback(
    async (debtId?: number | string) => {
      if (!debtId) {
        setStandingMatch(null);
        return;
      }
      setStandingLoading(true);
      try {
        const response = await matchStanding(debtId);
        setStandingMatch(response.data ?? null);
      } catch (error) {
        console.error('获取主体资格材料匹配结果失败:', error);
        setStandingMatch(null);
        messageApi.error('获取主体资格材料匹配结果失败');
      } finally {
        setStandingLoading(false);
      }
    },
    [messageApi],
  );

  const refreshGroupDetail = useCallback(async () => {
    if (!currentGroup?.debtId || !currentGroup.displayGroupCode) return;
    setGroupLoading(true);
    try {
      const response = await getInstrumentTaskGroupDetail(
        currentGroup.debtId,
        currentGroup.displayGroupCode,
      );
      const detail = response.data ?? null;
      setGroupDetail(detail);
      if (isSubjectStandingGroup(detail ?? currentGroup)) {
        await loadStandingMatch(detail?.debtId ?? currentGroup.debtId);
      } else {
        setStandingMatch(null);
      }
      if (selectedDocument?.id) {
        const nextSelected = detail?.documents?.find(
          (item) => String(item.id) === String(selectedDocument.id),
        );
        if (nextSelected) {
          setSelectedDocument(nextSelected);
          try {
            const nextSelectedDetail = await getInstrumentTaskDetail(
              nextSelected.id,
            );
            setSelectedDocumentDetail(nextSelectedDetail.data ?? null);
          } catch (error) {
            console.error('刷新选中文书详情失败:', error);
          }
        }
      }
    } catch (error) {
      console.error('获取文书组详情失败:', error);
      messageApi.error('获取文书组详情失败');
    } finally {
      setGroupLoading(false);
    }
  }, [currentGroup, loadStandingMatch, messageApi, selectedDocument]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    void fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    if (!tableData.some((item) => toNumber(item.processingCount) > 0)) return;
    const timer = window.setInterval(() => {
      void fetchList();
      if (groupVisible) void refreshGroupDetail();
    }, 6000);
    return () => window.clearInterval(timer);
  }, [fetchList, groupVisible, refreshGroupDetail, tableData]);

  const metricMap = useMemo(
    () => new Map(metrics.map((item) => [item.key, item])),
    [metrics],
  );

  const getMetricTitle = (key: string, fallback: string) =>
    normalizeInstrumentMetricTitle(metricMap.get(key)?.label, fallback);

  const getMetricValue = (key: string): StatDisplayValue => {
    const metric = metricMap.get(key);
    if (CURRENCY_METRIC_KEYS.has(key)) {
      const amount = metric?.value ?? 0;
      return {
        primary: trimCurrencySymbol(
          metric?.displayValue || formatCompactAmount(amount),
        ),
        tooltip: formatAmount(amount),
        unit: metric?.unit || '元',
      };
    }
    return {
      primary: numberFormatter.format(toNumber(metric?.value)),
      unit: metric?.unit || '份',
    };
  };

  const statCards: StatCardProps[] = [
    {
      title: getMetricTitle('genLetter', '已生成催收函件'),
      value: getMetricValue('genLetter'),
      tone: 'primary',
      icon: <FileTextOutlined />,
    },
    {
      title: getMetricTitle('genLitigation', '已生成起诉材料'),
      value: getMetricValue('genLitigation'),
      tone: 'info',
      icon: <FileSearchOutlined />,
    },
    {
      title: getMetricTitle('genAuthorization', '已生成委托授权材料'),
      value: getMetricValue('genAuthorization'),
      tone: 'warning',
      icon: <FileProtectOutlined />,
    },
    {
      title: getMetricTitle('genSubjectStanding', '已生成主体资格材料'),
      value: getMetricValue('genSubjectStanding'),
      tone: 'success',
      icon: <FileDoneOutlined />,
    },
    {
      title: getMetricTitle('sentLetter', '已发送催收函件'),
      value: getMetricValue('sentLetter'),
      tone: 'neutral',
      icon: <SendOutlined />,
    },
    {
      title: getMetricTitle('litigation', '已进入法诉程序'),
      value: getMetricValue('litigation'),
      tone: 'warning',
      icon: <SyncOutlined />,
    },
    {
      title: getMetricTitle('stageRepaymentAmount', '本阶段回款'),
      value: getMetricValue('stageRepaymentAmount'),
      tone: 'success',
      icon: <WalletOutlined />,
    },
  ];

  const handleQuery = async () => {
    const values = await queryForm.validateFields();
    setQueryValues(
      activeCategory === '催收函件'
        ? values
        : {
            debtNumber: values.debtNumber,
            city: values.city,
            organization: values.organization,
          },
    );
    setPageNum(1);
  };

  const handleResetQuery = () => {
    queryForm.resetFields();
    setQueryValues({});
    setPageNum(1);
  };

  const fetchDebtList = useCallback(async () => {
    if (!debtVisible) return;
    setDebtLoading(true);
    try {
      const response = await pageInstrumentTaskDebts({
        pageNum: debtPageNum,
        pageSize: debtPageSize,
        ...debtQueryValues,
      });
      const data = normalizeDebtPage(response);
      setDebtData(
        data.rows.map((item) => ({
          ...item,
          debtId: item.debtId ?? item.id,
        })),
      );
      setDebtTotal(data.total);
    } catch (error) {
      console.error('获取债务列表失败:', error);
      messageApi.error('获取债务列表失败');
    } finally {
      setDebtLoading(false);
    }
  }, [debtPageNum, debtPageSize, debtQueryValues, debtVisible, messageApi]);

  useEffect(() => {
    void fetchDebtList();
  }, [fetchDebtList]);

  const openDebtSelector = (mode: DebtSelectorMode = 'attach') => {
    setDebtSelectorMode(mode);
    setDebtVisible(true);
    setDebtPageNum(1);
    setDebtQueryValues({});
    debtForm.resetFields();
  };

  const resetWorkspaceDocument = () => {
    setSelectedDocument(null);
    setSelectedDocumentDetail(null);
    setWorkspaceFilePreview({ loading: false, fileUrl: '' });
    setEditingRecord(null);
    setEditingDetail(null);
    setEditorValue('<p></p>');
    editForm.resetFields();
  };

  const closeWorkspace = () => {
    setGroupVisible(false);
    setCurrentGroup(null);
    setGroupDetail(null);
    setGroupContext(null);
    setSelectedDebt(null);
    setStandingMatch(null);
    setWorkspaceMode('preview');
    resetWorkspaceDocument();
  };

  const loadDocumentPreview = async (record: InstrumentTaskItem) => {
    setSelectedDocument(record);
    setWorkspaceMode('preview');
    setDocumentLoading(true);
    try {
      const response = await getInstrumentTaskDetail(record.id);
      setSelectedDocumentDetail(response.data ?? null);
    } catch (error) {
      console.error('获取文书详情失败:', error);
      messageApi.error('获取文书详情失败');
      setSelectedDocumentDetail(null);
    } finally {
      setDocumentLoading(false);
    }
  };

  const switchDocument = (record: InstrumentTaskItem) => {
    if (workspaceMode === 'edit' || workspaceMode === 'add') {
      modalApi.confirm({
        title: '切换文书',
        content: '当前编辑内容尚未保存，切换后会丢失。',
        okText: '继续切换',
        cancelText: '留在当前文书',
        onOk: () => loadDocumentPreview(record),
      });
      return;
    }
    void loadDocumentPreview(record);
  };

  const openGroupDetail = async (record: InstrumentTaskGroupItem) => {
    setCurrentGroup(record);
    setGroupVisible(true);
    setWorkspaceMode('preview');
    resetWorkspaceDocument();
    setGroupLoading(true);
    try {
      const response = await getInstrumentTaskGroupDetail(
        record.debtId as number | string,
        record.displayGroupCode || '',
      );
      const detail = response.data ?? null;
      setGroupDetail(detail);
      if (isSubjectStandingGroup(detail ?? record)) {
        await loadStandingMatch(detail?.debtId ?? record.debtId);
      } else {
        setStandingMatch(null);
      }
      const firstDocument = detail?.documents?.[0];
      if (firstDocument) {
        await loadDocumentPreview(firstDocument);
      }
    } catch (error) {
      console.error('获取文书组详情失败:', error);
      messageApi.error('获取文书组详情失败');
    } finally {
      setGroupLoading(false);
    }
  };

  const openDeliveryDetail = async (
    sceneCode?: string,
    businessId?: number | string,
  ) => {
    if (!sceneCode || !businessId) {
      messageApi.warning('暂无可关联的送达任务');
      return;
    }
    setDeliveryDetailOpen(true);
    setDeliveryDetailLoading(true);
    setDeliveryDetail(null);
    try {
      const detail = await getDeliveryTaskByBusiness(sceneCode, businessId);
      setDeliveryDetail(detail ?? null);
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : '送达详情加载失败，请稍后重试',
      );
    } finally {
      setDeliveryDetailLoading(false);
    }
  };

  const retryDeliveryDetail = () => {
    if (!deliveryDetail?.taskId) {
      messageApi.warning('当前送达任务缺少任务ID，无法重试');
      return;
    }

    modalApi.confirm({
      title: '确认重试送达任务',
      content: `将重新提交资产 ${toText(
        deliveryDetail.debtNumber ?? deliveryDetail.debtId,
      )} 的送达任务。`,
      okText: '重试',
      cancelText: '取消',
      async onOk() {
        setRetryingDeliveryTaskId(deliveryDetail.taskId);
        try {
          const nextDetail = await retryDeliveryTask(deliveryDetail.taskId);
          setDeliveryDetail(nextDetail ?? deliveryDetail);
          messageApi.success('送达任务已重新提交');
          await fetchList();
        } catch (error) {
          messageApi.error(
            error instanceof Error
              ? error.message
              : '送达任务重试失败，请稍后重试',
          );
          throw error;
        } finally {
          setRetryingDeliveryTaskId(null);
        }
      },
    });
  };

  const buildGroupContext = (
    group?: InstrumentTaskGroupItem | InstrumentTaskGroupDetail | null,
  ): GroupContext => {
    const config = getCategoryGroupConfig(activeCategory);
    return {
      debtId: group?.debtId,
      debtorName: group?.debtorName,
      debtNumber: group?.debtNumber,
      category: group?.category || activeCategory,
      displayGroupCode:
        group?.displayGroupCode ||
        config?.displayGroupCode ||
        String(group?.displayGroupName || ''),
      displayGroupName:
        group?.displayGroupName || config?.displayGroupName || activeCategory,
    };
  };

  const openDocumentEditor = async (
    record: InstrumentTaskItem,
    knownDetail?: InstrumentTaskDetail | null,
    sourceGroup?: InstrumentTaskGroupItem | InstrumentTaskGroupDetail | null,
  ) => {
    const contextGroup = sourceGroup ?? groupDetail ?? currentGroup;
    const debtId = record.debtId ?? contextGroup?.debtId;
    setSelectedDocument(record);
    setWorkspaceMode('edit');
    setEditMode('edit');
    setEditingRecord(record);
    setWorkspaceFilePreview({ loading: false, fileUrl: '' });
    setEditorTab('edit');
    setDocumentLoading(true);
    setGroupContext(buildGroupContext(contextGroup));
    setSelectedDebt(
      debtId
        ? {
            id: debtId,
            debtId,
            debtorName: record.debtorName ?? contextGroup?.debtorName,
            debtNumber: record.debtNumber ?? contextGroup?.debtNumber,
          }
        : null,
    );
    try {
      const shouldUseKnownDetail =
        knownDetail && String(knownDetail.id) === String(record.id);
      const detail = shouldUseKnownDetail
        ? knownDetail
        : ((await getInstrumentTaskDetail(record.id)).data ?? null);
      const editorDetail = detail ?? record;
      setSelectedDocumentDetail(detail);
      setEditingDetail(detail);
      setEditorValue(getEditableDocumentHtml(editorDetail));
      editForm.setFieldsValue({
        instrumentName: editorDetail.instrumentName ?? record.instrumentName,
        debtorName:
          editorDetail.debtorName ??
          record.debtorName ??
          contextGroup?.debtorName,
        sealIds: getDocumentEditorSealIds(detail),
      });
      void fetchSealOptions(
        editorDetail.debtNumber ??
          record.debtNumber ??
          contextGroup?.debtNumber,
      );
    } catch (error) {
      console.error('获取文书编辑详情失败:', error);
      messageApi.error('获取文书编辑详情失败');
      setWorkspaceMode('preview');
    } finally {
      setDocumentLoading(false);
    }
  };

  const openAddSupplemental = (
    group?: InstrumentTaskGroupItem | InstrumentTaskGroupDetail | null,
  ) => {
    const context = buildGroupContext(group);
    if (!isFilingGroup(context)) {
      messageApi.warning('催收函件不支持新增补充文书');
      return;
    }
    if (context.debtId) {
      setGroupVisible(true);
      setCurrentGroup((prev) => ({
        ...(prev ?? {}),
        debtId: context.debtId,
        debtorName: context.debtorName,
        debtNumber: context.debtNumber,
        category: context.category,
        displayGroupCode: context.displayGroupCode,
        displayGroupName: context.displayGroupName,
      }));
      if (
        !groupDetail ||
        String(groupDetail.debtId) !== String(context.debtId) ||
        groupDetail.displayGroupCode !== context.displayGroupCode
      ) {
        void getInstrumentTaskGroupDetail(
          context.debtId,
          context.displayGroupCode,
        ).then((response) => setGroupDetail(response.data ?? null));
      }
    } else {
      setGroupVisible(true);
      setCurrentGroup(null);
      setGroupDetail(null);
    }
    setSelectedDocument(null);
    setSelectedDocumentDetail(null);
    setWorkspaceFilePreview({ loading: false, fileUrl: '' });
    setWorkspaceMode('add');
    setEditMode('add');
    setEditingRecord(null);
    setEditingDetail(null);
    setGroupContext(context);
    setSelectedDebt(
      context.debtId
        ? {
            id: context.debtId,
            debtId: context.debtId,
            debtorName: context.debtorName,
            debtNumber: context.debtNumber,
          }
        : null,
    );
    setEditorTab('edit');
    setEditorValue(buildDefaultSupplementalHtml());
    setSealOptions([]);
    void fetchSealOptions(context.debtNumber);
    editForm.setFieldsValue({
      instrumentName: '',
      debtorName: context.debtorName,
      sealIds: [],
    });
  };

  const insertSealPlaceholder = () => {
    const selectedSealIds = editForm.getFieldValue('sealIds') ?? [];
    const selectedSeals = resolveSelectedSeals(selectedSealIds);
    if (selectedSeals.length === 0) {
      messageApi.warning('请选择签章印章');
      return;
    }
    if (hasSealPlaceholder(editorValue)) {
      messageApi.info('当前内容已存在盖章位');
      return;
    }
    setEditorValue((value) => ensureSealPlaceholderBlock(value, selectedSeals));
    setEditorTab('preview');
  };

  const doSaveDocument = async (values: EditFormValues) => {
    setSaveLoading(true);
    try {
      const selectedSealIds = values.sealIds ?? [];
      const selectedSeals = resolveSelectedSeals(selectedSealIds);
      const contentHtml = ensureSealPlaceholderBlock(
        editorValue,
        selectedSeals,
      );
      if (editMode === 'add') {
        const debtId = selectedDebt?.debtId ?? groupContext?.debtId;
        if (!debtId) {
          messageApi.warning('请选择关联债务');
          return;
        }
        const config = getCategoryGroupConfig(activeCategory);
        await addSupplementalInstrumentTask({
          debtId,
          category: groupContext?.category || activeCategory,
          displayGroupCode:
            groupContext?.displayGroupCode ||
            config?.displayGroupCode ||
            activeCategory,
          displayGroupName:
            groupContext?.displayGroupName ||
            config?.displayGroupName ||
            activeCategory,
          instrumentName: values.instrumentName,
          customTemplateJson: buildTemplateJson(
            values.instrumentName,
            selectedSealIds,
          ),
          customTemplateHtml: contentHtml,
          autoRun: true,
        });
        messageApi.success('已保存，正在生成并盖章');
        resetWorkspaceDocument();
      } else if (editingRecord) {
        const taskSource =
          editingDetail?.taskSource ?? editingRecord.taskSource;
        const isSupplemental = taskSource === 'SUPPLEMENTAL';
        await updateInstrumentTaskContent(editingRecord.id, {
          ...(isSupplemental
            ? {
                customTemplateJson: buildTemplateJson(
                  values.instrumentName,
                  selectedSealIds,
                ),
                customTemplateHtml: contentHtml,
              }
            : {
                contentJson: buildContentJson(
                  editingDetail,
                  values.instrumentName,
                ),
                contentHtml,
              }),
          autoRun: true,
        });
        messageApi.success('已保存，正在重新生成并盖章');
        const nextPreviewDetail = buildLocalEditedDocumentPreview(
          editingRecord,
          editingDetail,
          values.instrumentName,
          contentHtml,
          isSupplemental,
        );
        setSelectedDocument(nextPreviewDetail);
        setSelectedDocumentDetail(nextPreviewDetail);
        setWorkspaceFilePreview({ loading: false, fileUrl: '' });
      }
      setWorkspaceMode('preview');
      void fetchList();
      if (groupVisible) void refreshGroupDetail();
    } catch (error) {
      console.error('保存文书失败:', error);
      messageApi.error('保存文书失败');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveDocument = async () => {
    const values = await editForm.validateFields();
    const selectedSealIds = values.sealIds ?? [];
    const selectedSeals = resolveSelectedSeals(selectedSealIds);
    const contentHtml = ensureSealPlaceholderBlock(editorValue, selectedSeals);
    if (contentHtml !== editorValue) {
      setEditorValue(contentHtml);
    }
    if (isEmptyHtml(contentHtml) && !hasSealPlaceholder(contentHtml)) {
      messageApi.warning('请输入文书内容');
      return;
    }
    if (editMode === 'add' && !(selectedDebt?.debtId ?? groupContext?.debtId)) {
      messageApi.warning('请选择关联债务');
      return;
    }

    const confirmMessages: string[] = [];
    if (!hasSealPlaceholder(editorValue)) {
      confirmMessages.push('当前内容未检测到盖章位，保存后会进入盖章阻塞。');
    }
    if (editingRecord?.status === 5) {
      confirmMessages.push('该文书已盖章，保存后会生成新版本并重新盖章。');
    }

    if (confirmMessages.length > 0) {
      modalApi.confirm({
        title: '保存并生成盖章',
        content: confirmMessages.join(''),
        okText: '继续保存',
        cancelText: '返回修改',
        onOk: () => doSaveDocument(values),
      });
      return;
    }

    await doSaveDocument(values);
  };

  const submitDocumentAction = (
    kind: 'run' | 'retry',
    record: InstrumentTaskItem,
  ) => {
    const actionName = kind === 'run' ? '生成盖章' : '重试';
    modalApi.confirm({
      title: actionName,
      content: `确认对「${record.instrumentName || '当前文书'}」执行${actionName}吗？接口受理后会异步执行。`,
      okText: '确认执行',
      cancelText: '取消',
      onOk: async () => {
        const params: InstrumentTaskRunParams = {
          taskIds: [record.id],
          includeSupplemental: true,
        };
        const response =
          kind === 'run'
            ? await runInstrumentTasks(params)
            : await retryInstrumentTasks(params);
        messageApi.success(`已受理 ${response.data?.accepted ?? 0} 份文书`);
        void fetchList();
        if (groupVisible) void refreshGroupDetail();
      },
    });
  };

  const handleDebtSelected = async (record: InstrumentTaskItem) => {
    const debtId = record.debtId ?? record.id;
    if (debtSelectorMode === 'generate') {
      const config = getCategoryGroupConfig(activeCategory);
      if (!config || !debtId) {
        messageApi.warning('当前分类不支持按债务生成');
        return;
      }
      try {
        const response = await runInstrumentTasks({
          debtIds: [debtId],
          displayGroupCode: config.displayGroupCode,
          includeSupplemental: true,
        });
        messageApi.success(`已受理 ${response.data?.accepted ?? 0} 份文书`);
        setDebtVisible(false);
        void fetchList();
      } catch (error) {
        console.error('按债务生成文书失败:', error);
        messageApi.error('按债务生成文书失败');
      }
      return;
    }

    setSelectedDebt({
      ...record,
      debtId,
    });
    editForm.setFieldsValue({ debtorName: record.debtorName, sealIds: [] });
    setEditorValue(buildDefaultSupplementalHtml());
    setSealOptions([]);
    void fetchSealOptions(record.debtNumber);
    setDebtVisible(false);
  };

  const handleStandingPreview = async (item: StandingMatchItem) => {
    if (!item.standingOssId) {
      messageApi.warning(item.missingReason || '主体资格材料尚未配置');
      return;
    }
    setPreview({
      visible: true,
      loading: true,
      downloading: false,
      ossId: item.standingOssId,
      instrumentName:
        item.standingCodeName || item.standingName || '主体资格材料',
      debtorName:
        groupDetail?.debtorName || currentGroup?.debtorName || '原告主体资格',
      fileName: `${item.standingCodeName || item.standingName || '主体资格材料'}.pdf`,
      fileUrl: '',
    });
    try {
      const response = await listOssByIds(item.standingOssId);
      const oss = response.data?.[0];
      setPreview((prev) => ({
        ...prev,
        loading: false,
        fileUrl: oss?.url || '',
      }));
    } catch (error) {
      console.error('获取主体资格材料 URL 失败:', error);
      messageApi.error('获取主体资格材料 URL 失败');
      setPreview((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleStandingDownload = async (item: StandingMatchItem) => {
    if (!item.standingOssId) {
      messageApi.warning(item.missingReason || '主体资格材料尚未配置');
      return;
    }
    await downloadOss(
      item.standingOssId,
      `${item.standingCodeName || item.standingName || '主体资格材料'}.pdf`,
    );
  };

  const openStandingManage = (item?: StandingMatchItem) => {
    const params = new URLSearchParams();
    const debtNumber = groupDetail?.debtNumber ?? currentGroup?.debtNumber;
    if (debtNumber) params.set('debtNumber', String(debtNumber));
    if (item?.standingCode) params.set('standingCode', item.standingCode);
    params.set('returnFrom', 'instrument-list');
    params.set('returnTo', '/instrument-list');
    history.push(`/sys/standing?${params.toString()}`);
  };

  const openPreview = async (
    record: InstrumentTaskItem,
    detail?: InstrumentTaskDetail | null,
  ) => {
    const ossId = getDocumentFileOssId(record, detail);
    const fileName = `${detail?.debtorName || record.debtorName || '文书'}_${
      detail?.instrumentName || record.instrumentName || '材料'
    }.pdf`;
    setPreview({
      visible: true,
      loading: Boolean(ossId),
      downloading: false,
      ossId,
      instrumentName: detail?.instrumentName || record.instrumentName || '',
      debtorName: detail?.debtorName || record.debtorName || '',
      fileName,
      fileUrl: '',
    });

    if (!ossId) return;

    try {
      const response = await listOssByIds(ossId);
      const oss = response.data?.[0];
      setPreview((prev) => ({
        ...prev,
        loading: false,
        fileUrl: oss?.url || '',
      }));
    } catch (error) {
      console.error('获取文档 URL 失败:', error);
      messageApi.error('获取文档 URL 失败');
      setPreview((prev) => ({ ...prev, loading: false }));
    }
  };

  const downloadPreview = async () => {
    if (!preview.ossId) {
      messageApi.warning('文档尚未生成');
      return;
    }
    setPreview((prev) => ({ ...prev, downloading: true }));
    try {
      await downloadOss(preview.ossId, preview.fileName);
      messageApi.success('文档下载成功');
    } catch (error) {
      console.error('下载文档失败:', error);
      messageApi.error('下载文档失败');
    } finally {
      setPreview((prev) => ({ ...prev, downloading: false }));
    }
  };

  const groupColumns: any[] = [
    {
      title: '资产编号',
      dataIndex: 'debtNumber',
      width: RECOV_LIST_COLUMN_WIDTH.debtNumber,
      fixed: 'left',
      ellipsis: { showTitle: false },
      render: renderRecovSingleLineText,
    },
    {
      title: '所属城市',
      dataIndex: 'city',
      width: RECOV_LIST_COLUMN_WIDTH.city,
      ellipsis: { showTitle: false },
      render: renderRecovSingleLineText,
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
      width: 140,
      ellipsis: { showTitle: false },
      render: renderRecovSingleLineText,
    },
    {
      title: activeCategory === '催收函件' ? '函件类型' : '材料类型',
      dataIndex: 'displayGroupName',
      width: 160,
      ellipsis: { showTitle: false },
      render: (value: unknown) => (
        <span className="instrument-type-cell">
          <span className="instrument-type-cell-text">
            {renderRecovSingleLineText(toText(value))}
          </span>
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 112,
      render: (_: unknown, record: InstrumentTaskGroupItem) =>
        renderInstrumentGroupStatus(record),
    },
    {
      title: '逾期金额',
      dataIndex: 'debtAmount',
      width: 140,
      align: 'right',
      render: formatAmount,
    },
    {
      title: '违约（滞纳）金',
      dataIndex: 'overdueAmount',
      width: 140,
      align: 'right',
      render: formatAmount,
    },
    {
      title: '逾期天数',
      dataIndex: 'overdueDays',
      width: 110,
      render: (value: unknown) =>
        toNumber(value) > 0 ? <Tag color="red">{toText(value)} 天</Tag> : '-',
    },
    {
      title: '更新时间',
      dataIndex: 'latestUpdateTime',
      width: 180,
      render: formatDateTime,
    },
    {
      title: '操作',
      width: 152,
      fixed: 'right',
      align: 'left',
      render: (_: unknown, record: InstrumentTaskGroupItem) => (
        <TableActions
          maxVisible={3}
          actions={[
            {
              key: 'detail',
              label: '查看文书',
              icon: <FileSearchOutlined />,
              onClick: () => void openGroupDetail(record),
            },
            ...(isDeliveryGroup(record.displayGroupCode) &&
            toNumber(record.sealedCount) > 0
              ? [
                  {
                    key: 'delivery',
                    label: '送达详情',
                    icon: <SendOutlined />,
                    onClick: () =>
                      openDeliveryDetail(
                        record.displayGroupCode,
                        record.primaryTaskId,
                      ),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ];

  const debtColumns: any[] = [
    {
      title: '业主姓名',
      dataIndex: 'debtorName',
      width: 140,
      fixed: 'left',
      render: (value: unknown) => <Text strong>{toText(value)}</Text>,
    },
    {
      title: '资产编号',
      dataIndex: 'debtNumber',
      width: 170,
      ellipsis: true,
      render: toText,
    },
    {
      title: '债务金额',
      dataIndex: 'debtAmount',
      width: 140,
      align: 'right',
      render: formatAmount,
    },
    {
      title: '逾期金额',
      dataIndex: 'overdueAmount',
      width: 140,
      align: 'right',
      render: formatAmount,
    },
    {
      title: '逾期天数',
      dataIndex: 'overdueDays',
      width: 110,
      render: (value: unknown) =>
        toNumber(value) > 0 ? <Tag color="red">{toText(value)} 天</Tag> : '-',
    },
    {
      title: '所属城市',
      dataIndex: 'city',
      width: RECOV_LIST_COLUMN_WIDTH.city,
      ellipsis: true,
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
      title: '操作',
      width: 96,
      fixed: 'right',
      align: 'left',
      render: (_: unknown, record: InstrumentTaskItem) => (
        <Button
          size="small"
          type="link"
          onClick={() => void handleDebtSelected(record)}
        >
          {debtSelectorMode === 'generate' ? '生成' : '选择'}
        </Button>
      ),
    },
  ];

  const workspaceDocuments = groupDetail?.documents ?? [];
  const isSubjectWorkspace = isSubjectStandingGroup(
    groupDetail ?? currentGroup ?? groupContext,
  );
  const isAddingSupplementalDocument = workspaceMode === 'add';
  const selectedDocumentStatusCode = !isAddingSupplementalDocument
    ? (selectedDocumentDetail?.status ?? selectedDocument?.status)
    : undefined;
  const selectedDocumentStatus = getStatusInfo(selectedDocumentStatusCode);
  const selectedDocumentOssId = getDocumentFileOssId(
    selectedDocument,
    selectedDocumentDetail,
  );
  const selectedDocumentHtml =
    selectedDocumentDetail?.previewHtml ||
    selectedDocumentDetail?.contentHtml ||
    selectedDocumentDetail?.customTemplateHtml ||
    selectedDocumentDetail?.templateHtml ||
    '<p></p>';
  const selectedDocumentIsSealed = isSealedDocument(
    selectedDocument,
    selectedDocumentDetail,
  );
  const selectedDocumentHasPendingRevision = Boolean(
    selectedDocumentDetail?.hasPendingRevision ||
      selectedDocument?.hasPendingRevision,
  );
  const selectedDocumentPdfOssId =
    selectedDocumentIsSealed &&
    !selectedDocumentHasPendingRevision &&
    selectedDocumentOssId
      ? selectedDocumentOssId
      : undefined;

  useEffect(() => {
    if (workspaceMode !== 'preview' || !selectedDocumentPdfOssId) {
      setWorkspaceFilePreview((prev) =>
        prev.ossId || prev.fileUrl || prev.loading
          ? { loading: false, fileUrl: '' }
          : prev,
      );
      return;
    }

    let active = true;
    setWorkspaceFilePreview({
      ossId: selectedDocumentPdfOssId,
      loading: true,
      fileUrl: '',
    });

    listOssByIds(selectedDocumentPdfOssId)
      .then((response) => {
        if (!active) return;
        const oss = response.data?.[0];
        setWorkspaceFilePreview({
          ossId: selectedDocumentPdfOssId,
          loading: false,
          fileUrl: oss?.url || '',
        });
      })
      .catch((error) => {
        if (!active) return;
        console.error('获取盖章文件 URL 失败:', error);
        setWorkspaceFilePreview({
          ossId: selectedDocumentPdfOssId,
          loading: false,
          fileUrl: '',
        });
        messageApi.warning('盖章文件加载失败，已展示正文预览');
      });

    return () => {
      active = false;
    };
  }, [messageApi, selectedDocumentPdfOssId, workspaceMode]);

  const selectedDocumentPreviewHasSealPlaceholder =
    hasSealPlaceholder(selectedDocumentHtml);
  const selectedDocumentSealPreviewMismatch =
    !isAddingSupplementalDocument &&
    selectedDocumentIsSealed &&
    selectedDocumentPreviewHasSealPlaceholder &&
    !workspaceFilePreview.loading &&
    !workspaceFilePreview.fileUrl;
  const workspaceDocumentName = isAddingSupplementalDocument
    ? '新增补充文书'
    : toText(
        selectedDocument?.instrumentName ??
          groupDetail?.displayGroupName ??
          currentGroup?.displayGroupName,
      );
  const workspaceHeaderTitle = `${toText(
    groupDetail?.debtorName ??
      currentGroup?.debtorName ??
      selectedDebt?.debtorName,
  )} - ${workspaceDocumentName}`;
  const workspaceLastSaved = isAddingSupplementalDocument
    ? undefined
    : selectedDocumentDetail?.updateTime ||
      selectedDocument?.createTime ||
      currentGroup?.latestUpdateTime;
  const workspaceMetaItems = [
    {
      label: '资产编号',
      value: toText(groupDetail?.debtNumber ?? currentGroup?.debtNumber),
    },
    {
      label: '所属城市',
      value: toText(groupDetail?.city ?? currentGroup?.city),
    },
    {
      label: '所属项目',
      value: toText(groupDetail?.organization ?? currentGroup?.organization),
    },
    ...(workspaceLastSaved
      ? [{ label: '最后保存', value: formatDateTime(workspaceLastSaved) }]
      : []),
  ];
  const canRunSelected =
    Boolean(selectedDocument) &&
    !selectedDocumentIsSealed &&
    !isProcessingStatus(selectedDocument?.status);
  const selectedDocumentGroupCode =
    selectedDocumentDetail?.displayGroupCode ??
    selectedDocument?.displayGroupCode ??
    groupDetail?.displayGroupCode ??
    currentGroup?.displayGroupCode ??
    groupContext?.displayGroupCode;
  const selectedDocumentCategory =
    selectedDocumentDetail?.category ??
    selectedDocument?.category ??
    groupDetail?.category ??
    currentGroup?.category ??
    groupContext?.category;
  const selectedDocumentIsCollectionLetter =
    activeCategory === '催收函件' ||
    selectedDocumentCategory === '催收函件' ||
    isDeliveryGroup(selectedDocumentGroupCode);
  const canEditSelectedDocument =
    Boolean(selectedDocument) && !selectedDocumentIsCollectionLetter;
  const editorDebtLocked = editMode === 'edit' || Boolean(groupContext?.debtId);
  const canAddWorkspaceSupplemental = isFilingGroup(
    groupDetail ?? currentGroup ?? groupContext,
  );
  const deliveryDetailStatus = getDeliveryStatusInfo(
    deliveryDetail?.taskStatus,
  );
  const canRetryDeliveryDetail = Number(deliveryDetail?.taskStatus) === 3;
  const shouldShowDeliveryException =
    Number(deliveryDetail?.taskStatus) === 3 &&
    Boolean(deliveryDetail?.errorMessage);
  const showWorkspaceSidebar =
    canAddWorkspaceSupplemental ||
    workspaceDocuments.length > 1 ||
    isSubjectWorkspace;
  const workspaceActionBar =
    workspaceMode === 'edit' || workspaceMode === 'add' ? (
      <>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saveLoading}
          onClick={() => void handleSaveDocument()}
        >
          保存并生成盖章
        </Button>
        <Button onClick={() => setWorkspaceMode('preview')}>取消</Button>
      </>
    ) : (
      <>
        {canRunSelected ? (
          <Tooltip title="生成盖章">
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={() =>
                selectedDocument &&
                submitDocumentAction('run', selectedDocument)
              }
            >
              生成盖章
            </Button>
          </Tooltip>
        ) : null}
        {canEditSelectedDocument ? (
          <Tooltip title="编辑文书">
            <Button
              icon={<EditOutlined />}
              disabled={isProcessingStatus(selectedDocument?.status)}
              onClick={() =>
                selectedDocument &&
                void openDocumentEditor(
                  selectedDocument,
                  selectedDocumentDetail,
                )
              }
            />
          </Tooltip>
        ) : null}
        <Tooltip title="查看文件">
          <Button
            icon={<EyeOutlined />}
            disabled={!selectedDocumentOssId || !selectedDocument}
            onClick={() =>
              selectedDocument &&
              void openPreview(selectedDocument, selectedDocumentDetail)
            }
          />
        </Tooltip>
        <Tooltip title="下载文件">
          <Button
            icon={<DownloadOutlined />}
            disabled={!selectedDocumentOssId || !selectedDocument}
            onClick={() =>
              selectedDocument &&
              selectedDocumentOssId &&
              void downloadOss(
                selectedDocumentOssId,
                `${selectedDocument.debtorName || '文书'}_${
                  selectedDocument.instrumentName || '材料'
                }.pdf`,
              )
            }
          />
        </Tooltip>
      </>
    );

  return (
    <RecovPage
      className={groupVisible ? undefined : 'recov-list-page'}
      title={groupVisible ? null : '智能法律文书管理'}
    >
      {messageContextHolder}
      {modalContextHolder}
      {groupVisible ? (
        <div className="instrument-workspace">
          <div className="instrument-workspace-header">
            <div className="instrument-workspace-title-wrap">
              <Button
                type="text"
                className="instrument-workspace-back"
                icon={<ArrowLeftOutlined />}
                onClick={closeWorkspace}
              />
              <div className="instrument-workspace-title-main">
                <Space size={8} wrap>
                  <Tooltip title={workspaceHeaderTitle}>
                    <Text strong className="instrument-workspace-title">
                      {workspaceHeaderTitle}
                    </Text>
                  </Tooltip>
                  {!isAddingSupplementalDocument && selectedDocument ? (
                    <>
                      {shouldShowWorkspaceDocumentStatusTag(
                        selectedDocumentStatusCode,
                      ) ? (
                        <Tag color={selectedDocumentStatus.color}>
                          {selectedDocumentStatus.label}
                        </Tag>
                      ) : null}
                      {selectedDocumentSealPreviewMismatch ? (
                        <Tooltip title="盖章文件未加载，当前仅展示正文占位预览">
                          <Tag color="warning">盖章未显示</Tag>
                        </Tooltip>
                      ) : null}
                      {selectedDocument.taskSource === 'SUPPLEMENTAL' ? (
                        <Tag color="purple">补充</Tag>
                      ) : null}
                    </>
                  ) : null}
                </Space>
                <div className="instrument-workspace-meta">
                  {workspaceMetaItems.map((item) => (
                    <Tooltip
                      key={item.label}
                      title={`${item.label}：${item.value}`}
                    >
                      <span className="instrument-workspace-meta-item">
                        <span className="instrument-workspace-meta-label">
                          {item.label}：
                        </span>
                        <span className="instrument-workspace-meta-value">
                          {item.value}
                        </span>
                      </span>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>
            <Space size={8} wrap className="instrument-workspace-actions">
              {workspaceActionBar}
            </Space>
          </div>

          <InstrumentDocumentWorkspaceShell
            orientation={isNarrow ? 'vertical' : 'horizontal'}
            sidebarDefaultSize={isNarrow ? 220 : 280}
            sidebarMin={isNarrow ? 160 : 240}
            sidebarMax={isNarrow ? 360 : 420}
            sidebar={
              showWorkspaceSidebar ? (
                <>
                  {canAddWorkspaceSupplemental ? (
                    <div className="instrument-doc-sidebar-header">
                      <Button
                        block
                        className="instrument-doc-add-btn"
                        icon={<PlusOutlined />}
                        onClick={() =>
                          openAddSupplemental(groupDetail ?? currentGroup)
                        }
                      >
                        新增补充文书
                      </Button>
                    </div>
                  ) : null}
                  <Spin spinning={groupLoading}>
                    <div className="instrument-doc-nav">
                      {isSubjectWorkspace ? (
                        <div className="instrument-standing-section">
                          <div className="instrument-sidebar-section-title">
                            <span>原告材料</span>
                            <Button
                              type="link"
                              size="small"
                              onClick={() => openStandingManage()}
                            >
                              维护
                            </Button>
                          </div>
                          <Spin spinning={standingLoading}>
                            <div className="instrument-standing-list">
                              {standingMatch?.items?.length ? (
                                standingMatch.items.map((item) => (
                                  <div
                                    key={item.standingCode}
                                    className={`instrument-standing-item${
                                      item.matched
                                        ? ''
                                        : ' instrument-standing-item-missing'
                                    }`}
                                  >
                                    <div className="instrument-standing-item-main">
                                      <div className="instrument-standing-title-row">
                                        <Space
                                          size={6}
                                          className="instrument-standing-title"
                                        >
                                          <FilePdfOutlined />
                                          <Text
                                            strong
                                            className="instrument-standing-item-name"
                                          >
                                            {item.standingCodeName}
                                          </Text>
                                        </Space>
                                        {!item.matched ? (
                                          <Tag color="orange">缺失</Tag>
                                        ) : null}
                                      </div>
                                      <Text
                                        type={
                                          item.matched ? 'secondary' : 'danger'
                                        }
                                        className="instrument-standing-item-sub"
                                      >
                                        {item.matched
                                          ? item.standingName ||
                                            '已配置 PDF 材料'
                                          : item.missingReason ||
                                            '未匹配到材料'}
                                      </Text>
                                      {item.matched ? (
                                        <Text
                                          type="secondary"
                                          className="instrument-standing-applicability"
                                        >
                                          适用资产：
                                          {formatStandingApplicability(item)}
                                        </Text>
                                      ) : null}
                                    </div>
                                    <Space size={4}>
                                      <Tooltip title="预览">
                                        <Button
                                          size="small"
                                          icon={<EyeOutlined />}
                                          disabled={!item.standingOssId}
                                          onClick={() =>
                                            void handleStandingPreview(item)
                                          }
                                        />
                                      </Tooltip>
                                      <Tooltip title="下载">
                                        <Button
                                          size="small"
                                          icon={<DownloadOutlined />}
                                          disabled={!item.standingOssId}
                                          onClick={() =>
                                            void handleStandingDownload(item)
                                          }
                                        />
                                      </Tooltip>
                                    </Space>
                                  </div>
                                ))
                              ) : (
                                <Empty
                                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                                  description="暂无匹配结果"
                                />
                              )}
                            </div>
                          </Spin>
                        </div>
                      ) : null}
                      {isSubjectWorkspace ? (
                        <div className="instrument-sidebar-section-title">
                          <span>生成文书</span>
                        </div>
                      ) : null}
                      {workspaceDocuments.length > 0 ? (
                        workspaceDocuments.map((item) => {
                          const status = getStatusInfo(item.status);
                          const active =
                            selectedDocument &&
                            String(selectedDocument.id) === String(item.id);
                          return (
                            <InstrumentDocumentNavItem
                              key={getDocumentRowKey(item)}
                              active={Boolean(active)}
                              title={toText(item.instrumentName)}
                              tags={[
                                {
                                  label: `V${item.currentRevisionNo || 0}`,
                                },
                                ...(shouldShowWorkspaceDocumentStatusTag(
                                  item.status,
                                )
                                  ? [
                                      {
                                        label: status.label,
                                        color: status.color,
                                      },
                                    ]
                                  : []),
                                ...(item.taskSource === 'SUPPLEMENTAL'
                                  ? [{ label: '补充', color: 'purple' }]
                                  : []),
                                ...(item.hasPendingRevision
                                  ? [{ label: '修改中', color: 'orange' }]
                                  : []),
                              ]}
                              errorMessage={item.errorMessage}
                              onClick={() => switchDocument(item)}
                            />
                          );
                        })
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="暂无文书"
                        />
                      )}
                    </div>
                  </Spin>
                </>
              ) : undefined
            }
          >
            <Spin
              spinning={
                documentLoading ||
                (workspaceMode === 'preview' && workspaceFilePreview.loading)
              }
            >
              {workspaceMode === 'edit' || workspaceMode === 'add' ? (
                <div className="instrument-editor-panel">
                  <Form
                    form={editForm}
                    layout="vertical"
                    className="instrument-editor-form"
                    initialValues={{ instrumentName: '', debtorName: '' }}
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Form.Item
                        name="instrumentName"
                        label="文书名称"
                        rules={[{ required: true, message: '请输入文书名称' }]}
                      >
                        <Input
                          placeholder="请输入文书名称"
                          disabled={editMode === 'edit'}
                        />
                      </Form.Item>
                      {editorDebtLocked ? (
                        <Form.Item name="debtorName" hidden>
                          <Input />
                        </Form.Item>
                      ) : null}
                      {!editorDebtLocked ? (
                        <Form.Item label="关联债务" required>
                          <Space.Compact block>
                            <Form.Item
                              name="debtorName"
                              noStyle
                              rules={[
                                {
                                  required: true,
                                  message: '请选择关联债务',
                                },
                              ]}
                            >
                              <Input readOnly placeholder="请选择关联债务" />
                            </Form.Item>
                            <Button onClick={() => openDebtSelector('attach')}>
                              选择
                            </Button>
                          </Space.Compact>
                        </Form.Item>
                      ) : null}
                      <Form.Item
                        name="sealIds"
                        label="签章印章"
                        rules={[
                          {
                            required: true,
                            message: '请选择签章印章',
                          },
                        ]}
                      >
                        <Select
                          mode="multiple"
                          allowClear
                          loading={sealLoading}
                          maxTagCount="responsive"
                          placeholder="请选择签章印章"
                          showSearch={{ optionFilterProp: 'label' }}
                          options={sealOptions.map((seal) => ({
                            label: formatSealOptionLabel(seal),
                            value: getSealOptionId(seal),
                          }))}
                          onChange={handleSealSelectionChange}
                        />
                      </Form.Item>
                    </div>
                  </Form>

                  {!hasSealPlaceholder(editorValue) ? (
                    <Alert
                      className="mb-3"
                      type="warning"
                      showIcon
                      title="当前内容未检测到盖章位"
                      action={
                        <Button
                          size="small"
                          type="primary"
                          onClick={insertSealPlaceholder}
                        >
                          插入盖章位
                        </Button>
                      }
                    />
                  ) : null}

                  <Tabs
                    className="instrument-editor-tabs"
                    activeKey={editorTab}
                    onChange={(key) => setEditorTab(key as EditorTab)}
                    items={[
                      {
                        key: 'edit',
                        label: '编辑',
                        children: (
                          <TemplateEditor
                            value={editorValue}
                            outputType="html"
                            placeholder="请输入文书内容..."
                            variables={templateVariables}
                            features={instrumentEditorFeatures}
                            height={isNarrow ? 420 : 620}
                            onChange={setEditorValue}
                          />
                        ),
                      },
                      {
                        key: 'preview',
                        label: '预览',
                        children: (
                          <iframe
                            title="文书预览"
                            srcDoc={renderPreviewHtml(editorValue)}
                            className="instrument-preview-frame"
                          />
                        ),
                      },
                    ]}
                  />
                </div>
              ) : selectedDocument ? (
                <InstrumentDocumentPreviewStage
                  fileName={workspaceHeaderTitle}
                  html={renderPreviewHtml(selectedDocumentHtml)}
                  pdfOssId={workspaceFilePreview.ossId}
                  pdfUrl={workspaceFilePreview.fileUrl}
                />
              ) : (
                <div className="instrument-empty-stage">
                  <Empty description="暂无可预览文书" />
                </div>
              )}
            </Spin>
          </InstrumentDocumentWorkspaceShell>
        </div>
      ) : (
        <div className="recov-list-stack">
          <RecovStatsStrip
            className="instrument-stats-strip grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
              gap: 10,
            }}
          >
            {statCards.map((item) => (
              <StatCard key={item.title} {...item} />
            ))}
          </RecovStatsStrip>

          <RecovTableCard title="文书任务列表">
            <div className="recov-table-card-content">
              <Tabs
                activeKey={activeCategory}
                items={[
                  { key: '催收函件', label: '催收函件' },
                  { key: '诉讼材料', label: '诉讼材料' },
                  { key: '委托授权材料', label: '委托授权材料' },
                  { key: '主体资格证明', label: '主体资格证明' },
                ]}
                onChange={(key) => {
                  setActiveCategory(key as InstrumentCategory);
                  setPageNum(1);
                  setQueryValues({});
                  setSelectedGroupKeys([]);
                  queryForm.resetFields();
                }}
              />

              <Form
                form={queryForm}
                className="recov-table-toolbar"
                onFinish={handleQuery}
              >
                <section
                  className="instrument-list-toolbar-row"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div className="instrument-list-toolbar-filter-group">
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
                        placeholder="所属城市"
                        style={RECOV_FILTER_CONTROL_STYLE}
                        options={cityOptions.map((item) => ({
                          label: item,
                          value: item,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item name="organization" noStyle>
                      <Select
                        allowClear
                        showSearch={{ optionFilterProp: 'label' }}
                        placeholder="所属项目"
                        options={organizationOptions.map((item) => ({
                          label: item,
                          value: item,
                        }))}
                        optionRender={(option) =>
                          renderRecovSelectOptionLabel(option.label)
                        }
                        popupMatchSelectWidth={RECOV_ORGANIZATION_POPUP_WIDTH}
                        style={RECOV_FILTER_CONTROL_STYLE}
                      />
                    </Form.Item>
                    {activeCategory === '催收函件' ? (
                      <Form.Item name="displayGroupCode" noStyle>
                        <Select
                          allowClear
                          placeholder="函件类型"
                          options={LETTER_TYPE_FILTER_OPTIONS}
                          style={RECOV_FILTER_CONTROL_STYLE}
                        />
                      </Form.Item>
                    ) : null}
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      htmlType="submit"
                    >
                      查询
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleResetQuery}
                    >
                      重置
                    </Button>
                  </div>
                </section>
              </Form>

              <Table
                bordered
                className="recov-stable-pagination-table"
                rowKey={getGroupRowKey}
                loading={loading}
                columns={groupColumns}
                dataSource={tableData}
                scroll={{ x: 1560 }}
                rowSelection={{
                  selectedRowKeys: selectedGroupKeys,
                  onChange: (keys) => {
                    setSelectedGroupKeys(keys);
                  },
                }}
                pagination={{
                  current: pageNum,
                  pageSize,
                  total,
                  showSizeChanger: true,
                  showTotal: (value) => `共 ${value} 条`,
                  onChange: (nextPage, nextPageSize) => {
                    setPageNum(nextPage);
                    setPageSize(nextPageSize);
                  },
                }}
              />
            </div>
          </RecovTableCard>
        </div>
      )}

      <Modal
        width="70%"
        title={
          debtSelectorMode === 'generate' ? '选择生成债务' : '选择关联债务'
        }
        open={debtVisible}
        footer={null}
        destroyOnHidden
        onCancel={() => setDebtVisible(false)}
      >
        <div className="flex flex-col gap-4">
          <Form
            form={debtForm}
            layout="inline"
            onFinish={(values) => {
              setDebtQueryValues(values);
              setDebtPageNum(1);
            }}
          >
            <Form.Item name="debtorName">
              <Input allowClear placeholder="业主姓名" style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="debtNumber">
              <Input allowClear placeholder="资产编号" style={{ width: 200 }} />
            </Form.Item>
            <Form.Item>
              <Space size={8}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SearchOutlined />}
                >
                  查询
                </Button>
                <Button
                  onClick={() => {
                    debtForm.resetFields();
                    setDebtQueryValues({});
                    setDebtPageNum(1);
                  }}
                >
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>

          <Table
            rowKey={(record) => String(record.debtId ?? record.id)}
            loading={debtLoading}
            columns={debtColumns}
            dataSource={debtData}
            scroll={{ x: 1120 }}
            pagination={{
              current: debtPageNum,
              pageSize: debtPageSize,
              total: debtTotal,
              showSizeChanger: true,
              showTotal: (value) => `共 ${value} 条`,
              onChange: (nextPage, nextPageSize) => {
                setDebtPageNum(nextPage);
                setDebtPageSize(nextPageSize);
              },
            }}
          />
        </div>
      </Modal>

      <Modal
        width="90%"
        title="查看文书"
        open={preview.visible}
        destroyOnHidden
        onCancel={() => setPreview((prev) => ({ ...prev, visible: false }))}
        footer={
          <Space>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={preview.downloading}
              disabled={!preview.ossId}
              onClick={() => void downloadPreview()}
            >
              下载文档
            </Button>
            <Button
              onClick={() =>
                setPreview((prev) => ({ ...prev, visible: false }))
              }
            >
              关闭
            </Button>
          </Space>
        }
      >
        <Spin spinning={preview.loading}>
          {preview.fileUrl ? (
            <PdfPreview
              fileName={preview.fileName}
              height={560}
              ossId={preview.ossId}
              url={preview.fileUrl}
            />
          ) : (
            <Empty description="暂无可预览文档" />
          )}
        </Spin>
      </Modal>

      <Drawer
        title="送达详情"
        open={deliveryDetailOpen}
        size={720}
        destroyOnHidden
        loading={deliveryDetailLoading}
        onClose={() => setDeliveryDetailOpen(false)}
        footer={
          deliveryDetail && canRetryDeliveryDetail ? (
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                icon={<ReloadOutlined />}
                loading={retryingDeliveryTaskId === deliveryDetail.taskId}
                type="primary"
                onClick={retryDeliveryDetail}
              >
                重试
              </Button>
            </Space>
          ) : null
        }
      >
        {deliveryDetail ? (
          <Flex vertical gap={12} style={{ width: '100%' }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="资产编号">
                {toText(deliveryDetail.debtNumber ?? deliveryDetail.debtId)}
              </Descriptions.Item>
              <Descriptions.Item label="业主姓名">
                {toText(deliveryDetail.debtorName)}
              </Descriptions.Item>
              <Descriptions.Item label="电话">
                {toText(deliveryDetail.debtorPhone)}
              </Descriptions.Item>
              <Descriptions.Item label="邮件">
                {toText(deliveryDetail.debtorEmail)}
              </Descriptions.Item>
              <Descriptions.Item label="所属城市">
                {toText(deliveryDetail.city)}
              </Descriptions.Item>
              <Descriptions.Item label="所属项目">
                {toText(deliveryDetail.projectName)}
              </Descriptions.Item>
              <Descriptions.Item label="送达场景">
                {toText(deliveryDetail.sceneName)}
              </Descriptions.Item>
              <Descriptions.Item label="送达渠道">
                {toText(deliveryDetail.wayName)}
              </Descriptions.Item>
              <Descriptions.Item label="送达状态">
                <Tag color={deliveryDetailStatus.color}>
                  {deliveryDetailStatus.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {toText(
                  deliveryDetail.createTime ?? deliveryDetail.taskCreateTime,
                )}
              </Descriptions.Item>
            </Descriptions>
            {shouldShowDeliveryException ? (
              <Alert
                showIcon
                type="error"
                title="异常明细"
                description={
                  <Flex vertical gap={6} style={{ width: '100%' }}>
                    <Text>{deliveryDetail.errorMessage}</Text>
                  </Flex>
                }
              />
            ) : null}
          </Flex>
        ) : (
          <Empty description="暂无详情" />
        )}
      </Drawer>
    </RecovPage>
  );
};

export default InstrumentListPage;
