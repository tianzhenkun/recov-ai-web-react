import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileUnknownOutlined,
  MailOutlined,
  MessageOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
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
  type DeliveryOverview,
  type DeliveryTaskItem,
  type DeliveryTaskStatus,
  getDeliveryTask,
  type ListDeliveryTasksParams,
  listDeliveryCities,
  listDeliveryOrganizations,
  listDeliveryTasks,
  retryDeliveryTask,
} from '@/services/ruoyi/deliveryTask';
import { downloadOss } from '@/services/ruoyi/oss';

const { Text } = Typography;

type QueryFormValues = {
  debtNumber?: string;
  city?: string;
  organization?: string;
};

type StatCardProps = {
  title: string;
  value: string;
  icon: ReactNode;
  tone: MetricTone;
};

type DeliveryFileKind = 'image' | 'pdf' | 'text' | 'unknown';

type DeliveryFilePreviewState = {
  open: boolean;
  fileUrl: string;
  fileName: string;
  previewType: 'image' | 'embed';
};

const DEFAULT_PAGE_SIZE = 20;
const LIST_REFRESH_INTERVAL_MS = 5000;

const deliveryFileSuffixGroups = {
  image: new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']),
  pdf: new Set(['pdf']),
  text: new Set(['txt', 'log', 'json', 'xml', 'csv', 'md']),
};

const previewableDeliveryFileKinds = new Set<DeliveryFileKind>([
  'image',
  'pdf',
  'text',
]);

const DELIVERY_FILE_VISUAL: Record<
  DeliveryFileKind,
  { icon: ReactNode; color: string; background: string }
> = {
  image: {
    icon: <FileImageOutlined />,
    color: '#0958d9',
    background: '#e6f4ff',
  },
  pdf: {
    icon: <FilePdfOutlined />,
    color: '#cf1322',
    background: '#fff1f0',
  },
  text: {
    icon: <FileTextOutlined />,
    color: '#08979c',
    background: '#e6fffb',
  },
  unknown: {
    icon: <FileUnknownOutlined />,
    color: '#8c8c8c',
    background: '#f5f5f5',
  },
};

const STATUS_META: Record<
  DeliveryTaskStatus,
  { text: string; color: string; icon: ReactNode }
> = {
  0: { text: '待送达', color: 'default', icon: <ClockCircleOutlined /> },
  1: { text: '送达中', color: 'processing', icon: <SyncOutlined spin /> },
  2: { text: '已送达', color: 'success', icon: <CheckCircleOutlined /> },
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

const getNonEmptyText = (...values: unknown[]) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
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

const getAssetNumber = (record: DeliveryTaskItem) =>
  toText(record.debtNumber ?? record.debtId);

const getDeliveryFileSuffix = (record?: DeliveryTaskItem | null) => {
  const candidates = [record?.fileName, record?.publicUrl];

  for (const candidate of candidates) {
    const text = getNonEmptyText(candidate);
    if (!text) continue;
    const normalized = text.replace(/^\./, '').toLowerCase();
    if (
      Object.values(deliveryFileSuffixGroups).some((group) =>
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

const getDeliveryFileKind = (
  record?: DeliveryTaskItem | null,
): DeliveryFileKind => {
  const suffix = getDeliveryFileSuffix(record);
  if (deliveryFileSuffixGroups.image.has(suffix)) return 'image';
  if (deliveryFileSuffixGroups.pdf.has(suffix)) return 'pdf';
  if (deliveryFileSuffixGroups.text.has(suffix)) return 'text';
  return 'unknown';
};

const getDeliveryFileName = (record?: DeliveryTaskItem | null) => {
  const name = getNonEmptyText(record?.fileName, record?.fileOssId);
  if (!name) return '送达文件';
  return name.split(/[\\/]/).pop()?.split('?')[0] || name;
};

const getDeliveryFileUrl = (record?: DeliveryTaskItem | null) =>
  getNonEmptyText(record?.publicUrl);

const getDeliveryFileDownloadName = (record: DeliveryTaskItem) => {
  const name = getDeliveryFileName(record);
  const suffix = getDeliveryFileSuffix(record);
  return suffix && !name.toLowerCase().endsWith(`.${suffix}`)
    ? `${name}.${suffix}`
    : name;
};

const mergeOverview = (overview?: DeliveryOverview) => ({
  ...defaultOverview,
  ...(overview ?? {}),
});

const getStatusText = (record: DeliveryTaskItem) => {
  const status = normalizeStatus(record.taskStatus);
  return status !== undefined
    ? STATUS_META[status].text
    : record.taskStatusLabel || '-';
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
  const readableContent = getReadableContent(content);
  if (!readableContent) return null;
  return (
    <DetailSubsection title={title}>
      <div className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
        {readableContent}
      </div>
    </DetailSubsection>
  );
};

const decodeHtmlEntities = (value: string) => {
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
  }

  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};

const getReadableContent = (content?: string | null) => {
  const rawText = getNonEmptyText(content);
  if (!rawText) return '';

  const decodedText = decodeHtmlEntities(rawText);
  if (!/<[a-z][\s\S]*>/i.test(decodedText)) {
    return decodedText.replace(/\n{3,}/g, '\n\n').trim();
  }

  if (typeof document !== 'undefined') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = decodedText
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '</p>\n')
      .replace(/<\/div>/gi, '</div>\n');
    return (wrapper.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }

  return decodedText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const DetailPanel = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <ProCard title={title} size="small" styles={{ body: { padding: 16 } }}>
    {children}
  </ProCard>
);

const DetailSubsection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="min-w-0">
    <Text className="mb-2 block text-sm" strong>
      {title}
    </Text>
    {children}
  </section>
);

const DeliveryPage = () => {
  const [form] = Form.useForm<QueryFormValues>();
  const [searchParams] = useSearchParams();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const initialDebtNumber = normalizeQueryParam(searchParams.get('debtNumber'));
  const initialCity = normalizeQueryParam(searchParams.get('city'));
  const initialOrganization = normalizeQueryParam(
    searchParams.get('organization'),
  );
  const initialLegacyKeyword = normalizeQueryParam(searchParams.get('keyword'));
  const initialLegacySceneCode = normalizeQueryParam(
    searchParams.get('sceneCode'),
  );

  const [overview, setOverview] =
    useState<Required<DeliveryOverview>>(defaultOverview);
  const [query, setQuery] = useState<ListDeliveryTasksParams>({
    pageNum: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    debtNumber: initialDebtNumber,
    city: initialCity,
    organization: initialOrganization,
    keyword: initialLegacyKeyword,
    sceneCode: initialLegacySceneCode,
  });
  const [rows, setRows] = useState<DeliveryTaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [organizationOptions, setOrganizationOptions] = useState<string[]>([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentRow, setCurrentRow] = useState<DeliveryTaskItem | null>(null);
  const [retryingTaskId, setRetryingTaskId] = useState('');
  const [filePreview, setFilePreview] = useState<DeliveryFilePreviewState>({
    open: false,
    fileUrl: '',
    fileName: '',
    previewType: 'embed',
  });
  const [downloadingFile, setDownloadingFile] = useState(false);

  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    form.setFieldsValue({
      debtNumber: initialDebtNumber,
      city: initialCity,
      organization: initialOrganization,
    });
    setQuery((prev) => {
      if (
        prev.debtNumber === initialDebtNumber &&
        prev.city === initialCity &&
        prev.organization === initialOrganization &&
        prev.keyword === initialLegacyKeyword &&
        prev.sceneCode === initialLegacySceneCode
      ) {
        return prev;
      }
      return {
        ...prev,
        pageNum: 1,
        debtNumber: initialDebtNumber,
        city: initialCity,
        organization: initialOrganization,
        keyword: initialLegacyKeyword,
        sceneCode: initialLegacySceneCode,
      };
    });
  }, [
    form,
    initialCity,
    initialDebtNumber,
    initialLegacyKeyword,
    initialLegacySceneCode,
    initialOrganization,
  ]);

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
    const loadFilterOptions = async () => {
      setFilterOptionsLoading(true);
      try {
        const [citiesRes, organizationsRes] = await Promise.all([
          listDeliveryCities(),
          listDeliveryOrganizations(),
        ]);
        setCityOptions(citiesRes.data ?? []);
        setOrganizationOptions(organizationsRes.data ?? []);
      } catch {
        setCityOptions([]);
        setOrganizationOptions([]);
      } finally {
        setFilterOptionsLoading(false);
      }
    };

    void loadFilterOptions();
  }, []);

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
        key: 'pendingTasks',
        title: '待处理任务',
        value: numberFormatter.format(
          overview.pendingCount + overview.sendingCount,
        ),
        icon: <ClockCircleOutlined />,
        tone: 'warning' as const,
      },
      {
        key: 'processedTasks',
        title: '已处理任务',
        value: numberFormatter.format(
          overview.successCount + overview.failedCount,
        ),
        icon: <CheckCircleOutlined />,
        tone: 'success' as const,
      },
      {
        key: 'sms',
        title: '发送短信总量',
        value: numberFormatter.format(overview.smsTotal),
        icon: <MessageOutlined />,
        tone: 'primary' as const,
      },
      {
        key: 'email',
        title: '发送邮件总量',
        value: numberFormatter.format(overview.emailTotal),
        icon: <MailOutlined />,
        tone: 'info' as const,
      },
      {
        key: 'express',
        title: '快递函件总量',
        value: numberFormatter.format(overview.expressTotal),
        icon: <TruckOutlined />,
        tone: 'neutral' as const,
      },
      {
        key: 'call',
        title: '电话提醒数量',
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
      pageNum: 1,
      pageSize: query.pageSize || DEFAULT_PAGE_SIZE,
      debtNumber: values.debtNumber?.trim() || undefined,
      city: values.city?.trim() || undefined,
      organization: values.organization?.trim() || undefined,
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

  const canPreviewDeliveryFile = (record: DeliveryTaskItem) =>
    Boolean(
      getDeliveryFileUrl(record) &&
        previewableDeliveryFileKinds.has(getDeliveryFileKind(record)),
    );

  const openDeliveryFilePreview = (record: DeliveryTaskItem) => {
    const fileUrl = getDeliveryFileUrl(record);
    if (!fileUrl) {
      messageApi.warning('当前送达文件没有可预览地址');
      return;
    }

    const kind = getDeliveryFileKind(record);
    if (!previewableDeliveryFileKinds.has(kind)) {
      messageApi.info('当前文件类型暂不支持在线预览');
      return;
    }

    setFilePreview({
      open: true,
      fileUrl,
      fileName: getDeliveryFileName(record),
      previewType: kind === 'image' ? 'image' : 'embed',
    });
  };

  const downloadDeliveryFile = async (record: DeliveryTaskItem) => {
    const ossId = getNonEmptyText(record.fileOssId);
    const fileUrl = getDeliveryFileUrl(record);

    if (!ossId && !fileUrl) {
      messageApi.warning('当前送达文件缺少下载信息');
      return;
    }
    if (downloadingFile) return;

    const messageKey = `delivery-file-download-${record.taskId}`;
    setDownloadingFile(true);
    messageApi.open({
      key: messageKey,
      type: 'loading',
      content: '正在下载送达文件...',
      duration: 0,
    });

    try {
      if (ossId) {
        await downloadOss(ossId, getDeliveryFileDownloadName(record));
      } else {
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
      }
      messageApi.open({
        key: messageKey,
        type: 'success',
        content: ossId ? '下载已开始' : '已在新窗口打开文件',
        duration: 2,
      });
    } catch (error) {
      messageApi.open({
        key: messageKey,
        type: 'error',
        content:
          error instanceof Error
            ? error.message
            : '送达文件下载失败，请稍后重试',
        duration: 3,
      });
    } finally {
      setDownloadingFile(false);
    }
  };

  const renderDeliveryFile = (record: DeliveryTaskItem) => {
    const hasFile = getNonEmptyText(
      record.fileName,
      record.fileOssId,
      record.publicUrl,
    );
    if (!hasFile) return <Text type="secondary">暂无送达文件</Text>;

    const kind = getDeliveryFileKind(record);
    const suffix = getDeliveryFileSuffix(record);
    const visual = DELIVERY_FILE_VISUAL[kind];
    const name = getDeliveryFileName(record);

    return (
      <div
        className="flex items-start gap-3 rounded-md border border-solid border-slate-200 bg-white p-3"
        style={{ maxWidth: '100%' }}
      >
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-lg"
          style={{
            color: visual.color,
            background: visual.background,
            borderRadius: 8,
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
              {canPreviewDeliveryFile(record) ? (
                <Tooltip title="预览文件">
                  <Button
                    aria-label="预览文件"
                    icon={<EyeOutlined />}
                    onClick={() => openDeliveryFilePreview(record)}
                    shape="circle"
                    size="small"
                    type="text"
                  />
                </Tooltip>
              ) : null}
              <Tooltip title="下载文件">
                <Button
                  aria-label="下载文件"
                  icon={<DownloadOutlined />}
                  loading={downloadingFile}
                  onClick={() => {
                    void downloadDeliveryFile(record);
                  }}
                  shape="circle"
                  size="small"
                  type="text"
                />
              </Tooltip>
            </Space>
          </div>
          {suffix ? (
            <Tag style={{ marginTop: 6 }}>{suffix.toUpperCase()}</Tag>
          ) : null}
        </div>
      </div>
    );
  };

  const columns = useMemo<ColumnsType<DeliveryTaskItem>>(
    () => [
      {
        title: '资产编号',
        dataIndex: 'debtNumber',
        width: RECOV_LIST_COLUMN_WIDTH.debtNumber,
        ellipsis: { showTitle: false },
        render: (_, record) =>
          renderRecovSingleLineText(getAssetNumber(record)),
      },
      {
        title: '所属城市',
        dataIndex: 'city',
        width: RECOV_LIST_COLUMN_WIDTH.city,
        render: toText,
      },
      {
        title: '所属项目',
        dataIndex: 'projectName',
        width: RECOV_LIST_COLUMN_WIDTH.organization,
        ellipsis: { showTitle: false },
        render: renderRecovSingleLineText,
      },
      {
        title: '业主姓名',
        dataIndex: 'debtorName',
        width: 150,
        ellipsis: { showTitle: false },
        render: renderRecovSingleLineText,
      },
      {
        title: '电话',
        dataIndex: 'debtorPhone',
        width: 130,
        render: toText,
      },
      {
        title: '逾期金额',
        dataIndex: 'debtAmount',
        width: 120,
        align: 'right',
        render: (value) => <Text strong>{formatCurrency(value)}</Text>,
      },
      {
        title: '违约（滞纳）金',
        dataIndex: 'overdueAmount',
        width: 140,
        align: 'right',
        render: (value) => <Text strong>{formatCurrency(value)}</Text>,
      },
      {
        title: '状态',
        dataIndex: 'taskStatus',
        width: 110,
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
        title: '送达方式',
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
    <RecovListPage title="全域智能送达管理">
      {messageContextHolder}
      {modalContextHolder}

      <RecovListStack>
        <RecovStatsStrip className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
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

        <RecovTableCard title="已送达名单">
          <Form form={form} className="recov-table-toolbar">
            <Space wrap size={12}>
              <Form.Item name="debtNumber" noStyle>
                <Input
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="资产编号"
                  style={RECOV_FILTER_CONTROL_STYLE}
                  onPressEnter={handleSearch}
                />
              </Form.Item>
              <Form.Item name="city" noStyle>
                <Select
                  allowClear
                  loading={filterOptionsLoading}
                  optionFilterProp="label"
                  options={cityOptions.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                  placeholder="所属城市"
                  showSearch
                  style={RECOV_FILTER_CONTROL_STYLE}
                />
              </Form.Item>
              <Form.Item name="organization" noStyle>
                <Select
                  allowClear
                  loading={filterOptionsLoading}
                  optionFilterProp="label"
                  options={organizationOptions.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                  optionRender={(option) =>
                    renderRecovSelectOptionLabel(option.label)
                  }
                  placeholder="所属项目"
                  popupMatchSelectWidth={RECOV_ORGANIZATION_POPUP_WIDTH}
                  showSearch
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
          </Form>

          <Table<DeliveryTaskItem>
            bordered
            className="recov-stable-pagination-table"
            columns={columns}
            dataSource={rows}
            loading={loading}
            rowKey="taskId"
            scroll={{ x: 1240 }}
            locale={{
              emptyText: <Empty description="暂无送达记录" />,
            }}
            pagination={{
              current: query.pageNum || 1,
              pageSize: query.pageSize || DEFAULT_PAGE_SIZE,
              total,
              showSizeChanger: true,
              showTotal: (nextTotal) => `共 ${nextTotal} 条`,
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

      <Drawer
        title="送达详情"
        open={detailOpen}
        width={720}
        destroyOnHidden
        loading={detailLoading}
        onClose={() => setDetailOpen(false)}
        extra={
          currentRow && currentStatus === 3 ? (
            <Button
              size="small"
              type="primary"
              icon={<ReloadOutlined />}
              loading={retryingTaskId === currentRow.taskId}
              onClick={() => handleRetry(currentRow)}
            >
              重试当前渠道
            </Button>
          ) : null
        }
      >
        {currentRow ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <DetailPanel title="基础信息">
              <Descriptions
                column={2}
                colon={false}
                size="small"
                labelStyle={{ color: '#64748b', width: 72 }}
                contentStyle={{ minWidth: 0, wordBreak: 'break-word' }}
              >
                <Descriptions.Item label="资产编号">
                  {getAssetNumber(currentRow)}
                </Descriptions.Item>
                <Descriptions.Item label="业主姓名">
                  {toText(currentRow.debtorName)}
                </Descriptions.Item>
                <Descriptions.Item label="所属城市">
                  {toText(currentRow.city)}
                </Descriptions.Item>
                <Descriptions.Item label="所属项目">
                  {toText(currentRow.projectName)}
                </Descriptions.Item>
                <Descriptions.Item label="送达场景">
                  {toText(currentRow.sceneName)}
                </Descriptions.Item>
                <Descriptions.Item label="送达渠道">
                  {toText(currentRow.wayName)}
                </Descriptions.Item>
                <Descriptions.Item label="送达状态">
                  {currentStatus !== undefined ? (
                    <Tag
                      color={STATUS_META[currentStatus].color}
                      icon={STATUS_META[currentStatus].icon}
                      style={{ marginInlineEnd: 0 }}
                    >
                      {getStatusText(currentRow)}
                    </Tag>
                  ) : (
                    '-'
                  )}
                </Descriptions.Item>
              </Descriptions>
            </DetailPanel>

            {currentStatus === 3 && currentRow.errorMessage ? (
              <Alert
                showIcon
                type="error"
                message="送达失败原因"
                description={currentRow.errorMessage}
              />
            ) : null}

            <DetailPanel title="送达内容">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {renderDeliveryFile(currentRow)}
                <ContentBlock
                  title="实际发送主题"
                  content={currentRow.subjectContent}
                />
                <ContentBlock
                  title="实际发送内容"
                  content={currentRow.sendContent}
                />
              </Space>
            </DetailPanel>
          </Space>
        ) : (
          <Empty description="暂无详情" />
        )}
      </Drawer>

      <Modal
        title={filePreview.fileName || '送达文件预览'}
        open={filePreview.open}
        width={860}
        destroyOnHidden
        footer={
          <Space>
            <Button
              disabled={!filePreview.fileUrl}
              onClick={() =>
                window.open(
                  filePreview.fileUrl,
                  '_blank',
                  'noopener,noreferrer',
                )
              }
            >
              新窗口打开
            </Button>
            <Button
              onClick={() =>
                setFilePreview((prev) => ({ ...prev, open: false }))
              }
            >
              关闭
            </Button>
          </Space>
        }
        onCancel={() => setFilePreview((prev) => ({ ...prev, open: false }))}
      >
        {filePreview.fileUrl ? (
          filePreview.previewType === 'image' ? (
            <img
              alt={filePreview.fileName}
              src={filePreview.fileUrl}
              style={{
                display: 'block',
                maxHeight: '70vh',
                maxWidth: '100%',
                margin: '0 auto',
                objectFit: 'contain',
              }}
            />
          ) : (
            <object
              data={filePreview.fileUrl}
              style={{
                width: '100%',
                height: '70vh',
                border: '1px solid #f0f0f0',
                borderRadius: 8,
              }}
            >
              <div className="flex h-[320px] flex-col items-center justify-center gap-3">
                <Text type="secondary">当前浏览器不支持内嵌预览该文件</Text>
                <Button
                  type="primary"
                  onClick={() =>
                    window.open(
                      filePreview.fileUrl,
                      '_blank',
                      'noopener,noreferrer',
                    )
                  }
                >
                  新窗口打开
                </Button>
              </div>
            </object>
          )
        ) : (
          <Empty description="暂无可预览文件" />
        )}
      </Modal>
    </RecovListPage>
  );
};

export default DeliveryPage;
