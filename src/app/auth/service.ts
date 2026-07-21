import { getClientId } from '@/adapters/ruoyi/env';
import type { RuoyiResponse } from '@/adapters/ruoyi/response';
import { type RuoyiRequestOptions, ruoyiRequest } from '@/api/main';

export type LoginData = {
  tenantId?: string;
  username?: string;
  password?: string;
  socialCode?: string;
  socialState?: string;
  source?: string;
  code?: string;
  uuid?: string;
  clientId?: string;
  grantType?: string;
};

export type LoginResult = {
  access_token: string;
};

export type VerifyCodeResult = {
  captchaEnabled: boolean;
  uuid?: string;
  img?: string;
};

export type TenantInfo = {
  tenantEnabled: boolean;
  voList: Array<{
    companyName: string;
    domain: unknown;
    tenantId: string;
  }>;
};

export type TenantMode = 'SELECTABLE' | 'FIXED';
export type PortalScope = 'PLATFORM' | 'PRODUCT';

export type SiteConfig = {
  portalScope: PortalScope;
  productCode?: string;
  productName?: string;
  loginVariant: string;
  tenantMode: TenantMode;
};

export const login = (data: LoginData) =>
  ruoyiRequest<LoginResult>('/auth/login', {
    method: 'post',
    data: {
      ...data,
      clientId: data.clientId || getClientId(),
      grantType: data.grantType || 'password',
    },
    headers: {
      isToken: false,
      isEncrypt: true,
      repeatSubmit: false,
    },
  });

export const register = (data: LoginData) =>
  ruoyiRequest('/auth/register', {
    method: 'post',
    data: {
      ...data,
      clientId: data.clientId || getClientId(),
      grantType: data.grantType || 'password',
    },
    headers: {
      isToken: false,
      isEncrypt: true,
      repeatSubmit: false,
    },
  });

export const logout = () =>
  ruoyiRequest('/auth/logout', {
    method: 'post',
  });

export const getCodeImg = () =>
  ruoyiRequest<VerifyCodeResult>('/auth/code', {
    method: 'get',
    headers: {
      isToken: false,
    },
    timeout: 20000,
  });

export const getTenantList = (isToken: boolean) =>
  ruoyiRequest<TenantInfo>('/auth/tenant/list', {
    method: 'get',
    headers: {
      isToken,
    },
  });

export const getSiteConfig = () =>
  ruoyiRequest<SiteConfig>('/auth/site/config', {
    method: 'get',
    headers: {
      isToken: false,
    },
  });

export type AuthResponse<T> = Promise<RuoyiResponse<T>>;
export type AuthRequestOptions = RuoyiRequestOptions;
