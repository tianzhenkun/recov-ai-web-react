#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const {
  buildLoginVariantChoices,
  checkBackendTargets,
  normalizeProductCode,
  readEnvValues,
  validateBackendTarget,
  validateSameOriginPath,
  writeManagedEnvFileAtomic,
} = require('./local-dev-profile');

const repositoryRoot = path.resolve(__dirname, '..');
const envFile = path.join(repositoryRoot, '.env.local');
const catalogFile = path.join(
  repositoryRoot,
  'src/pages/user/login/layouts/catalog.json',
);

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

      const currentProductPath =
        defaults.UMI_APP_PRODUCT_API ?? defaults.UMI_APP_ADMIN_API ?? '';
      const currentProductTarget =
        defaults.UMI_APP_PRODUCT_TARGET ?? defaults.UMI_APP_ADMIN_TARGET ?? '';
      const productEnabled = await askYesNo(
        rl,
        '启用 Product API 通道',
        Boolean(currentProductPath && currentProductTarget),
      );
      const productPath = productEnabled
        ? await askValidated(
            rl,
            'Product API 同源路径',
            currentProductPath || '/product-api',
            validateSameOriginPath,
          )
        : '';
      const productTarget = productEnabled
        ? await askValidated(
            rl,
            'Product API 本地目标',
            currentProductTarget,
            validateBackendTarget,
          )
        : '';

      const voiceEnabled = await askYesNo(
        rl,
        '启用 Voice API 通道',
        Boolean(
          defaults.UMI_APP_VOICE_API && defaults.UMI_APP_VOICE_API_TARGET,
        ),
      );
      const voicePath = voiceEnabled
        ? await askValidated(
            rl,
            'Voice API 同源路径',
            defaults.UMI_APP_VOICE_API || '/voice-api',
            validateSameOriginPath,
          )
        : '';
      const voiceTarget = voiceEnabled
        ? await askValidated(
            rl,
            'Voice API 本地目标',
            defaults.UMI_APP_VOICE_API_TARGET || '',
            validateBackendTarget,
          )
        : '';

      const enabledPaths = [gatewayPath, productPath, voicePath].filter(
        Boolean,
      );
      if (new Set(enabledPaths).size !== enabledPaths.length) {
        process.stderr.write(
          '[ERROR] Gateway、Product 和 Voice 的同源路径不能重复，请重新填写。\n',
        );
        defaults = {
          ...defaults,
          LINGCHEN_LOCAL_PRODUCT_CODE: productCode,
          UMI_APP_LOGIN_VARIANT: loginVariant,
          UMI_APP_BASE_API: gatewayPath,
          UMI_APP_API_TARGET: gatewayTarget,
          UMI_APP_PRODUCT_API: productPath,
          UMI_APP_PRODUCT_TARGET: productTarget,
          UMI_APP_VOICE_API: voicePath,
          UMI_APP_VOICE_API_TARGET: voiceTarget,
        };
        continue;
      }

      const selectedTargets = [
        { name: 'Gateway', path: gatewayPath, target: gatewayTarget },
        ...(productEnabled
          ? [{ name: 'Product', path: productPath, target: productTarget }]
          : []),
        ...(voiceEnabled
          ? [{ name: 'Voice', path: voicePath, target: voiceTarget }]
          : []),
      ];
      process.stdout.write('\n配置摘要：\n');
      process.stdout.write(`  登录布局：${loginVariant}\n`);
      process.stdout.write(`  产品编码：${productCode || '公共基座'}\n`);
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
        UMI_APP_PRODUCT_API: productPath,
        UMI_APP_PRODUCT_TARGET: productTarget,
        UMI_APP_VOICE_API: voicePath,
        UMI_APP_VOICE_API_TARGET: voiceTarget,
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
      process.stdout.write('执行 npm run dev 启动本地前端。\n');
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
