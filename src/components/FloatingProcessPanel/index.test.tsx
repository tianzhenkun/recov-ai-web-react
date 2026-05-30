import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import FloatingProcessPanel, {
  type FlowProcessItem,
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

  it('calls onViewAllLogs when footer button is clicked', () => {
    const onViewAllLogs = jest.fn();

    render(
      <FloatingProcessPanel
        defaultExpanded
        items={items}
        onViewAllLogs={onViewAllLogs}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '查看全量运行日志' }));

    expect(onViewAllLogs).toHaveBeenCalledTimes(1);
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
    ).toBe(928);
  });
});
