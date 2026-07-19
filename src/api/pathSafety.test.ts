import { assertSafeSameOriginPath } from './pathSafety';

describe('safe same-origin paths', () => {
  it.each([
    'https://evil.invalid/data',
    '//evil.invalid/data',
    '/api/../auth',
    '/api/./auth',
    '/api/%2e%2e/auth',
    '/api/a%2fb',
    '/api/a%5cb',
    '/api\\auth',
  ])('rejects unsafe input %s', (value) => {
    expect(() => assertSafeSameOriginPath(value, '测试路径')).toThrow();
  });

  it.each([
    '/api',
    '/api/v1',
    '/api/users/%E5%BC%A0%E4%B8%89',
  ])('accepts safe input %s', (value) => {
    expect(assertSafeSameOriginPath(value, '测试路径')).toBe(value);
  });
});
