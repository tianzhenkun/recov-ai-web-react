import { history, request as umiRequest } from '@umijs/max';
import { showRuoyiError } from './message';
import { ruoyiRequest } from './request';
import { RuoyiError } from './response';
import { stopSse } from './sse';
import { getToken, removeToken } from './token';

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
const mockedHistoryReplace = history.replace as jest.Mock;
const mockedRemoveToken = removeToken as jest.Mock;
const mockedShowRuoyiError = showRuoyiError as jest.Mock;
const mockedStopSse = stopSse as jest.Mock;

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

  it('preserves backend 401 errors for anonymous requests without redirecting to login', async () => {
    mockedUmiRequest.mockResolvedValueOnce({
      data: { code: 401, msg: '验证码已失效，请重新获取。' },
      request: { responseType: 'json' },
    });

    await expect(
      ruoyiRequest('/auth/code', { headers: { isToken: false } }),
    ).rejects.toThrow('验证码已失效，请重新获取。');

    expect(mockedUmiRequest.mock.calls[0][1].headers).not.toHaveProperty(
      'Authorization',
    );
    expect(mockedStopSse).not.toHaveBeenCalled();
    expect(mockedRemoveToken).not.toHaveBeenCalled();
    expect(mockedHistoryReplace).not.toHaveBeenCalled();
    expect(mockedShowRuoyiError).toHaveBeenCalledTimes(1);
    expect(mockedShowRuoyiError).toHaveBeenCalledWith(
      '验证码已失效，请重新获取。',
    );
  });

  it('clears the session and shows one fixed message for authenticated 401 errors', async () => {
    mockedUmiRequest.mockResolvedValueOnce({
      data: { code: 401, msg: '后端未登录消息' },
      request: { responseType: 'json' },
    });

    await expect(ruoyiRequest('/system/user/getInfo')).rejects.toThrow(
      '无效的会话，或者会话已过期，请重新登录。',
    );

    expect(mockedStopSse).toHaveBeenCalledTimes(1);
    expect(mockedRemoveToken).toHaveBeenCalledTimes(1);
    expect(mockedHistoryReplace).toHaveBeenCalledTimes(1);
    expect(mockedShowRuoyiError).toHaveBeenCalledTimes(1);
    expect(mockedShowRuoyiError).toHaveBeenCalledWith(
      '无效的会话，或者会话已过期，请重新登录。',
    );
  });

  it('handles authenticated HTTP 401 responses as expired sessions', async () => {
    mockedUmiRequest.mockRejectedValueOnce(
      Object.assign(new Error('Request failed with status code 401'), {
        response: {
          data: 'Unauthorized',
          request: { responseType: 'json' },
          status: 401,
        },
      }),
    );

    const requestPromise = ruoyiRequest('/system/user/getInfo');

    await expect(requestPromise).rejects.toMatchObject({
      message: '无效的会话，或者会话已过期，请重新登录。',
      name: RuoyiError.name,
    });
    expect(mockedStopSse).toHaveBeenCalledTimes(1);
    expect(mockedRemoveToken).toHaveBeenCalledTimes(1);
    expect(mockedHistoryReplace).toHaveBeenCalledTimes(1);
    expect(mockedShowRuoyiError).toHaveBeenCalledTimes(1);
    expect(mockedShowRuoyiError).toHaveBeenCalledWith(
      '无效的会话，或者会话已过期，请重新登录。',
    );
  });

  it('keeps anonymous HTTP 401 responses in the ordinary network error flow', async () => {
    const requestError = Object.assign(
      new Error('Request failed with status code 401'),
      {
        response: {
          data: 'Unauthorized',
          request: { responseType: 'json' },
          status: 401,
        },
      },
    );
    mockedUmiRequest.mockRejectedValueOnce(requestError);

    const requestPromise = ruoyiRequest('/auth/code', {
      headers: { isToken: false },
    });

    await expect(requestPromise).rejects.toBe(requestError);
    expect(mockedStopSse).not.toHaveBeenCalled();
    expect(mockedRemoveToken).not.toHaveBeenCalled();
    expect(mockedHistoryReplace).not.toHaveBeenCalled();
    expect(mockedShowRuoyiError).toHaveBeenCalledTimes(1);
    expect(mockedShowRuoyiError).toHaveBeenCalledWith('Response status:401');
  });

  it('handles authenticated HTTP 401 without showing an error when the handler is skipped', async () => {
    mockedUmiRequest.mockRejectedValueOnce(
      Object.assign(new Error('Request failed with status code 401'), {
        response: {
          data: 'Unauthorized',
          request: { responseType: 'json' },
          status: 401,
        },
      }),
    );

    const requestPromise = ruoyiRequest('/system/user/getInfo', {
      skipErrorHandler: true,
    });

    await expect(requestPromise).rejects.toMatchObject({
      message: '无效的会话，或者会话已过期，请重新登录。',
      name: RuoyiError.name,
    });
    expect(mockedStopSse).toHaveBeenCalledTimes(1);
    expect(mockedRemoveToken).toHaveBeenCalledTimes(1);
    expect(mockedHistoryReplace).toHaveBeenCalledTimes(1);
    expect(mockedShowRuoyiError).not.toHaveBeenCalled();
  });
});
