import {
  CheckCircleOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ProFormInstance } from '@ant-design/pro-components';
import {
  PageContainer,
  ProForm,
  ProFormDependency,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Modal,
  message,
  Space,
  Tag,
  Upload,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import { PermissionButton } from '@/components/Permission';
import {
  disablePaymentChannelConfig,
  enablePaymentChannelConfig,
  getPaymentChannelConfig,
  type PaymentChannelConfig,
  type PaymentChannelConfigSavePayload,
  savePaymentChannelConfig,
  validatePaymentChannelConfig,
} from '@/modules/billing/services/payment';

type WechatConfigForm = PaymentChannelConfigSavePayload;

const statusMeta = {
  DRAFT: { color: 'default', text: '草稿' },
  ENABLED: { color: 'success', text: '已启用' },
  DISABLED: { color: 'warning', text: '已停用' },
} as const;

const validationMeta = {
  UNVALIDATED: { color: 'default', text: '未检查' },
  VALID: { color: 'success', text: '配置检查通过' },
  INVALID: { color: 'error', text: '配置检查失败' },
} as const;

type SecretFieldName =
  | 'merchantPrivateKeyPem'
  | 'merchantCertificatePem'
  | 'wechatPayPublicKeyPem'
  | 'apiV3Key';

const secretFieldNames: SecretFieldName[] = [
  'merchantPrivateKeyPem',
  'merchantCertificatePem',
  'wechatPayPublicKeyPem',
  'apiV3Key',
];

const secretTag = (configured?: boolean) => (
  <Tag color={configured ? 'success' : 'default'}>
    {configured ? '已配置' : '未配置'}
  </Tag>
);

const toFormValues = (config: PaymentChannelConfig): WechatConfigForm => ({
  version: config.version,
  configName: config.configName,
  nativeEnabled: config.nativeEnabled,
  miniProgramEnabled: config.miniProgramEnabled,
  nativeAppId: config.nativeAppId,
  miniProgramAppId: config.miniProgramAppId,
  merchantId: config.merchantId,
  merchantSerialNumber: config.merchantSerialNumber,
  verificationMode: config.verificationMode || 'PUBLIC_KEY',
  wechatPayPublicKeyId: config.wechatPayPublicKeyId,
  paymentNotifyUrl: config.paymentNotifyUrl,
  refundNotifyUrl: config.refundNotifyUrl,
  remark: config.remark,
});

const PaymentChannelConfigPage = () => {
  const formRef = useRef<ProFormInstance<WechatConfigForm>>(undefined);
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [config, setConfig] = useState<PaymentChannelConfig>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stagedSecretFiles, setStagedSecretFiles] = useState<
    Partial<Record<SecretFieldName, string>>
  >({});
  const [pendingPemSecrets, setPendingPemSecrets] = useState<
    Partial<Record<Exclude<SecretFieldName, 'apiV3Key'>, string>>
  >({});

  const clearSensitiveDrafts = () => {
    formRef.current?.resetFields(secretFieldNames);
    formRef.current?.setFieldsValue({
      merchantPrivateKeyPem: undefined,
      merchantCertificatePem: undefined,
      wechatPayPublicKeyPem: undefined,
      apiV3Key: undefined,
    });
    setStagedSecretFiles({});
    setPendingPemSecrets({});
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const next = await getPaymentChannelConfig('wechat');
      setConfig(next);
      clearSensitiveDrafts();
      formRef.current?.setFieldsValue(toFormValues(next));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const updateConfig = (next: PaymentChannelConfig) => {
    setConfig(next);
    clearSensitiveDrafts();
    formRef.current?.setFieldsValue(toFormValues(next));
  };

  const stageSecretFile = async (
    name: Exclude<SecretFieldName, 'apiV3Key'>,
    file: File,
  ) => {
    if (file.size > 64 * 1024) {
      messageApi.error('凭证文件不能超过64KB');
      return;
    }
    const content = (await file.text()).trim();
    if (!content) {
      messageApi.error('凭证文件内容不能为空');
      return;
    }
    setPendingPemSecrets((current) => ({ ...current, [name]: content }));
    setStagedSecretFiles((current) => ({
      ...current,
      [name]: file.name,
    }));
  };

  const clearStagedSecret = (name: SecretFieldName) => {
    if (name === 'apiV3Key') {
      formRef.current?.setFieldsValue({ apiV3Key: undefined });
    } else {
      setPendingPemSecrets((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
    }
    setStagedSecretFiles((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const secretFileField = (
    name: Exclude<SecretFieldName, 'apiV3Key'>,
    label: string,
    configured?: boolean,
  ) => (
    <Form.Item label={label}>
      <Space wrap>
        <Upload
          accept=".pem,.key,.crt,.cer"
          maxCount={1}
          showUploadList={false}
          beforeUpload={async (file) => {
            await stageSecretFile(name, file);
            return Upload.LIST_IGNORE;
          }}
        >
          <Button icon={<UploadOutlined />}>选择PEM文件</Button>
        </Upload>
        {stagedSecretFiles[name] ? (
          <>
            <Tag color="processing">待保存：{stagedSecretFiles[name]}</Tag>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => clearStagedSecret(name)}
            >
              移除
            </Button>
          </>
        ) : (
          secretTag(configured)
        )}
      </Space>
    </Form.Item>
  );

  const save = async (values: WechatConfigForm) => {
    if (!config) return false;
    setSubmitting(true);
    try {
      const next = await savePaymentChannelConfig('wechat', {
        ...values,
        ...pendingPemSecrets,
        version: config.version,
      });
      updateConfig(next);
      messageApi.success('微信支付配置已保存');
      return true;
    } finally {
      setSubmitting(false);
    }
  };

  const validate = async () => {
    setSubmitting(true);
    try {
      const next = await validatePaymentChannelConfig('wechat');
      updateConfig(next);
      if (next.validationStatus === 'VALID') {
        messageApi.success('配置检查通过');
      } else {
        messageApi.error(next.lastError || '配置检查失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const changeEnabled = (enable: boolean) => {
    modalApi.confirm({
      title: enable ? '启用微信支付' : '停用微信支付',
      content: enable
        ? '启用后，新支付订单将使用当前配置。'
        : '停用后不再创建新的微信支付订单，已有订单的查询、回调和退款仍会继续处理。',
      okText: enable ? '确认启用' : '确认停用',
      cancelText: '取消',
      autoFocusButton: 'cancel',
      onOk: async () => {
        setSubmitting(true);
        try {
          const next = enable
            ? await enablePaymentChannelConfig('wechat')
            : await disablePaymentChannelConfig('wechat');
          updateConfig(next);
          if (enable && next.status !== 'ENABLED') {
            messageApi.error(next.lastError || '配置未通过校验，不能启用');
            return;
          }
          messageApi.success(enable ? '微信支付已启用' : '微信支付已停用');
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const readOnly = config?.status === 'ENABLED';
  const currentStatus = statusMeta[config?.status || 'DRAFT'];
  const currentValidation =
    validationMeta[config?.validationStatus || 'UNVALIDATED'];

  return (
    <PageContainer
      title="支付渠道配置"
      onBack={() => history.push('/sys-conf/integrations')}
    >
      {messageContextHolder}
      {modalContextHolder}
      <Card loading={loading} variant="borderless">
        <Space orientation="vertical" size={20} style={{ width: '100%' }}>
          <Descriptions column={{ xs: 1, sm: 2, lg: 4 }} size="small">
            <Descriptions.Item label="支付渠道">微信支付</Descriptions.Item>
            <Descriptions.Item label="运行状态">
              <Tag color={currentStatus.color}>{currentStatus.text}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="配置检查">
              <Tag color={currentValidation.color}>
                {currentValidation.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="配置版本">
              {config?.version ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="商户私钥">
              {secretTag(config?.merchantPrivateKeyConfigured)}
            </Descriptions.Item>
            <Descriptions.Item label="商户证书">
              {secretTag(config?.merchantCertificateConfigured)}
            </Descriptions.Item>
            <Descriptions.Item label="APIv3密钥">
              {secretTag(config?.apiV3KeyConfigured)}
            </Descriptions.Item>
            <Descriptions.Item label="微信支付公钥">
              {secretTag(config?.wechatPayPublicKeyConfigured)}
            </Descriptions.Item>
          </Descriptions>

          {config?.lastError ? (
            <Alert type="error" showIcon title={config.lastError} />
          ) : null}

          <ProForm<WechatConfigForm>
            formRef={formRef}
            onFinish={save}
            disabled={readOnly}
            submitter={{
              render: (_, dom) => (
                <Space wrap>
                  <PermissionButton
                    permissions="payment:channel-config:edit"
                    type="primary"
                    htmlType="submit"
                    loading={submitting}
                    disabled={readOnly}
                  >
                    保存草稿
                  </PermissionButton>
                  <PermissionButton
                    permissions="payment:channel-config:validate"
                    icon={<SafetyCertificateOutlined />}
                    loading={submitting}
                    disabled={readOnly}
                    onClick={() => void validate()}
                  >
                    检查配置
                  </PermissionButton>
                  {config?.status === 'ENABLED' ? (
                    <PermissionButton
                      permissions="payment:channel-config:enable"
                      danger
                      loading={submitting}
                      onClick={() => changeEnabled(false)}
                    >
                      停用
                    </PermissionButton>
                  ) : (
                    <PermissionButton
                      permissions="payment:channel-config:enable"
                      icon={<CheckCircleOutlined />}
                      loading={submitting}
                      disabled={config?.validationStatus !== 'VALID'}
                      onClick={() => changeEnabled(true)}
                    >
                      启用
                    </PermissionButton>
                  )}
                  {dom.filter((item) => item.key === 'reset')}
                </Space>
              ),
            }}
          >
            <ProFormText
              name="configName"
              label="配置名称"
              rules={[{ required: true }, { max: 64 }]}
            />
            <ProFormSwitch name="nativeEnabled" label="Web Native二维码支付" />
            <ProFormDependency name={['nativeEnabled']}>
              {({ nativeEnabled }) =>
                nativeEnabled ? (
                  <ProFormText
                    name="nativeAppId"
                    label="Native应用AppID"
                    rules={[{ required: true }]}
                  />
                ) : null
              }
            </ProFormDependency>
            <ProFormSwitch name="miniProgramEnabled" label="微信小程序支付" />
            <ProFormDependency name={['miniProgramEnabled']}>
              {({ miniProgramEnabled }) =>
                miniProgramEnabled ? (
                  <ProFormText
                    name="miniProgramAppId"
                    label="小程序AppID"
                    rules={[{ required: true }]}
                  />
                ) : null
              }
            </ProFormDependency>
            <ProFormText
              name="merchantId"
              label="微信支付商户号"
              rules={[{ required: true }]}
            />
            <ProFormText
              name="merchantSerialNumber"
              label="商户API证书序列号"
              rules={[{ required: true }]}
            />
            <ProFormSelect
              name="verificationMode"
              label="微信支付验签方式"
              rules={[{ required: true }]}
              options={[
                { label: '微信支付公钥', value: 'PUBLIC_KEY' },
                { label: '微信支付平台证书', value: 'PLATFORM_CERTIFICATE' },
              ]}
            />
            <ProFormDependency name={['verificationMode']}>
              {({ verificationMode }) =>
                verificationMode === 'PUBLIC_KEY' ? (
                  <>
                    <ProFormText
                      name="wechatPayPublicKeyId"
                      label="微信支付公钥ID"
                      rules={[{ required: true }]}
                    />
                    {secretFileField(
                      'wechatPayPublicKeyPem',
                      '微信支付公钥',
                      config?.wechatPayPublicKeyConfigured,
                    )}
                  </>
                ) : null
              }
            </ProFormDependency>
            {secretFileField(
              'merchantPrivateKeyPem',
              '商户API私钥',
              config?.merchantPrivateKeyConfigured,
            )}
            {secretFileField(
              'merchantCertificatePem',
              '商户API证书',
              config?.merchantCertificateConfigured,
            )}
            <ProFormText.Password
              name="apiV3Key"
              label={
                <Space size={8}>
                  <span>APIv3密钥</span>
                  {stagedSecretFiles.apiV3Key ? (
                    <Tag color="processing">待保存</Tag>
                  ) : (
                    secretTag(config?.apiV3KeyConfigured)
                  )}
                </Space>
              }
              fieldProps={{
                autoComplete: 'new-password',
                onChange: (event) => {
                  setStagedSecretFiles((current) => ({
                    ...current,
                    apiV3Key: event.target.value ? '待保存' : undefined,
                  }));
                },
              }}
            />
            <ProFormText
              name="paymentNotifyUrl"
              label="支付结果通知地址"
              rules={[{ required: true }, { type: 'url' }]}
            />
            <ProFormText
              name="refundNotifyUrl"
              label="退款结果通知地址"
              rules={[{ required: true }, { type: 'url' }]}
            />
            <ProFormTextArea
              name="remark"
              label="备注"
              fieldProps={{ rows: 3 }}
            />
          </ProForm>
        </Space>
      </Card>
    </PageContainer>
  );
};

export default PaymentChannelConfigPage;
