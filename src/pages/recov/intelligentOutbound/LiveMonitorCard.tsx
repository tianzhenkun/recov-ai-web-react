import { Skeleton, Tooltip, Typography, theme } from 'antd';
import type { LiveMonitorStats } from './_shared';
import { formatCompactCount, formatCount } from './_shared';

const { Text } = Typography;

type LiveMonitorCardProps = {
  stats: LiveMonitorStats;
  loading?: boolean;
  fillHeight?: boolean;
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
}: LiveMonitorCardProps) => {
  const { token } = theme.useToken();

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

  const buildValue = (stat: MonitorStat, options?: { large?: boolean }) => {
    const compact = formatCompactCount(stat.raw);
    const full = formatCount(stat.raw);
    const hasTooltip = compact !== full;
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
            fontSize: options?.large ? 40 : 24,
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
            fontSize: options?.large ? 16 : 13,
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
      className={`flex flex-col rounded-lg border border-solid ${fillHeight ? 'h-full min-h-[220px] p-5' : 'p-5'}`}
      style={{
        background: token.colorBgContainer,
        borderColor: token.colorBorderSecondary,
        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div className="mb-5 flex items-center justify-between">
        <Text strong style={{ fontSize: 18 }}>
          实时外呼监控
        </Text>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
          style={{
            color: token.colorSuccess,
            backgroundColor: token.colorSuccessBg,
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: token.colorSuccess }}
          />
          实时
        </span>
      </div>

      <div className={fillHeight ? 'flex flex-1 flex-col justify-center' : ''}>
        <div
          className="rounded-lg px-5 py-5"
          style={{
            backgroundColor: token.colorFillQuaternary,
          }}
        >
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
        </div>

        <div
          className="mt-4 grid grid-cols-2 rounded-lg border border-solid"
          style={{
            borderColor: token.colorBorderSecondary,
            backgroundColor: token.colorBgContainer,
          }}
        >
          {secondaryStats.map((stat) => (
            <div
              key={stat.label}
              className="min-w-0 px-4 py-4"
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
              <div className="mt-3">
                {loading ? (
                  <Skeleton.Input active size="small" style={{ width: 86 }} />
                ) : (
                  buildValue(stat)
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiveMonitorCard;
