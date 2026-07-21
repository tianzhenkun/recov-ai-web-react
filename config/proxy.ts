/**
 * @name 代理的配置
 * @see 生产环境不使用 Umi 代理，由 Web Nginx 以同源路径转发。
 */

type ProxyEnv = Record<string, string | undefined>;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/g, '');
const read = (env: ProxyEnv, key: string) => env[key]?.trim();
const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasForbiddenPathCharacters = (value: string) =>
  value.includes('?') ||
  value.includes('#') ||
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) || 0;
    return codePoint <= 31 || codePoint === 127;
  });

const validateSameOriginPath = (value: string) => {
  const invalid = () => {
    throw new Error('UMI_APP_BASE_API 必须是安全的同源绝对路径。');
  };
  if (
    !value.startsWith('/') ||
    value === '/' ||
    value.startsWith('//') ||
    value.includes('\\') ||
    hasForbiddenPathCharacters(value)
  ) {
    invalid();
  }
  const segments = value.split('/');
  segments.slice(1).forEach((segment, index) => {
    const isTrailingSlash = index === segments.length - 2 && segment === '';
    if (segment === '' && !isTrailingSlash) invalid();
    let decoded = segment;
    for (let round = 0; segment && round < 4; round += 1) {
      try {
        decoded = decodeURIComponent(decoded);
      } catch {
        invalid();
      }
      if (
        decoded === '.' ||
        decoded === '..' ||
        decoded.includes('/') ||
        decoded.includes('\\') ||
        hasForbiddenPathCharacters(decoded)
      ) {
        invalid();
      }
    }
    if (/%(?:2e|2f|5c)/i.test(decoded)) invalid();
  });
  return trimTrailingSlash(value);
};

export const createProxy = (env: ProxyEnv = process.env) => {
  const portalScope = read(env, 'LINGCHEN_LOCAL_PORTAL_SCOPE');
  if (!portalScope || !['PLATFORM', 'PRODUCT'].includes(portalScope)) {
    throw new Error('入口范围仅允许 PLATFORM 或 PRODUCT。');
  }
  const productCode = read(env, 'LINGCHEN_LOCAL_PRODUCT_CODE') || '';
  if (productCode && !/^[a-z][a-z0-9_]{1,63}$/.test(productCode)) {
    throw new Error('产品编码必须使用小写字母、数字或下划线。');
  }
  if (
    (portalScope === 'PLATFORM' && productCode) ||
    (portalScope === 'PRODUCT' && !productCode)
  ) {
    throw new Error('入口范围与产品编码组合不正确。');
  }
  const clientId = read(env, 'UMI_APP_CLIENT_ID') || '';
  if (!clientId || clientId.length > 64 || /\s/.test(clientId)) {
    throw new Error('clientId 不能为空、不能包含空白且不能超过 64 个字符。');
  }
  const siteHeaders = {
    'X-Lingchen-Portal-Scope': portalScope,
    'X-Lingchen-Product-Code': productCode,
    clientid: clientId,
  };
  const baseApi = validateSameOriginPath(
    read(env, 'UMI_APP_BASE_API') || '/dev-api',
  );
  const apiTarget = read(env, 'UMI_APP_API_TARGET') || 'http://localhost:8080';
  const sseProxyPath = `${baseApi}/resource/sse`;

  const configured: Record<string, Record<string, unknown>> = {
    [sseProxyPath]: {
      target: apiTarget,
      changeOrigin: true,
      pathRewrite: {
        [`^${escapeRegExp(sseProxyPath)}`]: '/resource/sse',
      },
      proxyTimeout: 0,
      timeout: 0,
      headers: {
        ...siteHeaders,
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    },
    [baseApi]: {
      target: apiTarget,
      changeOrigin: true,
      ws: true,
      headers: siteHeaders,
      pathRewrite: { [`^${escapeRegExp(baseApi)}`]: '' },
    },
  };

  return configured;
};

const localDevelopmentProxy =
  read(process.env, 'UMI_ENV') === 'dev' ? createProxy() : {};

export default {
  dev: localDevelopmentProxy,
  test: {},
  pre: {},
};
