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

  it('keeps the agent console api proxy isolated with long-lived connections', () => {
    const devProxy = proxy.dev as Record<string, ProxyRule>;

    expect(devProxy['/ai-call-agent-api']).toMatchObject({
      target:
        process.env.UMI_APP_AI_CALL_API_TARGET || 'http://127.0.0.1:19011',
      changeOrigin: true,
      ws: true,
      proxyTimeout: 0,
      timeout: 0,
      pathRewrite: { '^/ai-call-agent-api': '' },
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  });

  it('proxies AI Call configuration requests to the AI Call runtime', () => {
    const devProxy = proxy.dev as Record<string, ProxyRule>;

    expect(devProxy['/ai-call-lab-api']).toMatchObject({
      target:
        process.env.UMI_APP_AI_CALL_API_TARGET || 'http://127.0.0.1:19011',
      changeOrigin: true,
      ws: true,
      pathRewrite: { '^/ai-call-lab-api': '' },
    });
  });
});
