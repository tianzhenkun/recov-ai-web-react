import { MonitorOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Skeleton, Space, Tag, Tooltip, Typography } from 'antd';
import type { LiveMonitorStats } from './_shared';
import { formatCompactCount, formatCount } from './_shared';

const { Text } = Typography;

type LiveMonitorCardProps = {
  stats: LiveMonitorStats;
  loading?: boolean;
  fillHeight?: boolean;
};

type Row = {
  label: string;
  raw: number;
  highlight?: boolean;
  unit: string;
};

const LiveMonitorCard = ({
  stats,
  loading,
  fillHeight,
}: LiveMonitorCardProps) => {
  const rows: Row[] = [
    { label: '正在通话', raw: stats.ongoingCalls, unit: '路' },
    { label: '今日已完成', raw: stats.finishedToday, unit: '次' },
    {
      label: '今日累计通话时长',
      raw: stats.totalTalkMinutesToday,
      unit: '分钟',
      highlight: true,
    },
  ];

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-lg ${fillHeight ? 'h-full min-h-[200px] p-6' : 'p-5'}`}
      style={{
        background:
          'linear-gradient(135deg, #1f2937 0%, #1f1f3a 55%, #312e81 100%)',
        color: '#fff',
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <Space size={8} align="center">
          <MonitorOutlined style={{ color: '#a5b4fc', fontSize: 16 }} />
          <Text strong style={{ color: '#fff' }}>
            实时外呼监控
          </Text>
        </Space>
        <span className="flex h-2 w-2 items-center justify-center">
          <span
            className="absolute inline-flex h-2 w-2 animate-ping rounded-full"
            style={{ backgroundColor: '#34d399', opacity: 0.65 }}
          />
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ backgroundColor: '#34d399' }}
          />
        </span>
      </div>

      <div
        className={`flex flex-1 flex-col ${fillHeight ? 'justify-center gap-5' : 'gap-3'}`}
      >
        {rows.map((row) => {
          const compact = formatCompactCount(row.raw);
          const full = formatCount(row.raw);
          const hasTooltip = compact !== full;
          const valueText = `${compact} ${row.unit}`;
          const tooltipText = `${full} ${row.unit}`;

          return (
            <div
              key={row.label}
              className="flex items-center justify-between text-sm"
            >
              <span style={{ color: 'rgba(255,255,255,0.65)' }}>
                {row.label}
              </span>
              {loading ? (
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 80, height: 20 }}
                />
              ) : hasTooltip ? (
                <Tooltip title={tooltipText}>
                  <span
                    className="font-semibold"
                    style={{
                      color: row.highlight ? '#a5b4fc' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {valueText}
                  </span>
                </Tooltip>
              ) : (
                <span
                  className="font-semibold"
                  style={{ color: row.highlight ? '#a5b4fc' : '#fff' }}
                >
                  {valueText}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Tag color="processing" style={{ marginInlineEnd: 0 }}>
          敬请期待
        </Tag>
        <Button
          type="text"
          size="small"
          disabled
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          查看详情 <RightOutlined />
        </Button>
      </div>

      <div
        className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full"
        style={{
          backgroundColor: 'rgba(99,102,241,0.18)',
          filter: 'blur(40px)',
        }}
      />
    </div>
  );
};

export default LiveMonitorCard;
