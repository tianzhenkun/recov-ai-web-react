import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import {
  getFlowEventPage,
  markAllFlowEventsRead,
  normalizeFlowEventPageResult,
} from '@/services/ruoyi/flowEvent';
import FlowEventCenter from './FlowEventCenter';

jest.mock('@/pages/recov/flow/components/FlowWorkbench', () => ({
  __esModule: true,
  default: (props: { mode?: string }) => (
    <div data-mode={props.mode} data-testid="flow-workbench">
      流程管理内容
    </div>
  ),
}));

jest.mock('@/services/ruoyi/flowEvent', () => ({
  buildFlowEventDisplaySummary: jest.fn(
    (event) => event.eventContent || event.eventTitle || '流程事件已更新。',
  ),
  getFlowEventPage: jest.fn(),
  markAllFlowEventsRead: jest.fn(),
  normalizeFlowEventPageResult: jest.fn(),
}));

const getFlowEventPageMock = getFlowEventPage as jest.Mock;
const markAllFlowEventsReadMock = markAllFlowEventsRead as jest.Mock;
const normalizeFlowEventPageResultMock =
  normalizeFlowEventPageResult as jest.Mock;

describe('FlowEventCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getFlowEventPageMock.mockResolvedValue({ data: {} });
    markAllFlowEventsReadMock.mockResolvedValue({});
    normalizeFlowEventPageResultMock.mockReturnValue({
      rows: [
        {
          id: 'event-1',
          eventTitle: '律师函执行失败',
          eventScope: 'node',
          eventType: 'node_failed',
          nodeName: '律师函',
          eventContent: '律师函执行失败，请检查印章配置。',
          debtNumber: '1',
          createTime: '2026-06-01 00:15:48',
          read: false,
        },
      ],
      total: 40,
    });
  });

  it('uses tabs without the top statistic cards', async () => {
    render(<FlowEventCenter />);

    expect(await screen.findByText('律师函执行失败')).toBeTruthy();

    expect(screen.queryByText('事件总数')).toBeNull();
    expect(screen.queryByText('当前页条数')).toBeNull();
    expect(screen.queryByText('节点事件')).toBeNull();
    expect(screen.getByRole('tab', { name: '流程事件列表' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: '流程管理' })).toBeTruthy();
  });

  it('uses the standard recov list layout for the event list', async () => {
    render(<FlowEventCenter />);

    expect(await screen.findByText('律师函执行失败')).toBeTruthy();

    expect(document.querySelector('.recov-table-card')).toBeTruthy();
    expect(document.querySelector('.recov-table-toolbar')).toBeTruthy();
    expect(
      document.querySelector('.recov-stable-pagination-table'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /刷新/ })).toBeTruthy();
    expect(screen.queryByText('当前按数据权限展示全部流程事件。')).toBeNull();
  });

  it('lets the tab pane participate in the list-page flex layout', () => {
    const globalStyles = readFileSync(
      join(process.cwd(), 'src/global.less'),
      'utf8',
    );

    const tabPaneRule = globalStyles.match(
      /\.flow-event-center-tabs\.ant-tabs[\s\S]+?> \.ant-tabs-tabpane \{([\s\S]*?)\}/,
    )?.[1];

    expect(tabPaneRule).toContain('display: flex;');
    expect(tabPaneRule).toContain('flex-direction: column;');
  });

  it('embeds flow manager as the second entry', async () => {
    render(<FlowEventCenter />);

    expect(await screen.findByText('律师函执行失败')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: '流程管理' }));

    await waitFor(() => {
      expect(screen.getByTestId('flow-workbench')).toBeTruthy();
    });
    expect(screen.getByTestId('flow-workbench').getAttribute('data-mode')).toBe(
      'embedded',
    );
  });
});
