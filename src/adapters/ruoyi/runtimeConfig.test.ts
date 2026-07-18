import { parseRuntimeConfig } from './runtimeConfig';

const requiredConfig = {
  schemaVersion: 1,
  baseApi: '/api',
  ssePath: '/resource/sse',
  clientId: 'web-client',
  encrypt: false,
};

describe('runtime api channels', () => {
  it('accepts optional same-origin product and voice channels', () => {
    expect(
      parseRuntimeConfig({
        ...requiredConfig,
        productApi: '/product-api',
        voiceApi: '/voice-api',
      }),
    ).toMatchObject({
      baseApi: '/api',
      productApi: '/product-api',
      voiceApi: '/voice-api',
    });
  });

  it('keeps the legacy adminApi as a product channel fallback', () => {
    expect(
      parseRuntimeConfig({
        ...requiredConfig,
        adminApi: '/admin-api',
      }),
    ).toMatchObject({
      adminApi: '/admin-api',
      productApi: undefined,
    });
  });

  it('rejects an ambiguous product channel when both aliases are present', () => {
    expect(() =>
      parseRuntimeConfig({
        ...requiredConfig,
        adminApi: '/admin-api',
        productApi: '/product-api',
      }),
    ).toThrow('productApi and adminApi must not be configured together');
  });

  it('rejects absolute browser-facing backend urls', () => {
    expect(() =>
      parseRuntimeConfig({
        ...requiredConfig,
        voiceApi: 'https://voice.example.invalid',
      }),
    ).toThrow('voiceApi must be a same-origin absolute path');
  });
});
