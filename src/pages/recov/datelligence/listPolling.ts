export const DATELLIGENCE_LIST_POLLING_INTERVAL = 10_000;

type DatelligenceListPollingState = {
  pageVisible: boolean;
  hasPipelinePolling: boolean;
  hasOutboundFlowPolling: boolean;
};

export const shouldPollDatelligenceList = ({
  pageVisible,
  hasPipelinePolling,
  hasOutboundFlowPolling,
}: DatelligenceListPollingState) =>
  pageVisible && !hasPipelinePolling && !hasOutboundFlowPolling;
