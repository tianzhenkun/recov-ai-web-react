import { ruoyiRequest } from '@/adapters/ruoyi/request';
import {
  createAiCallRuntimeStartCall,
  getAiCallRuntimeBootstrap,
} from './ai-call-runtime';

jest.mock('@/adapters/ruoyi/request', () => ({
  ruoyiRequest: jest.fn(),
}));

const mockRuoyiRequest = ruoyiRequest as jest.Mock;

describe('AI Call runtime entry service', () => {
  beforeEach(() => {
    mockRuoyiRequest.mockReset();
  });

  it('submits an authenticated owner START_CALL through the agent proxy', async () => {
    const accepted = {
      commandId: '101',
      callId: 'call_101',
      commandSeq: '1',
      commandType: 'START_CALL',
      status: 'PENDING',
    };
    mockRuoyiRequest.mockResolvedValueOnce({ code: 200, data: accepted });

    await expect(
      createAiCallRuntimeStartCall({
        entryType: 'web',
        idempotencyKey: 'start:web:1',
        payload: { businessId: 'biz-1', voice: 'v1' },
        businessId: 'biz-1',
        sceneCode: 'collection',
      }),
    ).resolves.toEqual(accepted);

    expect(mockRuoyiRequest).toHaveBeenCalledWith(
      '/ai-call/runtime/start-call',
      {
        baseApi: '/ai-call-agent-api',
        method: 'post',
        data: {
          entryType: 'web',
          idempotencyKey: 'start:web:1',
          payload: { businessId: 'biz-1', voice: 'v1' },
          businessId: 'biz-1',
          sceneCode: 'collection',
        },
        repeatSubmit: false,
      },
    );
  });

  it('rejects an envelope without persistent start data', async () => {
    mockRuoyiRequest.mockResolvedValueOnce({ code: 200 });

    await expect(
      createAiCallRuntimeStartCall({
        entryType: 'preview',
        idempotencyKey: 'start:preview:1',
        payload: { voice: 'v1' },
      }),
    ).rejects.toThrow('接口响应缺少 data');
  });

  it('reads owner bootstrap readiness without treating it as a token', async () => {
    const bootstrap = {
      callId: 'call_101',
      entryType: 'web',
      phase: 'starting',
      roomName: 'ai-call-call_101',
      participantIdentity: 'agent-call_101',
      runtimeFencingToken: 7,
      agentMediaReadyAt: null,
      terminalRequestedAt: null,
      tokenAvailable: false,
    };
    mockRuoyiRequest.mockResolvedValueOnce({ code: 200, data: bootstrap });

    await expect(getAiCallRuntimeBootstrap('call_101')).resolves.toEqual(
      bootstrap,
    );
    expect(mockRuoyiRequest).toHaveBeenCalledWith(
      '/ai-call/runtime/calls/call_101/bootstrap',
      {
        baseApi: '/ai-call-agent-api',
        method: 'get',
      },
    );
  });
});
