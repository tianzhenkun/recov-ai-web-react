import {
  CheckCircleOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import type { TableColumnsType } from 'antd';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  message,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  checkOAuthProviderConfig,
  disableOAuthProviderConfig,
  enableOAuthProviderConfig,
  getOAuthProviderConfig,
  listOAuthProviderConfigs,
  listOAuthProviders,
  type OAuthProviderConfig,
  type OAuthProviderDefinition,
  saveOAuthProviderConfig,
} from '@/modules/admin/services/oauth-config';
import {
  isOAuthRevisionConflict,
  mergeOAuthProviderRows,
  OAUTH_SCOPE_MAX_COUNT,
  type OAuthProviderFormValues,
  type OAuthProviderRow,
  toOAuthProviderFormValues,
  toOAuthProviderSavePayload,
  validateOAuthScopes,
} from './model';

const statusMeta = {
  DRAFT: { color: 'default', text: '草稿' },
  ENABLED: { color: 'success', text: '已启用' },
  DISABLED: { color: 'warning', text: '已停用' },
} as const;

const checkStatusMeta = {
  UNCHECKED: { color: 'default', text: '未检查' },
  PASSED: { color: 'success', text: '检查通过' },
  FAILED: { color: 'error', text: '检查失败' },
} as const;

type EditingProvider = {
  definition: OAuthProviderDefinition;
  config?: OAuthProviderConfig;
};

const secretState = (configured?: boolean) => (
  <Tag color={configured ? 'success' : 'default'}>
    {configured ? '已配置' : '未配置'}
  </Tag>
);

const providerSpecificFields = {
  unionId: new Set(['qq']),
  tenantId: new Set(['microsoft']),
  codingGroupName: new Set(['coding']),
  alipayPublicKey: new Set(['alipay_wallet']),
  agentId: new Set(['wechat_enterprise']),
  stackOverflowKey: new Set(['stack_overflow']),
  serverUrl: new Set(['gitea', 'maxkey', 'topiam']),
} as const;

const OAuthProviderConfigPage = () => {
  const [form] = Form.useForm<OAuthProviderFormValues>();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [definitions, setDefinitions] = useState<OAuthProviderDefinition[]>([]);
  const [configs, setConfigs] = useState<OAuthProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingProvider>();
  const [detailLoadingCode, setDetailLoadingCode] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [actionCode, setActionCode] = useState<string>();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [providerDefinitions, providerConfigs] = await Promise.all([
        listOAuthProviders(),
        listOAuthProviderConfigs(),
      ]);
      setDefinitions(providerDefinitions || []);
      setConfigs(providerConfigs || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const rows = useMemo(
    () => mergeOAuthProviderRows(definitions, configs),
    [configs, definitions],
  );

  const refreshAfterConflict = async (
    providerCode: string,
    keepEditorOpen: boolean,
  ) => {
    await loadData();
    if (keepEditorOpen) {
      const latest = await getOAuthProviderConfig(providerCode);
      const definition = definitions.find(
        (item) => item.providerCode === providerCode,
      ) || {
        providerCode,
        displayName: latest.displayName || providerCode,
      };
      setEditing({ definition, config: latest });
      form.resetFields();
      form.setFieldsValue(toOAuthProviderFormValues(latest));
    }
    messageApi.warning('配置已被其他操作更新，已刷新为最新版本，请重新确认');
  };

  const openEditor = async (row: OAuthProviderRow) => {
    const definition = {
      providerCode: row.providerCode,
      displayName: row.displayName,
    };
    setDetailLoadingCode(row.providerCode);
    try {
      const config = row.configured
        ? await getOAuthProviderConfig(row.providerCode)
        : undefined;
      setEditing({ definition, config });
      form.resetFields();
      form.setFieldsValue({
        configName: config?.configName || row.displayName,
        ...toOAuthProviderFormValues(config),
      });
    } finally {
      setDetailLoadingCode(undefined);
    }
  };

  const closeEditor = () => {
    setEditing(undefined);
    form.resetFields();
  };

  const save = async (values: OAuthProviderFormValues) => {
    if (!editing) return;
    setSubmitting(true);
    try {
      await saveOAuthProviderConfig(
        editing.definition.providerCode,
        toOAuthProviderSavePayload(values, editing.config?.revision),
      );
      messageApi.success('OAuth Provider 配置已保存为草稿');
      closeEditor();
      await loadData();
    } catch (error) {
      if (isOAuthRevisionConflict(error)) {
        await refreshAfterConflict(editing.definition.providerCode, true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const checkConfig = async (row: OAuthProviderRow) => {
    if (!row.configured || row.revision === undefined) return;
    setActionCode(row.providerCode);
    try {
      const next = await checkOAuthProviderConfig(
        row.providerCode,
        row.revision,
      );
      if (next.checkStatus === 'PASSED') {
        messageApi.success('配置检查通过');
      } else {
        messageApi.error(next.lastErrorMessage || '配置检查失败');
      }
      await loadData();
    } catch (error) {
      if (isOAuthRevisionConflict(error)) {
        await refreshAfterConflict(row.providerCode, false);
      }
    } finally {
      setActionCode(undefined);
    }
  };

  const changeEnabled = (row: OAuthProviderRow, enable: boolean) => {
    const revision = row.revision;
    if (revision === undefined) return;
    modalApi.confirm({
      title: enable
        ? `启用 ${row.displayName} 第三方登录`
        : `停用 ${row.displayName} 第三方登录`,
      content: enable
        ? '启用后，Auth 可读取当前配置处理该 Provider 的新授权请求。'
        : '停用后，Auth 不再接受该 Provider 的新授权请求；已建立的用户登录态不受影响。',
      okText: enable ? '确认启用' : '确认停用',
      cancelText: '取消',
      focusable: { autoFocusButton: 'cancel' },
      okButtonProps: enable ? undefined : { danger: true },
      onOk: async () => {
        setActionCode(row.providerCode);
        try {
          if (enable) {
            const next = await enableOAuthProviderConfig(
              row.providerCode,
              revision,
            );
            if (next.status === 'ENABLED' && next.checkStatus === 'PASSED') {
              messageApi.success('Provider 已启用');
            } else {
              messageApi.error(next.lastErrorMessage || 'Provider 启用失败');
            }
          } else {
            await disableOAuthProviderConfig(row.providerCode, revision);
            messageApi.success('Provider 已停用');
          }
          await loadData();
        } catch (error) {
          if (isOAuthRevisionConflict(error)) {
            await refreshAfterConflict(row.providerCode, false);
          }
        } finally {
          setActionCode(undefined);
        }
      },
    });
  };

  const columns: TableColumnsType<OAuthProviderRow> = [
    {
      title: 'Provider',
      key: 'provider',
      width: 190,
      render: (_, row) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{row.displayName}</Typography.Text>
          <Typography.Text type="secondary" code>
            {row.providerCode}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '配置名称',
      dataIndex: 'configName',
      width: 180,
      render: (value?: string) => value || '-',
    },
    {
      title: '状态',
      key: 'status',
      width: 130,
      render: (_, row) => {
        if (!row.configured) return <Tag>未配置</Tag>;
        const meta = statusMeta[row.status || 'DRAFT'];
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: '配置检查',
      key: 'checkStatus',
      width: 190,
      render: (_, row) => {
        if (!row.configured) return '-';
        const meta = checkStatusMeta[row.checkStatus || 'UNCHECKED'];
        const statusTag = <Tag color={meta.color}>{meta.text}</Tag>;
        return (
          <Space orientation="vertical" size={0}>
            {row.checkStatus === 'FAILED' && row.lastErrorMessage ? (
              <Tooltip title={row.lastErrorMessage}>{statusTag}</Tooltip>
            ) : (
              statusTag
            )}
            {row.lastCheckTime ? (
              <Typography.Text type="secondary">
                {dayjs(row.lastCheckTime).format('YYYY-MM-DD HH:mm:ss')}
              </Typography.Text>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: 'Client ID',
      dataIndex: 'clientId',
      width: 190,
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    {
      title: '回调地址',
      dataIndex: 'redirectUri',
      width: 280,
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    {
      title: '应用密钥',
      key: 'secret',
      width: 110,
      render: (_, row) =>
        row.configured ? secretState(row.clientSecretConfigured) : '-',
    },
    {
      title: 'revision',
      dataIndex: 'revision',
      width: 90,
      render: (value) => value ?? '-',
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 260,
      render: (_, row) => {
        if (!row.configured) {
          return (
            <Button
              type="link"
              icon={<PlusOutlined />}
              aria-label={`新增配置${row.displayName}`}
              loading={detailLoadingCode === row.providerCode}
              onClick={() => void openEditor(row)}
            >
              配置
            </Button>
          );
        }

        const enabled = row.status === 'ENABLED';
        const actionLoading = actionCode === row.providerCode;
        return (
          <Space size={4} wrap>
            <Button
              type="link"
              icon={<EditOutlined />}
              aria-label={`编辑配置${row.displayName}`}
              disabled={enabled}
              loading={detailLoadingCode === row.providerCode}
              onClick={() => void openEditor(row)}
            >
              编辑
            </Button>
            <Button
              type="link"
              icon={<SafetyCertificateOutlined />}
              aria-label={`检查配置${row.displayName}`}
              disabled={enabled}
              loading={actionLoading}
              onClick={() => void checkConfig(row)}
            >
              检查
            </Button>
            {enabled ? (
              <Button
                type="link"
                danger
                icon={<StopOutlined />}
                aria-label={`停用配置${row.displayName}`}
                loading={actionLoading}
                onClick={() => changeEnabled(row, false)}
              >
                停用
              </Button>
            ) : (
              <Button
                type="link"
                icon={<CheckCircleOutlined />}
                aria-label={`启用配置${row.displayName}`}
                disabled={row.checkStatus !== 'PASSED'}
                loading={actionLoading}
                onClick={() => changeEnabled(row, true)}
              >
                启用
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  const existingSecret = editing?.config?.clientSecretConfigured;
  const existingStackOverflowKey = editing?.config?.stackOverflowKeyConfigured;
  const editingProviderCode = editing?.definition.providerCode;

  return (
    <PageContainer
      title="第三方登录配置"
      onBack={() => history.push('/sys-conf/integrations')}
      extra={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => void loadData()}
        >
          刷新
        </Button>,
      ]}
    >
      {messageContextHolder}
      {modalContextHolder}
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          showIcon
          type="info"
          title="配置检查说明"
          description="配置检查仅执行字段完整性、URL 格式与密文可解密检查，不代表第三方凭据、网络连通性或实际授权有效。"
        />
        <Card variant="borderless">
          <Table<OAuthProviderRow>
            rowKey="providerCode"
            columns={columns}
            dataSource={rows}
            loading={loading}
            pagination={false}
            scroll={{ x: 1600 }}
          />
        </Card>
      </Space>

      <Modal
        open={Boolean(editing)}
        title={
          editing
            ? `${editing.config ? '编辑' : '新增'} ${editing.definition.displayName}`
            : 'OAuth Provider 配置'
        }
        width={760}
        okText="保存配置"
        cancelText="取消"
        confirmLoading={submitting}
        onOk={() => form.submit()}
        onCancel={closeEditor}
      >
        <Form<OAuthProviderFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => void save(values)}
        >
          <Form.Item
            name="configName"
            label="配置名称"
            rules={[
              { required: true, message: '请输入配置名称' },
              { max: 128 },
            ]}
          >
            <Input maxLength={128} />
          </Form.Item>
          <Form.Item
            name="clientId"
            label="Client ID"
            rules={[
              { required: true, message: '请输入 Client ID' },
              { max: 512 },
            ]}
          >
            <Input autoComplete="off" maxLength={512} />
          </Form.Item>
          <Form.Item
            name="clientSecret"
            label="应用密钥"
            extra={
              <Space size={8}>
                {secretState(existingSecret)}
                <Typography.Text type="secondary">
                  {existingSecret ? '留空将保留现有密钥' : '首次配置必须填写'}
                </Typography.Text>
              </Space>
            }
            rules={
              existingSecret
                ? [{ max: 8192 }]
                : [
                    {
                      required: true,
                      whitespace: true,
                      message: '请输入应用密钥',
                    },
                    { max: 8192 },
                  ]
            }
          >
            <Input.Password autoComplete="new-password" maxLength={8192} />
          </Form.Item>
          <Form.Item
            name="redirectUri"
            label="回调地址"
            rules={[
              { required: true, message: '请输入回调地址' },
              { type: 'url', message: '请输入有效的 URL' },
              { max: 2048 },
            ]}
          >
            <Input maxLength={2048} />
          </Form.Item>
          <Form.Item
            name="scopes"
            label="授权范围"
            rules={[
              {
                validator: async (_, scopes?: string[]) => {
                  const validationError = validateOAuthScopes(scopes);
                  if (validationError) throw new Error(validationError);
                },
              },
            ]}
          >
            <Select
              mode="tags"
              maxCount={OAUTH_SCOPE_MAX_COUNT}
              tokenSeparators={[',', ' ']}
              placeholder="输入 scope 后回车，可配置多个"
            />
          </Form.Item>
          {editingProviderCode &&
          providerSpecificFields.unionId.has(editingProviderCode) ? (
            <Form.Item
              name="unionId"
              label="申请 UnionID"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          ) : null}
          {editingProviderCode &&
          providerSpecificFields.tenantId.has(editingProviderCode) ? (
            <Form.Item
              name="tenantId"
              label="Microsoft Entra Tenant ID"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: '请输入 Tenant ID',
                },
                { max: 256 },
              ]}
            >
              <Input maxLength={256} />
            </Form.Item>
          ) : null}
          {editingProviderCode &&
          providerSpecificFields.codingGroupName.has(editingProviderCode) ? (
            <Form.Item name="codingGroupName" label="Coding 企业名称">
              <Input maxLength={256} />
            </Form.Item>
          ) : null}
          {editingProviderCode &&
          providerSpecificFields.alipayPublicKey.has(editingProviderCode) ? (
            <Form.Item
              name="alipayPublicKey"
              label="支付宝公钥"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: '请输入支付宝公钥',
                },
                { max: 8192 },
              ]}
            >
              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 6 }}
                maxLength={8192}
              />
            </Form.Item>
          ) : null}
          {editingProviderCode &&
          providerSpecificFields.agentId.has(editingProviderCode) ? (
            <Form.Item
              name="agentId"
              label="企业微信 Agent ID"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: '请输入 Agent ID',
                },
                { max: 256 },
              ]}
            >
              <Input maxLength={256} />
            </Form.Item>
          ) : null}
          {editingProviderCode &&
          providerSpecificFields.stackOverflowKey.has(editingProviderCode) ? (
            <Form.Item
              name="stackOverflowKey"
              label="Stack Overflow API Key"
              extra={
                <Space size={8}>
                  {secretState(existingStackOverflowKey)}
                  {existingStackOverflowKey ? (
                    <Typography.Text type="secondary">
                      留空将保留现有 Key
                    </Typography.Text>
                  ) : null}
                </Space>
              }
              rules={
                existingStackOverflowKey
                  ? [{ max: 8192 }]
                  : [
                      {
                        required: true,
                        whitespace: true,
                        message: '请输入 Stack Overflow API Key',
                      },
                      { max: 8192 },
                    ]
              }
            >
              <Input.Password autoComplete="new-password" maxLength={8192} />
            </Form.Item>
          ) : null}
          <Form.Item name="deviceId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="clientOsType" hidden>
            <Input />
          </Form.Item>
          {editingProviderCode &&
          providerSpecificFields.serverUrl.has(editingProviderCode) ? (
            <Form.Item
              name="serverUrl"
              label="自建服务地址"
              rules={[
                { required: true, message: '请输入自建服务地址' },
                { type: 'url', message: '请输入有效的 URL' },
                { max: 2048 },
              ]}
            >
              <Input maxLength={2048} />
            </Form.Item>
          ) : null}
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default OAuthProviderConfigPage;
