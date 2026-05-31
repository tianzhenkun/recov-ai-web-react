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
});
