import { ProCard } from '@ant-design/pro-components';
import { Typography } from 'antd';
import React from 'react';
import { RecovStatsStrip } from '@/pages/recov/components/RecovListLayout';
import type { LawyerCourtOverviewVO } from '@/services/ruoyi/lawyer-court';
import { formatOverviewValue, OVERVIEW_CARD_METAS } from '../_shared';

const { Text } = Typography;

const statCardStyles = {
  body: {
    padding: '16px 20px',
  },
};

const toneColorMap = {
  primary: '#4f46e5',
  info: '#8b5cf6',
  success: '#10b981',
  warning: '#f97316',
  error: '#ff4d4f',
  neutral: '#f43f5e',
} as const;

type OverviewCardsProps = {
  overview: LawyerCourtOverviewVO;
  loading?: boolean;
};

const OverviewCards = ({ overview, loading }: OverviewCardsProps) => (
  <RecovStatsStrip className="lawyer-court-overview-grid">
    {OVERVIEW_CARD_METAS.map((meta) => {
      const raw = overview[meta.key];
      const display = formatOverviewValue(raw, meta.format, meta.unit);
      const color = toneColorMap[meta.tone] || toneColorMap.primary;

      return (
        <ProCard
          key={meta.key}
          size="small"
          className="lawyer-court-stat-card"
          style={{ minWidth: 0, height: '100%' }}
          styles={statCardStyles}
        >
          <div
            aria-busy={loading || undefined}
            className="lawyer-court-stat-card-inner"
          >
            <span
              className="lawyer-court-stat-accent"
              style={{ background: color }}
            />
            <div className="lawyer-court-stat-content">
              <Text type="secondary" className="lawyer-court-stat-label">
                {meta.label}
              </Text>
              <div className="lawyer-court-stat-value" style={{ color }}>
                {display.primary}
                {display.unit ? display.unit : null}
              </div>
            </div>
          </div>
        </ProCard>
      );
    })}
  </RecovStatsStrip>
);

export default OverviewCards;
