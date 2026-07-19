import { resolveDebtListStatusDisplay } from './statusDisplay';

describe('datelligence debt list status display', () => {
  it('collapses internal running states into processing for the debt list', () => {
    expect(resolveDebtListStatusDisplay('发起中')).toMatchObject({
      text: '处理中',
      rawText: '发起中',
    });
    expect(resolveDebtListStatusDisplay('已发起')).toMatchObject({
      text: '处理中',
      rawText: '已发起',
    });
    expect(resolveDebtListStatusDisplay('待触发')).toMatchObject({
      text: '处理中',
      rawText: '待触发',
    });
    expect(resolveDebtListStatusDisplay('执行中')).toMatchObject({
      text: '处理中',
      rawText: '执行中',
    });
  });

  it('collapses failure and stopped states into business-facing labels', () => {
    expect(resolveDebtListStatusDisplay('节点失败')).toMatchObject({
      text: '流程异常',
      rawText: '节点失败',
    });
    expect(resolveDebtListStatusDisplay('发起失败')).toMatchObject({
      text: '流程异常',
      rawText: '发起失败',
    });
    expect(resolveDebtListStatusDisplay('人工终止')).toMatchObject({
      text: '已终止',
      rawText: '人工终止',
    });
    expect(resolveDebtListStatusDisplay('条件不满足终止')).toMatchObject({
      text: '已终止',
      rawText: '条件不满足终止',
    });
  });

  it('keeps stable user-facing terminal states readable', () => {
    expect(resolveDebtListStatusDisplay('未开始')).toMatchObject({
      text: '未开始',
      rawText: '未开始',
    });
    expect(resolveDebtListStatusDisplay('已完成')).toMatchObject({
      text: '已完成',
      rawText: '已完成',
    });
    expect(resolveDebtListStatusDisplay('已还款终止')).toMatchObject({
      text: '已还款',
      rawText: '已还款终止',
    });
  });
});
