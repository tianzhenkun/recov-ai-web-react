import { ruoyiRequest } from '@/adapters/ruoyi/request';
import {
  claimAiCallHandoff,
  getAiCallAgentWebRtcConfig,
  getGatewayCalls,
  hangupGatewayCall,
} from './service';

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

  it('claims handoff calls through the voice api proxy', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ status: 'accepted', call: {} }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      claimAiCallHandoff({
        callRecordId: 101,
        gatewayCallId: 'gateway-101',
        agentExtension: '1001',
        timeoutSeconds: 20,
      }),
    ).resolves.toEqual({ status: 'accepted', call: {} });

    expect(fetchMock).toHaveBeenCalledWith(
      '/voice-api/calls/gateway-101/handoff/claim',
      {
        method: 'post',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_extension: '1001',
          claimed_by: '1001',
          timeout_seconds: 20,
        }),
      },
    );
    expect(mockedRequest).not.toHaveBeenCalledWith(
      '/system/recov/ai-call/handoff/claim',
      expect.anything(),
    );
  });

  it('hangs up gateway calls through the voice api proxy', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ status: 'accepted', call: {} }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      hangupGatewayCall({
        gatewayCallId: 'gateway-101',
        reason: 'agent_hangup',
      }),
    ).resolves.toEqual({ status: 'accepted', call: {} });

    expect(fetchMock).toHaveBeenCalledWith(
      '/voice-api/calls/gateway-101/hangup',
      {
        method: 'post',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'agent_hangup',
        }),
      },
    );
  });
});
