import { fetchEventSource } from '@microsoft/fetch-event-source';
import { history } from '@umijs/max';
import { getBaseApi, getSseApi } from './env';
import { getSseUrl, startSse, stopSse, subscribeSseMessage } from './sse';

jest.mock('@umijs/max', () => ({
  history: {
    location: {
      hash: '',
      pathname: '/index',
      search: '',
    },
    replace: jest.fn(),
  },
}));

jest.mock('@microsoft/fetch-event-source', () => ({
  EventStreamContentType: 'text/event-stream',
  fetchEventSource: jest.fn(() => Promise.resolve()),
}));

jest.mock('./env', () => ({
  getBaseApi: jest.fn(() => '/dev-api'),
  getClientId: () => 'test-client',
  getSseApi: jest.fn(() => '/resource/sse'),
}));

jest.mock('./message', () => ({
  showRuoyiHtmlInfo: jest.fn(),
}));

const getFetchOptions = () => (fetchEventSource as jest.Mock).mock.calls[0][1];
const getBaseApiMock = getBaseApi as jest.Mock;
const getSseApiMock = getSseApi as jest.Mock;

const createMockResponse = ({
  contentType,
  ok = true,
  status = 200,
  payload,
}: {
  contentType: string;
  ok?: boolean;
  status?: number;
  payload?: unknown;
}) =>
  ({
    clone: () => ({
      json: async () => payload,
    }),
    headers: {
      get: (key: string) =>
        key.toLowerCase() === 'content-type' ? contentType : null,
    },
    ok,
    status,
  }) as Response;

describe('ruoyi sse adapter', () => {
  beforeEach(() => {
    getBaseApiMock.mockReturnValue('/dev-api');
    getSseApiMock.mockReturnValue('/resource/sse');
  });

  afterEach(() => {
    stopSse();
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('ignores comment-only heartbeat messages', () => {
    localStorage.setItem('Admin-Token', 'token');
    const listener = jest.fn();
    const unsubscribe = subscribeSseMessage(listener);

    startSse();
    getFetchOptions().onmessage({
      data: '',
      event: '',
      id: '',
      retry: undefined,
    });

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('dispatches typed business messages', () => {
    localStorage.setItem('Admin-Token', 'token');
    const listener = jest.fn();
    const unsubscribe = subscribeSseMessage(listener);

    startSse();
    getFetchOptions().onmessage({
      data: '{"type":"recov.flow_event.changed"}',
      event: 'message',
      id: '',
      retry: undefined,
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'message',
        type: 'recov.flow_event.changed',
      }),
    );
    unsubscribe();
  });

  it.each([
    'https://evil.invalid/events',
    '//evil.invalid/events',
    '/resource/../events',
    '/resource/%2e%2e/events',
    '/resource/a%2fb',
    '/resource\\events',
  ])('rejects unsafe SSE paths: %s', (ssePath) => {
    getSseApiMock.mockReturnValue(ssePath);

    expect(() => getSseUrl()).toThrow();
  });

  it('treats ruoyi json unauthorized response as fatal', async () => {
    localStorage.setItem('Admin-Token', 'token');

    startSse();
    const options = getFetchOptions();
    let authError: unknown;
    try {
      await options.onopen(
        createMockResponse({
          contentType: 'application/json',
          payload: { code: 401, msg: '认证失败' },
        }),
      );
    } catch (error) {
      authError = error;
    }

    expect(authError).toEqual(expect.any(Error));
    expect(() => options.onerror(authError)).toThrow('SSE unauthorized.');
    expect(localStorage.getItem('Admin-Token')).toBeNull();
    expect(history.replace).toHaveBeenCalledWith(
      '/user/login?redirect=%2Findex',
    );
  });
});
