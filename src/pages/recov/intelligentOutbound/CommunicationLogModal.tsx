import {
  ClockCircleOutlined,
  MessageOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import {
  Button,
  Empty,
  Modal,
  message,
  Skeleton,
  Space,
  Timeline,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import React from 'react';
import { listOssByIds, type OssItem } from '@/services/ruoyi/oss';
import type { CommunicationLog, OwnerCommunicationDetail } from './_shared';
import { formatDuration } from './_shared';

const { Text, Paragraph } = Typography;

type CommunicationLogModalProps = {
  open: boolean;
  loading?: boolean;
  detail: OwnerCommunicationDetail | null;
  onClose: () => void;
};

type CommunicationLogContentProps = {
  loading?: boolean;
  detail: OwnerCommunicationDetail | null;
  emptyDescription?: string;
  showSummaryCard?: boolean;
  skeletonRows?: number;
};

const statusMeta: Record<
  string,
  {
    color: string;
    tagColor: 'error' | 'success' | 'default' | 'processing' | 'warning';
  }
> = {
  '1': {
    color: '#1677ff',
    tagColor: 'processing',
  },
  '2': {
    color: '#cf1322',
    tagColor: 'error',
  },
  '3': {
    color: '#d48806',
    tagColor: 'warning',
  },
  '4': {
    color: '#389e0d',
    tagColor: 'success',
  },
};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const getTranscriptTurns = (transcript?: Record<string, unknown>) => {
  if (!transcript || !Array.isArray(transcript.turns)) return [];
  const keyCounts = new Map<string, number>();

  return transcript.turns
    .map((turn) => {
      if (!turn || typeof turn !== 'object') return null;
      const source = turn as Record<string, unknown>;
      const speaker = firstText(
        source.speaker,
        source.role,
        source.name,
        source.from,
      );
      const content = firstText(source.text, source.content, source.message);
      if (!content) return null;
      const baseKey =
        firstText(
          source.id,
          source.turnId,
          source.messageId,
          source.seq,
          source.sequence,
          source.timestamp,
          source.startTime,
        ) || `${speaker || '对话'}-${content}`;
      const usedCount = keyCounts.get(baseKey) || 0;
      keyCounts.set(baseKey, usedCount + 1);

      return {
        key: usedCount > 0 ? `${baseKey}-${usedCount + 1}` : baseKey,
        speaker: speaker || '对话',
        content,
        role:
          speaker === 'user' || speaker === '用户'
            ? 'user'
            : speaker === 'assistant' || speaker === 'AI'
              ? 'assistant'
              : 'unknown',
      };
    })
    .filter(Boolean) as Array<{
    key: string;
    speaker: string;
    content: string;
    role: 'assistant' | 'user' | 'unknown';
  }>;
};

export const CommunicationLogContent = ({
  loading,
  detail,
  emptyDescription = '暂无沟通记录',
  showSummaryCard = true,
  skeletonRows = 6,
}: CommunicationLogContentProps) => {
  const { token } = theme.useToken();
  const [audioPreview, setAudioPreview] = React.useState<{
    open: boolean;
    title?: string;
    url?: string;
  }>({ open: false });
  const [loadingRecordingId, setLoadingRecordingId] = React.useState('');
  const sentimentColor: Record<CommunicationLog['sentiment'], string> = {
    负向: token.colorError,
    正向: token.colorPrimary,
    中性: token.colorTextSecondary,
    未知: token.colorTextTertiary,
  };
  const sectionTitleStyle = {
    marginInlineEnd: 6,
    fontSize: 13,
  } as const;
  const handlePlayRecording = async (log: CommunicationLog) => {
    const recordingOssId = firstText(log.recordingOssId);
    if (!recordingOssId) return;

    setLoadingRecordingId(recordingOssId);
    try {
      const response = await listOssByIds(recordingOssId);
      const ossItems = (response.data || []) as OssItem[];
      const recordingUrl = firstText(
        ossItems.find((oss) => firstText(oss.ossId) === recordingOssId)?.url,
        ossItems[0]?.url,
      );
      if (!recordingUrl) {
        message.warning('录音文件暂不可播放');
        return;
      }
      setAudioPreview({
        open: true,
        title: `${log.date || '通话'}录音`,
        url: recordingUrl,
      });
    } catch {
      message.error('录音文件加载失败');
    } finally {
      setLoadingRecordingId('');
    }
  };

  const timelineItems = (detail?.logs || []).map((log) => {
    const callStatusMeta = statusMeta[log.status || ''] || {
      color: token.colorTextTertiary,
      tagColor: 'default' as const,
    };
    const timelineColor = log.hasSemanticAnalysis
      ? sentimentColor[log.sentiment]
      : callStatusMeta.color;
    const transcriptTurns = getTranscriptTurns(log.transcript);
    const shouldShowSummary =
      log.hasSemanticAnalysis || transcriptTurns.length === 0;
    const recordingOssId = firstText(log.recordingOssId);
    return {
      color: timelineColor,
      icon: <ClockCircleOutlined style={{ color: timelineColor }} />,
      content: (
        <div className="flex flex-col gap-2 pb-2">
          <Space size={8} align="center" wrap>
            <Text strong>{log.date || '未记录时间'}</Text>
            {log.durationSeconds > 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatDuration(log.durationSeconds)}
              </Text>
            ) : null}
            {recordingOssId ? (
              <Tooltip title="播放录音">
                <Button
                  aria-label="播放录音"
                  type="text"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  loading={loadingRecordingId === recordingOssId}
                  onClick={() => void handlePlayRecording(log)}
                />
              </Tooltip>
            ) : null}
          </Space>
          {shouldShowSummary ? (
            <Paragraph
              style={{
                marginBottom: 0,
                color: token.colorTextSecondary,
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              <Text strong style={sectionTitleStyle}>
                {log.hasSemanticAnalysis ? '语义摘要：' : '状态说明：'}
              </Text>
              {log.summary}
            </Paragraph>
          ) : null}
          {transcriptTurns.length > 0 ? (
            <>
              <Text strong style={sectionTitleStyle}>
                对话内容：
              </Text>
              <div
                className="flex flex-col gap-2 rounded-lg p-3"
                style={{
                  backgroundColor: token.colorFillAlter,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <div className="flex flex-col gap-2">
                  {transcriptTurns.map((turn) => (
                    <div
                      key={`${log.id}-${turn.key}`}
                      className={`flex ${
                        turn.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <Text
                        className="inline-block rounded-lg px-3 py-2 text-sm"
                        style={{
                          maxWidth: '82%',
                          backgroundColor:
                            turn.role === 'user'
                              ? token.colorPrimaryBg
                              : token.colorBgContainer,
                          border:
                            turn.role === 'user'
                              ? `1px solid ${token.colorPrimaryBorder}`
                              : `1px solid ${token.colorBorderSecondary}`,
                          color:
                            turn.role === 'user'
                              ? token.colorPrimaryText
                              : token.colorTextSecondary,
                          lineHeight: 1.7,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {turn.content}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      ),
    };
  });

  return (
    <>
      {loading || !detail ? (
        loading ? (
          <Skeleton active paragraph={{ rows: skeletonRows }} />
        ) : (
          <Empty description={emptyDescription} />
        )
      ) : (
        <div className="flex flex-col gap-5">
          {showSummaryCard ? (
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: `${token.colorPrimary}0F`,
                border: `1px solid ${token.colorPrimary}22`,
              }}
            >
              <Space size={6} align="center" wrap style={{ marginBottom: 6 }}>
                <MessageOutlined style={{ color: token.colorPrimary }} />
                <Text strong>通话语义概要</Text>
              </Space>
              <Paragraph
                style={{
                  marginBottom: 0,
                  color: token.colorTextSecondary,
                  fontSize: 13,
                  lineHeight: 1.8,
                }}
              >
                {detail.semanticSummary}
              </Paragraph>
            </div>
          ) : null}
          {timelineItems.length > 0 ? (
            <Timeline items={timelineItems} />
          ) : (
            <Empty description={emptyDescription} />
          )}
        </div>
      )}
      <Modal
        open={audioPreview.open}
        title={audioPreview.title || '通话录音'}
        destroyOnHidden
        footer={null}
        onCancel={() => setAudioPreview({ open: false })}
      >
        {audioPreview.url ? (
          // biome-ignore lint/a11y/useMediaCaption: 通话录音暂无字幕文件，保留浏览器原生音频控件。
          <audio
            autoPlay
            controls
            src={audioPreview.url}
            style={{ width: '100%' }}
          />
        ) : null}
      </Modal>
    </>
  );
};

const CommunicationLogModal = ({
  open,
  loading,
  detail,
  onClose,
}: CommunicationLogModalProps) => {
  return (
    <Modal
      open={open}
      title={
        detail ? `${detail.ownerName} · 智能外呼沟通记录` : '智能外呼沟通记录'
      }
      width={760}
      destroyOnHidden
      onCancel={onClose}
      styles={{
        body: {
          maxHeight: 'calc(90vh - 128px)',
          overflowY: 'auto',
        },
      }}
      footer={
        <Button type="primary" onClick={onClose}>
          关闭
        </Button>
      }
    >
      <CommunicationLogContent loading={loading} detail={detail} />
    </Modal>
  );
};

export default CommunicationLogModal;
