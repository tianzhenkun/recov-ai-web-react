import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  RecovListPage,
  RecovListStack,
  RecovStatsStrip,
  RecovTableCard,
} from '@/pages/recov/components/RecovListLayout';
import {
  getDebtCityOptions,
  getDebtOrganizationOptions,
} from '@/services/ruoyi/datelligence';
import {
  type FlowBatchFailureItem,
  type FlowBatchProgress,
  type FlowBatchStartFilter,
  type FlowBatchStartResult,
  getFlowBatchFailurePage,
  getFlowBatchProgress,
  retryFlowBatchFailures,
  startFlowBatch,
} from '@/services/ruoyi/flowBatchStart';
import {
  type FlowInstanceItem,
  type FlowInstanceQuery,
  pageFlowInstances,
} from '@/services/ruoyi/flowInstance';
import FlowTraceDrawer from '../components/FlowTraceDrawer';

const { Text, Title } = Typography;

type QueryFormValues = {
  debtNumber?: string;
  city?: string;
  organization?: string;
};

type InstanceQueryFormValues = {
  flowStatus?: number | string;
  debtNumber?: string;
};

type StatCardProps = {
  title: string;
  value: string;
  unit?: string;
  tone: MetricTone;
  icon: React.ReactNode;
};

export type FlowWorkbenchMode = 'page' | 'overlay';

type FlowWorkbenchProps = {
  mode?: FlowWorkbenchMode;
  onClose?: () => void;
};

const DEFAULT_PAGE_SIZE = 20;
const FAILURE_PAGE_SIZE = 10;
const BATCH_POLLING_INTERVAL = 2000;

const numberFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 0,
});

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const toText = (value: unknown) =>
  value === null || value === undefined || value === '' ? '-' : String(value);

const toCleanString = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text || undefined;
};

const toBatchFilter = (values: QueryFormValues) => {
  const filter: FlowBatchStartFilter = {};
  const debtNumber = toCleanString(values.debtNumber);
  const city = toCleanString(values.city);
  const organization = toCleanString(values.organization);
  if (debtNumber) filter.debtNumber = debtNumber;
  if (city) filter.city = city;
  if (organization) filter.organization = organization;
  return filter;
};

const flowRuntimeStatusMeta = (status: unknown, statusName?: string) => {
  const value = String(status ?? '').trim();
  const fallbackText = statusName || (value ? value : '-');

  if (!value) return { text: fallbackText, color: 'default' };
  if (value === '0') return { text: '待触发', color: 'processing' };
  if (value === '1') return { text: '等待回调', color: 'processing' };
  if (value === '2') return { text: '已完成', color: 'success' };
  if (value === '3') return { text: '节点失败', color: 'error' };
  if (value === '4') return { text: '人工终止', color: 'default' };
  if (value === '5') return { text: '已还款终止', color: 'default' };
  if (value === '6') return { text: '条件不满足终止', color: 'default' };
  return { text: fallbackText, color: 'default' };
};

const getFailureRowKey = (record: FlowBatchFailureItem) =>
  String(record.debtRecordId ?? record.debtNumber ?? record.flowStartTime);

const getFlowInstanceId = (record: FlowInstanceItem) =>
  toCleanString(record.instanceId ?? record.flowId ?? record.id);

const getInstanceRowKey = (record: FlowInstanceItem) =>
  String(
    getFlowInstanceId(record) ??
      record.debtRecordId ??
      record.debtNumber ??
      record.currentTaskId,
  );

const calcProgressPercent = (progress?: FlowBatchProgress | null) => {
  const total = toNumber(progress?.totalCount);
  if (total <= 0) return 0;
  const finished =
    toNumber(progress?.successCount) + toNumber(progress?.failedCount);
  return Math.min(100, Math.round((finished / total) * 100));
};

const hasPending = (progress?: FlowBatchProgress | null) =>
  toNumber(progress?.pendingCount) > 0;

const StatCard = ({ title, value, unit, tone, icon }: StatCardProps) => (
  <ProCard
    size="small"
    style={{ minWidth: 0 }}
    styles={{ body: { padding: 12 } }}
  >
    <div className="flex min-h-[62px] min-w-0 flex-col justify-between gap-2">
      <Space align="center" size={8}>
        <MetricIcon
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
          icon={icon}
          tone={tone}
        />
        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.3 }}>
          {title}
        </Text>
      </Space>
      <Space align="baseline" size={4} wrap={false}>
        <Text strong style={{ fontSize: 22, lineHeight: 1.2 }}>
          {value}
        </Text>
        {unit ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {unit}
          </Text>
        ) : null}
      </Space>
    </div>
  </ProCard>
);

const FlowWorkbench = ({ mode = 'page', onClose }: FlowWorkbenchProps) => {
  const [form] = Form.useForm<QueryFormValues>();
  const [instanceForm] = Form.useForm<InstanceQueryFormValues>();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  const [instanceQuery, setInstanceQuery] = useState<FlowInstanceQuery>({
    pageNum: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [instanceRows, setInstanceRows] = useState<FlowInstanceItem[]>([]);
  const [instanceTotal, setInstanceTotal] = useState(0);
  const [instanceLoading, setInstanceLoading] = useState(false);

  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);

  const [starting, setStarting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [startResult, setStartResult] = useState<FlowBatchStartResult | null>(
    null,
  );
  const [batchProgress, setBatchProgress] = useState<FlowBatchProgress | null>(
    null,
  );
  const [progressRefreshing, setProgressRefreshing] = useState(false);

  const [failureOpen, setFailureOpen] = useState(false);
  const [failureRows, setFailureRows] = useState<FlowBatchFailureItem[]>([]);
  const [failureTotal, setFailureTotal] = useState(0);
  const [failureLoading, setFailureLoading] = useState(false);
  const [failurePage, setFailurePage] = useState({
    pageNum: 1,
    pageSize: FAILURE_PAGE_SIZE,
  });
  const [traceOpen, setTraceOpen] = useState(false);
  const [traceInstanceId, setTraceInstanceId] = useState<string>('');

  const instanceQueryRef = useRef(instanceQuery);
  const instanceRequestSeqRef = useRef(0);
  const progressSeqRef = useRef(0);
  const pollingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    instanceQueryRef.current = instanceQuery;
  }, [instanceQuery]);

  const batchId = String(startResult?.batchId || batchProgress?.batchId || '');
  const progressPercent = calcProgressPercent(batchProgress);
  const progressPending = hasPending(batchProgress);
  const hasFailure = toNumber(batchProgress?.failedCount) > 0;

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

  const loadFlowInstanceList = useCallback(
    async (params: FlowInstanceQuery, silent = false) => {
      instanceRequestSeqRef.current += 1;
      const seq = instanceRequestSeqRef.current;
      if (!silent) setInstanceLoading(true);
      try {
        const res = await pageFlowInstances(params);
        if (seq !== instanceRequestSeqRef.current) return;
        const pageData = (
          res.data as
            | {
                page?: {
                  rows?: FlowInstanceItem[];
                  total?: number | string;
                };
              }
            | undefined
        )?.page;
        setInstanceRows(pageData?.rows ?? res.rows ?? []);
        setInstanceTotal(toNumber(pageData?.total ?? res.total));
      } catch {
        if (seq === instanceRequestSeqRef.current) {
          setInstanceRows([]);
          setInstanceTotal(0);
          if (!silent) messageApi.error('流程实例列表加载失败，请稍后重试');
        }
      } finally {
        if (seq === instanceRequestSeqRef.current && !silent) {
          setInstanceLoading(false);
        }
      }
    },
    [messageApi],
  );

  const refreshInstanceList = useCallback(() => {
    void loadFlowInstanceList(instanceQueryRef.current, true);
  }, [loadFlowInstanceList]);

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      window.clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  const pollBatchProgress = useCallback(
    async (targetBatchId: string | number, options?: { silent?: boolean }) => {
      progressSeqRef.current += 1;
      const seq = progressSeqRef.current;
      if (!options?.silent) setProgressRefreshing(true);
      try {
        const res = await getFlowBatchProgress(targetBatchId);
        if (seq !== progressSeqRef.current) return;
        const data = res.data;
        if (!data) return;

        setBatchProgress(data);
        if (toNumber(data.pendingCount) === 0) {
          stopPolling();
          refreshInstanceList();
          if (toNumber(data.failedCount) > 0) {
            messageApi.warning('部分债务发起失败，可查看失败原因并重试');
          } else {
            messageApi.success('催收流程发起完成');
          }
        }
      } catch {
        if (seq === progressSeqRef.current) {
          stopPolling();
          messageApi.error('批次进度加载失败，请稍后重试');
        }
      } finally {
        if (seq === progressSeqRef.current && !options?.silent) {
          setProgressRefreshing(false);
        }
      }
    },
    [messageApi, refreshInstanceList, stopPolling],
  );

  const startPolling = useCallback(
    (targetBatchId: number | string) => {
      const normalizedBatchId = String(targetBatchId);
      if (!normalizedBatchId) return;
      stopPolling();
      void pollBatchProgress(normalizedBatchId);
      pollingTimerRef.current = window.setInterval(() => {
        void pollBatchProgress(normalizedBatchId, { silent: true });
      }, BATCH_POLLING_INTERVAL);
    },
    [pollBatchProgress, stopPolling],
  );

  useEffect(() => {
    void loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    void loadFlowInstanceList(instanceQuery);
  }, [instanceQuery, loadFlowInstanceList]);

  useEffect(
    () => () => {
      stopPolling();
    },
    [stopPolling],
  );

  const handleReset = () => {
    form.resetFields();
  };

  const handleInstanceSearch = () => {
    const values = instanceForm.getFieldsValue();
    setInstanceQuery({
      pageNum: 1,
      pageSize: instanceQuery.pageSize || DEFAULT_PAGE_SIZE,
      flowStatus: values.flowStatus,
      debtNumber: values.debtNumber,
    });
  };

  const handleInstanceReset = () => {
    instanceForm.resetFields();
    setInstanceQuery({
      pageNum: 1,
      pageSize: instanceQuery.pageSize || DEFAULT_PAGE_SIZE,
    });
  };

  const loadFailureDetails = useCallback(
    async (
      targetBatchId: string,
      params = { pageNum: 1, pageSize: FAILURE_PAGE_SIZE },
    ) => {
      if (!targetBatchId) return;
      setFailureLoading(true);
      try {
        const res = await getFlowBatchFailurePage(targetBatchId, params);
        setFailureRows(res.rows ?? []);
        setFailureTotal(toNumber(res.total));
        setFailurePage(params);
      } catch {
        messageApi.error('失败明细加载失败，请稍后重试');
      } finally {
        setFailureLoading(false);
      }
    },
    [messageApi],
  );

  const openFailureDrawer = () => {
    if (!batchId) {
      messageApi.warning('当前批次 ID 为空，无法查看失败明细');
      return;
    }
    setFailureOpen(true);
    void loadFailureDetails(batchId);
  };

  const handleStartAcceptedBatch = (
    result: FlowBatchStartResult,
    successMessage: string,
  ) => {
    const normalizedBatchId = String(result.batchId || '');
    setStartResult(result);
    setBatchProgress({
      batchId: result.batchId,
      totalCount: toNumber(result.acceptedCount),
      pendingCount: toNumber(result.acceptedCount),
      successCount: 0,
      failedCount: 0,
    });
    setProgressOpen(true);
    messageApi.success(successMessage);
    if (normalizedBatchId) {
      startPolling(normalizedBatchId);
    }
  };

  const executeStart = async (filter: FlowBatchStartFilter) => {
    setStarting(true);
    try {
      const res = await startFlowBatch(filter);
      const result = res.data;
      if (!result) return;

      if (toNumber(result.matchedCount) === 0) {
        messageApi.warning('当前筛选条件无匹配债务');
        refreshInstanceList();
        return;
      }

      if (toNumber(result.acceptedCount) === 0) {
        messageApi.info('当前筛选结果没有可发起的债务');
        refreshInstanceList();
        return;
      }

      handleStartAcceptedBatch(result, '流程发起任务已受理');
    } catch {
      messageApi.error('流程发起请求失败，请稍后重试');
    } finally {
      setStarting(false);
    }
  };

  const openStartConfirm = () => {
    const filter = toBatchFilter(form.getFieldsValue());
    const hasEmptyFilter =
      !filter.debtNumber && !filter.city && !filter.organization;
    const scopeItems = [
      { label: '资产编号', value: filter.debtNumber || '全部' },
      { label: '所属城市', value: filter.city || '全部' },
      { label: '所属项目', value: filter.organization || '全部' },
    ];

    modalApi.confirm({
      width: 560,
      centered: true,
      icon: null,
      title: (
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-lg text-blue-600">
            <PlayCircleOutlined />
          </span>
          <div className="min-w-0">
            <Title level={5} style={{ margin: 0 }}>
              {hasEmptyFilter ? '确认发起全部范围流程' : '确认发起催收流程'}
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              系统将创建批量发起任务，并自动跳过已发起或发起中的债务。
            </Text>
          </div>
        </div>
      ),
      content: (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {scopeItems.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-solid border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className="mb-1 text-xs text-gray-500">{item.label}</div>
                <div className="truncate text-base font-semibold text-gray-900">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          <Alert
            showIcon
            type={hasEmptyFilter ? 'warning' : 'info'}
            message={
              hasEmptyFilter
                ? '当前未设置城市或所属项目筛选'
                : '即将按当前筛选范围发起'
            }
            description={
              hasEmptyFilter
                ? '本次操作会对当前权限范围内的全部债务尝试发起催收流程，请确认这是预期范围。'
                : '筛选范围内符合条件的债务将进入催收流程，重复发起的债务会自动跳过。'
            }
          />
          <Alert
            showIcon
            type="warning"
            message="发起后将固化债务上下文快照"
            description="已发起或发起中的债务将不允许编辑或删除，后续进度可在流程实例中查看。"
          />
        </div>
      ),
      okText: '确认发起',
      cancelText: '取消',
      okButtonProps: { loading: starting },
      onOk: () => executeStart(filter),
    });
  };

  const handleRetryFailures = () => {
    if (!batchId) {
      messageApi.warning('当前批次 ID 为空，无法重试');
      return;
    }

    modalApi.confirm({
      title: '确认重试失败项',
      content: (
        <div className="flex flex-col gap-3">
          <Text>仅重试本批次中发起失败且尚未创建流程实例的债务。</Text>
          <Alert
            showIcon
            type="info"
            title="重试会按当前债务信息重新生成上下文；已发起成功的流程上下文不会被覆盖。"
          />
        </div>
      ),
      okText: '重试',
      cancelText: '取消',
      onOk: async () => {
        setRetrying(true);
        try {
          const res = await retryFlowBatchFailures(batchId);
          const result = res.data;
          if (!result) return;

          if (toNumber(result.acceptedCount) === 0) {
            messageApi.info('当前没有可重试失败项');
            await Promise.all([
              pollBatchProgress(batchId),
              loadFailureDetails(batchId, failurePage),
            ]);
            refreshInstanceList();
            return;
          }

          handleStartAcceptedBatch(result, '失败项已重新受理');
          void loadFailureDetails(batchId, failurePage);
        } catch {
          messageApi.error('重试失败项失败，请稍后重试');
        } finally {
          setRetrying(false);
        }
      },
    });
  };

  const instanceColumns = useMemo<ColumnsType<FlowInstanceItem>>(
    () => [
      {
        title: '流程实例',
        dataIndex: 'instanceId',
        width: 190,
        ellipsis: true,
        render: (_value, record) => toText(getFlowInstanceId(record)),
      },
      {
        title: '资产编号',
        dataIndex: 'debtNumber',
        width: RECOV_LIST_COLUMN_WIDTH.debtNumber,
        ellipsis: { showTitle: false },
        render: renderRecovSingleLineText,
      },
      {
        title: '业主姓名',
        dataIndex: 'debtorName',
        width: 140,
        ellipsis: true,
        render: (value) => <Text strong>{toText(value)}</Text>,
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
        title: '流程状态',
        dataIndex: 'flowStatus',
        width: 130,
        align: 'center',
        render: (value, record) => {
          const meta = flowRuntimeStatusMeta(value, record.flowStatusName);
          return <Tag color={meta.color}>{meta.text}</Tag>;
        },
      },
      {
        title: '当前节点',
        dataIndex: 'currentIdentity',
        width: 150,
        ellipsis: true,
        render: (value, record) =>
          toText(value || record.currentNodeCode || record.currentStepId),
      },
      {
        title: '下次触发',
        dataIndex: 'wakeUpTime',
        width: 170,
        render: (value, record) =>
          String(record.flowStatus ?? '').trim() === '0' ? (
            <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
              {toText(value)}
            </Text>
          ) : (
            '-'
          ),
      },
      {
        title: '步骤进度',
        dataIndex: 'completedStepCount',
        width: 120,
        align: 'center',
        render: (value, record) =>
          `${toText(value)}/${toText(record.totalStepCount)}`,
      },
      {
        title: '更新时间',
        dataIndex: 'updateTime',
        width: 170,
        render: (value, record) => (
          <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
            {toText(
              value ||
                record.finishTime ||
                record.startTime ||
                record.createTime,
            )}
          </Text>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        fixed: 'right',
        render: (_value, record) => {
          const instanceId = getFlowInstanceId(record);
          return instanceId ? (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setTraceInstanceId(instanceId);
                setTraceOpen(true);
              }}
            >
              查看详情
            </Button>
          ) : (
            '-'
          );
        },
      },
    ],
    [],
  );

  const failureColumns = useMemo<ColumnsType<FlowBatchFailureItem>>(
    () => [
      {
        title: '资产编号',
        dataIndex: 'debtNumber',
        width: RECOV_LIST_COLUMN_WIDTH.debtNumber,
        ellipsis: { showTitle: false },
        render: renderRecovSingleLineText,
      },
      {
        title: '业主姓名',
        dataIndex: 'debtorName',
        width: 140,
        render: (value) => <Text strong>{toText(value)}</Text>,
      },
      {
        title: '城市',
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
        title: '画像 ID',
        dataIndex: 'personaId',
        width: 120,
        render: toText,
      },
      {
        title: '失败原因',
        dataIndex: 'flowStartErrorMessage',
        width: 260,
        ellipsis: true,
        render: (value) => <Text type="danger">{toText(value)}</Text>,
      },
      {
        title: '发起时间',
        dataIndex: 'flowStartTime',
        width: 170,
        render: (value) => (
          <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
            {toText(value)}
          </Text>
        ),
      },
    ],
    [],
  );

  const statCards = [
    {
      title: '已受理数量',
      value: numberFormatter.format(toNumber(startResult?.acceptedCount)),
      unit: '条',
      tone: 'info' as const,
      icon: <SyncOutlined />,
    },
    {
      title: '发起成功',
      value: numberFormatter.format(toNumber(batchProgress?.successCount)),
      unit: '条',
      tone: 'success' as const,
      icon: <CheckCircleOutlined />,
    },
    {
      title: '发起失败',
      value: numberFormatter.format(toNumber(batchProgress?.failedCount)),
      unit: '条',
      tone: 'error' as const,
      icon: <CloseCircleOutlined />,
    },
  ];

  const workbenchBody = (
    <>
      {messageContextHolder}
      {modalContextHolder}
      <RecovListStack>
        <RecovStatsStrip className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </RecovStatsStrip>

        <ProCard title="流程批量发起">
          <Form
            form={form}
            initialValues={{
              debtNumber: undefined,
              city: undefined,
              organization: undefined,
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
              </Space>
              <Button
                color="primary"
                disabled={starting || progressPending}
                icon={<PlayCircleOutlined />}
                loading={starting}
                onClick={openStartConfirm}
                variant="solid"
              >
                发起催收流程
              </Button>
            </div>
          </Form>
        </ProCard>

        <RecovTableCard title="流程实例">
          <Form form={instanceForm} className="recov-table-toolbar">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Space wrap size={12}>
                <Form.Item name="debtNumber" noStyle>
                  <Input
                    allowClear
                    placeholder="资产编号"
                    style={RECOV_FILTER_CONTROL_STYLE}
                  />
                </Form.Item>
                <Form.Item name="flowStatus" noStyle>
                  <Select
                    allowClear
                    placeholder="流程状态"
                    style={{ width: 150 }}
                    options={[
                      { label: '待触发', value: 0 },
                      { label: '等待回调', value: 1 },
                      { label: '已完成', value: 2 },
                      { label: '节点失败', value: 3 },
                      { label: '人工终止', value: 4 },
                      { label: '已还款终止', value: 5 },
                      { label: '条件不满足终止', value: 6 },
                    ]}
                  />
                </Form.Item>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleInstanceSearch}
                >
                  查询
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleInstanceReset}>
                  重置
                </Button>
              </Space>
            </div>
          </Form>

          <Table<FlowInstanceItem>
            bordered
            className="recov-stable-pagination-table"
            columns={instanceColumns}
            dataSource={instanceRows}
            loading={instanceLoading}
            rowKey={getInstanceRowKey}
            scroll={{ x: 1620 }}
            locale={{
              emptyText: <Empty description="暂无流程实例" />,
            }}
            pagination={{
              current: instanceQuery.pageNum || 1,
              pageSize: instanceQuery.pageSize || DEFAULT_PAGE_SIZE,
              total: instanceTotal,
              showSizeChanger: true,
              showTotal: (nextTotal) => `共 ${nextTotal} 条`,
              onChange: (pageNum, pageSize) => {
                setInstanceQuery({
                  ...instanceQuery,
                  pageNum,
                  pageSize,
                });
              },
            }}
          />
        </RecovTableCard>
      </RecovListStack>

      <Modal
        title="批次发起进度"
        open={progressOpen}
        width={760}
        destroyOnHidden
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button onClick={() => setProgressOpen(false)}>关闭</Button>
            {hasFailure && (
              <Button icon={<EyeOutlined />} onClick={openFailureDrawer}>
                查看失败明细
              </Button>
            )}
            {hasFailure && (
              <Button
                color="danger"
                icon={<ReloadOutlined />}
                loading={retrying}
                onClick={handleRetryFailures}
                variant="filled"
              >
                重试失败项
              </Button>
            )}
            {batchId && (
              <Button
                icon={<SyncOutlined />}
                loading={progressRefreshing}
                onClick={() => void pollBatchProgress(batchId)}
              >
                刷新
              </Button>
            )}
          </div>
        }
        onCancel={() => setProgressOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <ProCard size="small">
              <Text type="secondary">匹配数量</Text>
              <div>
                <Text strong>
                  {numberFormatter.format(toNumber(startResult?.matchedCount))}
                </Text>
                <Text type="secondary"> 条</Text>
              </div>
            </ProCard>
            <ProCard size="small">
              <Text type="secondary">已受理数量</Text>
              <div>
                <Text strong>
                  {numberFormatter.format(toNumber(startResult?.acceptedCount))}
                </Text>
                <Text type="secondary"> 条</Text>
              </div>
            </ProCard>
            <ProCard size="small">
              <Text type="secondary">已跳过数量</Text>
              <div>
                <Text strong>
                  {numberFormatter.format(toNumber(startResult?.skippedCount))}
                </Text>
                <Text type="secondary"> 条</Text>
              </div>
            </ProCard>
            <ProCard size="small">
              <Text type="secondary">发起中</Text>
              <div>
                <Text strong>
                  {numberFormatter.format(
                    toNumber(batchProgress?.pendingCount),
                  )}
                </Text>
                <Text type="secondary"> 条</Text>
              </div>
            </ProCard>
            <ProCard size="small">
              <Text type="secondary">发起成功</Text>
              <div>
                <Text strong>
                  {numberFormatter.format(
                    toNumber(batchProgress?.successCount),
                  )}
                </Text>
                <Text type="secondary"> 条</Text>
              </div>
            </ProCard>
            <ProCard size="small">
              <Text type="secondary">发起失败</Text>
              <div>
                <Text strong>
                  {numberFormatter.format(toNumber(batchProgress?.failedCount))}
                </Text>
                <Text type="secondary"> 条</Text>
              </div>
            </ProCard>
          </div>
          <div>
            <Title level={5}>批次进度</Title>
            <Progress
              percent={progressPercent}
              status={
                hasFailure && !progressPending
                  ? 'exception'
                  : progressPending
                    ? 'active'
                    : 'success'
              }
            />
          </div>
          {progressPending ? (
            <Alert
              showIcon
              type="info"
              title="处理中"
              description="批次仍有待处理流程，前端会自动刷新进度。"
            />
          ) : null}
        </div>
      </Modal>

      <Drawer
        title="流程发起失败明细"
        open={failureOpen}
        size={900}
        destroyOnHidden
        onClose={() => setFailureOpen(false)}
      >
        <Table<FlowBatchFailureItem>
          bordered
          columns={failureColumns}
          dataSource={failureRows}
          loading={failureLoading}
          rowKey={getFailureRowKey}
          scroll={{ x: 1090 }}
          locale={{
            emptyText: <Empty description="暂无失败明细" />,
          }}
          pagination={{
            current: failurePage.pageNum,
            pageSize: failurePage.pageSize,
            total: failureTotal,
            showSizeChanger: true,
            showTotal: (nextTotal) => `共 ${nextTotal} 条`,
            onChange: (pageNum, pageSize) => {
              if (!batchId) return;
              void loadFailureDetails(batchId, { pageNum, pageSize });
            },
          }}
        />
      </Drawer>

      <FlowTraceDrawer
        open={traceOpen}
        instanceId={traceInstanceId}
        onClose={() => setTraceOpen(false)}
        onChanged={refreshInstanceList}
      />
    </>
  );

  if (mode === 'overlay') {
    return (
      <Drawer
        closeIcon={null}
        closable={false}
        destroyOnHidden
        open
        placement="right"
        title={null}
        width="100vw"
        styles={{
          body: {
            height: '100vh',
            overflow: 'hidden',
            padding: 0,
          },
          header: {
            display: 'none',
          },
        }}
        onClose={onClose}
      >
        <div className="flex h-full min-h-0 flex-col bg-[#f5f7fb]">
          <div className="flex shrink-0 items-center justify-between border-0 border-b border-solid border-[rgba(5,5,5,0.06)] bg-[rgba(255,255,255,0.92)] px-6 py-4 backdrop-blur">
            <div className="min-w-0">
              <Title level={4} style={{ margin: 0 }}>
                催收流程
              </Title>
              <Text type="secondary">
                查看流程批量发起、批次进度和实例运行明细。
              </Text>
            </div>
            <Button icon={<CloseOutlined />} onClick={onClose} type="text">
              关闭
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
            {workbenchBody}
          </div>
        </div>
      </Drawer>
    );
  }

  return <RecovListPage title="催收流程">{workbenchBody}</RecovListPage>;
};

export default FlowWorkbench;
