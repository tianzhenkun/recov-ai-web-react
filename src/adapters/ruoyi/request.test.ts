import { request as umiRequest } from '@umijs/max';
import { ruoyiRequest } from './request';
import { getToken } from './token';

jest.mock('@umijs/max', () => ({
  history: {
    location: { hash: '', pathname: '/', search: '' },
    replace: jest.fn(),
  },
  request: jest.fn(),
}));

jest.mock('./crypto', () => ({
  decryptBase64: jest.fn(),
  decryptWithAes: jest.fn(),
  encryptBase64: jest.fn(),
  encryptWithAes: jest.fn(),
  generateAesKey: jest.fn(),
  isEncryptEnabled: jest.fn(() => false),
  rsaDecrypt: jest.fn(),
  rsaEncrypt: jest.fn(),
}));

jest.mock('./env', () => ({
  getBaseApi: jest.fn(() => '/dev-api'),
  getClientId: jest.fn(() => 'web-client'),
}));

jest.mock('./message', () => ({ showRuoyiError: jest.fn() }));
jest.mock('./sse', () => ({ stopSse: jest.fn() }));
jest.mock('./token', () => ({
  getToken: jest.fn(() => 'secret-token'),
  removeToken: jest.fn(),
}));

const mockedUmiRequest = umiRequest as jest.Mock;
const mockedGetToken = getToken as jest.Mock;

describe('main API request boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUmiRequest.mockReset();
    mockedUmiRequest.mockResolvedValue({
      data: { code: 200, data: null },
      request: { responseType: 'json' },
    });
  });

  it.each([
    'https://evil.invalid/data',
    '//evil.invalid/data',
    '/api/../auth',
    '/api/%2e%2e/auth',
    '/api/a%2fb',
    '/api\\auth',
  ])('rejects unsafe input before adding authentication headers: %s', async (value) => {
    await expect(ruoyiRequest(value)).rejects.toThrow();
    expect(mockedGetToken).not.toHaveBeenCalled();
    expect(mockedUmiRequest).not.toHaveBeenCalled();
  });

  it('prefixes safe paths with the configured main API', async () => {
    await ruoyiRequest('/system/user/list');

    expect(mockedUmiRequest).toHaveBeenCalledWith(
      '/dev-api/system/user/list',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-token',
        }),
      }),
    );
  });
});
