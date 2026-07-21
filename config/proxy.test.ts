type ProxyRule = {
  target?: string;
  changeOrigin?: boolean;
  ws?: boolean;
  headers?: Record<string, string>;
  pathRewrite?: Record<string, string>;
};

const requiredEnvironment = {
  LINGCHEN_LOCAL_PORTAL_SCOPE: 'PRODUCT',
  LINGCHEN_LOCAL_PRODUCT_CODE: 'recov',
  UMI_ENV: 'dev',
  UMI_APP_CLIENT_ID: 'web-client-test',
};

const originalEnvironment = Object.fromEntries(
  Object.keys(requiredEnvironment).map((key) => [key, process.env[key]]),
) as Record<keyof typeof requiredEnvironment, string | undefined>;

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

const loadProxyModule = () => {
  Object.assign(process.env, requiredEnvironment);
  jest.resetModules();
  return require('./proxy') as typeof import('./proxy');
};

describe('proxy config', () => {
  it('proxies dev api requests to local Java backend by default', () => {
    const { default: proxy } = loadProxyModule();
    const devProxy = proxy.dev as Record<string, ProxyRule>;

    expect(devProxy['/dev-api']).toMatchObject({
      target: process.env.UMI_APP_API_TARGET || 'http://localhost:8080',
      changeOrigin: true,
      ws: true,
      pathRewrite: { '^/dev-api': '' },
    });
  });

  it('ignores removed legacy voice proxy variables', () => {
    const { createProxy } = loadProxyModule();
    const devProxy = createProxy({
      ...requiredEnvironment,
      UMI_APP_VOICE_API: '/voice-api',
      UMI_APP_VOICE_API_TARGET: 'http://voice.test.invalid',
    }) as Record<string, ProxyRule>;

    expect(devProxy['/voice-api']).toBeUndefined();
  });

  it('uses the gateway as the only main API when direct endpoints are disabled', () => {
    const { createProxy } = loadProxyModule();
    const configured = createProxy({
      ...requiredEnvironment,
      UMI_APP_API_TARGET: 'http://gateway.test.invalid',
      UMI_APP_BASE_API: '/gateway-api',
      UMI_APP_VOICE_API: '',
      UMI_APP_VOICE_API_TARGET: '',
    }) as Record<string, ProxyRule>;

    expect(configured['/gateway-api']).toMatchObject({
      target: 'http://gateway.test.invalid',
      pathRewrite: { '^/gateway-api': '' },
    });
    expect(configured['/product-api']).toBeUndefined();
    expect(configured['/voice-api']).toBeUndefined();
  });

  it('overrides portal scope, product code, and client id on main and SSE channels', () => {
    const { createProxy } = loadProxyModule();
    const configured = createProxy({
      LINGCHEN_LOCAL_PORTAL_SCOPE: 'PRODUCT',
      LINGCHEN_LOCAL_PRODUCT_CODE: ' sales ',
      UMI_APP_CLIENT_ID: ' sales-web-client ',
      UMI_APP_API_TARGET: 'http://gateway.test.invalid',
      UMI_APP_VOICE_API: '/voice-api',
      UMI_APP_VOICE_API_TARGET: 'http://voice.test.invalid',
    }) as Record<string, ProxyRule & { headers?: Record<string, string> }>;

    expect(configured['/dev-api'].headers).toEqual({
      'X-Lingchen-Portal-Scope': 'PRODUCT',
      'X-Lingchen-Product-Code': 'sales',
      clientid: 'sales-web-client',
    });
    expect(configured['/dev-api/resource/sse'].headers).toEqual({
      'X-Lingchen-Portal-Scope': 'PRODUCT',
      'X-Lingchen-Product-Code': 'sales',
      clientid: 'sales-web-client',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    expect(configured['/voice-api']).toBeUndefined();
  });

  it.each([
    'RECOV',
    'SALES_AGENT',
  ])('rejects non-canonical local product code: %s', (productCode) => {
    const { createProxy } = loadProxyModule();
    expect(() =>
      createProxy({
        ...requiredEnvironment,
        LINGCHEN_LOCAL_PRODUCT_CODE: productCode,
      }),
    ).toThrow('小写');
  });

  it.each([
    [{ ...requiredEnvironment, LINGCHEN_LOCAL_PORTAL_SCOPE: undefined }],
    [{ ...requiredEnvironment, LINGCHEN_LOCAL_PORTAL_SCOPE: 'UNKNOWN' }],
    [
      {
        ...requiredEnvironment,
        LINGCHEN_LOCAL_PORTAL_SCOPE: 'PLATFORM',
        LINGCHEN_LOCAL_PRODUCT_CODE: 'recov',
      },
    ],
    [
      {
        ...requiredEnvironment,
        LINGCHEN_LOCAL_PORTAL_SCOPE: 'PRODUCT',
        LINGCHEN_LOCAL_PRODUCT_CODE: '',
      },
    ],
    [{ ...requiredEnvironment, UMI_APP_CLIENT_ID: '' }],
  ])('fails closed for an invalid proxy site identity: %p', (environment) => {
    const { createProxy } = loadProxyModule();
    expect(() => createProxy(environment)).toThrow(
      /入口范围|产品编码|clientId/,
    );
  });

  it('accepts a 64-character clientId and rejects 65 characters', () => {
    const { createProxy } = loadProxyModule();

    expect(() =>
      createProxy({
        ...requiredEnvironment,
        UMI_APP_CLIENT_ID: 'a'.repeat(64),
      }),
    ).not.toThrow();
    expect(() =>
      createProxy({
        ...requiredEnvironment,
        UMI_APP_CLIENT_ID: 'a'.repeat(65),
      }),
    ).toThrow(/clientId/);
  });

  it.each([
    '/',
    '/api/../auth',
    '/api/./auth',
    '/api/%2e%2e/auth',
    '/api/a%2fb',
    '/api\\auth',
  ])('rejects unsafe main proxy paths: %s', (baseApi) => {
    const { createProxy } = loadProxyModule();
    expect(() =>
      createProxy({
        ...requiredEnvironment,
        UMI_APP_API_TARGET: 'http://gateway.test.invalid',
        UMI_APP_BASE_API: baseApi,
      }),
    ).toThrow('同源绝对路径');
  });
});
