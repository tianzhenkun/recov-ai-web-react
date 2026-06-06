import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, 'index.tsx'), 'utf8');
const globalStyles = readFileSync(
  join(__dirname, '../../../global.less'),
  'utf8',
);
const toolbarSource = source.slice(
  source.indexOf('<RecovTableCard className="recov-toolbar-card">'),
  source.indexOf('</RecovTableCard>'),
);
const batchModalSource = source.slice(
  source.indexOf('title="批量新增项目"'),
  source.indexOf('</Modal>', source.indexOf('title="批量新增项目"')),
);

describe('/sys/project fee tier selects', () => {
  it('uses stable popup settings so fee-tier options are not clipped in modals', () => {
    expect(source).toContain('const feeTierSelectProps');
    expect(source).toContain('getPopupContainer: () => document.body');
    expect(source).toContain('popupMatchSelectWidth: 220');
    expect(source).toContain('listHeight: 160');
    expect(source.match(/{...feeTierSelectProps}/g)).toHaveLength(2);
    expect(source).not.toContain('<Select options={FEE_TIER_OPTIONS} />');
  });
});

describe('/sys/project list layout', () => {
  it('keeps the filter card compact and lets the table own the scroll area', () => {
    expect(source).toContain('<RecovTableCard className="recov-toolbar-card">');
    expect(source).toContain('className="recov-stable-pagination-table"');
    expect(globalStyles).toContain(
      '.recov-table-card.recov-toolbar-card.ant-pro-card',
    );
  });

  it('only keeps refresh and batch-add actions in the toolbar', () => {
    expect(toolbarSource).toContain('刷新');
    expect(toolbarSource).toContain('批量新增');
    expect(toolbarSource).not.toContain('查询');
    expect(toolbarSource).not.toContain('重置');
    expect(toolbarSource).not.toContain('placeholder="项目名称"');
    expect(toolbarSource).not.toContain('placeholder="计费层级"');
    expect(toolbarSource).not.toContain('placeholder="状态"');
    expect(toolbarSource).not.toContain('openAddModal');
  });
});

describe('/sys/project batch modal', () => {
  it('hides the sort-order input from batch add rows', () => {
    expect(batchModalSource).toContain('title="批量新增项目"');
    expect(batchModalSource).toContain('placeholder="项目名称"');
    expect(batchModalSource).not.toContain('placeholder="排序"');
    expect(batchModalSource).not.toContain("name={[field.name, 'sortOrder']}");
  });
});
