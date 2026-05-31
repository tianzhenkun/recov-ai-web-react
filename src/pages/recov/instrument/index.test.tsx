import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, 'index.tsx'), 'utf8');

describe('/instrument-list presentation conventions', () => {
  it('keeps filters and list tools in the unified recov toolbar', () => {
    expect(source).toContain('className="recov-table-toolbar"');
    expect(source).toContain("justifyContent: 'space-between'");
    expect(source).not.toContain('extra={');
  });

  it('groups toolbar business actions behind a single more menu', () => {
    const toolbarStart = source.indexOf('className="recov-table-toolbar"');
    const toolbarEnd = source.indexOf('</Form>', toolbarStart);
    const toolbarSource = source.slice(toolbarStart, toolbarEnd);

    expect(toolbarSource).toContain('<Dropdown');
    expect(toolbarSource).toContain('instrumentToolbarMenuItems');
    expect(toolbarSource).toContain('更多操作');
    expect(toolbarSource).not.toContain(
      '<Button\n                        icon={<FileDoneOutlined />}',
    );
    expect(toolbarSource).not.toContain(
      '<Button\n                        type="primary"\n                        icon={<PlusOutlined />}',
    );
    expect(toolbarSource).not.toContain(
      '<Button\n                      icon={<SyncOutlined />}',
    );
    expect(toolbarSource).not.toContain(
      '<Button\n                      icon={<RetweetOutlined />}',
    );
  });

  it('uses the stable bordered recov table style for the main list', () => {
    const rowKeyIndex = source.indexOf('rowKey={getGroupRowKey}');
    const tableStart = source.lastIndexOf('<Table', rowKeyIndex);
    const tableEnd = source.indexOf('/>', rowKeyIndex);
    const mainTableSource = source.slice(tableStart, tableEnd);

    expect(mainTableSource).toContain('bordered');
    expect(mainTableSource).toContain(
      'className="recov-stable-pagination-table"',
    );
  });

  it('avoids antd v6 deprecated props in the page', () => {
    expect(source).not.toContain('optionFilterProp=');
    expect(source).not.toContain('destroyOnClose');
    expect(source).not.toContain('addonAfter=');
    expect(source).not.toContain('message="当前内容未检测到盖章位"');
  });
});
