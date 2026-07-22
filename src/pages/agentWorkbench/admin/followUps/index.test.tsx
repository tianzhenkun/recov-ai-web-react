import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.join(__dirname, 'index.tsx');

describe('follow-up administration page', () => {
  it('is query-oriented and does not expose reassignment or normal-result mutation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    for (const text of [
      '待处理',
      '客户预约待回访',
      '预约已逾期',
      '人工未接回访',
      '已完成',
      '已关闭',
      '来源类型',
      '业务场景',
      '负责人',
      '任务状态',
      '客户预约时间',
      '客户关键字',
      '来源 call_id',
      'handoff_id',
      '脱敏客户',
      '跟进原因',
      '最近联系结果',
      '客户与业务引用',
      '来源通话',
      '任务摘要',
      '历次联系尝试',
      '关联回拨通话',
      '完成或关闭信息',
      '操作审计',
    ])
      expect(source).toContain(text);
    expect(source).not.toContain('任务转交');
    expect(source).not.toContain('批量分配');
    expect(source).not.toContain('修改正常结果');
  });
});
