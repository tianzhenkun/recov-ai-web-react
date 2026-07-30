import {
  getHandoffCustomerIdentity,
  getHandoffReasonLabel,
  normalizeHandoffDetail,
  normalizeHandoffMetrics,
  statusColors,
} from './_shared';

describe('agent administration presentation', () => {
  it('uses clear Chinese labels and semantic colors', () => {
    expect(getHandoffReasonLabel('customer_request')).toBe('客户要求转人工');
    expect(getHandoffReasonLabel('business_escalation')).toBe('业务升级转人工');
    expect(getHandoffReasonLabel('unknown_reason')).toBe('其他原因');
    expect(statusColors.completed).toBe('success');
    expect(statusColors.failed).toBe('error');
    expect(statusColors.expired).toBe('orange');
  });

  it('falls back from masked customer data to a stable business or call identity', () => {
    expect(
      getHandoffCustomerIdentity({
        masked_customer_name: '张**',
        masked_contact: '138****0000',
        business_id: 'lead-1',
        call_id: 'call-1',
      }),
    ).toEqual({
      primary: '张**',
      secondary: '138****0000',
    });
    expect(
      getHandoffCustomerIdentity({
        business_id: 'lead-2',
        call_id: 'call-2',
      }),
    ).toEqual({
      primary: '业务编号 lead-2',
      secondary: '通话 call-2',
    });
    expect(getHandoffCustomerIdentity({ call_id: 'call-3' })).toEqual({
      primary: '通话 call-3',
      secondary: '客户姓名未提供',
    });
  });

  it('normalizes the nested admin detail contract and real metric keys', () => {
    expect(
      normalizeHandoffDetail({
        data: {
          handoff: {
            handoff_id: 'handoff-1',
            call_id: 'call-1',
            scene_code: 'intro_geo',
            status: 'completed',
            requested_at: '2026-07-27T01:00:00Z',
            request_reason: 'customer_request',
          },
          record: {
            masked_contact: '138****0000',
            business_id: 'lead-1',
          },
          after_call_work: { summary: '客户问题已解决' },
          follow_up: { id: 'follow-up-1' },
        },
      }),
    ).toMatchObject({
      handoff: { handoff_id: 'handoff-1' },
      record: { masked_contact: '138****0000' },
      afterCallWork: { summary: '客户问题已解决' },
      followUp: { id: 'follow-up-1' },
    });

    expect(
      normalizeHandoffMetrics({
        request_count: 43,
        connected_rate_within_60_seconds: 0.75,
        average_wait_seconds: 12.6,
        timeout_count: 2,
        media_failure_count: 1,
      }),
    ).toEqual({
      requests: 43,
      connectRate: 75,
      averageWaitSeconds: 12.6,
      timeoutCount: 2,
      mediaFailureCount: 1,
    });
  });
});
