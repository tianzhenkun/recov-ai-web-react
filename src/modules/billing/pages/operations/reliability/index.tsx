import {
  ReloadOutlined,
  RetweetOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { App, Button, Form, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import {
  type PaymentOutboxEvent,
  type PaymentOutboxEventType,
  type PaymentOutboxStatus,
  pageAdminPaymentOutbox,
  reconcileAdminPayments,
  replayAdminPaymentOutbox,
} from '@/modules/billing/services/payment';
import {
  billingPermissions,
  formatDate,
  getErrorMessage,
  renderCodeId,
} from '../../../components/shared';
import OperationsGuard from '../components/OperationsGuard';

type FilterValues = {
  eventStatus?: PaymentOutboxStatus;
  eventType?: PaymentOutboxEventType;
};

const statusTone: Record<string, string> = {
  PENDING: 'gold',
  PROCESSING: 'processing',
  SUCCEEDED: 'green',
  DEAD: 'red',
};

const eventTypeOptions: PaymentOutboxEventType[] = [
  'PAYMENT_PAID',
  'PAYMENT_CLOSED',
  'PAYMENT_EXPIRED',
  'PAYMENT_FAILED',
  'PAYMENT_REFUNDED',
  'PAYMENT_REFUND_FAILED',
];

const PaymentReliabilityPage = () => {
  const { message, modal } = App.useApp();
  const [filterForm] = Form.useForm<FilterValues>();
  const [rows, setRows] = useState<PaymentOutboxEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [replayingId, setReplayingId] = useState<string>();
  const [reconciling, setReconciling] = useState(false);
  const [eventPage, setEventPage] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const loadData = useCallback(
    async (pageNum = 1, pageSize = 10) => {
      setLoading(true);
      try {
        const values = filterForm.getFieldsValue();
        const result = await pageAdminPaymentOutbox({
          eventStatus: values.eventStatus,
          eventType: values.eventType,
          pageNum,
          pageSize,
        });
        setRows(result.rows);
        setEventPage({ current: pageNum, pageSize, total: result.total });
      } catch (error) {
        message.error(getErrorMessage(error, '加载支付事件失败'));
      } finally {
        setLoading(false);
      }
    },
    [filterForm, message],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const replay = (record: PaymentOutboxEvent) => {
    modal.confirm({
      title: '重放支付事件',
      content: `确认重放事件“${record.id}”吗？系统会使用原业务键执行幂等处理。`,
      okText: '确认重放',
      onOk: async () => {
        if (!record.id) return;
        setReplayingId(record.id);
        try {
          await replayAdminPaymentOutbox(record.id);
          message.success('事件已进入重放队列');
          await loadData(eventPage.current, eventPage.pageSize);
        } finally {
          setReplayingId(undefined);
        }
      },
    });
  };

  const reconcile = () => {
    modal.confirm({
      title: '执行支付对账',
      content: '将按平台运营范围查询支付渠道状态，并修复可自动补偿的差异。',
      okText: '开始对账',
      onOk: async () => {
        setReconciling(true);
        try {
          const result = await reconcileAdminPayments();
          message.success(
            `对账完成：支付查单 ${result.queriedPayments || 0}，过期关单 ${result.closedExpiredPayments || 0}，退款查单 ${result.queriedRefunds || 0}，失败 ${result.failedItems || 0}`,
          );
          await loadData(eventPage.current, eventPage.pageSize);
        } finally {
          setReconciling(false);
        }
      },
    });
  };

  const columns: ColumnsType<PaymentOutboxEvent> = [
    { title: '事件ID', dataIndex: 'id', width: 150, render: renderCodeId },
    { title: '事件类型', dataIndex: 'eventType', width: 190, ellipsis: true },
    {
      title: '业务对象',
      key: 'aggregate',
      width: 260,
      render: (_, record) =>
        `${record.bizType || '-'} · ${record.bizOrderId || record.paymentOrderId || '-'}`,
    },
    {
      title: '状态',
      dataIndex: 'eventStatus',
      width: 120,
      render: (value) => (
        <Tag color={statusTone[String(value)]}>{value || '-'}</Tag>
      ),
    },
    { title: '重试次数', dataIndex: 'retryCount', align: 'right', width: 100 },
    {
      title: '下次重试',
      dataIndex: 'nextRetryTime',
      width: 180,
      render: formatDate,
    },
    { title: '最后错误', dataIndex: 'lastError', ellipsis: true },
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
      width: 100,
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'replay',
              label: '重放',
              icon: <RetweetOutlined />,
              permissions: billingPermissions.paymentOutboxReplay,
              loading: replayingId === record.id,
              disabled: record.eventStatus !== 'DEAD',
              onClick: () => replay(record),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer
      breadcrumbRender={false}
      title="支付可靠性"
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadData(eventPage.current, eventPage.pageSize)}
          >
            刷新
          </Button>
          <PermissionButton
            permissions={billingPermissions.paymentReconcile}
            icon={<SafetyCertificateOutlined />}
            loading={reconciling}
            type="primary"
            onClick={reconcile}
          >
            执行对账
          </PermissionButton>
        </Space>
      }
    >
      <ProCard>
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Form form={filterForm} layout="inline">
            <Form.Item name="eventType" label="事件类型">
              <Select
                allowClear
                style={{ width: 250 }}
                options={eventTypeOptions.map((value) => ({ value }))}
              />
            </Form.Item>
            <Form.Item name="eventStatus" label="状态">
              <Select
                allowClear
                style={{ width: 140 }}
                options={Object.keys(statusTone).map((value) => ({
                  label: value,
                  value,
                }))}
              />
            </Form.Item>
            <Button
              type="primary"
              onClick={() => void loadData(1, eventPage.pageSize)}
            >
              查询
            </Button>
            <Button
              onClick={() => {
                filterForm.resetFields();
                void loadData(1, eventPage.pageSize);
              }}
            >
              重置
            </Button>
          </Form>
          <Table
            rowKey={(record) => String(record.id)}
            columns={columns}
            dataSource={rows}
            loading={loading}
            pagination={{
              current: eventPage.current,
              pageSize: eventPage.pageSize,
              total: eventPage.total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (pageNum, pageSize) => void loadData(pageNum, pageSize),
            }}
            scroll={{ x: 1450 }}
          />
        </Space>
      </ProCard>
    </PageContainer>
  );
};

const GuardedPaymentReliabilityPage = () => (
  <OperationsGuard permissions={billingPermissions.paymentOutboxList}>
    <PaymentReliabilityPage />
  </OperationsGuard>
);

export default GuardedPaymentReliabilityPage;
