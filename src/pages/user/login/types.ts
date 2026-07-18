import type { FormInstance } from 'antd';
import type { LoginData, SiteConfig, TenantInfo } from '@/services/ruoyi/auth';

export type LoginFormValues = {
  tenantId?: string;
  username?: string;
  password?: string;
  code?: string;
  uuid?: string;
};

export type TenantOption = NonNullable<TenantInfo['voList']>[number];

export type LoginInitErrors = {
  captcha?: string;
  site?: string;
  tenant?: string;
};

export type LoginLayoutProps = {
  captchaEnabled: boolean;
  captchaImage: string;
  captchaLoading: boolean;
  form: FormInstance<LoginFormValues>;
  initError: string;
  onFinish: (values: LoginFormValues) => Promise<void>;
  onRefreshCaptcha: () => void;
  showTenantSelector: boolean;
  siteConfig?: SiteConfig;
  submitDisabled: boolean;
  submitting: boolean;
  tenantOptions: Array<{ label: string; value: string }>;
};

export type BuildLoginRequest = (
  values: LoginFormValues,
  tenantMode: SiteConfig['tenantMode'],
) => LoginData;
