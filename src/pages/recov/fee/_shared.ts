import type {
  AmountRangeType,
  CityTierMatrix,
  FeeRateConfig,
  OverduePeriodRow,
} from '@/services/ruoyi/fee';

export const PAGE_TITLE = '当前费率配置表';

export const AMOUNT_RANGES: {
  type: AmountRangeType;
  label: string;
  switchLabel: string;
}[] = [
  { type: 'LT_30M', label: '3千万以下', switchLabel: '3千万以下' },
  {
    type: 'M30M_100M',
    label: '3千万(含) -1亿',
    switchLabel: '3千万-1亿',
  },
  {
    type: 'GTE_100M',
    label: '1亿(含) 及以上',
    switchLabel: '1亿及以上',
  },
];

export type FeeTableRow = OverduePeriodRow & {
  tierName: string;
  cityTier: string;
};

export const flattenFeeMatrix = (matrix: CityTierMatrix[]): FeeTableRow[] => {
  const result: FeeTableRow[] = [];
  for (const city of matrix) {
    for (const row of city.rows) {
      result.push({
        ...row,
        tierName: city.tierName,
        cityTier: city.cityTier,
      });
    }
  }
  return result;
};

export const getFeeRate = (
  row: OverduePeriodRow,
  rangeType: string,
): number => {
  const rateConfig = row.rates[rangeType] as FeeRateConfig | undefined;
  return rateConfig?.feeRate ?? 0;
};

export const formatFeeRate = (value: number): string =>
  `${Number(value || 0).toFixed(2)}%`;

export const getCurrentRangeLabel = (rangeType: string): string =>
  AMOUNT_RANGES.find((item) => item.type === rangeType)?.label ?? rangeType;

export const getRowKey = (row: FeeTableRow): string =>
  `${row.cityTier}-${row.overduePeriod}`;
