import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

(globalThis as typeof globalThis & { React: unknown }).React = React;

const mockHistoryPush = jest.fn();
const mockUseAccess = jest.fn();

jest.mock('@umijs/max', () => ({
  history: {
    push: (...args: unknown[]) => mockHistoryPush(...args),
  },
  useAccess: () => mockUseAccess(),
}));

const IntegrationCenterPage = require('./index').default;

describe('IntegrationCenterPage', () => {
  beforeEach(() => {
    mockHistoryPush.mockReset();
    mockUseAccess.mockReset();
    mockUseAccess.mockReturnValue({ canManageOAuthIntegration: true });
  });

  it('always exposes Payment alongside authorized OAuth and OSS entries', () => {
    render(<IntegrationCenterPage />);

    expect(screen.getByText('对象存储')).toBeTruthy();
    expect(screen.getByText('OSS / MinIO')).toBeTruthy();
    expect(screen.getByText('第三方登录')).toBeTruthy();
    expect(screen.getByText('支付渠道')).toBeTruthy();
    expect(screen.queryByText(/LLM/i)).toBeNull();
    expect(screen.queryByText(/邮件|短信/)).toBeNull();
    expect(screen.queryByText(/业务能力|Billing 服务/)).toBeNull();
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

  it('hides OAuth for users outside the exact platform management context', () => {
    mockUseAccess.mockReturnValue({ canManageOAuthIntegration: false });

    render(<IntegrationCenterPage />);

    expect(screen.getByText('对象存储')).toBeTruthy();
    expect(screen.getByText('支付渠道')).toBeTruthy();
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
