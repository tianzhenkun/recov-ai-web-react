import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.join(__dirname, 'index.tsx');

describe('handoff administration page', () => {
  it('covers diagnostics metrics, filters, detail order and abnormal-only reconciliation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    for (const text of [
      '请求数',
      '60 秒内接通率',
      '平均等待时间',
      '等待超时数',
      '媒体接入失败数',
      '时间范围',
      '业务场景',
      '转人工状态',
      '接听坐席',
      '客户关键字',
      'call_id',
      '请求时间',
      '脱敏客户',
      '转人工原因',
      '等待时长',
      '最终结果',
      '基本信息',
      '状态时间线',
      'AI 交接摘要与待处理事项',
      '三方对话',
      '录音状态',
      '快速话后结果',
      '关联跟进任务',
      '模型与话术配置',
      '重新补偿',
    ])
      expect(source).toContain(text);
    expect(source).toContain('failure_stage');
    expect(source).toContain('reconcileAdminHandoff');
    expect(source).not.toContain('修改正常结果');
  });
});
