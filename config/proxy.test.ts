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

  it('proxies voice api requests when the optional channel is configured', () => {
    const devProxy = createProxy({
      UMI_APP_VOICE_API: '/voice-api',
      UMI_APP_VOICE_API_TARGET: 'http://voice.test.invalid',
    }) as Record<string, ProxyRule>;

    expect(devProxy['/voice-api']).toMatchObject({
      target: 'http://voice.test.invalid',
      changeOrigin: true,
      ws: true,
      pathRewrite: { '^/voice-api': '' },
    });
  });

  it('supports gateway with optional product and voice channels', () => {
    const configured = createProxy({
      UMI_APP_API_TARGET: 'http://gateway.test.invalid',
      UMI_APP_BASE_API: '/gateway-api',
      UMI_APP_PRODUCT_API: '/product-api',
      UMI_APP_PRODUCT_TARGET: 'http://product.test.invalid',
      UMI_APP_VOICE_API: '',
      UMI_APP_VOICE_API_TARGET: '',
    }) as Record<string, ProxyRule>;

    expect(configured['/gateway-api']).toMatchObject({
      target: 'http://gateway.test.invalid',
      pathRewrite: { '^/gateway-api': '' },
    });
    expect(configured['/product-api']).toMatchObject({
      target: 'http://product.test.invalid',
      pathRewrite: { '^/product-api': '' },
    });
    expect(configured['/voice-api']).toBeUndefined();
  });

  it('overrides the local product code on every enabled proxy channel', () => {
    const configured = createProxy({
      LINGCHEN_LOCAL_PRODUCT_CODE: 'sales_agent',
      UMI_APP_API_TARGET: 'http://gateway.test.invalid',
      UMI_APP_PRODUCT_API: '/product-api',
      UMI_APP_PRODUCT_TARGET: 'http://product.test.invalid',
      UMI_APP_VOICE_API: '/voice-api',
      UMI_APP_VOICE_API_TARGET: 'http://voice.test.invalid',
    }) as Record<string, ProxyRule & { headers?: Record<string, string> }>;

    expect(configured['/dev-api'].headers).toMatchObject({
      'X-Lingchen-Product-Code': 'SALES_AGENT',
    });
    expect(configured['/dev-api/resource/sse'].headers).toMatchObject({
      'X-Lingchen-Product-Code': 'SALES_AGENT',
    });
    expect(configured['/product-api'].headers).toMatchObject({
      'X-Lingchen-Product-Code': 'SALES_AGENT',
    });
    expect(configured['/voice-api'].headers).toMatchObject({
      'X-Lingchen-Product-Code': 'SALES_AGENT',
    });
  });
});
