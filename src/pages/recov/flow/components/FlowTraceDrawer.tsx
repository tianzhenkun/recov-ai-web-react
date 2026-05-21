import { ReloadOutlined, StopOutlined, SyncOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Modal,
  message,
  Space,
  Spin,
  Steps,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type FlowExecutionTrace,
  type FlowInstanceDetail,
  type FlowTraceAttempt,
  getFlowExecutionTrace,
  getFlowInstanceDetail,
  retryFlowCurrentStep,
  terminateFlowInstance,
} from '@/services/ruoyi/flowInstance';

const { Paragraph, Text, Title } = Typography;

const TRACE_POLLING_INTERVAL = 4000;

type FlowTraceDrawerProps = {
  open: boolean;
  instanceId?: number | string | null;
  onClose: () => void;
  onChanged?: () => void;
};

const toText = (value: unknown) =>
  value === null || value === undefined || value === '' ? '-' : String(value);

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
        const [traceResult, detailResult] = await Promise.allSettled([
          getFlowExecutionTrace(instanceId),
          getFlowInstanceDetail(instanceId),
        ]);
        if (seq !== requestSeqRef.current) return;

        if (detailResult.status === 'fulfilled') {
          setDetail(detailResult.value.data ?? null);
        } else {
          setDetail(null);
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

  const stepItems = (trace?.steps ?? []).map((step) => ({
    title: step.identity || step.nodeCode || `步骤 ${toText(step.stepIndex)}`,
    status: toStepStatus(step.stepStatus),
    description: (
      <div className="flex flex-col gap-1">
        <Space size={6} wrap>
          <Tag color={stepStatusColor(step.stepStatus)}>
            {step.stepStatusName || step.stepStatus || '未开始'}
          </Tag>
          <Text type="secondary">{step.nodeCode || '-'}</Text>
          {step.current ? <Tag color="blue">当前节点</Tag> : null}
        </Space>
        {renderMessage(step.latestProgressMessage)}
        {renderMessage(step.latestResultMessage, 'danger')}
      </div>
    ),
  }));

  const attemptColumns = useMemo<ColumnsType<FlowTraceAttempt>>(
    () => [
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

  return (
    <Drawer
      title="流程执行详情"
      open={open}
      size={980}
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
                  children:
                    trace.currentIdentity ||
                    detail?.currentIdentity ||
                    trace.currentNodeCode ||
                    detail?.currentNodeCode ||
                    '-',
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
                  children: toText(trace.wakeUpTime ?? detail?.wakeUpTime),
                },
                {
                  key: 'debtRecordId',
                  label: '债务记录 ID',
                  children: toText(trace.debtRecordId ?? detail?.debtRecordId),
                },
                {
                  key: 'debtNumber',
                  label: '资产编号',
                  children: toText(detail?.debtNumber),
                },
                {
                  key: 'debtorName',
                  label: '业主姓名',
                  children: toText(detail?.debtorName),
                },
                {
                  key: 'personaId',
                  label: '画像 ID',
                  children: toText(trace.personaId ?? detail?.personaId),
                },
                {
                  key: 'stepCount',
                  label: '步骤进度',
                  children: `${toText(trace.completedStepCount ?? detail?.completedStepCount)}/${toText(trace.totalStepCount ?? detail?.totalStepCount)}`,
                },
              ]}
            />

            <div>
              <Title level={5}>流程步骤</Title>
              {stepItems.length > 0 ? (
                <Steps
                  orientation="vertical"
                  current={Math.max(0, trace.currentStepIndex ?? 0)}
                  items={stepItems}
                />
              ) : (
                <Empty description="暂无步骤轨迹" />
              )}
            </div>

            <div>
              <Title level={5}>当前节点执行记录</Title>
              <Table<FlowTraceAttempt>
                bordered
                size="small"
                columns={attemptColumns}
                dataSource={currentStep?.attempts ?? []}
                rowKey={(record) =>
                  String(record.recordId ?? record.taskId ?? record.businessId)
                }
                scroll={{ x: 1000 }}
                pagination={false}
                locale={{ emptyText: <Empty description="暂无执行记录" /> }}
              />
            </div>

            <Alert
              showIcon
              type="info"
              title="资料修复不在流程模块内完成"
              description="如果节点因邮箱、电话、地址、金额等业务资料失败，请到债务资料、联系人或案件资料等归属模块维护后，再回到这里重试当前节点。"
            />
          </div>
        ) : (
          <Empty description="暂无流程轨迹" />
        )}
      </Spin>
    </Drawer>
  );
};

export default FlowTraceDrawer;
