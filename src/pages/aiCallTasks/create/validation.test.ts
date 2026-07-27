import type { AiCallRule } from '@/pages/aiCallRules/domain';
import { validateExecutionPlan } from './validation';

const rule: AiCallRule = {
  ruleId: 'rule-1',
  ruleName: '工作日规则',
  enabled: true,
  callWindows: [{ startTime: '09:00', endTime: '18:00' }],
  retryCount: 1,
  retryIntervalsMinutes: [30],
  retryableResults: ['no_answer'],
  updatedAt: '2026-07-27 10:00:00',
};

describe('task execution plan validation', () => {
  it('rejects an immediate task outside the rule windows', () => {
    expect(
      validateExecutionPlan({
        executionMode: 'immediate',
        rule,
        now: new Date('2026-07-27T20:00:00+08:00'),
      }),
    ).toBe('当前时间不在呼叫规则允许时段内');
  });

  it('requires a future scheduled time inside a rule window', () => {
    const now = new Date('2026-07-27T10:00:00+08:00');
    expect(
      validateExecutionPlan({
        executionMode: 'scheduled',
        scheduledAt: '2026-07-27 09:30:00',
        rule,
        now,
      }),
    ).toBe('计划执行时间必须晚于当前时间');
    expect(
      validateExecutionPlan({
        executionMode: 'scheduled',
        scheduledAt: '2026-07-27 20:00:00',
        rule,
        now,
      }),
    ).toBe('计划执行时间不在呼叫规则允许时段内');
    expect(
      validateExecutionPlan({
        executionMode: 'scheduled',
        scheduledAt: '2026-07-27 15:00:00',
        rule,
        now,
      }),
    ).toBeUndefined();
  });
});
