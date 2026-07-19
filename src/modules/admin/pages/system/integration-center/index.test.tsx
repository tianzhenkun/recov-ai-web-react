import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

(globalThis as typeof globalThis & { React: unknown }).React = React;

const mockHistoryPush = jest.fn();
const mockGetRouters = jest.fn();
const mockUseAccess = jest.fn();

jest.mock('@umijs/max', () => ({
  history: {
    push: (...args: unknown[]) => mockHistoryPush(...args),
  },
  useAccess: () => mockUseAccess(),
}));

jest.mock('@/app/menu', () => ({
  getRouters: (...args: unknown[]) => mockGetRouters(...args),
}));

const IntegrationCenterPage = require('./index').default;

describe('IntegrationCenterPage', () => {
  beforeEach(() => {
    mockHistoryPush.mockReset();
    mockGetRouters.mockReset();
    mockUseAccess.mockReset();
    mockUseAccess.mockReturnValue({ canManageOAuthIntegration: true });
    mockGetRouters.mockResolvedValue({
      data: [{ path: '/sys-conf/payment-channel-config' }],
    });
  });

  it('exposes authorized OAuth and OSS entries plus installed Payment', async () => {
    render(<IntegrationCenterPage />);

    expect(screen.getByText('对象存储')).toBeTruthy();
    expect(screen.getByText('OSS / MinIO')).toBeTruthy();
    expect(screen.getByText('第三方登录')).toBeTruthy();
    expect(await screen.findByText('支付渠道')).toBeTruthy();
    expect(screen.queryByText(/LLM/i)).toBeNull();
    expect(screen.queryByText(/邮件|短信/)).toBeNull();
  });

  it('reuses the existing configuration pages', async () => {
    render(<IntegrationCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: '配置对象存储' }));
    expect(mockHistoryPush).toHaveBeenLastCalledWith(
      '/sys-conf/oss-config/index',
    );

    fireEvent.click(screen.getByRole('button', { name: '配置第三方登录' }));
    expect(mockHistoryPush).toHaveBeenLastCalledWith(
      '/sys-conf/oauth-providers',
    );

    fireEvent.click(
      await screen.findByRole('button', { name: '配置支付渠道' }),
    );
    expect(mockHistoryPush).toHaveBeenLastCalledWith(
      '/sys-conf/payment-channel-config',
    );
  });

  it('hides Payment when the installed route catalog does not contain it', async () => {
    mockGetRouters.mockResolvedValue({
      data: [
        {
          path: '/sys-conf',
          children: [{ path: 'oss-config/index' }],
        },
      ],
    });

    render(<IntegrationCenterPage />);

    await waitFor(() => expect(mockGetRouters).toHaveBeenCalledTimes(1));
    expect(screen.getByText('对象存储')).toBeTruthy();
    expect(screen.getByText('第三方登录')).toBeTruthy();
    expect(screen.queryByText('支付渠道')).toBeNull();
    expect(screen.queryByText(/支付集成能力暂无法确认/)).toBeNull();
  });

  it('falls back to the known platform entries when the route catalog cannot load', async () => {
    mockGetRouters.mockRejectedValue(new Error('menu unavailable'));

    render(<IntegrationCenterPage />);

    expect(await screen.findByText(/支付集成能力暂无法确认/)).toBeTruthy();
    expect(screen.getByText('对象存储')).toBeTruthy();
    expect(screen.getByText('第三方登录')).toBeTruthy();
    expect(screen.queryByText('支付渠道')).toBeNull();
  });

  it('hides OAuth for users outside the exact platform management context', async () => {
    mockUseAccess.mockReturnValue({ canManageOAuthIntegration: false });

    render(<IntegrationCenterPage />);

    expect(screen.getByText('对象存储')).toBeTruthy();
    expect(await screen.findByText('支付渠道')).toBeTruthy();
    expect(screen.queryByText('第三方登录')).toBeNull();
  });

  it('keeps both reused pages returning to the integration center', () => {
    const ossSource = readFileSync(
      join(
        process.cwd(),
        'src/modules/admin/pages/system/oss-config/index.tsx',
      ),
      'utf8',
    );
    const paymentSource = readFileSync(
      join(
        process.cwd(),
        'src/modules/billing/pages/operations/payment-channel-config/index.tsx',
      ),
      'utf8',
    );

    expect(ossSource).toContain("history.push('/sys-conf/integrations')");
    expect(paymentSource).toContain("history.push('/sys-conf/integrations')");
  });
});
