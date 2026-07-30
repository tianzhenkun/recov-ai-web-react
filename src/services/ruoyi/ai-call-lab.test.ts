import {
  getAiCallLabPromptProfiles,
  getAiCallLabVoiceProfiles,
  unwrapAiCallLabPage,
} from './ai-call-lab';

const mockRequest = jest.fn();
const mockRuoyiRequest = jest.fn();

jest.mock('@umijs/max', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

jest.mock('@/adapters/ruoyi/request', () => ({
  ruoyiRequest: (...args: unknown[]) => mockRuoyiRequest(...args),
}));

describe('AI Call Lab configuration service', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockRuoyiRequest.mockReset();
  });

  it('unwraps data.rows and top-level rows responses', () => {
    expect(
      unwrapAiCallLabPage({
        data: { rows: [{ id: 'profile-1' }], total: 1 },
      }),
    ).toEqual({ rows: [{ id: 'profile-1' }], total: 1 });
    expect(
      unwrapAiCallLabPage({
        rows: [{ id: 'profile-2' }],
        total: 1,
      }),
    ).toEqual({ rows: [{ id: 'profile-2' }], total: 1 });
  });

  it('loads prompt profiles from the existing Lab endpoint', async () => {
    mockRequest.mockResolvedValueOnce({
      data: {
        rows: [{ id: 'prompt-1', name: '客户回访', sceneCode: 'follow_up' }],
        total: 1,
      },
    });

    await getAiCallLabPromptProfiles();

    expect(mockRequest).toHaveBeenCalledWith(
      '/ai-call-lab-api/ai-call/prompt-profiles',
      { method: 'get', params: { pageSize: 200 } },
    );
  });

  it('loads only available voices for formal tasks through the authenticated voice service', async () => {
    mockRuoyiRequest.mockResolvedValue({
      code: 200,
      rows: [],
      total: 0,
    });

    await getAiCallLabVoiceProfiles({ availableOnly: true, pageSize: 200 });

    expect(mockRuoyiRequest).toHaveBeenCalledWith(
      '/ai-call/voice-profiles',
      expect.objectContaining({
        baseApi: '/ai-call-agent-api',
        method: 'get',
        params: expect.objectContaining({
          availableOnly: true,
          pageSize: 200,
        }),
      }),
    );
  });
});
