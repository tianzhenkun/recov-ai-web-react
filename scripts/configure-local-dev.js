#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const {
  DEFAULT_WEB_CLIENT_ID,
  buildLoginVariantChoices,
  checkBackendTargets,
  normalizeProductCode,
  readEnvValues,
  validateBackendTarget,
  validateClientId,
  validateRsaPublicKey,
  validateSameOriginPath,
  writeManagedEnvFileAtomic,
} = require('./local-dev-profile');

const repositoryRoot = path.resolve(__dirname, '..');
const envFile = path.join(repositoryRoot, '.env.local');
const catalogFile = path.join(repositoryRoot, 'src/login-layouts/catalog.json');

const askValidated = async (rl, prompt, defaultValue, validate) => {
  while (true) {
    const suffix = defaultValue ? ` [${defaultValue}]` : '';
    const answer = (await rl.question(`${prompt}${suffix}: `)).trim();
    try {
      return validate(answer || defaultValue);
    } catch (error) {
      process.stderr.write(
        `[ERROR] ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  }
};

const askYesNo = async (rl, prompt, defaultValue) => {
  while (true) {
    const hint = defaultValue ? 'Y/n' : 'y/N';
    const answer = (await rl.question(`${prompt} [${hint}]: `))
      .trim()
      .toLowerCase();
    if (!answer) return defaultValue;
    if (['y', 'yes', '是'].includes(answer)) return true;
    if (['n', 'no', '否'].includes(answer)) return false;
    process.stderr.write('[ERROR] 请输入 y 或 n。\n');
  }
};

const askConfiguredValidated = async (rl, prompt, defaultValue, validate) => {
  while (true) {
    const suffix = defaultValue ? ' [已配置，回车保留]' : '';
    const answer = (await rl.question(`${prompt}${suffix}: `)).trim();
    try {
      return validate(answer || defaultValue);
    } catch (error) {
      process.stderr.write(
        `[ERROR] ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  }
};

const readBooleanDefault = (value, fallback) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return fallback;
};

const chooseVariant = async (rl, choices, currentValue) => {
  process.stdout.write('\n可用登录布局：\n');
  choices.forEach((choice, index) => {
    process.stdout.write(`  ${index + 1}. ${choice.code} - ${choice.label}\n`);
  });
  while (true) {
    const answer = (
      await rl.question(`登录布局 [${currentValue || 'AUTO'}]: `)
    ).trim();
    const requested = answer || currentValue || 'AUTO';
    const byIndex = Number(requested);
    if (
      Number.isInteger(byIndex) &&
      byIndex >= 1 &&
      byIndex <= choices.length
    ) {
      return choices[byIndex - 1].code;
    }
    const matched = choices.find((choice) => choice.code === requested);
    if (matched) return matched.code;
    process.stderr.write('[ERROR] 请选择列表中的布局。\n');
  }
};

const run = async () => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('本地配置向导需要在交互式终端中运行。');
  }
  const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
  const choices = buildLoginVariantChoices(catalog);
  const currentContent = fs.existsSync(envFile)
    ? fs.readFileSync(envFile, 'utf8')
    : '';
  const current = readEnvValues(currentContent);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    process.stdout.write('灵宸前端本地开发配置\n');
    let defaults = { ...current };
    while (true) {
      const loginVariant = await chooseVariant(
        rl,
        choices,
        defaults.UMI_APP_LOGIN_VARIANT || 'AUTO',
      );
      const productCode = await askValidated(
        rl,
        '本地产品编码（空表示公共基座）',
        defaults.LINGCHEN_LOCAL_PRODUCT_CODE || '',
        normalizeProductCode,
      );
      const gatewayPath = await askValidated(
        rl,
        'Gateway 同源路径',
        defaults.UMI_APP_BASE_API || '/dev-api',
        validateSameOriginPath,
      );
      const gatewayTarget = await askValidated(
        rl,
        'Gateway 本地目标',
        defaults.UMI_APP_API_TARGET || 'http://127.0.0.1:8080',
        validateBackendTarget,
      );
      const clientId = await askValidated(
        rl,
        'Web clientId',
        defaults.UMI_APP_CLIENT_ID || DEFAULT_WEB_CLIENT_ID,
        validateClientId,
      );
      const encrypt = await askYesNo(
        rl,
        '本地后端是否要求 API 请求加密',
        readBooleanDefault(defaults.UMI_APP_ENCRYPT, true),
      );
      const rsaPublicKey = encrypt
        ? await askConfiguredValidated(
            rl,
            'API 请求加密 RSA 公钥（Base64 DER SPKI）',
            defaults.UMI_APP_RSA_PUBLIC_KEY || '',
            validateRsaPublicKey,
          )
        : '';

      const selectedTargets = [
        { name: 'Gateway', path: gatewayPath, target: gatewayTarget },
      ];
      process.stdout.write('\n配置摘要：\n');
      process.stdout.write(`  登录布局：${loginVariant}\n`);
      process.stdout.write(`  产品编码：${productCode || '公共基座'}\n`);
      process.stdout.write(`  Web clientId：${clientId}\n`);
      process.stdout.write(`  API 请求加密：${encrypt ? '开启' : '关闭'}\n`);
      if (encrypt) process.stdout.write('  RSA 公钥：已配置并校验\n');
      selectedTargets.forEach((item) => {
        process.stdout.write(
          `  ${item.name}：${item.path} -> ${item.target}\n`,
        );
      });

      process.stdout.write('\n正在并发检查所有后端目标...\n');
      const checks = await checkBackendTargets(selectedTargets);
      checks.forEach((check) => {
        if (check.connected) {
          process.stdout.write(
            `  [OK] ${check.name}：已连通（HTTP ${check.status}）\n`,
          );
        } else {
          process.stderr.write(`  [FAIL] ${check.name}：${check.error}\n`);
        }
      });

      const managedValues = {
        LINGCHEN_LOCAL_PRODUCT_CODE: productCode,
        UMI_APP_LOGIN_VARIANT: loginVariant,
        UMI_APP_BASE_API: gatewayPath,
        UMI_APP_API_TARGET: gatewayTarget,
        UMI_APP_CLIENT_ID: clientId,
        UMI_APP_ENCRYPT: String(encrypt),
        UMI_APP_RSA_PUBLIC_KEY: rsaPublicKey,
      };
      defaults = { ...defaults, ...managedValues };

      const failed = checks.filter((check) => !check.connected);
      if (failed.length > 0) {
        process.stdout.write(
          '\n连通性检查存在失败。\n  1. 返回修改\n  2. 仍然保存\n  3. 取消\n',
        );
        const action = (await rl.question('请选择 [1]: ')).trim() || '1';
        if (action === '1') continue;
        if (action === '3') {
          process.stdout.write('[CANCELLED] 未修改本地配置。\n');
          return;
        }
        if (action !== '2') {
          process.stderr.write('[ERROR] 无效选择，返回修改。\n');
          continue;
        }
        process.stdout.write('[WARN] 已确认带连通性风险保存。\n');
      } else if (!(await askYesNo(rl, '所有目标均已连通，保存配置', true))) {
        continue;
      }

      writeManagedEnvFileAtomic(envFile, managedValues);
      process.stdout.write(`\n[OK] 已原子更新 ${envFile}\n`);
      process.stdout.write('执行 PORT=8001 npm run dev 启动本地前端。\n');
      break;
    }
  } finally {
    rl.close();
  }
};

run().catch((error) => {
  process.stderr.write(
    `[ERROR] ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
