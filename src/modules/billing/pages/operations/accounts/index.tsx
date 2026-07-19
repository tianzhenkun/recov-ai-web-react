import {
  EyeOutlined,
  GiftOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
  WalletOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  App,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Statistic,
  Table,
  Tag,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import TableActions from '@/components/TableActions';
import {
  type CreditAccount,
  type CreditGrant,
  grantAdminCredit,
  listAdminCreditGrants,
  pageCreditAccounts,
} from '@/modules/billing/services/credit-billing';
import {
  accountStatusText,
  accountStatusTone,
  billingPermissions,
  formatDate,
  formatPoints,
  getErrorMessage,
  grantStatusText,
  grantTypeText,
  ownerTypeText,
  packageKindText,
  renderCodeId,
  renderDictTag,
  toNumber,
} from '../../../components/shared';
import OperationsGuard from '../components/OperationsGuard';

type AccountFilterValues = {
  ownerType?: 'all' | 'TENANT' | 'USER';
};

type GrantFormValues = {
  points: number;
  grantType: 'purchase' | 'gift' | 'compensation' | 'refund';
  reason: string;
};

const createGrantKey = (accountId: string) =>
  `admin-grant:${accountId}:${Date.now()}`;

const metricIconStyle = (color: string, background: string) => ({
  alignItems: 'center',
  background,
  borderRadius: 10,
  color,
  display: 'inline-flex',
  fontSize: 18,
  height: 36,
  justifyContent: 'center',
  marginRight: 10,
  width: 36,
});

const CreditAccountOperationsPage = () => {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [filterForm] = Form.useForm<AccountFilterValues>();
  const [grantForm] = Form.useForm<GrantFormValues>();
  const [accounts, setAccounts] = useState<CreditAccount[]>([]);
  const [grants, setGrants] = useState<CreditGrant[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<CreditAccount>();
  const [loading, setLoading] = useState(false);
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accountPage, setAccountPage] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const loadAccounts = useCallback(
    async (pageNum = 1, pageSize = 10) => {
      setLoading(true);
      try {
        const ownerType = filterForm.getFieldValue('ownerType');
        const result = await pageCreditAccounts({
          ownerType: ownerType && ownerType !== 'all' ? ownerType : undefined,
          pageNum,
          pageSize,
        });
        setAccounts(result.rows);
        setAccountPage({ current: pageNum, pageSize, total: result.total });
      } catch (error) {
        message.error(getErrorMessage(error, '加载信用点账户失败'));
      } finally {
        setLoading(false);
      }
    },
    [filterForm, message],
  );

  useEffect(() => {
    void loadAccounts(1, 10);
  }, [loadAccounts]);

  const loadGrants = async (record: CreditAccount) => {
    if (!record.id) return;
    setSelectedAccount(record);
    setGrantLoading(true);
    try {
      setGrants(await listAdminCreditGrants(record.id));
    } catch (error) {
      message.error(getErrorMessage(error, '加载账户批次失败'));
    } finally {
      setGrantLoading(false);
    }
  };

  const openGrant = (record: CreditAccount) => {
    setSelectedAccount(record);
    grantForm.setFieldsValue({
      points: 100,
      grantType: 'compensation',
      reason: '平台人工发放',
    });
    setGrantOpen(true);
  };

  const submitGrant = async () => {
    if (!selectedAccount?.id) return;
    const values = await grantForm.validateFields();
    setSubmitting(true);
    try {
      const sourceId = createGrantKey(selectedAccount.id);
      await grantAdminCredit({
        accountId: selectedAccount.id,
        points: values.points,
        grantType: values.grantType,
        sourceType: 'ADMIN_GRANT',
        sourceId,
        remark: values.reason.trim(),
      });
      message.success('信用点已发放');
      setGrantOpen(false);
      await Promise.all([
        loadAccounts(accountPage.current, accountPage.pageSize),
        loadGrants(selectedAccount),
      ]);
    } catch (error) {
      message.error(getErrorMessage(error, '发放信用点失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const summary = useMemo(
    () =>
      accounts.reduce(
        (result, account) => ({
          available: result.available + toNumber(account.availablePoints),
          outstanding: result.outstanding + toNumber(account.outstandingPoints),
          granted: result.granted + toNumber(account.totalGrantedPoints),
          settled: result.settled + toNumber(account.totalSettledPoints),
        }),
        { available: 0, outstanding: 0, granted: 0, settled: 0 },
      ),
    [accounts],
  );

  const columns: ColumnsType<CreditAccount> = [
    { title: '账户ID', dataIndex: 'id', width: 150, render: renderCodeId },
    {
      title: '归属类型',
      dataIndex: 'ownerType',
      width: 130,
      render: (value) => renderDictTag(value, ownerTypeText, 'blue'),
    },
    { title: '归属ID', dataIndex: 'ownerId', width: 180, ellipsis: true },
    {
      title: '可用点数',
      dataIndex: 'availablePoints',
      align: 'right',
      width: 120,
      render: formatPoints,
    },
    {
      title: '欠费点数',
      key: 'outstandingPoints',
      align: 'right',
      width: 120,
      render: (_, record) => (
        <span
          style={{
            color:
              toNumber(record.outstandingPoints) > 0
                ? token.colorError
                : undefined,
          }}
        >
          {formatPoints(record.outstandingPoints)}
        </span>
      ),
    },
    {
      title: '累计发放',
      dataIndex: 'totalGrantedPoints',
      align: 'right',
      width: 120,
      render: formatPoints,
    },
    {
      title: '累计偿债',
      dataIndex: 'totalSettledPoints',
      align: 'right',
      width: 120,
      render: formatPoints,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 130,
      render: (value) => (
        <Tag color={accountStatusTone[String(value)]}>
          {accountStatusText[String(value)] || value || '-'}
        </Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
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
              key: 'grants',
              label: '查看批次',
              icon: <EyeOutlined />,
              permissions: billingPermissions.adminAccountList,
              onClick: () => void loadGrants(record),
            },
            {
              key: 'grant',
              label: '发放信用点',
              icon: <PlusCircleOutlined />,
              permissions: billingPermissions.adminAccountGrant,
              onClick: () => openGrant(record),
            },
          ]}
        />
      ),
    },
  ];

  const grantColumns: ColumnsType<CreditGrant> = [
    { title: '批次ID', dataIndex: 'id', width: 150, render: renderCodeId },
    {
      title: '发放类型',
      dataIndex: 'grantType',
      width: 140,
      render: (value) => renderDictTag(value, grantTypeText),
    },
    {
      title: '权益类型',
      dataIndex: 'packageKind',
      width: 160,
      render: (value) => renderDictTag(value, packageKindText),
    },
    {
      title: '总点数',
      dataIndex: 'totalPoints',
      align: 'right',
      render: formatPoints,
    },
    {
      title: '剩余',
      dataIndex: 'remainingPoints',
      align: 'right',
      render: formatPoints,
    },
    {
      title: '已使用',
      dataIndex: 'chargedPoints',
      align: 'right',
      render: formatPoints,
    },
    {
      title: '已过期',
      dataIndex: 'expiredPoints',
      align: 'right',
      render: formatPoints,
    },
    {
      title: '已作废',
      dataIndex: 'voidedPoints',
      align: 'right',
      render: formatPoints,
    },
    {
      title: '到期时间',
      dataIndex: 'expiresAt',
      width: 180,
      render: (value) => value || '永久',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value) => renderDictTag(value, grantStatusText),
    },
  ];

  return (
    <PageContainer
      breadcrumbRender={false}
      title="信用点账户"
      extra={
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() =>
            void loadAccounts(accountPage.current, accountPage.pageSize)
          }
        >
          刷新
        </Button>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <ProCard>
            <Statistic
              title="当前页可用点数"
              value={summary.available}
              prefix={
                <span style={metricIconStyle('#1677ff', '#e6f4ff')}>
                  <WalletOutlined />
                </span>
              }
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <ProCard>
            <Statistic
              title="当前页欠费点数"
              value={summary.outstanding}
              styles={{
                content: {
                  color: summary.outstanding > 0 ? token.colorError : undefined,
                },
              }}
              prefix={
                <span style={metricIconStyle('#cf1322', '#fff1f0')}>
                  <WarningOutlined />
                </span>
              }
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <ProCard>
            <Statistic
              title="当前页累计发放"
              value={summary.granted}
              prefix={
                <span style={metricIconStyle('#389e0d', '#f6ffed')}>
                  <GiftOutlined />
                </span>
              }
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <ProCard>
            <Statistic title="当前页累计偿债" value={summary.settled} />
          </ProCard>
        </Col>
      </Row>

      <ProCard style={{ marginTop: token.marginLG }}>
        <Form
          form={filterForm}
          initialValues={{ ownerType: 'all' }}
          layout="inline"
        >
          <Form.Item label="归属类型" name="ownerType">
            <Select
              style={{ width: 160 }}
              options={[
                { label: '全部账户', value: 'all' },
                { label: '团队账户', value: 'TENANT' },
                { label: '个人账户', value: 'USER' },
              ]}
            />
          </Form.Item>
          <Button
            type="primary"
            onClick={() => void loadAccounts(1, accountPage.pageSize)}
          >
            查询
          </Button>
          <Button
            onClick={() => {
              filterForm.resetFields();
              void loadAccounts(1, accountPage.pageSize);
            }}
          >
            重置
          </Button>
        </Form>
        <Table
          rowKey={(record) => String(record.id)}
          columns={columns}
          dataSource={accounts}
          loading={loading}
          pagination={{
            current: accountPage.current,
            pageSize: accountPage.pageSize,
            total: accountPage.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (pageNum, pageSize) =>
              void loadAccounts(pageNum, pageSize),
          }}
          scroll={{ x: 1420 }}
          style={{ marginTop: token.marginMD }}
        />
      </ProCard>

      <Modal
        footer={null}
        open={Boolean(selectedAccount) && !grantOpen}
        title="账户批次"
        width={1050}
        onCancel={() => {
          setSelectedAccount(undefined);
          setGrants([]);
        }}
      >
        <Table
          rowKey={(record) => String(record.id)}
          columns={grantColumns}
          dataSource={grants}
          loading={grantLoading}
          pagination={{ showTotal: (total) => `共 ${total} 条` }}
          scroll={{ x: 1250 }}
        />
      </Modal>

      <Modal
        forceRender
        open={grantOpen}
        title="发放信用点"
        okText="确认发放"
        confirmLoading={submitting}
        onCancel={() => {
          setGrantOpen(false);
          setSelectedAccount(undefined);
        }}
        onOk={() => void submitGrant()}
      >
        <Form form={grantForm} layout="vertical">
          <Form.Item
            label="点数"
            name="points"
            rules={[{ required: true, message: '请输入发放点数' }]}
          >
            <InputNumber min={0.0001} precision={4} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="发放类型"
            name="grantType"
            rules={[{ required: true, message: '请选择发放类型' }]}
          >
            <Select
              options={[
                { label: '补偿调整', value: 'compensation' },
                { label: '运营赠送', value: 'gift' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="发放原因"
            name="reason"
            rules={[{ required: true, message: '请输入发放原因' }]}
          >
            <Input.TextArea maxLength={200} rows={3} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

const GuardedCreditAccountOperationsPage = () => (
  <OperationsGuard permissions={billingPermissions.adminAccountList}>
    <CreditAccountOperationsPage />
  </OperationsGuard>
);

export default GuardedCreditAccountOperationsPage;
