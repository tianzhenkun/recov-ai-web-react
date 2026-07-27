import dayjs from 'dayjs';
import type { AiCallRule } from '@/pages/aiCallRules/domain';
import type { ExecutionMode } from '../domain';

type ExecutionPlan = {
  executionMode: ExecutionMode;
  scheduledAt?: string;
  rule: AiCallRule;
  now?: Date;
};

const isAllowedTime = (time: string, rule: AiCallRule) =>
  rule.callWindows.some(
    (window) => time >= window.startTime && time < window.endTime,
  );

export const validateExecutionPlan = ({
  executionMode,
  scheduledAt,
  rule,
  now = new Date(),
}: ExecutionPlan): string | undefined => {
  if (!rule.enabled) return '呼叫规则已停用';

  const nowValue = dayjs(now);
  if (executionMode === 'immediate') {
    return isAllowedTime(nowValue.format('HH:mm'), rule)
      ? undefined
      : '当前时间不在呼叫规则允许时段内';
  }

  if (!scheduledAt) return '请选择计划执行时间';
  const scheduledValue = dayjs(scheduledAt);
  if (!scheduledValue.isValid()) return '计划执行时间无效';
  if (!scheduledValue.isAfter(nowValue)) {
    return '计划执行时间必须晚于当前时间';
  }
  return isAllowedTime(scheduledValue.format('HH:mm'), rule)
    ? undefined
    : '计划执行时间不在呼叫规则允许时段内';
};
