import { ProCard } from '@ant-design/pro-components';
import { Space, Tooltip, Typography } from 'antd';
import type { LawyerCourtOverviewVO } from '@/services/ruoyi/lawyer-court';
import { formatOverviewValue, OVERVIEW_CARD_METAS } from '../_shared';

const { Text } = Typography;

const statCardStyles = {
  body: {
    padding: 12,
  },
};

type OverviewCardsProps = {
  overview: LawyerCourtOverviewVO;
  loading?: boolean;
};

const OverviewCards = ({ overview, loading }: OverviewCardsProps) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
    {OVERVIEW_CARD_METAS.map((meta) => {
      const raw = overview[meta.key];
      const display = formatOverviewValue(raw, meta.format, meta.unit);
      const hasTooltip = Boolean(
        display.tooltip && display.tooltip !== display.primary,
      );

      const valueNode = (
        <Space align="baseline" size={4} wrap={false}>
          <Text
            strong
            style={{ fontSize: 22, lineHeight: 1.2, whiteSpace: 'nowrap' }}
          >
            {display.primary}
          </Text>
          {display.unit ? (
            <Text
              type="secondary"
              style={{ fontSize: 12, whiteSpace: 'nowrap' }}
            >
              {display.unit}
            </Text>
          ) : null}
        </Space>
      );

      return (
        <ProCard
          key={meta.key}
          size="small"
          loading={loading}
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
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                style={{
                  color: meta.color,
                  backgroundColor: `${meta.color}14`,
                }}
                aria-hidden
              >
                {meta.icon}
              </span>
              <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.3 }}>
                {meta.label}
              </Text>
            </Space>
            {hasTooltip ? (
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

export default OverviewCards;
