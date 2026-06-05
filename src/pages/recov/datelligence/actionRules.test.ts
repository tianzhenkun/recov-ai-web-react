import { resolveDebtRecordActionKeys } from './actionRules';

describe('datelligence action rules', () => {
  it('shows persona action when a running flow record has personaId', () => {
    expect(
      resolveDebtRecordActionKeys(
        {
          currentStatus: '执行中',
          flowId: 'flow-1',
          personaId: 'persona-1',
        },
        false,
      ),
    ).toEqual(['detail', 'persona', 'flow-trace']);
  });

  it('shows flow trace action when repayment is confirmed and instance exists', () => {
    expect(
      resolveDebtRecordActionKeys(
        {
          currentStatus: '已还款',
          flowId: 'flow-1',
          personaId: undefined,
        },
        false,
      ),
    ).toEqual(['detail', 'flow-trace']);
  });

  it('shows flow trace action when flow is completed and instance exists', () => {
    expect(
      resolveDebtRecordActionKeys(
        {
          currentStatus: '已完成',
          flowId: 'flow-1',
        },
        false,
      ),
    ).toEqual(['detail', 'flow-trace']);
  });

  it('does not show flow trace action when flow was never started', () => {
    expect(
      resolveDebtRecordActionKeys(
        {
          currentStatus: '未开始',
          flowId: undefined,
        },
        false,
      ),
    ).toEqual(['detail']);
  });
});
