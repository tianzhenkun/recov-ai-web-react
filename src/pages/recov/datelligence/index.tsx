import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  FieldTimeOutlined,
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
import { PageContainer, ProCard } from '@ant-design/pro-components';
import XMarkdown from '@ant-design/x-markdown';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  List,
  Modal,
  message,
  Pagination,
  Progress,
  Select,
  Space,
  Spin,
  Steps,
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TableActions from '@/components/TableActions';
import {
  type DebtAttachmentItem,
  type DebtRecordDetail,
  type DebtRecordItem,
  type DebtRecordQuery,
  type DebtStats,
  downloadDebtImportTemplate,
  getAssetPackagePipelineProgress,
  getAssetParseFailurePage,
  getCurrentAssetPackagePipelineProgress,
  getDebtCityOptions,
  getDebtOrganizationOptions,
  getDebtRecordDetail,
  getDebtRecordPage,
  getPersonaClassifyFailurePage,
  type ImportFailureDetail,
  type ImportFailureStage,
  type ImportPipelineProgressResult,
  type ImportPipelineSubTask,
  submitAssetPackageImport,
} from '@/services/ruoyi/datelligence';
import { uploadOssFile } from '@/services/ruoyi/oss';
import { getPersona, type PersonaItem } from '@/services/ruoyi/persona';

const { Paragraph, Text, Title } = Typography;

type QueryFormValues = {
  city?: string;
  organization?: string;
};

type DetailTabKey = 'classification' | 'traits' | 'dialogue' | 'keyword';

const DEFAULT_PAGE_SIZE = 20;
const TASK_POLLING_INTERVAL = 3000;
const FAILURE_PAGE_SIZE = 10;

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

const toText = (value: unknown) =>
  value === null || value === undefined || value === '' ? '-' : String(value);

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
  String(record.id ?? record.debtNumber ?? Math.random());

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

const getGenderAgeText = (data?: DebtRecordDetail | null) => {
  if (!data) return '-';
  const gender = data.debtorGender || data.debtor_gender || '';
  const ageValue = data.debtorAge ?? data.debtor_age;
  const age =
    ageValue === null || ageValue === undefined || ageValue === ''
      ? ''
      : `${ageValue} 岁`;
  if (gender && age) return `${gender} / ${age}`;
  return gender || age || '-';
};

const overdueDayTagColor = (days: unknown) => {
  const value = toNumber(days);
  if (value > 90) return 'red';
  if (value > 30) return 'orange';
  return 'blue';
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
  color: string;
};

const statCardStyles = {
  body: {
    padding: 16,
  },
};

const StatCard = ({ title, value, icon, color }: StatCardProps) => {
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
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
            style={{
              color,
              backgroundColor: `${color}14`,
            }}
            aria-hidden
          >
            {icon}
          </span>
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

const PIPELINE_PROCESSING_STATUSES = new Set(['importing', 'processing']);
const PIPELINE_TERMINAL_STATUSES = new Set(['success', 'failed']);

const findPipelineSubTask = (
  data: ImportPipelineProgressResult,
  type: ImportPipelineSubTask['type'],
) => data.subTasks?.find((item) => item.type === type);

const isPipelineTerminal = (data?: ImportPipelineProgressResult | null) =>
  Boolean(data?.status && PIPELINE_TERMINAL_STATUSES.has(data.status));

const isPipelineProcessing = (data?: ImportPipelineProgressResult | null) =>
  Boolean(data?.status && PIPELINE_PROCESSING_STATUSES.has(data.status));

const toTimestamp = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  const timestamp =
    typeof value === 'number' ? value : new Date(String(value)).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const failureStageText: Record<ImportFailureStage, string> = {
  assetParse: '附件解析失败明细',
  personaClassify: '画像分类失败明细',
};

const pipelineTaskFallbackName: Record<string, string> = {
  debtImport: '导入入库',
  assetParse: '附件解析',
  personaClassify: '画像分类',
};

const renderFailureReason = (value: unknown) => (
  <Paragraph
    copyable={{ text: toText(value), tooltips: ['复制原因', '已复制'] }}
    ellipsis={{
      expandable: 'collapsible',
      rows: 2,
      symbol: (expanded) => (expanded ? '收起' : '展开'),
    }}
    style={{ marginBottom: 0 }}
    type="danger"
  >
    {toText(value)}
  </Paragraph>
);

const DatelligencePage = () => {
  const [form] = Form.useForm<QueryFormValues>();
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

  const [personaOpen, setPersonaOpen] = useState(false);
  const [personaLoading, setPersonaLoading] = useState(false);
  const [personaData, setPersonaData] = useState<PersonaItem | null>(null);
  const [personaActiveTab, setPersonaActiveTab] =
    useState<DetailTabKey>('classification');

  const [uploadOpen, setUploadOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
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
  const [pipelineSubTasks, setPipelineSubTasks] = useState<
    ImportPipelineSubTask[]
  >([]);

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
  const parseElapsedTimerRef = useRef<number | null>(null);
  const pipelineTerminalNotifiedRef = useRef<Record<string, string>>({});
  const pipelineProgressSeqRef = useRef(0);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const fetchDebtors = useCallback(async (params: DebtRecordQuery) => {
    requestSeqRef.current += 1;
    const seq = requestSeqRef.current;
    setLoading(true);
    try {
      const res = await getDebtRecordPage(params);
      if (seq !== requestSeqRef.current) return;
      const data = res.data ?? {};
      const page = data.page ?? {};
      setRecordList(page.rows ?? []);
      setRecordTotal(Number(page.total) || 0);
      setStats(data.stats ?? {});
    } catch {
      if (seq === requestSeqRef.current) {
        setRecordList([]);
        setRecordTotal(0);
      }
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, []);

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

  const refreshAll = useCallback(() => {
    void fetchDebtors(queryRef.current);
  }, [fetchDebtors]);

  useEffect(() => {
    void loadFilterOptions();
    void fetchDebtors(query);
  }, [fetchDebtors, loadFilterOptions, query]);

  useEffect(
    () => () => {
      stopPipelinePolling();
      stopParseElapsedTimer();
    },
    [stopPipelinePolling, stopParseElapsedTimer],
  );

  const statCards = useMemo(
    () => [
      {
        key: 'totalOverdueAmount',
        title: '逾期总金额',
        value: formatStatValue(stats.totalOverdueAmount, 'currency'),
        hint: '逾期金额汇总',
        icon: <WalletOutlined />,
        color: '#1677ff',
      },
      {
        key: 'totalDebtorCount',
        title: '总逾期户数',
        value: formatStatValue(stats.totalDebtorCount, 'count', '户'),
        hint: '按债务人维度统计',
        icon: <TeamOutlined />,
        color: '#13c2c2',
      },
      {
        key: 'avgBillAmount',
        title: '平均单笔金额',
        value: formatStatValue(stats.avgBillAmount, 'currency'),
        hint: '逾期金额平均值',
        icon: <BarChartOutlined />,
        color: '#faad14',
      },
      {
        key: 'avgOverdueDays',
        title: '平均账期',
        value: formatStatValue(stats.avgOverdueDays, 'count', '天'),
        hint: '按金额加权统计',
        icon: <FieldTimeOutlined />,
        color: '#fa8c16',
      },
      {
        key: 'projectCount',
        title: '覆盖项目数量',
        value: formatStatValue(stats.projectCount, 'count', '个'),
        hint: '去重后的项目数',
        icon: <ProjectOutlined />,
        color: '#722ed1',
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

  const isImportWorkflowProcessing =
    pipelineRestoring ||
    uploadState.uploading ||
    importStageState.processing ||
    parseState.parsing ||
    personaState.processing;

  const hasImportFailureDetails =
    parseState.failedCount > 0 || personaState.failedCount > 0;
  const showImportTaskProgress =
    importStageState.processing ||
    importStageState.failed ||
    parseState.parsing ||
    parseState.failed ||
    personaState.processing ||
    personaState.failed ||
    hasImportFailureDetails;
  const importTaskFailed =
    importStageState.failed ||
    parseState.failed ||
    personaState.failed ||
    hasImportFailureDetails;
  const importTaskProcessing =
    importStageState.processing ||
    parseState.parsing ||
    personaState.processing;

  const importTaskTitle = importTaskFailed ? '导入失败' : '导入任务处理中';

  const importTaskDescription = useMemo(() => {
    if (importStageState.failed) {
      return importStageState.errorMsg || '导入入库失败，请查看详情';
    }

    if (parseState.failed) {
      return parseState.errorMsg || '资产包解析失败，请查看详情';
    }

    if (personaState.failed) {
      return personaState.errorMsg || '画像分析存在失败记录';
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
    importStageState.errorMsg,
    importStageState.failed,
    importStageState.phase,
    importStageState.processing,
    importStageState.total,
    importTaskProcessing,
    pipelineElapsedText,
    pipelinePhase,
    parseState.errorMsg,
    parseState.failed,
    parseState.parsing,
    parseState.phase,
    personaState.errorMsg,
    personaState.failed,
    personaState.phase,
    personaState.processing,
    personaState.succeeded,
    personaState.total,
  ]);

  const uploadDialogStep = uploadState.errorMsg
    ? 2
    : uploadState.uploading
      ? 2
      : selectedFile
        ? 1
        : 0;

  const applyQuery = (next: DebtRecordQuery) => {
    setQuery(next);
  };

  const handleSearch = () => {
    const values = form.getFieldsValue();
    applyQuery({
      ...query,
      pageNum: 1,
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

  const handleRefresh = () => {
    refreshAll();
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
    if (isImportWorkflowProcessing) {
      messageApi.warning('当前任务处理中，请等待完成后再导入资产包');
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
        data.status === 'success';
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
      const parseFailed = parseStatus === 'failed' || parseFailedCount > 0;
      const personaFinished =
        personaStatus === 'success' || data.status === 'success';
      const personaFailed =
        personaStatus === 'failed' || personaFailedCount > 0;
      const pipelineProcessing = isPipelineProcessing(data);

      if (taskId) {
        setPipelineTaskId(taskId);
      }
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
        current: Number(importTask?.current ?? data.current ?? 0) || 0,
        total: Number(importTask?.total ?? data.total ?? 0) || 0,
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
    },
    [ensureParseElapsedTimer, stopParseElapsedTimer],
  );

  const notifyPipelineTerminal = useCallback(
    (data: ImportPipelineProgressResult) => {
      const taskId = String(data.taskId || '');
      if (!taskId || !isPipelineTerminal(data)) return;
      if (pipelineTerminalNotifiedRef.current[taskId] === data.status) return;

      pipelineTerminalNotifiedRef.current[taskId] = data.status || '';
      if (data.status === 'success') {
        messageApi.success('资产包后续处理完成，数据已更新');
      } else if (data.status === 'failed') {
        const failedTask = data.subTasks?.find(
          (item) => item.status === 'failed' || Number(item.failedCount) > 0,
        );
        messageApi.error(
          data.errorMessage ||
            failedTask?.errorMessage ||
            (failedTask?.name
              ? `${failedTask.name}失败`
              : '资产包后续处理失败'),
        );
      }
      refreshAll();
    },
    [messageApi, refreshAll],
  );

  const pollPipelineProgress = useCallback(
    async (taskId: string | number, options?: { silent?: boolean }) => {
      pipelineProgressSeqRef.current += 1;
      const seq = pipelineProgressSeqRef.current;
      try {
        const res = await getAssetPackagePipelineProgress(taskId);
        if (seq !== pipelineProgressSeqRef.current) return;
        const data = res.data;
        if (!data) return;
        applyPipelineProgress(data);
        if (isPipelineTerminal(data)) {
          stopPipelinePolling();
          if (!options?.silent) {
            notifyPipelineTerminal(data);
          }
        }
      } catch {
        if (seq !== pipelineProgressSeqRef.current) return;
        stopPipelinePolling();
        stopParseElapsedTimer();
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
    (taskId: string | number, options?: { silent?: boolean }) => {
      const normalizedTaskId = String(taskId);
      if (!normalizedTaskId) return;
      stopPipelinePolling();
      setPipelineTaskId(normalizedTaskId);
      setPipelinePhase('等待导入');
      setPipelineSubTasks([]);
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
      void pollPipelineProgress(normalizedTaskId, options);
      pipelinePollingTimerRef.current = window.setInterval(() => {
        void pollPipelineProgress(normalizedTaskId);
      }, TASK_POLLING_INTERVAL);
    },
    [pollPipelineProgress, stopPipelinePolling],
  );

  useEffect(() => {
    let mounted = true;
    const restoreCurrentPipeline = async () => {
      try {
        const res = await getCurrentAssetPackagePipelineProgress();
        const data = res.data;
        if (mounted && data) {
          applyPipelineProgress(data);
          if (data.taskId && isPipelineProcessing(data)) {
            startPipelinePolling(data.taskId, { silent: true });
          }
        } else if (mounted) {
          setPipelineTaskId('');
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
    if (isImportWorkflowProcessing) {
      messageApi.warning('当前任务处理中，请等待完成后再导入资产包');
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
          throw new Error('导入任务已提交，但后端未返回可追踪的任务 ID');
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
          startPipelinePolling(currentTask.taskId);
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
      setDetailData({
        ...(res.data ?? {}),
        attachments: Array.isArray(res.data?.attachments)
          ? res.data.attachments
          : [],
      });
    } catch {
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const resolvePersonaId = async (record: DebtRecordItem) => {
    if (record.personaId) return record.personaId;
    if (record.id === undefined || record.id === null) return undefined;
    const res = await getDebtRecordDetail(record.id);
    return res.data?.personaId;
  };

  const openPersonaDetail = async (record: DebtRecordItem) => {
    setPersonaOpen(true);
    setPersonaLoading(true);
    setPersonaActiveTab('classification');
    setPersonaData(null);
    try {
      const personaId = await resolvePersonaId(record);
      if (!personaId) {
        messageApi.warning('当前债务记录未关联用户画像');
        setPersonaOpen(false);
        return;
      }
      const res = await getPersona(personaId);
      setPersonaData(res.data ?? null);
    } catch {
      setPersonaOpen(false);
    } finally {
      setPersonaLoading(false);
    }
  };

  const loadFailureDetails = useCallback(
    async (
      stage: ImportFailureStage,
      pageNum = 1,
      pageSize = FAILURE_PAGE_SIZE,
    ) => {
      if (!pipelineTaskId) {
        messageApi.warning('当前导入任务 ID 为空，无法查询失败明细');
        return;
      }
      setFailureLoading(true);
      try {
        const params = { pageNum, pageSize };
        const res =
          stage === 'assetParse'
            ? await getAssetParseFailurePage(pipelineTaskId, params)
            : await getPersonaClassifyFailurePage(pipelineTaskId, params);
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

  const showPendingFeature = (feature: string) => {
    messageApi.info(`${feature} 功能尚未接入真实接口`);
  };

  const columns = useMemo<ColumnsType<DebtRecordItem>>(
    () => [
      {
        title: '资产编号',
        dataIndex: 'debtNumber',
        width: 150,
        render: (value) => <Text code>{toText(value)}</Text>,
      },
      {
        title: '所属城市',
        dataIndex: 'city',
        width: 120,
        render: toText,
      },
      {
        title: '所属项目',
        dataIndex: 'organization',
        width: 180,
        ellipsis: true,
        render: toText,
      },
      {
        title: '业主姓名',
        dataIndex: 'debtorName',
        width: 120,
        render: (value) => <Text strong>{toText(value)}</Text>,
      },
      {
        title: '电话号码',
        dataIndex: 'debtorPhone',
        width: 140,
        render: (value) => <Text code>{toText(value)}</Text>,
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
        render: (value) => (
          <Text type={toNumber(value) > 0 ? 'danger' : undefined}>
            {formatCurrency(value)}
          </Text>
        ),
      },
      {
        title: '逾期天数',
        dataIndex: 'overdueDays',
        width: 120,
        align: 'center',
        render: (value) => (
          <Tag color={overdueDayTagColor(value)}>{toNumber(value)} 天</Tag>
        ),
      },
      {
        title: '当前状态',
        dataIndex: 'currentStatus',
        width: 130,
        align: 'center',
        render: (value) => toText(value),
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
        width: 136,
        fixed: 'right',
        align: 'center',
        render: (_, record) => (
          <TableActions
            maxVisible={3}
            actions={[
              {
                key: 'persona',
                label: '用户画像',
                icon: <UserOutlined />,
                onClick: () => {
                  void openPersonaDetail(record);
                },
              },
              {
                key: 'analysis',
                label: '分析结果',
                icon: <BarChartOutlined />,
                onClick: () => showPendingFeature('分析结果'),
              },
              {
                key: 'detail',
                label: '查看详情',
                icon: <EyeOutlined />,
                onClick: () => {
                  void openDebtDetail(record);
                },
              },
            ]}
          />
        ),
      },
    ],
    [messageApi],
  );

  const attachmentColumns = useMemo<ColumnsType<DebtAttachmentItem>>(
    () => [
      {
        title: 'OSS ID',
        dataIndex: 'ossId',
        width: 180,
        render: (value) => <Text code>{toText(value)}</Text>,
      },
      {
        title: '文档类型',
        dataIndex: 'docType',
        render: toText,
      },
    ],
    [],
  );

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
    const isAssetParse = failureStage === 'assetParse';
    const primaryTitle = isAssetParse
      ? toText(record.attPath ?? record.name)
      : toText(record.debtorName);
    const metaItems = isAssetParse
      ? [
          renderFailureInlineMetaItem(
            '文档类型',
            toText(record.docType ?? record.bizType),
          ),
          renderFailureInlineMetaItem(
            'OSS ID',
            <Text code>{toText(record.ossId)}</Text>,
          ),
          renderFailureInlineMetaItem('重试次数', toNumber(record.retryCount)),
        ]
      : [
          renderFailureInlineMetaItem('所属项目', toText(record.organization)),
          renderFailureInlineMetaItem(
            '资产编号',
            <Text code>{toText(record.debtNumber)}</Text>,
          ),
        ];

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
              border: `1px solid ${token.colorErrorBorder}`,
              borderRadius: token.borderRadiusLG,
              background: token.colorErrorBg,
            }}
          >
            <Text strong type="danger">
              失败原因
            </Text>
            <div style={{ marginTop: 6 }}>
              {renderFailureReason(record.errorMessage)}
            </div>
          </div>
        </div>
      </List.Item>
    );
  };

  const personaTags = normalizeTags(personaData?.tags);
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
    if (task.status === 'failed' || Number(task.failedCount) > 0) {
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
  const renderPipelineTaskCard = (task: ImportPipelineSubTask) => {
    const status = resolvePipelineTaskStatus(task);
    const failedCount = Number(task.failedCount) || 0;
    const progress = resolvePipelineTaskProgress(task);
    const progressStatus =
      status === 'failed'
        ? 'exception'
        : status === 'processing'
          ? 'active'
          : 'normal';
    const progressStrokeColor =
      status === 'success' || status === 'processing'
        ? token.colorInfo
        : undefined;
    const canOpenFailure =
      (status === 'failed' || failedCount > 0) &&
      (task.type === 'assetParse' || task.type === 'personaClassify');
    const failureStage = task.type as ImportFailureStage;
    const title =
      task.name ||
      (task.type ? pipelineTaskFallbackName[task.type] : '') ||
      toText(task.type);
    const statusVisual =
      status === 'failed'
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
                    <Text type="secondary">{task.phase || '等待处理'}</Text>
                  </div>
                </div>
                {canOpenFailure && (
                  <Button
                    color="danger"
                    icon={<EyeOutlined />}
                    onClick={() => openFailureDrawer(failureStage)}
                    size="small"
                    variant="filled"
                  >
                    查看明细
                  </Button>
                )}
              </div>
            </div>
            <Progress
              percent={progress}
              size="small"
              status={progressStatus}
              strokeColor={progressStrokeColor}
            />
            {task.errorMessage && (
              <Text type="danger">{task.errorMessage}</Text>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <PageContainer title="数据智能解析">
      {messageContextHolder}
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {showImportTaskProgress && (
          <button
            type="button"
            onClick={() => setTaskDetailOpen(true)}
            style={{
              appearance: 'none',
              width: '100%',
              padding: 0,
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Alert
              showIcon
              type={importTaskFailed ? 'error' : 'info'}
              message={
                <Space size={8} wrap>
                  <Text strong>{importTaskTitle}</Text>
                  <Text type="secondary">{importTaskDescription}</Text>
                </Space>
              }
              action={
                <Text
                  style={{ color: token.colorPrimary, whiteSpace: 'nowrap' }}
                >
                  查看详情
                </Text>
              }
            />
          </button>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card) => (
            <StatCard
              key={card.key}
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
            />
          ))}
        </div>

        <ProCard title="债务记录明细">
          <Form
            form={form}
            initialValues={{ city: undefined, organization: undefined }}
            style={{ marginBottom: 16 }}
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
                <Form.Item name="city" noStyle>
                  <Select
                    allowClear
                    showSearch
                    loading={filterLoading}
                    optionFilterProp="label"
                    placeholder="选择所属城市"
                    style={{ width: 180 }}
                    options={cityOptions.map((city) => ({
                      label: city,
                      value: city,
                    }))}
                  />
                </Form.Item>
                <Form.Item name="organization" noStyle>
                  <Select
                    allowClear
                    showSearch
                    loading={filterLoading}
                    optionFilterProp="label"
                    placeholder="选择所属项目"
                    style={{ width: 220 }}
                    options={projectOptions.map((project) => ({
                      label: project,
                      value: project,
                    }))}
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
                <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                  刷新
                </Button>
                <Tooltip
                  title={
                    isImportWorkflowProcessing
                      ? '当前任务处理中，请等待完成后再导入'
                      : undefined
                  }
                >
                  <Button
                    disabled={isImportWorkflowProcessing}
                    icon={<UploadOutlined />}
                    onClick={openUploadDialog}
                  >
                    导入资产包
                  </Button>
                </Tooltip>
                <Button
                  disabled={recordTotal === 0 || isImportWorkflowProcessing}
                  icon={<PhoneOutlined />}
                  onClick={() => showPendingFeature('AI 外呼')}
                >
                  启动 AI 外呼
                </Button>
              </Space>
            </div>
          </Form>

          <Table<DebtRecordItem>
            bordered
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
              showTotal: (total, range) =>
                `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
              onChange: (pageNum, pageSize) => {
                applyQuery({
                  ...query,
                  pageNum,
                  pageSize,
                });
              },
            }}
          />
        </ProCard>
      </Space>

      <Modal
        title="导入资产包"
        open={uploadOpen}
        width={640}
        destroyOnHidden
        closable={!uploadState.uploading || Boolean(uploadState.errorMsg)}
        maskClosable={!uploadState.uploading || Boolean(uploadState.errorMsg)}
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
        <Space direction="vertical" size={18} style={{ width: '100%' }}>
          <Steps
            size="small"
            current={uploadDialogStep}
            status={uploadState.errorMsg ? 'error' : 'process'}
            items={[
              { title: '准备数据' },
              { title: '上传压缩包' },
              { title: uploadState.uploading ? '导入处理中' : '提交导入' },
            ]}
          />

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
                  <Text strong>正在导入资产包</Text>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary">
                      {uploadState.phase || '正在处理资产包'}
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
              message="导入失败"
              description={
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text>{uploadState.errorMsg}</Text>
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
        onClose={() => setTaskDetailOpen(false)}
      >
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
            (parseState.failed ||
              parseState.failedCount > 0 ||
              personaState.failed ||
              personaState.failedCount > 0) && (
              <Space wrap>
                {(parseState.failed || parseState.failedCount > 0) && (
                  <Button
                    size="small"
                    onClick={() => openFailureDrawer('assetParse')}
                  >
                    附件解析失败明细
                  </Button>
                )}
                {(personaState.failed || personaState.failedCount > 0) && (
                  <Button
                    size="small"
                    onClick={() => openFailureDrawer('personaClassify')}
                  >
                    画像分类失败明细
                  </Button>
                )}
              </Space>
            )}

          {importTaskFailed && (
            <Space wrap>
              <Button danger onClick={dismissImportTaskErrors}>
                关闭异常提示
              </Button>
            </Space>
          )}
        </div>
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
          locale={{ emptyText: <Empty description="暂无失败明细" /> }}
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
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="资产编号">
                  {toText(detailData.debtNumber)}
                </Descriptions.Item>
                <Descriptions.Item label="所属城市">
                  {toText(detailData.city)}
                </Descriptions.Item>
                <Descriptions.Item label="所属项目">
                  {toText(detailData.organization)}
                </Descriptions.Item>
                <Descriptions.Item label="业主姓名">
                  {toText(detailData.debtorName)}
                </Descriptions.Item>
                <Descriptions.Item label="业主邮箱">
                  {toText(detailData.debtorEmail)}
                </Descriptions.Item>
                <Descriptions.Item label="电话号码">
                  {toText(detailData.debtorPhone)}
                </Descriptions.Item>
                <Descriptions.Item label="身份证号码">
                  {toText(detailData.debtIdCard)}
                </Descriptions.Item>
                <Descriptions.Item label="性别/年龄">
                  {getGenderAgeText(detailData)}
                </Descriptions.Item>
                <Descriptions.Item label="当前状态">
                  {toText(detailData.currentStatus)}
                </Descriptions.Item>
                <Descriptions.Item label="用户画像 ID">
                  {toText(detailData.personaId)}
                </Descriptions.Item>
                <Descriptions.Item label="逾期金额">
                  {formatCurrency(detailData.debtAmount)}
                </Descriptions.Item>
                <Descriptions.Item label="违约（滞纳）金">
                  {formatCurrency(detailData.overdueAmount)}
                </Descriptions.Item>
                <Descriptions.Item label="逾期天数">
                  {toNumber(detailData.overdueDays)} 天
                </Descriptions.Item>
                <Descriptions.Item label="债务发生日期">
                  {toText(detailData.debtTime)}
                </Descriptions.Item>
                <Descriptions.Item label="缴费截止日期">
                  {toText(detailData.deadlineTime)}
                </Descriptions.Item>
                <Descriptions.Item label="房屋面积">
                  {toText(detailData.area)}
                </Descriptions.Item>
                <Descriptions.Item label="资产包任务 ID">
                  {toText(detailData.taskId)}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {toText(detailData.createTime)}
                </Descriptions.Item>
                <Descriptions.Item label="房屋地址" span={2}>
                  {toText(detailData.address)}
                </Descriptions.Item>
                <Descriptions.Item label="历史催缴说明" span={2}>
                  <Text>{toText(detailData.reminderRemark)}</Text>
                </Descriptions.Item>
              </Descriptions>

              <div>
                <Title level={5}>关联附件</Title>
                <Table<DebtAttachmentItem>
                  bordered
                  columns={attachmentColumns}
                  dataSource={detailData.attachments || []}
                  pagination={false}
                  rowKey={(record) => String(record.ossId ?? record.docType)}
                  size="small"
                  locale={{
                    emptyText: <Empty description="暂无关联附件" />,
                  }}
                />
              </div>
            </Space>
          ) : (
            <Empty description="暂无详情数据" />
          )}
        </Spin>
      </Modal>

      <Modal
        title="用户画像详情"
        open={personaOpen}
        width={780}
        destroyOnHidden
        footer={<Button onClick={() => setPersonaOpen(false)}>关闭</Button>}
        onCancel={() => setPersonaOpen(false)}
      >
        <Spin spinning={personaLoading}>
          {personaData ? (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Title level={4} style={{ marginBottom: 4 }}>
                    {personaData.personaName || '-'}
                  </Title>
                  <Text type="secondary">
                    ID：{toText(personaData.id)}
                    {personaData.priority
                      ? ` · 优先级：${personaData.priority}`
                      : ''}
                  </Text>
                </div>
                {personaTags.length > 0 && (
                  <Space wrap size={4} style={{ justifyContent: 'flex-end' }}>
                    {personaTags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </Space>
                )}
              </div>

              <Tabs
                activeKey={personaActiveTab}
                onChange={(key: string) =>
                  setPersonaActiveTab(key as DetailTabKey)
                }
                items={detailTabs.map((tab) => ({
                  key: tab.key,
                  label: tab.label,
                  children: (
                    <div className="min-h-40 text-sm leading-relaxed">
                      <XMarkdown>
                        {String(personaData[tab.key] || '-')}
                      </XMarkdown>
                    </div>
                  ),
                }))}
              />
            </Space>
          ) : (
            <Empty description="暂无画像数据" />
          )}
        </Spin>
      </Modal>
    </PageContainer>
  );
};

export default DatelligencePage;
