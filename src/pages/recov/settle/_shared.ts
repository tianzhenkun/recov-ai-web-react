export const PAGE_TITLE = '服务费结算';

export const DEFAULT_PAGE_SIZE = 10;

export const SETTLEMENT_STATUS_OPTIONS = [
  { label: '待缴费', value: '0' },
  { label: '部分缴费', value: '1' },
  { label: '已缴费', value: '2' },
] as const;

export type SettleActiveView = 'settlement' | 'currentWeek' | 'difference';

export type SettlementStatusTag = {
  color: 'default' | 'warning' | 'success';
};

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
});

export const toNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatAmount = (value: unknown): string =>
  currencyFormatter.format(toNumber(value));

export const formatCurrencyDisplay = (value: unknown): string =>
  `¥${formatAmount(value)}`;

export const formatCompactCurrencyDisplay = (value: unknown): string => {
  const amount = toNumber(value);
  const absAmount = Math.abs(amount);

  if (absAmount >= 100000000) {
    return `¥${compactCurrencyFormatter.format(amount / 100000000)}亿`;
  }

  if (absAmount >= 10000) {
    return `¥${compactCurrencyFormatter.format(amount / 10000)}万`;
  }

  return formatCurrencyDisplay(amount);
};

export const getSettlementStatusTag = (status: string): SettlementStatusTag => {
  switch (status) {
    case '0':
      return { color: 'default' };
    case '1':
      return { color: 'warning' };
    case '2':
      return { color: 'success' };
    default:
      return { color: 'default' };
  }
};

export const buildRangeText = (
  pageNum: number,
  pageSize: number,
  total: number,
): string => {
  if (total <= 0) return '暂无数据';
  const start = (pageNum - 1) * pageSize + 1;
  const end = Math.min(pageNum * pageSize, total);
  return `显示 ${start} 到 ${end} 条，共 ${total} 条`;
};
