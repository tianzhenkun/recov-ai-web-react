import proxy from './proxy';

type ProxyRule = {
  target?: string;
  changeOrigin?: boolean;
  secure?: boolean;
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

  it('proxies voice api requests to the realtime call gateway', () => {
    const devProxy = proxy.dev as Record<string, ProxyRule>;

    expect(devProxy['/voice-api']).toMatchObject({
      target:
        process.env.UMI_APP_VOICE_API_TARGET || 'http://111.229.146.182:9100',
      changeOrigin: true,
      ws: true,
      pathRewrite: { '^/voice-api': '' },
    });
  });

  it('proxies legal system requests through an independent law prefix', () => {
    const devProxy = proxy.dev as Record<string, ProxyRule>;

    expect(devProxy['/law-dev-api']).toMatchObject({
      target: 'https://law.lingchen-ai.com',
      changeOrigin: true,
      secure: true,
      pathRewrite: { '^/law-dev-api': '/dev-api' },
    });
  });
});
