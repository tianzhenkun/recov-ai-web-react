import { ProCard } from '@ant-design/pro-components';
import { Space, Tooltip, Typography } from 'antd';
import MetricIcon from '@/pages/recov/components/MetricIcon';
import { RecovStatsStrip } from '@/pages/recov/components/RecovListLayout';
import type { LitigationOverviewVO } from '@/services/ruoyi/litigation-process';
import {
  formatCompactCurrencyDisplay,
  formatCurrencyDisplay,
  OVERVIEW_CARD_METAS,
  toNumber,
} from '../_shared';

const { Text } = Typography;

const statCardStyles = {
  body: {
    padding: 12,
  },
};

type OverviewCardsProps = {
  overview: LitigationOverviewVO;
};

const OverviewCards = ({ overview }: OverviewCardsProps) => (
  <RecovStatsStrip className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
    {OVERVIEW_CARD_METAS.map((meta) => {
      const raw = overview[meta.key];
      const isCurrency = meta.format === 'currency';
      const primary = isCurrency
        ? formatCompactCurrencyDisplay(raw)
        : toNumber(raw).toLocaleString('zh-CN');
      const tooltip = isCurrency ? formatCurrencyDisplay(raw) : undefined;
      const hasTooltip = Boolean(tooltip && tooltip !== primary);

      const valueNode = (
        <Space align="baseline" size={4} wrap={false}>
          <Text
            strong
            style={{ fontSize: 22, lineHeight: 1.2, whiteSpace: 'nowrap' }}
          >
            {primary}
          </Text>
          {meta.unit ? (
            <Text
              type="secondary"
              style={{ fontSize: 12, whiteSpace: 'nowrap' }}
            >
              {meta.unit}
            </Text>
          ) : null}
        </Space>
      );

      return (
        <ProCard
          key={meta.key}
          size="small"
          style={{ minWidth: 0, height: '100%' }}
          styles={statCardStyles}
        >
          <div
            style={{
              minHeight: 62,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <Space align="center" size={8}>
              <MetricIcon icon={meta.icon} tone={meta.tone} />
              <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.3 }}>
                {meta.label}
              </Text>
            </Space>
            {hasTooltip ? (
              <Tooltip title={tooltip}>{valueNode}</Tooltip>
            ) : (
              valueNode
            )}
          </div>
        </ProCard>
      );
    })}
  </RecovStatsStrip>
);

export default OverviewCards;
