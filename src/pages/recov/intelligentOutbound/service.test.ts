import { ruoyiRequest } from '@/adapters/ruoyi/request';
import { getAiCallAgentWebRtcConfig, getGatewayCalls } from './service';

jest.mock('@/adapters/ruoyi/request', () => ({
  ruoyiRequest: jest.fn(),
}));

const mockedRequest = ruoyiRequest as jest.Mock;
const originalFetch = global.fetch;

describe('intelligent outbound service', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({ code: 200, data: null });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('loads optional WebRTC config without global error handling', async () => {
    await getAiCallAgentWebRtcConfig();

    expect(mockedRequest).toHaveBeenCalledWith(
      '/system/recov/ai-call/agent/webrtc-config',
      {
        method: 'get',
        skipErrorHandler: true,
      },
    );
  });

  it('loads realtime gateway calls through the voice api proxy', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ calls: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(getGatewayCalls()).resolves.toEqual({ calls: [] });

    expect(fetchMock).toHaveBeenCalledWith('/voice-api/calls', {
      method: 'get',
      credentials: 'same-origin',
    });
  });
});
