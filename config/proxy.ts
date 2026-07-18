/**
 * @name 代理的配置
 * @see 生产环境不使用 Umi 代理，由 Web Nginx 以同源路径转发。
 */

type ProxyEnv = Record<string, string | undefined>;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/g, '');
const read = (env: ProxyEnv, key: string) => env[key]?.trim();

const readOptionalChannel = (
  env: ProxyEnv,
  pathKey: string,
  targetKey: string,
  options: {
    fallbackPath?: string;
    legacyPathKey?: string;
    legacyTargetKey?: string;
  } = {},
) => {
  const explicitPath = env[pathKey];
  const explicitTarget = env[targetKey];
  const legacyPath = options.legacyPathKey
    ? read(env, options.legacyPathKey)
    : undefined;
  const legacyTarget = options.legacyTargetKey
    ? read(env, options.legacyTargetKey)
    : undefined;
  const target = explicitTarget?.trim() || legacyTarget;
  const path =
    explicitPath !== undefined
      ? explicitPath.trim()
      : legacyPath || (target ? options.fallbackPath : undefined);

  if (!path) return undefined;
  if (!target) {
    throw new Error(`${pathKey} 已启用，但未配置 ${targetKey}。`);
  }
  return { path: trimTrailingSlash(path), target };
};

export const createProxy = (env: ProxyEnv = process.env) => {
  const productCode = (
    read(env, 'LINGCHEN_LOCAL_PRODUCT_CODE') || ''
  ).toUpperCase();
  if (productCode && !/^[A-Z][A-Z0-9_]{1,63}$/.test(productCode)) {
    throw new Error(
      'LINGCHEN_LOCAL_PRODUCT_CODE 必须为空，或符合 [A-Z][A-Z0-9_]{1,63}。',
    );
  }
  const productHeaders = {
    'X-Lingchen-Product-Code': productCode,
  };
  const baseApi = trimTrailingSlash(
    read(env, 'UMI_APP_BASE_API') || '/dev-api',
  );
  const apiTarget = read(env, 'UMI_APP_API_TARGET') || 'http://localhost:8080';
  const sseProxyPath = `${baseApi}/resource/sse`;
  const product = readOptionalChannel(
    env,
    'UMI_APP_PRODUCT_API',
    'UMI_APP_PRODUCT_TARGET',
    {
      fallbackPath: '/admin-api',
      legacyPathKey: 'UMI_APP_ADMIN_API',
      legacyTargetKey: 'UMI_APP_ADMIN_TARGET',
    },
  );
  const voice = readOptionalChannel(
    env,
    'UMI_APP_VOICE_API',
    'UMI_APP_VOICE_API_TARGET',
    { fallbackPath: '/voice-api' },
  );

  const paths = [baseApi, product?.path, voice?.path].filter(Boolean);
  if (new Set(paths).size !== paths.length) {
    throw new Error('本地 API 通道路径不能重复。');
  }

  const configured: Record<string, Record<string, unknown>> = {
    [sseProxyPath]: {
      target: apiTarget,
      changeOrigin: true,
      pathRewrite: { [`^${sseProxyPath}`]: '/resource/sse' },
      proxyTimeout: 0,
      timeout: 0,
      headers: {
        ...productHeaders,
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    },
    [baseApi]: {
      target: apiTarget,
      changeOrigin: true,
      ws: true,
      headers: productHeaders,
      pathRewrite: { [`^${baseApi}`]: '' },
    },
  };

  if (product) {
    configured[product.path] = {
      target: product.target,
      changeOrigin: true,
      ws: true,
      headers: productHeaders,
      pathRewrite: { [`^${product.path}`]: '' },
    };
  }
  if (voice) {
    configured[voice.path] = {
      target: voice.target,
      changeOrigin: true,
      ws: true,
      headers: productHeaders,
      pathRewrite: { [`^${voice.path}`]: '' },
    };
  }
  return configured;
};

export default {
  dev: createProxy(),
  test: createProxy(),
  pre: createProxy(),
};
