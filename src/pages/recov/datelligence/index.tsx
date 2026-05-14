import {
  BarChartOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  FieldTimeOutlined,
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
  Descriptions,
  Empty,
  Form,
  Modal,
  message,
  Progress,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
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
  getAssetPackageTaskStatus,
  getDebtCityOptions,
  getDebtOrganizationOptions,
  getDebtRecordDetail,
  getDebtRecordPage,
  getParseTaskProgress,
  getPersonaClassificationProgress,
  type ParseTaskProgressResult,
  type PersonaClassificationProgressResult,
  retryPersonaClassification,
  startPersonaClassification,
  submitAssetPackageImport,
  submitAssetPackageParse,
} from '@/services/ruoyi/datelligence';
import { uploadOssFile } from '@/services/ruoyi/oss';
import { getPersona, type PersonaItem } from '@/services/ruoyi/persona';

const { Text, Title } = Typography;

type QueryFormValues = {
  city?: string;
  organization?: string;
};

type DetailTabKey = 'classification' | 'traits' | 'dialogue' | 'keyword';

const DEFAULT_PAGE_SIZE = 20;
const IMPORT_POLLING_INTERVAL = 2000;
const TASK_POLLING_INTERVAL = 3000;

type UploadState = {
  uploading: boolean;
  percent: number;
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
};

type PersonaProgressState = {
  processing: boolean;
  failed: boolean;
  retrying: boolean;
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

const resolveTaskId = (payload: unknown): string => {
  if (payload === null || payload === undefined) return '';
  if (typeof payload === 'string' || typeof payload === 'number') {
    return String(payload);
  }
  if (typeof payload !== 'object') return '';

  const data = payload as Record<string, unknown>;
  const candidate = data.execTaskId ?? data.taskId ?? data.id ?? data.data;
  return typeof candidate === 'string' || typeof candidate === 'number'
    ? String(candidate)
    : '';
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

const DatelligencePage = () => {
  const [form] = Form.useForm<QueryFormValues>();
  const [messageApi, messageContextHolder] = message.useMessage();

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

  const [parseState, setParseState] = useState<ParseState>({
    parsing: false,
    failed: false,
    progress: 0,
    phase: '',
    errorMsg: '',
    startTs: 0,
    execTaskId: '',
    rootTaskId: '',
  });
  const [parseElapsedTick, setParseElapsedTick] = useState(0);

  const [personaState, setPersonaState] = useState<PersonaProgressState>({
    processing: false,
    failed: false,
    retrying: false,
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

  const requestSeqRef = useRef(0);
  const queryRef = useRef(query);
  const importPollingTimerRef = useRef<number | null>(null);
  const parsePollingTimerRef = useRef<number | null>(null);
  const parseElapsedTimerRef = useRef<number | null>(null);
  const personaPollingTimerRef = useRef<number | null>(null);

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

  const stopImportPolling = useCallback(() => {
    if (importPollingTimerRef.current) {
      window.clearInterval(importPollingTimerRef.current);
      importPollingTimerRef.current = null;
    }
  }, []);

  const stopParsePolling = useCallback(() => {
    if (parsePollingTimerRef.current) {
      window.clearInterval(parsePollingTimerRef.current);
      parsePollingTimerRef.current = null;
    }
  }, []);

  const stopParseElapsedTimer = useCallback(() => {
    if (parseElapsedTimerRef.current) {
      window.clearInterval(parseElapsedTimerRef.current);
      parseElapsedTimerRef.current = null;
    }
  }, []);

  const stopPersonaPolling = useCallback(() => {
    if (personaPollingTimerRef.current) {
      window.clearInterval(personaPollingTimerRef.current);
      personaPollingTimerRef.current = null;
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
      stopImportPolling();
      stopParsePolling();
      stopParseElapsedTimer();
      stopPersonaPolling();
    },
    [
      stopImportPolling,
      stopParseElapsedTimer,
      stopParsePolling,
      stopPersonaPolling,
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

  const parseElapsedText = useMemo(() => {
    parseElapsedTick;
    return formatElapsed(parseState.startTs);
  }, [parseElapsedTick, parseState.startTs]);

  const isImportWorkflowProcessing =
    uploadState.uploading || parseState.parsing || personaState.processing;

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
    }));
  };

  const dismissPersonaError = () => {
    setPersonaState((prev) => ({
      ...prev,
      processing: false,
      failed: false,
      errorMsg: '',
    }));
  };

  const updatePersonaProgressState = (
    data: PersonaClassificationProgressResult,
  ) => {
    setPersonaState((prev) => ({
      ...prev,
      taskId: String(data.taskId || prev.taskId),
      total: Number(data.total) || 0,
      pending: Number(data.pending) || 0,
      processingCount: Number(data.processing) || 0,
      succeeded: Number(data.succeeded) || 0,
      failedCount: Number(data.failed) || 0,
      progress: Math.min(
        100,
        Math.max(0, Number(data.percent ?? data.progress) || 0),
      ),
      phase: data.phase || '画像解析',
      timestamp: Number(data.timestamp) || 0,
    }));
  };

  const startParsePolling = (execTaskId: string) => {
    stopParsePolling();
    stopParseElapsedTimer();
    setParseElapsedTick(0);
    setParseState({
      parsing: true,
      failed: false,
      progress: 0,
      phase: '准备中',
      errorMsg: '',
      startTs: Date.now(),
      execTaskId,
      rootTaskId: '',
    });

    parseElapsedTimerRef.current = window.setInterval(() => {
      setParseElapsedTick((tick) => tick + 1);
    }, 1000);

    parsePollingTimerRef.current = window.setInterval(async () => {
      try {
        const res = await getParseTaskProgress(execTaskId);
        const data: ParseTaskProgressResult = res.data ?? {};
        setParseState((prev) => ({
          ...prev,
          progress: Number(data.progress) || 0,
          phase: data.phase || '',
          rootTaskId: data.rootTaskId || '',
          startTs: Number(data.startTs) || prev.startTs || Date.now(),
        }));

        if (data.status === 'success') {
          stopParsePolling();
          stopParseElapsedTimer();
          setParseState((prev) => ({
            ...prev,
            parsing: false,
            failed: false,
            progress: 100,
            phase: '已完成',
          }));
          messageApi.success('资产包解析完成，数据已更新');
          refreshAll();
        } else if (data.status === 'failed') {
          stopParsePolling();
          stopParseElapsedTimer();
          setParseState((prev) => ({
            ...prev,
            parsing: false,
            failed: true,
            errorMsg: data.errorMsg || '解析失败，请重试',
          }));
        }
      } catch {
        stopParsePolling();
        stopParseElapsedTimer();
        setParseState((prev) => ({
          ...prev,
          parsing: false,
          failed: true,
          errorMsg: '查询解析进度失败，请刷新页面重试',
        }));
      }
    }, TASK_POLLING_INTERVAL);
  };

  const startAssetPackageParseTask = async (taskId: string | number) => {
    try {
      const res = await submitAssetPackageParse({ taskId });
      const execTaskId = resolveTaskId(res.data);
      if (execTaskId) {
        startParsePolling(execTaskId);
      } else {
        messageApi.warning('资产包导入成功，但解析任务 ID 为空');
      }
    } catch {
      messageApi.warning('资产包导入成功，但提交解析任务失败');
    }
  };

  const pollPersonaProgress = async (taskId: string | number) => {
    try {
      const res = await getPersonaClassificationProgress(taskId);
      const data = res.data ?? {};
      updatePersonaProgressState(data);

      if (Number(data.total) === 0) {
        stopPersonaPolling();
        setPersonaState((prev) => ({
          ...prev,
          processing: false,
          failed: false,
          phase: '暂无可分析债务记录',
        }));
        messageApi.warning('画像分析任务已启动，但暂无可分类债务记录');
        refreshAll();
        return;
      }

      if (data.status === 'success') {
        stopPersonaPolling();
        setPersonaState((prev) => ({
          ...prev,
          processing: false,
          failed: false,
          progress: 100,
          phase: '已完成',
        }));
        messageApi.success('用户画像分析完成，数据已更新');
        refreshAll();
      } else if (data.status === 'failed') {
        const failedCount = Number(data.failed) || 0;
        stopPersonaPolling();
        setPersonaState((prev) => ({
          ...prev,
          processing: false,
          failed: true,
          failedCount,
          errorMsg: `画像分析完成，${failedCount} 条记录处理失败`,
        }));
        refreshAll();
      }
    } catch {
      stopPersonaPolling();
      setPersonaState((prev) => ({
        ...prev,
        processing: false,
        failed: true,
        errorMsg: '查询画像分析进度失败，请刷新页面重试',
      }));
    }
  };

  const startPersonaProgressPolling = (taskId: string | number) => {
    stopPersonaPolling();
    void pollPersonaProgress(taskId);
    personaPollingTimerRef.current = window.setInterval(() => {
      void pollPersonaProgress(taskId);
    }, TASK_POLLING_INTERVAL);
  };

  const startPersonaClassificationTask = async (taskId: string | number) => {
    stopPersonaPolling();
    setPersonaState({
      processing: true,
      failed: false,
      retrying: false,
      taskId: String(taskId),
      progress: 0,
      phase: '启动画像分析...',
      errorMsg: '',
      total: 0,
      pending: 0,
      processingCount: 0,
      succeeded: 0,
      failedCount: 0,
      timestamp: 0,
    });

    try {
      const res = await startPersonaClassification({ taskId });
      const nextTaskId = String(res.data?.taskId || taskId);
      setPersonaState((prev) => ({
        ...prev,
        taskId: nextTaskId,
        phase: res.data?.backgroundRunning ? '画像解析' : '等待后台任务',
      }));
      startPersonaProgressPolling(nextTaskId);
    } catch {
      setPersonaState((prev) => ({
        ...prev,
        processing: false,
        failed: true,
        errorMsg: '启动画像分析任务失败，请稍后重试',
      }));
      messageApi.warning('启动画像分析任务失败');
    }
  };

  const startPostImportTasks = (taskId: string | number) => {
    setUploadOpen(false);
    setUploadState((prev) => ({
      ...prev,
      uploading: false,
      percent: 100,
      phase: '导入完成，正在启动解析与画像分析',
    }));
    refreshAll();
    void startAssetPackageParseTask(taskId);
    void startPersonaClassificationTask(taskId);
  };

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
        phase: '提交导入任务...',
        percent: Math.max(prev.percent, 55),
      }));
      const importRes = await submitAssetPackageImport({ ossId });
      const taskId = importRes.data;

      if (!taskId) {
        setUploadState((prev) => ({
          ...prev,
          uploading: false,
          percent: 100,
          phase: '导入已提交',
        }));
        setUploadOpen(false);
        messageApi.success('导入已提交');
        refreshAll();
        return;
      }

      stopImportPolling();
      importPollingTimerRef.current = window.setInterval(async () => {
        try {
          const statusRes = await getAssetPackageTaskStatus(taskId);
          const stateData = statusRes.data ?? {};
          setUploadState((prev) => ({
            ...prev,
            phase: stateData.phase || '',
            total: Number(stateData.total) || 0,
            current: Number(stateData.current) || 0,
            percent: Math.max(55, Number(stateData.progress) || prev.percent),
          }));

          if (stateData.status === 'success') {
            stopImportPolling();
            messageApi.success('资产包导入完成，正在启动后续任务');
            startPostImportTasks(taskId);
          } else if (stateData.status === 'failed') {
            stopImportPolling();
            setUploadState((prev) => ({
              ...prev,
              errorMsg: stateData.errorMsg || '导入失败，请重试',
              uploading: false,
            }));
          }
        } catch {
          stopImportPolling();
          setUploadState((prev) => ({
            ...prev,
            errorMsg: '查询导入进度失败，请刷新列表查看或重试',
            uploading: false,
          }));
        }
      }, IMPORT_POLLING_INTERVAL);
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

  const retryPersonaFailedRecords = async () => {
    if (!personaState.taskId) {
      messageApi.warning('画像分析任务 ID 为空，无法重试');
      return;
    }

    setPersonaState((prev) => ({ ...prev, retrying: true }));
    try {
      await retryPersonaClassification({ taskId: personaState.taskId });
      setPersonaState((prev) => ({
        ...prev,
        failed: false,
        processing: true,
        errorMsg: '',
        phase: '画像重试中...',
      }));
      startPersonaProgressPolling(personaState.taskId);
    } catch {
      setPersonaState((prev) => ({
        ...prev,
        errorMsg: '重试画像分析失败记录失败，请稍后重试',
      }));
      messageApi.warning('重试画像分析失败记录失败');
    } finally {
      setPersonaState((prev) => ({ ...prev, retrying: false }));
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
        render: toText,
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

  const personaTags = normalizeTags(personaData?.tags);

  return (
    <PageContainer title="数据智能解析">
      {messageContextHolder}
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {(parseState.parsing || parseState.failed) && (
          <Alert
            showIcon
            type={parseState.failed ? 'error' : 'info'}
            icon={
              parseState.failed ? <CloseCircleOutlined /> : <LoadingOutlined />
            }
            message={parseState.failed ? '资产包解析失败' : '正在解析资产包'}
            description={
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text>
                  {parseState.failed
                    ? parseState.errorMsg || '未知错误，请重试'
                    : `阶段：${parseState.phase || '处理中'}，已执行 ${parseElapsedText}`}
                </Text>
                <Progress
                  percent={Math.min(100, Math.max(0, parseState.progress))}
                  status={parseState.failed ? 'exception' : 'active'}
                />
              </Space>
            }
            action={
              parseState.failed ? (
                <Button size="small" danger onClick={dismissParseError}>
                  关闭
                </Button>
              ) : undefined
            }
          />
        )}

        {(personaState.processing || personaState.failed) && (
          <Alert
            showIcon
            type={personaState.failed ? 'error' : 'info'}
            icon={
              personaState.failed ? (
                <CloseCircleOutlined />
              ) : (
                <LoadingOutlined />
              )
            }
            message={
              personaState.failed ? '画像分析存在失败记录' : '正在分析用户画像'
            }
            description={
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text>
                  {personaState.failed
                    ? personaState.errorMsg || '画像分析失败'
                    : `阶段：${personaState.phase || '处理中'}，已完成 ${personaState.succeeded}/${personaState.total || '-'}`}
                </Text>
                <Progress
                  percent={Math.min(100, Math.max(0, personaState.progress))}
                  status={personaState.failed ? 'exception' : 'active'}
                />
                <Space size={8} wrap>
                  <Tag>总数 {personaState.total}</Tag>
                  <Tag>待处理 {personaState.pending}</Tag>
                  <Tag>处理中 {personaState.processingCount}</Tag>
                  <Tag color="green">成功 {personaState.succeeded}</Tag>
                  <Tag color="red">失败 {personaState.failedCount}</Tag>
                </Space>
              </Space>
            }
            action={
              personaState.failed ? (
                <Space>
                  {personaState.failedCount > 0 && (
                    <Button
                      size="small"
                      type="primary"
                      loading={personaState.retrying}
                      onClick={() => {
                        void retryPersonaFailedRecords();
                      }}
                    >
                      重试失败记录
                    </Button>
                  )}
                  <Button size="small" danger onClick={dismissPersonaError}>
                    关闭
                  </Button>
                </Space>
              ) : undefined
            }
          />
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
                  disabled={recordTotal === 0}
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
        width={560}
        destroyOnHidden
        closable={!uploadState.uploading || Boolean(uploadState.errorMsg)}
        maskClosable={!uploadState.uploading || Boolean(uploadState.errorMsg)}
        keyboard={!uploadState.uploading || Boolean(uploadState.errorMsg)}
        okText="确认导入"
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
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            showIcon
            type="info"
            message="标准数据模板"
            description="请先下载模板并按要求填写债务人数据，上传文件仅支持 ZIP 压缩包。"
            action={
              <Button
                size="small"
                icon={<DownloadOutlined />}
                loading={templateDownloading}
                onClick={() => {
                  void handleDownloadTemplate();
                }}
              >
                下载模板
              </Button>
            }
          />

          {!uploadState.uploading && (
            <Upload.Dragger {...uploadProps}>
              <div className="py-4 text-center">
                <UploadOutlined style={{ fontSize: 42, color: '#8c8c8c' }} />
                <div className="mt-2 text-sm font-semibold">
                  将 ZIP 压缩包拖到此处，或点击上传
                </div>
                <Text type="secondary">
                  压缩包内需包含逾期业主信息.xlsx，具体结构由后端校验
                </Text>
              </div>
            </Upload.Dragger>
          )}

          {(uploadState.uploading || uploadState.errorMsg) && (
            <Alert
              showIcon
              type={uploadState.errorMsg ? 'error' : 'info'}
              message={uploadState.errorMsg ? '导入失败' : '导入处理中'}
              description={
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text>
                    {uploadState.errorMsg ||
                      uploadState.phase ||
                      '正在处理资产包'}
                  </Text>
                  <Progress
                    percent={Math.min(100, Math.max(0, uploadState.percent))}
                    status={uploadState.errorMsg ? 'exception' : 'active'}
                  />
                  {uploadState.total > 0 && (
                    <Text type="secondary">
                      已处理 {uploadState.current}/{uploadState.total}
                    </Text>
                  )}
                </Space>
              }
            />
          )}
        </Space>
      </Modal>

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
