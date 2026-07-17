import { ruoyiRequest } from '@/adapters/ruoyi/request';
import {
  checkOAuthProviderConfig,
  disableOAuthProviderConfig,
  enableOAuthProviderConfig,
  getOAuthProviderConfig,
  listOAuthProviderConfigs,
  listOAuthProviders,
  saveOAuthProviderConfig,
} from './oauth-config';

jest.mock('@/adapters/ruoyi/request', () => ({
  ruoyiRequest: jest.fn(),
}));

const mockedRequest = ruoyiRequest as jest.Mock;

describe('OAuth integration config service', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({ code: 200, data: [] });
  });

  it('uses the System platform OAuth management endpoints', async () => {
    await listOAuthProviders();
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/integration-config/oauth/providers',
      { method: 'get' },
    );

    await listOAuthProviderConfigs();
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/integration-config/oauth/list',
      { method: 'get' },
    );

    await getOAuthProviderConfig('gitee');
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/integration-config/oauth/gitee',
      { method: 'get' },
    );
  });

  it('omits blank secrets while preserving revision and public fields', async () => {
    mockedRequest.mockResolvedValue({
      code: 200,
      data: { providerCode: 'gitee', revision: 4 },
    });

    await saveOAuthProviderConfig('gitee', {
      revision: 3,
      configName: 'Gitee 登录',
      clientId: 'client-id',
      clientSecret: '   ',
      redirectUri: 'https://example.com/social-callback?source=gitee',
      scopes: ['user_info'],
      stackOverflowKey: '',
      remark: '平台登录',
    });

    const [, options] = mockedRequest.mock.calls.at(-1) || [];
    expect(options).toEqual(
      expect.objectContaining({
        method: 'put',
        repeatSubmit: false,
        data: expect.objectContaining({
          revision: 3,
          clientId: 'client-id',
          scopes: ['user_info'],
        }),
      }),
    );
    expect(options.data).not.toHaveProperty('clientSecret');
    expect(options.data).not.toHaveProperty('stackOverflowKey');
  });

  it('does not send revision when creating a provider config', async () => {
    mockedRequest.mockResolvedValue({
      code: 200,
      data: { providerCode: 'github', revision: 0 },
    });

    await saveOAuthProviderConfig('github', {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://example.com/social-callback?source=github',
    });

    const [, options] = mockedRequest.mock.calls.at(-1) || [];
    expect(options.data).not.toHaveProperty('revision');
    expect(options.data).toEqual(
      expect.objectContaining({
        clientId: 'client-id',
        clientSecret: 'client-secret',
      }),
    );
  });

  it('carries revision through check and lifecycle transitions', async () => {
    await checkOAuthProviderConfig('gitee', 8);
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/integration-config/oauth/gitee/validate',
      expect.objectContaining({
        method: 'post',
        data: { revision: 8 },
        repeatSubmit: false,
      }),
    );

    await enableOAuthProviderConfig('gitee', 8);
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/integration-config/oauth/gitee/enable',
      expect.objectContaining({ data: { revision: 8 } }),
    );

    await disableOAuthProviderConfig('gitee', 8);
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/integration-config/oauth/gitee/disable',
      expect.objectContaining({ data: { revision: 8 } }),
    );
  });
});
