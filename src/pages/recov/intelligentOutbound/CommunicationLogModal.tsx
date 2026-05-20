import {
  BulbOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  MinusCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import {
  Button,
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
  负面: {
    color: '#cf1322',
    tagColor: 'error',
    icon: <ExclamationCircleOutlined />,
  },
  正面: {
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

const CommunicationLogModal = ({
  open,
  loading,
  detail,
  onClose,
}: CommunicationLogModalProps) => {
  const { token } = theme.useToken();

  const timelineItems = (detail?.logs || []).map((log) => {
    const meta = sentimentMeta[log.sentiment];
    return {
      color: meta.color,
      dot: <ClockCircleOutlined style={{ color: meta.color }} />,
      children: (
        <div className="flex flex-col gap-2 pb-2">
          <Space size={8} align="center" wrap>
            <Text strong>{log.date}</Text>
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
              沟通摘要：
            </Text>
            {log.summary}
          </Paragraph>
          <Space size={[6, 4]} wrap>
            {log.keywords.map((keyword) => (
              <Tag key={keyword} style={{ marginInlineEnd: 0 }}>
                {keyword}
              </Tag>
            ))}
          </Space>
          <Space size={6} align="start">
            <BulbOutlined style={{ color: token.colorPrimary, marginTop: 3 }} />
            <Text style={{ color: token.colorPrimary, fontSize: 13 }}>
              {log.suggestion}
            </Text>
          </Space>
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
      width={720}
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
            <Space size={6} align="center" style={{ marginBottom: 6 }}>
              <BulbOutlined style={{ color: token.colorPrimary }} />
              <Text strong>沟通语义分析总结</Text>
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
          <Timeline items={timelineItems} />
        </div>
      )}
    </Modal>
  );
};

export default CommunicationLogModal;
