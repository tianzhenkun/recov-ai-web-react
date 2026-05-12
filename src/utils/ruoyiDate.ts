import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

export const formatRuoyiRangeTime = (
  value: unknown,
  boundary: 'start' | 'end',
) => {
  if (!value) return undefined;

  const isSupportedValue =
    typeof value === 'string' ||
    typeof value === 'number' ||
    value instanceof Date ||
    dayjs.isDayjs(value);

  if (!isSupportedValue) return undefined;

  const date = dayjs(value as string | number | Date | Dayjs);
  if (!date.isValid()) return undefined;

  return (
    boundary === 'start' ? date.startOf('day') : date.endOf('day')
  ).format('YYYY-MM-DD HH:mm:ss');
};

export const toRuoyiDateRange = (value: unknown): [string?, string?] => {
  const [beginTime, endTime] = Array.isArray(value) ? value : [];
  return [
    formatRuoyiRangeTime(beginTime, 'start'),
    formatRuoyiRangeTime(endTime, 'end'),
  ];
};
