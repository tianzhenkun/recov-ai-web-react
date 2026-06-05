import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, 'index.tsx'), 'utf8');

describe('/datelligence import detail drawer presentation', () => {
  it('keeps stage failure details but removes the duplicate root error detail card', () => {
    expect(source).toContain('failureDetailActionText');
    expect(source).toContain("assetParse: '查看明细'");
    expect(source).toContain('task.errorMessage');
    expect(source).not.toContain('message="错误明细"');
    expect(source).not.toContain('hasPipelineRootErrorDetail');
    expect(source).not.toContain('pipelineErrorMessage');
  });

  it('uses the weighted aging metric label in overview stats', () => {
    expect(source).toContain("title: '加权平均账期'");
    expect(source).not.toContain("title: '平均账期'");
  });

  it('shows emergency contact fields in owner detail modal', () => {
    expect(source).toContain("label: '紧急联系人'");
    expect(source).toContain('detailData.emergencyContact');
    expect(source).toContain("label: '紧急联系人电话'");
    expect(source).toContain('detailData.emergencyContactPhone');
  });

  it('renders overdue days with the same emphasis style as document lists', () => {
    const columnsStart = source.indexOf(
      'const columns = useMemo<ColumnsType<DebtRecordItem>>',
    );
    const columnsEnd = source.indexOf('const rowSelection', columnsStart);
    const columnsSource = source.slice(columnsStart, columnsEnd);
    const overdueDaysIndex = columnsSource.indexOf("dataIndex: 'overdueDays'");
    const overdueDaysColumnStart = columnsSource.lastIndexOf(
      '      {',
      overdueDaysIndex,
    );
    const overdueDaysColumnEnd = columnsSource.indexOf(
      '\n      {',
      overdueDaysIndex,
    );
    const overdueDaysColumnSource = columnsSource.slice(
      overdueDaysColumnStart,
      overdueDaysColumnEnd,
    );

    expect(overdueDaysColumnSource).toContain('Tag color="red"');
    expect(overdueDaysColumnSource).toContain('toNumber(value) > 0');
  });
});
