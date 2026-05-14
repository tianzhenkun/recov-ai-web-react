import {
  CheckOutlined,
  ExclamationCircleOutlined,
  FieldTimeOutlined,
  ReloadOutlined,
  SearchOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Row,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TableActions from '@/components/TableActions';
import {
  addRepayment,
  confirmRepayment,
  getSmartReconciliationList,
  getSmartReconciliationStatistics,
  getSystemMode,
  handleDifference,
  type ReconciliationItem,
  type ReconciliationQuery,
  type ReconciliationStatistics,
} from '@/services/ruoyi/reconciliation';

const { Text, Paragraph } = Typography;

type QueryFormValues = {
  debtNumber?: string;
  city?: string;
  organization?: string;
};

type RepaymentFormValues = {
  amount?: number;
  remark?: string;
};

type DifferenceFormValues = {
  adjustedAmount?: number;
  reason?: string;
};

const DEFAULT_PAGE_SIZE = 10;

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
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

const getStatusColor = (status: unknown) => {
  const value = Number(status);
  if (value === 1 || value === 3) return 'green';
  if (value === 2) return 'orange';
  return 'blue';
};

const getStatusText = (status: unknown) => {
  const value = Number(status);
  const map: Record<number, string> = {
    0: '待回款',
    1: '已确认',
    2: '待核查',
    3: '已匹配',
  };
  return map[value] || '未知';
};

const getRowDifference = (record?: ReconciliationItem | null) =>
  toNumber(record?.systemAmount) - toNumber(record?.recordedAmount);

const hasRowDifference = (record: ReconciliationItem) =>
  getRowDifference(record) !== 0;

const getRowKey = (record: ReconciliationItem) =>
  String(record.id ?? record.debtId ?? record.debtNumber);

type StatCardProps = {
  title: string;
  value: StatDisplayValue;
  color: string;
  icon: React.ReactNode;
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
      primary: formatCompactAmount(value),
      tooltip: formatAmount(value),
    };
  }

  return {
    primary: numberFormatter.format(toNumber(value)),
    unit,
  };
};

const statCardStyles = {
  body: {
    padding: 16,
  },
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
            style={{ color, backgroundColor: `${color}14` }}
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

const ReconciliationPage = () => {
  const [queryForm] = Form.useForm<QueryFormValues>();
  const [repaymentForm] = Form.useForm<RepaymentFormValues>();
  const [differenceForm] = Form.useForm<DifferenceFormValues>();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [systemMode, setSystemMode] = useState(0);
  const [query, setQuery] = useState<ReconciliationQuery>({
    pageNum: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [tableData, setTableData] = useState<ReconciliationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState<ReconciliationStatistics>({});
  const [currentRow, setCurrentRow] = useState<ReconciliationItem | null>(null);
  const [repaymentOpen, setRepaymentOpen] = useState(false);
  const [differenceOpen, setDifferenceOpen] = useState(false);

  const fetchStatistics = useCallback(async () => {
    try {
      const res = await getSmartReconciliationStatistics();
      setStatistics(res.data || {});
    } catch {
      setStatistics({});
    }
  }, []);

  const fetchList = useCallback(async (params: ReconciliationQuery) => {
    setLoading(true);
    try {
      const res = await getSmartReconciliationList(params);
      setTableData(res.rows || []);
      setTotal(Number(res.total) || 0);
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadData = useCallback(
    async (mode = systemMode, params = query) => {
      if (mode === 1) {
        await Promise.all([fetchList(params), fetchStatistics()]);
      } else {
        await fetchList(params);
      }
    },
    [fetchList, fetchStatistics, query, systemMode],
  );

  useEffect(() => {
    const initPage = async () => {
      setLoading(true);
      try {
        const modeRes = await getSystemMode();
        const nextMode = Number(modeRes.data) || 0;
        setSystemMode(nextMode);
        await reloadData(nextMode, query);
      } catch {
        setSystemMode(0);
        await fetchList(query);
      } finally {
        setLoading(false);
      }
    };

    void initPage();
    // 首屏初始化只执行一次，后续查询由显式操作触发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statCards = useMemo(
    () => [
      {
        key: 'totalSystemAmount',
        title: 'RECOV回款统计',
        value: formatStatValue(statistics.totalSystemAmount, 'currency'),
        color: '#1677ff',
        icon: <WalletOutlined />,
      },
      {
        key: 'totalRecordedAmount',
        title: '客户回款统计',
        value: formatStatValue(statistics.totalRecordedAmount, 'currency'),
        color: '#13c2c2',
        icon: <WalletOutlined />,
      },
      {
        key: 'totalDifferenceAmount',
        title: '待处理差异金额',
        value: formatStatValue(statistics.totalDifferenceAmount, 'currency'),
        color: '#ff4d4f',
        icon: <ExclamationCircleOutlined />,
      },
      {
        key: 'pendingDifferenceCount',
        title: '待处理差异笔数',
        value: formatStatValue(
          statistics.pendingDifferenceCount,
          'count',
          '笔',
        ),
        color: '#fa8c16',
        icon: <FieldTimeOutlined />,
      },
    ],
    [statistics],
  );

  const applyQuery = (nextQuery: ReconciliationQuery) => {
    setQuery(nextQuery);
    void reloadData(systemMode, nextQuery);
  };

  const handleSearch = () => {
    const values = queryForm.getFieldsValue();
    applyQuery({
      ...query,
      pageNum: 1,
      debtNumber: values.debtNumber?.trim() || undefined,
      city: values.city?.trim() || undefined,
      organization: values.organization?.trim() || undefined,
    });
  };

  const handleReset = () => {
    queryForm.resetFields();
    applyQuery({
      pageNum: 1,
      pageSize: query.pageSize || DEFAULT_PAGE_SIZE,
    });
  };

  const openRepaymentDialog = (record: ReconciliationItem) => {
    setCurrentRow(record);
    repaymentForm.setFieldsValue({
      amount: toNumber(record.recordedAmount),
      remark: '',
    });
    setRepaymentOpen(true);
  };

  const submitRepayment = async () => {
    if (!currentRow?.id) return;

    let values: RepaymentFormValues;
    try {
      values = await repaymentForm.validateFields();
    } catch {
      return;
    }

    const amount = toNumber(values.amount);
    const minAmount = toNumber(currentRow.recordedAmount);
    if (amount <= 0 || amount < minAmount) {
      messageApi.warning(`请输入不低于当前已录入金额的有效回款金额`);
      return;
    }

    setSubmitLoading(true);
    try {
      await addRepayment({
        id: currentRow.id,
        amount,
        remark: values.remark?.trim() || undefined,
      });
      messageApi.success('回款录入成功');
      setRepaymentOpen(false);
      await reloadData();
    } finally {
      setSubmitLoading(false);
    }
  };

  const openDifferenceDialog = (record: ReconciliationItem) => {
    setCurrentRow(record);
    differenceForm.setFieldsValue({
      adjustedAmount: 0,
      reason: '',
    });
    setDifferenceOpen(true);
  };

  const submitDifference = async () => {
    if (!currentRow?.id) return;

    let values: DifferenceFormValues;
    try {
      values = await differenceForm.validateFields();
    } catch {
      return;
    }

    setSubmitLoading(true);
    try {
      await handleDifference({
        id: currentRow.id,
        reason: values.reason?.trim(),
        adjustedAmount: toNumber(values.adjustedAmount),
      });
      messageApi.success('差异处理成功');
      setDifferenceOpen(false);
      await reloadData();
    } finally {
      setSubmitLoading(false);
    }
  };

  const openConfirmDialog = (record: ReconciliationItem) => {
    if (!record.id) return;
    modalApi.confirm({
      title: '确认回款',
      icon: <ExclamationCircleOutlined />,
      content: '确认后将锁定该记录，不可再修改金额。是否确认？',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        await confirmRepayment({ id: record.id as number | string });
        messageApi.success('确认成功');
        await reloadData();
      },
    });
  };

  const canHandleDifference = (record: ReconciliationItem) =>
    systemMode === 1 && Number(record.status) === 2;

  const columns = useMemo<ColumnsType<ReconciliationItem>>(() => {
    const baseColumns: ColumnsType<ReconciliationItem> = [
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
        width: 160,
        ellipsis: true,
        render: toText,
      },
      {
        title: '业主',
        dataIndex: 'debtorName',
        width: 110,
        render: (value) => <Text strong>{toText(value)}</Text>,
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
        width: 150,
        align: 'right',
        render: (value) => <Text type="secondary">{formatAmount(value)}</Text>,
      },
    ];

    if (systemMode === 1) {
      baseColumns.push(
        {
          title: 'RECOV系统金额',
          dataIndex: 'systemAmount',
          width: 150,
          align: 'right',
          render: (value) => <Text strong>{formatAmount(value)}</Text>,
        },
        {
          title: '物业公司金额',
          dataIndex: 'recordedAmount',
          width: 150,
          align: 'right',
          render: (value) => (
            <Text style={{ color: '#059669' }} strong>
              {formatAmount(value)}
            </Text>
          ),
        },
        {
          title: '差异',
          dataIndex: 'difference',
          width: 130,
          align: 'right',
          render: (_, record) =>
            hasRowDifference(record) ? (
              <Text type="danger" strong>
                {formatAmount(Math.abs(getRowDifference(record)))}
              </Text>
            ) : (
              <Text type="secondary">-</Text>
            ),
        },
      );
    } else {
      baseColumns.push({
        title: '物业公司金额',
        dataIndex: 'recordedAmount',
        width: 150,
        align: 'right',
        render: (value) => (
          <Text style={{ color: '#059669' }} strong>
            {formatAmount(value)}
          </Text>
        ),
      });
    }

    baseColumns.push(
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        align: 'center',
        render: (value, record) => (
          <Tag color={getStatusColor(value)}>
            {record.statusDesc || getStatusText(value)}
          </Tag>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        fixed: 'right',
        align: 'center',
        render: (_, record) => {
          if (systemMode === 0 && Number(record.status) === 0) {
            return (
              <TableActions
                maxVisible={2}
                actions={[
                  {
                    key: 'repayment',
                    label: '回款',
                    icon: <WalletOutlined />,
                    onClick: () => openRepaymentDialog(record),
                  },
                  {
                    key: 'confirm',
                    label: '确认',
                    icon: <CheckOutlined />,
                    onClick: () => openConfirmDialog(record),
                  },
                ]}
              />
            );
          }

          if (canHandleDifference(record)) {
            return (
              <TableActions
                maxVisible={1}
                actions={[
                  {
                    key: 'difference',
                    label: '处理差异',
                    icon: <ExclamationCircleOutlined />,
                    onClick: () => openDifferenceDialog(record),
                  },
                ]}
              />
            );
          }

          return <Text type="secondary">-</Text>;
        },
      },
    );

    return baseColumns;
  }, [systemMode]);

  const differenceAmount = getRowDifference(currentRow);
  const minAdjustedAmount = differenceAmount;
  const adjustedAmount = Form.useWatch('adjustedAmount', differenceForm) || 0;
  const adjustedResult = toNumber(currentRow?.recordedAmount) + adjustedAmount;

  return (
    <PageContainer title="智能对账与结算">
      {messageContextHolder}
      {modalContextHolder}
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {systemMode === 1 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <StatCard
                key={card.key}
                title={card.title}
                value={card.value}
                color={card.color}
                icon={card.icon}
              />
            ))}
          </div>
        )}

        <ProCard title="对账差异明细">
          <Form
            form={queryForm}
            style={{ marginBottom: 16 }}
            onFinish={handleSearch}
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
                    placeholder="搜索资产编号"
                    style={{ width: 190 }}
                  />
                </Form.Item>
                <Form.Item name="city" noStyle>
                  <Input
                    allowClear
                    placeholder="所属城市"
                    style={{ width: 150 }}
                  />
                </Form.Item>
                <Form.Item name="organization" noStyle>
                  <Input
                    allowClear
                    placeholder="所属项目"
                    style={{ width: 170 }}
                  />
                </Form.Item>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  htmlType="submit"
                >
                  查询
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
              </Space>
              <Space wrap size={8}>
                <Button
                  icon={<ReloadOutlined />}
                  loading={loading}
                  onClick={() => {
                    void reloadData();
                  }}
                >
                  刷新
                </Button>
              </Space>
            </div>
          </Form>

          <Table<ReconciliationItem>
            bordered
            columns={columns}
            dataSource={tableData}
            loading={loading}
            rowKey={getRowKey}
            scroll={{ x: systemMode === 1 ? 1460 : 1180 }}
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

      <Modal
        title="录入回款金额"
        open={repaymentOpen}
        width={500}
        destroyOnHidden
        okText="确认提交"
        cancelText="取消"
        okButtonProps={{ loading: submitLoading }}
        onCancel={() => setRepaymentOpen(false)}
        onOk={() => {
          void submitRepayment();
        }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <ProCard>
            <Row gutter={[16, 12]}>
              <Col span={12}>
                <Text type="secondary">资产编号</Text>
                <div>
                  <Text strong>{toText(currentRow?.debtNumber)}</Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">业主姓名</Text>
                <div>
                  <Text strong>{toText(currentRow?.debtorName)}</Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">所属城市</Text>
                <div>{toText(currentRow?.city)}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">所属项目</Text>
                <div>{toText(currentRow?.organization)}</div>
              </Col>
              <Col span={24}>
                <Text type="secondary">当前已录入金额</Text>
                <div>
                  <Text strong style={{ color: '#059669', fontSize: 18 }}>
                    {formatAmount(currentRow?.recordedAmount)}
                  </Text>
                </div>
              </Col>
            </Row>
          </ProCard>

          <Form form={repaymentForm} layout="vertical">
            <Form.Item
              name="amount"
              label="录入金额"
              rules={[{ required: true, message: '请输入回款金额' }]}
            >
              <InputNumber
                min={toNumber(currentRow?.recordedAmount)}
                precision={2}
                style={{ width: '100%' }}
                placeholder="请输入回款金额"
              />
            </Form.Item>
            <Text type="secondary">
              最低输入金额：{formatAmount(currentRow?.recordedAmount)}
            </Text>
            <Form.Item name="remark" label="备注" style={{ marginTop: 16 }}>
              <Input.TextArea rows={2} placeholder="请输入备注（可选）..." />
            </Form.Item>
          </Form>

          <Paragraph type="warning">
            提示：请输入累计回款金额，不能低于当前已录入金额。
          </Paragraph>
        </Space>
      </Modal>

      <Modal
        title="差异处理复核"
        open={differenceOpen}
        width={560}
        destroyOnHidden
        okText="确认处理"
        cancelText="取消"
        okButtonProps={{ loading: submitLoading }}
        onCancel={() => setDifferenceOpen(false)}
        onOk={() => {
          void submitDifference();
        }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <ProCard>
            <Row gutter={[16, 12]}>
              <Col span={12}>
                <Text type="secondary">资产编号</Text>
                <div>
                  <Text strong>{toText(currentRow?.debtNumber)}</Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">业主姓名</Text>
                <div>
                  <Text strong>{toText(currentRow?.debtorName)}</Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">RECOV系统金额</Text>
                <div>
                  <Text strong>{formatAmount(currentRow?.systemAmount)}</Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">物业公司金额</Text>
                <div>
                  <Text strong style={{ color: '#059669' }}>
                    {formatAmount(currentRow?.recordedAmount)}
                  </Text>
                </div>
              </Col>
              <Col span={24}>
                <Text type="secondary">差异金额</Text>
                <div>
                  <Text type="danger" strong style={{ fontSize: 18 }}>
                    {formatAmount(Math.abs(differenceAmount))}
                  </Text>
                </div>
              </Col>
            </Row>
          </ProCard>

          <Form form={differenceForm} layout="vertical">
            <Form.Item name="adjustedAmount" label="调整金额">
              <InputNumber
                min={minAdjustedAmount}
                step={100}
                precision={2}
                style={{ width: '100%' }}
                placeholder="请输入调整金额"
              />
            </Form.Item>
            <Text type="secondary">
              调整后金额：{formatAmount(adjustedResult)}
            </Text>
            <Form.Item
              name="reason"
              label="处理备注"
              style={{ marginTop: 16 }}
              rules={[
                { required: true, message: '请输入差异处理原因' },
                {
                  validator: (_, value) =>
                    value?.trim()
                      ? Promise.resolve()
                      : Promise.reject(new Error('请输入差异处理原因')),
                },
              ]}
            >
              <Input.TextArea
                rows={3}
                placeholder="请输入差异处理原因及核查结论..."
              />
            </Form.Item>
          </Form>

          <Paragraph type="secondary">
            确认处理后，系统将自动同步差异状态并更新对账日志。请确保已完成线下核实。
          </Paragraph>
        </Space>
      </Modal>
    </PageContainer>
  );
};

export default ReconciliationPage;
