import {
  CheckCircleOutlined,
  LinkOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Image,
  Modal,
  message,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Timeline,
  Typography,
  theme,
} from 'antd';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type FlowEventItem,
  type FlowExecutionTrace,
  type FlowFilingEvidence,
  type FlowInstanceDetail,
  type FlowTraceStep,
  getFilingMaterialSubmitEvidence,
  getFlowEvents,
  getFlowExecutionTrace,
  getFlowInstanceDetail,
  type LitigationCourtItem,
  listLitigationCourts,
  retryFlowCurrentStep,
  saveFlowCourt,
} from '@/services/ruoyi/flowInstance';
import { listOssByIds, type OssItem } from '@/services/ruoyi/oss';
import {
  buildInitialFlowModuleMap,
  getFlowModuleMeta,
} from '../../collectionStrategy/_shared';

const { Paragraph, Text } = Typography;

const TRACE_POLLING_INTERVAL = 4000;
const FILING_MATERIAL_SUBMIT_NODE_CODE = 'filing_material_submit';
const flowModuleMap = buildInitialFlowModuleMap();
const COURT_SELECTION_FAILURE_KEYWORDS = [
  '无法自动确定受理法院',
  '请选择法院后继续',
  'AI未能确定唯一法院',
];

type FlowTraceDrawerProps = {
  open: boolean;
  instanceId?: number | string | null;
  onClose: () => void;
  onChanged?: () => void;
};

const toText = (value: unknown) =>
  value === null || value === undefined || value === '' ? '-' : String(value);

const toCleanText = (value: unknown) => String(value ?? '').trim();

const courtOptionKey = (court: LitigationCourtItem) =>
  toCleanText(court.courtKey || court.id || court.courtName);

const isCourtSelectionFailureText = (value?: string | null) => {
  const text = toCleanText(value);
  return COURT_SELECTION_FAILURE_KEYWORDS.some((keyword) =>
    text.includes(keyword),
  );
};

const shouldShowNodeIdentity = (nodeCode?: string | null) =>
  nodeCode === 'ai_call';

const FLOW_IDENTITY_NAMES = ['项目员工', '企业法务', '企业客服', '律师'];

const formatNodeName = (nodeCode?: string | null, identity?: string | null) => {
  if (!nodeCode && !identity) return '-';
  if (!nodeCode) return toText(identity);
  const meta = getFlowModuleMeta(flowModuleMap, nodeCode);
  const label = meta.label || nodeCode;
  if (shouldShowNodeIdentity(nodeCode) && identity && identity !== label) {
    return `${label}（${identity}）`;
  }
  return label;
};

const normalizeStatus = (value: unknown) => String(value ?? '').trim();

const isPollingFlowStatus = (value: unknown) => {
  const status = normalizeStatus(value);
  return status === '0' || status === '1';
};

const isPendingTriggerStatus = (value: unknown) =>
  normalizeStatus(value) === '0';

const isWaitingCallbackStatus = (value: unknown) =>
  normalizeStatus(value) === '1';

const isNodeFailedStatus = (value: unknown) => normalizeStatus(value) === '3';

const isTerminalFlowStatus = (value: unknown) => {
  const status = normalizeStatus(value);
  return status === '2' || status === '4' || status === '5' || status === '6';
};

const flowStatusColor = (value: unknown) => {
  const status = normalizeStatus(value);
  if (status === '2') return 'success';
  if (status === '3') return 'error';
  if (status === '4' || status === '5' || status === '6') return 'default';
  if (status === '0' || status === '1') return 'processing';
  return 'default';
};

const filingEvidenceStatusColor = (value: unknown) => {
  const status = normalizeStatus(value);
  if (status === '2') return 'success';
  if (status === '3') return 'error';
  if (status === '1') return 'processing';
  if (status === '4') return 'warning';
  return 'default';
};

const flowStatusText = (value: unknown, statusName?: string) => {
  const status = normalizeStatus(value);
  if (status === '0') return '待触发';
  if (status === '1') return '等待回调';
  if (status === '2') return '已完成';
  if (status === '3') return '节点失败';
  if (status === '4') return '人工终止';
  if (status === '5') return '已还款终止';
  if (status === '6') return '条件不满足终止';
  return statusName || toText(value);
};

const technicalMessagePattern =
  /\b(?:deliveryId|deliveryTaskId|instrumentTaskId|sealedOssId|taskId|recordId|businessId|status|message)=/i;

const technicalTailPattern = /^[a-z]+_[a-z0-9_-]*$/i;

const toUserFacingTraceMessage = (value?: string | null) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const withoutRoutePrefix = raw.replace(/^\[[^\]]+\]\s*/, '').trim();
  const separatorIndex = withoutRoutePrefix.search(/[：:]/);
  if (separatorIndex >= 0) {
    const summary = withoutRoutePrefix.slice(0, separatorIndex).trim();
    const detail = withoutRoutePrefix.slice(separatorIndex + 1).trim();
    if (
      summary &&
      (technicalMessagePattern.test(detail) ||
        technicalTailPattern.test(detail) ||
        /mock provider/i.test(detail))
    ) {
      return summary;
    }
  }

  if (
    technicalMessagePattern.test(withoutRoutePrefix) ||
    /mock provider/i.test(withoutRoutePrefix)
  ) {
    return null;
  }

  return withoutRoutePrefix;
};

const stepStatusMeta = (step: FlowTraceStep) => {
  if (step.stepStatus === 'DONE') {
    return {
      timelineColor: 'blue',
      tagColor: undefined,
      text: '已完成',
    };
  }
  if (step.stepStatus === 'BLOCKED' || step.stepStatus === 'FAILED') {
    return {
      timelineColor: 'red',
      tagColor: 'error',
      text:
        step.stepStatus === 'BLOCKED'
          ? '流程阻塞'
          : step.stepStatusName || '执行失败',
    };
  }
  if (step.stepStatus === 'RUNNING') {
    return {
      timelineColor: 'blue',
      tagColor: 'processing',
      text: step.stepStatusName || '处理中',
    };
  }
  if (step.stepStatus === 'PENDING_TRIGGER') {
    return {
      timelineColor: 'blue',
      tagColor: 'processing',
      text: step.stepStatusName || '等待触发',
    };
  }
  if (step.stepStatus === 'SKIPPED') {
    return {
      timelineColor: 'gray',
      tagColor: 'default',
      text: step.stepStatusName || '已跳过',
    };
  }
  return {
    timelineColor: 'gray',
    tagColor: 'default',
    text: step.stepStatusName || step.stepStatus || '未开始',
  };
};

const stepUserMessage = (step: FlowTraceStep) => {
  if (step.stepStatus === 'BLOCKED' || step.stepStatus === 'FAILED') {
    return (
      toUserFacingTraceMessage(step.latestResultMessage) ||
      toUserFacingTraceMessage(step.latestProgressMessage)
    );
  }
  if (step.stepStatus === 'RUNNING' || step.stepStatus === 'PENDING_TRIGGER') {
    return (
      toUserFacingTraceMessage(step.latestProgressMessage) ||
      toUserFacingTraceMessage(step.latestResultMessage)
    );
  }
  if (step.stepStatus === 'SKIPPED') {
    return toUserFacingTraceMessage(step.latestResultMessage);
  }
  return null;
};

const renderCurrentRunningStepDot = (step: FlowTraceStep) => {
  if (
    !step.current ||
    (step.stepStatus !== 'RUNNING' && step.stepStatus !== 'PENDING_TRIGGER')
  ) {
    return undefined;
  }

  return (
    <span className="flow-trace-current-step-dot inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-50 text-blue-600">
      <LoadingOutlined aria-hidden={true} spin style={{ fontSize: 12 }} />
    </span>
  );
};

const currentStepOf = (trace?: FlowExecutionTrace | null) => {
  const steps = trace?.steps ?? [];
  return (
    steps.find((step) => step.current) ??
    steps.find((step) => step.stepId === trace?.currentStepId) ??
    steps.find((step) => step.stepIndex === trace?.currentStepIndex) ??
    null
  );
};

const parseData = (value?: string | null): Record<string, unknown> | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const eventColor = (eventType?: string) => {
  if (eventType === 'node_failed') return 'red';
  if (eventType === 'node_skipped') return 'gold';
  if (eventType === 'node_delayed') return 'orange';
  if (eventType === 'flow_completed') return 'green';
  if (eventType === 'flow_terminated') return 'gray';
  return 'blue';
};

const renderEventChange = (event: FlowEventItem) => {
  if (event.eventType !== 'node_delayed') return null;
  const beforeData = parseData(event.beforeData);
  const afterData = parseData(event.afterData);
  const oldWakeUpTime = beforeData?.wakeUpTime;
  const newWakeUpTime = afterData?.wakeUpTime;
  if (!oldWakeUpTime && !newWakeUpTime) return null;
  return (
    <div className="mt-2 grid grid-cols-[72px_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
      <Text type="secondary">原计划</Text>
      <Text>{toText(oldWakeUpTime)}</Text>
      <Text type="secondary">调整后</Text>
      <Text>{toText(newWakeUpTime)}</Text>
    </div>
  );
};

const normalizeEventNodeText = (
  value?: string | null,
  event?: FlowEventItem,
) => {
  if (!value || !event?.nodeCode) return value || '';
  const nodeName = formatNodeName(event.nodeCode);
  if (!nodeName || nodeName === '-') return value;
  return FLOW_IDENTITY_NAMES.reduce(
    (next, identity) =>
      next
        .replaceAll(`当前节点：${identity}`, `当前节点：${nodeName}`)
        .replaceAll(`${identity}节点`, nodeName),
    value,
  );
};

const FlowTraceDrawer = ({
  open,
  instanceId,
  onClose,
  onChanged,
}: FlowTraceDrawerProps) => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const { token } = theme.useToken();
  const [detail, setDetail] = useState<FlowInstanceDetail | null>(null);
  const [trace, setTrace] = useState<FlowExecutionTrace | null>(null);
  const [events, setEvents] = useState<FlowEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filingEvidence, setFilingEvidence] =
    useState<FlowFilingEvidence | null>(null);
  const [filingEvidenceLoading, setFilingEvidenceLoading] = useState(false);
  const [filingEvidenceOssMap, setFilingEvidenceOssMap] = useState<
    Map<string, OssItem>
  >(new Map());
  const [retrying, setRetrying] = useState(false);
  const [courtLoading, setCourtLoading] = useState(false);
  const [courtSaving, setCourtSaving] = useState(false);
  const [courtOptions, setCourtOptions] = useState<LitigationCourtItem[]>([]);
  const [selectedCourtKey, setSelectedCourtKey] = useState<string>();
  const pollingTimerRef = useRef<number | null>(null);
  const requestSeqRef = useRef(0);

  const currentStep = useMemo(() => currentStepOf(trace), [trace]);
  const retryStepId = currentStep?.stepId ?? trace?.currentStepId;
  const canRetryCurrentStep =
    !!trace?.canRetryCurrentStep &&
    !!retryStepId &&
    !isTerminalFlowStatus(trace.flowStatus);
  const shouldPollTrace =
    open && !!trace && isPollingFlowStatus(trace.flowStatus);
  const flowSteps = useMemo(() => trace?.steps ?? [], [trace?.steps]);
  const hasReachedFilingMaterialSubmit = useMemo(
    () =>
      flowSteps.some(
        (step) =>
          step.nodeCode === FILING_MATERIAL_SUBMIT_NODE_CODE &&
          Boolean(step.reached),
      ),
    [flowSteps],
  );
  const currentIssueMessage = useMemo(
    () =>
      toUserFacingTraceMessage(currentStep?.latestResultMessage) ||
      toUserFacingTraceMessage(detail?.resultMessage) ||
      toUserFacingTraceMessage(detail?.errorMessage),
    [
      currentStep?.latestResultMessage,
      detail?.errorMessage,
      detail?.resultMessage,
    ],
  );
  const currentProgressMessage = useMemo(
    () =>
      toUserFacingTraceMessage(currentStep?.latestProgressMessage) ||
      toUserFacingTraceMessage(currentStep?.latestExecStatusName),
    [currentStep?.latestExecStatusName, currentStep?.latestProgressMessage],
  );
  const shouldShowCourtSelector = useMemo(() => {
    if (!isNodeFailedStatus(trace?.flowStatus)) return false;
    const nodeCode = currentStep?.nodeCode ?? trace?.currentNodeCode;
    if (nodeCode !== FILING_MATERIAL_SUBMIT_NODE_CODE) return false;
    return [
      currentStep?.latestResultMessage,
      detail?.resultMessage,
      detail?.errorMessage,
      currentIssueMessage,
      ...events.flatMap((event) => [event.eventContent, event.reasonText]),
    ].some((text) => isCourtSelectionFailureText(text));
  }, [
    currentIssueMessage,
    currentStep?.latestResultMessage,
    currentStep?.nodeCode,
    detail?.errorMessage,
    detail?.resultMessage,
    events,
    trace?.currentNodeCode,
    trace?.flowStatus,
  ]);
  const courtCityName = useMemo(
    () => toCleanText(trace?.city ?? detail?.city),
    [detail?.city, trace?.city],
  );
  const selectedCourt = useMemo(
    () =>
      courtOptions.find((court) => courtOptionKey(court) === selectedCourtKey),
    [courtOptions, selectedCourtKey],
  );
  const overviewItems = useMemo(() => {
    if (!trace) return [];
    const items = [
      {
        key: 'debtNumber',
        label: '资产编号',
        children: toText(trace.debtNumber ?? detail?.debtNumber),
      },
      {
        key: 'debtorName',
        label: '业主姓名',
        children: toText(trace.debtorName ?? detail?.debtorName),
      },
      {
        key: 'city',
        label: '所属城市',
        children: toText(trace.city ?? detail?.city),
      },
      {
        key: 'organization',
        label: '所属项目',
        children: toText(trace.organization ?? detail?.organization),
      },
      {
        key: 'flowStatus',
        label: '当前流程状态',
        children: (
          <Tag color={flowStatusColor(trace.flowStatus ?? detail?.flowStatus)}>
            {flowStatusText(
              trace.flowStatus ?? detail?.flowStatus,
              trace.flowStatusName ?? detail?.flowStatusName,
            )}
          </Tag>
        ),
      },
      {
        key: 'currentNode',
        label: '当前节点',
        children: formatNodeName(
          trace.currentNodeCode ?? detail?.currentNodeCode,
          trace.currentIdentity ?? detail?.currentIdentity,
        ),
      },
    ];

    if (isNodeFailedStatus(trace.flowStatus) && currentIssueMessage) {
      items.push({
        key: 'failureReason',
        label: '失败原因',
        children: <Text type="danger">{currentIssueMessage}</Text>,
      });
    }

    return items;
  }, [currentIssueMessage, detail, trace]);

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      window.clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  const loadTrace = useCallback(
    async (silent = false) => {
      if (!instanceId) return;
      requestSeqRef.current += 1;
      const seq = requestSeqRef.current;
      if (!silent) {
        setLoading(true);
      }
      try {
        const [traceResult, detailResult, eventsResult] =
          await Promise.allSettled([
            getFlowExecutionTrace(instanceId),
            getFlowInstanceDetail(instanceId),
            getFlowEvents(instanceId),
          ]);
        if (seq !== requestSeqRef.current) return;

        if (detailResult.status === 'fulfilled') {
          setDetail(detailResult.value.data ?? null);
        } else {
          setDetail(null);
        }

        if (eventsResult.status === 'fulfilled') {
          setEvents(
            Array.isArray(eventsResult.value.data)
              ? eventsResult.value.data
              : [],
          );
        } else {
          setEvents([]);
        }

        if (traceResult.status !== 'fulfilled') {
          setTrace(null);
          messageApi.error('流程执行轨迹加载失败，请稍后重试');
          stopPolling();
          return;
        }

        const nextTrace = traceResult.value.data ?? null;
        setTrace(nextTrace);
        if (!nextTrace || !isPollingFlowStatus(nextTrace.flowStatus)) {
          stopPolling();
        }
      } catch {
        if (seq === requestSeqRef.current) {
          messageApi.error('流程执行轨迹加载失败，请稍后重试');
        }
      } finally {
        if (seq === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [instanceId, messageApi, stopPolling],
  );

  const loadFilingEvidence = useCallback(async () => {
    if (!instanceId || !hasReachedFilingMaterialSubmit) {
      setFilingEvidence(null);
      setFilingEvidenceOssMap(new Map());
      return;
    }
    setFilingEvidenceLoading(true);
    try {
      const result = await getFilingMaterialSubmitEvidence(instanceId);
      setFilingEvidence(result.data ?? null);
    } catch {
      setFilingEvidence(null);
      messageApi.error('RPA执行证据加载失败，请稍后重试');
    } finally {
      setFilingEvidenceLoading(false);
    }
  }, [hasReachedFilingMaterialSubmit, instanceId, messageApi]);

  const loadCourtOptions = useCallback(async () => {
    if (!shouldShowCourtSelector) {
      setCourtOptions([]);
      setSelectedCourtKey(undefined);
      return;
    }
    setCourtLoading(true);
    try {
      const result = await listLitigationCourts({
        cityName: courtCityName || undefined,
      });
      const rows = Array.isArray(result.data)
        ? result.data.filter((court) => !!toCleanText(court.courtName))
        : [];
      setCourtOptions(rows);
      setSelectedCourtKey((current) => {
        if (
          current &&
          rows.some((court) => courtOptionKey(court) === current)
        ) {
          return current;
        }
        return rows.length === 1 ? courtOptionKey(rows[0]) : undefined;
      });
    } catch {
      setCourtOptions([]);
      messageApi.error('法院列表加载失败，请稍后重试');
    } finally {
      setCourtLoading(false);
    }
  }, [courtCityName, messageApi, shouldShowCourtSelector]);

  useEffect(() => {
    if (!open || !instanceId) {
      setDetail(null);
      setTrace(null);
      setEvents([]);
      stopPolling();
      return;
    }
    void loadTrace(false);
  }, [instanceId, loadTrace, open, stopPolling]);

  useEffect(() => {
    if (!open || !instanceId || !hasReachedFilingMaterialSubmit) {
      setFilingEvidence(null);
      setFilingEvidenceOssMap(new Map());
      return;
    }
    void loadFilingEvidence();
  }, [
    hasReachedFilingMaterialSubmit,
    instanceId,
    loadFilingEvidence,
    open,
    trace?.flowStatus,
    trace?.updateTime,
  ]);

  useEffect(() => {
    const screenshots =
      filingEvidence?.screenshots?.filter((item) => item.ossId) ?? [];
    if (!open || !screenshots.length) {
      setFilingEvidenceOssMap(new Map());
      return;
    }
    const ossIds = screenshots
      .map((item) => item.ossId)
      .filter((id): id is number | string => id !== undefined && id !== null);
    if (!ossIds.length) {
      setFilingEvidenceOssMap(new Map());
      return;
    }
    void (async () => {
      try {
        const response = await listOssByIds(
          Array.from(new Set(ossIds.map(String))).join(','),
        );
        const rows = Array.isArray(response.data) ? response.data : [];
        setFilingEvidenceOssMap(
          new Map(
            rows
              .filter((item) => item.ossId !== undefined && item.ossId !== null)
              .map((item) => [String(item.ossId), item]),
          ),
        );
      } catch {
        setFilingEvidenceOssMap(new Map());
      }
    })();
  }, [filingEvidence?.screenshots, open]);

  useEffect(() => {
    stopPolling();
    if (!shouldPollTrace || !instanceId) return;
    pollingTimerRef.current = window.setInterval(() => {
      void loadTrace(true);
    }, TRACE_POLLING_INTERVAL);
    return stopPolling;
  }, [instanceId, loadTrace, shouldPollTrace, stopPolling]);

  useEffect(() => {
    if (!open) {
      setCourtOptions([]);
      setSelectedCourtKey(undefined);
      return;
    }
    void loadCourtOptions();
  }, [loadCourtOptions, open]);

  const handleRetryCurrentStep = () => {
    const retryInstanceId = trace?.instanceId ?? instanceId;
    if (!retryInstanceId || !retryStepId) return;
    modalApi.confirm({
      title: '确认重试当前节点',
      content:
        '重试会重新触发当前失败节点，节点会按债务记录 ID 重新查询最新业务资料。',
      okText: '重试',
      cancelText: '取消',
      onOk: async () => {
        setRetrying(true);
        try {
          await retryFlowCurrentStep(retryInstanceId, retryStepId);
          messageApi.success('当前节点已重新触发');
          onChanged?.();
          await loadTrace(true);
        } finally {
          setRetrying(false);
        }
      },
    });
  };

  const handleSaveCourtAndRetry = async () => {
    const retryInstanceId = trace?.instanceId ?? instanceId;
    if (!retryInstanceId || !selectedCourt) return;
    const courtName = toCleanText(selectedCourt.courtName);
    if (!courtName) {
      messageApi.warning('请选择受理法院');
      return;
    }
    setCourtSaving(true);
    try {
      await saveFlowCourt(retryInstanceId, {
        courtName,
        provinceName: toCleanText(selectedCourt.provinceName) || undefined,
        cityName: toCleanText(selectedCourt.cityName) || courtCityName,
        retry: true,
      });
      messageApi.success('已保存受理法院并重新触发当前节点');
      onChanged?.();
      await loadTrace(true);
    } finally {
      setCourtSaving(false);
    }
  };

  const stepTimelineItems = flowSteps.map((step) => {
    const nodeTitle = step.nodeCode
      ? formatNodeName(step.nodeCode, step.identity)
      : step.identity || `步骤 ${toText(step.stepIndex)}`;
    const statusMeta = stepStatusMeta(step);
    const tagColor =
      step.stepStatus === 'DONE' ? token.colorPrimary : statusMeta.tagColor;
    const message = stepUserMessage(step);
    return {
      color: statusMeta.timelineColor,
      icon: renderCurrentRunningStepDot(step),
      content: (
        <div className="flow-trace-step-content min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Text strong>{nodeTitle}</Text>
            <Tag color={tagColor}>{statusMeta.text}</Tag>
          </div>
          {message ? (
            <Paragraph
              style={{ marginBottom: 0, marginTop: 4 }}
              type={
                step.stepStatus === 'BLOCKED' || step.stepStatus === 'FAILED'
                  ? 'danger'
                  : 'secondary'
              }
            >
              {message}
            </Paragraph>
          ) : null}
        </div>
      ),
    };
  });

  const eventItems = events.map((event) => {
    const eventTitle =
      normalizeEventNodeText(event.eventTitle, event) ||
      event.eventType ||
      '流程事件';
    const eventContent = toUserFacingTraceMessage(
      normalizeEventNodeText(event.eventContent, event),
    );
    const eventReason = toUserFacingTraceMessage(event.reasonText);
    return {
      color: eventColor(event.eventType),
      content: (
        <div className="min-w-0">
          <Space size={6} wrap>
            <Text strong>{eventTitle}</Text>
            {event.nodeCode ? (
              <Tag>{formatNodeName(event.nodeCode)}</Tag>
            ) : null}
          </Space>
          {eventContent ? (
            <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
              {eventContent}
            </Paragraph>
          ) : null}
          {eventReason ? (
            <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
              {eventReason}
            </Text>
          ) : null}
          {renderEventChange(event)}
          <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
            {toText(event.createTime)}
          </Text>
        </div>
      ),
    };
  });

  const filingEvidenceScreenshots =
    filingEvidence?.screenshots?.filter((item) => item.ossId) ?? [];
  const filingEvidenceMessage = toUserFacingTraceMessage(
    filingEvidence?.message,
  );

  const renderFilingEvidencePanel = () => {
    if (!hasReachedFilingMaterialSubmit) return null;
    return (
      <div className="rounded border border-[#e5e7eb] bg-white p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Text strong>RPA执行证据</Text>
          {filingEvidence?.statusName || filingEvidence?.status ? (
            <Tag color={filingEvidenceStatusColor(filingEvidence?.status)}>
              {filingEvidence?.statusName || toText(filingEvidence?.status)}
            </Tag>
          ) : null}
          {filingEvidence?.rpaStatus ? (
            <Tag>{filingEvidence.rpaStatus}</Tag>
          ) : null}
        </div>
        {filingEvidenceLoading ? (
          <Spin size="small" />
        ) : (
          <>
            {filingEvidenceMessage ? (
              <Paragraph style={{ marginBottom: 8 }}>
                {filingEvidenceMessage}
              </Paragraph>
            ) : null}
            {filingEvidenceScreenshots.length > 0 ? (
              <Image.PreviewGroup>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {filingEvidenceScreenshots.map((shot) => {
                    const ossId = String(shot.ossId);
                    const oss = filingEvidenceOssMap.get(ossId);
                    const label = shot.name || oss?.originalName || 'RPA截图';
                    return (
                      <div
                        key={`${ossId}-${shot.type || label}`}
                        className="min-w-0 rounded border border-[#f1f5f9] p-2"
                      >
                        <Text style={{ fontSize: 12 }}>{label}</Text>
                        {oss?.url ? (
                          <div className="mt-2 flex flex-col gap-2">
                            <Image
                              src={oss.url}
                              alt={label}
                              style={{ maxHeight: 180, objectFit: 'contain' }}
                            />
                            <a href={oss.url} target="_blank" rel="noreferrer">
                              <LinkOutlined /> 打开原图
                            </a>
                          </div>
                        ) : (
                          <Text
                            type="secondary"
                            style={{
                              display: 'block',
                              marginTop: 8,
                              fontSize: 12,
                            }}
                          >
                            附件暂不可预览
                          </Text>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Image.PreviewGroup>
            ) : (
              <Text type="secondary">暂无RPA截图</Text>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <Drawer
      title="流程执行详情"
      open={open}
      size="min(760px, calc(100vw - 24px))"
      destroyOnHidden
      footer={
        canRetryCurrentStep ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Space wrap>
              <Button
                icon={<ReloadOutlined aria-hidden={true} />}
                loading={retrying}
                type="primary"
                onClick={handleRetryCurrentStep}
              >
                重试当前节点
              </Button>
            </Space>
          </div>
        ) : null
      }
      onClose={onClose}
    >
      {messageContextHolder}
      {modalContextHolder}
      <Spin spinning={loading}>
        {trace ? (
          <Tabs
            defaultActiveKey="overview"
            items={[
              {
                key: 'overview',
                label: '执行概览',
                children: (
                  <div className="flex flex-col gap-4">
                    {isNodeFailedStatus(trace.flowStatus) ? (
                      <Alert
                        showIcon
                        type="error"
                        title="当前节点失败阻塞"
                        description={
                          currentIssueMessage ||
                          '请到业务资料归属模块修复资料后，再重试当前节点。'
                        }
                      />
                    ) : isPendingTriggerStatus(trace.flowStatus) ? (
                      <Alert
                        showIcon
                        type="info"
                        title="等待节点触发"
                        description={
                          trace.wakeUpTime
                            ? `下次触发时间：${trace.wakeUpTime}`
                            : '当前节点已进入待触发队列，等待调度器扫描。'
                        }
                      />
                    ) : isWaitingCallbackStatus(trace.flowStatus) ? (
                      <Alert
                        showIcon
                        type="info"
                        title="等待节点回调"
                        description={
                          currentProgressMessage ||
                          '节点任务已触发，正在等待业务节点返回最终结果。'
                        }
                      />
                    ) : null}

                    {shouldShowCourtSelector ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          showSearch
                          allowClear
                          loading={courtLoading}
                          value={selectedCourtKey}
                          placeholder="选择受理法院"
                          optionFilterProp="label"
                          style={{ width: 320, maxWidth: '100%' }}
                          options={courtOptions.map((court) => {
                            const courtName = toCleanText(court.courtName);
                            const cityName = toCleanText(court.cityName);
                            return {
                              value: courtOptionKey(court),
                              label: cityName
                                ? `${courtName}（${cityName}）`
                                : courtName,
                            };
                          })}
                          onChange={setSelectedCourtKey}
                        />
                        <Button
                          icon={<CheckCircleOutlined aria-hidden={true} />}
                          loading={courtSaving}
                          type="primary"
                          disabled={!selectedCourt}
                          onClick={handleSaveCourtAndRetry}
                        >
                          保存并重试
                        </Button>
                      </div>
                    ) : null}

                    <Descriptions
                      bordered
                      size="small"
                      column={2}
                      items={overviewItems}
                    />
                    {renderFilingEvidencePanel()}
                  </div>
                ),
              },
              {
                key: 'steps',
                label: '流程步骤',
                children:
                  stepTimelineItems.length > 0 ? (
                    <Timeline
                      className="mt-2"
                      items={stepTimelineItems}
                      mode="start"
                    />
                  ) : (
                    <Empty description="暂无步骤轨迹" />
                  ),
              },
              {
                key: 'events',
                label: '流程动态',
                children: (
                  <div className="flex flex-col gap-4">
                    {renderFilingEvidencePanel()}
                    {eventItems.length > 0 ? (
                      <Timeline items={eventItems} />
                    ) : (
                      <Empty description="暂无流程动态" />
                    )}
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <Empty description="暂无流程轨迹" />
        )}
      </Spin>
    </Drawer>
  );
};

export default FlowTraceDrawer;
