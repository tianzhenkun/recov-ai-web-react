import type {
  OAuthProviderConfig,
  OAuthProviderDefinition,
  OAuthProviderSavePayload,
  OAuthRevision,
} from '@/modules/admin/services/oauth-config';

export type OAuthProviderRow = OAuthProviderDefinition &
  Partial<OAuthProviderConfig> & {
    configured: boolean;
  };

export type OAuthProviderFormValues = Omit<
  OAuthProviderSavePayload,
  'revision'
>;

export const OAUTH_SCOPE_MAX_COUNT = 50;
export const OAUTH_SCOPE_MAX_LENGTH = 128;

export const validateOAuthScopes = (scopes?: string[]) => {
  if (!scopes) return undefined;
  if (scopes.length > OAUTH_SCOPE_MAX_COUNT) {
    return `授权范围最多配置${OAUTH_SCOPE_MAX_COUNT}项`;
  }
  if (scopes.some((scope) => scope.trim().length > OAUTH_SCOPE_MAX_LENGTH)) {
    return `单个授权范围不能超过${OAUTH_SCOPE_MAX_LENGTH}个字符`;
  }
  return undefined;
};

const publicFieldNames = [
  'configName',
  'clientId',
  'redirectUri',
  'scopes',
  'unionId',
  'tenantId',
  'codingGroupName',
  'alipayPublicKey',
  'agentId',
  'deviceId',
  'clientOsType',
  'serverUrl',
  'remark',
] as const satisfies readonly (keyof OAuthProviderFormValues)[];

export const mergeOAuthProviderRows = (
  definitions: OAuthProviderDefinition[],
  configs: OAuthProviderConfig[],
): OAuthProviderRow[] => {
  const configByCode = new Map(
    configs.map((config) => [config.providerCode, config]),
  );
  const rows = definitions.map((definition) => {
    const config = configByCode.get(definition.providerCode);
    configByCode.delete(definition.providerCode);
    return {
      ...definition,
      ...config,
      displayName: config?.displayName || definition.displayName,
      configured: Boolean(config),
    };
  });

  for (const config of configByCode.values()) {
    rows.push({
      ...config,
      providerCode: config.providerCode,
      displayName: config.displayName || config.providerCode,
      configured: true,
    });
  }
  return rows;
};

export const toOAuthProviderFormValues = (
  config?: OAuthProviderConfig,
): OAuthProviderFormValues => {
  if (!config) return {};
  return Object.fromEntries(
    publicFieldNames
      .map((field) => [field, config[field]])
      .filter(([, value]) => value !== undefined),
  ) as OAuthProviderFormValues;
};

export const toOAuthProviderSavePayload = (
  values: OAuthProviderFormValues,
  revision?: OAuthRevision,
): OAuthProviderSavePayload => {
  const payload: OAuthProviderSavePayload = { ...values };
  if (revision !== undefined) payload.revision = revision;
  if (!payload.clientSecret?.trim()) delete payload.clientSecret;
  if (!payload.stackOverflowKey?.trim()) delete payload.stackOverflowKey;
  return payload;
};

export const isOAuthRevisionConflict = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  return /已被其他操作更新|刷新后重试|revision|版本冲突|并发更新/i.test(
    error.message,
  );
};
