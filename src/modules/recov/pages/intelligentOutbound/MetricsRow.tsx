import {
  ClockCircleOutlined,
  MessageOutlined,
  PhoneOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { Skeleton, Space, Tooltip, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import MetricIcon, {
  type MetricTone,
} from '@/modules/recov/components/MetricIcon';
import { buildMetricDisplay, type OutboundMetric } from './_shared';

const { Text } = Typography;

const cardStyles = {
  body: {
    padding: 12,
  },
};

type MetricsRowProps = {
  metrics: OutboundMetric[];
  loading?: boolean;
};

type MetricMeta = {
  icon: ReactNode;
  tone: MetricTone;
};

const MetricsRow = ({ metrics, loading }: MetricsRowProps) => {
  const metaByKey = useMemo<Record<OutboundMetric['key'], MetricMeta>>(
    () => ({
      totalCalls: { icon: <PhoneOutlined />, tone: 'primary' },
      totalTalkHours: {
        icon: <ClockCircleOutlined />,
        tone: 'info',
      },
      currentRepayment: {
        icon: <WalletOutlined />,
        tone: 'success',
      },
      feedbackCount: {
        icon: <MessageOutlined />,
        tone: 'warning',
      },
    }),
    [],
  );

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      style={{ minWidth: 0 }}
    >
      {metrics.map((metric) => {
        const meta = metaByKey[metric.key];
        const display = buildMetricDisplay(metric);
        const hasTooltip = Boolean(
          display.tooltip && display.tooltip !== display.primary,
        );

        const valueNode = (
          <span
            style={{
              display: 'inline-flex',
              cursor: hasTooltip ? 'pointer' : 'default',
            }}
          >
            <Space align="baseline" size={4} wrap={false}>
              <Text
                strong
                style={{
                  cursor: 'inherit',
                  fontSize: 22,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  wordBreak: 'keep-all',
                }}
              >
                {display.primary}
              </Text>
              {display.unit ? (
                <Text
                  type="secondary"
                  style={{
                    cursor: 'inherit',
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {display.unit}
                </Text>
              ) : null}
            </Space>
          </span>
        );

        return (
          <ProCard
            key={metric.key}
            size="small"
            style={{ minWidth: 0 }}
            styles={cardStyles}
          >
            <div
              style={{
                minHeight: 62,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 8,
                minWidth: 0,
              }}
            >
              <Space align="center" size={8}>
                <MetricIcon icon={meta.icon} tone={meta.tone} />
                <Text
                  type="secondary"
                  style={{ fontSize: 12, lineHeight: 1.3 }}
                >
                  {metric.label}
                </Text>
              </Space>
              {loading ? (
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 120, height: 24 }}
                />
              ) : hasTooltip ? (
                <Tooltip title={display.tooltip}>{valueNode}</Tooltip>
              ) : (
                valueNode
              )}
            </div>
          </ProCard>
        );
      })}
    </div>
  );
};

export default MetricsRow;
