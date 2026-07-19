import {
  ApartmentOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import { Helmet, SelectLang, useIntl } from '@umijs/max';
import { Alert, Button, Form } from 'antd';
import { createStyles } from 'antd-style';
import type React from 'react';
import { resolveSiteBranding } from '@/branding';
import { Footer } from '@/components';
import type { LoginFormValues, LoginLayoutProps } from '../types';

const useStyles = createStyles(({ token }) => ({
  lang: {
    width: 42,
    height: 42,
    lineHeight: '42px',
    position: 'fixed',
    right: 16,
    borderRadius: token.borderRadius,
    ':hover': {
      backgroundColor: token.colorBgTextHover,
    },
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'auto',
    background:
      'radial-gradient(circle at 18% 18%, rgba(114, 46, 209, 0.12), transparent 34%), radial-gradient(circle at 82% 76%, rgba(22, 119, 255, 0.10), transparent 36%), linear-gradient(145deg, #f8fafc 0%, #ffffff 48%, #f6f4ff 100%)',
  },
  captchaRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: token.marginXS,
  },
  captchaInput: {
    flex: 1,
    minWidth: 0,
  },
  captchaImageButton: {
    display: 'flex',
    flex: '0 0 112px',
    alignItems: 'center',
    justifyContent: 'center',
    width: 112,
    height: token.controlHeightLG,
    padding: 0,
    overflow: 'hidden',
    background: 'transparent',
    border: 0,
    borderRadius: token.borderRadius,
    cursor: 'pointer',
    '&:disabled': {
      cursor: 'wait',
      opacity: 0.65,
    },
  },
  captchaImage: {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: token.borderRadius,
  },
  captchaButton: {
    flex: '0 0 112px',
    width: 112,
    height: token.controlHeightLG,
  },
}));

const Lang = () => {
  const { styles } = useStyles();
  return (
    <div className={styles.lang} data-lang>
      {SelectLang && <SelectLang />}
    </div>
  );
};

const LoginMessage: React.FC<{ content: string }> = ({ content }) => (
  <Alert style={{ marginBottom: 24 }} title={content} type="error" showIcon />
);

const DefaultLoginLayout: React.FC<LoginLayoutProps> = ({
  captchaEnabled,
  captchaImage,
  captchaLoading,
  form,
  initError,
  onFinish,
  onRefreshCaptcha,
  showTenantSelector,
  siteConfig,
  submitDisabled,
  submitting,
  tenantOptions,
}) => {
  const { styles } = useStyles();
  const intl = useIntl();
  const branding = resolveSiteBranding(siteConfig);

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({ id: 'menu.login', defaultMessage: '登录' })}
          {branding.title && ` - ${branding.title}`}
        </title>
      </Helmet>
      <Lang />
      <div style={{ flex: '1', padding: '32px 0' }}>
        <LoginForm<LoginFormValues>
          form={form}
          contentStyle={{
            minWidth: 280,
            maxWidth: '75vw',
            marginTop: 72,
          }}
          logo={<img alt={branding.title} src={branding.logo} />}
          title={branding.title}
          subTitle={false}
          submitter={{
            submitButtonProps: {
              disabled: submitDisabled,
              loading: submitting,
            },
          }}
          onFinish={onFinish}
        >
          {initError && <LoginMessage content={initError} />}

          {showTenantSelector && (
            <ProFormSelect
              name="tenantId"
              fieldProps={{
                size: 'large',
                showSearch: true,
                prefix: <ApartmentOutlined />,
                optionFilterProp: 'label',
              }}
              placeholder="请选择租户"
              options={tenantOptions}
              rules={[{ required: true, message: '请选择租户' }]}
            />
          )}

          <ProFormText
            name="username"
            fieldProps={{
              size: 'large',
              prefix: <UserOutlined />,
              autoComplete: 'username',
            }}
            placeholder="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{
              size: 'large',
              prefix: <LockOutlined />,
              autoComplete: 'current-password',
            }}
            placeholder="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          />

          <Form.Item name="uuid" hidden>
            <input type="hidden" />
          </Form.Item>

          {captchaEnabled && (
            <div className={styles.captchaRow}>
              <ProFormText
                name="code"
                formItemProps={{ className: styles.captchaInput }}
                fieldProps={{
                  size: 'large',
                  prefix: <SafetyCertificateOutlined />,
                  autoComplete: 'off',
                }}
                placeholder="验证码"
                rules={[{ required: true, message: '请输入验证码' }]}
              />
              {captchaImage ? (
                <button
                  aria-label="refresh captcha"
                  className={styles.captchaImageButton}
                  disabled={captchaLoading}
                  title="刷新验证码"
                  type="button"
                  onClick={onRefreshCaptcha}
                >
                  <img
                    alt="验证码"
                    className={styles.captchaImage}
                    data-testid="captcha-image"
                    src={captchaImage}
                  />
                </button>
              ) : (
                <Button
                  aria-label="refresh captcha"
                  className={styles.captchaButton}
                  icon={<ReloadOutlined />}
                  loading={captchaLoading}
                  title="刷新验证码"
                  onClick={onRefreshCaptcha}
                />
              )}
            </div>
          )}
        </LoginForm>
      </div>
      <Footer title={branding.title} />
    </div>
  );
};

export default DefaultLoginLayout;
