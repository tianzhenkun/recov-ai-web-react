import { render, screen } from '@testing-library/react';
import React from 'react';

(globalThis as typeof globalThis & { React: unknown }).React = React;

const mockCanAccess = jest.fn();
const mockUseModel = jest.fn();

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
  useModel: () => mockUseModel(),
}));

jest.mock('@/components/Permission', () => ({
  usePermission: () => ({ canAccess: mockCanAccess }),
}));

const OperationsGuard = require('./OperationsGuard').default;

const renderGuard = () =>
  render(
    <OperationsGuard permissions="credit:admin:account:list">
      <div>受保护子页面</div>
    </OperationsGuard>,
  );

describe('OperationsGuard access boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanAccess.mockReturnValue(true);
    mockUseModel.mockReturnValue({
      initialState: {
        currentUser: { rawUser: { tenantId: '000000' } },
        dynamicTenantId: '000000',
        siteProfile: { portalScope: 'PLATFORM' },
      },
    });
  });

  it('mounts the child page immediately without a Billing capability preflight', () => {
    renderGuard();

    expect(screen.getByText('受保护子页面')).toBeTruthy();
    expect(screen.queryByText(/Billing 服务|业务能力|正在确认/)).toBeNull();
  });

  it('keeps the platform portal boundary', () => {
    mockUseModel.mockReturnValue({
      initialState: {
        currentUser: { rawUser: { tenantId: '000000' } },
        dynamicTenantId: '000000',
        siteProfile: { portalScope: 'PRODUCT' },
      },
    });

    renderGuard();

    expect(screen.getByText('当前入口不可访问平台配置')).toBeTruthy();
    expect(screen.queryByText('受保护子页面')).toBeNull();
  });

  it('keeps the platform tenant and permission boundaries', () => {
    mockCanAccess.mockReturnValue(false);

    renderGuard();

    expect(screen.getByText('无计费管理权限')).toBeTruthy();
    expect(screen.queryByText('受保护子页面')).toBeNull();
  });
});
