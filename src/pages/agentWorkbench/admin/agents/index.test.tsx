import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.join(__dirname, 'index.tsx');

describe('agent administration page', () => {
  it('contains the required metrics, filters, columns and guarded actions', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    for (const text of [
      '已启用',
      '当前在线',
      '当前空闲',
      '通话中',
      '异常占用',
      '用户姓名或账号',
      '启用状态',
      '运行状态',
      '业务场景',
      '坐席',
      '可接场景',
      '当前通话',
      '最近心跳',
      '添加坐席',
      '编辑坐席',
      '强制释放',
    ])
      expect(source).toContain(text);
    expect(source).toContain('releaseStaleAgent');
    expect(source).toContain('Modal.confirm');
    expect(source).not.toContain('最大并发');
    expect(source).not.toContain('编辑手机号');
  });
});
