import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import React from 'react';

(globalThis as typeof globalThis & { React: unknown }).React = React;

jest.mock('@/components/PdfPreview', () => () => null);

const { DeliveryStatusTag } = require('./index');
const source = readFileSync(join(__dirname, 'index.tsx'), 'utf8');

describe('DeliveryStatusTag', () => {
  const baseRecord = {
    taskId: 'delivery-status-style',
  };

  it('renders delivered and failed statuses with the same borderless tag shape', () => {
    render(
      <ConfigProvider theme={{ token: { colorPrimary: '#722ed1' } }}>
        <DeliveryStatusTag record={{ ...baseRecord, taskStatus: 2 }} />
        <DeliveryStatusTag record={{ ...baseRecord, taskStatus: 3 }} />
      </ConfigProvider>,
    );

    const deliveredTag = screen.getByText('已送达').closest('.ant-tag');
    const failedTag = screen.getByText('送达失败').closest('.ant-tag');

    expect(deliveredTag?.className).toContain('ant-tag-filled');
    expect(failedTag?.className).toContain('ant-tag-filled');
    expect((deliveredTag as HTMLElement).style.borderColor).toBe('');
  });
});

describe('/delivery failed task actions', () => {
  it('hides the sms total card from the overview stats', () => {
    expect(source).not.toContain("title: '发送短信总量'");
    expect(source).not.toContain("key: 'sms'");
    expect(source).toContain("title: '发送邮件总量'");
    expect(source).toContain('2xl:grid-cols-5');
    expect(source).not.toContain('2xl:grid-cols-6');
  });

  it('places status, delivery method, and overdue days before overdue amount', () => {
    expect(source.indexOf("title: '状态'")).toBeLessThan(
      source.indexOf("title: '逾期金额'"),
    );
    expect(source.indexOf("title: '送达方式'")).toBeLessThan(
      source.indexOf("title: '逾期金额'"),
    );
    expect(source.indexOf("title: '逾期天数'")).toBeGreaterThan(
      source.indexOf("title: '送达方式'"),
    );
    expect(source.indexOf("title: '逾期天数'")).toBeLessThan(
      source.indexOf("title: '逾期金额'"),
    );
  });

  it('renders overdue days with the document-list tag style', () => {
    const columnsStart = source.indexOf(
      'const columns = useMemo<ColumnsType<DeliveryTaskItem>>',
    );
    const columnsEnd = source.indexOf(
      'const currentIsExpressDelivery',
      columnsStart,
    );
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

    expect(overdueDaysColumnSource).toContain("title: '逾期天数'");
    expect(overdueDaysColumnSource).toContain('Tag color="red"');
    expect(overdueDaysColumnSource).toContain('toNumber(value) > 0');
  });

  it('keeps the project column compact in the delivery list', () => {
    const columnsStart = source.indexOf(
      'const columns = useMemo<ColumnsType<DeliveryTaskItem>>',
    );
    const columnsEnd = source.indexOf(
      'const currentIsExpressDelivery',
      columnsStart,
    );
    const columnsSource = source.slice(columnsStart, columnsEnd);
    const projectIndex = columnsSource.indexOf("dataIndex: 'projectName'");
    const projectColumnStart = columnsSource.lastIndexOf('    {', projectIndex);
    const projectColumnEnd = columnsSource.indexOf('\n      {', projectIndex);
    const projectColumnSource = columnsSource.slice(
      projectColumnStart,
      projectColumnEnd,
    );

    expect(projectColumnSource).toContain(
      'width: RECOV_LIST_COLUMN_WIDTH.organization',
    );
    expect(projectColumnSource).not.toContain('width: 260');
  });

  it('keeps recipient contact out of the list and inside the detail drawer', () => {
    const columnsStart = source.indexOf(
      'const columns = useMemo<ColumnsType<DeliveryTaskItem>>',
    );
    const columnsEnd = source.indexOf(
      'const currentIsExpressDelivery',
      columnsStart,
    );
    const columnsSource = source.slice(columnsStart, columnsEnd);
    const drawerStart = source.indexOf('title="送达详情"');
    const drawerEnd = source.indexOf('</Drawer>', drawerStart);
    const drawerSource = source.slice(drawerStart, drawerEnd);

    expect(columnsSource).not.toContain("title: '电话'");
    expect(columnsSource).not.toContain("dataIndex: 'debtorPhone'");
    expect(drawerSource).toContain('label="电话"');
    expect(drawerSource).toContain('currentRow.debtorPhone');
    expect(drawerSource).toContain('label="邮件"');
    expect(drawerSource).toContain('currentRow.debtorEmail');
  });

  it('keeps the action column compact for at most two icon actions', () => {
    const columnsStart = source.indexOf(
      'const columns = useMemo<ColumnsType<DeliveryTaskItem>>',
    );
    const columnsEnd = source.indexOf(
      'const currentIsExpressDelivery',
      columnsStart,
    );
    const columnsSource = source.slice(columnsStart, columnsEnd);
    const actionIndex = columnsSource.indexOf("key: 'action'");
    const actionColumnStart = columnsSource.lastIndexOf('      {', actionIndex);
    const actionColumnEnd = columnsSource.indexOf('\n      },', actionIndex);
    const actionColumnSource = columnsSource.slice(
      actionColumnStart,
      actionColumnEnd,
    );

    expect(actionColumnSource).toContain('width: 96');
    expect(actionColumnSource).toContain('maxVisible={2}');
    expect(actionColumnSource).not.toContain('width: 156');
  });

  it('keeps retry as an independent row action instead of inside the detail drawer', () => {
    const columnsStart = source.indexOf(
      'const columns = useMemo<ColumnsType<DeliveryTaskItem>>',
    );
    const columnsEnd = source.indexOf(
      'const currentIsExpressDelivery',
      columnsStart,
    );
    const columnsSource = source.slice(columnsStart, columnsEnd);
    const drawerStart = source.indexOf('<Drawer');
    const drawerEnd = source.indexOf('</Drawer>', drawerStart);
    const drawerSource = source.slice(drawerStart, drawerEnd);

    expect(source).toContain('retryDeliveryTask');
    expect(columnsSource).toContain("key: 'retry'");
    expect(columnsSource).toContain("label: '重试'");
    expect(columnsSource).toContain('normalizeStatus(record.taskStatus) === 3');
    expect(columnsSource).toContain('retryTask(record)');
    expect(drawerSource).toContain('footer={null}');
    expect(drawerSource).not.toContain('retryTask(currentRow)');
    expect(source).not.toContain("'处理异常'");
    expect(source).not.toContain("'查看进度'");
  });

  it('keeps failure details in the detail drawer and status tooltip', () => {
    const panelStart = source.indexOf('const DeliveryExceptionPanel =');
    const panelEnd = source.indexOf('const DeliveryPage =', panelStart);
    const panelSource = source.slice(panelStart, panelEnd);

    expect(source).toContain('DeliveryExceptionPanel');
    expect(panelSource).toContain('title="失败原因"');
    expect(panelSource).not.toContain('title="异常明细"');
    expect(panelSource).not.toContain('DetailSubsection title="失败原因"');
    expect(source).toContain('getDeliveryErrorMessage(record)');
    expect(source).toContain('debt_record.debtor_email');
    expect(source).toContain('缺少收件人邮箱，请维护业主邮箱后重试');
    expect(panelSource).not.toContain('服务商响应');
    expect(panelSource).not.toContain('providerResponse');
  });

  it('does not render successful provider responses as exception details', () => {
    expect(source).toContain('const shouldShowDeliveryException =');
    expect(source).toContain('normalizeStatus(record.taskStatus) === 3');
    expect(source).toContain('if (!shouldShowDeliveryException) return null;');
  });
});
