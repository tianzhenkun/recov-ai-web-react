import { PhoneOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Empty,
  Flex,
  Input,
  Modal,
  Select,
  Spin,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type AttemptResult,
  type ClosedReason,
  type ContactChannel,
  claimFollowUp,
  closeFollowUp,
  completeFollowUp,
  createFollowUpAttempt,
  type FollowUpCallbackCredentialDto,
  type FollowUpTaskDto,
  type IdempotentSessionInput,
  listAgentFollowUps,
  startFollowUpCall,
} from '@/services/ruoyi/agent-console';
import './FollowUpPanel.css';

const { Text } = Typography;

type FollowUpServices = {
  list: (params?: Record<string, unknown>) => Promise<unknown>;
  claim: (followUpId: string, idempotencyKey: string) => Promise<unknown>;
  call: (followUpId: string, input: IdempotentSessionInput) => Promise<unknown>;
  complete: (followUpId: string, idempotencyKey: string) => Promise<unknown>;
  attempt: (
    followUpId: string,
    input: {
      contactChannel: ContactChannel;
      attemptResult: AttemptResult;
      errorMessage?: string;
      remark?: string;
      contactedAt: string;
      customerCallbackAt?: string;
      idempotencyKey: string;
    },
  ) => Promise<unknown>;
  close: (
    followUpId: string,
    input: {
      closedReason: ClosedReason;
      closedRemark?: string;
      idempotencyKey: string;
    },
  ) => Promise<unknown>;
};

type FollowUpPanelProps = {
  agentStatus?: string;
  callbackEnabled?: boolean;
  consoleSessionId?: string;
  services?: FollowUpServices;
  onCallAccepted?: (
    callback: FollowUpCallbackCredentialDto,
    task: FollowUpTaskDto,
  ) => void;
};

const defaultServices: FollowUpServices = {
  list: listAgentFollowUps,
  claim: claimFollowUp,
  call: startFollowUpCall,
  complete: completeFollowUp,
  attempt: createFollowUpAttempt,
  close: closeFollowUp,
};

const unwrapRows = (response: unknown): FollowUpTaskDto[] => {
  if (!response || typeof response !== 'object') return [];
  const data = Reflect.get(response, 'data');
  if (data && typeof data === 'object') {
    const rows = Reflect.get(data, 'rows');
    if (Array.isArray(rows)) return rows;
  }
  const rows = Reflect.get(response, 'rows');
  return Array.isArray(rows) ? rows : [];
};

const unwrapData = (response: unknown) =>
  response && typeof response === 'object' && Reflect.get(response, 'data')
    ? Reflect.get(response, 'data')
    : response;

const requiredRemarkReasons: ClosedReason[] = [
  'created_by_error',
  'no_longer_needed',
  'other',
];

const followUpStatusLabels: Record<FollowUpTaskDto['status'], string> = {
  pending: '待认领',
  processing: '处理中',
  completed: '已完成',
  closed: '已关闭',
};

const FollowUpPanel = ({
  agentStatus = 'available',
  callbackEnabled = false,
  consoleSessionId,
  services = defaultServices,
  onCallAccepted,
}: FollowUpPanelProps) => {
  const [scope, setScope] = useState<'unassigned' | 'mine'>('unassigned');
  const [tasks, setTasks] = useState<FollowUpTaskDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [closeTask, setCloseTask] = useState<FollowUpTaskDto>();
  const [closeReason, setCloseReason] = useState<ClosedReason>();
  const [closeRemark, setCloseRemark] = useState('');
  const [closeError, setCloseError] = useState('');
  const [attemptTask, setAttemptTask] = useState<FollowUpTaskDto>();
  const [contactChannel, setContactChannel] =
    useState<ContactChannel>('manual_phone');
  const [attemptResult, setAttemptResult] =
    useState<AttemptResult>('no_answer');
  const [attemptRemark, setAttemptRemark] = useState('');
  const [attemptError, setAttemptError] = useState('');
  const [callbackAt, setCallbackAt] = useState('');
  const inFlightRef = useRef(new Set<string>());

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const rows = unwrapRows(
        await services.list({
          ownership: scope,
          status: ['pending', 'processing'],
          pageSize: 50,
        }),
      );
      setTasks(
        rows.filter((task) => {
          return scope === 'unassigned'
            ? task.status === 'pending' && !task.owner_agent_identity
            : Boolean(task.owner_agent_identity);
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [scope, services]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const runOnce = async (key: string, operation: () => Promise<void>) => {
    if (inFlightRef.current.has(key)) return;
    inFlightRef.current.add(key);
    try {
      await operation();
    } finally {
      inFlightRef.current.delete(key);
    }
  };

  const claim = (task: FollowUpTaskDto) =>
    runOnce(`claim:${task.id}`, async () => {
      await services.claim(task.id, crypto.randomUUID());
      setNotice('回访任务认领成功，负责人已固定为当前坐席');
      setTasks((current) => current.filter((item) => item.id !== task.id));
    });

  const callCustomer = (task: FollowUpTaskDto) =>
    runOnce(`call:${task.id}`, async () => {
      if (!consoleSessionId) {
        setNotice('请先在坐席工作台上线后再发起回拨');
        return;
      }
      const response = unwrapData(
        await services.call(task.id, {
          consoleSessionId,
          idempotencyKey: crypto.randomUUID(),
        }),
      ) as FollowUpCallbackCredentialDto;
      setNotice('回拨任务已受理，等待最终通话状态');
      if (response?.call_id) onCallAccepted?.(response, task);
    });

  const terminal = (task: FollowUpTaskDto) =>
    ['completed', 'closed'].includes(task.status);

  return (
    <div className="agent-follow-up-panel">
      {notice ? (
        <Alert
          type="info"
          showIcon
          title={notice}
          closable={{ onClose: () => setNotice('') }}
        />
      ) : null}
      <Tabs
        activeKey={scope}
        items={[
          { key: 'unassigned', label: '待认领回访' },
          { key: 'mine', label: '我的跟进' },
        ]}
        onChange={(key) => setScope(key as 'unassigned' | 'mine')}
      />
      <Spin spinning={loading}>
        {tasks.length ? (
          <div className="agent-follow-up-list">
            {tasks.map((task) => (
              <article className="agent-follow-up-item" key={task.id}>
                <Flex justify="space-between" align="flex-start" gap="small">
                  <div>
                    <Text strong>
                      {task.masked_contact || '联系方式已脱敏'}
                    </Text>
                    <div>
                      <Text type="secondary">{task.follow_up_reason}</Text>
                    </div>
                  </div>
                  <Tag color={terminal(task) ? 'default' : 'processing'}>
                    {followUpStatusLabels[task.status]}
                  </Tag>
                </Flex>
                <div className="agent-follow-up-time">
                  <Text type="secondary">
                    {task.customer_callback_at
                      ? `客户预约：${new Date(task.customer_callback_at).toLocaleString()}`
                      : '未约定回访时间'}
                  </Text>
                </div>
                {!terminal(task) ? (
                  <Flex gap="small" wrap>
                    {scope === 'unassigned' && !task.owner_agent_identity ? (
                      <Button type="primary" onClick={() => void claim(task)}>
                        认领回访
                      </Button>
                    ) : (
                      <>
                        {callbackEnabled ? (
                          <Button
                            type="primary"
                            icon={<PhoneOutlined />}
                            disabled={agentStatus !== 'available'}
                            onClick={() => void callCustomer(task)}
                          >
                            呼叫客户
                          </Button>
                        ) : null}
                        <Button
                          disabled={
                            task.latest_attempt?.attempt_result !== 'connected'
                          }
                          title={
                            task.latest_attempt?.attempt_result === 'connected'
                              ? undefined
                              : '请先登记已联系结果'
                          }
                          onClick={() =>
                            void services
                              .complete(task.id, crypto.randomUUID())
                              .then(loadTasks)
                          }
                        >
                          完成任务
                        </Button>
                        <Button onClick={() => setAttemptTask(task)}>
                          登记联系结果
                        </Button>
                        <Button danger onClick={() => setCloseTask(task)}>
                          关闭任务
                        </Button>
                      </>
                    )}
                  </Flex>
                ) : (
                  <Text type="secondary">任务已进入终态，仅供查看</Text>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              scope === 'unassigned' ? '暂无待认领回访' : '暂无本人跟进'
            }
          />
        )}
      </Spin>

      <Modal
        title="关闭跟进任务"
        open={Boolean(closeTask)}
        okText="确认关闭"
        okType="danger"
        cancelText="取消"
        mask={{ enabled: true, closable: false }}
        onCancel={() => setCloseTask(undefined)}
        onOk={async () => {
          if (!closeTask || !closeReason) {
            setCloseError('请选择关闭原因');
            return;
          }
          if (
            requiredRemarkReasons.includes(closeReason) &&
            !closeRemark.trim()
          ) {
            setCloseError('请填写关闭说明');
            return;
          }
          await services.close(closeTask.id, {
            closedReason: closeReason,
            closedRemark: closeRemark.trim() || undefined,
            idempotencyKey: crypto.randomUUID(),
          });
          setCloseTask(undefined);
          setCloseReason(undefined);
          setCloseRemark('');
          setCloseError('');
          await loadTasks();
        }}
      >
        <div className="agent-follow-up-close-form">
          {closeError ? (
            <Alert type="error" showIcon title={closeError} />
          ) : null}
          <Select
            aria-label="关闭原因"
            placeholder="选择关闭原因"
            value={closeReason}
            options={[
              { value: 'customer_refused', label: '客户明确拒绝' },
              { value: 'invalid_contact', label: '联系方式无效' },
              { value: 'created_by_error', label: '任务误创建' },
              { value: 'no_longer_needed', label: '已无需跟进' },
              { value: 'other', label: '其他' },
            ]}
            onChange={(value) => setCloseReason(value)}
          />
          <Input.TextArea
            aria-label="关闭说明"
            placeholder="补充关闭说明"
            maxLength={300}
            value={closeRemark}
            onChange={(event) => setCloseRemark(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        title="登记联系结果"
        open={Boolean(attemptTask)}
        okText="保存联系记录"
        cancelText="取消"
        mask={{ enabled: true, closable: false }}
        onCancel={() => setAttemptTask(undefined)}
        onOk={async () => {
          if (!attemptTask) return;
          if (attemptResult === 'technical_failure' && !attemptRemark.trim()) {
            setAttemptError('请填写技术失败摘要');
            return;
          }
          await services.attempt(attemptTask.id, {
            contactChannel,
            attemptResult,
            errorMessage:
              attemptResult === 'technical_failure'
                ? attemptRemark.trim()
                : undefined,
            remark: attemptRemark.trim() || undefined,
            contactedAt: new Date().toISOString(),
            customerCallbackAt: callbackAt
              ? new Date(callbackAt).toISOString()
              : undefined,
            idempotencyKey: crypto.randomUUID(),
          });
          setNotice(
            attemptResult === 'connected'
              ? '联系结果已记录'
              : '联系结果已记录，任务保持待处理',
          );
          setAttemptTask(undefined);
          setAttemptRemark('');
          setAttemptError('');
          setCallbackAt('');
          await loadTasks();
        }}
      >
        <div className="agent-follow-up-close-form">
          {attemptError ? (
            <Alert type="error" showIcon title={attemptError} />
          ) : null}
          <Select
            aria-label="联系渠道"
            value={contactChannel}
            options={[
              { value: 'manual_phone', label: '人工电话' },
              { value: 'wechat', label: '微信' },
              { value: 'email', label: '邮件' },
              { value: 'other', label: '其他' },
            ]}
            onChange={(value) => setContactChannel(value)}
          />
          <Select
            aria-label="联系结果"
            value={attemptResult}
            options={[
              { value: 'connected', label: '已联系' },
              { value: 'no_answer', label: '无人接听' },
              { value: 'busy', label: '占线' },
              { value: 'rejected', label: '电话被拒接' },
              { value: 'invalid_contact', label: '联系方式无效' },
              { value: 'technical_failure', label: '技术失败' },
            ]}
            onChange={(value) => {
              setAttemptResult(value);
              setAttemptError('');
              if (value !== 'connected') setCallbackAt('');
            }}
          />
          <Input
            aria-label="客户预约回访时间"
            type="datetime-local"
            disabled={attemptResult !== 'connected'}
            value={callbackAt}
            onChange={(event) => setCallbackAt(event.target.value)}
          />
          <Text type="secondary">
            仅在客户明确约定时间时填写；普通未接通不生成系统重拨时间。
          </Text>
          <Input.TextArea
            aria-label="联系备注"
            rows={2}
            placeholder="可选联系备注"
            maxLength={300}
            value={attemptRemark}
            onChange={(event) => setAttemptRemark(event.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default FollowUpPanel;
