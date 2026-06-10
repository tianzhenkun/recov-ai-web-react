import proxy from './proxy';

type ProxyRule = {
  target?: string;
  changeOrigin?: boolean;
  ws?: boolean;
  pathRewrite?: Record<string, string>;
};

describe('proxy config', () => {
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
});
