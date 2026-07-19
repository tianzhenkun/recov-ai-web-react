import proxy, { createProxy } from './proxy';

type ProxyRule = {
  target?: string;
  changeOrigin?: boolean;
  ws?: boolean;
  pathRewrite?: Record<string, string>;
};

describe('proxy config', () => {
  it('proxies dev api requests to local Java backend by default', () => {
    const devProxy = proxy.dev as Record<string, ProxyRule>;

    expect(devProxy['/dev-api']).toMatchObject({
      target: process.env.UMI_APP_API_TARGET || 'http://localhost:8080',
      changeOrigin: true,
      ws: true,
      pathRewrite: { '^/dev-api': '' },
    });
  });

  it('ignores removed legacy voice proxy variables', () => {
    const devProxy = createProxy({
      UMI_APP_VOICE_API: '/voice-api',
      UMI_APP_VOICE_API_TARGET: 'http://voice.test.invalid',
    }) as Record<string, ProxyRule>;

    expect(devProxy['/voice-api']).toBeUndefined();
  });

  it('uses the gateway as the only main API when direct endpoints are disabled', () => {
    const configured = createProxy({
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

  it('overrides the local product code on the main proxy and SSE channels', () => {
    const configured = createProxy({
      LINGCHEN_LOCAL_PRODUCT_CODE: 'sales_agent',
      UMI_APP_API_TARGET: 'http://gateway.test.invalid',
      UMI_APP_VOICE_API: '/voice-api',
      UMI_APP_VOICE_API_TARGET: 'http://voice.test.invalid',
    }) as Record<string, ProxyRule & { headers?: Record<string, string> }>;

    expect(configured['/dev-api'].headers).toMatchObject({
      'X-Lingchen-Product-Code': 'SALES_AGENT',
    });
    expect(configured['/dev-api/resource/sse'].headers).toMatchObject({
      'X-Lingchen-Product-Code': 'SALES_AGENT',
    });
    expect(configured['/voice-api']).toBeUndefined();
  });

  it.each([
    '/',
    '/api/../auth',
    '/api/./auth',
    '/api/%2e%2e/auth',
    '/api/a%2fb',
    '/api\\auth',
  ])('rejects unsafe main proxy paths: %s', (baseApi) => {
    expect(() =>
      createProxy({
        UMI_APP_API_TARGET: 'http://gateway.test.invalid',
        UMI_APP_BASE_API: baseApi,
      }),
    ).toThrow('同源绝对路径');
  });
});
