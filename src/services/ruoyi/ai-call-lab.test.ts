import {
  getAiCallLabPromptProfiles,
  getAiCallLabVoiceProfiles,
  unwrapAiCallLabPage,
} from './ai-call-lab';

const mockRequest = jest.fn();

jest.mock('@umijs/max', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

describe('AI Call Lab configuration service', () => {
  beforeEach(() => {
    mockRequest.mockReset();
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

  it('loads prompt and voice profiles from the existing Lab endpoints', async () => {
    mockRequest
      .mockResolvedValueOnce({
        data: {
          rows: [{ id: 'prompt-1', name: '客户回访', sceneCode: 'follow_up' }],
          total: 1,
        },
      })
      .mockResolvedValueOnce({
        data: {
          rows: [{ voice: 'Cherry', displayName: '芊悦' }],
          total: 1,
        },
      });

    await getAiCallLabPromptProfiles();
    await getAiCallLabVoiceProfiles();

    expect(mockRequest).toHaveBeenNthCalledWith(
      1,
      '/ai-call-lab-api/ai-call/prompt-profiles',
      { method: 'get', params: { pageSize: 200 } },
    );
    expect(mockRequest).toHaveBeenNthCalledWith(
      2,
      '/ai-call-lab-api/ai-call/voice-profiles',
      { method: 'get', params: { pageSize: 200 } },
    );
  });
});
