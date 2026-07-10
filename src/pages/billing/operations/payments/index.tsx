import {
  CloseCircleOutlined,
  EyeOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  SearchOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  App,
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  QRCode,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { PermissionButton, usePermission } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import {
  closeAdminPaymentOrder,
  createAdminPaymentRefund,
  type PaymentMockScenario,
  type PaymentOrder,
  type PaymentOrderStatus,
  type PaymentRefundOrder,
  type PaymentRefundStatus,
  pageAdminPaymentOrders,
  pageAdminPaymentRefunds,
  queryAdminPaymentOrder,
  queryAdminPaymentRefund,
} from '@/services/ruoyi/payment';
import {
  PACKAGE_ORDER_POLL_INTERVAL_MS,
  shouldPollPaymentOrder,
  shouldPollPaymentRefund,
} from '../../polling';
import {
  billingPermissions,
  formatDate,
  formatFenAmount,
  getErrorMessage,
  renderCodeId,
} from '../../shared';
import OperationsGuard from '../components/OperationsGuard';

const { Text } = Typography;

type OrderFilter = {
  payOrderNo?: string;
  channelCode?: 'mock' | 'wechat';
  status?: PaymentOrderStatus;
};

type RefundFilter = {
  refundOrderNo?: string;
  paymentOrderId?: string;
  status?: PaymentRefundStatus;
};

type RefundFormValues = {
  reason: string;
  mockScenario?: PaymentMockScenario;
};

const paymentStatusText: Record<string, string> = {
  PENDING: '待支付',
  SUCCESS: '支付成功',
  CLOSED: '已关闭',
  FAILED: '支付失败',
  EXPIRED: '已过期',
  REFUNDED: '已退款',
};

const paymentStatusTone: Record<string, string> = {
  PENDING: 'gold',
  SUCCESS: 'green',
  CLOSED: 'default',
  FAILED: 'red',
  EXPIRED: 'default',
  REFUNDED: 'purple',
};

const refundStatusText: Record<string, string> = {
  CREATED: '已创建',
  PROCESSING: '处理中',
  SUCCESS: '退款成功',
  CLOSED: '已关闭',
  ABNORMAL: '需人工处理',
};

const refundStatusTone: Record<string, string> = {
  CREATED: 'gold',
  PROCESSING: 'processing',
  SUCCESS: 'green',
  CLOSED: 'default',
  ABNORMAL: 'red',
};

const refundFilterOptions = [
  'CREATED',
  'PROCESSING',
  'SUCCESS',
  'CLOSED',
  'ABNORMAL',
].map((value) => ({ value, label: refundStatusText[value] }));

const StatusTag = ({
  value,
  text,
  tone,
}: {
  value?: string;
  text: Record<string, string>;
  tone: Record<string, string>;
}) => {
  const status = String(value || '');
  return <Tag color={tone[status]}>{text[status] || status || '-'}</Tag>;
};

const createRefundIdempotencyKey = (order: PaymentOrder) =>
  `payment-refund:${order.id}:${Date.now()}`;

const PaymentOperationsPage = () => {
  const { message, modal } = App.useApp();
  const { canAccess } = usePermission();
  const [orderFilterForm] = Form.useForm<OrderFilter>();
  const [refundFilterForm] = Form.useForm<RefundFilter>();
  const [refundForm] = Form.useForm<RefundFormValues>();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [refunds, setRefunds] = useState<PaymentRefundOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrder>();
  const [selectedRefund, setSelectedRefund] = useState<PaymentRefundOrder>();
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [refundDetailOpen, setRefundDetailOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderPage, setOrderPage] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [refundPage, setRefundPage] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const canViewOrders = canAccess({
    permissions: billingPermissions.paymentOrderList,
  });
  const canViewRefunds = canAccess({
    permissions: billingPermissions.paymentRefundList,
  });

  const loadOrders = useCallback(
    async (pageNum: number, pageSize: number) => {
      if (!canViewOrders) {
        setOrders([]);
        setOrderPage((current) => ({ ...current, total: 0 }));
        return;
      }
      const values = orderFilterForm.getFieldsValue();
      const result = await pageAdminPaymentOrders({
        payOrderNo: values.payOrderNo?.trim() || undefined,
        channelCode: values.channelCode || undefined,
        status: values.status || undefined,
        pageNum,
        pageSize,
      });
      setOrders(result.rows);
      setOrderPage({ current: pageNum, pageSize, total: result.total });
    },
    [canViewOrders, orderFilterForm],
  );

  const loadRefunds = useCallback(
    async (pageNum: number, pageSize: number) => {
      if (!canViewRefunds) {
        setRefunds([]);
        setRefundPage((current) => ({ ...current, total: 0 }));
        return;
      }
      const values = refundFilterForm.getFieldsValue();
      const result = await pageAdminPaymentRefunds({
        refundOrderNo: values.refundOrderNo?.trim() || undefined,
        paymentOrderId: values.paymentOrderId?.trim() || undefined,
        status: values.status || undefined,
        pageNum,
        pageSize,
      });
      setRefunds(result.rows);
      setRefundPage({ current: pageNum, pageSize, total: result.total });
    },
    [canViewRefunds, refundFilterForm],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOrders(1, orderPage.pageSize),
        loadRefunds(1, refundPage.pageSize),
      ]);
    } catch (error) {
      message.error(getErrorMessage(error, '加载支付运营数据失败'));
    } finally {
      setLoading(false);
    }
  }, [
    loadOrders,
    loadRefunds,
    message,
    orderPage.pageSize,
    refundPage.pageSize,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (activeTab === 'orders' && !canViewOrders && canViewRefunds) {
      setActiveTab('refunds');
    } else if (activeTab === 'refunds' && !canViewRefunds && canViewOrders) {
      setActiveTab('orders');
    }
  }, [activeTab, canViewOrders, canViewRefunds]);

  const queryOrder = useCallback(
    async (record: PaymentOrder, showMessage = true) => {
      if (!record.id) return;
      try {
        const next = await queryAdminPaymentOrder(record.id);
        setOrders((current) =>
          current.map((item) => (item.id === next.id ? next : item)),
        );
        setSelectedOrder((current) =>
          current?.id === next.id ? next : current,
        );
        if (showMessage) message.success('支付渠道状态已同步');
      } catch (error) {
        message.error(getErrorMessage(error, '支付查单失败'));
      }
    },
    [message],
  );

  const closeOrder = (record: PaymentOrder) => {
    modal.confirm({
      title: '关闭支付单',
      content: `关闭支付单“${record.payOrderNo || record.id}”后不可继续支付。`,
      okText: '确认关闭',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!record.id) return;
        await closeAdminPaymentOrder(record.id);
        message.success('支付单已关闭');
        await loadOrders(orderPage.current, orderPage.pageSize);
      },
    });
  };

  const openRefund = (record: PaymentOrder) => {
    setSelectedOrder(record);
    refundForm.setFieldsValue({
      reason: '客户申请全额退款',
      mockScenario:
        record.channelCode === 'mock' ? 'REFUND_SUCCESS' : undefined,
    });
    setRefundOpen(true);
  };

  const submitRefund = async () => {
    if (!selectedOrder?.id) return;
    const values = await refundForm.validateFields();
    setSubmitting(true);
    try {
      const refund = await createAdminPaymentRefund({
        paymentOrderId: selectedOrder.id,
        idempotencyKey: createRefundIdempotencyKey(selectedOrder),
        reason: values.reason,
        mockScenario:
          selectedOrder.channelCode === 'mock'
            ? values.mockScenario
            : undefined,
      });
      setRefundOpen(false);
      setSelectedRefund(refund);
      setRefundDetailOpen(true);
      await Promise.all([
        loadOrders(orderPage.current, orderPage.pageSize),
        loadRefunds(refundPage.current, refundPage.pageSize),
      ]);
      message.success('退款申请已受理');
    } catch (error) {
      message.error(getErrorMessage(error, '创建退款失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const queryRefund = useCallback(
    async (record: PaymentRefundOrder, showMessage = true) => {
      if (!record.id) return;
      try {
        const next = await queryAdminPaymentRefund(record.id);
        setRefunds((current) =>
          current.map((item) => (item.id === next.id ? next : item)),
        );
        setSelectedRefund((current) =>
          current?.id === next.id ? next : current,
        );
        if (showMessage) message.success('退款渠道状态已同步');
      } catch (error) {
        message.error(getErrorMessage(error, '退款查单失败'));
      }
    },
    [message],
  );

  useEffect(() => {
    if (!orderDetailOpen || !shouldPollPaymentOrder(selectedOrder)) {
      return undefined;
    }
    const timer = window.setInterval(
      () => selectedOrder && void queryOrder(selectedOrder, false),
      PACKAGE_ORDER_POLL_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [orderDetailOpen, queryOrder, selectedOrder]);

  useEffect(() => {
    if (!refundDetailOpen || !shouldPollPaymentRefund(selectedRefund)) {
      return undefined;
    }
    const timer = window.setInterval(
      () => selectedRefund && void queryRefund(selectedRefund, false),
      PACKAGE_ORDER_POLL_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [queryRefund, refundDetailOpen, selectedRefund]);

  const orderColumns: ColumnsType<PaymentOrder> = [
    { title: '支付单号', dataIndex: 'payOrderNo', width: 220, ellipsis: true },
    { title: '业务订单', dataIndex: 'bizOrderNo', width: 200, ellipsis: true },
    { title: '商品', dataIndex: 'subject', width: 200, ellipsis: true },
    {
      title: '应付金额',
      dataIndex: 'amountFen',
      align: 'right',
      width: 120,
      render: formatFenAmount,
    },
    {
      title: '实付金额',
      dataIndex: 'paidAmountFen',
      align: 'right',
      width: 120,
      render: formatFenAmount,
    },
    {
      title: '已退金额',
      dataIndex: 'refundedAmountFen',
      align: 'right',
      width: 120,
      render: formatFenAmount,
    },
    { title: '渠道', dataIndex: 'channelCode', width: 110 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value) => (
        <StatusTag
          value={value}
          text={paymentStatusText}
          tone={paymentStatusTone}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      render: formatDate,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 160,
      render: (_, record) => (
        <TableActions
          maxVisible={2}
          actions={[
            {
              key: 'detail',
              label: '详情',
              icon: <EyeOutlined />,
              permissions: billingPermissions.paymentOrderList,
              onClick: () => {
                setSelectedOrder(record);
                setOrderDetailOpen(true);
              },
            },
            {
              key: 'query',
              label: '渠道查单',
              icon: <SearchOutlined />,
              permissions: billingPermissions.paymentOrderQuery,
              onClick: () => void queryOrder(record),
            },
            {
              key: 'refund',
              label: '申请全额退款',
              icon: <UndoOutlined />,
              permissions: billingPermissions.paymentRefundCreate,
              disabled:
                String(record.status) !== 'SUCCESS' ||
                Boolean(record.refundStatus) ||
                Number(record.refundedAmountFen || 0) > 0,
              onClick: () => openRefund(record),
            },
            {
              key: 'close',
              label: '关闭支付单',
              icon: <CloseCircleOutlined />,
              danger: true,
              permissions: billingPermissions.paymentOrderClose,
              disabled: String(record.status) !== 'PENDING',
              onClick: () => closeOrder(record),
            },
          ]}
        />
      ),
    },
  ];

  const refundColumns: ColumnsType<PaymentRefundOrder> = [
    {
      title: '退款单号',
      dataIndex: 'refundOrderNo',
      width: 220,
      ellipsis: true,
    },
    { title: '支付单号', dataIndex: 'payOrderNo', width: 220, ellipsis: true },
    {
      title: '退款金额',
      dataIndex: 'refundAmountFen',
      align: 'right',
      width: 130,
      render: formatFenAmount,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 130,
      render: (value) => (
        <StatusTag
          value={value}
          text={refundStatusText}
          tone={refundStatusTone}
        />
      ),
    },
    {
      title: '业务退款ID',
      dataIndex: 'bizRefundId',
      width: 170,
      ellipsis: true,
    },
    {
      title: '发起人',
      key: 'creator',
      width: 130,
      render: (_, record) => record.createByName || record.createBy || '-',
    },
    { title: '原因', dataIndex: 'reason', ellipsis: true },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      render: formatDate,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'detail',
              label: '详情',
              icon: <EyeOutlined />,
              permissions: billingPermissions.paymentRefundList,
              onClick: () => {
                setSelectedRefund(record);
                setRefundDetailOpen(true);
              },
            },
            {
              key: 'query',
              label: '渠道查单',
              icon: <SearchOutlined />,
              permissions: billingPermissions.paymentRefundQuery,
              onClick: () => void queryRefund(record),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer
      breadcrumbRender={false}
      title="支付与退款"
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
      <ProCard>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'orders',
              label: '支付订单',
              children: (
                <Space
                  orientation="vertical"
                  size={16}
                  style={{ width: '100%' }}
                >
                  <Form form={orderFilterForm} layout="inline">
                    <Row justify="space-between" style={{ width: '100%' }}>
                      <Space wrap>
                        <Form.Item name="payOrderNo" label="支付单号">
                          <Input allowClear placeholder="输入支付单号" />
                        </Form.Item>
                        <Form.Item name="channelCode" label="渠道">
                          <Select
                            allowClear
                            style={{ width: 130 }}
                            options={[
                              { label: '微信支付', value: 'wechat' },
                              { label: 'Mock', value: 'mock' },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item name="status" label="状态">
                          <Select
                            allowClear
                            style={{ width: 140 }}
                            options={Object.entries(paymentStatusText).map(
                              ([value, label]) => ({ value, label }),
                            )}
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
                      </Space>
                    </Row>
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
                    scroll={{ x: 1500 }}
                  />
                </Space>
              ),
            },
            {
              key: 'refunds',
              label: '退款记录',
              children: (
                <Space
                  orientation="vertical"
                  size={16}
                  style={{ width: '100%' }}
                >
                  <Form form={refundFilterForm} layout="inline">
                    <Form.Item name="refundOrderNo" label="退款单号">
                      <Input allowClear />
                    </Form.Item>
                    <Form.Item name="paymentOrderId" label="支付单ID">
                      <Input allowClear />
                    </Form.Item>
                    <Form.Item name="status" label="状态">
                      <Select
                        allowClear
                        style={{ width: 150 }}
                        options={refundFilterOptions}
                      />
                    </Form.Item>
                    <Button
                      type="primary"
                      onClick={() => void loadRefunds(1, refundPage.pageSize)}
                    >
                      查询
                    </Button>
                  </Form>
                  <Table
                    rowKey={(record) => String(record.id)}
                    columns={refundColumns}
                    dataSource={refunds}
                    pagination={{
                      current: refundPage.current,
                      pageSize: refundPage.pageSize,
                      total: refundPage.total,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条`,
                      onChange: (pageNum, pageSize) =>
                        void loadRefunds(pageNum, pageSize),
                    }}
                    scroll={{ x: 1250 }}
                  />
                </Space>
              ),
            },
          ].filter(
            (item) =>
              (item.key === 'orders' && canViewOrders) ||
              (item.key === 'refunds' && canViewRefunds),
          )}
        />
      </ProCard>

      <Modal
        footer={null}
        open={orderDetailOpen}
        title="支付单详情"
        width={720}
        onCancel={() => setOrderDetailOpen(false)}
      >
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="支付单号" span={2}>
            {selectedOrder?.payOrderNo || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="订单ID">
            {renderCodeId(selectedOrder?.id)}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <StatusTag
              value={selectedOrder?.status}
              text={paymentStatusText}
              tone={paymentStatusTone}
            />
          </Descriptions.Item>
          <Descriptions.Item label="应付">
            {formatFenAmount(selectedOrder?.amountFen)}
          </Descriptions.Item>
          <Descriptions.Item label="实付">
            {formatFenAmount(selectedOrder?.paidAmountFen)}
          </Descriptions.Item>
          <Descriptions.Item label="渠道流水" span={2}>
            {selectedOrder?.channelTradeNo || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="渠道状态">
            {selectedOrder?.channelStatus || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="渠道交易状态">
            {selectedOrder?.channelTradeState || '-'}
          </Descriptions.Item>
        </Descriptions>
        {selectedOrder?.codeUrl && (
          <Space
            align="center"
            orientation="vertical"
            style={{ marginTop: 20, width: '100%' }}
          >
            <QRCode value={selectedOrder.codeUrl} />
            <Text>
              <QrcodeOutlined />{' '}
              {selectedOrder.codeUrl.startsWith('mock')
                ? 'Mock 支付二维码'
                : '支付二维码'}
            </Text>
          </Space>
        )}
        {shouldPollPaymentOrder(selectedOrder) && (
          <Tag color="processing" style={{ marginTop: 16 }}>
            每 3 秒自动查询支付终态
          </Tag>
        )}
      </Modal>

      <Modal
        forceRender
        open={refundOpen}
        title="申请全额退款"
        okText="提交退款"
        confirmLoading={submitting}
        onCancel={() => setRefundOpen(false)}
        onOk={() => void submitRefund()}
      >
        <Descriptions
          bordered
          column={1}
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Descriptions.Item label="支付单号">
            {selectedOrder?.payOrderNo}
          </Descriptions.Item>
          <Descriptions.Item label="实退金额">
            {formatFenAmount(selectedOrder?.paidAmountFen)}
          </Descriptions.Item>
        </Descriptions>
        <Form form={refundForm} layout="vertical">
          <Form.Item
            label="退款原因"
            name="reason"
            rules={[{ required: true, message: '请输入退款原因' }]}
          >
            <Input.TextArea maxLength={200} rows={3} showCount />
          </Form.Item>
          {selectedOrder?.channelCode === 'mock' && (
            <Form.Item label="Mock 退款结果" name="mockScenario">
              <Select
                options={[
                  { label: '直接成功', value: 'REFUND_SUCCESS' },
                  { label: '处理中', value: 'REFUND_PROCESSING' },
                  { label: '关闭', value: 'REFUND_CLOSED' },
                  { label: '异常待处理', value: 'REFUND_ABNORMAL' },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        footer={
          <PermissionButton
            permissions={billingPermissions.paymentRefundQuery}
            icon={<SearchOutlined />}
            onClick={() => selectedRefund && void queryRefund(selectedRefund)}
          >
            渠道查单
          </PermissionButton>
        }
        open={refundDetailOpen}
        title="退款详情"
        width={680}
        onCancel={() => setRefundDetailOpen(false)}
      >
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="退款单号" span={2}>
            {selectedRefund?.refundOrderNo || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <StatusTag
              value={selectedRefund?.status}
              text={refundStatusText}
              tone={refundStatusTone}
            />
          </Descriptions.Item>
          <Descriptions.Item label="金额">
            {formatFenAmount(selectedRefund?.refundAmountFen)}
          </Descriptions.Item>
          <Descriptions.Item label="渠道退款号" span={2}>
            {selectedRefund?.channelRefundNo || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="退款发起人" span={2}>
            {selectedRefund?.createByName || selectedRefund?.createBy || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="失败原因" span={2}>
            {selectedRefund?.errorMessage || '-'}
          </Descriptions.Item>
        </Descriptions>
        {shouldPollPaymentRefund(selectedRefund) && (
          <Tag color="processing" style={{ marginTop: 16 }}>
            每 3 秒自动查询退款终态
          </Tag>
        )}
      </Modal>
    </PageContainer>
  );
};

const GuardedPaymentOperationsPage = () => (
  <OperationsGuard
    permissions={[
      billingPermissions.paymentOrderList,
      billingPermissions.paymentRefundList,
    ]}
  >
    <PaymentOperationsPage />
  </OperationsGuard>
);

export default GuardedPaymentOperationsPage;
