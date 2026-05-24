import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  MailOutlined,
  MessageOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MetricIcon, {
  type MetricTone,
} from '@/pages/recov/components/MetricIcon';
import {
  type DeliveryStrategyRow,
  type DeliveryWayListRow,
  listDeliveryStrategy,
  listDeliveryWay,
} from '@/services/ruoyi/delivery';
import {
  type DeliveryOverview,
  type DeliveryTaskItem,
  type DeliveryTaskStatus,
  getDeliveryTask,
  type ListDeliveryTasksParams,
  listDeliveryTasks,
  retryDeliveryTask,
} from '@/services/ruoyi/deliveryTask';

const { Text, Paragraph } = Typography;

type QueryFormValues = {
  keyword?: string;
  sceneCode?: string;
  wayCode?: string;
  status?: DeliveryTaskStatus;
};

type StatCardProps = {
  title: string;
  value: string;
  icon: ReactNode;
  tone: MetricTone;
};

const DEFAULT_PAGE_SIZE = 20;
const LIST_REFRESH_INTERVAL_MS = 5000;

const STATUS_META: Record<
  DeliveryTaskStatus,
  { text: string; color: string; icon: ReactNode }
> = {
  0: { text: '待发送', color: 'default', icon: <ClockCircleOutlined /> },
  1: { text: '发送中', color: 'processing', icon: <SyncOutlined spin /> },
  2: { text: '送达成功', color: 'success', icon: <CheckCircleOutlined /> },
  3: { text: '送达失败', color: 'error', icon: <CloseCircleOutlined /> },
};

const CHANNEL_META: Record<
  string,
  { text: string; color: string; icon: ReactNode }
> = {
  sms: { text: '短信', color: 'blue', icon: <MessageOutlined /> },
  email: { text: '邮件', color: 'cyan', icon: <MailOutlined /> },
  express: { text: '快递', color: 'purple', icon: <TruckOutlined /> },
  call: { text: '电话', color: 'orange', icon: <PhoneOutlined /> },
};

const defaultOverview: Required<DeliveryOverview> = {
  pendingCount: 0,
  sendingCount: 0,
  smsTotal: 0,
  emailTotal: 0,
  expressTotal: 0,
  callTotal: 0,
  successCount: 0,
  failedCount: 0,
};

const numberFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 2,
});

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const toText = (value: unknown) =>
  value === null || value === undefined || value === '' ? '-' : String(value);

const normalizeQueryParam = (value: string | null) => {
  const next = value?.trim();
  return next || undefined;
};

const normalizeStatus = (value: unknown): DeliveryTaskStatus | undefined => {
  const n = Number(value);
  return n === 0 || n === 1 || n === 2 || n === 3 ? n : undefined;
};

const formatCurrency = (value: unknown) =>
  currencyFormatter.format(toNumber(value));

const mergeOverview = (overview?: DeliveryOverview) => ({
  ...defaultOverview,
  ...(overview ?? {}),
});

const getStatusText = (record: DeliveryTaskItem) => {
  const status = normalizeStatus(record.taskStatus);
  return (
    record.taskStatusLabel ||
    (status !== undefined ? STATUS_META[status].text : '-')
  );
};

const StatCard = ({ title, value, icon, tone }: StatCardProps) => (
  <ProCard
    size="small"
    style={{ minWidth: 0 }}
    styles={{ body: { padding: 12 } }}
  >
    <div className="flex min-h-[62px] min-w-0 flex-col justify-between gap-2">
      <Space align="center" size={8}>
        <MetricIcon icon={icon} tone={tone} />
        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.3 }}>
          {title}
        </Text>
      </Space>
      <Text strong style={{ fontSize: 22, lineHeight: 1.2 }}>
        {value}
      </Text>
    </div>
  </ProCard>
);

const ContentBlock = ({
  title,
  content,
}: {
  title: string;
  content?: string | null;
}) => {
  if (!content) return null;
  return (
    <ProCard title={title} size="small">
      <pre className="m-0 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-3 text-xs leading-6 text-slate-700">
        {content}
      </pre>
    </ProCard>
  );
};

const DeliveryPage = () => {
  const [form] = Form.useForm<QueryFormValues>();
  const [searchParams] = useSearchParams();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const initialKeyword = normalizeQueryParam(searchParams.get('keyword'));
  const initialSceneCode = normalizeQueryParam(searchParams.get('sceneCode'));

  const [overview, setOverview] =
    useState<Required<DeliveryOverview>>(defaultOverview);
  const [query, setQuery] = useState<ListDeliveryTasksParams>({
    pageNum: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    keyword: initialKeyword,
    sceneCode: initialSceneCode,
  });
  const [rows, setRows] = useState<DeliveryTaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [optionLoading, setOptionLoading] = useState(false);
  const [strategyRows, setStrategyRows] = useState<DeliveryStrategyRow[]>([]);
  const [wayRows, setWayRows] = useState<DeliveryWayListRow[]>([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentRow, setCurrentRow] = useState<DeliveryTaskItem | null>(null);
  const [retryingTaskId, setRetryingTaskId] = useState('');

  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    form.setFieldsValue({
      keyword: initialKeyword,
      sceneCode: initialSceneCode,
    });
    setQuery((prev) => {
      if (
        prev.keyword === initialKeyword &&
        prev.sceneCode === initialSceneCode
      ) {
        return prev;
      }
      return {
        ...prev,
        pageNum: 1,
        keyword: initialKeyword,
        sceneCode: initialSceneCode,
      };
    });
  }, [form, initialKeyword, initialSceneCode]);

  const loadOptions = useCallback(async () => {
    setOptionLoading(true);
    try {
      const [strategyRes, wayRes] = await Promise.all([
        listDeliveryStrategy(),
        listDeliveryWay(),
      ]);
      setStrategyRows(Array.isArray(strategyRes.rows) ? strategyRes.rows : []);
      setWayRows(Array.isArray(wayRes.rows) ? wayRes.rows : []);
    } catch {
      messageApi.error('筛选项加载失败，请稍后重试');
    } finally {
      setOptionLoading(false);
    }
  }, [messageApi]);

  const loadList = useCallback(
    async (params: ListDeliveryTasksParams, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await listDeliveryTasks(params);
        setRows(res.rows);
        setTotal(res.total);
        setOverview(mergeOverview(res.overview));
      } catch {
        if (!silent) messageApi.error('送达任务加载失败，请稍后重试');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [messageApi],
  );

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    void loadList(query);
  }, [loadList, query]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadList(queryRef.current, true);
    }, LIST_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadList]);

  const statCards = useMemo(
    () => [
      {
        key: 'pending',
        title: '待发送',
        value: numberFormatter.format(overview.pendingCount),
        icon: <ClockCircleOutlined />,
        tone: 'warning' as const,
      },
      {
        key: 'sending',
        title: '发送中',
        value: numberFormatter.format(overview.sendingCount),
        icon: <SyncOutlined />,
        tone: 'primary' as const,
      },
      {
        key: 'success',
        title: '送达成功',
        value: numberFormatter.format(overview.successCount),
        icon: <CheckCircleOutlined />,
        tone: 'success' as const,
      },
      {
        key: 'failed',
        title: '送达失败',
        value: numberFormatter.format(overview.failedCount),
        icon: <CloseCircleOutlined />,
        tone: 'error' as const,
      },
      {
        key: 'sms',
        title: '短信任务',
        value: numberFormatter.format(overview.smsTotal),
        icon: <MessageOutlined />,
        tone: 'primary' as const,
      },
      {
        key: 'email',
        title: '邮件任务',
        value: numberFormatter.format(overview.emailTotal),
        icon: <MailOutlined />,
        tone: 'info' as const,
      },
      {
        key: 'express',
        title: '快递任务',
        value: numberFormatter.format(overview.expressTotal),
        icon: <TruckOutlined />,
        tone: 'neutral' as const,
      },
      {
        key: 'call',
        title: '电话任务',
        value: numberFormatter.format(overview.callTotal),
        icon: <PhoneOutlined />,
        tone: 'warning' as const,
      },
    ],
    [overview],
  );

  const applyQuery = (next: ListDeliveryTasksParams) => {
    setQuery(next);
  };

  const handleSearch = () => {
    const values = form.getFieldsValue();
    applyQuery({
      ...query,
      pageNum: 1,
      keyword: values.keyword?.trim() || undefined,
      sceneCode: values.sceneCode || undefined,
      wayCode: values.wayCode || undefined,
      status: values.status,
    });
  };

  const handleReset = () => {
    form.resetFields();
    applyQuery({
      pageNum: 1,
      pageSize: query.pageSize || DEFAULT_PAGE_SIZE,
    });
  };

  const openDetail = async (record: DeliveryTaskItem) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setCurrentRow(record);
    try {
      const detail = await getDeliveryTask(record.taskId);
      if (detail) setCurrentRow(detail);
    } catch {
      messageApi.error('送达详情加载失败，请稍后重试');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRetry = (record: DeliveryTaskItem) => {
    if (normalizeStatus(record.taskStatus) !== 3) return;
    modalApi.confirm({
      title: '确认重试当前渠道？',
      content: `将重试 ${toText(record.debtorName)} 的 ${toText(record.wayName)} 送达任务。`,
      okText: '确认重试',
      cancelText: '取消',
      onOk: async () => {
        setRetryingTaskId(record.taskId);
        try {
          const detail = await retryDeliveryTask(record.taskId);
          if (detail) setCurrentRow(detail);
          await loadList(queryRef.current);
          messageApi.success('重试已提交，后端将异步发送');
        } catch {
          messageApi.error('重试失败，请稍后重试');
        } finally {
          setRetryingTaskId('');
        }
      },
    });
  };

  const columns = useMemo<ColumnsType<DeliveryTaskItem>>(
    () => [
      {
        title: '客户名称',
        dataIndex: 'debtorName',
        width: 120,
        render: (value) => <Text strong>{toText(value)}</Text>,
      },
      {
        title: '手机号',
        dataIndex: 'debtorPhone',
        width: 140,
        render: toText,
      },
      {
        title: '企业/项目',
        dataIndex: 'projectName',
        width: 180,
        ellipsis: true,
        render: toText,
      },
      {
        title: '送达场景',
        dataIndex: 'sceneName',
        width: 160,
        ellipsis: true,
        render: toText,
      },
      {
        title: '送达文件',
        dataIndex: 'fileName',
        width: 180,
        ellipsis: true,
        render: (value, record) => (
          <Text title={toText(value ?? record.fileOssId)}>
            {toText(value ?? record.fileOssId)}
          </Text>
        ),
      },
      {
        title: '送达渠道',
        dataIndex: 'wayCode',
        width: 120,
        align: 'center',
        render: (_, record) => {
          const meta = CHANNEL_META[String(record.wayCode ?? '')] ?? {
            color: 'default',
            icon: null,
          };
          return (
            <Tag color={meta.color} icon={meta.icon}>
              {record.wayName || meta.text || toText(record.wayCode)}
            </Tag>
          );
        },
      },
      {
        title: '状态',
        dataIndex: 'taskStatus',
        width: 120,
        align: 'center',
        render: (_, record) => {
          const status = normalizeStatus(record.taskStatus);
          const meta = status !== undefined ? STATUS_META[status] : undefined;
          return (
            <Tag color={meta?.color ?? 'default'} icon={meta?.icon}>
              {getStatusText(record)}
            </Tag>
          );
        },
      },
      {
        title: '失败原因',
        dataIndex: 'errorMessage',
        width: 220,
        ellipsis: true,
        render: (value, record) =>
          normalizeStatus(record.taskStatus) === 3 ? (
            <Text type="danger" title={toText(value)}>
              {toText(value)}
            </Text>
          ) : (
            <Text type="secondary">-</Text>
          ),
      },
      {
        title: '逾期天数',
        dataIndex: 'overdueDays',
        width: 100,
        align: 'right',
        render: (value) => `${numberFormatter.format(toNumber(value))} 天`,
      },
      {
        title: '账单金额',
        dataIndex: 'debtAmount',
        width: 130,
        align: 'right',
        render: (value) => <Text strong>{formatCurrency(value)}</Text>,
      },
      {
        title: '创建时间',
        dataIndex: 'taskCreateTime',
        width: 170,
        render: (value, record) => (
          <Text type="secondary">{toText(value ?? record.createTime)}</Text>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        fixed: 'right',
        align: 'center',
        render: (_, record) => (
          <Space size={4}>
            <Tooltip title="查看详情">
              <Button
                type="text"
                aria-label="查看详情"
                icon={<EyeOutlined />}
                onClick={() => {
                  void openDetail(record);
                }}
              />
            </Tooltip>
            {normalizeStatus(record.taskStatus) === 3 ? (
              <Tooltip title="重试当前渠道">
                <Button
                  type="text"
                  aria-label="重试当前渠道"
                  icon={<ReloadOutlined />}
                  loading={retryingTaskId === record.taskId}
                  onClick={() => handleRetry(record)}
                />
              </Tooltip>
            ) : null}
          </Space>
        ),
      },
    ],
    [retryingTaskId],
  );

  const currentStatus = normalizeStatus(currentRow?.taskStatus);

  return (
    <PageContainer title="全域智能送达">
      {messageContextHolder}
      {modalContextHolder}

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-8">
          {statCards.map((card) => (
            <StatCard
              key={card.key}
              title={card.title}
              value={card.value}
              icon={card.icon}
              tone={card.tone}
            />
          ))}
        </div>

        <ProCard title="送达任务列表">
          <Form form={form} style={{ marginBottom: 16 }}>
            <Space wrap size={12}>
              <Form.Item name="keyword" noStyle>
                <Input
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="搜索客户 / 手机号 / 项目 / 场景 / 业务ID"
                  style={{ width: 260 }}
                  onPressEnter={handleSearch}
                />
              </Form.Item>
              <Form.Item name="sceneCode" noStyle>
                <Select
                  allowClear
                  showSearch
                  loading={optionLoading}
                  placeholder="送达场景"
                  style={{ width: 180 }}
                  optionFilterProp="label"
                  options={strategyRows.map((item) => ({
                    label: item.sceneName || item.deliveryObj || item.sceneCode,
                    value: item.sceneCode,
                  }))}
                />
              </Form.Item>
              <Form.Item name="wayCode" noStyle>
                <Select
                  allowClear
                  showSearch
                  loading={optionLoading}
                  placeholder="送达渠道"
                  style={{ width: 150 }}
                  optionFilterProp="label"
                  options={wayRows.map((item) => ({
                    label: item.wayName || item.nodeName || item.wayCode,
                    value: item.wayCode,
                  }))}
                />
              </Form.Item>
              <Form.Item name="status" noStyle>
                <Select
                  allowClear
                  placeholder="任务状态"
                  style={{ width: 140 }}
                  options={Object.entries(STATUS_META).map(([value, meta]) => ({
                    label: meta.text,
                    value: Number(value),
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
              <Button
                icon={<SyncOutlined />}
                loading={loading}
                onClick={() => {
                  void loadList(query);
                }}
              >
                刷新
              </Button>
            </Space>
          </Form>

          <Table<DeliveryTaskItem>
            bordered
            className="recov-stable-pagination-table"
            columns={columns}
            dataSource={rows}
            loading={loading}
            rowKey="taskId"
            scroll={{ x: 1720 }}
            locale={{
              emptyText: <Empty description="暂无送达任务" />,
            }}
            pagination={{
              current: query.pageNum || 1,
              pageSize: query.pageSize || DEFAULT_PAGE_SIZE,
              total,
              showSizeChanger: true,
              showTotal: (nextTotal, range) =>
                `第 ${range[0]}-${range[1]} 条/总共 ${nextTotal} 条`,
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

      <Drawer
        title="送达任务详情"
        open={detailOpen}
        width={720}
        destroyOnHidden
        loading={detailLoading}
        onClose={() => setDetailOpen(false)}
        extra={
          currentRow ? (
            <Space>
              {currentStatus !== undefined ? (
                <Tag color={STATUS_META[currentStatus].color}>
                  {getStatusText(currentRow)}
                </Tag>
              ) : null}
              {currentStatus === 3 ? (
                <Button
                  size="small"
                  type="primary"
                  icon={<ReloadOutlined />}
                  loading={retryingTaskId === currentRow.taskId}
                  onClick={() => handleRetry(currentRow)}
                >
                  重试当前渠道
                </Button>
              ) : null}
            </Space>
          ) : null
        }
      >
        {currentRow ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="任务编号" span={2}>
                <Text code>{currentRow.taskId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="送达编号" span={2}>
                <Text code>{toText(currentRow.deliveryId)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="债务编号" span={2}>
                <Text code>{toText(currentRow.debtId)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="来源业务编号" span={2}>
                <Text code>{toText(currentRow.businessId)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="客户名称">
                {toText(currentRow.debtorName)}
              </Descriptions.Item>
              <Descriptions.Item label="手机号">
                {toText(currentRow.debtorPhone)}
              </Descriptions.Item>
              <Descriptions.Item label="邮箱">
                {toText(currentRow.debtorEmail)}
              </Descriptions.Item>
              <Descriptions.Item label="企业/项目">
                {toText(currentRow.projectName)}
              </Descriptions.Item>
              <Descriptions.Item label="送达场景">
                {toText(currentRow.sceneName)}
              </Descriptions.Item>
              <Descriptions.Item label="送达渠道">
                {toText(currentRow.wayName)}
              </Descriptions.Item>
              <Descriptions.Item label="流程顺序">
                {toText(currentRow.flowIndex ?? currentRow.sortOrder)}
              </Descriptions.Item>
              <Descriptions.Item label="重试次数">
                {numberFormatter.format(toNumber(currentRow.retryCount))} 次
              </Descriptions.Item>
              <Descriptions.Item label="成功后动作">
                {currentRow.onSuccess === 'next' ? '继续下一渠道' : '停止'}
              </Descriptions.Item>
              <Descriptions.Item label="失败后动作">
                {currentRow.onFail === 'next' ? '继续下一渠道' : '停止'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {toText(currentRow.createTime ?? currentRow.taskCreateTime)}
              </Descriptions.Item>
              <Descriptions.Item label="送达文件" span={2}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text>{toText(currentRow.fileName)}</Text>
                  <Text type="secondary">
                    OSS ID：{toText(currentRow.fileOssId)}
                  </Text>
                  {currentRow.publicUrl ? (
                    <Paragraph copyable style={{ marginBottom: 0 }}>
                      {currentRow.publicUrl}
                    </Paragraph>
                  ) : null}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="服务商请求 ID" span={2}>
                {toText(currentRow.providerRequestId)}
              </Descriptions.Item>
            </Descriptions>

            {currentStatus === 3 && currentRow.errorMessage ? (
              <Alert
                showIcon
                type="error"
                message="送达失败原因"
                description={currentRow.errorMessage}
              />
            ) : null}

            <ContentBlock
              title="实际发送主题"
              content={currentRow.subjectContent}
            />
            <ContentBlock
              title="实际发送内容"
              content={currentRow.sendContent}
            />
            <ContentBlock
              title="服务商响应"
              content={currentRow.providerResponse}
            />
          </Space>
        ) : (
          <Empty description="暂无详情" />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default DeliveryPage;
