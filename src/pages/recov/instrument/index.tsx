import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Button,
  Descriptions,
  Empty,
  Form,
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
import TableActions from '@/components/TableActions';
import TemplateEditor from '@/components/TemplateEditor';
import type {
  TemplateEditorFeatures,
  TemplateVariable,
} from '@/components/TemplateEditor/types';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import {
  addInstrumentTask,
  deleteInstrumentTask,
  getInstrumentTaskContent,
  type InstrumentMetricItem,
  type InstrumentTaskContentData,
  type InstrumentTaskItem,
  type InstrumentTaskQuery,
  listInstrumentCities,
  listInstrumentOrganizations,
  pageInstrumentTask,
  pageInstrumentTaskDebts,
  updateInstrumentTaskTemplate,
} from '@/services/ruoyi/instrument';
import { listOssByIds } from '@/services/ruoyi/oss';

const { Text } = Typography;

type InstrumentCategory = '催收函件' | '诉讼材料';

type QueryValues = {
  status?: number;
  city?: string;
  organization?: string;
};

type DebtSearchValues = {
  debtorName?: string;
  debtNumber?: string;
};

type DocumentPreview = {
  visible: boolean;
  loading: boolean;
  downloading: boolean;
  instrumentName: string;
  debtorName: string;
  fileName: string;
  fileUrl: string;
};

const DEFAULT_PAGE_SIZE = 10;

const statusOptions: { value: number; label: string }[] = [
  { value: 0, label: '待开始' },
  { value: 1, label: '生成中' },
  { value: 2, label: '生成成功' },
  { value: 3, label: '生成失败' },
  { value: 4, label: '盖章中' },
  { value: 5, label: '盖章成功' },
  { value: 6, label: '盖章失败' },
  { value: 7, label: '送达中' },
];

const statusMap: Record<number, { label: string; color: string }> = {
  0: { label: '待开始', color: 'default' },
  1: { label: '生成中', color: 'processing' },
  2: { label: '生成成功', color: 'success' },
  3: { label: '生成失败', color: 'error' },
  4: { label: '盖章中', color: 'processing' },
  5: { label: '盖章成功', color: 'success' },
  6: { label: '盖章失败', color: 'error' },
  7: { label: '送达中', color: 'warning' },
};

const instrumentTemplateVariables: TemplateVariable[] = [
  { label: '债务人姓名', value: 'debtorName' },
  { label: '债务编号', value: 'debtNumber' },
  { label: '债务金额', value: 'debtAmount' },
  { label: '逾期金额', value: 'overdueAmount' },
  { label: '逾期天数', value: 'overdueDays' },
  { label: '所属城市', value: 'city' },
  { label: '所属项目', value: 'organization' },
  { label: '当前日期', value: 'currentDate' },
];

const instrumentEditorFeatures: TemplateEditorFeatures = {
  textStyle: true,
  color: true,
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

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : value;
};

const getStatusInfo = (status?: number) =>
  statusMap[Number(status)] || { label: '未知', color: 'default' };

const getRowKey = (record: InstrumentTaskItem) =>
  String(record.id ?? record.debtId ?? record.debtNumber);

const isEmptyHtml = (value: string) => {
  const text = value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, '')
    .trim();
  return !text;
};

const extractHtmlContent = (payload?: InstrumentTaskContentData) => {
  if (typeof payload === 'string') return payload || '<p></p>';
  return (
    payload?.htmlContent ||
    payload?.templateHtml ||
    payload?.contentHtml ||
    '<p></p>'
  );
};

const normalizeTaskPage = (response: unknown) => {
  const res = response as {
    data?: {
      page?: { rows?: InstrumentTaskItem[]; total?: number };
      rows?: InstrumentTaskItem[];
      total?: number;
      metrics?: InstrumentMetricItem[];
    };
    rows?: InstrumentTaskItem[];
    total?: number;
  };
  return {
    rows: res.data?.page?.rows ?? res.data?.rows ?? res.rows ?? [],
    total: res.data?.page?.total ?? res.data?.total ?? res.total ?? 0,
    metrics: res.data?.metrics ?? [],
  };
};

const saveBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

type StatDisplayValue = {
  primary: string;
  unit?: string;
  tooltip?: string;
};

const statCardStyles = {
  body: {
    padding: 12,
  },
} satisfies { body: CSSProperties };

const statIconStyle = (color: string, bg: string): CSSProperties => ({
  display: 'inline-flex',
  width: 32,
  height: 32,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 8,
  color,
  background: bg,
  fontSize: 14,
});

type StatCardProps = {
  title: string;
  value: StatDisplayValue;
  color: string;
  icon: ReactNode;
};

const StatCard = ({ title, value, color, icon }: StatCardProps) => {
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
            color,
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
          {icon}
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
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const confirmDelete = useDeleteConfirm({ modal: modalApi, messageApi });
  const [queryForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [debtForm] = Form.useForm();

  const [activeCategory, setActiveCategory] =
    useState<InstrumentCategory>('催收函件');
  const [queryValues, setQueryValues] = useState<QueryValues>({});
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<InstrumentTaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<InstrumentMetricItem[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [organizationOptions, setOrganizationOptions] = useState<string[]>([]);

  const [editVisible, setEditVisible] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InstrumentTaskItem | null>(
    null,
  );
  const [selectedDebt, setSelectedDebt] = useState<InstrumentTaskItem | null>(
    null,
  );
  const [editorValue, setEditorValue] = useState('<p></p>');

  const [debtVisible, setDebtVisible] = useState(false);
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

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    void fetchFilterOptions();
  }, [fetchFilterOptions]);

  const metricMap = useMemo(
    () => new Map(metrics.map((item) => [item.key, item])),
    [metrics],
  );

  const getMetricValue = (key: string): StatDisplayValue => {
    const metric = metricMap.get(key);
    if (key === 'recovered') {
      const amount = metric?.value ?? 0;
      return {
        primary: metric?.displayValue || formatCompactAmount(amount),
        tooltip: formatAmount(amount),
      };
    }
    return {
      primary: numberFormatter.format(toNumber(metric?.value)),
      unit: metric?.unit || '个',
    };
  };

  const statCards: StatCardProps[] = [
    {
      title: '已生成催收函件',
      value: getMetricValue('genLetter'),
      color: '#1677ff',
      icon: (
        <span style={statIconStyle('#1677ff', '#eaf2ff')}>
          <FileTextOutlined />
        </span>
      ),
    },
    {
      title: '已生成起诉材料',
      value: getMetricValue('genLitigation'),
      color: '#7c3aed',
      icon: (
        <span style={statIconStyle('#7c3aed', '#f3edff')}>
          <FileProtectOutlined />
        </span>
      ),
    },
    {
      title: '已发送催收函',
      value: getMetricValue('sentLetter'),
      color: '#13c2c2',
      icon: (
        <span style={statIconStyle('#13c2c2', '#e6fffb')}>
          <SendOutlined />
        </span>
      ),
    },
    {
      title: '已进入法诉程序',
      value: getMetricValue('litigation'),
      color: '#fa8c16',
      icon: (
        <span style={statIconStyle('#fa8c16', '#fff7e6')}>
          <FileDoneOutlined />
        </span>
      ),
    },
    {
      title: '本阶段回款',
      value: getMetricValue('recovered'),
      color: '#52c41a',
      icon: (
        <span style={statIconStyle('#52c41a', '#f6ffed')}>
          <WalletOutlined />
        </span>
      ),
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

  const openDebtSelector = () => {
    setDebtVisible(true);
    setDebtPageNum(1);
    setDebtQueryValues({});
    debtForm.resetFields();
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
      const data = normalizeTaskPage(response);
      setDebtData(data.rows);
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

  const openEditDocument = async (record: InstrumentTaskItem) => {
    setEditingRecord(record);
    setSelectedDebt(record);
    setEditorValue('<p></p>');
    editForm.setFieldsValue({
      instrumentName: record.instrumentName,
      debtorName: record.debtorName,
    });
    setEditVisible(true);
    setEditLoading(true);
    try {
      const response = await getInstrumentTaskContent(record.id);
      setEditorValue(extractHtmlContent(response.data));
    } catch (error) {
      console.error('获取文书内容失败:', error);
      messageApi.warning('未获取到历史文书内容，将展示空白模板');
    } finally {
      setEditLoading(false);
    }
  };

  const openAddLawsuit = () => {
    setEditingRecord(null);
    setSelectedDebt(null);
    setEditorValue('<p></p>');
    editForm.resetFields();
    setEditVisible(true);
  };

  const handleSaveDocument = async () => {
    const values = await editForm.validateFields();
    if (isEmptyHtml(editorValue)) {
      messageApi.warning('请输入文书内容');
      return;
    }
    if (!editingRecord && !selectedDebt?.debtId) {
      messageApi.warning('请先选择关联债务');
      return;
    }

    setSaveLoading(true);
    try {
      if (editingRecord) {
        await updateInstrumentTaskTemplate(
          editingRecord.id,
          editorValue,
          values.instrumentName,
        );
        messageApi.success('文书更新成功');
      } else {
        await addInstrumentTask(
          selectedDebt?.debtId as number | string,
          values.instrumentName || '',
          editorValue,
        );
        messageApi.success('文书新增成功');
      }
      setEditVisible(false);
      void fetchList();
    } catch (error) {
      console.error('保存文书失败:', error);
      messageApi.error('保存文书失败');
    } finally {
      setSaveLoading(false);
    }
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
      onSuccess: () => void fetchList(),
    });
  };

  const openPreview = async (record: InstrumentTaskItem) => {
    const fileName = `${record.debtorName || '文书'}_${record.instrumentName || '函件'}.pdf`;
    setPreview({
      visible: true,
      loading: true,
      downloading: false,
      instrumentName: record.instrumentName || '',
      debtorName: record.debtorName || '',
      fileName,
      fileUrl: '',
    });

    if (!record.templateOssId) {
      setPreview((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      const response = await listOssByIds(record.templateOssId);
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
    if (!preview.fileUrl) {
      messageApi.warning('文档尚未加载');
      return;
    }
    setPreview((prev) => ({ ...prev, downloading: true }));
    try {
      const response = await fetch(preview.fileUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      saveBlob(blob, preview.fileName);
      messageApi.success('文档下载成功');
    } catch (error) {
      console.error('下载文档失败:', error);
      messageApi.error('下载文档失败');
    } finally {
      setPreview((prev) => ({ ...prev, downloading: false }));
    }
  };

  const columns: any[] = [
    {
      title: '债务人姓名',
      dataIndex: 'debtorName',
      width: 140,
      fixed: 'left',
      render: (value: unknown) => <Text strong>{toText(value)}</Text>,
    },
    {
      title: '债务编号',
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
      width: 150,
      ellipsis: true,
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
      title: '文书类型',
      dataIndex: 'instrumentName',
      width: 150,
      ellipsis: true,
      render: toText,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value: unknown) => {
        const status = getStatusInfo(Number(value));
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      render: formatDateTime,
    },
    {
      title: '操作',
      width: 120,
      fixed: 'right',
      render: (_: unknown, record: InstrumentTaskItem) => (
        <TableActions
          maxVisible={2}
          actions={[
            {
              key: 'edit',
              label: '编辑文书',
              icon: <EditOutlined />,
              onClick: () => void openEditDocument(record),
            },
            {
              key: 'view',
              label: '查看函件',
              icon: <EyeOutlined />,
              onClick: () => void openPreview(record),
            },
            {
              key: 'delete',
              label: '删除',
              danger: true,
              disabled: record.editable === false,
              icon: <DeleteOutlined />,
              onClick: () => handleDelete(record),
            },
          ]}
        />
      ),
    },
  ];

  const debtColumns: any[] = [
    {
      title: '债务人姓名',
      dataIndex: 'debtorName',
      width: 140,
      fixed: 'left',
      render: (value: unknown) => <Text strong>{toText(value)}</Text>,
    },
    {
      title: '债务编号',
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
      width: 140,
      ellipsis: true,
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
      title: '操作',
      width: 96,
      fixed: 'right',
      render: (_: unknown, record: InstrumentTaskItem) => (
        <Button
          size="small"
          type="link"
          onClick={() => {
            setSelectedDebt(record);
            editForm.setFieldsValue({ debtorName: record.debtorName });
            setDebtVisible(false);
          }}
        >
          选择
        </Button>
      ),
    },
  ];

  return (
    <PageContainer title="智能法律文书管理">
      {messageContextHolder}
      {modalContextHolder}
      <div className="flex flex-col gap-4 pb-4">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 10,
          }}
        >
          {statCards.map((item) => (
            <StatCard key={item.title} {...item} />
          ))}
        </div>

        <ProCard
          title="文书任务列表"
          extra={
            <Space size={8}>
              {activeCategory === '诉讼材料' ? (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openAddLawsuit}
                >
                  新增诉讼材料
                </Button>
              ) : null}
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void fetchList()}
              >
                刷新
              </Button>
            </Space>
          }
        >
          <div className="flex flex-col gap-4">
            <Tabs
              activeKey={activeCategory}
              items={[
                { key: '催收函件', label: '催收函件' },
                { key: '诉讼材料', label: '诉讼材料' },
              ]}
              onChange={(key) => {
                setActiveCategory(key as InstrumentCategory);
                setPageNum(1);
                setQueryValues({});
                queryForm.resetFields();
              }}
            />

            <Form form={queryForm} layout="inline" onFinish={handleQuery}>
              <Form.Item name="city">
                <Select
                  allowClear
                  placeholder="所属城市"
                  style={{ width: 180 }}
                  options={cityOptions.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                />
              </Form.Item>
              <Form.Item name="organization">
                <Select
                  allowClear
                  placeholder="所属项目"
                  style={{ width: 220 }}
                  options={organizationOptions.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                />
              </Form.Item>
              <Form.Item name="status">
                <Select
                  allowClear
                  placeholder="状态"
                  style={{ width: 160 }}
                  options={statusOptions}
                />
              </Form.Item>
              <Form.Item>
                <Space size={8}>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    htmlType="submit"
                  >
                    查询
                  </Button>
                  <Button onClick={handleResetQuery}>重置</Button>
                </Space>
              </Form.Item>
            </Form>

            <Table
              rowKey={getRowKey}
              loading={loading}
              columns={columns}
              dataSource={tableData}
              scroll={{ x: 1550 }}
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
        </ProCard>
      </div>

      <Modal
        width="90%"
        title={
          editingRecord
            ? `编辑文书 - ${toText(editingRecord.debtorName)} ${toText(editingRecord.instrumentName)}`
            : '新增诉讼材料'
        }
        open={editVisible}
        confirmLoading={saveLoading}
        okText="保存并同步"
        cancelText="关闭"
        destroyOnClose
        onOk={() => void handleSaveDocument()}
        onCancel={() => setEditVisible(false)}
      >
        <Spin spinning={editLoading}>
          <Form
            form={editForm}
            layout="vertical"
            className="mb-4"
            initialValues={{ instrumentName: '', debtorName: '' }}
          >
            {!editingRecord ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Form.Item
                  name="instrumentName"
                  label="文书类型"
                  rules={[{ required: true, message: '请输入文书类型' }]}
                >
                  <Input placeholder="请输入文书类型" />
                </Form.Item>
                <Form.Item
                  name="debtorName"
                  label="关联债务"
                  rules={[{ required: true, message: '请选择关联债务' }]}
                >
                  <Input
                    readOnly
                    placeholder="请选择关联债务"
                    addonAfter={
                      <Button type="link" onClick={openDebtSelector}>
                        选择
                      </Button>
                    }
                  />
                </Form.Item>
              </div>
            ) : (
              <Form.Item
                name="instrumentName"
                label="文书类型"
                rules={[{ required: true, message: '请输入文书类型' }]}
              >
                <Input placeholder="请输入文书类型" />
              </Form.Item>
            )}
          </Form>

          <div className="mb-2 text-sm font-semibold text-slate-900">
            文书内容编辑
          </div>
          <TemplateEditor
            value={editorValue}
            outputType="html"
            placeholder="请输入文书内容..."
            variables={instrumentTemplateVariables}
            features={instrumentEditorFeatures}
            height={500}
            onChange={setEditorValue}
          />
        </Spin>
      </Modal>

      <Modal
        width="70%"
        title="选择关联债务"
        open={debtVisible}
        footer={null}
        destroyOnClose
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
              <Input
                allowClear
                placeholder="债务人姓名"
                style={{ width: 180 }}
              />
            </Form.Item>
            <Form.Item name="debtNumber">
              <Input allowClear placeholder="债务编号" style={{ width: 200 }} />
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
        title="查看函件"
        open={preview.visible}
        destroyOnClose
        onCancel={() => setPreview((prev) => ({ ...prev, visible: false }))}
        footer={
          <Space>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={preview.downloading}
              disabled={!preview.fileUrl}
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
            <Descriptions.Item label="文书类型">
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
    </PageContainer>
  );
};

export default InstrumentListPage;
