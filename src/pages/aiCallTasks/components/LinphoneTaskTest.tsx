import { PhoneOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Modal,
  Radio,
  Space,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AiCallTask,
  AiCallTaskTarget,
  AiCallTaskTestCapability,
  AiCallTaskTestStatus,
  LinphoneTestPhase,
  LinphoneTestScenario,
} from '../domain';
import { useVisiblePolling } from '../hooks/useVisiblePolling';
import {
  getAiCallTaskTestCapability,
  getAiCallTaskTestStatus,
  listAiCallTaskTargets,
  runAiCallTaskTest,
} from '../service';

const { Text } = Typography;

type LinphoneTaskTestProps = {
  task: AiCallTask;
  onTaskChanged: () => Promise<void> | void;
};

const maskPhone = (value: string) =>
  value.replace(/^(\d{3})\d+(\d{4})$/, '$1****$2');

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '外呼对象加载失败';

const phaseText: Record<LinphoneTestPhase, string> = {
  dialing: '正在拨号',
  ai_call: 'AI 通话中',
  waiting_handoff: '等待坐席接单',
  human_call: '人工通话中',
  completed: '通话已完成',
  failed: '测试失败',
};

const isTerminalStatus = (status?: AiCallTaskTestStatus) =>
  status?.phase === 'completed' || status?.phase === 'failed';

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

const createCommandKey = (taskId: string) => {
  const suffix =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `linphone-test-${taskId}-${suffix}`;
};

const buildRecordsUrl = (taskId: string, targetId: string) => {
  const search = new URLSearchParams({ taskId, targetId });
  return `/ai-call/records?${search.toString()}`;
};

const LinphoneTaskTest = ({ task, onTaskChanged }: LinphoneTaskTestProps) => {
  const [capability, setCapability] = useState<AiCallTaskTestCapability | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [scenario, setScenario] = useState<LinphoneTestScenario>('ai_only');
  const [target, setTarget] = useState<AiCallTaskTarget>();
  const [targetLoading, setTargetLoading] = useState(false);
  const [targetError, setTargetError] = useState<string>();
  const [activeCallId, setActiveCallId] = useState<string>();
  const [testStatus, setTestStatus] = useState<AiCallTaskTestStatus>();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string>();
  const taskIdRef = useRef(task.taskId);
  const startingRef = useRef(false);
  const commandKeyRef = useRef<string | undefined>(undefined);
  const processedTerminalAttemptRef = useRef<string | undefined>(undefined);

  taskIdRef.current = task.taskId;

  const loadCapability = useCallback(async () => {
    const requestedTaskId = task.taskId;
    try {
      const result = await getAiCallTaskTestCapability(requestedTaskId);
      if (taskIdRef.current !== requestedTaskId) return;
      setCapability(result);
      setActiveCallId(result.activeCallId || undefined);
    } catch {
      if (taskIdRef.current !== requestedTaskId) return;
      setCapability(null);
      setActiveCallId(undefined);
    }
  }, [task.taskId]);

  const loadTestStatus = useCallback(async () => {
    const requestedTaskId = task.taskId;
    const result = await getAiCallTaskTestStatus(requestedTaskId);
    if (taskIdRef.current !== requestedTaskId) return;
    setTestStatus(result);
    setActiveCallId(isTerminalStatus(result) ? undefined : result.callId);
  }, [task.taskId]);

  useEffect(() => {
    setCapability(null);
    setActiveCallId(undefined);
    setTestStatus(undefined);
    processedTerminalAttemptRef.current = undefined;
    commandKeyRef.current = undefined;
    void loadCapability();
  }, [loadCapability]);

  useVisiblePolling({
    enabled: Boolean(activeCallId && !isTerminalStatus(testStatus)),
    intervalMs: 1_000,
    onTick: loadTestStatus,
  });

  useEffect(() => {
    if (
      !testStatus ||
      !isTerminalStatus(testStatus) ||
      processedTerminalAttemptRef.current === testStatus.attemptId
    ) {
      return;
    }
    processedTerminalAttemptRef.current = testStatus.attemptId;
    void Promise.all([onTaskChanged(), loadCapability()]);
  }, [loadCapability, onTaskChanged, testStatus]);

  const loadTarget = async () => {
    if (target || targetLoading) return;
    setTargetLoading(true);
    setTargetError(undefined);
    try {
      const response = await listAiCallTaskTargets(task.taskId, {
        pageNum: 1,
        pageSize: 1,
      });
      setTarget(response.rows[0]);
    } catch (error) {
      setTargetError(getErrorMessage(error));
    } finally {
      setTargetLoading(false);
    }
  };

  const openModal = () => {
    setScenario('ai_only');
    setStartError(undefined);
    commandKeyRef.current = undefined;
    setModalOpen(true);
    void loadTarget();
  };

  const closeModal = () => {
    if (startingRef.current) return;
    setModalOpen(false);
    setStartError(undefined);
    commandKeyRef.current = undefined;
  };

  const startTest = async () => {
    if (startingRef.current || !target) return;
    startingRef.current = true;
    setStarting(true);
    setStartError(undefined);
    commandKeyRef.current ||= createCommandKey(task.taskId);
    try {
      const accepted = await runAiCallTaskTest(
        task.taskId,
        scenario,
        commandKeyRef.current,
      );
      setModalOpen(false);
      setActiveCallId(accepted.callId);
      await loadTestStatus();
    } catch (error) {
      setStartError(getErrorMessage(error));
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };

  if (!capability?.enabled) return null;

  return (
    <Space orientation="vertical" size={12}>
      <div>
        <Tooltip
          title={
            capability.eligible ? undefined : capability.reasons.join('；')
          }
        >
          <span>
            <Button
              disabled={!capability.eligible}
              icon={<PhoneOutlined aria-hidden />}
              onClick={openModal}
            >
              测试拨打
            </Button>
          </span>
        </Tooltip>
      </div>

      {testStatus ? (
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          <Descriptions
            bordered
            column={{ xs: 1, sm: 2 }}
            items={[
              {
                key: 'phase',
                label: '当前阶段',
                children: phaseText[testStatus.phase],
              },
              {
                key: 'callId',
                label: 'Call ID',
                children: (
                  <Text copyable={{ text: testStatus.callId }}>
                    {testStatus.callId}
                  </Text>
                ),
              },
              {
                key: 'elapsed',
                label: '通话时长',
                children: formatDuration(testStatus.elapsedSeconds),
              },
              {
                key: 'handoff',
                label: '转人工状态',
                children: testStatus.handoffStatus || '未触发',
              },
            ]}
          />
          {testStatus.errorMessage ? (
            <Alert showIcon title={testStatus.errorMessage} type="error" />
          ) : null}
          <div>
            <Button
              onClick={() =>
                history.push(
                  buildRecordsUrl(testStatus.taskId, testStatus.targetId),
                )
              }
            >
              查看通话记录
            </Button>
          </div>
        </Space>
      ) : null}

      <Modal
        cancelText="取消"
        okButtonProps={{
          disabled: !target || targetLoading || Boolean(targetError),
        }}
        okText="确认拨打"
        open={modalOpen}
        confirmLoading={starting}
        title="确认测试拨打"
        width={680}
        onCancel={closeModal}
        onOk={() => void startTest()}
      >
        <Spin spinning={targetLoading}>
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            {targetError ? (
              <Alert showIcon title={targetError} type="error" />
            ) : null}
            {startError ? (
              <Alert showIcon title={startError} type="error" />
            ) : null}
            <Descriptions
              bordered
              column={{ xs: 1, sm: 2 }}
              items={[
                {
                  key: 'customerName',
                  label: '客户名称',
                  children: target?.customerName || '—',
                },
                {
                  key: 'phoneNumber',
                  label: '手机号',
                  children: target?.phoneNumber
                    ? maskPhone(target.phoneNumber)
                    : '—',
                },
                {
                  key: 'prompt',
                  label: '提示词',
                  children: `${task.promptName} / ${task.sceneCode}`,
                },
                {
                  key: 'voice',
                  label: '音色',
                  children: task.voiceName
                    ? `${task.voiceName} / ${task.voice}`
                    : task.voice,
                },
                {
                  key: 'rule',
                  label: '呼叫规则',
                  children: task.ruleName,
                },
                {
                  key: 'ruleSummary',
                  label: '规则摘要',
                  children: task.ruleSummary,
                },
              ]}
            />

            <Radio.Group
              value={scenario}
              onChange={(event) => setScenario(event.target.value)}
            >
              <Space orientation="vertical">
                <Radio value="ai_only">AI 完整通话</Radio>
                <Radio
                  disabled={capability.availableAgentCount === 0}
                  value="handoff"
                >
                  AI 转人工通话
                </Radio>
              </Space>
            </Radio.Group>

            {capability.availableAgentCount === 0 ? (
              <Text type="warning">暂无可用坐席，请先到坐席工作台上线</Text>
            ) : null}

            {scenario === 'handoff' ? (
              <ol className="m-0 pl-5">
                <li>保持坐席工作台在线</li>
                <li>在坐席工作台接单</li>
              </ol>
            ) : null}
          </Space>
        </Spin>
      </Modal>
    </Space>
  );
};

export default LinphoneTaskTest;
