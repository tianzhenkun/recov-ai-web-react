const { generateKeyPairSync } = require('node:crypto');
const {
  MANAGED_ENV_KEYS,
  buildLoginVariantChoices,
  checkBackendTargets,
  normalizeProductCode,
  readEnvValues,
  updateManagedEnvContent,
  validateBackendTarget,
  validateClientId,
  validateRsaPublicKey,
  validateSameOriginPath,
} = require('./local-dev-profile');

describe('local development profile', () => {
  it('normalizes quoted values read from an existing local env file', () => {
    expect(
      readEnvValues(
        'UMI_APP_CLIENT_ID="web-client"\nUMI_APP_ENCRYPT=\'true\'\n',
      ),
    ).toEqual({
      UMI_APP_CLIENT_ID: 'web-client',
      UMI_APP_ENCRYPT: 'true',
    });
  });

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
      'UMI_APP_PRODUCT_API=/old-product-api',
      'UMI_APP_PRODUCT_TARGET=http://old-product.invalid',
      'UMI_APP_VOICE_API=/old-voice-api',
      'UMI_APP_VOICE_API_TARGET=http://old-voice.invalid',
      '',
    ].join('\n');

    const next = updateManagedEnvContent(current, {
      UMI_APP_API_TARGET: 'http://127.0.0.1:8080',
      UMI_APP_BASE_API: '/dev-api',
      UMI_APP_CLIENT_ID: 'new-client',
      UMI_APP_ENCRYPT: 'true',
      UMI_APP_LOGIN_VARIANT: 'AUTO',
      UMI_APP_RSA_PUBLIC_KEY: 'new-public-key',
    });

    expect(next).not.toContain('keep-current-client');
    expect(next).toContain('UMI_APP_CLIENT_ID=new-client');
    expect(next).toContain('UMI_APP_ENCRYPT=true');
    expect(next).toContain('UMI_APP_RSA_PUBLIC_KEY=new-public-key');
    expect(next).toContain('UNRELATED_SETTING=keep-current-value');
    expect(next).not.toContain('/old-api');
    expect(next).not.toContain('old-target.invalid');
    expect(next).not.toContain('old-product');
    expect(next).not.toContain('old-voice');
    expect(next).toContain('UMI_APP_LOGIN_VARIANT=AUTO');
    expect(next).toContain('UMI_APP_BASE_API=/dev-api');
  });

  it('does not manage the removed Voice browser channel', () => {
    expect(MANAGED_ENV_KEYS).not.toContain('UMI_APP_VOICE_API');
    expect(MANAGED_ENV_KEYS).not.toContain('UMI_APP_VOICE_API_TARGET');
  });

  it('manages every value required by a clean local login', () => {
    expect([...MANAGED_ENV_KEYS]).toEqual(
      expect.arrayContaining([
        'UMI_APP_CLIENT_ID',
        'UMI_APP_ENCRYPT',
        'UMI_APP_RSA_PUBLIC_KEY',
      ]),
    );
  });

  it('validates the web client id and an RSA public key', () => {
    const { publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { format: 'der', type: 'spki' },
    });
    const encodedPublicKey = publicKey.toString('base64');

    expect(validateClientId(' web-client ')).toBe('web-client');
    expect(() => validateClientId('')).toThrow('clientId');
    expect(() => validateClientId('has whitespace')).toThrow('clientId');
    expect(validateRsaPublicKey(encodedPublicKey)).toBe(encodedPublicKey);
    expect(() => validateRsaPublicKey('not-a-public-key')).toThrow('RSA');
  });

  it('validates browser paths and local backend targets separately', () => {
    expect(validateSameOriginPath('/gateway-api')).toBe('/gateway-api');
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

  it.each([
    '/api/../auth',
    '/api/./auth',
    '/api/%2e%2e/auth',
    '/api/a%2fb',
    '/api\\auth',
  ])('rejects unsafe local proxy paths: %s', (value) => {
    expect(() => validateSameOriginPath(value)).toThrow('同源绝对路径');
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
      .mockResolvedValueOnce({ status: 404 });

    const result = await checkBackendTargets(
      [
        { name: 'Gateway', target: 'http://gateway.test.invalid' },
        { name: 'Sales', target: 'http://sales.test.invalid' },
      ],
      { fetchImpl: fetchMock, timeoutMs: 100 },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      {
        connected: true,
        name: 'Gateway',
        status: 503,
        target: 'http://gateway.test.invalid',
      },
      {
        connected: true,
        name: 'Sales',
        status: 404,
        target: 'http://sales.test.invalid',
      },
    ]);
  });
});
