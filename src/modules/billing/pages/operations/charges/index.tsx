import {
  EyeOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  App,
  Button,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TableActions from '@/components/TableActions';
import {
  adjustAdminCreditCharge,
  type CreditChargeOrder,
  type CreditChargeOrderStatus,
  type CreditLedger,
  type CreditLedgerType,
  pageCreditLedgers,
  pageCreditOrders,
} from '@/modules/billing/services/credit-billing';
import {
  billingPermissions,
  directionText,
  formatDate,
  formatPoints,
  getErrorMessage,
  ledgerTone,
  ledgerTypeText,
  orderStatusText,
  orderStatusTone,
  prettyJson,
  renderCodeId,
  renderDictTag,
  toNumber,
} from '../../../components/shared';
import OperationsGuard from '../components/OperationsGuard';

type OrderFilterValues = {
  accountId?: string;
  productCode?: string;
  sourceId?: string;
  status?: CreditChargeOrderStatus;
};

type LedgerFilterValues = {
  accountId?: string;
  ledgerType?: CreditLedgerType;
  sourceId?: string;
};

type AdjustmentFormValues = {
  adjustmentType: 'REFUND' | 'REVERSAL' | 'ADJUSTMENT';
  points: number;
  reason: string;
};

const ledgerTypeOptions = [
  'GRANT',
  'CHARGE',
  'REFUND',
  'REVERSAL',
  'ADJUSTMENT',
  'ARREARS_SETTLEMENT',
  'EXPIRE',
  'CASH_REFUND_LOCK',
  'CASH_REFUND_RESTORE',
  'CASH_REFUND_VOID',
].map((value) => ({ value, label: ledgerTypeText[value] || value }));

const chargeOrderStatusOptions = [
  'PROCESSING',
  'SETTLED',
  'PARTIAL_OUTSTANDING',
  'OUTSTANDING',
  'PARTIAL_REFUNDED',
  'REFUNDED',
  'FAILED',
].map((value) => ({ value, label: orderStatusText[value] || value }));

const createAdjustmentKey = (order: CreditChargeOrder) =>
  `charge-adjust:${order.id}:${Date.now()}`;

const CreditChargeOperationsPage = () => {
  const { message } = App.useApp();
  const [orderFilterForm] = Form.useForm<OrderFilterValues>();
  const [ledgerFilterForm] = Form.useForm<LedgerFilterValues>();
  const [adjustmentForm] = Form.useForm<AdjustmentFormValues>();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState<CreditChargeOrder[]>([]);
  const [ledgers, setLedgers] = useState<CreditLedger[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CreditChargeOrder>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderPage, setOrderPage] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [ledgerPage, setLedgerPage] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const loadOrders = useCallback(
    async (pageNum = 1, pageSize = 10) => {
      const values = orderFilterForm.getFieldsValue();
      const result = await pageCreditOrders({
        accountId: values.accountId?.trim() || undefined,
        productCode: values.productCode?.trim() || undefined,
        sourceId: values.sourceId?.trim() || undefined,
        status: values.status || undefined,
        pageNum,
        pageSize,
      });
      setOrders(result.rows);
      setOrderPage({ current: pageNum, pageSize, total: result.total });
    },
    [orderFilterForm],
  );

  const loadLedgers = useCallback(
    async (pageNum = 1, pageSize = 10) => {
      const values = ledgerFilterForm.getFieldsValue();
      const result = await pageCreditLedgers({
        accountId: values.accountId?.trim() || undefined,
        ledgerType: values.ledgerType || undefined,
        sourceId: values.sourceId?.trim() || undefined,
        pageNum,
        pageSize,
      });
      setLedgers(result.rows);
      setLedgerPage({ current: pageNum, pageSize, total: result.total });
    },
    [ledgerFilterForm],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadOrders(1, 10), loadLedgers(1, 10)]);
    } catch (error) {
      message.error(getErrorMessage(error, '加载扣费运营数据失败'));
    } finally {
      setLoading(false);
    }
  }, [loadLedgers, loadOrders, message]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(
    () =>
      orders.reduce(
        (result, order) => ({
          billed: result.billed + toNumber(order.billedPoints),
          settled: result.settled + toNumber(order.settledPoints),
          outstanding: result.outstanding + toNumber(order.outstandingPoints),
          refunded: result.refunded + toNumber(order.refundedPoints),
        }),
        { billed: 0, settled: 0, outstanding: 0, refunded: 0 },
      ),
    [orders],
  );

  const openAdjustment = (record: CreditChargeOrder) => {
    setSelectedOrder(record);
    adjustmentForm.setFieldsValue({
      adjustmentType: 'REFUND',
      points: Math.max(
        toNumber(record.settledPoints) - toNumber(record.refundedPoints),
        0,
      ),
      reason: '平台业务调整',
    });
    setAdjustmentOpen(true);
  };

  const submitAdjustment = async () => {
    if (!selectedOrder?.id) return;
    const values = await adjustmentForm.validateFields();
    setSubmitting(true);
    try {
      await adjustAdminCreditCharge({
        chargeOrderId: selectedOrder.id,
        adjustmentType: values.adjustmentType,
        points: values.points,
        idempotencyKey: createAdjustmentKey(selectedOrder),
        reason: values.reason.trim(),
      });
      message.success('扣费调整已完成');
      setAdjustmentOpen(false);
      await refresh();
    } catch (error) {
      message.error(getErrorMessage(error, '扣费调整失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const showOrderLedgers = (record: CreditChargeOrder) => {
    ledgerFilterForm.setFieldsValue({
      ledgerType: undefined,
      sourceId: record.usageEventId,
    });
    setActiveTab('ledgers');
    void loadLedgers(1, ledgerPage.pageSize);
  };

  const orderColumns: ColumnsType<CreditChargeOrder> = [
    { title: '扣费单', dataIndex: 'id', width: 150, render: renderCodeId },
    { title: '账户', dataIndex: 'accountId', width: 150, render: renderCodeId },
    { title: '产品', dataIndex: 'productCode', width: 140 },
    { title: '场景', dataIndex: 'scenarioCode', width: 170 },
    {
      title: '应计点数',
      key: 'billedPoints',
      align: 'right',
      width: 120,
      render: (_, record) => formatPoints(record.billedPoints),
    },
    {
      title: '已结点数',
      dataIndex: 'settledPoints',
      align: 'right',
      width: 120,
      render: formatPoints,
    },
    {
      title: '欠费点数',
      dataIndex: 'outstandingPoints',
      align: 'right',
      width: 120,
      render: formatPoints,
    },
    {
      title: '已退点数',
      dataIndex: 'refundedPoints',
      align: 'right',
      width: 120,
      render: formatPoints,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 140,
      render: (value) =>
        renderDictTag(value, orderStatusText, orderStatusTone[String(value)]),
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      width: 180,
      render: formatDate,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 145,
      render: (_, record) => (
        <TableActions
          maxVisible={2}
          actions={[
            {
              key: 'detail',
              label: '详情',
              icon: <EyeOutlined />,
              permissions: billingPermissions.adminChargeList,
              onClick: () => {
                setSelectedOrder(record);
                setDetailOpen(true);
              },
            },
            {
              key: 'ledgers',
              label: '关联流水',
              icon: <FileSearchOutlined />,
              permissions: billingPermissions.adminChargeList,
              onClick: () => showOrderLedgers(record),
            },
            {
              key: 'adjust',
              label: '业务调整',
              icon: <UndoOutlined />,
              permissions: billingPermissions.adminChargeAdjust,
              disabled:
                toNumber(record.settledPoints) <=
                toNumber(record.refundedPoints),
              onClick: () => openAdjustment(record),
            },
          ]}
        />
      ),
    },
  ];

  const ledgerColumns: ColumnsType<CreditLedger> = [
    { title: '流水ID', dataIndex: 'id', width: 150, render: renderCodeId },
    { title: '账户', dataIndex: 'accountId', width: 150, render: renderCodeId },
    {
      title: '类型',
      dataIndex: 'ledgerType',
      width: 140,
      render: (value) =>
        renderDictTag(value, ledgerTypeText, ledgerTone[String(value)]),
    },
    {
      title: '方向',
      dataIndex: 'direction',
      width: 100,
      render: (value) => renderDictTag(value, directionText),
    },
    {
      title: '点数',
      dataIndex: 'points',
      align: 'right',
      width: 120,
      render: formatPoints,
    },
    {
      title: '可用余额',
      dataIndex: 'balanceAfter',
      align: 'right',
      width: 120,
      render: formatPoints,
    },
    {
      title: '欠费变动',
      dataIndex: 'outstandingDelta',
      align: 'right',
      width: 120,
      render: formatPoints,
    },
    {
      title: '欠费余额',
      dataIndex: 'outstandingAfter',
      align: 'right',
      width: 120,
      render: formatPoints,
    },
    { title: '来源', dataIndex: 'sourceType', width: 150 },
    { title: '来源ID', dataIndex: 'sourceId', width: 180, ellipsis: true },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '时间',
      dataIndex: 'createTime',
      width: 180,
      render: formatDate,
    },
  ];

  return (
    <PageContainer
      breadcrumbRender={false}
      title="扣费与偿债"
      extra={
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => void refresh()}
        >
          刷新
        </Button>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <ProCard>
            <Statistic title="当前页应计点数" value={summary.billed} />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <ProCard>
            <Statistic title="当前页已结点数" value={summary.settled} />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <ProCard>
            <Statistic title="当前页欠费点数" value={summary.outstanding} />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <ProCard>
            <Statistic title="当前页已退点数" value={summary.refunded} />
          </ProCard>
        </Col>
      </Row>

      <ProCard style={{ marginTop: 16 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'orders',
              label: '扣费单',
              children: (
                <Space
                  orientation="vertical"
                  size={16}
                  style={{ width: '100%' }}
                >
                  <Form form={orderFilterForm} layout="inline">
                    <Form.Item name="accountId" label="账户ID">
                      <Input allowClear />
                    </Form.Item>
                    <Form.Item name="productCode" label="产品">
                      <Input allowClear />
                    </Form.Item>
                    <Form.Item name="sourceId" label="业务来源">
                      <Input allowClear />
                    </Form.Item>
                    <Form.Item name="status" label="状态">
                      <Select
                        allowClear
                        style={{ width: 150 }}
                        options={chargeOrderStatusOptions}
                      />
                    </Form.Item>
                    <Button
                      type="primary"
                      onClick={() => void loadOrders(1, orderPage.pageSize)}
                    >
                      查询
                    </Button>
                    <Button
                      onClick={() => {
                        orderFilterForm.resetFields();
                        void loadOrders(1, orderPage.pageSize);
                      }}
                    >
                      重置
                    </Button>
                  </Form>
                  <Table
                    rowKey={(record) => String(record.id)}
                    columns={orderColumns}
                    dataSource={orders}
                    pagination={{
                      current: orderPage.current,
                      pageSize: orderPage.pageSize,
                      total: orderPage.total,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条`,
                      onChange: (pageNum, pageSize) =>
                        void loadOrders(pageNum, pageSize),
                    }}
                    scroll={{ x: 1550 }}
                  />
                </Space>
              ),
            },
            {
              key: 'ledgers',
              label: '信用点流水',
              children: (
                <Space
                  orientation="vertical"
                  size={16}
                  style={{ width: '100%' }}
                >
                  <Form form={ledgerFilterForm} layout="inline">
                    <Form.Item name="accountId" label="账户ID">
                      <Input allowClear />
                    </Form.Item>
                    <Form.Item name="ledgerType" label="流水类型">
                      <Select
                        allowClear
                        style={{ width: 150 }}
                        options={ledgerTypeOptions}
                      />
                    </Form.Item>
                    <Form.Item name="sourceId" label="来源ID">
                      <Input allowClear />
                    </Form.Item>
                    <Button
                      type="primary"
                      onClick={() => void loadLedgers(1, ledgerPage.pageSize)}
                    >
                      查询
                    </Button>
                    <Button
                      onClick={() => {
                        ledgerFilterForm.resetFields();
                        void loadLedgers(1, ledgerPage.pageSize);
                      }}
                    >
                      重置
                    </Button>
                  </Form>
                  <Table
                    rowKey={(record) => String(record.id)}
                    columns={ledgerColumns}
                    dataSource={ledgers}
                    pagination={{
                      current: ledgerPage.current,
                      pageSize: ledgerPage.pageSize,
                      total: ledgerPage.total,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条`,
                      onChange: (pageNum, pageSize) =>
                        void loadLedgers(pageNum, pageSize),
                    }}
                    scroll={{ x: 1400 }}
                  />
                </Space>
              ),
            },
          ]}
        />
      </ProCard>

      <Modal
        footer={null}
        open={detailOpen}
        title="扣费单详情"
        width={720}
        onCancel={() => setDetailOpen(false)}
      >
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="扣费单">
            {renderCodeId(selectedOrder?.id)}
          </Descriptions.Item>
          <Descriptions.Item label="账户">
            {renderCodeId(selectedOrder?.accountId)}
          </Descriptions.Item>
          <Descriptions.Item label="应计点数">
            {formatPoints(selectedOrder?.billedPoints)}
          </Descriptions.Item>
          <Descriptions.Item label="已结点数">
            {formatPoints(selectedOrder?.settledPoints)}
          </Descriptions.Item>
          <Descriptions.Item label="欠费点数">
            {formatPoints(selectedOrder?.outstandingPoints)}
          </Descriptions.Item>
          <Descriptions.Item label="已退点数">
            {formatPoints(selectedOrder?.refundedPoints)}
          </Descriptions.Item>
          <Descriptions.Item label="计价快照" span={2}>
            <pre
              style={{
                maxHeight: 220,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {prettyJson(selectedOrder?.pricingSnapshot)}
            </pre>
          </Descriptions.Item>
        </Descriptions>
      </Modal>

      <Modal
        forceRender
        open={adjustmentOpen}
        title="扣费业务调整"
        okText="确认调整"
        confirmLoading={submitting}
        onCancel={() => setAdjustmentOpen(false)}
        onOk={() => void submitAdjustment()}
      >
        <Form form={adjustmentForm} layout="vertical">
          <Form.Item
            label="调整类型"
            name="adjustmentType"
            rules={[{ required: true, message: '请选择调整类型' }]}
          >
            <Select
              options={[
                { label: '退点', value: 'REFUND' },
                { label: '整单冲正', value: 'REVERSAL' },
                { label: '运营调整', value: 'ADJUSTMENT' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="调整点数"
            name="points"
            rules={[{ required: true, message: '请输入调整点数' }]}
          >
            <InputNumber
              max={Math.max(
                toNumber(selectedOrder?.settledPoints) -
                  toNumber(selectedOrder?.refundedPoints),
                0,
              )}
              min={0.0001}
              precision={4}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            label="调整原因"
            name="reason"
            rules={[{ required: true, message: '请输入调整原因' }]}
          >
            <Input.TextArea maxLength={200} rows={3} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

const GuardedCreditChargeOperationsPage = () => (
  <OperationsGuard permissions={billingPermissions.adminChargeList}>
    <CreditChargeOperationsPage />
  </OperationsGuard>
);

export default GuardedCreditChargeOperationsPage;
