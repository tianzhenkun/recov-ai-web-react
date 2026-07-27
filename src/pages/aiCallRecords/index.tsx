import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Collapse,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Spin,
  Tag,
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
  type AiCallRecordEvent,
  type AiCallRecording,
  type AiCallSemanticAnalysis,
  getAiCallRecordDetail,
  getAiCallRecordDialogue,
  getAiCallRecordEvents,
  getAiCallRecordHandoffs,
  getAiCallRecordRecording,
  getAiCallRecordSemanticAnalysis,
  listAiCallRecords,
} from './service';

const { Paragraph, Text, Title } = Typography;

const entryTypeLabels: Record<string, string> = {
  web: '浏览器测试',
  sip_outbound: 'SIP 外呼',
  sip_inbound: 'SIP 呼入',
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

const callResultLabels: Record<string, string> = {
  connected: '已接通',
  no_answer: '无人接听',
  busy: '占线',
  call_failed: '呼叫失败',
  invalid_number: '号码无效',
};

const callResultColors: Record<string, string> = {
  connected: 'success',
  no_answer: 'default',
  busy: 'warning',
  call_failed: 'error',
  invalid_number: 'error',
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

type DetailErrors = Partial<
  Record<'recording' | 'dialogue' | 'analysis' | 'handoffs' | 'events', string>
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
  const [events, setEvents] = useState<AiCallRecordEvent[]>([]);
  const [detailErrors, setDetailErrors] = useState<DetailErrors>({});
  const [detailLoading, setDetailLoading] = useState(false);

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
    setEvents([]);
    setDetailErrors({});
  };

  const openDetail = async (callId: string) => {
    setSelectedCallId(callId);
    setDetail(undefined);
    setRecording(undefined);
    setDialogue([]);
    setAnalysis(undefined);
    setHandoffs([]);
    setEvents([]);
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
        getAiCallRecordEvents(callId),
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
      if (results[4].status === 'fulfilled') {
        setEvents(results[4].value.rows);
      } else {
        nextErrors.events = '技术事件加载失败';
      }
      setDetailErrors(nextErrors);
    } catch {
      setDetailErrors({ events: '通话详情加载失败' });
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = useMemo<ProColumns<AiCallRecord>[]>(
    () => [
      {
        title: '所属任务',
        dataIndex: 'taskId',
        valueType: 'select',
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
            <Tag color={callResultColors[row.callResult || ''] || 'default'}>
              {row.callResult
                ? callResultLabels[row.callResult] || row.callResult
                : statusLabels[row.status] || row.status}
            </Tag>
            <Text type="secondary">
              {entryTypeLabels[row.entryType] || row.entryType}
              {row.attemptNo ? ` · 第 ${row.attemptNo} 次` : ''}
            </Text>
          </Flex>
        ),
      },
      {
        title: 'AI 分析',
        key: 'analysis',
        search: false,
        width: 240,
        render: (_, row) => (
          <Flex vertical gap={2}>
            <Text>{row.aiOutcome || '—'}</Text>
            {row.summary ? (
              <Text
                type="secondary"
                style={{
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                  overflow: 'hidden',
                }}
              >
                {row.summary}
              </Text>
            ) : null}
          </Flex>
        ),
      },
      {
        title: '录音',
        key: 'recording',
        search: false,
        width: 220,
        render: (_, row) =>
          row.recordingPlayUrl ? (
            <audio
              aria-label={`播放 ${row.callId} 录音`}
              controls
              preload="none"
              src={row.recordingPlayUrl}
              style={{ width: 200 }}
            >
              <track kind="captions" />
            </audio>
          ) : (
            <Text type="secondary">—</Text>
          ),
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
    [loadTaskOptions, presetTaskId, taskOptions],
  );

  const record = detail?.record;
  const recordingUrl =
    record?.recordingPlayUrl ||
    recording?.playUrl ||
    recording?.tracks?.find((track) => track.playUrl)?.playUrl;
  const executionConfig = detail?.executionConfig;
  const analysisItems = Object.entries(analysis?.analysisResult || {}).map(
    ([key, value]) => ({
      key,
      label: key,
      children:
        value && typeof value === 'object'
          ? JSON.stringify(value)
          : String(value ?? '-'),
    }),
  );

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
                    children: statusLabels[record.status] || record.status,
                  },
                  {
                    key: 'businessType',
                    label: '业务类型',
                    children: record.businessType || '-',
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
                    children: formatDateTime(record.answeredAt),
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
                    children: describeError(record),
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
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无执行配置快照"
                />
              )}
            </section>

            <section>
              <Title level={5}>录音与对话</Title>
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
              {detailErrors.dialogue ? (
                <Alert showIcon title={detailErrors.dialogue} type="error" />
              ) : dialogue.length ? (
                <Flex vertical gap={8}>
                  {dialogue.map((segment, index) => (
                    <Paragraph
                      key={
                        segment.id ||
                        `${segment.segmentNo}-${segment.speakerType}-${index}`
                      }
                    >
                      <Text strong>
                        {speakerLabels[segment.speakerType] ||
                          segment.speakerType}
                        ：
                      </Text>
                      {segment.text}
                    </Paragraph>
                  ))}
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
                    <Descriptions column={1} items={analysisItems} />
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

            <Collapse
              size="small"
              items={[
                {
                  key: 'events',
                  label: `技术事件（${events.length}）`,
                  children: detailErrors.events ? (
                    <Alert showIcon title={detailErrors.events} type="error" />
                  ) : events.length ? (
                    <Flex vertical gap={8}>
                      {events.map((event) => (
                        <div key={event.eventId}>
                          <Text strong>{event.eventType}</Text>
                          <Text type="secondary">
                            {' '}
                            · {event.source} · {formatDateTime(event.eventTime)}
                          </Text>
                          <Paragraph copyable>
                            {JSON.stringify(event.payload)}
                          </Paragraph>
                        </div>
                      ))}
                    </Flex>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无技术事件"
                    />
                  ),
                },
              ]}
            />
          </Flex>
        ) : (
          <Alert
            showIcon
            title={detailErrors.events || '通话详情加载失败'}
            type="error"
          />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default AiCallRecordsPage;
