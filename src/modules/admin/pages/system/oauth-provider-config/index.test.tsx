import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

(globalThis as typeof globalThis & { React: unknown }).React = React;

const mockListProviders = jest.fn();
const mockListConfigs = jest.fn();
const mockGetConfig = jest.fn();
const mockSaveConfig = jest.fn();
const mockCheckConfig = jest.fn();
const mockEnableConfig = jest.fn();
const mockDisableConfig = jest.fn();

jest.mock('@/modules/admin/services/oauth-config', () => ({
  listOAuthProviders: (...args: unknown[]) => mockListProviders(...args),
  listOAuthProviderConfigs: (...args: unknown[]) => mockListConfigs(...args),
  getOAuthProviderConfig: (...args: unknown[]) => mockGetConfig(...args),
  saveOAuthProviderConfig: (...args: unknown[]) => mockSaveConfig(...args),
  checkOAuthProviderConfig: (...args: unknown[]) => mockCheckConfig(...args),
  enableOAuthProviderConfig: (...args: unknown[]) => mockEnableConfig(...args),
  disableOAuthProviderConfig: (...args: unknown[]) =>
    mockDisableConfig(...args),
}));

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
}));

const giteeConfig = {
  providerCode: 'gitee',
  displayName: 'Gitee',
  configName: 'Gitee 登录',
  status: 'DRAFT',
  schemaVersion: 1,
  revision: 3,
  clientId: 'client-id',
  redirectUri: 'https://example.com/social-callback?source=gitee',
  clientSecretConfigured: true,
  stackOverflowKeyConfigured: false,
  checkStatus: 'PASSED',
};

const OAuthProviderConfigPage = require('./index').default;

describe('OAuthProviderConfigPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListProviders.mockResolvedValue([
      { providerCode: 'github', displayName: 'GitHub' },
      { providerCode: 'gitee', displayName: 'Gitee' },
    ]);
    mockListConfigs.mockResolvedValue([giteeConfig]);
    mockGetConfig.mockResolvedValue(giteeConfig);
    mockSaveConfig.mockResolvedValue(giteeConfig);
    mockCheckConfig.mockResolvedValue(giteeConfig);
    mockEnableConfig.mockResolvedValue({ ...giteeConfig, status: 'ENABLED' });
    mockDisableConfig.mockResolvedValue({ ...giteeConfig, status: 'DISABLED' });
  });

  it('lists every supported provider and exposes only secret configuration state', async () => {
    render(<OAuthProviderConfigPage />);

    expect(await screen.findByText('GitHub')).toBeTruthy();
    expect(screen.getByText('Gitee')).toBeTruthy();
    expect(screen.getByText('Gitee 登录')).toBeTruthy();
    expect(screen.getByText('已配置')).toBeTruthy();
    expect(screen.queryByText('must-not-leak')).toBeNull();
    expect(screen.getByRole('button', { name: '新增配置GitHub' })).toBeTruthy();
  });

  it('keeps configured secrets blank when editing and saves with current revision', async () => {
    render(<OAuthProviderConfigPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: '编辑配置Gitee' }),
    );

    expect(await screen.findByText('编辑 Gitee')).toBeTruthy();
    const secretInput = screen.getByLabelText('应用密钥');
    expect((secretInput as HTMLInputElement).value).toBe('');
    expect(screen.getByText('留空将保留现有密钥')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '保存配置' }));

    await waitFor(() => expect(mockSaveConfig).toHaveBeenCalledTimes(1));
    expect(mockSaveConfig).toHaveBeenCalledWith(
      'gitee',
      expect.objectContaining({ revision: 3, clientId: 'client-id' }),
    );
    expect(mockSaveConfig.mock.calls[0][1]).not.toHaveProperty('clientSecret');
  });

  it('does not send revision when creating a provider config', async () => {
    render(<OAuthProviderConfigPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: '新增配置GitHub' }),
    );

    fireEvent.change(await screen.findByLabelText('Client ID'), {
      target: { value: 'github-client-id' },
    });
    fireEvent.change(screen.getByLabelText('应用密钥'), {
      target: { value: 'github-client-secret' },
    });
    fireEvent.change(screen.getByLabelText('回调地址'), {
      target: { value: 'https://example.com/social-callback?source=github' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }));

    await waitFor(() => expect(mockSaveConfig).toHaveBeenCalledTimes(1));
    expect(mockSaveConfig.mock.calls[0][1]).not.toHaveProperty('revision');
  });

  it('checks the selected revision without presenting it as network proof', async () => {
    render(<OAuthProviderConfigPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: '检查配置Gitee' }),
    );

    await waitFor(() =>
      expect(mockCheckConfig).toHaveBeenCalledWith('gitee', 3),
    );
    expect(
      screen.getByText(/字段完整性、URL 格式与密文可解密检查/),
    ).toBeTruthy();
    expect(screen.queryByText(/连通性验证/)).toBeNull();
  });

  it('shows provider-specific fields instead of every optional field', async () => {
    mockListProviders.mockResolvedValue([
      { providerCode: 'gitea', displayName: 'Gitea' },
    ]);
    mockListConfigs.mockResolvedValue([]);
    render(<OAuthProviderConfigPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: '新增配置Gitea' }),
    );

    expect(await screen.findByLabelText('自建服务地址')).toBeTruthy();
    expect(screen.queryByLabelText('Microsoft Entra Tenant ID')).toBeNull();
    expect(screen.queryByLabelText('Stack Overflow API Key')).toBeNull();
  });

  it('uses the current revision when enabling a checked config', async () => {
    render(<OAuthProviderConfigPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: '启用配置Gitee' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: '确认启用' }));

    await waitFor(() =>
      expect(mockEnableConfig).toHaveBeenCalledWith('gitee', 3),
    );
    expect(await screen.findByText('Provider 已启用')).toBeTruthy();
  });

  it('reports the returned check failure instead of claiming enable success', async () => {
    mockEnableConfig.mockResolvedValue({
      ...giteeConfig,
      status: 'DRAFT',
      checkStatus: 'FAILED',
      lastErrorMessage: 'Client Secret 无法解密',
    });
    render(<OAuthProviderConfigPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: '启用配置Gitee' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: '确认启用' }));

    expect(await screen.findByText('Client Secret 无法解密')).toBeTruthy();
    expect(screen.queryByText('Provider 已启用')).toBeNull();
  });

  it('uses the current revision when disabling an enabled config', async () => {
    mockListConfigs.mockResolvedValue([{ ...giteeConfig, status: 'ENABLED' }]);
    render(<OAuthProviderConfigPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: '停用配置Gitee' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: '确认停用' }));

    await waitFor(() =>
      expect(mockDisableConfig).toHaveBeenCalledWith('gitee', 3),
    );
  });

  it('keeps the last check time and failure reason available for diagnosis', async () => {
    mockListConfigs.mockResolvedValue([
      {
        ...giteeConfig,
        checkStatus: 'FAILED',
        lastCheckTime: '2026-07-15 10:03:04',
        lastErrorMessage: '回调地址必须是合法的HTTP或HTTPS地址',
      },
    ]);
    render(<OAuthProviderConfigPage />);

    const failedTag = await screen.findByText('检查失败');
    expect(screen.getByText('2026-07-15 10:03:04')).toBeTruthy();
    fireEvent.mouseOver(failedTag);
    expect(
      await screen.findByText('回调地址必须是合法的HTTP或HTTPS地址'),
    ).toBeTruthy();
  });
});
