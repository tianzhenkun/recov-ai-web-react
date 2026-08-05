import { Alert, Descriptions, Empty, Flex, Spin, Typography } from 'antd';
import dayjs from 'dayjs';
import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  getHandoffReasonLabel,
  statusLabels as handoffStatusLabels,
} from '@/pages/agentWorkbench/admin/_shared';
import {
  type AiCallDialogueSegment,
  type AiCallHandoff,
  type AiCallRecordDetail,
  type AiCallRecording,
  type AiCallSemanticAnalysis,
  getAiCallRecordDetail,
  getAiCallRecordDialogue,
  getAiCallRecordHandoffs,
  getAiCallRecordRecording,
  getAiCallRecordSemanticAnalysis,
} from '@/pages/aiCallRecords/service';

const { Text, Title } = Typography;

type CallBundle = {
  detail: AiCallRecordDetail;
  recording: AiCallRecording | null;
  dialogue: AiCallDialogueSegment[];
  analysis: AiCallSemanticAnalysis | null;
  handoffs: AiCallHandoff[];
  missingSections: string[];
};

const recordStatusLabels: Record<string, string> = {
  created: '已创建',
  dialing: '正在呼叫',
  ringing: '等待接听',
  running: '通话中',
  connected: '通话中',
  completed: '已结束',
  failed: '失败',
};

const endReasonLabels: Record<string, string> = {
  agent_completed: '坐席结束',
  customer_end: '客户结束',
  remote_hangup: '远端挂断',
  sip_participant_left: '对方挂断',
  handoff_timeout: '转人工等待超时',
};

const speakerLabels: Record<string, string> = {
  customer: '客户',
  ai: 'AI',
  human_agent: '人工坐席',
  agent: '人工坐席',
};

const analysisLabels: Record<string, string> = {
  summary: '通话摘要',
  key_points: '关键要点',
  customer_intent: '客户意向',
  follow_up: '跟进建议',
};

const formatDateTime = (value?: string | null) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';

const formatDuration = (durationMs?: number | null) => {
  if (durationMs == null) return '-';
  const seconds = Math.max(0, Math.round(durationMs / 1000));
  return seconds >= 60
    ? `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`
    : `${seconds} 秒`;
};

const renderAnalysisValue = (key: string, value: unknown) => {
  if (Array.isArray(value)) return value.map(String).join('、') || '-';
  if (key === 'follow_up' && value && typeof value === 'object') {
    const followUp = value as { reason?: unknown; required?: unknown };
    const decision = followUp.required ? '建议跟进' : '无需跟进';
    const reason = String(followUp.reason || '').trim();
    return reason ? `${decision}：${reason}` : decision;
  }
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value ?? '-');
};

const FollowUpCallDetail = ({ callId }: { callId: string }) => {
  const [bundle, setBundle] = useState<CallBundle>();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setBundle(undefined);
    setError('');

    void Promise.allSettled([
      getAiCallRecordDetail(callId),
      getAiCallRecordRecording(callId),
      getAiCallRecordDialogue(callId),
      getAiCallRecordSemanticAnalysis(callId),
      getAiCallRecordHandoffs(callId),
    ]).then(([detail, recording, dialogue, analysis, handoffs]) => {
      if (!active) return;
      if (detail.status === 'rejected') {
        setError('通话详情加载失败，请重试');
        return;
      }
      const missingSections: string[] = [];
      if (recording.status === 'rejected') missingSections.push('录音');
      if (dialogue.status === 'rejected') missingSections.push('对话');
      if (analysis.status === 'rejected') missingSections.push('AI 分析');
      if (handoffs.status === 'rejected') missingSections.push('转人工记录');
      setBundle({
        detail: detail.value,
        recording: recording.status === 'fulfilled' ? recording.value : null,
        dialogue: dialogue.status === 'fulfilled' ? dialogue.value.rows : [],
        analysis: analysis.status === 'fulfilled' ? analysis.value : null,
        handoffs: handoffs.status === 'fulfilled' ? handoffs.value.rows : [],
        missingSections,
      });
    });

    return () => {
      active = false;
    };
  }, [callId]);

  if (error) return <Alert showIcon type="error" title={error} />;
  if (!bundle) {
    return (
      <Flex justify="center">
        <Spin />
      </Flex>
    );
  }

  const record = bundle.detail.record;
  const recordingUrl = bundle.recording?.playUrl || record.recordingPlayUrl;
  const analysisItems = Object.entries(
    bundle.analysis?.analysisResult || {},
  ).map(([key, value]) => ({
    key,
    label: analysisLabels[key] || key,
    children: renderAnalysisValue(key, value),
  }));

  return (
    <Flex vertical gap={28}>
      {bundle.missingSections.length ? (
        <Alert
          showIcon
          type="warning"
          title={`部分信息加载失败：${bundle.missingSections.join('、')}`}
        />
      ) : null}

      <section>
        <Title level={5}>基本信息</Title>
        <Descriptions
          column={2}
          items={[
            { key: 'callId', label: '通话 ID', children: record.callId },
            {
              key: 'status',
              label: '通话状态',
              children: recordStatusLabels[record.status] || record.status,
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
              key: 'endReason',
              label: '结束结果',
              children: record.endReason
                ? endReasonLabels[record.endReason] || record.endReason
                : '-',
              span: 2,
            },
          ]}
        />
      </section>

      <section>
        <Title level={5}>录音与对话</Title>
        {recordingUrl ? (
          <audio
            controls
            preload="metadata"
            src={recordingUrl}
            style={{ width: '100%' }}
          >
            <track kind="captions" />
          </audio>
        ) : (
          <Text type="secondary">暂无录音</Text>
        )}
        {bundle.dialogue.length ? (
          <Flex vertical gap={8} style={{ marginTop: 16 }}>
            {bundle.dialogue.map((segment, index) => (
              <div key={segment.id || `${segment.segmentNo}-${index}`}>
                <Text strong>
                  {speakerLabels[segment.speakerType] || segment.speakerType}：
                </Text>
                <Text>{segment.text}</Text>
              </div>
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
        <Title level={5}>AI 分析</Title>
        {analysisItems.length ? (
          <Descriptions column={1} items={analysisItems} />
        ) : (
          <Text type="secondary">暂无 AI 分析</Text>
        )}
      </section>

      <section>
        <Title level={5}>转人工记录</Title>
        {bundle.handoffs.length ? (
          <Flex vertical gap={12}>
            {bundle.handoffs.map((handoff) => (
              <Descriptions
                key={handoff.handoffId}
                column={2}
                items={[
                  {
                    key: 'status',
                    label: '状态',
                    children:
                      handoffStatusLabels[handoff.status] || handoff.status,
                  },
                  {
                    key: 'agent',
                    label: '接听坐席',
                    children: handoff.humanAgentIdentity || '-',
                  },
                  {
                    key: 'reason',
                    label: '转人工原因',
                    children: getHandoffReasonLabel(handoff.requestReason),
                    span: 2,
                  },
                ]}
              />
            ))}
          </Flex>
        ) : (
          <Text type="secondary">本次未转人工</Text>
        )}
      </section>
    </Flex>
  );
};

export default FollowUpCallDetail;
