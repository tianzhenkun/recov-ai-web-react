import { PhoneOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  message,
  Select,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
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
  type FollowUpListQuery,
  type FollowUpTaskDto,
  getAgentFollowUp,
  type IdempotentSessionInput,
  listAgentFollowUps,
  startFollowUpCall,
} from '@/services/ruoyi/agent-console';
import './FollowUpPanel.css';
import FollowUpCallDetail from './FollowUpCallDetail';

const { Text, Title } = Typography;

type FollowUpServices = {
  list: (params?: FollowUpListQuery) => Promise<unknown>;
  detail: (followUpId: string) => Promise<unknown>;
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
  attemptTaskToOpen?: FollowUpTaskDto;
  callbackEnabled?: boolean;
  consoleSessionId?: string;
  onAttemptTaskOpened?: () => void;
  onPrepareCallback?: () => Promise<boolean>;
  services?: FollowUpServices;
  onCallAccepted?: (
    callback: FollowUpCallbackCredentialDto,
    task: FollowUpTaskDto,
  ) => void;
};

type FollowUpFilterValues = {
  createdAt?: [Dayjs, Dayjs];
  sceneCode?: FollowUpTaskDto['scene_code'];
  status?: FollowUpTaskDto['status'];
  sourceType?: FollowUpTaskDto['source_type'];
};

const defaultServices: FollowUpServices = {
  list: listAgentFollowUps,
  detail: getAgentFollowUp,
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

const followUpSourceLabels: Record<FollowUpTaskDto['source_type'], string> = {
  after_call_work: '接通后跟进',
  handoff_unanswered: '人工未接回访',
  ai_post_call: 'AI 话后跟进',
};

const attemptResultLabels: Record<AttemptResult, string> = {
  connected: '已接通',
  no_answer: '无人接听',
  busy: '占线',
  rejected: '客户拒接',
  invalid_contact: '无效联系方式',
  technical_failure: '技术失败',
};

const callStatusLabels: Record<string, string> = {
  dialing: '正在呼叫',
  ringing: '等待接听',
  connected: '通话中',
  completed: '已结束',
  failed: '呼叫失败',
};

const formatCallbackAt = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : '未约定回访时间';

const createIdempotencyKey = () => {
  const randomUuid = globalThis.crypto?.randomUUID;
  if (typeof randomUuid === 'function')
    return randomUuid.call(globalThis.crypto);
  // ponytail: HTTP fallback only; HTTPS restores Web Crypto UUIDs.
  return `follow-up-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const latestAttemptOf = (task: FollowUpTaskDto) =>
  task.latest_attempt || task.attempts?.at(-1);

const FollowUpPanel = ({
  agentStatus = 'available',
  attemptTaskToOpen,
  callbackEnabled = false,
  consoleSessionId,
  onAttemptTaskOpened,
  onPrepareCallback,
  services = defaultServices,
  onCallAccepted,
}: FollowUpPanelProps) => {
  const [scope, setScope] = useState<'unassigned' | 'mine'>('unassigned');
  const [tasks, setTasks] = useState<FollowUpTaskDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FollowUpFilterValues>({});
  const [filterForm] = Form.useForm<FollowUpFilterValues>();
  const [messageApi, messageContextHolder] = message.useMessage();
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
  const [selectedTask, setSelectedTask] = useState<FollowUpTaskDto>();
  const [selectedCallId, setSelectedCallId] = useState<string>();
  const inFlightRef = useRef(new Set<string>());

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const rows = unwrapRows(
        await services.list({
          status: filters.status ? [filters.status] : ['pending', 'processing'],
          sceneCode: filters.sceneCode,
          sourceType: filters.sourceType,
          createdAtBegin: filters.createdAt?.[0]?.startOf('day').toISOString(),
          createdAtEnd: filters.createdAt?.[1]?.endOf('day').toISOString(),
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
  }, [filters, scope, services]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!attemptTaskToOpen) return;
    setAttemptTask(attemptTaskToOpen);
    onAttemptTaskOpened?.();
  }, [attemptTaskToOpen, onAttemptTaskOpened]);

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
      try {
        await services.claim(task.id, createIdempotencyKey());
        messageApi.success('回访任务认领成功，负责人已固定为当前坐席');
        setTasks((current) => current.filter((item) => item.id !== task.id));
      } catch {
        messageApi.error('回访任务认领失败，请刷新后重试');
      }
    });

  const openTaskDetail = (task: FollowUpTaskDto) =>
    runOnce(`detail:${task.id}`, async () => {
      setSelectedTask(task);
      try {
        const detail = unwrapData(
          await services.detail(task.id),
        ) as FollowUpTaskDto;
        setSelectedTask((current) =>
          current?.id === task.id ? detail : current,
        );
      } catch {
        messageApi.error('跟进任务详情加载失败，请重试');
      }
    });

  const callCustomer = (task: FollowUpTaskDto) =>
    runOnce(`call:${task.id}`, async () => {
      if (!consoleSessionId) {
        messageApi.warning('请先在坐席工作台上线后再发起回拨');
        return;
      }
      if (!['available', 'offline', 'paused'].includes(agentStatus)) {
        messageApi.warning('当前坐席正在通话、话后处理或重连，暂不能回拨');
        return;
      }
      if (agentStatus !== 'available' && !(await onPrepareCallback?.())) {
        messageApi.error('上线失败，请完成设备检查后重试');
        return;
      }
      const response = unwrapData(
        await services.call(task.id, {
          consoleSessionId,
          idempotencyKey: createIdempotencyKey(),
        }),
      ) as FollowUpCallbackCredentialDto;
      messageApi.success('回拨任务已受理，等待最终通话状态');
      if (response?.call_id) onCallAccepted?.(response, task);
    });

  const terminal = (task: FollowUpTaskDto) =>
    ['completed', 'closed'].includes(task.status);
  const canStartCallback =
    Boolean(consoleSessionId) &&
    ['available', 'offline', 'paused'].includes(agentStatus);
  const selectedTaskLatestAttempt = selectedTask
    ? latestAttemptOf(selectedTask)
    : undefined;
  const selectedTaskCallbacks = selectedTask?.callback_records || [];

  const taskActions = (task: FollowUpTaskDto) => (
    <Flex gap="small" wrap>
      <Button
        type="link"
        size="small"
        onClick={() => void openTaskDetail(task)}
      >
        查看详情
      </Button>
      {!terminal(task) &&
      scope === 'unassigned' &&
      !task.owner_agent_identity ? (
        <Button type="link" size="small" onClick={() => void claim(task)}>
          认领回访
        </Button>
      ) : null}
      {!terminal(task) && scope === 'mine' ? (
        <>
          {callbackEnabled ? (
            <Button
              type="link"
              size="small"
              icon={<PhoneOutlined />}
              disabled={!canStartCallback}
              title={
                canStartCallback
                  ? undefined
                  : '当前坐席正在通话、话后处理或重连，暂不能回拨'
              }
              onClick={() => void callCustomer(task)}
            >
              {agentStatus === 'available' ? '呼叫客户' : '上线并呼叫'}
            </Button>
          ) : null}
          <Button
            type="link"
            size="small"
            disabled={latestAttemptOf(task)?.attempt_result !== 'connected'}
            title={
              latestAttemptOf(task)?.attempt_result === 'connected'
                ? undefined
                : '请先登记已联系结果'
            }
            onClick={() =>
              void services
                .complete(task.id, createIdempotencyKey())
                .then(loadTasks)
            }
          >
            完成任务
          </Button>
          <Button type="link" size="small" onClick={() => setAttemptTask(task)}>
            登记联系结果
          </Button>
          <Button
            danger
            type="link"
            size="small"
            onClick={() => setCloseTask(task)}
          >
            关闭任务
          </Button>
        </>
      ) : null}
    </Flex>
  );

  return (
    <div className="agent-follow-up-panel">
      {messageContextHolder}
      <Form<FollowUpFilterValues>
        className="agent-follow-up-filter"
        form={filterForm}
        layout="inline"
        onFinish={setFilters}
      >
        <Form.Item label="创建时间" name="createdAt">
          <DatePicker.RangePicker />
        </Form.Item>
        <Form.Item label="业务场景" name="sceneCode">
          <Select
            aria-label="业务场景"
            allowClear
            placeholder="全部业务场景"
            options={[
              { value: 'intro_contract', label: '合同审查产品介绍' },
              { value: 'intro_document', label: '文书产品介绍' },
              { value: 'intro_overseas', label: '涉外产品介绍' },
              { value: 'intro_geo', label: 'GEO 产品介绍' },
            ]}
          />
        </Form.Item>
        <Form.Item label="回访状态" name="status">
          <Select
            aria-label="回访状态"
            allowClear
            placeholder="全部状态"
            options={Object.entries(followUpStatusLabels).map(
              ([value, label]) => ({ value, label }),
            )}
          />
        </Form.Item>
        <Form.Item label="回访来源" name="sourceType">
          <Select
            aria-label="回访来源"
            allowClear
            placeholder="全部来源"
            options={Object.entries(followUpSourceLabels).map(
              ([value, label]) => ({ value, label }),
            )}
          />
        </Form.Item>
        <Form.Item>
          <Flex gap="small">
            <Button type="primary" htmlType="submit">
              查询
            </Button>
            <Button
              onClick={() => {
                filterForm.resetFields();
                setFilters({});
              }}
            >
              重置
            </Button>
          </Flex>
        </Form.Item>
      </Form>
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
          <Table<FollowUpTaskDto>
            rowKey="id"
            size="middle"
            pagination={false}
            scroll={{ x: 1400 }}
            dataSource={tasks}
            columns={[
              {
                title: '客户',
                dataIndex: 'masked_contact',
                width: 150,
                render: (value) => value || '联系方式已脱敏',
              },
              {
                title: '回访来源',
                dataIndex: 'source_type',
                width: 150,
                render: (value: FollowUpTaskDto['source_type']) =>
                  followUpSourceLabels[value],
              },
              {
                title: '跟进原因',
                dataIndex: 'follow_up_reason',
                ellipsis: true,
              },
              {
                title: '创建时间',
                dataIndex: 'created_at',
                width: 180,
                render: (value) => new Date(value).toLocaleString(),
              },
              {
                title: '应跟进时间',
                dataIndex: 'customer_callback_at',
                width: 190,
                render: (value) => formatCallbackAt(value),
              },
              {
                title: '最近联系结果',
                key: 'latest_attempt',
                width: 170,
                render: (_, task) => {
                  const latest = latestAttemptOf(task);
                  return latest
                    ? `${attemptResultLabels[latest.attempt_result]} · ${new Date(latest.contacted_at).toLocaleString()}`
                    : '-';
                },
              },
              {
                title: '状态',
                dataIndex: 'status',
                width: 100,
                render: (_, task) => (
                  <Tag color={terminal(task) ? 'default' : 'processing'}>
                    {followUpStatusLabels[task.status]}
                  </Tag>
                ),
              },
              {
                title: '操作',
                key: 'actions',
                fixed: 'right',
                width: 260,
                render: (_, task) => taskActions(task),
              },
            ]}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              scope === 'unassigned' ? '暂无待认领回访' : '暂无本人跟进'
            }
          />
        )}
      </Spin>

      <Drawer
        title={selectedCallId ? '通话详情' : '跟进任务详情'}
        open={Boolean(selectedTask)}
        size={selectedCallId ? 800 : 520}
        extra={
          selectedCallId ? (
            <Flex align="center" gap="small" wrap>
              <Button type="link" onClick={() => setSelectedCallId(undefined)}>
                返回跟进任务详情
              </Button>
              <Button
                type="link"
                href={`/ai-call/records?callId=${encodeURIComponent(selectedCallId)}&view=list`}
              >
                在通话记录中查看
              </Button>
            </Flex>
          ) : null
        }
        onClose={() => {
          setSelectedCallId(undefined);
          setSelectedTask(undefined);
        }}
      >
        {selectedCallId ? (
          <FollowUpCallDetail callId={selectedCallId} />
        ) : selectedTask ? (
          <Flex vertical gap={24}>
            <Descriptions
              column={1}
              items={[
                {
                  key: 'contact',
                  label: '客户',
                  children: selectedTask.masked_contact || '联系方式已脱敏',
                },
                {
                  key: 'source',
                  label: '来源',
                  children: followUpSourceLabels[selectedTask.source_type],
                },
                {
                  key: 'reason',
                  label: '跟进原因',
                  children: selectedTask.follow_up_reason,
                },
                {
                  key: 'summary',
                  label: '任务摘要',
                  children: selectedTask.summary || '暂无摘要',
                },
                {
                  key: 'callback',
                  label: '应跟进时间',
                  children: formatCallbackAt(selectedTask.customer_callback_at),
                },
                {
                  key: 'latest',
                  label: '最近联系结果',
                  children: selectedTaskLatestAttempt
                    ? attemptResultLabels[
                        selectedTaskLatestAttempt.attempt_result
                      ]
                    : '暂无联系记录',
                },
              ]}
            />
            <section>
              <Title level={5}>关联通话</Title>
              <Descriptions
                column={1}
                items={[
                  {
                    key: 'sourceCall',
                    label: '原始通话',
                    children: (
                      <Flex align="center" gap="small" wrap>
                        <Text>
                          {selectedTask.source_record
                            ? `${formatCallbackAt(selectedTask.source_record.started_at)} · ${callStatusLabels[selectedTask.source_record.status] || '状态未知'}`
                            : selectedTask.source_call_id}
                        </Text>
                        <Button
                          type="link"
                          size="small"
                          onClick={() =>
                            setSelectedCallId(selectedTask.source_call_id)
                          }
                        >
                          查看通话详情
                        </Button>
                      </Flex>
                    ),
                  },
                  {
                    key: 'callbackCalls',
                    label: '历次回拨',
                    children: selectedTaskCallbacks.length ? (
                      <Flex vertical gap="small">
                        {selectedTaskCallbacks.map((record, index) => {
                          const attempt = selectedTask.attempts?.find(
                            (item) => item.related_call_id === record.call_id,
                          );
                          return (
                            <Flex
                              key={record.call_id}
                              align="center"
                              gap="small"
                              wrap
                            >
                              <Text>{`第${index + 1}次人工回拨`}</Text>
                              <Text type="secondary">
                                {formatCallbackAt(record.started_at)}
                              </Text>
                              <Tag>
                                {attempt
                                  ? attemptResultLabels[attempt.attempt_result]
                                  : callStatusLabels[record.status] ||
                                    '状态未知'}
                              </Tag>
                              <Button
                                type="link"
                                size="small"
                                onClick={() =>
                                  setSelectedCallId(record.call_id)
                                }
                              >
                                查看本次通话详情
                              </Button>
                            </Flex>
                          );
                        })}
                      </Flex>
                    ) : (
                      <Text type="secondary">暂无回拨记录</Text>
                    ),
                  },
                ]}
              />
            </section>
          </Flex>
        ) : null}
      </Drawer>

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
            idempotencyKey: createIdempotencyKey(),
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
            idempotencyKey: createIdempotencyKey(),
          });
          messageApi.success(
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
