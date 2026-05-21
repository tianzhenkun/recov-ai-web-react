import type { TimeConfigVo } from '@/services/ruoyi/runtime';

export const PAGE_TITLE = '运营时间设置';

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

export const HOLIDAY_POLICY_OPTIONS = [
  { label: '正常运行', value: '0' },
  { label: '停止所有', value: '1' },
  { label: '仅停止外呼', value: '2' },
] as const;
