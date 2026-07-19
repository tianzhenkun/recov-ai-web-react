import type { RuoyiResponse } from '@/adapters/ruoyi/response';
import { ruoyiRequest } from '@/api/main';

const BASE = '/system/integration-config/oauth';

export type OAuthProviderStatus = 'DRAFT' | 'ENABLED' | 'DISABLED';
export type OAuthProviderCheckStatus = 'UNCHECKED' | 'PASSED' | 'FAILED';
export type OAuthRevision = number | string;

export type OAuthProviderDefinition = {
  providerCode: string;
  displayName: string;
};

export type OAuthProviderConfig = {
  providerCode: string;
  displayName?: string;
  configName?: string;
  status: OAuthProviderStatus;
  schemaVersion: number;
  revision: OAuthRevision;
  clientId?: string;
  redirectUri?: string;
  scopes?: string[];
  unionId?: boolean;
  tenantId?: string;
  codingGroupName?: string;
  alipayPublicKey?: string;
  agentId?: string;
  deviceId?: string;
  clientOsType?: string;
  serverUrl?: string;
  remark?: string;
  clientSecretConfigured: boolean;
  stackOverflowKeyConfigured: boolean;
  checkStatus: OAuthProviderCheckStatus;
  lastCheckTime?: string;
  lastErrorMessage?: string;
  createTime?: string;
  updateTime?: string;
};

export type OAuthProviderSavePayload = {
  revision?: OAuthRevision;
  configName?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
  unionId?: boolean;
  tenantId?: string;
  codingGroupName?: string;
  alipayPublicKey?: string;
  agentId?: string;
  stackOverflowKey?: string;
  deviceId?: string;
  clientOsType?: string;
  serverUrl?: string;
  remark?: string;
};

const unwrapData = <T>(response: RuoyiResponse<T>) => response.data as T;

const withoutBlankSecrets = (
  payload: OAuthProviderSavePayload,
): OAuthProviderSavePayload => {
  const data = { ...payload };
  if (!data.clientSecret?.trim()) delete data.clientSecret;
  if (!data.stackOverflowKey?.trim()) delete data.stackOverflowKey;
  return data;
};

export const listOAuthProviders = async () =>
  unwrapData(
    await ruoyiRequest<OAuthProviderDefinition[]>(`${BASE}/providers`, {
      method: 'get',
    }),
  );

export const listOAuthProviderConfigs = async () =>
  unwrapData(
    await ruoyiRequest<OAuthProviderConfig[]>(`${BASE}/list`, {
      method: 'get',
    }),
  );

export const getOAuthProviderConfig = async (providerCode: string) =>
  unwrapData(
    await ruoyiRequest<OAuthProviderConfig>(`${BASE}/${providerCode}`, {
      method: 'get',
    }),
  );

export const saveOAuthProviderConfig = async (
  providerCode: string,
  payload: OAuthProviderSavePayload,
) =>
  unwrapData(
    await ruoyiRequest<OAuthProviderConfig>(`${BASE}/${providerCode}`, {
      method: 'put',
      data: withoutBlankSecrets(payload),
      repeatSubmit: false,
    }),
  );

const transition = async (
  providerCode: string,
  action: 'validate' | 'enable' | 'disable',
  revision: OAuthRevision,
) =>
  unwrapData(
    await ruoyiRequest<OAuthProviderConfig>(
      `${BASE}/${providerCode}/${action}`,
      {
        method: 'post',
        data: { revision },
        repeatSubmit: false,
      },
    ),
  );

export const checkOAuthProviderConfig = (
  providerCode: string,
  revision: OAuthRevision,
) => transition(providerCode, 'validate', revision);

export const enableOAuthProviderConfig = (
  providerCode: string,
  revision: OAuthRevision,
) => transition(providerCode, 'enable', revision);

export const disableOAuthProviderConfig = (
  providerCode: string,
  revision: OAuthRevision,
) => transition(providerCode, 'disable', revision);
