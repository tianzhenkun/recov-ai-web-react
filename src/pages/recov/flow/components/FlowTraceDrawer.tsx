import { ReloadOutlined, StopOutlined, SyncOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Modal,
  message,
  Progress,
  Space,
  Spin,
  Steps,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type FlowEventItem,
  type FlowExecutionTrace,
  type FlowInstanceDetail,
  type FlowTraceAttempt,
  getFlowEvents,
  getFlowExecutionTrace,
  getFlowInstanceDetail,
  retryFlowCurrentStep,
  terminateFlowInstance,
} from '@/services/ruoyi/flowInstance';
import {
  buildInitialFlowModuleMap,
  getFlowModuleMeta,
} from '../../collectionStrategy/_shared';

const { Paragraph, Text } = Typography;

const TRACE_POLLING_INTERVAL = 4000;
const flowModuleMap = buildInitialFlowModuleMap();

type FlowTraceDrawerProps = {
  open: boolean;
  instanceId?: number | string | null;
  onClose: () => void;
  onChanged?: () => void;
};

type FlowTraceAttemptRow = FlowTraceAttempt & {
  rowKey: string;
  stepName: string;
  stepIndex?: number;
  stepStatus?: string;
  stepStatusName?: string;
};

const toText = (value: unknown) =>
  value === null || value === undefined || value === '' ? '-' : String(value);

const toNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
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

const stepStatusColor = (status?: string) => {
  if (status === 'DONE') return 'success';
  if (status === 'BLOCKED') return 'error';
  if (status === 'FAILED') return 'warning';
  if (status === 'RUNNING' || status === 'PENDING_TRIGGER') return 'processing';
  if (status === 'SKIPPED') return 'default';
  return 'default';
};

const toStepStatus = (
  status?: string,
): 'wait' | 'process' | 'finish' | 'error' => {
  if (status === 'DONE') return 'finish';
  if (status === 'BLOCKED') return 'error';
  if (status === 'FAILED') return 'error';
  if (status === 'RUNNING' || status === 'PENDING_TRIGGER') return 'process';
  return 'wait';
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

const progressStatusOf = (
  trace?: FlowExecutionTrace | null,
): 'success' | 'exception' | 'active' | 'normal' | undefined => {
  if (!trace) return undefined;
  if (isNodeFailedStatus(trace.flowStatus)) return 'exception';
  if (normalizeStatus(trace.flowStatus) === '2') return 'success';
  if (isPollingFlowStatus(trace.flowStatus)) return 'active';
  return 'normal';
};

const renderMessage = (
  value?: string | null,
  type: 'secondary' | 'danger' = 'secondary',
) => {
  if (!value) return null;
  return (
    <Paragraph
      ellipsis={{ rows: 2, expandable: 'collapsible' }}
      style={{ marginBottom: 0 }}
      type={type}
    >
      {value}
    </Paragraph>
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
  const [detail, setDetail] = useState<FlowInstanceDetail | null>(null);
  const [trace, setTrace] = useState<FlowExecutionTrace | null>(null);
  const [events, setEvents] = useState<FlowEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const pollingTimerRef = useRef<number | null>(null);
  const requestSeqRef = useRef(0);

  const currentStep = useMemo(() => currentStepOf(trace), [trace]);
  const retryStepId = currentStep?.stepId ?? trace?.currentStepId;
  const canRetryCurrentStep =
    !!trace?.canRetryCurrentStep &&
    !!retryStepId &&
    !isTerminalFlowStatus(trace.flowStatus);
  const canTerminate =
    !!trace?.canTerminate && !isTerminalFlowStatus(trace.flowStatus);
  const shouldPollTrace =
    open && !!trace && isPollingFlowStatus(trace.flowStatus);
  const flowSteps = useMemo(() => trace?.steps ?? [], [trace?.steps]);
  const rawStepTotal = toNumber(
    trace?.totalStepCount ?? detail?.totalStepCount ?? flowSteps.length,
  );
  const stepTotal = rawStepTotal > 0 ? rawStepTotal : flowSteps.length;
  const completedStepCount = toNumber(
    trace?.completedStepCount ?? detail?.completedStepCount,
  );
  const failedStepCount = toNumber(
    trace?.failedStepCount ?? detail?.failedStepCount,
  );
  const skippedStepCount = toNumber(
    trace?.skippedStepCount ?? detail?.skippedStepCount,
  );
  const stepProgressPercent =
    stepTotal > 0
      ? Math.min(100, Math.round((completedStepCount / stepTotal) * 100))
      : 0;
  const currentStepItemIndex = flowSteps.findIndex(
    (step) =>
      step.current ||
      step.stepId === trace?.currentStepId ||
      step.stepIndex === trace?.currentStepIndex,
  );
  const currentStepIndex =
    currentStepItemIndex >= 0
      ? currentStepItemIndex
      : Math.max(0, trace?.currentStepIndex ?? 0);
  const allAttemptRows = useMemo<FlowTraceAttemptRow[]>(
    () =>
      flowSteps.flatMap((step) => {
        const stepName = step.nodeCode
          ? formatNodeName(step.nodeCode, step.identity)
          : step.identity || `步骤 ${toText(step.stepIndex)}`;
        return (step.attempts ?? []).map((attempt, attemptIndex) => ({
          ...attempt,
          rowKey: `${step.stepId ?? step.stepIndex ?? 'step'}-${String(
            attempt.recordId ??
              attempt.taskId ??
              attempt.businessId ??
              attemptIndex,
          )}`,
          stepName,
          stepIndex: step.stepIndex,
          stepStatus: step.stepStatus,
          stepStatusName: step.stepStatusName,
        }));
      }),
    [flowSteps],
  );

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
      if (silent) {
        setRefreshing(true);
      } else {
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
          setRefreshing(false);
        }
      }
    },
    [instanceId, messageApi, stopPolling],
  );

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
    stopPolling();
    if (!shouldPollTrace || !instanceId) return;
    pollingTimerRef.current = window.setInterval(() => {
      void loadTrace(true);
    }, TRACE_POLLING_INTERVAL);
    return stopPolling;
  }, [instanceId, loadTrace, shouldPollTrace, stopPolling]);

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

  const handleTerminate = () => {
    const terminateInstanceId = trace?.instanceId ?? instanceId;
    if (!terminateInstanceId) return;
    modalApi.confirm({
      title: '确认终止该催收流程吗？',
      content: '终止后流程不会继续触发后续节点。',
      okText: '确认终止',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setTerminating(true);
        try {
          await terminateFlowInstance(terminateInstanceId);
          messageApi.success('流程已终止');
          onChanged?.();
          await loadTrace(true);
        } finally {
          setTerminating(false);
        }
      },
    });
  };

  const stepItems = flowSteps.map((step) => {
    const nodeTitle = step.nodeCode
      ? formatNodeName(step.nodeCode, step.identity)
      : step.identity || `步骤 ${toText(step.stepIndex)}`;
    return {
      title: nodeTitle,
      status: toStepStatus(step.stepStatus),
      description: (
        <div className="flex flex-col gap-1">
          <Space size={6} wrap>
            <Tag color={stepStatusColor(step.stepStatus)}>
              {step.stepStatusName || step.stepStatus || '未开始'}
            </Tag>
            {shouldShowNodeIdentity(step.nodeCode) &&
            step.identity &&
            step.identity !== nodeTitle ? (
              <Tag color="geekblue">{step.identity}</Tag>
            ) : null}
            <Text type="secondary">{step.nodeCode || '-'}</Text>
            {step.current ? <Tag color="blue">当前节点</Tag> : null}
          </Space>
          {renderMessage(step.latestProgressMessage)}
          {renderMessage(step.latestResultMessage, 'danger')}
        </div>
      ),
    };
  });

  const attemptColumns = useMemo<ColumnsType<FlowTraceAttemptRow>>(
    () => [
      {
        title: '节点',
        dataIndex: 'stepName',
        width: 180,
        ellipsis: true,
        render: (value, record) => (
          <Space size={4} wrap>
            <Text>{toText(value)}</Text>
            <Tag color={stepStatusColor(record.stepStatus)}>
              {record.stepStatusName || record.stepStatus || '未开始'}
            </Tag>
          </Space>
        ),
      },
      {
        title: '任务 ID',
        dataIndex: 'taskId',
        width: 180,
        ellipsis: true,
        render: toText,
      },
      {
        title: '执行状态',
        dataIndex: 'execStatusName',
        width: 120,
        render: (value, record) => (
          <Tag
            color={
              normalizeStatus(record.execStatus) === '3' ? 'error' : 'default'
            }
          >
            {toText(value)}
          </Tag>
        ),
      },
      {
        title: '失败策略',
        dataIndex: 'failStrategy',
        width: 110,
        render: toText,
      },
      {
        title: '跳过策略',
        dataIndex: 'skipStrategy',
        width: 110,
        render: toText,
      },
      {
        title: '进度信息',
        dataIndex: 'progressMessage',
        width: 220,
        ellipsis: true,
        render: toText,
      },
      {
        title: '结果说明',
        dataIndex: 'resultMessage',
        width: 260,
        ellipsis: true,
        render: (value) => (
          <Text type={value ? 'danger' : undefined}>{toText(value)}</Text>
        ),
      },
    ],
    [],
  );

  const eventItems = events.map((event) => {
    const eventTitle =
      normalizeEventNodeText(event.eventTitle, event) ||
      event.eventType ||
      '流程事件';
    const eventContent = normalizeEventNodeText(event.eventContent, event);
    return {
      color: eventColor(event.eventType),
      children: (
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
          {event.reasonText ? (
            <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
              {event.reasonText}
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

  return (
    <Drawer
      title="流程执行详情"
      open={open}
      size="min(1080px, calc(100vw - 48px))"
      destroyOnHidden
      extra={
        <Space wrap>
          <Button
            icon={<SyncOutlined />}
            loading={refreshing}
            onClick={() => void loadTrace(true)}
          >
            刷新
          </Button>
          {canRetryCurrentStep ? (
            <Button
              color="danger"
              icon={<ReloadOutlined />}
              loading={retrying}
              onClick={handleRetryCurrentStep}
              variant="filled"
            >
              重试当前节点
            </Button>
          ) : null}
          {canTerminate ? (
            <Button
              color="danger"
              icon={<StopOutlined />}
              loading={terminating}
              onClick={handleTerminate}
              variant="outlined"
            >
              人工终止
            </Button>
          ) : null}
        </Space>
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
                          currentStep?.latestResultMessage ||
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
                          currentStep?.latestProgressMessage ||
                          currentStep?.latestExecStatusName ||
                          '节点任务已触发，正在等待业务节点返回最终结果。'
                        }
                      />
                    ) : null}

                    <Descriptions
                      bordered
                      size="small"
                      column={{ xs: 1, md: 2 }}
                      items={[
                        {
                          key: 'flowStatus',
                          label: '当前流程状态',
                          children: (
                            <Tag
                              color={flowStatusColor(
                                trace.flowStatus ?? detail?.flowStatus,
                              )}
                            >
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
                        {
                          key: 'currentTaskId',
                          label: '当前任务 ID',
                          children: toText(
                            trace.currentTaskId ?? detail?.currentTaskId,
                          ),
                        },
                        {
                          key: 'wakeUpTime',
                          label: '下次触发时间',
                          children: toText(
                            trace.wakeUpTime ?? detail?.wakeUpTime,
                          ),
                        },
                        {
                          key: 'debtRecordId',
                          label: '债务记录 ID',
                          children: toText(
                            trace.debtRecordId ?? detail?.debtRecordId,
                          ),
                        },
                        {
                          key: 'debtNumber',
                          label: '资产编号',
                          children: toText(
                            trace.debtNumber ?? detail?.debtNumber,
                          ),
                        },
                        {
                          key: 'debtorName',
                          label: '业主姓名',
                          children: toText(
                            trace.debtorName ?? detail?.debtorName,
                          ),
                        },
                        {
                          key: 'personaId',
                          label: '画像 ID',
                          children: toText(
                            trace.personaId ?? detail?.personaId,
                          ),
                        },
                        {
                          key: 'stepCount',
                          label: '步骤进度',
                          children: `${completedStepCount}/${stepTotal}`,
                        },
                      ]}
                    />

                    <div className="rounded-md border border-solid border-gray-100 bg-gray-50 px-4 py-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <Text strong>步骤进度</Text>
                        <Text type="secondary">
                          {completedStepCount}/{stepTotal}
                        </Text>
                      </div>
                      <Progress
                        percent={stepProgressPercent}
                        size="small"
                        status={progressStatusOf(trace)}
                      />
                      {failedStepCount > 0 || skippedStepCount > 0 ? (
                        <Space className="mt-2" size={8} wrap>
                          {failedStepCount > 0 ? (
                            <Tag color="red">失败 {failedStepCount}</Tag>
                          ) : null}
                          {skippedStepCount > 0 ? (
                            <Tag color="default">跳过 {skippedStepCount}</Tag>
                          ) : null}
                        </Space>
                      ) : null}
                    </div>
                  </div>
                ),
              },
              {
                key: 'steps',
                label: '流程步骤',
                children:
                  stepItems.length > 0 ? (
                    <Steps
                      orientation="vertical"
                      current={currentStepIndex}
                      items={stepItems}
                    />
                  ) : (
                    <Empty description="暂无步骤轨迹" />
                  ),
              },
              {
                key: 'events',
                label: '流程动态',
                children:
                  eventItems.length > 0 ? (
                    <Timeline items={eventItems} />
                  ) : (
                    <Empty description="暂无流程动态" />
                  ),
              },
              {
                key: 'attempts',
                label: '执行记录',
                children: (
                  <Table<FlowTraceAttemptRow>
                    bordered
                    size="small"
                    columns={attemptColumns}
                    dataSource={allAttemptRows}
                    rowKey={(record) => record.rowKey}
                    scroll={{ x: 1180 }}
                    pagination={false}
                    locale={{
                      emptyText: <Empty description="暂无执行记录" />,
                    }}
                  />
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
