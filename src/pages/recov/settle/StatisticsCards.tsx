import {
  BarChartOutlined,
  FieldTimeOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { Space, Tooltip, Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import type { ServiceFeeStatistics } from '@/services/ruoyi/settle';
import { formatCompactCurrencyDisplay, formatCurrencyDisplay } from './_shared';

export type StatisticsCardType = 'unpaid' | 'currentWeek' | 'difference';

export type StatisticsCardsProps = {
  statistics: ServiceFeeStatistics;
  onCardClick: (type: StatisticsCardType) => void;
};

type MetricCard = {
  type: StatisticsCardType;
  label: string;
  value: unknown;
  icon: ReactNode;
  color: string;
  extra?: {
    label: string;
    value: unknown;
  }[];
};

const { Text } = Typography;

const cardStyles = {
  body: {
    padding: 14,
  },
};

const StatisticsCards = ({ statistics, onCardClick }: StatisticsCardsProps) => {
  const { token } = theme.useToken();

  const cards: MetricCard[] = [
    {
      type: 'unpaid',
      label: '未支付服务费',
      value: statistics.unpaidServiceFeeTotal,
      icon: <WalletOutlined />,
      color: token.colorPrimary,
    },
    {
      type: 'currentWeek',
      label: '本周服务费',
      value: statistics.currentWeekServiceFee,
      icon: <BarChartOutlined />,
      color: token.colorSuccess,
      extra: [
        {
          label: '本周回款',
          value: statistics.currentWeekRepayment,
        },
      ],
    },
    {
      type: 'difference',
      label: '对账差异',
      value: statistics.processedDifferenceAmount,
      icon: <FieldTimeOutlined />,
      color: token.colorWarning,
      extra: [
        {
          label: '服务费',
          value: statistics.processedDifferenceServiceFee,
        },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {cards.map((card) => (
        <ProCard key={card.type} size="small" styles={cardStyles}>
          <button
            type="button"
            className="flex min-h-[88px] w-full cursor-pointer flex-col justify-between gap-3 text-left"
            onClick={() => onCardClick(card.type)}
          >
            <div className="flex items-center justify-between gap-3">
              <Space align="center" size={8}>
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                  style={{
                    color: card.color,
                    backgroundColor: `${card.color}14`,
                  }}
                  aria-hidden
                >
                  {card.icon}
                </span>
                <Text
                  type="secondary"
                  style={{ fontSize: 12, lineHeight: 1.3 }}
                >
                  {card.label}
                </Text>
              </Space>
            </div>

            <Tooltip title={formatCurrencyDisplay(card.value)}>
              <Text strong style={{ fontSize: 22, lineHeight: 1.2 }}>
                {formatCompactCurrencyDisplay(card.value)}
              </Text>
            </Tooltip>

            {card.extra?.length ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {card.extra.map((item) => (
                  <Space key={item.label} size={4}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.label}
                    </Text>
                    <Tooltip title={formatCurrencyDisplay(item.value)}>
                      <Text strong style={{ fontSize: 12 }}>
                        {formatCompactCurrencyDisplay(item.value)}
                      </Text>
                    </Tooltip>
                  </Space>
                ))}
              </div>
            ) : null}
          </button>
        </ProCard>
      ))}
    </div>
  );
};

export default StatisticsCards;
