import {
  ClockCircleOutlined,
  FrownOutlined,
  MehOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { Empty, Skeleton, Tag, Tooltip, Typography, theme } from 'antd';
import React, { type ReactNode } from 'react';
import type { FeedbackItem, FeedbackSentiment } from './_shared';
import './FeedbackFeed.css';

const { Text } = Typography;

const MAX_VISIBLE_TAGS = 3;
const FEEDBACK_SUMMARY_MAX_LINES = 2;

const singleLineEllipsisStyle: React.CSSProperties = {
  display: 'block',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

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
  const feedRowCount = Math.max(items.length, pageSize, 1);

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
      <div
        className="grid min-h-0 flex-1 gap-2 overflow-hidden pr-1"
        style={{
          gridTemplateRows: `repeat(${pageSize}, minmax(0, 1fr))`,
        }}
      >
        {Array.from(
          { length: pageSize },
          (_, idx) => `feedback-skeleton-${idx + 1}`,
        ).map((skeletonKey) => (
          <div
            key={skeletonKey}
            className="min-h-0 overflow-hidden rounded-lg px-4 py-3"
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
    <div
      className="grid min-h-0 flex-1 gap-2 overflow-hidden pr-1"
      style={{
        gridTemplateRows: `repeat(${feedRowCount}, minmax(0, 1fr))`,
      }}
    >
      {items.map((item) => {
        const meta = sentimentMeta[item.sentiment];
        const visibleTags = item.semanticTags.slice(0, MAX_VISIBLE_TAGS);
        const hiddenTags = item.semanticTags.slice(MAX_VISIBLE_TAGS);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item)}
            className="flex h-full min-h-0 w-full cursor-pointer items-start gap-3 overflow-hidden rounded-lg border border-solid px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{
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
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-hidden">
              <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                <Tooltip title={item.ownerName}>
                  <Text
                    strong
                    style={{
                      ...singleLineEllipsisStyle,
                      flex: '0 1 auto',
                      maxWidth: 128,
                    }}
                  >
                    {item.ownerName}
                  </Text>
                </Tooltip>
                <Tooltip title={`来自 ${item.project}`}>
                  <Text
                    type="secondary"
                    style={{
                      ...singleLineEllipsisStyle,
                      flex: '1 1 auto',
                      fontSize: 12,
                    }}
                  >
                    来自 {item.project}
                  </Text>
                </Tooltip>
              </div>
              <Tooltip title={item.summary}>
                <Text
                  className="feedback-summary-clamp"
                  type="secondary"
                  style={
                    {
                      '--feedback-summary-lines': String(
                        FEEDBACK_SUMMARY_MAX_LINES,
                      ),
                      fontSize: 13,
                      fontStyle: 'italic',
                      lineHeight: 1.55,
                    } as React.CSSProperties
                  }
                >
                  “{item.summary}”
                </Text>
              </Tooltip>
              <div
                aria-hidden={visibleTags.length > 0}
                className="mt-auto flex min-w-0 shrink-0 overflow-hidden"
                data-testid={
                  visibleTags.length > 0
                    ? 'feedback-semantic-tags-placeholder'
                    : undefined
                }
                style={
                  visibleTags.length > 0
                    ? {
                        pointerEvents: 'none',
                        visibility: 'hidden',
                      }
                    : undefined
                }
              >
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
            <div className="flex h-full min-h-0 shrink-0 flex-col items-end justify-between gap-2 overflow-hidden">
              <Tag
                icon={meta.icon}
                style={{
                  maxWidth: 116,
                  marginInlineEnd: 0,
                  color: meta.tagColor,
                  backgroundColor: meta.tagBg,
                  borderColor: meta.tagBorder,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.feedbackType}
              </Tag>
              {item.startedAt ? (
                <div className="flex min-w-max shrink-0 items-center gap-1">
                  <ClockCircleOutlined
                    className="shrink-0"
                    style={{ color: token.colorTextTertiary }}
                  />
                  <Text
                    type="secondary"
                    style={{
                      ...singleLineEllipsisStyle,
                      fontSize: 12,
                    }}
                  >
                    {item.startedAt}
                  </Text>
                </div>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default FeedbackFeed;
