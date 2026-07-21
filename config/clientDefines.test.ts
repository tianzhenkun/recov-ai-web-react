import { buildClientEnvDefines, resolveBuildOutputPath } from './clientDefines';

describe('build client defines', () => {
  const inheritedEnvironment = {
    UMI_APP_BASE_API: '/machine-api',
    UMI_APP_CLIENT_ID: 'machine-client',
    UMI_APP_LOGIN_VARIANT: 'machine-layout',
    UMI_APP_MENU_WORKSPACE_NAMES: 'machine-menu',
    UMI_APP_RSA_PRIVATE_KEY: 'machine-private-key',
    UMI_APP_RSA_PUBLIC_KEY: 'machine-public-key',
    UMI_APP_SSE: '/machine-sse',
  };

  it('neutralizes inherited client values in a production build', () => {
    expect(buildClientEnvDefines(inheritedEnvironment, true)).toEqual(
      expect.objectContaining(
        Object.fromEntries(
          Object.keys(inheritedEnvironment).map((key) => [
            `process.env.${key}`,
            '',
          ]),
        ),
      ),
    );
  });

  it('keeps explicit client overrides for local development', () => {
    expect(buildClientEnvDefines(inheritedEnvironment, false)).toEqual(
      expect.objectContaining({
        'process.env.UMI_APP_BASE_API': '/machine-api',
        'process.env.UMI_APP_CLIENT_ID': 'machine-client',
      }),
    );
  });
});

describe('build output isolation', () => {
  it('keeps local development assets outside the production dist directory', () => {
    expect(resolveBuildOutputPath(false)).toBe(
      'node_modules/.cache/lingchen-dev-dist',
    );
  });

  it('keeps formal builds in the production dist directory', () => {
    expect(resolveBuildOutputPath(true)).toBe('dist');
  });
});
