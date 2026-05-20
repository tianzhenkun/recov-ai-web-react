import {
  BulbOutlined,
  FrownOutlined,
  MehOutlined,
  SmileOutlined,
  TagOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Empty, Skeleton, Space, Tag, Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import type { FeedbackItem, FeedbackSentiment } from './_shared';

const { Text } = Typography;

type FeedbackFeedProps = {
  items: FeedbackItem[];
  loading?: boolean;
  onItemClick: (item: FeedbackItem) => void;
};

type SentimentMeta = {
  label: string;
  color: string;
  tagColor: 'error' | 'success' | 'default';
  icon: ReactNode;
};

const STATUS_TAG_COLOR: Record<FeedbackItem['status'], string> = {
  未转办: 'orange',
  已转办: 'blue',
  无需转办: 'default',
};

const FeedbackFeed = ({ items, loading, onItemClick }: FeedbackFeedProps) => {
  const { token } = theme.useToken();

  const sentimentMeta: Record<FeedbackSentiment, SentimentMeta> = {
    negative: {
      label: '负面情绪',
      color: token.colorError,
      tagColor: 'error',
      icon: <FrownOutlined />,
    },
    positive: {
      label: '正面反馈',
      color: token.colorSuccess,
      tagColor: 'success',
      icon: <SmileOutlined />,
    },
    neutral: {
      label: '中性反馈',
      color: token.colorPrimary,
      tagColor: 'default',
      icon: <MehOutlined />,
    },
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((idx) => (
          <Skeleton key={idx} active avatar paragraph={{ rows: 2 }} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <Empty description="暂无业主反馈" />;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const meta = sentimentMeta[item.sentiment];
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item)}
            className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-solid p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{
              borderColor: token.colorBorderSecondary,
              backgroundColor: token.colorBgContainer,
            }}
          >
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
              style={{ color: meta.color, backgroundColor: `${meta.color}14` }}
              aria-hidden
            >
              {item.sentiment === 'negative' ? (
                <FrownOutlined />
              ) : (
                <UserOutlined />
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Space size={8} align="center" wrap>
                <Text strong>{item.ownerName}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  来自 {item.project}
                </Text>
                <Tag
                  color={meta.tagColor}
                  icon={meta.icon}
                  style={{ marginInlineEnd: 0 }}
                >
                  {meta.label}
                </Tag>
              </Space>
              <Text
                type="secondary"
                italic
                style={{ fontSize: 12, lineHeight: 1.6 }}
              >
                "{item.reason}"
              </Text>
              <Space size={[16, 4]} wrap style={{ marginTop: 4 }}>
                <Space size={4}>
                  <TagOutlined style={{ color: token.colorTextTertiary }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    语义标签：{item.semanticTag}
                  </Text>
                </Space>
                <Space size={4}>
                  <BulbOutlined style={{ color: token.colorTextTertiary }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    建议操作：{item.suggestion}
                  </Text>
                </Space>
              </Space>
            </div>
            <Tag
              color={STATUS_TAG_COLOR[item.status]}
              style={{ marginInlineEnd: 0 }}
            >
              {item.status}
            </Tag>
          </button>
        );
      })}
    </div>
  );
};

export default FeedbackFeed;
