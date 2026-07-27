import {
  getAiCallRecordDetail,
  getAiCallRecordDialogue,
  getAiCallRecordEvents,
  getAiCallRecordHandoffs,
  getAiCallRecordRecording,
  getAiCallRecordSemanticAnalysis,
  listAiCallRecords,
} from './service';

const mockRequest = jest.fn();

jest.mock('@umijs/max', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

describe('AI Call 通话记录服务', () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  it('通过独立 AI Call 代理分页查询统一通话记录', async () => {
    mockRequest.mockResolvedValue({
      rows: [{ callId: 'call-1', entryType: 'web' }],
      total: 1,
    });

    const result = await listAiCallRecords({
      pageNum: 1,
      pageSize: 10,
      entryType: 'web',
    });

    expect(mockRequest).toHaveBeenCalledWith(
      '/ai-call-agent-api/ai-call/records',
      {
        method: 'get',
        params: { pageNum: 1, pageSize: 10, entryType: 'web' },
      },
    );
    expect(result).toEqual({
      rows: [{ callId: 'call-1', entryType: 'web' }],
      total: 1,
    });
  });

  it('查询详情和五类附属信息并正确编码通话 ID', async () => {
    mockRequest
      .mockResolvedValueOnce({ data: { record: { callId: 'call/1' } } })
      .mockResolvedValueOnce({ data: { status: 'completed' } })
      .mockResolvedValueOnce({ data: { rows: [{ text: '您好' }], total: 1 } })
      .mockResolvedValueOnce({ data: { analysisStatus: 'completed' } })
      .mockResolvedValueOnce({
        data: { rows: [{ handoffId: 'handoff-1' }], total: 1 },
      })
      .mockResolvedValueOnce({
        data: { rows: [{ eventId: 'event-1' }], total: 1 },
      });

    await getAiCallRecordDetail('call/1');
    await getAiCallRecordRecording('call/1');
    await getAiCallRecordDialogue('call/1');
    await getAiCallRecordSemanticAnalysis('call/1');
    await getAiCallRecordHandoffs('call/1');
    await getAiCallRecordEvents('call/1');

    expect(mockRequest.mock.calls.map(([path]) => path)).toEqual([
      '/ai-call-agent-api/ai-call/records/call%2F1',
      '/ai-call-agent-api/ai-call/records/call%2F1/recording',
      '/ai-call-agent-api/ai-call/records/call%2F1/dialogue-segments',
      '/ai-call-agent-api/ai-call/records/call%2F1/semantic-analysis',
      '/ai-call-agent-api/ai-call/records/call%2F1/handoffs',
      '/ai-call-agent-api/ai-call/records/call%2F1/events',
    ]);
    expect(mockRequest).toHaveBeenNthCalledWith(
      3,
      '/ai-call-agent-api/ai-call/records/call%2F1/dialogue-segments',
      { method: 'get', params: { limit: 1000 } },
    );
    expect(mockRequest).toHaveBeenNthCalledWith(
      6,
      '/ai-call-agent-api/ai-call/records/call%2F1/events',
      { method: 'get', params: { limit: 200 } },
    );
  });
});
