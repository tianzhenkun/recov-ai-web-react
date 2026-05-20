import {
  buildOwnerCommunicationDetail,
  MOCK_FEEDBACK,
  MOCK_IDENTITIES,
  MOCK_LIVE_STATS,
  MOCK_METRICS,
  MOCK_REJECT_REASONS,
  type OutboundOverview,
  type OwnerCommunicationDetail,
  type RejectReasonStat,
} from './_shared';

const MOCK_DELAY = 280;

const withDelay = <T>(value: T, ms: number = MOCK_DELAY): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });

export const fetchOutboundOverview = (): Promise<OutboundOverview> =>
  withDelay({
    metrics: MOCK_METRICS,
    liveStats: MOCK_LIVE_STATS,
    identities: MOCK_IDENTITIES,
    feedback: MOCK_FEEDBACK,
  });

export const fetchRejectReasonStats = (): Promise<RejectReasonStat[]> =>
  withDelay(MOCK_REJECT_REASONS);

export const fetchCommunicationLogs = (
  ownerName: string,
): Promise<OwnerCommunicationDetail> =>
  withDelay(buildOwnerCommunicationDetail(ownerName));
