const {
  buildLoginVariantChoices,
  checkBackendTargets,
  normalizeProductCode,
  updateManagedEnvContent,
  validateBackendTarget,
  validateSameOriginPath,
} = require('./local-dev-profile');

describe('local development profile', () => {
  it('lists AUTO and every registered login layout', () => {
    expect(
      buildLoginVariantChoices({
        schemaVersion: 1,
        layouts: [{ code: 'default', label: '默认登录页' }],
      }),
    ).toEqual([
      { code: 'AUTO', label: '自动（跟随后端站点配置）' },
      { code: 'default', label: '默认登录页' },
    ]);
  });

  it('replaces only managed keys and preserves unrelated local settings', () => {
    const current = [
      '# existing local settings',
      'UMI_APP_CLIENT_ID=keep-current-client',
      'UNRELATED_SETTING=keep-current-value',
      'UMI_APP_BASE_API=/old-api',
      'UMI_APP_API_TARGET=http://old-target.invalid',
      '',
    ].join('\n');

    const next = updateManagedEnvContent(current, {
      UMI_APP_API_TARGET: 'http://127.0.0.1:8080',
      UMI_APP_BASE_API: '/dev-api',
      UMI_APP_LOGIN_VARIANT: 'AUTO',
      UMI_APP_PRODUCT_API: '',
      UMI_APP_PRODUCT_TARGET: '',
      UMI_APP_VOICE_API: '',
      UMI_APP_VOICE_API_TARGET: '',
    });

    expect(next).toContain('UMI_APP_CLIENT_ID=keep-current-client');
    expect(next).toContain('UNRELATED_SETTING=keep-current-value');
    expect(next).not.toContain('/old-api');
    expect(next).not.toContain('old-target.invalid');
    expect(next).toContain('UMI_APP_LOGIN_VARIANT=AUTO');
    expect(next).toContain('UMI_APP_BASE_API=/dev-api');
  });

  it('validates browser paths and local backend targets separately', () => {
    expect(validateSameOriginPath('/voice-api')).toBe('/voice-api');
    expect(() => validateSameOriginPath('https://example.invalid/api')).toThrow(
      '同源绝对路径',
    );

    expect(validateBackendTarget('http://127.0.0.1:8080')).toBe(
      'http://127.0.0.1:8080',
    );
    expect(() => validateBackendTarget('file:///tmp/socket')).toThrow(
      'HTTP 或 HTTPS',
    );
  });

  it('normalizes an optional local product code without exposing it to browser config', () => {
    expect(normalizeProductCode(' sales_agent ')).toBe('SALES_AGENT');
    expect(normalizeProductCode('')).toBe('');
    expect(() => normalizeProductCode('sales-agent')).toThrow('产品编码');
  });

  it('checks every selected backend and treats any HTTP status as reachable', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ status: 503 })
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValueOnce({ status: 404 });

    const result = await checkBackendTargets(
      [
        { name: 'Gateway', target: 'http://gateway.test.invalid' },
        { name: 'Product', target: 'http://product.test.invalid' },
        { name: 'Voice', target: 'http://voice.test.invalid' },
      ],
      { fetchImpl: fetchMock, timeoutMs: 100 },
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toEqual([
      {
        connected: true,
        name: 'Gateway',
        status: 503,
        target: 'http://gateway.test.invalid',
      },
      {
        connected: false,
        error: 'connection refused',
        name: 'Product',
        target: 'http://product.test.invalid',
      },
      {
        connected: true,
        name: 'Voice',
        status: 404,
        target: 'http://voice.test.invalid',
      },
    ]);
  });
});
