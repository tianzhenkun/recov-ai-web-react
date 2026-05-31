import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DownloadOutlined,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FilePdfOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  RetweetOutlined,
  SaveOutlined,
  SearchOutlined,
  SendOutlined,
  SyncOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Dropdown,
  Empty,
  Form,
  Grid,
  Input,
  type MenuProps,
  Modal,
  message,
  Select,
  Space,
  Spin,
  Splitter,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TableActions from '@/components/TableActions';
import TemplateEditor from '@/components/TemplateEditor';
import type { TemplateEditorFeatures } from '@/components/TemplateEditor/types';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { useTemplateVariables } from '@/hooks/useTemplateVariables';
import { getFlowActionIcon } from '@/pages/recov/components/FlowActionIcon';
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
  RecovStatsStrip,
  RecovTableCard,
} from '@/pages/recov/components/RecovListLayout';
import FlowTraceDrawer from '@/pages/recov/flow/components/FlowTraceDrawer';
import {
  addSupplementalInstrumentTask,
  deleteInstrumentTask,
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
import {
  matchStanding,
  type StandingMatchItem,
  type StandingMatchVO,
} from '@/services/ruoyi/standing';
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
};

type DebtSearchValues = {
  debtorName?: string;
  debtNumber?: string;
};

type EditFormValues = {
  instrumentName: string;
  debtorName?: string;
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

const DEFAULT_PAGE_SIZE = 10;
const LITIGATION_GROUP_CODE = 'LITIGATION_MATERIALS';
const LITIGATION_GROUP_NAME = '诉讼材料';
const AUTHORIZATION_GROUP_CODE = 'AUTHORIZATION_MATERIALS';
const AUTHORIZATION_GROUP_NAME = '委托授权材料';
const SUBJECT_STANDING_GROUP_CODE = 'SUBJECT_STANDING';
const SUBJECT_STANDING_GROUP_NAME = '主体资格证明';
const DELIVERY_GROUP_CODES = new Set(['UR_CO', 'UR_LAW']);
const FILING_GROUP_CODES = new Set([
  LITIGATION_GROUP_CODE,
  AUTHORIZATION_GROUP_CODE,
  SUBJECT_STANDING_GROUP_CODE,
]);
const CURRENCY_METRIC_KEYS = new Set(['recovered', 'stageRepaymentAmount']);

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
  5: { label: '已盖章', color: 'success' },
  6: { label: '盖章失败', color: 'error' },
  7: { label: '送达中', color: 'warning' },
  8: { label: '盖章阻塞', color: 'orange' },
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

const getGroupRowKey = (record: InstrumentTaskGroupItem) =>
  String(
    record.groupId ??
      `${record.debtId ?? record.debtNumber}:${record.displayGroupCode}`,
  );

const getDocumentRowKey = (record: InstrumentTaskItem) => String(record.id);

const isProcessingStatus = (status?: number) =>
  Number(status) === 1 || Number(status) === 4;

const normalizeFlowId = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text || undefined;
};

const canShowInstrumentGroupFlowDetail = (
  record?: InstrumentTaskGroupItem | null,
) =>
  Boolean(record && normalizeFlowId(record.flowId)) &&
  (toNumber(record?.processingCount) > 0 || toNumber(record?.failedCount) > 0);

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

const buildSealPlaceholderHtml = () =>
  '<p style="text-align:right;margin-top:32px;"><span class="instrument-seal-placeholder" data-seal-placeholder="company_seal" data-seal-code="company_seal" data-width-mm="36" data-height-mm="36" style="display:inline-block;width:36mm;height:36mm;border:1px dashed #cbd5e1;border-radius:4px;"></span></p>';

const buildDefaultSupplementalHtml = (title = '补充材料') =>
  `<h2 style="text-align:center;">${title}</h2><p>业主姓名：{{debtorName}}</p><p>资产编号：{{debtNumber}}</p><p></p>${buildSealPlaceholderHtml()}`;

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
  [data-seal-placeholder], .instrument-seal-placeholder { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 36mm; height: 36mm; border: 1px dashed #cbd5e1; border-radius: 4px; background: repeating-linear-gradient(45deg, #f8fafc 0, #f8fafc 8px, #f1f5f9 8px, #f1f5f9 16px); color: #94a3b8; font-size: 12px; line-height: 1.4; vertical-align: middle; }
  [data-seal-placeholder]::after, .instrument-seal-placeholder::after { content: "签章位置"; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; letter-spacing: 0; pointer-events: none; }
  .instrument-seal-image { display: block; width: 100%; height: 100%; object-fit: contain; }
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

const buildTemplateJson = (instrumentName: string) => ({
  instrumentName,
  debtorName: '{{debtorName}}',
  debtNumber: '{{debtNumber}}',
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
  const confirmDelete = useDeleteConfirm({ modal: modalApi, messageApi });
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
  const [selectedGroups, setSelectedGroups] = useState<
    InstrumentTaskGroupItem[]
  >([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [organizationOptions, setOrganizationOptions] = useState<string[]>([]);

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
  const [traceOpen, setTraceOpen] = useState(false);
  const [traceInstanceId, setTraceInstanceId] = useState<string | undefined>();

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
    metricMap.get(key)?.label || fallback;

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
      title: getMetricTitle('litigation', '已经入法诉程序被告数'),
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
    setQueryValues(values);
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

  const openDeliveryDetail = (
    sceneCode?: string,
    businessId?: number | string,
  ) => {
    if (!sceneCode || !businessId) {
      messageApi.warning('暂无可关联的送达任务');
      return;
    }
    const params = new URLSearchParams({
      sceneCode,
      keyword: String(businessId),
    });
    history.push(`/delivery?${params.toString()}`);
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
      setSelectedDocument(null);
      setSelectedDocumentDetail(null);
    }
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
    setEditorValue(buildDefaultSupplementalHtml('补充材料'));
    editForm.setFieldsValue({
      instrumentName: '',
      debtorName: context.debtorName,
    });
  };

  const openEditDocument = async (record: InstrumentTaskItem) => {
    setWorkspaceMode('edit');
    setSelectedDocument(record);
    setSelectedDocumentDetail(null);
    setEditMode('edit');
    setEditingRecord(record);
    setSelectedDebt(record);
    setGroupContext({
      debtId: record.debtId,
      debtorName: record.debtorName,
      debtNumber: record.debtNumber,
      category: record.category || activeCategory,
      displayGroupCode: record.displayGroupCode || '',
      displayGroupName: record.displayGroupName || '',
    });
    setEditorValue('<p></p>');
    setEditorTab('edit');
    editForm.setFieldsValue({
      instrumentName: record.instrumentName,
      debtorName: record.debtorName,
    });
    setDocumentLoading(true);
    try {
      const response = await getInstrumentTaskDetail(record.id);
      const detail = response.data ?? null;
      setSelectedDocumentDetail(detail);
      setEditingDetail(detail);
      setEditorValue(
        detail?.contentHtml ||
          detail?.customTemplateHtml ||
          detail?.templateHtml ||
          buildDefaultSupplementalHtml(detail?.instrumentName || '补充材料'),
      );
      editForm.setFieldsValue({
        instrumentName: detail?.instrumentName || record.instrumentName,
        debtorName: detail?.debtorName || record.debtorName,
      });
    } catch (error) {
      console.error('获取文书详情失败:', error);
      messageApi.error('获取文书详情失败');
      setWorkspaceMode('preview');
    } finally {
      setDocumentLoading(false);
    }
  };

  const insertSealPlaceholder = () => {
    if (hasSealPlaceholder(editorValue)) {
      messageApi.info('当前内容已存在盖章位');
      return;
    }
    setEditorValue(
      (value) => `${value || '<p></p>'}${buildSealPlaceholderHtml()}`,
    );
    setEditorTab('preview');
  };

  const doSaveDocument = async (values: EditFormValues) => {
    setSaveLoading(true);
    try {
      const savedRecord = editingRecord;
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
          customTemplateJson: buildTemplateJson(values.instrumentName),
          customTemplateHtml: editorValue,
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
                customTemplateJson: buildTemplateJson(values.instrumentName),
                customTemplateHtml: editorValue,
              }
            : {
                contentJson: buildContentJson(
                  editingDetail,
                  values.instrumentName,
                ),
                contentHtml: editorValue,
              }),
          autoRun: true,
        });
        messageApi.success('已保存，正在重新生成并盖章');
        if (savedRecord) {
          await loadDocumentPreview(savedRecord);
        }
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
    if (isEmptyHtml(editorValue)) {
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

  const buildRunParams = (
    source: 'all' | 'selected' | 'group',
    group?: InstrumentTaskGroupItem,
  ): InstrumentTaskRunParams | undefined => {
    if (source === 'group' && group) {
      return {
        debtIds: group.debtId ? [group.debtId] : undefined,
        displayGroupCode: group.displayGroupCode,
        includeSupplemental: true,
      };
    }

    if (source === 'selected') {
      const groupCodes = Array.from(
        new Set(
          selectedGroups.map((item) => item.displayGroupCode).filter(Boolean),
        ),
      );
      if (groupCodes.length > 1) {
        messageApi.warning('请选择同一文书分组后再批量执行');
        return undefined;
      }
      return {
        category: activeCategory,
        displayGroupCode: groupCodes[0],
        debtIds: selectedGroups
          .map((item) => item.debtId)
          .filter(
            (id): id is number | string => id !== undefined && id !== null,
          ),
        includeSupplemental: true,
      };
    }

    return {
      category: activeCategory,
      includeSupplemental: true,
    };
  };

  const submitAction = async (
    kind: 'run' | 'retry',
    source: 'all' | 'selected' | 'group',
    group?: InstrumentTaskGroupItem,
  ) => {
    const params = buildRunParams(source, group);
    if (!params) return;
    const actionName = kind === 'run' ? '生成盖章' : '重试';
    const sourceText =
      source === 'group'
        ? `「${group?.debtorName || '-'} / ${group?.displayGroupName || '-'}」`
        : source === 'selected'
          ? `选中的 ${selectedGroups.length} 条文书分组`
          : `${activeCategory}下所有符合状态的文书`;

    modalApi.confirm({
      title: `批量${actionName}`,
      content: `确认处理${sourceText}吗？接口受理后会异步执行。`,
      okText: '确认执行',
      cancelText: '取消',
      onOk: async () => {
        const response =
          kind === 'run'
            ? await runInstrumentTasks(params)
            : await retryInstrumentTasks(params);
        const accepted = response.data?.accepted ?? 0;
        messageApi.success(`已受理 ${accepted} 份文书`);
        setSelectedGroupKeys([]);
        setSelectedGroups([]);
        void fetchList();
        if (groupVisible) void refreshGroupDetail();
      },
    });
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

  const openFlowDetail = (
    record: InstrumentTaskGroupItem | InstrumentTaskItem,
  ) => {
    const flowId = normalizeFlowId(record.flowId);
    if (!flowId) {
      messageApi.warning('当前文书暂无关联流程实例');
      return;
    }
    setTraceInstanceId(flowId);
    setTraceOpen(true);
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
    editForm.setFieldsValue({ debtorName: record.debtorName });
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
    history.push(`/sys/standing?${params.toString()}`);
  };

  const handleDelete = (record: InstrumentTaskItem) => {
    confirmDelete({
      records: [record],
      entityName: '文书任务',
      getName: (item) => item.instrumentName || item.debtorName || item.id,
      description: '删除后该文书任务不可恢复。',
      onConfirm: async ([item]) => {
        await deleteInstrumentTask(item.id);
      },
      onSuccess: () => {
        void fetchList();
        if (groupVisible) void refreshGroupDetail();
      },
    });
  };

  const openPreview = async (record: InstrumentTaskItem) => {
    const ossId =
      record.displayOssId || record.sealedOssId || record.draftOssId;
    const fileName = `${record.debtorName || '文书'}_${record.instrumentName || '材料'}.pdf`;
    setPreview({
      visible: true,
      loading: Boolean(ossId),
      downloading: false,
      ossId,
      instrumentName: record.instrumentName || '',
      debtorName: record.debtorName || '',
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

  const selectedSource = selectedGroups.length > 0 ? 'selected' : 'all';
  const currentCategoryGroupConfig = getCategoryGroupConfig(activeCategory);
  const instrumentToolbarActions = [
    ...(currentCategoryGroupConfig
      ? [
          {
            key: 'generate-debt',
            label: '选择债务生成',
            icon: <FileDoneOutlined />,
            onClick: () => openDebtSelector('generate'),
          },
          {
            key: 'add-supplemental',
            label: '新增补充材料',
            icon: <PlusOutlined />,
            onClick: () => openAddSupplemental(null),
          },
        ]
      : []),
    {
      key: 'batch-run',
      label: '批量生成盖章',
      icon: <SyncOutlined />,
      onClick: () => void submitAction('run', selectedSource),
    },
    {
      key: 'batch-retry',
      label: '批量重试',
      icon: <RetweetOutlined />,
      onClick: () => void submitAction('retry', selectedSource),
    },
  ];
  const instrumentToolbarMenuItems = [
    ...(currentCategoryGroupConfig
      ? [
          ...instrumentToolbarActions.slice(0, 2).map((item) => ({
            key: item.key,
            label: item.label,
            icon: item.icon,
          })),
          {
            type: 'divider' as const,
          },
        ]
      : []),
    ...instrumentToolbarActions
      .slice(currentCategoryGroupConfig ? 2 : 0)
      .map((item) => ({
        key: item.key,
        label: item.label,
        icon: item.icon,
      })),
  ] satisfies MenuProps['items'];
  const handleInstrumentToolbarMenuClick: MenuProps['onClick'] = ({ key }) => {
    const action = instrumentToolbarActions.find((item) => item.key === key);
    action?.onClick();
  };

  const groupColumns: any[] = [
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
      title: '文书分组',
      dataIndex: 'displayGroupName',
      width: 160,
      ellipsis: true,
      render: (value: unknown, record: InstrumentTaskGroupItem) => (
        <Space size={6} wrap={false}>
          <Text>{toText(value)}</Text>
          {record.readyForFiling ? <Tag color="green">可立案</Tag> : null}
        </Space>
      ),
    },
    {
      title: '文书进度',
      width: 180,
      render: (_: unknown, record: InstrumentTaskGroupItem) => {
        const totalCount = toNumber(record.totalCount);
        const sealedCount = toNumber(record.sealedCount);
        return (
          <Space size={6} wrap>
            <Tag
              color={
                sealedCount === totalCount && totalCount > 0 ? 'green' : 'blue'
              }
            >
              {sealedCount}/{totalCount}
            </Tag>
            {toNumber(record.processingCount) > 0 ? (
              <Tag color="processing">
                处理中 {toText(record.processingCount)}
              </Tag>
            ) : null}
            {toNumber(record.failedCount) > 0 ? (
              <Tag color="error">异常 {toText(record.failedCount)}</Tag>
            ) : null}
          </Space>
        );
      },
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
            ...(isFilingGroup(record)
              ? [
                  {
                    key: 'add',
                    label: '新增补充文书',
                    icon: <PlusOutlined />,
                    onClick: () => openAddSupplemental(record),
                  },
                ]
              : []),
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
            {
              key: 'run',
              label: '生成盖章',
              icon: <SyncOutlined />,
              disabled: toNumber(record.processingCount) > 0,
              onClick: () => void submitAction('run', 'group', record),
            },
            ...(canShowInstrumentGroupFlowDetail(record)
              ? [
                  {
                    key: 'flow',
                    label:
                      toNumber(record.failedCount) > 0
                        ? '处理异常'
                        : '查看进度',
                    icon: getFlowActionIcon(toNumber(record.failedCount) > 0),
                    onClick: () => openFlowDetail(record),
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
  const selectedDocumentStatus = getStatusInfo(selectedDocument?.status);
  const selectedDocumentOssId =
    selectedDocument?.displayOssId ||
    selectedDocument?.sealedOssId ||
    selectedDocument?.draftOssId;
  const selectedDocumentHtml =
    selectedDocumentDetail?.previewHtml ||
    selectedDocumentDetail?.contentHtml ||
    selectedDocumentDetail?.customTemplateHtml ||
    selectedDocumentDetail?.templateHtml ||
    '<p></p>';
  const workspaceDocumentName =
    workspaceMode === 'add'
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
  const workspaceLastSaved =
    selectedDocumentDetail?.updateTime ||
    selectedDocument?.createTime ||
    currentGroup?.latestUpdateTime;
  const canEditSelected =
    Boolean(selectedDocument) &&
    selectedDocument?.editable !== false &&
    !isProcessingStatus(selectedDocument?.status);
  const canShowDelivery =
    Boolean(selectedDocument) &&
    isDeliveryGroup(
      selectedDocument?.displayGroupCode || selectedDocument?.instrumentCode,
    ) &&
    Number(selectedDocument?.status) === 5;
  const editorDebtLocked = editMode === 'edit' || Boolean(groupContext?.debtId);
  const canAddWorkspaceSupplemental = isFilingGroup(
    groupDetail ?? currentGroup ?? groupContext,
  );
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
        <Tooltip title="修改文书">
          <Button
            icon={<EditOutlined />}
            disabled={!canEditSelected}
            onClick={() =>
              selectedDocument && void openEditDocument(selectedDocument)
            }
          />
        </Tooltip>
        <Tooltip title="生成盖章">
          <Button
            type="primary"
            icon={<SyncOutlined />}
            disabled={
              !selectedDocument || isProcessingStatus(selectedDocument.status)
            }
            onClick={() =>
              selectedDocument && submitDocumentAction('run', selectedDocument)
            }
          >
            生成盖章
          </Button>
        </Tooltip>
        <Tooltip title="删除文书">
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={
              !selectedDocument ||
              selectedDocument.editable === false ||
              isProcessingStatus(selectedDocument.status)
            }
            onClick={() => selectedDocument && handleDelete(selectedDocument)}
          />
        </Tooltip>
        {canShowDelivery ? (
          <Tooltip title="送达详情">
            <Button
              icon={<SendOutlined />}
              onClick={() =>
                selectedDocument &&
                openDeliveryDetail(
                  selectedDocument.displayGroupCode ||
                    selectedDocument.instrumentCode,
                  selectedDocument.id,
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
              selectedDocument && void openPreview(selectedDocument)
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
    <PageContainer
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
                  <Text strong className="instrument-workspace-title">
                    {workspaceHeaderTitle}
                  </Text>
                  {selectedDocument ? (
                    <>
                      <Tag>V{selectedDocument.currentRevisionNo || 0}</Tag>
                      <Tag color={selectedDocumentStatus.color}>
                        {selectedDocumentStatus.label}
                      </Tag>
                      {selectedDocument.taskSource === 'SUPPLEMENTAL' ? (
                        <Tag color="purple">补充</Tag>
                      ) : null}
                    </>
                  ) : null}
                </Space>
                <div className="instrument-workspace-meta">
                  <span>
                    资产编号：
                    {toText(
                      groupDetail?.debtNumber ?? currentGroup?.debtNumber,
                    )}
                  </span>
                  <span>
                    所属城市：{toText(groupDetail?.city ?? currentGroup?.city)}
                  </span>
                  <span>
                    所属项目：
                    {toText(
                      groupDetail?.organization ?? currentGroup?.organization,
                    )}
                  </span>
                  <span>
                    逾期金额：
                    {formatAmount(
                      groupDetail?.overdueAmount ?? currentGroup?.overdueAmount,
                    )}
                  </span>
                  {workspaceLastSaved ? (
                    <span>最后保存：{formatDateTime(workspaceLastSaved)}</span>
                  ) : null}
                </div>
              </div>
            </div>
            <Space size={8} wrap className="instrument-workspace-actions">
              {workspaceActionBar}
            </Space>
          </div>

          <div
            className={`instrument-workspace-shell${
              showWorkspaceSidebar ? '' : ' instrument-workspace-shell-single'
            }`}
          >
            <Splitter orientation={isNarrow ? 'vertical' : 'horizontal'}>
              {showWorkspaceSidebar ? (
                <Splitter.Panel
                  defaultSize={isNarrow ? 220 : 280}
                  min={isNarrow ? 160 : 240}
                  max={isNarrow ? 360 : 420}
                >
                  <aside className="instrument-doc-sidebar">
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
                                        <Space size={6} wrap>
                                          <FilePdfOutlined />
                                          <Text strong>
                                            {item.standingCodeName}
                                          </Text>
                                          <Tag
                                            color={
                                              item.matched ? 'green' : 'orange'
                                            }
                                          >
                                            {item.matched ? '已匹配' : '缺失'}
                                          </Tag>
                                          {item.wildcard ? (
                                            <Tag color="blue">全部资产</Tag>
                                          ) : null}
                                        </Space>
                                        <Text
                                          type={
                                            item.matched
                                              ? 'secondary'
                                              : 'danger'
                                          }
                                          className="instrument-standing-item-sub"
                                        >
                                          {item.matched
                                            ? item.standingName ||
                                              '已配置 PDF 材料'
                                            : item.missingReason ||
                                              '未匹配到材料'}
                                        </Text>
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
                              <button
                                key={getDocumentRowKey(item)}
                                type="button"
                                className={`instrument-doc-item${
                                  active ? ' instrument-doc-item-active' : ''
                                }`}
                                onClick={() => switchDocument(item)}
                              >
                                <span className="instrument-doc-item-main">
                                  <Text strong ellipsis>
                                    {toText(item.instrumentName)}
                                  </Text>
                                  <span className="instrument-doc-item-tags">
                                    <Tag>V{item.currentRevisionNo || 0}</Tag>
                                    <Tag color={status.color}>
                                      {status.label}
                                    </Tag>
                                    {item.taskSource === 'SUPPLEMENTAL' ? (
                                      <Tag color="purple">补充</Tag>
                                    ) : null}
                                    {item.hasPendingRevision ? (
                                      <Tag color="orange">修改中</Tag>
                                    ) : null}
                                  </span>
                                </span>
                                {item.errorMessage ? (
                                  <Text
                                    type="danger"
                                    className="instrument-doc-item-error"
                                  >
                                    {item.errorMessage}
                                  </Text>
                                ) : null}
                              </button>
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
                  </aside>
                </Splitter.Panel>
              ) : null}

              <Splitter.Panel>
                <section className="instrument-doc-main">
                  <Spin spinning={documentLoading}>
                    {workspaceMode === 'edit' || workspaceMode === 'add' ? (
                      <div className="instrument-editor-panel">
                        <Form
                          form={editForm}
                          layout="vertical"
                          className="instrument-editor-form"
                          initialValues={{ instrumentName: '', debtorName: '' }}
                        >
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Form.Item
                              name="instrumentName"
                              label="文书名称"
                              rules={[
                                { required: true, message: '请输入文书名称' },
                              ]}
                            >
                              <Input
                                placeholder="请输入文书名称"
                                disabled={editMode === 'edit'}
                              />
                            </Form.Item>
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
                                  <Input
                                    readOnly
                                    placeholder="请选择关联债务"
                                    disabled={editorDebtLocked}
                                  />
                                </Form.Item>
                                {editMode === 'add' && !groupContext?.debtId ? (
                                  <Button
                                    onClick={() => openDebtSelector('attach')}
                                  >
                                    选择
                                  </Button>
                                ) : null}
                              </Space.Compact>
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
                      <div className="instrument-doc-stage">
                        <iframe
                          title="文书预览"
                          srcDoc={renderPreviewHtml(selectedDocumentHtml)}
                          className="instrument-preview-frame"
                        />
                      </div>
                    ) : (
                      <div className="instrument-empty-stage">
                        <Empty description="暂无可预览文书" />
                      </div>
                    )}
                  </Spin>
                </section>
              </Splitter.Panel>
            </Splitter>
          </div>
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
                  setSelectedGroups([]);
                  queryForm.resetFields();
                }}
              />

              <Form
                form={queryForm}
                className="recov-table-toolbar"
                onFinish={handleQuery}
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
                  <Space size={12} wrap>
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
                  </Space>
                  <Space size={8} wrap>
                    <Dropdown
                      menu={{
                        items: instrumentToolbarMenuItems,
                        onClick: handleInstrumentToolbarMenuClick,
                      }}
                      placement="bottomRight"
                      trigger={['click']}
                    >
                      <Button icon={<DownOutlined />} iconPlacement="end">
                        更多操作
                      </Button>
                    </Dropdown>
                  </Space>
                </div>
              </Form>

              <Table
                bordered
                className="recov-stable-pagination-table"
                rowKey={getGroupRowKey}
                loading={loading}
                columns={groupColumns}
                dataSource={tableData}
                scroll={{ x: 1510 }}
                rowSelection={{
                  selectedRowKeys: selectedGroupKeys,
                  onChange: (keys, rows) => {
                    setSelectedGroupKeys(keys);
                    setSelectedGroups(rows);
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
          <Descriptions column={2} bordered size="small" className="mb-4">
            <Descriptions.Item label="文书名称">
              {toText(preview.instrumentName)}
            </Descriptions.Item>
            <Descriptions.Item label="关联债务">
              {toText(preview.debtorName)}
            </Descriptions.Item>
          </Descriptions>
          {preview.fileUrl ? (
            <object
              data={preview.fileUrl}
              type="application/pdf"
              style={{
                width: '100%',
                height: 560,
                border: '1px solid #f0f0f0',
              }}
            >
              <div className="flex h-[320px] flex-col items-center justify-center gap-3">
                <Text type="secondary">当前浏览器不支持内嵌预览该文档</Text>
                <Button
                  type="primary"
                  onClick={() => window.open(preview.fileUrl, '_blank')}
                >
                  新窗口打开
                </Button>
              </div>
            </object>
          ) : (
            <Empty description="暂无可预览文档" />
          )}
        </Spin>
      </Modal>

      <FlowTraceDrawer
        open={traceOpen}
        instanceId={traceInstanceId}
        onClose={() => setTraceOpen(false)}
        onChanged={() => {
          void fetchList();
          if (groupVisible) void refreshGroupDetail();
        }}
      />
    </PageContainer>
  );
};

export default InstrumentListPage;
