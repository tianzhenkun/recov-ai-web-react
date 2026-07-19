import { render } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import React from 'react';
import { RuntimeStatusIndicator } from './index';

describe('RuntimeStatusIndicator', () => {
  it('links the running status badge color to the active theme color', () => {
    render(
      <ConfigProvider theme={{ token: { colorPrimary: '#f5222d' } }}>
        <RuntimeStatusIndicator status="正常运行" />
      </ConfigProvider>,
    );

    const badgeDot = document.querySelector(
      '.ant-badge-status-dot',
    ) as HTMLElement;

    expect(badgeDot.style.backgroundColor).toBe('rgb(245, 34, 45)');
  });
});
