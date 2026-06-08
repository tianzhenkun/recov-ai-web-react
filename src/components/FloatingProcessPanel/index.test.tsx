import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import FloatingProcessPanel, {
  type FlowProcessItem,
  floatingProcessPanelMetrics,
  formatTimelineTime,
  resolveAnchoredPanelTop,
  resolveDockedLeft,
  resolveDockedTop,
  resolveDockSide,
  resolveExpandedDockLeft,
  resolveFloatingLeft,
} from './index';

const items: FlowProcessItem[] = [
  {
    id: '1',
    title: '刚刚',
    summary: 'AI 正在处理 32 号账户的催收任务。',
    time: '2026-05-30T10:00:00.000Z',
    status: 'running',
    channel: 'message',
  },
  {
    id: '2',
    title: '1 分钟前',
    summary: 'AI 已生成 10 号账户的跟进建议。',
    time: '2026-05-30T09:59:00.000Z',
    status: 'waiting',
    channel: 'phone',
  },
];

describe('FloatingProcessPanel', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 720,
    });
  });

  it('renders collapsed summary by default and expands on toggle', () => {
    render(<FloatingProcessPanel items={items} title="流程动态" />);

    expect(screen.getByText('流程动态')).toBeTruthy();
    expect(screen.queryByText('查看全量运行日志')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '展开流程信息面板' }));

    expect(screen.getByText('查看全量运行日志')).toBeTruthy();
    expect(screen.getByText('AI 正在处理 32 号账户的催收任务。')).toBeTruthy();
    expect(screen.getByText('AI 已生成 10 号账户的跟进建议。')).toBeTruthy();
  });

  it('uses compact agent header copy by default', () => {
    render(<FloatingProcessPanel items={items} />);

    expect(screen.getByText('智能体动态')).toBeTruthy();
    expect(screen.queryByText('AI 智能体动态')).toBeNull();
    expect(screen.queryByText('实时运行中')).toBeNull();
  });

  it('keeps expanded size unchanged while making the collapsed panel smaller', () => {
    expect(floatingProcessPanelMetrics.expandedWidth).toBe(360);
    expect(floatingProcessPanelMetrics.collapsedWidth).toBe(196);
    expect(floatingProcessPanelMetrics.collapsedHeight).toBe(52);
    expect(floatingProcessPanelMetrics.dockedCollapsedWidth).toBe(48);
    expect(floatingProcessPanelMetrics.dockedCollapsedHeight).toBe(48);
  });

  it('calls onViewAllLogs when footer button is clicked', () => {
    const onViewAllLogs = jest.fn();

    render(
      <FloatingProcessPanel
        defaultExpanded
        items={items}
        onViewAllLogs={onViewAllLogs}
      />,
    );

    const footerButton = screen.getByRole('button', {
      name: '查看全量运行日志',
    });

    expect(footerButton.className).toContain('ant-btn-sm');

    fireEvent.click(footerButton);

    expect(onViewAllLogs).toHaveBeenCalledTimes(1);
  });

  it('shows an empty hint and hides all logs button when there are no items', () => {
    render(
      <FloatingProcessPanel
        defaultExpanded
        emptyText="暂无流程动态"
        items={[]}
        title="流程动态"
      />,
    );

    expect(screen.getByText('暂无流程动态')).toBeTruthy();
    expect(screen.getByText('当前暂无可展示的流程事件')).toBeTruthy();
    expect(screen.queryByText('查看全量运行日志')).toBeNull();
  });

  it('shows loading hint before empty result resolves', () => {
    render(
      <FloatingProcessPanel
        defaultExpanded
        items={[]}
        loading
        title="流程动态"
      />,
    );

    expect(screen.getByText('正在加载流程动态')).toBeTruthy();
    expect(screen.getByText('请稍候')).toBeTruthy();
    expect(screen.queryByText('查看全量运行日志')).toBeNull();
  });

  it('shows loading state even when old items still exist', () => {
    render(
      <FloatingProcessPanel
        defaultExpanded
        items={items}
        loading
        title="流程动态"
      />,
    );

    expect(screen.getByText('正在加载流程动态')).toBeTruthy();
    expect(screen.queryByText('AI 正在处理 32 号账户的催收任务。')).toBeNull();
    expect(screen.queryByText('查看全量运行日志')).toBeNull();
  });

  it('formats recent timeline time as just now within one minute', () => {
    const now = dayjs('2026-05-30T10:01:20.000Z');

    expect(formatTimelineTime('2026-05-30T10:00:45.000Z', now)).toBe('刚刚');
    expect(formatTimelineTime('2026-05-30T10:00:10.000Z', now)).toBe('1分钟前');
    expect(formatTimelineTime('2026-05-30T08:01:20.000Z', now)).toBe('2小时前');
    expect(formatTimelineTime('2026-05-28T10:01:20.000Z', now)).toBe('2天前');
  });

  it('notifies when expanded state changes', () => {
    const onExpandedChange = jest.fn();

    render(
      <FloatingProcessPanel
        items={items}
        title="流程动态"
        onExpandedChange={onExpandedChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '展开流程信息面板' }));

    expect(onExpandedChange).toHaveBeenLastCalledWith(true);
  });

  it('does not render an extra drag button', () => {
    render(
      <FloatingProcessPanel defaultExpanded items={items} title="流程动态" />,
    );

    expect(
      screen.queryByRole('button', { name: '拖拽流程信息面板' }),
    ).toBeNull();
  });

  it('shows unread dot only for unseen dynamics', () => {
    const { rerender } = render(
      <FloatingProcessPanel items={items} title="流程动态" />,
    );

    expect(screen.getByTestId('floating-process-unread-dot')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '展开流程信息面板' }));

    expect(screen.queryByTestId('floating-process-unread-dot')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '收起流程信息面板' }));

    expect(screen.queryByTestId('floating-process-unread-dot')).toBeNull();

    rerender(
      <FloatingProcessPanel
        items={[
          {
            id: '3',
            title: '刚刚',
            summary: 'AI 刚刚生成了一条新的待查看动态。',
            time: '2026-05-30T10:01:00.000Z',
            status: 'running',
            channel: 'system',
          },
          ...items,
        ]}
        title="流程动态"
      />,
    );

    expect(screen.getByTestId('floating-process-unread-dot')).toBeTruthy();
  });

  it('keeps fixed header icon colors regardless of the active theme color', () => {
    render(
      <ConfigProvider theme={{ token: { colorPrimary: '#f5222d' } }}>
        <FloatingProcessPanel items={items} title="流程动态" />
      </ConfigProvider>,
    );

    const badge = screen.getByLabelText('robot').parentElement as HTMLElement;

    expect(badge.style.color).toBe('rgb(125, 132, 255)');
    expect(badge.style.backgroundColor).toBe('rgba(93, 101, 255, 0.2)');
  });

  it('opens upward from the collapsed anchor when there is not enough space below', async () => {
    const heightSpy = jest
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockImplementation(function getOffsetHeight(this: HTMLElement) {
        return this.textContent?.includes('查看全量运行日志') ? 260 : 48;
      });
    const widthSpy = jest
      .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockImplementation(function getOffsetWidth(this: HTMLElement) {
        return this.textContent?.includes('查看全量运行日志') ? 336 : 236;
      });

    try {
      render(<FloatingProcessPanel items={items} title="流程动态" />);

      const root = await waitFor(() => {
        const element = Array.from(
          document.querySelectorAll<HTMLElement>('div'),
        ).find((node) => node.style.left && node.style.top);
        expect(element).toBeTruthy();
        return element as HTMLElement;
      });

      await waitFor(() => {
        expect(root.style.top).toBe('616px');
      });

      fireEvent.click(screen.getByRole('button', { name: '展开流程信息面板' }));

      await waitFor(() => {
        expect(Number.parseInt(root.style.top, 10)).toBeLessThan(616);
      });

      fireEvent.click(screen.getByRole('button', { name: '收起流程信息面板' }));

      await waitFor(() => {
        expect(root.style.top).toBe('616px');
      });
    } finally {
      heightSpy.mockRestore();
      widthSpy.mockRestore();
    }
  });

  it('repositions upward when async content makes the expanded panel taller', async () => {
    const loadedItems = Array.from({ length: 6 }, (_, index) => ({
      ...items[index % items.length],
      id: `loaded-${index}`,
      title: `动态 ${index + 1}`,
      summary: `第 ${index + 1} 条流程动态内容加载后撑高面板。`,
    }));
    const heightSpy = jest
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockImplementation(function getOffsetHeight(this: HTMLElement) {
        if (this.textContent?.includes('查看全量运行日志')) return 560;
        if (this.textContent?.includes('正在加载流程动态')) return 160;
        return 48;
      });
    const widthSpy = jest
      .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockImplementation(function getOffsetWidth(this: HTMLElement) {
        return this.textContent?.includes('智能体动态') ? 336 : 236;
      });

    try {
      const { rerender } = render(
        <FloatingProcessPanel items={[]} loading title="流程动态" />,
      );

      const root = await waitFor(() => {
        const element = Array.from(
          document.querySelectorAll<HTMLElement>('div'),
        ).find((node) => node.style.left && node.style.top);
        expect(element).toBeTruthy();
        return element as HTMLElement;
      });

      fireEvent.click(screen.getByRole('button', { name: '展开流程信息面板' }));

      await waitFor(() => {
        expect(root.style.top).toBe('504px');
      });

      rerender(<FloatingProcessPanel items={loadedItems} title="流程动态" />);

      await waitFor(() => {
        expect(root.style.top).toBe('104px');
      });
    } finally {
      heightSpy.mockRestore();
      widthSpy.mockRestore();
    }
  });

  it('uses controlled unread state when provided', () => {
    const { rerender } = render(
      <FloatingProcessPanel hasUnread={false} items={items} title="流程动态" />,
    );

    expect(screen.queryByTestId('floating-process-unread-dot')).toBeNull();

    rerender(<FloatingProcessPanel hasUnread items={items} title="流程动态" />);

    expect(screen.getByTestId('floating-process-unread-dot')).toBeTruthy();
  });

  it('shows controlled unread dot only on the collapsed agent icon', () => {
    render(
      <FloatingProcessPanel
        defaultExpanded
        hasUnread
        items={items}
        title="流程动态"
      />,
    );

    expect(screen.queryByTestId('floating-process-unread-dot')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '收起流程信息面板' }));

    expect(screen.getByTestId('floating-process-unread-dot')).toBeTruthy();
  });

  it('marks unread timeline items with red dots', () => {
    render(
      <FloatingProcessPanel
        defaultExpanded
        items={[
          { ...items[0], read: false },
          { ...items[1], read: true },
        ]}
        title="流程动态"
      />,
    );

    const unreadDot = screen.getByTestId('floating-process-item-unread-dot');

    expect(unreadDot).toBeTruthy();
    expect(window.getComputedStyle(unreadDot).width).toBe('5px');
    expect(window.getComputedStyle(unreadDot).height).toBe('5px');
  });

  it('renders compact rows while keeping time above the summary', () => {
    const now = dayjs();
    render(
      <FloatingProcessPanel
        defaultExpanded
        items={[
          {
            ...items[0],
            iconKind: 'litigation',
            summary: '发送申请诉讼截图已开始执行。',
            time: now.subtract(2, 'minute').toISOString(),
          },
          {
            ...items[1],
            iconKind: 'law-letter',
            summary: '律师函已生成。',
          },
        ]}
        title="流程动态"
      />,
    );

    expect(screen.getByLabelText('file-image')).toBeTruthy();
    expect(screen.getByLabelText('file-pdf')).toBeTruthy();
    expect(screen.getByText('发送申请诉讼截图已开始执行。')).toBeTruthy();

    const firstItem = screen.getByRole('button', {
      name: '查看动态详情：发送申请诉讼截图已开始执行。',
    });
    expect(
      firstItem.firstElementChild?.querySelector('[aria-label="file-image"]'),
    ).toBeTruthy();
    expect(
      firstItem.querySelector('[data-testid="floating-process-item-tail"]'),
    ).toBeNull();
    expect(firstItem.children[1]?.firstElementChild?.textContent).toBe(
      '2分钟前',
    );
    expect(firstItem.children[1]?.lastElementChild?.textContent).toBe(
      '发送申请诉讼截图已开始执行。',
    );
  });

  it('shows a small error marker without replacing the business icon for failed events', () => {
    render(
      <FloatingProcessPanel
        defaultExpanded
        items={[
          {
            ...items[0],
            iconKind: 'law-letter',
            status: 'warning',
            summary: '律师函发送失败。',
          },
        ]}
        title="流程动态"
      />,
    );

    const icon = screen.getByLabelText('file-pdf').parentElement as HTMLElement;

    expect(icon).toBeTruthy();
    expect(icon.style.color).toBe('rgba(255, 255, 255, 0.62)');
    expect(icon.style.backgroundColor).toBe('rgba(255, 255, 255, 0.06)');
    const marker = screen.getByTestId('floating-process-error-marker');

    expect(marker.previousElementSibling?.textContent).toBe(
      formatTimelineTime(items[0].time),
    );
    expect(marker.querySelector('.anticon-exclamation-circle')).toBeTruthy();
  });

  it('opens a lightweight detail view when clicking a timeline item', () => {
    const eventTime = '2026-05-30T10:00:00+08:00';
    const expectedDetailTime = dayjs(eventTime).format('YYYY-MM-DD HH:mm:ss');

    render(
      <FloatingProcessPanel
        defaultExpanded
        items={[
          {
            ...items[0],
            detail: {
              debtNumber: 'A-001',
              eventType: 'node_failed',
              eventContent: '系统已记录失败原因，等待补充地址后重试。',
              instanceId: 'FLOW-001',
              nodeName: '律师函',
              reasonText: '收件地址缺失',
              taskId: 'TASK-001',
            },
            iconKind: 'law-letter',
            status: 'warning',
            summary: '律师函发送失败。',
            time: eventTime,
          },
        ]}
        title="流程动态"
      />,
    );

    fireEvent.click(screen.getByText('律师函发送失败。'));

    expect(screen.getByText('智能体动态详情')).toBeTruthy();
    expect(screen.getByText('事件摘要')).toBeTruthy();
    expect(screen.getAllByText('律师函发送失败。').length).toBeGreaterThan(0);
    expect(screen.getByText('发生时间')).toBeTruthy();
    expect(screen.getByText(expectedDetailTime)).toBeTruthy();
    expect(screen.queryByText(`${expectedDetailTime} ·`)).toBeNull();
    expect(screen.getByText('失败原因')).toBeTruthy();
    expect(screen.getByText('收件地址缺失')).toBeTruthy();
    expect(screen.getByText('资产编号')).toBeTruthy();
    expect(screen.getByText('A-001')).toBeTruthy();
    expect(screen.getByText('详细说明')).toBeTruthy();
    expect(
      screen.getByText('系统已记录失败原因，等待补充地址后重试。'),
    ).toBeTruthy();
    expect(screen.queryByText('事件类型')).toBeNull();
    expect(screen.queryByText('node_failed')).toBeNull();
    expect(screen.queryByText('流程实例 ID')).toBeNull();
    expect(screen.queryByText('FLOW-001')).toBeNull();
    expect(screen.queryByText('任务 ID')).toBeNull();
    expect(screen.queryByText('TASK-001')).toBeNull();

    const drawerWrapper = document.querySelector<HTMLElement>(
      '.ant-drawer-content-wrapper',
    );

    expect(drawerWrapper?.style.width).toBe('560px');
  });

  it('keeps the process panel expanded after closing the detail drawer', async () => {
    render(
      <FloatingProcessPanel
        defaultExpanded
        items={[
          {
            ...items[0],
            detail: {
              debtNumber: 'A-001',
              eventContent: '系统已记录失败原因，等待补充地址后重试。',
              nodeName: '律师函',
              reasonText: '收件地址缺失',
            },
            summary: '律师函发送失败。',
            time: '2026-05-30T10:00:00+08:00',
          },
        ]}
        title="流程动态"
      />,
    );

    fireEvent.click(screen.getByText('律师函发送失败。'));
    expect(screen.getByText('智能体动态详情')).toBeTruthy();
    expect(screen.getByText('查看全量运行日志')).toBeTruthy();

    const closeButton =
      document.querySelector<HTMLElement>('.ant-drawer-close');
    expect(closeButton).toBeTruthy();

    fireEvent.pointerDown(closeButton as HTMLElement);
    fireEvent.click(closeButton as HTMLElement);

    await waitFor(() => {
      expect(screen.queryByText('智能体动态详情')).toBeNull();
    });
    expect(screen.getByText('查看全量运行日志')).toBeTruthy();
  });

  it('collapses when clicking outside while expanded', () => {
    render(
      <FloatingProcessPanel defaultExpanded items={items} title="流程动态" />,
    );

    expect(screen.getByText('查看全量运行日志')).toBeTruthy();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByText('查看全量运行日志')).toBeNull();
  });

  it('resolves dock side when the panel is dragged near viewport edges', () => {
    expect(
      resolveDockSide({
        left: 20,
        width: 236,
        viewportWidth: 1280,
      }),
    ).toBe('left');

    expect(
      resolveDockSide({
        left: 1010,
        width: 236,
        viewportWidth: 1280,
      }),
    ).toBe('right');

    expect(
      resolveDockSide({
        left: 420,
        width: 236,
        viewportWidth: 1280,
      }),
    ).toBeNull();
  });

  it('computes collapsed and expanded positions for docked mode', () => {
    expect(
      resolveAnchoredPanelTop({
        anchorHeight: 48,
        anchorTop: 120,
        panelHeight: 260,
        viewportHeight: 720,
      }),
    ).toBe(120);
    expect(
      resolveAnchoredPanelTop({
        anchorHeight: 48,
        anchorTop: 616,
        panelHeight: 260,
        viewportHeight: 720,
      }),
    ).toBe(404);

    expect(resolveDockedLeft({ side: 'left', viewportWidth: 1280 })).toBe(0);
    expect(resolveDockedLeft({ side: 'right', viewportWidth: 1280 })).toBe(
      1232,
    );
    expect(
      resolveDockedTop({
        anchorTop: 640,
        viewportHeight: 720,
        shellHeight: 48,
      }),
    ).toBe(640);
    expect(
      resolveDockedTop({
        anchorTop: 640,
        viewportHeight: 720,
        shellHeight: 240,
      }),
    ).toBe(464);
    expect(
      resolveDockedTop({
        anchorTop: 640,
        viewportHeight: 720,
        shellHeight: 48,
      }),
    ).toBe(640);

    expect(
      resolveFloatingLeft({
        side: 'left',
        viewportWidth: 1280,
        width: 236,
      }),
    ).toBe(16);
    expect(
      resolveFloatingLeft({
        side: 'right',
        viewportWidth: 1280,
        width: 236,
      }),
    ).toBe(1028);

    expect(resolveExpandedDockLeft({ side: 'left', viewportWidth: 1280 })).toBe(
      16,
    );
    expect(
      resolveExpandedDockLeft({ side: 'right', viewportWidth: 1280 }),
    ).toBe(904);
  });
});
