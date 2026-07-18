import { isProductionRuntime, runtimeConfig } from './runtimeConfig';

type ClientEnvKey =
  | 'UMI_APP_BASE_API'
  | 'UMI_APP_ADMIN_API'
  | 'UMI_APP_PRODUCT_API'
  | 'UMI_APP_VOICE_API'
  | 'UMI_APP_SSE'
  | 'UMI_APP_ENCRYPT'
  | 'UMI_APP_RSA_PUBLIC_KEY'
  | 'UMI_APP_RSA_PRIVATE_KEY'
  | 'UMI_APP_CLIENT_ID'
  | 'UMI_APP_LOGIN_VARIANT'
  | 'UMI_APP_MENU_WORKSPACE_NAMES';

const buildTimeClientEnv: Record<ClientEnvKey, unknown> = {
  UMI_APP_BASE_API: process.env.UMI_APP_BASE_API,
  UMI_APP_ADMIN_API: process.env.UMI_APP_ADMIN_API,
  UMI_APP_PRODUCT_API: process.env.UMI_APP_PRODUCT_API,
  UMI_APP_VOICE_API: process.env.UMI_APP_VOICE_API,
  UMI_APP_SSE: process.env.UMI_APP_SSE,
  UMI_APP_ENCRYPT: process.env.UMI_APP_ENCRYPT,
  UMI_APP_RSA_PUBLIC_KEY: process.env.UMI_APP_RSA_PUBLIC_KEY,
  UMI_APP_RSA_PRIVATE_KEY: process.env.UMI_APP_RSA_PRIVATE_KEY,
  UMI_APP_CLIENT_ID: process.env.UMI_APP_CLIENT_ID,
  UMI_APP_LOGIN_VARIANT: process.env.UMI_APP_LOGIN_VARIANT,
  UMI_APP_MENU_WORKSPACE_NAMES: process.env.UMI_APP_MENU_WORKSPACE_NAMES,
};

const runtimeClientEnv: Partial<Record<ClientEnvKey, unknown>> = runtimeConfig
  ? {
      UMI_APP_BASE_API: runtimeConfig.baseApi,
      UMI_APP_ADMIN_API: runtimeConfig.adminApi,
      UMI_APP_PRODUCT_API: runtimeConfig.productApi,
      UMI_APP_VOICE_API: runtimeConfig.voiceApi,
      UMI_APP_SSE: runtimeConfig.ssePath,
      UMI_APP_ENCRYPT: runtimeConfig.encrypt,
      UMI_APP_RSA_PUBLIC_KEY: runtimeConfig.requestRsaPublicKey,
      UMI_APP_CLIENT_ID: runtimeConfig.clientId,
    }
  : {};

const productionBuildTimeFallbackKeys = new Set<ClientEnvKey>([
  // Menu grouping is a build-time UI concern rather than deployment wiring.
  'UMI_APP_MENU_WORKSPACE_NAMES',
]);

export const normalizeClientEnv = (value?: unknown) => {
  const trimmed =
    value === undefined || value === null ? '' : String(value).trim();
  const quote = trimmed[0];

  if (
    trimmed.length >= 2 &&
    (quote === '"' || quote === "'") &&
    trimmed[trimmed.length - 1] === quote
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

export const getClientEnv = (key: ClientEnvKey, fallback = '') => {
  const runtimeValue = normalizeClientEnv(runtimeClientEnv[key]);
  if (runtimeValue) return runtimeValue;

  if (!isProductionRuntime || productionBuildTimeFallbackKeys.has(key)) {
    const buildTimeValue = normalizeClientEnv(buildTimeClientEnv[key]);
    if (buildTimeValue) return buildTimeValue;
  }

  return fallback;
};

export const getBaseApi = () => getClientEnv('UMI_APP_BASE_API', '/dev-api');

export const getProductApi = () =>
  getClientEnv('UMI_APP_PRODUCT_API') || getClientEnv('UMI_APP_ADMIN_API');

export const requireProductApi = () => {
  const productApi = getProductApi();
  if (!productApi) {
    throw new Error('当前站点未配置 Product API 通道。');
  }
  return productApi;
};

export const getAdminApi = () => requireProductApi();

export const getVoiceApi = () => getClientEnv('UMI_APP_VOICE_API');

export const getSseApi = () => getClientEnv('UMI_APP_SSE', '/resource/sse');

export const getClientId = () => getClientEnv('UMI_APP_CLIENT_ID');

export const getLoginVariantOverride = () =>
  getClientEnv('UMI_APP_LOGIN_VARIANT', 'AUTO') || 'AUTO';

const DEFAULT_MENU_WORKSPACE_NAMES = ['权益中心', '后台管理', '系统管理'];

export const getMenuWorkspaceNames = () =>
  getClientEnv(
    'UMI_APP_MENU_WORKSPACE_NAMES',
    DEFAULT_MENU_WORKSPACE_NAMES.join(','),
  )
    .split(/[\n,，|]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const isClientEncryptEnabled = () =>
  getClientEnv('UMI_APP_ENCRYPT').toLowerCase() === 'true';
