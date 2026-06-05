import {
  DATELLIGENCE_LIST_POLLING_INTERVAL,
  shouldPollDatelligenceList,
} from './listPolling';

describe('datelligence list polling policy', () => {
  it('uses a 10 second interval for lightweight list status refresh', () => {
    expect(DATELLIGENCE_LIST_POLLING_INTERVAL).toBe(10_000);
  });

  it('polls only when the page is visible and no task-level polling is active', () => {
    expect(
      shouldPollDatelligenceList({
        hasOutboundFlowPolling: false,
        hasPipelinePolling: false,
        pageVisible: true,
      }),
    ).toBe(true);

    expect(
      shouldPollDatelligenceList({
        hasOutboundFlowPolling: false,
        hasPipelinePolling: false,
        pageVisible: false,
      }),
    ).toBe(false);

    expect(
      shouldPollDatelligenceList({
        hasOutboundFlowPolling: false,
        hasPipelinePolling: true,
        pageVisible: true,
      }),
    ).toBe(false);

    expect(
      shouldPollDatelligenceList({
        hasOutboundFlowPolling: true,
        hasPipelinePolling: false,
        pageVisible: true,
      }),
    ).toBe(false);
  });
});
