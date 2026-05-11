import {
  ApartmentOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormCheckbox,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import { Helmet, SelectLang, useIntl, useModel } from '@umijs/max';
import { Alert, App, Button, Form } from 'antd';
import { createStyles } from 'antd-style';
import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { clearCachedRuoyiMenuData } from '@/adapters/ruoyi/menu';
import { RuoyiError } from '@/adapters/ruoyi/response';
import { setToken } from '@/adapters/ruoyi/token';
import { Footer } from '@/components';
import {
  getCodeImg,
  getTenantList,
  login,
  type TenantInfo,
} from '@/services/ruoyi/auth';
import Settings from '../../../../config/defaultSettings';

type LoginFormValues = {
  tenantId?: string;
  username?: string;
  password?: string;
  rememberMe?: boolean;
  code?: string;
  uuid?: string;
};

type TenantOption = NonNullable<TenantInfo['voList']>[number];

const defaultTenantId = '000000';
const loginPath = '/user/login';

const canUseStorage = () => typeof localStorage !== 'undefined';

const getStoredLoginValues = (): LoginFormValues => {
  if (!canUseStorage()) {
    return {
      tenantId: defaultTenantId,
      rememberMe: false,
    };
  }

  const rememberMe = localStorage.getItem('rememberMe') === 'true';
  const username = localStorage.getItem('username') || undefined;
  const tenantId = localStorage.getItem('tenantId') || defaultTenantId;

  return {
    tenantId,
    username,
    rememberMe,
  };
};

const getInitialLoginValues = (): LoginFormValues => ({
  tenantId: defaultTenantId,
  rememberMe: false,
  ...getStoredLoginValues(),
});

const getCaptchaMimeType = (base64: string) => {
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
};

const toCaptchaImageSrc = (img?: string) => {
  const normalizedImg = (img || '').trim();
  if (!normalizedImg) return '';
  if (normalizedImg.startsWith('data:image/')) return normalizedImg;

  return `data:${getCaptchaMimeType(normalizedImg)};base64,${normalizedImg}`;
};

const rememberLoginValues = (values: LoginFormValues) => {
  if (!canUseStorage()) return;

  if (values.rememberMe) {
    localStorage.setItem('tenantId', values.tenantId || defaultTenantId);
    localStorage.setItem('username', values.username || '');
    localStorage.setItem('rememberMe', 'true');
    localStorage.removeItem('password');
    return;
  }

  localStorage.removeItem('tenantId');
  localStorage.removeItem('username');
  localStorage.removeItem('password');
  localStorage.removeItem('rememberMe');
};

const useStyles = createStyles(({ token }) => {
  return {
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
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
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
  };
});

const Lang = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.lang} data-lang>
      {SelectLang && <SelectLang />}
    </div>
  );
};

const LoginMessage: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <Alert
      style={{
        marginBottom: 24,
      }}
      message={content}
      type="error"
      showIcon
    />
  );
};

const Login: React.FC = () => {
  const [form] = Form.useForm<LoginFormValues>();
  const [tenantEnabled, setTenantEnabled] = useState(true);
  const [tenantList, setTenantList] = useState<TenantOption[]>([]);
  const [captchaEnabled, setCaptchaEnabled] = useState(true);
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [initError, setInitError] = useState('');
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const { message } = App.useApp();
  const intl = useIntl();

  const tenantOptions = useMemo(
    () =>
      tenantList.map((item) => ({
        label: item.companyName,
        value: item.tenantId,
      })),
    [tenantList],
  );

  const getSafeRedirectUrl = (redirect: string | null): string => {
    if (!redirect?.startsWith('/')) return '/';
    if (redirect.startsWith('//')) return '/';

    try {
      const parsed = new URL(redirect, window.location.origin);
      if (parsed.origin !== window.location.origin) return '/';
      if (parsed.pathname === loginPath) return '/';
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return '/';
    }
  };

  const refreshCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const response = await getCodeImg();
      const nextCaptchaEnabled = response.data?.captchaEnabled ?? true;
      setCaptchaEnabled(nextCaptchaEnabled);

      if (nextCaptchaEnabled) {
        form.setFieldsValue({
          code: '',
          uuid: response.data?.uuid,
        });
        setCaptchaImage(toCaptchaImageSrc(response.data?.img));
        return;
      }

      form.setFieldsValue({
        code: undefined,
        uuid: undefined,
      });
      setCaptchaImage('');
    } catch {
      setInitError('验证码加载失败，请稍后重试。');
    } finally {
      setCaptchaLoading(false);
    }
  }, [form]);

  const initTenantList = useCallback(async () => {
    try {
      const response = await getTenantList(false);
      const nextTenantEnabled = response.data?.tenantEnabled ?? true;
      const nextTenantList = response.data?.voList || [];
      setTenantEnabled(nextTenantEnabled);
      setTenantList(nextTenantList);

      if (nextTenantEnabled) {
        const currentTenantId = form.getFieldValue('tenantId');
        form.setFieldsValue({
          tenantId:
            currentTenantId || nextTenantList[0]?.tenantId || defaultTenantId,
        });
      }
    } catch {
      setInitError('租户列表加载失败，请稍后重试。');
    }
  }, [form]);

  useEffect(() => {
    form.setFieldsValue(getInitialLoginValues());
    void refreshCaptcha();
    void initTenantList();
  }, [form, initTenantList, refreshCaptcha]);

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      startTransition(() => {
        setInitialState((s) => ({
          ...s,
          currentUser: userInfo,
        }));
      });
    }
  };

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      const response = await login({
        tenantId: values.tenantId || defaultTenantId,
        username: values.username?.trim(),
        password: values.password,
        rememberMe: values.rememberMe,
        code: values.code,
        uuid: values.uuid,
      });
      const accessToken = response.data?.access_token;

      if (!accessToken) {
        throw new Error('登录接口未返回 access_token。');
      }

      setToken(accessToken);
      clearCachedRuoyiMenuData();
      rememberLoginValues(values);
      message.success('登录成功');
      await fetchUserInfo();

      const urlParams = new URL(window.location.href).searchParams;
      const redirectUrl = getSafeRedirectUrl(urlParams.get('redirect'));
      window.location.href = redirectUrl;
    } catch (error) {
      if (!(error instanceof RuoyiError)) {
        message.error(
          error instanceof Error ? error.message : '登录失败，请重试。',
        );
      }
      form.setFieldsValue({
        password: '',
      });
      if (captchaEnabled) {
        void refreshCaptcha();
      }
    }
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'menu.login',
            defaultMessage: '登录',
          })}
          {Settings.title && ` - ${Settings.title}`}
        </title>
      </Helmet>
      <Lang />
      <div
        style={{
          flex: '1',
          padding: '32px 0',
        }}
      >
        <LoginForm<LoginFormValues>
          form={form}
          contentStyle={{
            minWidth: 280,
            maxWidth: '75vw',
          }}
          logo={<img alt="logo" src="/logo.svg" />}
          title={Settings.title || 'Recov AI'}
          subTitle="请输入账号信息登录系统"
          initialValues={getInitialLoginValues()}
          onFinish={handleSubmit}
        >
          {initError && <LoginMessage content={initError} />}

          {tenantEnabled && (
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
              rules={[
                {
                  required: true,
                  message: '请选择租户',
                },
              ]}
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
            rules={[
              {
                required: true,
                message: '请输入用户名',
              },
            ]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{
              size: 'large',
              prefix: <LockOutlined />,
              autoComplete: 'current-password',
            }}
            placeholder="密码"
            rules={[
              {
                required: true,
                message: '请输入密码',
              },
            ]}
          />

          <Form.Item name="uuid" hidden>
            <input type="hidden" />
          </Form.Item>

          {captchaEnabled && (
            <div className={styles.captchaRow}>
              <ProFormText
                name="code"
                formItemProps={{
                  className: styles.captchaInput,
                }}
                fieldProps={{
                  size: 'large',
                  prefix: <SafetyCertificateOutlined />,
                  autoComplete: 'off',
                }}
                placeholder="验证码"
                rules={[
                  {
                    required: true,
                    message: '请输入验证码',
                  },
                ]}
              />
              {captchaImage ? (
                <button
                  aria-label="refresh captcha"
                  className={styles.captchaImageButton}
                  disabled={captchaLoading}
                  title="刷新验证码"
                  type="button"
                  onClick={() => void refreshCaptcha()}
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
                  onClick={() => void refreshCaptcha()}
                />
              )}
            </div>
          )}

          <div
            style={{
              marginBottom: 24,
            }}
          >
            <ProFormCheckbox noStyle name="rememberMe">
              记住账号
            </ProFormCheckbox>
          </div>
        </LoginForm>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
