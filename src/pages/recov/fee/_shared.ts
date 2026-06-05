import type {
  AmountRangeType,
  FeeRateConfig,
  FeeTierMatrix,
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
  feeTierName: string;
  feeTier: string;
};

export const flattenFeeMatrix = (matrix: FeeTierMatrix[]): FeeTableRow[] => {
  const result: FeeTableRow[] = [];
  for (const tier of matrix) {
    for (const row of tier.rows) {
      result.push({
        ...row,
        feeTierName: tier.feeTierName,
        feeTier: tier.feeTier,
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

const FEE_TIER_DISPLAY_MAP: Record<string, string> = {
  TIER_1: '一线城市',
  TIER_2: '二线城市',
  TIER_3: '三线及以下城市',
  OTHER: '其他城市',
  一级: '一线城市',
  二级: '二线城市',
  三级: '三线及以下城市',
  其他: '其他城市',
};

export const formatFeeTierDisplay = (
  feeTier?: string,
  feeTierName?: string,
): string => {
  const tierKey = String(feeTier || '').toUpperCase();
  if (FEE_TIER_DISPLAY_MAP[tierKey]) {
    return FEE_TIER_DISPLAY_MAP[tierKey];
  }

  const name = feeTierName || feeTier || '-';
  return FEE_TIER_DISPLAY_MAP[name] ?? name;
};

export const formatOverduePeriodDisplay = (periodName?: string): string => {
  if (periodName === '涉及诉讼未结') return '涉及司法诉讼';
  return periodName || '-';
};

export const getCurrentRangeLabel = (rangeType: string): string =>
  AMOUNT_RANGES.find((item) => item.type === rangeType)?.label ?? rangeType;

export const getRowKey = (row: FeeTableRow): string =>
  `${row.feeTier}-${row.overduePeriod}`;
