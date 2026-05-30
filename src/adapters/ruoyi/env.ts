type ClientEnvKey =
  | 'UMI_APP_BASE_API'
  | 'UMI_APP_ADMIN_API'
  | 'UMI_APP_SSE'
  | 'UMI_APP_ENCRYPT'
  | 'UMI_APP_RSA_PUBLIC_KEY'
  | 'UMI_APP_RSA_PRIVATE_KEY'
  | 'UMI_APP_CLIENT_ID'
  | 'UMI_APP_MENU_WORKSPACE_NAMES';

const clientEnv: Record<ClientEnvKey, unknown> = {
  UMI_APP_BASE_API: process.env.UMI_APP_BASE_API,
  UMI_APP_ADMIN_API: process.env.UMI_APP_ADMIN_API,
  UMI_APP_SSE: process.env.UMI_APP_SSE,
  UMI_APP_ENCRYPT: process.env.UMI_APP_ENCRYPT,
  UMI_APP_RSA_PUBLIC_KEY: process.env.UMI_APP_RSA_PUBLIC_KEY,
  UMI_APP_RSA_PRIVATE_KEY: process.env.UMI_APP_RSA_PRIVATE_KEY,
  UMI_APP_CLIENT_ID: process.env.UMI_APP_CLIENT_ID,
  UMI_APP_MENU_WORKSPACE_NAMES: process.env.UMI_APP_MENU_WORKSPACE_NAMES,
};

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

export const getClientEnv = (key: ClientEnvKey, fallback = '') =>
  normalizeClientEnv(clientEnv[key]) || fallback;

export const getBaseApi = () => getClientEnv('UMI_APP_BASE_API', '/dev-api');

export const getAdminApi = () =>
  getClientEnv('UMI_APP_ADMIN_API', '/admin-api');

export const getSseApi = () => getClientEnv('UMI_APP_SSE', '/resource/sse');

export const getClientId = () => getClientEnv('UMI_APP_CLIENT_ID');

export const getMenuWorkspaceNames = () =>
  getClientEnv('UMI_APP_MENU_WORKSPACE_NAMES')
    .split(/[\n,，|]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const isClientEncryptEnabled = () =>
  getClientEnv('UMI_APP_ENCRYPT').toLowerCase() === 'true';
