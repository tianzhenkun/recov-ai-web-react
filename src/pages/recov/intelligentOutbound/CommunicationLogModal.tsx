import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  MessageOutlined,
  MinusCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import {
  Button,
  Empty,
  Modal,
  Skeleton,
  Space,
  Tag,
  Timeline,
  Typography,
  theme,
} from 'antd';
import type { ReactNode } from 'react';
import type { CommunicationLog, OwnerCommunicationDetail } from './_shared';
import { formatDuration } from './_shared';

const { Text, Paragraph } = Typography;

type CommunicationLogModalProps = {
  open: boolean;
  loading?: boolean;
  detail: OwnerCommunicationDetail | null;
  onClose: () => void;
};

const sentimentMeta: Record<
  CommunicationLog['sentiment'],
  {
    color: string;
    tagColor: 'error' | 'success' | 'default' | 'warning';
    icon: ReactNode;
  }
> = {
  负向: {
    color: '#cf1322',
    tagColor: 'error',
    icon: <ExclamationCircleOutlined />,
  },
  正向: {
    color: '#389e0d',
    tagColor: 'success',
    icon: <CheckCircleOutlined />,
  },
  中性: {
    color: '#1677ff',
    tagColor: 'default',
    icon: <MinusCircleOutlined />,
  },
  未知: {
    color: '#8c8c8c',
    tagColor: 'default',
    icon: <QuestionCircleOutlined />,
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
      return {
        speaker: speaker || '对话',
        content,
      };
    })
    .filter(Boolean) as Array<{ speaker: string; content: string }>;
};

const CommunicationLogModal = ({
  open,
  loading,
  detail,
  onClose,
}: CommunicationLogModalProps) => {
  const { token } = theme.useToken();

  const timelineItems = (detail?.logs || []).map((log) => {
    const meta = sentimentMeta[log.sentiment];
    const transcriptTurns = getTranscriptTurns(log.transcript);
    return {
      color: meta.color,
      dot: <ClockCircleOutlined style={{ color: meta.color }} />,
      children: (
        <div className="flex flex-col gap-2 pb-2">
          <Space size={8} align="center" wrap>
            <Text strong>{log.date || '未记录时间'}</Text>
            <Tag color="processing" style={{ marginInlineEnd: 0 }}>
              {log.channel}
            </Tag>
            <Tag
              color={meta.tagColor}
              icon={meta.icon}
              style={{ marginInlineEnd: 0 }}
            >
              {log.sentiment}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatDuration(log.durationSeconds)}
            </Text>
          </Space>
          <Paragraph
            style={{
              marginBottom: 0,
              color: token.colorTextSecondary,
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            <Text strong style={{ marginInlineEnd: 6 }}>
              语义摘要：
            </Text>
            {log.summary}
          </Paragraph>
          {log.keywords.length > 0 ? (
            <Space size={[6, 4]} wrap>
              {log.keywords.map((keyword) => (
                <Tag key={keyword} style={{ marginInlineEnd: 0 }}>
                  {keyword}
                </Tag>
              ))}
            </Space>
          ) : null}
          {transcriptTurns.length > 0 ? (
            <div
              className="flex flex-col gap-2 rounded-lg p-3"
              style={{
                backgroundColor: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              {transcriptTurns.slice(0, 6).map((turn) => (
                <div
                  key={`${turn.speaker}-${turn.content}`}
                  className="grid grid-cols-[64px_minmax(0,1fr)] gap-2 text-sm"
                >
                  <Text type="secondary">{turn.speaker}</Text>
                  <Text style={{ color: token.colorTextSecondary }}>
                    {turn.content}
                  </Text>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ),
    };
  });

  return (
    <Modal
      open={open}
      title={
        detail ? `${detail.ownerName} · 智能外呼沟通记录` : '智能外呼沟通记录'
      }
      width={760}
      destroyOnHidden
      onCancel={onClose}
      footer={
        <Button type="primary" onClick={onClose}>
          关闭
        </Button>
      }
    >
      {loading || !detail ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <div className="flex flex-col gap-5">
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: `${token.colorPrimary}0F`,
              border: `1px solid ${token.colorPrimary}22`,
            }}
          >
            <Space size={6} align="center" wrap style={{ marginBottom: 6 }}>
              <MessageOutlined style={{ color: token.colorPrimary }} />
              <Text strong>沟通语义分析总结</Text>
              {detail.organization ? (
                <Tag style={{ marginInlineEnd: 0 }}>{detail.organization}</Tag>
              ) : null}
              {detail.debtorPhone ? (
                <Tag style={{ marginInlineEnd: 0 }}>{detail.debtorPhone}</Tag>
              ) : null}
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
          {timelineItems.length > 0 ? (
            <Timeline items={timelineItems} />
          ) : (
            <Empty description="暂无沟通记录" />
          )}
        </div>
      )}
    </Modal>
  );
};

export default CommunicationLogModal;
