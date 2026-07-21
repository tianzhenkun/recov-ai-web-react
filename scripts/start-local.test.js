const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const launcherPath = path.join(__dirname, 'start-local.js');
const exampleConfigPath = path.join(
  repositoryRoot,
  'config',
  'local-dev.example.js',
);

const loadLauncher = () => {
  expect(fs.existsSync(launcherPath)).toBe(true);
  if (!fs.existsSync(launcherPath)) return null;
  jest.resetModules();
  return require(launcherPath);
};

const loadExampleConfig = () => {
  expect(fs.existsSync(exampleConfigPath)).toBe(true);
  if (!fs.existsSync(exampleConfigPath)) return null;
  jest.resetModules();
  return require(exampleConfigPath);
};

describe('non-interactive local development launcher', () => {
  it('defines independent Admin, Recov, and Sales profiles', () => {
    const launcher = loadLauncher();
    const config = loadExampleConfig();
    if (!launcher || !config) return;

    const normalized = launcher.validateLocalDevConfig(config);
    expect(normalized.defaultProfile).toBe('recov');
    expect(Object.keys(normalized.profiles)).toEqual([
      'admin',
      'recov',
      'sales',
    ]);
    expect(
      Object.values(normalized.profiles).map((profile) => [
        profile.portalScope,
        profile.productCode,
        profile.port,
      ]),
    ).toEqual([
      ['PLATFORM', '', 8000],
      ['PRODUCT', 'recov', 8001],
      ['PRODUCT', 'sales', 8002],
    ]);
    expect(
      Object.values(normalized.profiles).map((profile) => profile.clientId),
    ).toHaveLength(3);
  });

  it('builds only the single Gateway environment for the selected product', () => {
    const launcher = loadLauncher();
    const config = loadExampleConfig();
    if (!launcher || !config) return;

    const environment = launcher.buildLocalDevEnvironment(config, 'sales', {
      MOCK: 'enabled',
      UMI_APP_ADMIN_API: '/legacy-admin',
      UMI_APP_PRODUCT_API: '/legacy-product',
      UMI_APP_RSA_PRIVATE_KEY: 'must-not-reach-browser-build',
      UMI_APP_VOICE_API: '/legacy-voice',
    });
    expect(environment).toMatchObject({
      LINGCHEN_LOCAL_PORTAL_SCOPE: 'PRODUCT',
      LINGCHEN_LOCAL_PRODUCT_CODE: 'sales',
      PORT: '8002',
      UMI_APP_API_TARGET: 'http://127.0.0.1:8080',
      UMI_APP_BASE_API: '/dev-api',
      UMI_APP_ENCRYPT: 'false',
      UMI_APP_LOGIN_VARIANT: 'AUTO',
    });
    expect(environment.UMI_APP_CLIENT_ID).toBe(config.profiles.sales.clientId);
    expect(environment.MOCK).toBeUndefined();
    expect(environment.UMI_APP_ADMIN_API).toBeUndefined();
    expect(environment.UMI_APP_PRODUCT_API).toBeUndefined();
    expect(environment.UMI_APP_VOICE_API).toBeUndefined();
    expect(environment.UMI_APP_RSA_PRIVATE_KEY).toBeUndefined();
  });

  it('allows profile aliases without binding portal scope or product code to the profile name', () => {
    const launcher = loadLauncher();
    const config = loadExampleConfig();
    if (!launcher || !config) return;

    const aliasedConfig = {
      ...config,
      defaultProfile: 'console',
      profiles: {
        console: {
          ...config.profiles.admin,
          portalScope: 'PLATFORM',
          productCode: '',
        },
        sales_local: {
          ...config.profiles.sales,
          portalScope: 'PRODUCT',
          productCode: 'sales',
        },
      },
    };

    const normalized = launcher.validateLocalDevConfig(aliasedConfig);
    expect(normalized.profiles.console).toMatchObject({
      portalScope: 'PLATFORM',
      productCode: '',
    });
    expect(normalized.profiles.sales_local).toMatchObject({
      portalScope: 'PRODUCT',
      productCode: 'sales',
    });
  });

  it.each([
    ['admin', 'PLATFORM', 'recov'],
    ['admin', 'UNKNOWN', ''],
    ['recov', 'PLATFORM', 'recov'],
    ['recov', 'PRODUCT', ''],
  ])('rejects invalid portal scope combination for %s: %s / %s', (profileName, portalScope, productCode) => {
    const launcher = loadLauncher();
    const config = loadExampleConfig();
    if (!launcher || !config) return;

    const invalidConfig = {
      ...config,
      profiles: {
        ...config.profiles,
        [profileName]: {
          ...config.profiles[profileName],
          portalScope,
          productCode,
        },
      },
    };

    expect(() => launcher.validateLocalDevConfig(invalidConfig)).toThrow(
      /portalScope|入口范围|productCode/,
    );
  });

  it.each([
    'RECOV',
    'sales-agent',
    'unknown',
  ])('rejects invalid or unregistered profile %s', (profile) => {
    const launcher = loadLauncher();
    const config = loadExampleConfig();
    if (!launcher || !config) return;

    expect(() => launcher.buildLocalDevEnvironment(config, profile)).toThrow(
      /本地产品配置/,
    );
  });

  it('accepts a 64-character clientId and rejects 65 characters', () => {
    const launcher = loadLauncher();
    const config = loadExampleConfig();
    if (!launcher || !config) return;

    const withClientId = (clientId) => ({
      ...config,
      profiles: {
        ...config.profiles,
        recov: {
          ...config.profiles.recov,
          clientId,
        },
      },
    });

    expect(() =>
      launcher.validateLocalDevConfig(withClientId('a'.repeat(64))),
    ).not.toThrow();
    expect(() =>
      launcher.validateLocalDevConfig(withClientId('a'.repeat(65))),
    ).toThrow(/clientId/);
  });

  it('removes the interactive and Mock startup commands', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'),
    );

    expect(packageJson.scripts['configure:local']).toBeUndefined();
    expect(packageJson.scripts.dev).toBe('node scripts/start-local.js');
    expect(packageJson.scripts['dev:admin']).toBe(
      'node scripts/start-local.js admin',
    );
    expect(packageJson.scripts['dev:recov']).toBe(
      'node scripts/start-local.js recov',
    );
    expect(packageJson.scripts['dev:sales']).toBe(
      'node scripts/start-local.js sales',
    );
    expect(JSON.stringify(packageJson.scripts)).not.toContain('MOCK=none');
    expect(packageJson.scripts['start:pre']).toBeUndefined();
    expect(packageJson.scripts['start:test']).toBeUndefined();
  });
});
