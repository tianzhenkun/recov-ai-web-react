import { EyeOutlined } from '@ant-design/icons';
import { Button, Skeleton, Space, Tooltip, Typography, theme } from 'antd';
import React from 'react';
import type { LiveMonitorStats } from './_shared';
import { formatCompactCount, formatCount } from './_shared';
import './LiveMonitorCard.css';

const { Text } = Typography;

type LiveMonitorCardProps = {
  stats: LiveMonitorStats;
  loading?: boolean;
  fillHeight?: boolean;
  onDetailClick?: () => void;
};

type MonitorStat = {
  label: string;
  raw: number;
  unit: string;
};

const LiveMonitorCard = ({
  stats,
  loading,
  fillHeight,
  onDetailClick,
}: LiveMonitorCardProps) => {
  const { token } = theme.useToken();
  const activityIconStyle = {
    '--live-monitor-activity-bg': 'transparent',
    '--live-monitor-activity-color': token.colorPrimary,
  } as React.CSSProperties;

  const activeStat: MonitorStat = {
    label: '正在通话',
    raw: stats.ongoingCalls,
    unit: '路',
  };

  const secondaryStats: MonitorStat[] = [
    {
      label: '今日已完成',
      raw: stats.finishedToday,
      unit: '次',
    },
    {
      label: '今日累计通话时长',
      raw: stats.totalTalkMinutesToday,
      unit: '分钟',
    },
  ];

  const buildValue = (
    stat: MonitorStat,
    options?: { large?: boolean; secondary?: boolean },
  ) => {
    const compact = formatCompactCount(stat.raw);
    const full = formatCount(stat.raw);
    const hasTooltip = compact !== full;
    const valueFontSize = options?.large ? 34 : options?.secondary ? 20 : 22;
    const unitFontSize = options?.large ? 16 : 13;
    const content = (
      <span
        className="inline-flex min-w-0 items-baseline gap-1 tabular-nums"
        style={{ cursor: hasTooltip ? 'pointer' : 'default' }}
      >
        <Text
          strong
          style={{
            color: options?.large ? token.colorTextHeading : token.colorText,
            cursor: 'inherit',
            fontSize: valueFontSize,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
          }}
        >
          {compact}
        </Text>
        <Text
          style={{
            color: token.colorTextSecondary,
            cursor: 'inherit',
            fontSize: unitFontSize,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {stat.unit}
        </Text>
      </span>
    );

    return hasTooltip ? (
      <Tooltip title={`${full} ${stat.unit}`}>{content}</Tooltip>
    ) : (
      content
    );
  };

  return (
    <div
      className={`flex flex-col rounded-lg border border-solid ${fillHeight ? 'h-full min-h-[200px] p-4' : 'p-4'}`}
      style={{
        background: token.colorBgContainer,
        borderColor: token.colorBorderSecondary,
        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Text strong style={{ fontSize: 16 }}>
          实时外呼监控
        </Text>
        <Space size={8}>
          {onDetailClick ? (
            <Button
              icon={
                <EyeOutlined
                  aria-hidden={true}
                  style={{ color: token.colorPrimary }}
                />
              }
              size="small"
              type="link"
              onClick={onDetailClick}
              style={{
                color: token.colorPrimary,
                height: 24,
                paddingInline: 0,
              }}
            >
              查看详情
            </Button>
          ) : null}
        </Space>
      </div>

      <div className={fillHeight ? 'flex flex-1 flex-col justify-center' : ''}>
        <div
          className="live-monitor-metrics-panel overflow-hidden rounded-lg border border-solid"
          style={{
            backgroundColor: token.colorFillQuaternary,
            borderColor: token.colorBorderSecondary,
          }}
        >
          <div className="live-monitor-primary-metric flex items-start justify-between gap-3 px-4 py-4">
            <div className="min-w-0">
              <Text type="secondary" style={{ fontSize: 13 }}>
                {activeStat.label}
              </Text>
              <div className="mt-2">
                {loading ? (
                  <Skeleton.Input active style={{ width: 120, height: 40 }} />
                ) : (
                  buildValue(activeStat, { large: true })
                )}
              </div>
            </div>
            <span
              aria-label="实时通话动态"
              className="live-monitor-activity-icon"
              role="img"
              style={activityIconStyle}
            >
              <span />
              <span />
              <span />
            </span>
          </div>

          <div
            className="live-monitor-secondary-strip grid grid-cols-2 border-0 border-t border-solid"
            style={{
              borderColor: token.colorBorderSecondary,
            }}
          >
            {secondaryStats.map((stat) => (
              <div
                key={stat.label}
                className="min-w-0 px-4 py-3"
                style={{
                  borderInlineStart:
                    stat.label === secondaryStats[0].label
                      ? undefined
                      : `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {stat.label}
                </Text>
                <div className="mt-2">
                  {loading ? (
                    <Skeleton.Input active size="small" style={{ width: 86 }} />
                  ) : (
                    buildValue(stat, { secondary: true })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitorCard;
