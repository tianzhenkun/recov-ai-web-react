import { render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import React from 'react';
import LiveMonitorCard from './LiveMonitorCard';

const stats = {
  ongoingCalls: 0,
  finishedToday: 0,
  totalTalkMinutesToday: 0,
};

describe('LiveMonitorCard', () => {
  it('uses a themed activity icon instead of realtime text in the ongoing calls metric card', () => {
    render(<LiveMonitorCard stats={stats} onDetailClick={jest.fn()} />);

    const ongoingLabel = screen.getByText('正在通话');
    const ongoingCard = ongoingLabel.closest('.rounded-lg');

    expect(screen.queryByText('实时')).toBeNull();
    expect(ongoingCard?.querySelector('.live-monitor-activity-icon')).toBe(
      screen.getByLabelText('实时通话动态'),
    );
  });

  it('links detail action and activity icon color to the theme primary color', () => {
    render(
      <ConfigProvider theme={{ token: { colorPrimary: '#f5222d' } }}>
        <LiveMonitorCard stats={stats} onDetailClick={jest.fn()} />
      </ConfigProvider>,
    );

    const detailButton = screen.getByRole('button', { name: '查看详情' });
    const detailIcon = detailButton.querySelector('.anticon-eye');
    const activityIcon = screen.getByLabelText('实时通话动态');

    expect(detailButton.style.color).toBe('rgb(245, 34, 45)');
    expect((detailIcon as HTMLElement | null)?.style.color).toBe(
      'rgb(245, 34, 45)',
    );
    expect(
      activityIcon.style.getPropertyValue('--live-monitor-activity-color'),
    ).toBe('#f5222d');
    expect(
      activityIcon.style.getPropertyValue('--live-monitor-activity-bg'),
    ).toBe('transparent');
    expect(
      activityIcon.style.getPropertyValue('--live-monitor-activity-border'),
    ).toBe('');
  });

  it('renders secondary stats as a low-emphasis footer strip in the same metric panel', () => {
    render(<LiveMonitorCard stats={stats} onDetailClick={jest.fn()} />);

    const panel = screen
      .getByText('正在通话')
      .closest('.live-monitor-metrics-panel');
    const strip = panel?.querySelector('.live-monitor-secondary-strip');

    expect(panel).not.toBeNull();
    expect(strip?.textContent).toContain('今日已完成');
    expect(strip?.textContent).toContain('今日累计通话时长');
    expect(strip?.parentElement).toBe(panel);
  });
});
