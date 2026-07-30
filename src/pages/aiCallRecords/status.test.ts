import {
  getCustomerIntentPresentation,
  getFollowUpPresentation,
  hasUnstablePostCallData,
} from './status';

const baseRecord = {
  id: '1',
  callId: 'call-1',
  entryType: 'sip_outbound',
  status: 'completed',
  startedAt: '2026-07-30T10:00:00+08:00',
} as const;

describe('通话记录话后状态映射', () => {
  it('区分语义分析中、失败和客户意向', () => {
    expect(
      getCustomerIntentPresentation({
        ...baseRecord,
        analysisStatus: '1',
      }),
    ).toMatchObject({ text: '分析中', color: 'processing' });
    expect(
      getCustomerIntentPresentation({
        ...baseRecord,
        analysisStatus: '3',
      }),
    ).toMatchObject({ text: '分析失败', color: 'error' });
    expect(
      getCustomerIntentPresentation({
        ...baseRecord,
        analysisStatus: '2',
        customerIntent: 'positive',
      }),
    ).toMatchObject({ text: '正向', color: 'success' });
  });

  it('区分建议跟进与已创建的正式跟进任务', () => {
    expect(
      getFollowUpPresentation({
        ...baseRecord,
        followUpSuggested: true,
      }),
    ).toMatchObject({
      text: '建议跟进',
      color: 'warning',
      target: 'record',
    });
    expect(
      getFollowUpPresentation({
        ...baseRecord,
        followUpSuggested: true,
        followUpId: 'follow-up-1',
        followUpStatus: 'pending',
      }),
    ).toMatchObject({
      text: '待跟进',
      color: 'warning',
      target: 'follow_up',
    });
  });

  it('不把 Mock 记录展示成正式话后结论', () => {
    const mockRecord = {
      ...baseRecord,
      entryType: 'outbound_mock',
      analysisStatus: '2',
      customerIntent: 'positive',
      followUpSuggested: true,
    } as const;
    expect(getCustomerIntentPresentation(mockRecord)).toBeNull();
    expect(getFollowUpPresentation(mockRecord)).toBeNull();
  });

  it('把关联不完整的正式跟进任务标记为状态异常', () => {
    expect(
      getFollowUpPresentation({
        ...baseRecord,
        followUpId: 'follow-up-1',
        followUpStatus: null,
      }),
    ).toMatchObject({
      text: '状态异常',
      color: 'error',
      target: null,
    });
  });

  it('只对尚未终止或仍在分析的正式通话启用有界轮询', () => {
    expect(
      hasUnstablePostCallData([
        { ...baseRecord, status: 'running' },
        { ...baseRecord, analysisStatus: '2' },
      ]),
    ).toBe(true);
    expect(
      hasUnstablePostCallData([
        { ...baseRecord, analysisStatus: '2' },
        {
          ...baseRecord,
          status: 'failed',
          analysisStatus: '3',
        },
      ]),
    ).toBe(false);
    expect(
      hasUnstablePostCallData([
        {
          ...baseRecord,
          entryType: 'outbound_mock',
          status: 'running',
        },
      ]),
    ).toBe(false);
  });
});
