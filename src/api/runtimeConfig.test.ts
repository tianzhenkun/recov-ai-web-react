import { parseRuntimeConfig } from './runtimeConfig';

const requiredConfig = {
  schemaVersion: 1,
  baseApi: '/api',
  ssePath: '/resource/sse',
  clientId: 'web-client',
  encrypt: false,
};

describe('runtime api channels', () => {
  it('rejects the removed voiceApi field', () => {
    expect(() =>
      parseRuntimeConfig({
        ...requiredConfig,
        voiceApi: '/voice-api',
      }),
    ).toThrow('unsupported field(s): voiceApi');
  });

  it('accepts the legacy release adminApi field without exposing a business channel', () => {
    expect(
      parseRuntimeConfig({
        ...requiredConfig,
        adminApi: '/admin-api',
      }),
    ).toMatchObject({
      adminApi: '/admin-api',
    });
  });

  it('rejects the removed generic productApi field', () => {
    expect(() =>
      parseRuntimeConfig({
        ...requiredConfig,
        productApi: '/product-api',
      }),
    ).toThrow('unsupported field(s): productApi');
  });

  it.each([
    '/api/../auth',
    '/api/./auth',
    '/api/%2e%2e/auth',
    '/api/a%2fb',
    '/api\\auth',
  ])('rejects unsafe runtime paths: %s', (baseApi) => {
    expect(() => parseRuntimeConfig({ ...requiredConfig, baseApi })).toThrow(
      'same-origin absolute path',
    );
  });

  it('rejects the site root as an SSE channel', () => {
    expect(() =>
      parseRuntimeConfig({ ...requiredConfig, ssePath: '/' }),
    ).toThrow('API channels must not use the site root');
  });

  it('accepts a 64-character clientId and rejects 65 characters', () => {
    expect(() =>
      parseRuntimeConfig({
        ...requiredConfig,
        clientId: 'a'.repeat(64),
      }),
    ).not.toThrow();
    expect(() =>
      parseRuntimeConfig({
        ...requiredConfig,
        clientId: 'a'.repeat(65),
      }),
    ).toThrow('at most 64 characters');
  });

  it.each([
    { ssePath: '/api' },
    { adminApi: '/api/resource/sse' },
    { adminApi: '/api/sse', ssePath: '/sse' },
  ])('rejects an effective SSE route that conflicts with an API channel', (overrides) => {
    expect(() =>
      parseRuntimeConfig({ ...requiredConfig, ...overrides }),
    ).toThrow('effective SSE route must not conflict with API channels');
  });
});
