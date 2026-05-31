import {
  ClockCircleOutlined,
  FrownOutlined,
  MehOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { Empty, Skeleton, Space, Tag, Tooltip, Typography, theme } from 'antd';
import React, { type ReactNode } from 'react';
import type { FeedbackItem, FeedbackSentiment } from './_shared';

const { Text } = Typography;

const MAX_VISIBLE_TAGS = 3;
const FEEDBACK_CARD_MAX_HEIGHT = 120;

type FeedbackFeedProps = {
  items: FeedbackItem[];
  loading?: boolean;
  pageSize?: number;
  onItemClick: (item: FeedbackItem) => void;
};

type SentimentMeta = {
  color: string;
  iconBg: string;
  tagColor: string;
  tagBg: string;
  tagBorder: string;
  icon: ReactNode;
};

const FeedbackFeed = ({
  items,
  loading,
  pageSize = 5,
  onItemClick,
}: FeedbackFeedProps) => {
  const { token } = theme.useToken();

  const sentimentMeta: Record<FeedbackSentiment, SentimentMeta> = {
    negative: {
      color: token.colorError,
      iconBg: token.colorErrorBg,
      tagColor: token.colorError,
      tagBg: token.colorErrorBg,
      tagBorder: token.colorErrorBorder,
      icon: <FrownOutlined />,
    },
    positive: {
      color: token.colorPrimary,
      iconBg: token.colorPrimaryBg,
      tagColor: token.colorPrimary,
      tagBg: token.colorPrimaryBg,
      tagBorder: token.colorPrimaryBorder,
      icon: <SmileOutlined />,
    },
    neutral: {
      color: token.colorTextSecondary,
      iconBg: token.colorFillQuaternary,
      tagColor: token.colorTextSecondary,
      tagBg: token.colorFillQuaternary,
      tagBorder: token.colorBorderSecondary,
      icon: <MehOutlined />,
    },
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        {Array.from(
          { length: pageSize },
          (_, idx) => `feedback-skeleton-${idx + 1}`,
        ).map((skeletonKey) => (
          <div
            key={skeletonKey}
            className="shrink-0 overflow-hidden rounded-lg px-4 py-3"
            style={{ maxHeight: FEEDBACK_CARD_MAX_HEIGHT }}
          >
            <Skeleton active avatar paragraph={{ rows: 2 }} />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[220px] flex-1 items-center justify-center px-6 py-10">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无用户反馈"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
      {items.map((item) => {
        const meta = sentimentMeta[item.sentiment];
        const visibleTags = item.semanticTags.slice(0, MAX_VISIBLE_TAGS);
        const hiddenTags = item.semanticTags.slice(MAX_VISIBLE_TAGS);
        const feedbackRecordCount = item.feedbackRecordCount || 0;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item)}
            className="flex w-full shrink-0 cursor-pointer items-start gap-3 overflow-hidden rounded-lg border border-solid px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{
              maxHeight: FEEDBACK_CARD_MAX_HEIGHT,
              overflow: 'hidden',
              borderColor: token.colorBorderSecondary,
              backgroundColor: token.colorBgContainer,
            }}
          >
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
              style={{ color: meta.color, backgroundColor: meta.iconBg }}
              aria-hidden
            >
              {meta.icon}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Space size={8} align="center" wrap>
                <Text strong>{item.ownerName}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  来自 {item.project}
                </Text>
                {feedbackRecordCount > 1 ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    共 {feedbackRecordCount} 次反馈
                  </Text>
                ) : null}
              </Space>
              <Tooltip title={item.summary}>
                <Text
                  type="secondary"
                  italic
                  style={{
                    display: '-webkit-box',
                    overflow: 'hidden',
                    fontSize: 13,
                    lineHeight: 1.55,
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                  }}
                >
                  “{item.summary}”
                </Text>
              </Tooltip>
              <div className="mt-auto flex min-w-0 overflow-hidden">
                {visibleTags.length > 0 ? (
                  <div className="flex min-w-0 shrink items-center gap-1 overflow-hidden">
                    {visibleTags.map((tag) => (
                      <Tooltip key={tag} title={tag}>
                        <Tag
                          style={{
                            maxWidth: 96,
                            marginInlineEnd: 0,
                            color: token.colorTextSecondary,
                            backgroundColor: token.colorFillQuaternary,
                            borderColor: token.colorBorderSecondary,
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
                        <Tag
                          style={{
                            marginInlineEnd: 0,
                            color: token.colorTextSecondary,
                            backgroundColor: token.colorFillQuaternary,
                            borderColor: token.colorBorderSecondary,
                          }}
                        >
                          +{hiddenTags.length}
                        </Tag>
                      </Tooltip>
                    ) : null}
                  </div>
                ) : (
                  <span className="min-w-0" />
                )}
              </div>
            </div>
            <div className="flex self-stretch shrink-0 flex-col items-end justify-between gap-2">
              <Tag
                icon={meta.icon}
                style={{
                  marginInlineEnd: 0,
                  color: meta.tagColor,
                  backgroundColor: meta.tagBg,
                  borderColor: meta.tagBorder,
                }}
              >
                {item.feedbackType}
              </Tag>
              {item.startedAt ? (
                <Space className="shrink-0" size={4}>
                  <ClockCircleOutlined
                    style={{ color: token.colorTextTertiary }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.startedAt}
                  </Text>
                </Space>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default FeedbackFeed;
