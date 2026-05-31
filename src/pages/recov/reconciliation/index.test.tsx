import { render } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import React from 'react';
import { ModeIndicator } from './index';

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
