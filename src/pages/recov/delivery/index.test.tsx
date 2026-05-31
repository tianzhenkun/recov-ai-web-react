import { render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import React from 'react';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { DeliveryStatusTag } = require('./index');

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
