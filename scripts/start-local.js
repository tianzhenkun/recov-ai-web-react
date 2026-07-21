#!/usr/bin/env node

const { createPublicKey } = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const localConfigPath = path.join(
  repositoryRoot,
  'config',
  'local-dev.local.js',
);
const removedEnvironmentKeys = [
  'MOCK',
  'UMI_APP_ADMIN_API',
  'UMI_APP_ADMIN_TARGET',
  'UMI_APP_PRODUCT_API',
  'UMI_APP_PRODUCT_TARGET',
  'UMI_APP_RSA_PRIVATE_KEY',
  'UMI_APP_VOICE_API',
  'UMI_APP_VOICE_API_TARGET',
];
const productCodePattern = /^[a-z][a-z0-9_]{1,63}$/;
const profileNamePattern = /^[a-z][a-z0-9_]{1,63}$/;
const loginVariantPattern = /^[a-z][a-z0-9-]{0,63}$/;
const exactKeys = (value, expected) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...expected].sort().join(',');

const fail = (message) => {
  throw new Error(`本地产品配置无效：${message}`);
};

const normalizeGatewayPath = (value) => {
  const normalized = String(value || '').trim();
  if (
    !/^\/(?:[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*)?$/.test(normalized) ||
    normalized === '/'
  ) {
    fail('gateway.path 必须是安全的非根同源路径');
  }
  return normalized;
};

const normalizeGatewayTarget = (value) => {
  let parsed;
  try {
    parsed = new URL(String(value || '').trim());
  } catch {
    fail('gateway.target 必须是 HTTP 或 HTTPS Origin');
  }
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    !['', '/'].includes(parsed.pathname)
  ) {
    fail('gateway.target 只能填写不带凭据、路径、查询或片段的 Origin');
  }
  return parsed.origin;
};

const validateRsaPublicKey = (value) => {
  const normalized = String(value || '').trim();
  try {
    const publicKey = createPublicKey({
      format: 'der',
      key: Buffer.from(normalized, 'base64'),
      type: 'spki',
    });
    if (
      publicKey.asymmetricKeyType !== 'rsa' ||
      (publicKey.asymmetricKeyDetails?.modulusLength || 0) < 2048
    ) {
      fail('encryption.rsaPublicKey 必须是至少 2048 位的 RSA 公钥');
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('本地产品配置无效')
    ) {
      throw error;
    }
    fail('encryption.rsaPublicKey 必须是 Base64 DER SPKI RSA 公钥');
  }
  return normalized;
};

const validateLocalDevConfig = (input) => {
  if (
    !exactKeys(input, [
      'schemaVersion',
      'defaultProfile',
      'gateway',
      'encryption',
      'profiles',
    ]) ||
    input.schemaVersion !== 1
  ) {
    fail('顶层字段或 schemaVersion 不正确');
  }
  if (!exactKeys(input.gateway, ['path', 'target'])) {
    fail('gateway 字段不精确');
  }
  if (!exactKeys(input.encryption, ['enabled', 'rsaPublicKey'])) {
    fail('encryption 字段不精确');
  }
  if (typeof input.encryption.enabled !== 'boolean') {
    fail('encryption.enabled 必须是布尔值');
  }

  const profiles = input.profiles;
  if (!profiles || typeof profiles !== 'object' || Array.isArray(profiles)) {
    fail('profiles 必须是对象');
  }
  const profileEntries = Object.entries(profiles);
  if (profileEntries.length === 0) fail('profiles 不能为空');

  const ports = new Set();
  const normalizedProfiles = {};
  for (const [profileName, profile] of profileEntries) {
    if (!profileNamePattern.test(profileName)) {
      fail(`profile 名称不合法：${profileName}`);
    }
    if (
      !exactKeys(profile, [
        'displayName',
        'portalScope',
        'productCode',
        'loginVariant',
        'clientId',
        'port',
      ])
    ) {
      fail(`profile ${profileName} 字段不精确`);
    }
    const displayName = String(profile.displayName || '').trim();
    const portalScope = String(profile.portalScope || '').trim();
    const productCode = String(profile.productCode || '').trim();
    const loginVariant = String(profile.loginVariant || '').trim();
    const clientId = String(profile.clientId || '').trim();
    if (!displayName) fail(`profile ${profileName} 缺少 displayName`);
    if (!['PLATFORM', 'PRODUCT'].includes(portalScope)) {
      fail(`profile ${profileName} 的 portalScope 仅允许 PLATFORM 或 PRODUCT`);
    }
    if (
      (portalScope === 'PLATFORM' && productCode !== '') ||
      (portalScope === 'PRODUCT' && productCode === '') ||
      (productCode && !productCodePattern.test(productCode))
    ) {
      fail(`profile ${profileName} 的 portalScope 与 productCode 组合不合法`);
    }
    if (loginVariant !== 'AUTO' && !loginVariantPattern.test(loginVariant)) {
      fail(`profile ${profileName} 的 loginVariant 不合法`);
    }
    if (!clientId || clientId.length > 64 || /\s/.test(clientId)) {
      fail(`profile ${profileName} 的 clientId 不合法`);
    }
    if (
      !Number.isInteger(profile.port) ||
      profile.port < 1 ||
      profile.port > 65535 ||
      ports.has(profile.port)
    ) {
      fail(`profile ${profileName} 的 port 不合法或重复`);
    }
    ports.add(profile.port);
    normalizedProfiles[profileName] = {
      displayName,
      portalScope,
      productCode,
      loginVariant,
      clientId,
      port: profile.port,
    };
  }

  const defaultProfile = String(input.defaultProfile || '').trim();
  if (!Object.hasOwn(normalizedProfiles, defaultProfile)) {
    fail('defaultProfile 未在 profiles 中注册');
  }
  const encryption = {
    enabled: input.encryption.enabled,
    rsaPublicKey: input.encryption.enabled
      ? validateRsaPublicKey(input.encryption.rsaPublicKey)
      : '',
  };
  return {
    schemaVersion: 1,
    defaultProfile,
    gateway: {
      path: normalizeGatewayPath(input.gateway.path),
      target: normalizeGatewayTarget(input.gateway.target),
    },
    encryption,
    profiles: normalizedProfiles,
  };
};

const buildLocalDevEnvironment = (
  rawConfig,
  requestedProfile,
  baseEnvironment = process.env,
) => {
  const config = validateLocalDevConfig(rawConfig);
  const profileName = String(requestedProfile || config.defaultProfile).trim();
  if (!Object.hasOwn(config.profiles, profileName)) {
    fail(`未注册 profile：${profileName}`);
  }
  const profile = config.profiles[profileName];
  const environment = { ...baseEnvironment };
  removedEnvironmentKeys.forEach((key) => {
    delete environment[key];
  });
  return {
    ...environment,
    LINGCHEN_LOCAL_PORTAL_SCOPE: profile.portalScope,
    LINGCHEN_LOCAL_PRODUCT_CODE: profile.productCode,
    PORT: String(profile.port),
    UMI_ENV: 'dev',
    UMI_APP_API_TARGET: config.gateway.target,
    UMI_APP_BASE_API: config.gateway.path,
    UMI_APP_CLIENT_ID: profile.clientId,
    UMI_APP_ENCRYPT: String(config.encryption.enabled),
    UMI_APP_LOGIN_VARIANT: profile.loginVariant,
    UMI_APP_RSA_PUBLIC_KEY: config.encryption.rsaPublicKey,
  };
};

const assertPortAvailable = (port) =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => {
      reject(new Error(`本地前端端口 ${port} 已被占用，请修改 profile.port`));
    });
    server.listen({ host: '0.0.0.0', port }, () => {
      server.close(resolve);
    });
  });

const loadLocalConfig = () => {
  if (!fs.existsSync(localConfigPath)) {
    throw new Error(
      '缺少 config/local-dev.local.js，请先复制 config/local-dev.example.js',
    );
  }
  delete require.cache[require.resolve(localConfigPath)];
  return require(localConfigPath);
};

const run = async () => {
  const rawConfig = loadLocalConfig();
  const normalized = validateLocalDevConfig(rawConfig);
  const requestedProfile = String(
    process.argv[2] || normalized.defaultProfile,
  ).trim();
  const environment = buildLocalDevEnvironment(normalized, requestedProfile);
  const profile = normalized.profiles[requestedProfile];
  await assertPortAvailable(profile.port);

  process.stdout.write(
    [
      `启动本地站点：${profile.displayName} (${requestedProfile})`,
      `入口范围：${profile.portalScope}`,
      `产品编码：${profile.productCode || '公共管理端'}`,
      `浏览地址：http://127.0.0.1:${profile.port}`,
      `主 Gateway：${normalized.gateway.path} -> ${normalized.gateway.target}`,
      `请求加密：${normalized.encryption.enabled ? '开启' : '关闭'}`,
      '',
    ].join('\n'),
  );

  const executable = path.join(
    repositoryRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'max.cmd' : 'max',
  );
  const child = spawn(executable, ['dev'], {
    cwd: repositoryRoot,
    env: environment,
    stdio: 'inherit',
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => child.kill(signal));
  }
  child.once('error', (error) => {
    process.stderr.write(`[ERROR] 无法启动前端：${error.message}\n`);
    process.exitCode = 1;
  });
  child.once('exit', (code, signal) => {
    process.exitCode = signal ? 1 : (code ?? 1);
  });
};

if (require.main === module) {
  run().catch((error) => {
    process.stderr.write(
      `[ERROR] ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}

module.exports = {
  assertPortAvailable,
  buildLocalDevEnvironment,
  validateLocalDevConfig,
};
