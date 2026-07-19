import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  StopOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import TableActions from '@/components/TableActions';
import {
  addSalesEmailDoNotContact,
  cancelSalesEmailMessage,
  deleteSalesEmailAccount,
  deleteSalesEmailDoNotContact,
  querySalesEmailAccounts,
  querySalesEmailDoNotContacts,
  querySalesEmailEvents,
  querySalesEmailMessages,
  type SalesEmailAccount,
  type SalesEmailAccountPayload,
  type SalesEmailDoNotContact,
  type SalesEmailEvent,
  type SalesEmailMessage,
  type SalesEmailMessageQuery,
  type SalesEmailMessageStatus,
  saveSalesEmailAccount,
  sendSalesEmailNow,
  syncSalesEmailInbox,
  testSalesEmailImap,
  testSalesEmailSmtp,
} from '@/modules/sales/services/sales';

const { Text } = Typography;

type AccountFormValues = Omit<
  SalesEmailAccountPayload,
  'imapEnabled' | 'enabled' | 'defaultFlag'
> & {
  imapEnabled?: boolean;
  enabled?: boolean;
  defaultFlag?: boolean;
};

type DoNotContactFormValues = {
  email: string;
  reasonType?: string;
  reason?: string;
};

type ProviderPreset = {
  label: string;
  providerLabel: string;
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: string;
  imapHost: string;
  imapPort: number;
  imapEncryption: string;
};

const providerPresets: ProviderPreset[] = [
  {
    label: '126邮箱',
    providerLabel: '126邮箱',
    smtpHost: 'smtp.126.com',
    smtpPort: 465,
    smtpEncryption: 'SSL_TLS',
    imapHost: 'imap.126.com',
    imapPort: 993,
    imapEncryption: 'SSL_TLS',
  },
  {
    label: '163邮箱',
    providerLabel: '163邮箱',
    smtpHost: 'smtp.163.com',
    smtpPort: 465,
    smtpEncryption: 'SSL_TLS',
    imapHost: 'imap.163.com',
    imapPort: 993,
    imapEncryption: 'SSL_TLS',
  },
  {
    label: 'QQ邮箱',
    providerLabel: 'QQ邮箱',
    smtpHost: 'smtp.qq.com',
    smtpPort: 465,
    smtpEncryption: 'SSL_TLS',
    imapHost: 'imap.qq.com',
    imapPort: 993,
    imapEncryption: 'SSL_TLS',
  },
];

const encryptionOptions = [
  { label: 'SSL/TLS', value: 'SSL_TLS' },
  { label: 'STARTTLS', value: 'STARTTLS' },
  { label: '无加密', value: 'NONE' },
];

const messageStatusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '发送中', value: 'sending' },
  { label: '已发送', value: 'sent' },
  { label: '失败', value: 'failed' },
  { label: '已回复', value: 'replied' },
  { label: '已退信', value: 'bounced' },
  { label: '已取消', value: 'cancelled' },
  { label: '已阻止', value: 'blocked' },
];

const messageStatusMeta: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  queued: { label: '待发送', color: 'processing' },
  sending: { label: '发送中', color: 'processing' },
  sent: { label: '已发送', color: 'success' },
  failed: { label: '失败', color: 'error' },
  replied: { label: '已回复', color: 'blue' },
  bounced: { label: '已退信', color: 'warning' },
  cancelled: { label: '已取消', color: 'default' },
  blocked: { label: '已阻止', color: 'error' },
};

const testStatusMeta: Record<string, { label: string; color: string }> = {
  untested: { label: '未测试', color: 'default' },
  success: { label: '通过', color: 'success' },
  failed: { label: '失败', color: 'error' },
};

const eventTypeMeta: Record<string, { label: string; color: string }> = {
  draft_created: { label: '创建草稿', color: 'default' },
  sending: { label: '发送中', color: 'processing' },
  sent: { label: '已发送', color: 'success' },
  failed: { label: '发送失败', color: 'error' },
  cancelled: { label: '已取消', color: 'default' },
  replied: { label: '收到回复', color: 'blue' },
  bounced: { label: '收到退信', color: 'warning' },
  auto_reply: { label: '自动回复', color: 'purple' },
};

const reasonTypeOptions = [
  { label: '手动标记', value: 'manual' },
  { label: '客户要求', value: 'request' },
  { label: '地址无效', value: 'invalid' },
  { label: '其他', value: 'other' },
];

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
};

const renderStatusTag = (
  value: string | undefined,
  metaMap: Record<string, { label: string; color: string }>,
) => {
  const meta = metaMap[String(value || '')] || {
    label: value || '-',
    color: 'default',
  };
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

const toFlag = (value?: boolean) => (value ? '1' : '0');

const isSendable = (status?: SalesEmailMessageStatus) =>
  status === 'draft' || status === 'failed';

const isCancellable = (status?: SalesEmailMessageStatus) =>
  status === 'draft' || status === 'queued' || status === 'failed';

const toAccountFormValues = (
  record?: SalesEmailAccount,
): AccountFormValues => ({
  id: record?.id,
  accountName: record?.accountName || '',
  emailAddress: record?.emailAddress || '',
  fromName: record?.fromName || '',
  providerLabel: record?.providerLabel || '',
  smtpHost: record?.smtpHost || '',
  smtpPort: record?.smtpPort || 465,
  smtpEncryption: record?.smtpEncryption || 'SSL_TLS',
  smtpUsername: record?.smtpUsername || '',
  smtpAuthSecret: '',
  imapEnabled: record?.imapEnabled !== '0',
  imapHost: record?.imapHost || '',
  imapPort: record?.imapPort || 993,
  imapEncryption: record?.imapEncryption || 'SSL_TLS',
  imapUsername: record?.imapUsername || '',
  imapAuthSecret: '',
  enabled: record?.enabled !== '0',
  defaultFlag: record?.defaultFlag === '1',
});

const SalesEmailOutreachPage: FC = () => {
  const queryClient = useQueryClient();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [accountForm] = Form.useForm<AccountFormValues>();
  const [doNotContactForm] = Form.useForm<DoNotContactFormValues>();
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SalesEmailAccount>();
  const [doNotContactModalOpen, setDoNotContactModalOpen] = useState(false);
  const [eventMessage, setEventMessage] = useState<SalesEmailMessage>();
  const [messageQuery, setMessageQuery] = useState<SalesEmailMessageQuery>({
    pageNum: 1,
    pageSize: 10,
  });

  const accountQuery = useQuery({
    queryKey: ['sales-email-accounts'],
    queryFn: () => querySalesEmailAccounts(),
  });
  const accounts = accountQuery.data?.data || [];
  const accountOptions = useMemo(
    () =>
      accounts.map((item) => ({
        label: `${item.accountName} <${item.emailAddress}>`,
        value: item.id,
      })),
    [accounts],
  );

  const messageListQuery = useQuery({
    queryKey: ['sales-email-messages', messageQuery],
    queryFn: () => querySalesEmailMessages(messageQuery),
  });

  const doNotContactQuery = useQuery({
    queryKey: ['sales-email-do-not-contact'],
    queryFn: () => querySalesEmailDoNotContacts(),
  });

  const eventQuery = useQuery({
    queryKey: ['sales-email-events', eventMessage?.id],
    queryFn: () => {
      if (!eventMessage?.id) throw new Error('message id is required');
      return querySalesEmailEvents(eventMessage.id);
    },
    enabled: Boolean(eventMessage?.id),
  });

  const saveAccountMutation = useMutation({
    mutationFn: (values: AccountFormValues) =>
      saveSalesEmailAccount({
        ...values,
        imapEnabled: toFlag(values.imapEnabled),
        enabled: toFlag(values.enabled ?? true),
        defaultFlag: toFlag(values.defaultFlag),
      }),
    onSuccess: async () => {
      messageApi.success('邮箱配置已保存');
      setAccountDrawerOpen(false);
      setEditingAccount(undefined);
      accountForm.resetFields();
      await queryClient.invalidateQueries({
        queryKey: ['sales-email-accounts'],
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: deleteSalesEmailAccount,
    onSuccess: async () => {
      messageApi.success('邮箱配置已删除');
      await queryClient.invalidateQueries({
        queryKey: ['sales-email-accounts'],
      });
    },
  });

  const testSmtpMutation = useMutation({
    mutationFn: testSalesEmailSmtp,
    onSuccess: async () => {
      messageApi.success('SMTP测试通过');
      await queryClient.invalidateQueries({
        queryKey: ['sales-email-accounts'],
      });
    },
  });

  const testImapMutation = useMutation({
    mutationFn: testSalesEmailImap,
    onSuccess: async () => {
      messageApi.success('IMAP测试通过');
      await queryClient.invalidateQueries({
        queryKey: ['sales-email-accounts'],
      });
    },
  });

  const syncInboxMutation = useMutation({
    mutationFn: syncSalesEmailInbox,
    onSuccess: async (response) => {
      messageApi.success(
        `同步完成，匹配 ${response.data?.processedCount || 0} 封`,
      );
      await queryClient.invalidateQueries({
        queryKey: ['sales-email-accounts'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['sales-email-messages'],
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: sendSalesEmailNow,
    onSuccess: async (response) => {
      if (response.data?.success) {
        messageApi.success('邮件已发送');
      } else {
        messageApi.error(response.data?.message || '邮件发送失败');
      }
      await queryClient.invalidateQueries({
        queryKey: ['sales-email-messages'],
      });
    },
  });

  const cancelMessageMutation = useMutation({
    mutationFn: cancelSalesEmailMessage,
    onSuccess: async () => {
      messageApi.success('邮件已取消');
      await queryClient.invalidateQueries({
        queryKey: ['sales-email-messages'],
      });
    },
  });

  const addDoNotContactMutation = useMutation({
    mutationFn: addSalesEmailDoNotContact,
    onSuccess: async () => {
      messageApi.success('不再联系已保存');
      setDoNotContactModalOpen(false);
      doNotContactForm.resetFields();
      await queryClient.invalidateQueries({
        queryKey: ['sales-email-do-not-contact'],
      });
    },
  });

  const deleteDoNotContactMutation = useMutation({
    mutationFn: deleteSalesEmailDoNotContact,
    onSuccess: async () => {
      messageApi.success('不再联系已移除');
      await queryClient.invalidateQueries({
        queryKey: ['sales-email-do-not-contact'],
      });
    },
  });

  const openCreateAccount = () => {
    setEditingAccount(undefined);
    accountForm.setFieldsValue(toAccountFormValues());
    setAccountDrawerOpen(true);
  };

  const openEditAccount = (record: SalesEmailAccount) => {
    setEditingAccount(record);
    accountForm.setFieldsValue(toAccountFormValues(record));
    setAccountDrawerOpen(true);
  };

  const applyPreset = (presetLabel: string) => {
    const preset = providerPresets.find((item) => item.label === presetLabel);
    if (!preset) return;
    const emailAddress = accountForm.getFieldValue('emailAddress');
    accountForm.setFieldsValue({
      providerLabel: preset.providerLabel,
      smtpHost: preset.smtpHost,
      smtpPort: preset.smtpPort,
      smtpEncryption: preset.smtpEncryption,
      smtpUsername: emailAddress || accountForm.getFieldValue('smtpUsername'),
      imapEnabled: true,
      imapHost: preset.imapHost,
      imapPort: preset.imapPort,
      imapEncryption: preset.imapEncryption,
      imapUsername: emailAddress || accountForm.getFieldValue('imapUsername'),
    });
  };

  const accountColumns: ColumnsType<SalesEmailAccount> = [
    {
      title: '邮箱',
      dataIndex: 'accountName',
      width: 260,
      ellipsis: true,
      render: (_, record) => (
        <div className="flex flex-col gap-1">
          <Text strong>{record.accountName}</Text>
          <Text type="secondary">{record.emailAddress}</Text>
        </div>
      ),
    },
    {
      title: '服务商',
      dataIndex: 'providerLabel',
      width: 120,
      render: (value?: string) => value || '-',
    },
    {
      title: 'SMTP',
      key: 'smtp',
      width: 220,
      ellipsis: true,
      render: (_, record) => (
        <div className="flex flex-col gap-1">
          <span>{`${record.smtpHost}:${record.smtpPort}`}</span>
          <Text type="secondary">{record.smtpEncryption}</Text>
        </div>
      ),
    },
    {
      title: 'IMAP',
      key: 'imap',
      width: 220,
      ellipsis: true,
      render: (_, record) =>
        record.imapEnabled === '1' ? (
          <div className="flex flex-col gap-1">
            <span>{`${record.imapHost || '-'}:${record.imapPort || '-'}`}</span>
            <Text type="secondary">{record.imapEncryption}</Text>
          </div>
        ) : (
          <Tag>未启用</Tag>
        ),
    },
    {
      title: '状态',
      key: 'flags',
      width: 170,
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          <Tag color={record.enabled === '1' ? 'success' : 'default'}>
            {record.enabled === '1' ? '启用' : '停用'}
          </Tag>
          {record.defaultFlag === '1' ? <Tag color="blue">默认</Tag> : null}
        </Space>
      ),
    },
    {
      title: '连接测试',
      key: 'testStatus',
      width: 190,
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          {renderStatusTag(record.smtpTestStatus, testStatusMeta)}
          {record.imapEnabled === '1'
            ? renderStatusTag(record.imapTestStatus, testStatusMeta)
            : null}
        </Space>
      ),
    },
    {
      title: '最近同步',
      dataIndex: 'lastSyncTime',
      width: 170,
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <TableActions
          maxVisible={2}
          actions={[
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              onClick: () => openEditAccount(record),
            },
            {
              key: 'test-smtp',
              label: '测试SMTP',
              icon: <CheckCircleOutlined />,
              loading: testSmtpMutation.isPending,
              onClick: () => testSmtpMutation.mutate(record.id),
            },
            {
              key: 'test-imap',
              label: '测试IMAP',
              icon: <CheckCircleOutlined />,
              disabled: record.imapEnabled !== '1',
              loading: testImapMutation.isPending,
              onClick: () => testImapMutation.mutate(record.id),
            },
            {
              key: 'sync',
              label: '同步收件箱',
              icon: <SyncOutlined />,
              disabled: record.imapEnabled !== '1',
              loading: syncInboxMutation.isPending,
              onClick: () => syncInboxMutation.mutate(record.id),
            },
            {
              key: 'delete',
              label: '删除',
              icon: <DeleteOutlined />,
              danger: true,
              loading: deleteAccountMutation.isPending,
              onClick: () => {
                modalApi.confirm({
                  title: '删除邮箱配置',
                  content: `确认删除 ${record.emailAddress}？`,
                  okText: '删除',
                  okButtonProps: { danger: true },
                  onOk: () => deleteAccountMutation.mutateAsync(record.id),
                });
              },
            },
          ]}
        />
      ),
    },
  ];

  const messageColumns: ColumnsType<SalesEmailMessage> = [
    {
      title: '收件人',
      dataIndex: 'toEmail',
      width: 240,
      ellipsis: true,
      render: (_, record) => (
        <div className="flex flex-col gap-1">
          <Text>{record.toName || record.toEmail}</Text>
          <Text type="secondary">{record.toEmail}</Text>
        </div>
      ),
    },
    {
      title: '发件邮箱',
      dataIndex: 'fromEmail',
      width: 220,
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    {
      title: '主题',
      dataIndex: 'subject',
      width: 320,
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 108,
      render: (value?: string) => renderStatusTag(value, messageStatusMeta),
    },
    {
      title: '关联线索',
      key: 'lead',
      width: 150,
      render: (_, record) => (
        <div className="flex flex-col gap-1">
          <span>{record.profileId ? `公司 ${record.profileId}` : '-'}</span>
          <Text type="secondary">
            {record.contactId ? `联系人 ${record.contactId}` : '-'}
          </Text>
        </div>
      ),
    },
    {
      title: '发送时间',
      dataIndex: 'sentAt',
      width: 170,
      render: formatDateTime,
    },
    {
      title: '结果时间',
      key: 'resultTime',
      width: 170,
      render: (_, record) =>
        formatDateTime(
          record.firstReplyAt || record.bouncedAt || record.failedAt,
        ),
    },
    {
      title: '失败原因',
      dataIndex: 'errorMessage',
      width: 220,
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 170,
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 132,
      fixed: 'right',
      render: (_, record) => (
        <TableActions
          maxVisible={2}
          actions={[
            {
              key: 'events',
              label: '事件',
              icon: <HistoryOutlined />,
              onClick: () => setEventMessage(record),
            },
            {
              key: 'send',
              label: '发送',
              icon: <SendOutlined />,
              disabled: !isSendable(record.status),
              loading: sendMessageMutation.isPending,
              onClick: () => sendMessageMutation.mutate(record.id),
            },
            {
              key: 'cancel',
              label: '取消',
              icon: <StopOutlined />,
              disabled: !isCancellable(record.status),
              loading: cancelMessageMutation.isPending,
              onClick: () => cancelMessageMutation.mutate(record.id),
            },
          ]}
        />
      ),
    },
  ];

  const eventColumns: ColumnsType<SalesEmailEvent> = [
    {
      title: '事件',
      dataIndex: 'eventType',
      width: 120,
      render: (value?: string) => renderStatusTag(value, eventTypeMeta),
    },
    {
      title: '来源',
      dataIndex: 'eventSource',
      width: 90,
      render: (value?: string) => value || '-',
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    {
      title: '时间',
      dataIndex: 'eventTime',
      width: 170,
      render: formatDateTime,
    },
  ];

  const doNotContactColumns: ColumnsType<SalesEmailDoNotContact> = [
    {
      title: '邮箱',
      dataIndex: 'email',
      width: 260,
      ellipsis: true,
    },
    {
      title: '原因类型',
      dataIndex: 'reasonType',
      width: 120,
      render: (value?: string) =>
        reasonTypeOptions.find((item) => item.value === value)?.label ||
        value ||
        '-',
    },
    {
      title: '原因',
      dataIndex: 'reason',
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 170,
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 88,
      fixed: 'right',
      render: (_, record) => (
        <TableActions
          maxVisible={1}
          actions={[
            {
              key: 'remove',
              label: '移除',
              icon: <DeleteOutlined />,
              danger: true,
              loading: deleteDoNotContactMutation.isPending,
              onClick: () => {
                modalApi.confirm({
                  title: '移除不再联系',
                  content: `确认允许后续联系 ${record.email}？`,
                  okText: '移除',
                  onOk: () => deleteDoNotContactMutation.mutateAsync(record.id),
                });
              },
            },
          ]}
        />
      ),
    },
  ];

  const handleMessageTableChange = (pagination: TablePaginationConfig) => {
    setMessageQuery((prev) => ({
      ...prev,
      pageNum: pagination.current || 1,
      pageSize: pagination.pageSize || prev.pageSize || 10,
    }));
  };

  return (
    <PageContainer breadcrumbRender={false} title="邮件触达">
      {messageContextHolder}
      {modalContextHolder}
      <Tabs
        items={[
          {
            key: 'accounts',
            label: '发件邮箱',
            children: (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Space size={8} wrap>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={openCreateAccount}
                    >
                      新增邮箱
                    </Button>
                  </Space>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => void accountQuery.refetch()}
                  >
                    刷新
                  </Button>
                </div>
                <Table<SalesEmailAccount>
                  rowKey={(record) => String(record.id)}
                  columns={accountColumns}
                  dataSource={accounts}
                  loading={accountQuery.isLoading || accountQuery.isFetching}
                  size="middle"
                  scroll={{ x: 1500 }}
                  pagination={{
                    pageSize: 10,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="暂无邮箱配置"
                      />
                    ),
                  }}
                />
              </div>
            ),
          },
          {
            key: 'messages',
            label: '发信记录',
            children: (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Space size={8} wrap>
                    <Select
                      allowClear
                      placeholder="发件邮箱"
                      style={{ width: 260 }}
                      options={accountOptions}
                      value={messageQuery.accountId}
                      onChange={(value) =>
                        setMessageQuery((prev) => ({
                          ...prev,
                          pageNum: 1,
                          accountId: value,
                        }))
                      }
                    />
                    <Select
                      allowClear
                      placeholder="邮件状态"
                      style={{ width: 140 }}
                      options={messageStatusOptions}
                      value={messageQuery.status}
                      onChange={(value) =>
                        setMessageQuery((prev) => ({
                          ...prev,
                          pageNum: 1,
                          status: value,
                        }))
                      }
                    />
                  </Space>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => void messageListQuery.refetch()}
                  >
                    刷新
                  </Button>
                </div>
                <Table<SalesEmailMessage>
                  rowKey={(record) => String(record.id)}
                  columns={messageColumns}
                  dataSource={messageListQuery.data?.rows || []}
                  loading={
                    messageListQuery.isLoading || messageListQuery.isFetching
                  }
                  size="middle"
                  scroll={{ x: 1880 }}
                  pagination={{
                    current: messageQuery.pageNum,
                    pageSize: messageQuery.pageSize,
                    total: messageListQuery.data?.total || 0,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="暂无发信记录"
                      />
                    ),
                  }}
                  onChange={handleMessageTableChange}
                />
              </div>
            ),
          },
          {
            key: 'do-not-contact',
            label: '不再联系',
            children: (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      doNotContactForm.resetFields();
                      doNotContactForm.setFieldsValue({ reasonType: 'manual' });
                      setDoNotContactModalOpen(true);
                    }}
                  >
                    新增邮箱
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => void doNotContactQuery.refetch()}
                  >
                    刷新
                  </Button>
                </div>
                <Table<SalesEmailDoNotContact>
                  rowKey={(record) => String(record.id)}
                  columns={doNotContactColumns}
                  dataSource={doNotContactQuery.data?.data || []}
                  loading={
                    doNotContactQuery.isLoading || doNotContactQuery.isFetching
                  }
                  size="middle"
                  scroll={{ x: 960 }}
                  pagination={{
                    pageSize: 10,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="暂无不再联系邮箱"
                      />
                    ),
                  }}
                />
              </div>
            ),
          },
        ]}
      />

      <Drawer
        title={editingAccount ? '编辑邮箱' : '新增邮箱'}
        open={accountDrawerOpen}
        size={640}
        destroyOnHidden
        onClose={() => {
          setAccountDrawerOpen(false);
          setEditingAccount(undefined);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setAccountDrawerOpen(false);
                setEditingAccount(undefined);
              }}
            >
              取消
            </Button>
            <Button
              type="primary"
              loading={saveAccountMutation.isPending}
              onClick={() => accountForm.submit()}
            >
              保存
            </Button>
          </div>
        }
      >
        <Form<AccountFormValues>
          form={accountForm}
          layout="vertical"
          initialValues={toAccountFormValues()}
          onFinish={(values) => saveAccountMutation.mutate(values)}
        >
          <Form.Item label="配置模板">
            <Select
              allowClear
              placeholder="选择模板"
              options={providerPresets.map((item) => ({
                label: item.label,
                value: item.label,
              }))}
              onChange={(value) => value && applyPreset(value)}
            />
          </Form.Item>
          <Form.Item
            name="accountName"
            label="邮箱名称"
            rules={[{ required: true, message: '请输入邮箱名称' }]}
          >
            <Input placeholder="邮箱名称" />
          </Form.Item>
          <Form.Item
            name="emailAddress"
            label="发件邮箱"
            rules={[
              { required: true, message: '请输入发件邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input placeholder="name@example.com" />
          </Form.Item>
          <Form.Item name="fromName" label="发件人名称">
            <Input placeholder="发件人名称" />
          </Form.Item>
          <Form.Item name="providerLabel" label="服务商">
            <Input placeholder="服务商" />
          </Form.Item>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <Form.Item
              name="smtpHost"
              label="SMTP服务器"
              rules={[{ required: true, message: '请输入SMTP服务器' }]}
            >
              <Input placeholder="smtp.example.com" />
            </Form.Item>
            <Form.Item
              name="smtpPort"
              label="SMTP端口"
              rules={[{ required: true, message: '请输入SMTP端口' }]}
            >
              <InputNumber min={1} max={65535} className="w-full" />
            </Form.Item>
            <Form.Item name="smtpEncryption" label="SMTP加密">
              <Select options={encryptionOptions} />
            </Form.Item>
            <Form.Item
              name="smtpUsername"
              label="SMTP用户名"
              rules={[{ required: true, message: '请输入SMTP用户名' }]}
            >
              <Input placeholder="SMTP用户名" />
            </Form.Item>
          </div>
          <Form.Item
            name="smtpAuthSecret"
            label={editingAccount ? 'SMTP授权码' : 'SMTP授权码'}
            rules={
              editingAccount
                ? undefined
                : [{ required: true, message: '请输入SMTP授权码' }]
            }
          >
            <Input.Password
              placeholder={editingAccount ? '不修改可留空' : 'SMTP授权码'}
            />
          </Form.Item>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
            <Form.Item
              name="imapEnabled"
              label="启用IMAP"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item name="enabled" label="启用邮箱" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item
              name="defaultFlag"
              label="默认邮箱"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) =>
              getFieldValue('imapEnabled') ? (
                <>
                  <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                    <Form.Item
                      name="imapHost"
                      label="IMAP服务器"
                      rules={[{ required: true, message: '请输入IMAP服务器' }]}
                    >
                      <Input placeholder="imap.example.com" />
                    </Form.Item>
                    <Form.Item
                      name="imapPort"
                      label="IMAP端口"
                      rules={[{ required: true, message: '请输入IMAP端口' }]}
                    >
                      <InputNumber min={1} max={65535} className="w-full" />
                    </Form.Item>
                    <Form.Item name="imapEncryption" label="IMAP加密">
                      <Select options={encryptionOptions} />
                    </Form.Item>
                    <Form.Item
                      name="imapUsername"
                      label="IMAP用户名"
                      rules={[{ required: true, message: '请输入IMAP用户名' }]}
                    >
                      <Input placeholder="IMAP用户名" />
                    </Form.Item>
                  </div>
                  <Form.Item
                    name="imapAuthSecret"
                    label="IMAP授权码"
                    rules={
                      editingAccount
                        ? undefined
                        : [{ required: true, message: '请输入IMAP授权码' }]
                    }
                  >
                    <Input.Password
                      placeholder={
                        editingAccount ? '不修改可留空' : 'IMAP授权码'
                      }
                    />
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title="邮件事件"
        open={Boolean(eventMessage)}
        size={720}
        destroyOnHidden
        onClose={() => setEventMessage(undefined)}
      >
        <Table<SalesEmailEvent>
          rowKey={(record, index) => String(record.id || index)}
          columns={eventColumns}
          dataSource={eventQuery.data?.data || []}
          loading={eventQuery.isLoading || eventQuery.isFetching}
          pagination={false}
          size="small"
          scroll={{ x: 720 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无事件"
              />
            ),
          }}
        />
      </Drawer>

      <Modal
        title="新增不再联系"
        open={doNotContactModalOpen}
        okText="保存"
        confirmLoading={addDoNotContactMutation.isPending}
        onCancel={() => setDoNotContactModalOpen(false)}
        onOk={() => doNotContactForm.submit()}
      >
        <Form<DoNotContactFormValues>
          form={doNotContactForm}
          layout="vertical"
          initialValues={{ reasonType: 'manual' }}
          onFinish={(values) => addDoNotContactMutation.mutate(values)}
        >
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input placeholder="name@example.com" />
          </Form.Item>
          <Form.Item name="reasonType" label="原因类型">
            <Select options={reasonTypeOptions} />
          </Form.Item>
          <Form.Item name="reason" label="原因">
            <Input.TextArea rows={3} placeholder="原因" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default SalesEmailOutreachPage;
