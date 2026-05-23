import {
  ClockCircleOutlined,
  FrownOutlined,
  InboxOutlined,
  MehOutlined,
  SmileOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { Skeleton, Space, Tag, Tooltip, Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import type { FeedbackItem, FeedbackSentiment } from './_shared';

const { Text } = Typography;

const MAX_VISIBLE_TAGS = 3;

type FeedbackFeedProps = {
  items: FeedbackItem[];
  loading?: boolean;
  onItemClick: (item: FeedbackItem) => void;
};

type SentimentMeta = {
  color: string;
  iconBg: string;
  tagColor: 'error' | 'success' | 'default';
  icon: ReactNode;
};

const FeedbackFeed = ({ items, loading, onItemClick }: FeedbackFeedProps) => {
  const { token } = theme.useToken();

  const sentimentMeta: Record<FeedbackSentiment, SentimentMeta> = {
    negative: {
      color: token.colorError,
      iconBg: `${token.colorError}14`,
      tagColor: 'error',
      icon: <FrownOutlined />,
    },
    positive: {
      color: token.colorSuccess,
      iconBg: `${token.colorSuccess}14`,
      tagColor: 'success',
      icon: <SmileOutlined />,
    },
    neutral: {
      color: token.colorTextSecondary,
      iconBg: token.colorFillQuaternary,
      tagColor: 'default',
      icon: <MehOutlined />,
    },
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {[0, 1, 2, 3].map((idx) => (
          <Skeleton key={idx} active avatar paragraph={{ rows: 2 }} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="flex min-h-[220px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center"
        style={{
          borderColor: token.colorBorderSecondary,
          backgroundColor: token.colorFillQuaternary,
        }}
      >
        <span
          className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full text-xl"
          style={{
            color: token.colorTextTertiary,
            backgroundColor: token.colorBgContainer,
          }}
          aria-hidden
        >
          <InboxOutlined />
        </span>
        <Text strong style={{ color: token.colorTextSecondary }}>
          暂无用户反馈
        </Text>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {items.map((item) => {
        const meta = sentimentMeta[item.sentiment];
        const visibleTags = item.semanticTags.slice(0, MAX_VISIBLE_TAGS);
        const hiddenTags = item.semanticTags.slice(MAX_VISIBLE_TAGS);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item)}
            className="flex w-full cursor-pointer items-start gap-4 rounded-lg border border-solid px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{
              borderColor: token.colorBorderSecondary,
              backgroundColor: token.colorBgContainer,
              minHeight: 140,
            }}
          >
            <span
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg"
              style={{ color: meta.color, backgroundColor: meta.iconBg }}
              aria-hidden
            >
              {meta.icon}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Space size={8} align="center" wrap>
                <Text strong>{item.ownerName}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  来自 {item.project}
                </Text>
              </Space>
              <Text
                type="secondary"
                italic
                style={{ fontSize: 13, lineHeight: 1.8 }}
              >
                “{item.summary}”
              </Text>
              <Space size={[12, 6]} wrap style={{ marginTop: 2 }}>
                {visibleTags.length > 0 ? (
                  <Space size={4} wrap>
                    <TagOutlined style={{ color: token.colorTextTertiary }} />
                    {visibleTags.map((tag) => (
                      <Tooltip key={tag} title={tag}>
                        <Tag
                          style={{
                            maxWidth: 112,
                            marginInlineEnd: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            verticalAlign: 'bottom',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tag}
                        </Tag>
                      </Tooltip>
                    ))}
                    {hiddenTags.length > 0 ? (
                      <Tooltip title={hiddenTags.join('、')}>
                        <Tag style={{ marginInlineEnd: 0 }}>
                          +{hiddenTags.length}
                        </Tag>
                      </Tooltip>
                    ) : null}
                  </Space>
                ) : null}
                {item.startedAt ? (
                  <Space size={4}>
                    <ClockCircleOutlined
                      style={{ color: token.colorTextTertiary }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.startedAt}
                    </Text>
                  </Space>
                ) : null}
              </Space>
            </div>
            <Tag
              color={meta.tagColor}
              icon={meta.icon}
              style={{ marginInlineEnd: 0 }}
            >
              {item.feedbackType}
            </Tag>
          </button>
        );
      })}
    </div>
  );
};

export default FeedbackFeed;
