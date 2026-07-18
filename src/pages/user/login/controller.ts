import { useModel } from '@umijs/max';
import { App, Form } from 'antd';
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { clearCachedRuoyiMenuData } from '@/adapters/ruoyi/menu';
import { RuoyiError } from '@/adapters/ruoyi/response';
import { setToken } from '@/adapters/ruoyi/token';
import {
  getCodeImg,
  getSiteConfig,
  getTenantList,
  type LoginData,
  login,
  type SiteConfig,
} from '@/services/ruoyi/auth';
import type {
  LoginFormValues,
  LoginInitErrors,
  LoginLayoutProps,
  TenantOption,
} from './types';

const defaultTenantId = '000000';
const loginPath = '/user/login';
const rememberedTenantIdKey = 'loginTenantId';

const canUseStorage = () => typeof localStorage !== 'undefined';

const getRememberedTenantId = () => {
  if (!canUseStorage()) return undefined;
  return localStorage.getItem(rememberedTenantIdKey) || undefined;
};

const clearLegacyLoginCache = () => {
  if (!canUseStorage()) return;
  localStorage.removeItem('tenantId');
  localStorage.removeItem('username');
  localStorage.removeItem('password');
  localStorage.removeItem('rememberMe');
};

const rememberTenantId = (tenantId?: string) => {
  if (!canUseStorage() || !tenantId) return;
  clearLegacyLoginCache();
  localStorage.setItem(rememberedTenantIdKey, tenantId);
};

export const resolveTenantId = (
  tenantList: TenantOption[],
  currentTenantId?: string,
  rememberedTenantId = getRememberedTenantId(),
) => {
  if (tenantList.some((item) => item.tenantId === currentTenantId)) {
    return currentTenantId;
  }
  if (tenantList.some((item) => item.tenantId === rememberedTenantId)) {
    return rememberedTenantId;
  }
  return tenantList[0]?.tenantId || defaultTenantId;
};

export const shouldLoadTenantList = (tenantMode: SiteConfig['tenantMode']) =>
  tenantMode === 'SELECTABLE';

export const buildLoginRequest = (
  values: LoginFormValues,
  tenantMode: SiteConfig['tenantMode'],
): LoginData => ({
  ...(tenantMode === 'SELECTABLE'
    ? { tenantId: values.tenantId || defaultTenantId }
    : {}),
  username: values.username?.trim(),
  password: values.password,
  code: values.code,
  uuid: values.uuid,
});

const getInitialLoginValues = (): LoginFormValues => ({
  tenantId: getRememberedTenantId() || defaultTenantId,
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

const getSafeRedirectUrl = (redirect: string | null): string => {
  if (!redirect?.startsWith('/') || redirect.startsWith('//')) return '/';
  try {
    const parsed = new URL(redirect, window.location.origin);
    if (parsed.origin !== window.location.origin) return '/';
    if (parsed.pathname === loginPath) return '/';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
};

const validateSiteConfig = (value?: SiteConfig): SiteConfig => {
  if (
    !value?.loginVariant?.trim() ||
    !['SELECTABLE', 'FIXED'].includes(value.tenantMode)
  ) {
    throw new Error('站点配置响应不完整。');
  }
  return value;
};

export const useLoginController = () => {
  const [form] = Form.useForm<LoginFormValues>();
  const [siteConfig, setSiteConfig] = useState<SiteConfig>();
  const [siteLoading, setSiteLoading] = useState(true);
  const [tenantEnabled, setTenantEnabled] = useState(false);
  const [tenantList, setTenantList] = useState<TenantOption[]>([]);
  const [captchaEnabled, setCaptchaEnabled] = useState(true);
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initErrors, setInitErrors] = useState<LoginInitErrors>({});
  const { initialState, setInitialState } = useModel('@@initialState');
  const { message } = App.useApp();

  const refreshCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const response = await getCodeImg();
      const nextCaptchaEnabled = response.data?.captchaEnabled ?? true;
      setCaptchaEnabled(nextCaptchaEnabled);
      if (nextCaptchaEnabled) {
        form.setFieldsValue({ code: '', uuid: response.data?.uuid });
        setCaptchaImage(toCaptchaImageSrc(response.data?.img));
      } else {
        form.setFieldsValue({ code: undefined, uuid: undefined });
        setCaptchaImage('');
      }
      setInitErrors((current) => ({ ...current, captcha: undefined }));
    } catch {
      setInitErrors((current) => ({
        ...current,
        captcha: '验证码加载失败，请稍后重试。',
      }));
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
      form.setFieldsValue({
        tenantId: nextTenantEnabled
          ? resolveTenantId(nextTenantList, form.getFieldValue('tenantId'))
          : defaultTenantId,
      });
      setInitErrors((current) => ({ ...current, tenant: undefined }));
    } catch {
      setTenantEnabled(false);
      setTenantList([]);
      setInitErrors((current) => ({
        ...current,
        tenant: '租户列表加载失败，请稍后重试。',
      }));
    }
  }, [form]);

  const initSite = useCallback(async () => {
    setSiteLoading(true);
    try {
      const response = await getSiteConfig();
      const nextSiteConfig = validateSiteConfig(response.data);
      setSiteConfig(nextSiteConfig);
      setInitErrors((current) => ({ ...current, site: undefined }));
      if (shouldLoadTenantList(nextSiteConfig.tenantMode)) {
        await initTenantList();
      } else {
        setTenantEnabled(false);
        setTenantList([]);
        form.setFieldsValue({ tenantId: undefined });
        setInitErrors((current) => ({ ...current, tenant: undefined }));
      }
    } catch (error) {
      setSiteConfig(undefined);
      setInitErrors((current) => ({
        ...current,
        site:
          error instanceof Error
            ? `站点配置加载失败：${error.message}`
            : '站点配置加载失败，请联系管理员。',
      }));
    } finally {
      setSiteLoading(false);
    }
  }, [form, initTenantList]);

  useEffect(() => {
    form.setFieldsValue(getInitialLoginValues());
    void refreshCaptcha();
    void initSite();
  }, [form, initSite, refreshCaptcha]);

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      startTransition(() => {
        setInitialState((state) => ({ ...state, currentUser: userInfo }));
      });
    }
  };

  const handleSubmit = async (values: LoginFormValues) => {
    if (!siteConfig) {
      message.error('站点配置尚未就绪，请稍后重试。');
      return;
    }
    setSubmitting(true);
    try {
      const request = buildLoginRequest(values, siteConfig.tenantMode);
      const response = await login(request);
      const accessToken = response.data?.access_token;
      if (!accessToken) throw new Error('登录接口未返回 access_token。');

      setToken(accessToken);
      clearCachedRuoyiMenuData();
      if (siteConfig.tenantMode === 'SELECTABLE') {
        rememberTenantId(request.tenantId);
      }
      message.success('登录成功');
      await fetchUserInfo();
      const urlParams = new URL(window.location.href).searchParams;
      window.location.href = getSafeRedirectUrl(urlParams.get('redirect'));
    } catch (error) {
      if (!(error instanceof RuoyiError)) {
        message.error(
          error instanceof Error ? error.message : '登录失败，请重试。',
        );
      }
      form.setFieldsValue({ password: '' });
      if (captchaEnabled) void refreshCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  const tenantOptions = useMemo(
    () =>
      tenantList.map((item) => ({
        label: item.companyName,
        value: item.tenantId,
      })),
    [tenantList],
  );
  const initError = [initErrors.site, initErrors.captcha, initErrors.tenant]
    .filter(Boolean)
    .join(' ');
  const showTenantSelector =
    siteConfig?.tenantMode === 'SELECTABLE' && tenantEnabled;
  const submitDisabled =
    siteLoading ||
    !siteConfig ||
    Boolean(initErrors.site) ||
    (showTenantSelector && tenantOptions.length === 0);

  const layoutProps: LoginLayoutProps = {
    captchaEnabled,
    captchaImage,
    captchaLoading,
    form,
    initError,
    onFinish: handleSubmit,
    onRefreshCaptcha: () => void refreshCaptcha(),
    showTenantSelector,
    siteConfig,
    submitDisabled,
    submitting,
    tenantOptions,
  };

  return { layoutProps, siteConfig };
};
