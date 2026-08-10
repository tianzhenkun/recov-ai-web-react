import proxy from './proxy';

type ProxyRule = {
  target?: string;
  changeOrigin?: boolean;
  ws?: boolean;
  proxyTimeout?: number;
  timeout?: number;
  headers?: Record<string, string>;
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

  it('does not proxy the AI Reach backend from Recov', () => {
    const devProxy = proxy.dev as Record<string, ProxyRule>;

    expect(devProxy['/ai-call-agent-api']).toBeUndefined();
  });

  it('does not retain the legacy AI Call Lab proxy', () => {
    const devProxy = proxy.dev as Record<string, ProxyRule>;

    expect(devProxy['/ai-call-lab-api']).toBeUndefined();
  });
});
