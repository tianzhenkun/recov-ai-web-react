import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history, useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listAiCallTasks } from '@/pages/aiCallTasks/service';
import {
  type AiCallDialogueSegment,
  type AiCallHandoff,
  type AiCallRecord,
  type AiCallRecordDetail,
  type AiCallRecording,
  type AiCallSemanticAnalysis,
  getAiCallRecordDetail,
  getAiCallRecordDialogue,
  getAiCallRecordHandoffs,
  getAiCallRecordRecording,
  getAiCallRecordSemanticAnalysis,
  listAiCallRecords,
} from './service';
import {
  getCustomerIntentPresentation,
  getFollowUpPresentation,
  hasUnstablePostCallData,
  type StatusPresentation,
} from './status';

const { Text, Title } = Typography;

const entryTypeLabels: Record<string, string> = {
  web: '浏览器测试',
  sip_outbound: 'SIP 外呼',
  sip_inbound: 'SIP 呼入',
  outbound_mock: '模拟执行',
};

const statusLabels: Record<string, string> = {
  created: '已创建',
  starting: '启动中',
  running: '通话中',
  active: '通话中',
  ending: '结束中',
  completed: '已完成',
  failed: '失败',
};

const mockStatusLabels: Record<string, string> = {
  created: '模拟待执行',
  starting: '模拟启动中',
  running: '模拟执行中',
  active: '模拟执行中',
  ending: '模拟结束中',
  completed: '模拟执行完成',
  failed: '模拟执行失败',
};

const callResultLabels: Record<string, string> = {
  connected: '已接通',
  no_answer: '无人接听',
  busy: '占线',
  call_failed: '呼叫失败',
  invalid_number: '号码无效',
};

const callResultColors: Record<string, string> = {
  connected: '#389e0d',
  no_answer: '#595959',
  busy: '#d48806',
  call_failed: '#cf1322',
  invalid_number: '#cf1322',
};

const detailDescriptionStyles = {
  label: { color: '#1f1f1f' },
};

const analysisStatusLabels: Record<string, string> = {
  '0': '待分析',
  '1': '分析中',
  '2': '分析成功',
  '3': '分析失败',
  '4': '无有效客户话术',
};

const endReasonLabels: Record<string, string> = {
  agent_completed: '人工坐席结束',
  web_user_end: '浏览器用户结束',
  customer_end: '客户结束',
  remote_hangup: '远端挂断',
  ai_completed: 'AI 完成',
  runtime_failed: '运行异常',
  reconnect_timeout: '重连超时',
  unknown: '未知原因',
};

const speakerLabels: Record<string, string> = {
  customer: '客户',
  ai: 'AI',
  human_agent: '人工坐席',
  agent: '人工坐席',
};

const businessTypeLabels: Record<string, string> = {
  outbound_task: '正式外呼任务',
  lead: '销售线索',
  debt_collection: '物业催收',
};

const analysisFieldLabels: Record<string, string> = {
  summary: '通话摘要',
  feedback_type: '客户反馈',
  key_points: '关键要点',
  time_hint: '客户期望联系时间',
  tags: '分析标签',
  customer_intent: '客户意向',
  follow_up: '后续跟进结论',
};

const analysisFieldOrder = [
  'summary',
  'feedback_type',
  'key_points',
  'time_hint',
  'tags',
  'customer_intent',
  'follow_up',
];

const feedbackTagColors: Record<string, string> = {
  正向: 'success',
  中性: 'processing',
  负向: 'error',
};

const customerIntentLabels: Record<string, string> = {
  positive: '正向',
  neutral: '中性',
  negative: '负向',
};

const followUpConsentLabels: Record<string, string> = {
  explicit: '明确同意',
  refused: '明确拒绝',
  missing: '未表达',
};

const followUpConfidenceLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const renderAnalysisValue = (key: string, value: unknown) => {
  if (key === 'feedback_type') {
    const text = String(value || '-');
    return <Tag color={feedbackTagColors[text] || 'default'}>{text}</Tag>;
  }
  if (key === 'key_points' && Array.isArray(value)) {
    return value.length ? (
      <Flex vertical gap={4}>
        {Array.from(new Set(value.map(String))).map((item) => (
          <Text key={item}>{item}</Text>
        ))}
      </Flex>
    ) : (
      '-'
    );
  }
  if (key === 'time_hint') {
    if (value && typeof value === 'object') {
      const hint = value as {
        time_text?: unknown;
        time_value?: unknown;
        original_texts?: unknown;
      };
      const timeText = String(hint.time_text || hint.time_value || '').trim();
      return timeText || '客户未提及';
    }
    return String(value || '').trim() || '客户未提及';
  }
  if (key === 'tags' && Array.isArray(value)) {
    return value.length ? (
      <Flex wrap gap={4}>
        {Array.from(new Set(value.map(String))).map((item) => (
          <Tag key={item}>{item}</Tag>
        ))}
      </Flex>
    ) : (
      '-'
    );
  }
  if (key === 'customer_intent') {
    const intent = String(value || '');
    return customerIntentLabels[intent] || intent || '-';
  }
  if (key === 'follow_up' && value && typeof value === 'object') {
    const followUp = value as {
      required?: unknown;
      consent?: unknown;
      reason?: unknown;
      preferred_time?: unknown;
      confidence?: unknown;
    };
    const consent = String(followUp.consent || 'missing');
    const confidence = String(followUp.confidence || '');
    const preferredAt = String(followUp.preferred_time || '').trim();
    return (
      <Descriptions
        column={1}
        size="small"
        styles={detailDescriptionStyles}
        items={[
          {
            key: 'suggested',
            label: '处理建议',
            children: followUp.required ? '建议跟进' : '无需跟进',
          },
          {
            key: 'consent',
            label: '客户态度',
            children: followUpConsentLabels[consent] || consent,
          },
          {
            key: 'reason',
            label: '判断依据',
            children: String(followUp.reason || '').trim() || '-',
          },
          {
            key: 'preferredAt',
            label: '期望时间',
            children: preferredAt
              ? dayjs(preferredAt).format('YYYY-MM-DD HH:mm:ss')
              : '-',
          },
          {
            key: 'confidence',
            label: '置信度',
            children: followUpConfidenceLabels[confidence] || confidence || '-',
          },
        ]}
      />
    );
  }
  return value && typeof value === 'object'
    ? JSON.stringify(value)
    : String(value ?? '-');
};

const formatDateTime = (value?: string | null) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';

const formatDuration = (durationMs?: number | null) => {
  if (durationMs == null) return '-';
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} 分 ${seconds} 秒` : `${seconds} 秒`;
};

const describeError = (row: AiCallRecord) =>
  row.failureMessage ||
  (row.endReason
    ? endReasonLabels[row.endReason] || row.endReason
    : row.status === 'failed'
      ? '未知失败原因'
      : '-');

const describeRecordStatus = (row: AiCallRecord) =>
  row.entryType === 'outbound_mock'
    ? mockStatusLabels[row.status] || `模拟执行（${row.status}）`
    : statusLabels[row.status] || row.status;

const describeMockResult = (row: AiCallRecord) => {
  const result = row.callResult || row.endReason;
  if (result === 'connected') return '模拟执行完成';
  return result && callResultLabels[result]
    ? `模拟：${callResultLabels[result]}`
    : describeRecordStatus(row);
};

const describeCallResult = (row: AiCallRecord) =>
  row.entryType === 'outbound_mock'
    ? describeMockResult(row)
    : row.callResult
      ? callResultLabels[row.callResult] || row.callResult
      : describeRecordStatus(row);

const describeEndResult = (row: AiCallRecord) =>
  row.entryType === 'outbound_mock'
    ? describeMockResult(row)
    : describeError(row);

const renderPostCallStatus = (
  presentation: StatusPresentation | null,
  onClick?: () => void,
) => {
  if (!presentation) {
    return <Text type="secondary">-</Text>;
  }
  const tag = (
    <Tag color={presentation.color} style={{ marginInlineEnd: 0 }}>
      {presentation.text}
    </Tag>
  );
  return (
    <Tooltip title={presentation.tooltip}>
      {presentation.target && onClick ? (
        <Button
          aria-label={`${presentation.text}，查看详情`}
          size="small"
          type="link"
          style={{ height: 'auto', padding: 0 }}
          onClick={onClick}
        >
          {tag}
        </Button>
      ) : (
        tag
      )}
    </Tooltip>
  );
};

const MAX_POST_CALL_POLLS = 12;
const POST_CALL_POLL_INTERVAL_MS = 5000;

type DetailErrors = Partial<
  Record<'recording' | 'dialogue' | 'analysis' | 'handoffs' | 'detail', string>
>;

const AiCallRecordsPage = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [searchParams] = useSearchParams();
  const presetTaskId = searchParams.get('taskId') || undefined;
  const presetTargetId = searchParams.get('targetId') || undefined;
  const [taskOptions, setTaskOptions] = useState<
    Array<{ label: string; value: string }>
  >(presetTaskId ? [{ label: presetTaskId, value: presetTaskId }] : []);
  const [selectedCallId, setSelectedCallId] = useState<string>();
  const [detail, setDetail] = useState<AiCallRecordDetail>();
  const [recording, setRecording] = useState<AiCallRecording | null>();
  const [dialogue, setDialogue] = useState<AiCallDialogueSegment[]>([]);
  const [analysis, setAnalysis] = useState<AiCallSemanticAnalysis | null>();
  const [handoffs, setHandoffs] = useState<AiCallHandoff[]>([]);
  const [detailErrors, setDetailErrors] = useState<DetailErrors>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [hasUnstableRecords, setHasUnstableRecords] = useState(false);
  const postCallPollCountRef = useRef(0);
  const postCallRefreshInFlightRef = useRef(false);

  const loadTaskOptions = useCallback(
    async (taskName?: string) => {
      try {
        const page = await listAiCallTasks({
          pageNum: 1,
          pageSize: 20,
          ...(taskName ? { taskName } : {}),
        });
        setTaskOptions((current) => {
          const next = page.rows.map((task) => ({
            label: task.taskName,
            value: task.taskId,
          }));
          const currentPreset = current.find(
            (option) => option.value === presetTaskId,
          );
          return currentPreset &&
            !next.some((option) => option.value === currentPreset.value)
            ? [currentPreset, ...next]
            : next;
        });
      } catch {
        // 任务筛选加载失败不阻塞通话记录主列表。
      }
    },
    [presetTaskId],
  );

  useEffect(() => {
    void loadTaskOptions();
  }, [loadTaskOptions]);

  const closeDetail = () => {
    setSelectedCallId(undefined);
    setDetail(undefined);
    setRecording(undefined);
    setDialogue([]);
    setAnalysis(undefined);
    setHandoffs([]);
    setDetailErrors({});
  };

  const openDetail = useCallback(async (callId: string) => {
    setSelectedCallId(callId);
    setDetail(undefined);
    setRecording(undefined);
    setDialogue([]);
    setAnalysis(undefined);
    setHandoffs([]);
    setDetailErrors({});
    setDetailLoading(true);
    try {
      const nextDetail = await getAiCallRecordDetail(callId);
      setDetail(nextDetail);

      const results = await Promise.allSettled([
        getAiCallRecordRecording(callId),
        getAiCallRecordDialogue(callId),
        getAiCallRecordSemanticAnalysis(callId),
        getAiCallRecordHandoffs(callId),
      ]);
      const nextErrors: DetailErrors = {};

      if (results[0].status === 'fulfilled') {
        setRecording(results[0].value);
      } else {
        nextErrors.recording = '录音信息加载失败';
      }
      if (results[1].status === 'fulfilled') {
        setDialogue(results[1].value.rows);
      } else {
        nextErrors.dialogue = '对话记录加载失败';
      }
      if (results[2].status === 'fulfilled') {
        setAnalysis(results[2].value);
      } else {
        nextErrors.analysis = 'AI 分析加载失败';
      }
      if (results[3].status === 'fulfilled') {
        setHandoffs(results[3].value.rows);
      } else {
        nextErrors.handoffs = '转人工记录加载失败';
      }
      setDetailErrors(nextErrors);
    } catch {
      setDetailErrors({ detail: '通话详情加载失败' });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasUnstableRecords) {
      postCallPollCountRef.current = 0;
      return;
    }

    const refresh = () => {
      if (
        document.visibilityState !== 'visible' ||
        postCallPollCountRef.current >= MAX_POST_CALL_POLLS ||
        postCallRefreshInFlightRef.current ||
        !actionRef.current?.reload
      ) {
        return;
      }
      postCallPollCountRef.current += 1;
      postCallRefreshInFlightRef.current = true;
      void Promise.resolve(actionRef.current.reload()).finally(() => {
        postCallRefreshInFlightRef.current = false;
      });
    };

    const timer = window.setInterval(refresh, POST_CALL_POLL_INTERVAL_MS);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [hasUnstableRecords]);

  const columns = useMemo<ProColumns<AiCallRecord>[]>(
    () => [
      {
        title: '所属任务',
        dataIndex: 'taskId',
        valueType: 'select',
        hideInTable: true,
        initialValue: presetTaskId,
        fieldProps: {
          allowClear: true,
          filterOption: false,
          options: taskOptions,
          placeholder: '搜索任务名称',
          showSearch: true,
          onSearch: (value: string) => void loadTaskOptions(value.trim()),
        },
      },
      {
        title: '手机号',
        dataIndex: 'phoneNumber',
        hideInTable: true,
      },
      {
        title: '客户名称',
        dataIndex: 'customerName',
        hideInTable: true,
      },
      {
        title: '通话来源',
        dataIndex: 'entryType',
        valueType: 'select',
        valueEnum: {
          web: { text: entryTypeLabels.web },
          sip_outbound: { text: entryTypeLabels.sip_outbound },
          sip_inbound: { text: entryTypeLabels.sip_inbound },
        },
        hideInTable: true,
      },
      {
        title: '呼叫结果',
        dataIndex: 'callResult',
        valueType: 'select',
        valueEnum: Object.fromEntries(
          Object.entries(callResultLabels).map(([value, text]) => [
            value,
            { text },
          ]),
        ),
        hideInTable: true,
      },
      {
        title: '客户意向',
        dataIndex: 'customerIntent',
        valueType: 'select',
        valueEnum: {
          pending: { text: '待分析 / 分析中' },
          positive: { text: '正向' },
          neutral: { text: '中性' },
          negative: { text: '负向' },
          failed: { text: '分析失败' },
        },
        hideInTable: true,
      },
      {
        title: '后续跟进',
        dataIndex: 'followUpStatus',
        valueType: 'select',
        valueEnum: {
          suggested: { text: '建议跟进' },
          pending: { text: '待跟进' },
          processing: { text: '跟进中' },
          completed: { text: '已完成' },
          closed: { text: '已关闭' },
          none: { text: '无需跟进' },
        },
        hideInTable: true,
      },
      {
        title: '通话时间范围',
        dataIndex: 'startedAtRange',
        valueType: 'dateTimeRange',
        hideInTable: true,
      },
      {
        title: '通话时间',
        dataIndex: 'startedAt',
        search: false,
        width: 176,
        render: (_, row) => (
          <Flex vertical gap={2}>
            <Text>{formatDateTime(row.startedAt)}</Text>
            <Text type="secondary">{formatDuration(row.durationMs)}</Text>
          </Flex>
        ),
      },
      {
        title: '客户信息',
        key: 'customer',
        search: false,
        width: 160,
        render: (_, row) => (
          <Flex vertical gap={2}>
            <Text>{row.customerName || '-'}</Text>
            <Text type="secondary">{row.phoneNumber || '-'}</Text>
          </Flex>
        ),
      },
      {
        title: '任务信息',
        key: 'task',
        search: false,
        width: 180,
        render: (_, row) => (
          <Flex vertical gap={2}>
            <Text>{row.taskName || '-'}</Text>
            <Text type="secondary">{row.taskId || '-'}</Text>
          </Flex>
        ),
      },
      {
        title: '呼叫情况',
        key: 'call',
        search: false,
        width: 160,
        render: (_, row) => (
          <Flex vertical gap={4}>
            <Text
              strong
              style={{
                color:
                  row.entryType === 'outbound_mock'
                    ? '#1677ff'
                    : callResultColors[row.callResult || ''] || '#1f1f1f',
              }}
            >
              {describeCallResult(row)}
            </Text>
            <Text type="secondary">
              {entryTypeLabels[row.entryType] || row.entryType}
              {row.attemptNo ? ` · 第 ${row.attemptNo} 次` : ''}
            </Text>
          </Flex>
        ),
      },
      {
        title: '通话摘要',
        key: 'analysis',
        search: false,
        width: 240,
        render: (_, row) => (
          <Text
            type={row.summary ? undefined : 'secondary'}
            style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
            }}
          >
            {row.summary || '暂无摘要'}
          </Text>
        ),
      },
      {
        title: '客户意向',
        key: 'customerIntentDisplay',
        search: false,
        width: 104,
        render: (_, row) =>
          renderPostCallStatus(getCustomerIntentPresentation(row), () => {
            void openDetail(row.callId);
          }),
      },
      {
        title: '后续跟进',
        key: 'followUpDisplay',
        search: false,
        width: 112,
        render: (_, row) => {
          const presentation = getFollowUpPresentation(row);
          return renderPostCallStatus(presentation, () => {
            if (presentation?.target === 'follow_up' && row.followUpId) {
              history.push(
                `/ai-call/follow-ups?followUpId=${encodeURIComponent(
                  row.followUpId,
                )}`,
              );
              return;
            }
            void openDetail(row.callId);
          });
        },
      },
      {
        title: '操作',
        key: 'option',
        valueType: 'option',
        fixed: 'right',
        width: 100,
        render: (_, row) => (
          <Button
            size="small"
            type="link"
            onClick={() => void openDetail(row.callId)}
          >
            查看详情
          </Button>
        ),
      },
    ],
    [loadTaskOptions, openDetail, presetTaskId, taskOptions],
  );

  const record = detail?.record;
  const recordingUrl =
    record?.recordingPlayUrl ||
    recording?.playUrl ||
    recording?.tracks?.find((track) => track.playUrl)?.playUrl;
  const executionConfig = detail?.executionConfig;
  const analysisResult = analysis?.analysisResult || {};
  const analysisItems = analysisFieldOrder
    .filter((key) => Object.hasOwn(analysisResult, key))
    .map((key) => ({
      key,
      label: analysisFieldLabels[key],
      children: renderAnalysisValue(key, analysisResult[key]),
    }));

  return (
    <PageContainer title="通话记录">
      <ProTable<AiCallRecord>
        actionRef={actionRef}
        rowKey="callId"
        columns={columns}
        search={{ labelWidth: 104 }}
        scroll={{ x: 1240 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total) => `共 ${total} 条`,
        }}
        request={async ({ current, pageSize, startedAtRange, ...filters }) => {
          const range = Array.isArray(startedAtRange)
            ? startedAtRange
            : undefined;
          const page = await listAiCallRecords({
            ...filters,
            taskId: (filters.taskId as string | undefined) || presetTaskId,
            targetId: presetTargetId,
            pageNum: current,
            pageSize,
            ...(range?.[0]
              ? { startedAtBegin: dayjs(range[0]).toISOString() }
              : {}),
            ...(range?.[1]
              ? { startedAtEnd: dayjs(range[1]).toISOString() }
              : {}),
          });
          const unstable = hasUnstablePostCallData(page.rows);
          setHasUnstableRecords((current) =>
            current === unstable ? current : unstable,
          );
          return { data: page.rows, total: page.total, success: true };
        }}
      />

      <Drawer
        title="通话记录详情"
        open={Boolean(selectedCallId)}
        size={800}
        onClose={closeDetail}
      >
        {detailLoading ? (
          <Flex justify="center">
            <Spin />
          </Flex>
        ) : record ? (
          <Flex vertical gap={24}>
            <section>
              <Title level={5}>基本信息</Title>
              <Descriptions
                column={2}
                styles={detailDescriptionStyles}
                items={[
                  {
                    key: 'callId',
                    label: '通话 ID',
                    children: record.callId,
                  },
                  {
                    key: 'entryType',
                    label: '通话来源',
                    children:
                      entryTypeLabels[record.entryType] || record.entryType,
                  },
                  {
                    key: 'sceneCode',
                    label: '业务场景',
                    children: record.sceneCode || '-',
                  },
                  {
                    key: 'status',
                    label: '通话状态',
                    children: describeRecordStatus(record),
                  },
                  {
                    key: 'businessType',
                    label: '业务类型',
                    children: record.businessType
                      ? businessTypeLabels[record.businessType] ||
                        record.businessType
                      : '-',
                  },
                  {
                    key: 'businessId',
                    label: '业务 ID',
                    children: record.businessId || '-',
                  },
                  {
                    key: 'startedAt',
                    label: '开始时间',
                    children: formatDateTime(record.startedAt),
                  },
                  {
                    key: 'answeredAt',
                    label: '接通时间',
                    children:
                      record.entryType === 'outbound_mock'
                        ? '不适用（模拟执行）'
                        : formatDateTime(record.answeredAt),
                  },
                  {
                    key: 'endedAt',
                    label: '结束时间',
                    children: formatDateTime(record.endedAt),
                  },
                  {
                    key: 'duration',
                    label: '通话时长',
                    children: formatDuration(record.durationMs),
                  },
                  {
                    key: 'result',
                    label: '结束结果',
                    children: describeEndResult(record),
                    span: 2,
                  },
                ]}
              />
            </section>

            <section>
              <Title level={5}>执行配置</Title>
              {executionConfig ? (
                <Descriptions
                  column={2}
                  styles={detailDescriptionStyles}
                  items={[
                    {
                      key: 'promptName',
                      label: '提示词',
                      children: executionConfig.promptName || '-',
                    },
                    {
                      key: 'sceneCode',
                      label: '业务场景',
                      children: executionConfig.sceneCode || '-',
                    },
                    {
                      key: 'voice',
                      label: '音色',
                      children:
                        executionConfig.voiceName && executionConfig.voice
                          ? `${executionConfig.voiceName}（${executionConfig.voice}）`
                          : executionConfig.voiceName ||
                            executionConfig.voice ||
                            '-',
                    },
                    {
                      key: 'ruleName',
                      label: '呼叫规则',
                      children: executionConfig.ruleName || '-',
                    },
                  ]}
                />
              ) : (
                <Text type="secondary">未保存执行配置快照</Text>
              )}
            </section>

            <section>
              <Title level={5}>录音与对话</Title>
              <div data-testid="recording-player" style={{ marginBottom: 16 }}>
                {detailErrors.recording ? (
                  <Alert showIcon title={detailErrors.recording} type="error" />
                ) : recordingUrl ? (
                  <audio controls preload="metadata" src={recordingUrl}>
                    <track kind="captions" />
                  </audio>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无录音"
                  />
                )}
              </div>
              {detailErrors.dialogue ? (
                <Alert showIcon title={detailErrors.dialogue} type="error" />
              ) : dialogue.length ? (
                <Flex
                  data-testid="dialogue-scroll-region"
                  vertical
                  gap={12}
                  className="ai-call-dialogue-region"
                  style={{
                    maxHeight: 420,
                    overflowY: 'auto',
                    padding: 12,
                    border: '1px solid #eef0f4',
                    borderRadius: 10,
                    background: '#f8f9fb',
                  }}
                >
                  {dialogue.map((segment, index) => {
                    const isCustomer = segment.speakerType === 'customer';
                    const speaker =
                      speakerLabels[segment.speakerType] || segment.speakerType;
                    return (
                      <div
                        className={`ai-call-dialogue-row ai-call-dialogue-row--${
                          isCustomer ? 'right' : 'left'
                        }`}
                        style={{
                          display: 'flex',
                          width: '100%',
                          justifyContent: isCustomer
                            ? 'flex-end'
                            : 'flex-start',
                        }}
                        key={
                          segment.id ||
                          `${segment.segmentNo}-${segment.speakerType}-${index}`
                        }
                      >
                        <div
                          className={`ai-call-dialogue-bubble ai-call-dialogue-bubble--${
                            isCustomer ? 'customer' : segment.speakerType
                          }`}
                          style={{
                            maxWidth: '82%',
                            padding: '10px 12px',
                            border: `1px solid ${
                              isCustomer
                                ? '#dfd4fa'
                                : segment.speakerType === 'human_agent' ||
                                    segment.speakerType === 'agent'
                                  ? '#d4eadf'
                                  : '#e6ebf2'
                            }`,
                            borderRadius: isCustomer
                              ? '10px 10px 2px 10px'
                              : '10px 10px 10px 2px',
                            background: isCustomer
                              ? '#f1edfb'
                              : segment.speakerType === 'human_agent' ||
                                  segment.speakerType === 'agent'
                                ? '#edf8f2'
                                : '#f1f5fb',
                            lineHeight: 1.6,
                            overflowWrap: 'anywhere',
                          }}
                        >
                          <Text strong>{speaker}：</Text>
                          <Text>{segment.text}</Text>
                        </div>
                      </div>
                    );
                  })}
                </Flex>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无对话文本"
                />
              )}
            </section>

            <section>
              <Title level={5}>AI 分析与转人工</Title>
              {detailErrors.analysis ? (
                <Alert showIcon title={detailErrors.analysis} type="error" />
              ) : analysis ? (
                <Flex vertical gap={12}>
                  <Text>
                    分析状态：
                    {analysisStatusLabels[analysis.analysisStatus] ||
                      analysis.analysisStatus}
                  </Text>
                  {analysis.analysisError ? (
                    <Alert
                      showIcon
                      title={analysis.analysisError}
                      type="error"
                    />
                  ) : analysisItems.length ? (
                    <Descriptions
                      column={1}
                      styles={detailDescriptionStyles}
                      items={analysisItems}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无结构化分析结果"
                    />
                  )}
                </Flex>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无 AI 分析"
                />
              )}

              {detailErrors.handoffs ? (
                <Alert showIcon title={detailErrors.handoffs} type="error" />
              ) : handoffs.length ? (
                <Flex vertical gap={8}>
                  {handoffs.map((handoff) => (
                    <Descriptions
                      key={handoff.handoffId}
                      column={2}
                      styles={detailDescriptionStyles}
                      items={[
                        {
                          key: 'status',
                          label: '转人工状态',
                          children:
                            statusLabels[handoff.status] || handoff.status,
                        },
                        {
                          key: 'agent',
                          label: '接听坐席',
                          children: handoff.humanAgentIdentity || '-',
                        },
                        {
                          key: 'reason',
                          label: '转人工原因',
                          children: handoff.requestReason || '-',
                          span: 2,
                        },
                      ]}
                    />
                  ))}
                </Flex>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="本次未转人工"
                />
              )}
            </section>
          </Flex>
        ) : (
          <Alert
            showIcon
            title={detailErrors.detail || '通话详情加载失败'}
            type="error"
          />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default AiCallRecordsPage;
