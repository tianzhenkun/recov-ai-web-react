import type { TimeConfigVo } from '@/services/ruoyi/runtime';

export const PAGE_TITLE = '运营时间设置';
export const PAGE_SUB_TITLE = '配置智能体外呼工作时间段与假日策略';

export const DEFAULT_TIME_FORM: TimeConfigVo = {
  timeEnabled: '1',
  startTime: '09:00',
  endTime: '20:00',
  holidayPolicy: '0',
};

export type TimeConfigSnapshot = Pick<
  TimeConfigVo,
  'timeEnabled' | 'startTime' | 'endTime' | 'holidayPolicy'
>;

export const getTimeConfigSnapshot = (
  form: TimeConfigVo,
): TimeConfigSnapshot => ({
  timeEnabled: form.timeEnabled,
  startTime: form.startTime || '',
  endTime: form.endTime || '',
  holidayPolicy: form.holidayPolicy || '0',
});

export const isTimeConfigDirty = (
  saved: TimeConfigSnapshot | null,
  current: TimeConfigSnapshot,
): boolean => {
  if (!saved) return false;
  return (
    current.timeEnabled !== saved.timeEnabled ||
    current.startTime !== saved.startTime ||
    current.endTime !== saved.endTime ||
    current.holidayPolicy !== saved.holidayPolicy
  );
};

const STATUS_COLORS: Record<string, string> = {
  正常运行: '#22c55e',
  非运营时间: '#f59e0b',
  停止所有: '#ef4444',
  仅停止外呼: '#f97316',
};

export const getRunningStatusColor = (status: string): string =>
  STATUS_COLORS[status] ?? 'inherit';

export const HOLIDAY_POLICY_OPTIONS = [
  { label: '正常运行', value: '0' },
  { label: '停止所有', value: '1' },
  { label: '执行外呼外工作', value: '2' },
] as const;
