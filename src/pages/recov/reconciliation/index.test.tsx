import { render } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import React from 'react';
import { ModeIndicator, RepaymentInfoCard } from './index';

describe('ModeIndicator', () => {
  it('links the leading badge color to the active theme color', () => {
    render(
      <ConfigProvider theme={{ token: { colorPrimary: '#f5222d' } }}>
        <ModeIndicator label="系统对账" />
      </ConfigProvider>,
    );

    const badgeDot = document.querySelector(
      '.ant-badge-status-dot',
    ) as HTMLElement;

    expect(badgeDot.style.backgroundColor).toBe('rgb(245, 34, 45)');
  });
});

describe('RepaymentInfoCard', () => {
  it('shows debt amount context before repayment entry', () => {
    const { getByText } = render(
      <ConfigProvider>
        <RepaymentInfoCard
          row={{
            debtNumber: '30',
            debtorName: '宋若棠',
            city: '广州市',
            organization: '越秀天宸',
            debtAmount: 1880,
            overdueAmount: 56.4,
            recordedAmount: 100,
          }}
        />
      </ConfigProvider>,
    );

    expect(getByText('逾期金额')).toBeTruthy();
    expect(getByText('违约（滞纳）金')).toBeTruthy();
    expect(getByText('剩余待回款')).toBeTruthy();
    expect(getByText('¥1,836.40')).toBeTruthy();
  });
});
