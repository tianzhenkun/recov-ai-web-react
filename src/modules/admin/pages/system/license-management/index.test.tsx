import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

(globalThis as typeof globalThis & { React: unknown }).React = React;

const mockGetLicenseCapabilities = jest.fn();

jest.mock('@/modules/admin/services/license', () => ({
  getLicenseCapabilities: (...args: unknown[]) =>
    mockGetLicenseCapabilities(...args),
}));

jest.mock('@/components/Permission', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}));

jest.mock('@ant-design/pro-components', () => ({
  PageContainer: (props: any) => <section>{props.children}</section>,
}));

jest.mock('./DeploymentManagement', () => () => <div>部署管理内容</div>);
jest.mock('./IssueRecordManagement', () => () => <div>签发记录内容</div>);

const LicenseManagementPage = require('./index').default;

describe('LicenseManagementPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('签发能力未启用时展示稳定说明且不请求依赖签发库表的页面', async () => {
    mockGetLicenseCapabilities.mockResolvedValue({
      code: 200,
      data: { issuerEnabled: false },
    });

    render(<LicenseManagementPage />);

    expect(await screen.findByText('许可证签发能力未启用')).toBeTruthy();
    expect(screen.queryByText('部署管理内容')).toBeNull();
    expect(screen.queryByText('签发记录内容')).toBeNull();
  });

  it('签发能力启用时展示原有管理界面', async () => {
    mockGetLicenseCapabilities.mockResolvedValue({
      code: 200,
      data: { issuerEnabled: true },
    });

    render(<LicenseManagementPage />);

    expect(await screen.findByText('部署管理内容')).toBeTruthy();
  });

  it('状态加载失败时展示服务异常并允许重试', async () => {
    mockGetLicenseCapabilities
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ code: 200, data: { issuerEnabled: false } });

    render(<LicenseManagementPage />);

    expect(await screen.findByText('许可证能力状态加载失败')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }));

    await waitFor(() =>
      expect(mockGetLicenseCapabilities).toHaveBeenCalledTimes(2),
    );
    expect(await screen.findByText('许可证签发能力未启用')).toBeTruthy();
  });
});
