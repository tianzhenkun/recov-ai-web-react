import { ruoyiRequest } from '@/adapters/ruoyi/request';
import { getAiCallAgentWebRtcConfig } from './service';

jest.mock('@/adapters/ruoyi/request', () => ({
  ruoyiRequest: jest.fn(),
}));

const mockedRequest = ruoyiRequest as jest.Mock;

describe('intelligent outbound service', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({ code: 200, data: null });
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
});
