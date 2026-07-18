const fs = require('node:fs');
const path = require('node:path');

const MANAGED_BLOCK_START = '# >>> lingchen local profile >>>';
const MANAGED_BLOCK_END = '# <<< lingchen local profile <<<';
const MANAGED_ENV_KEYS = new Set([
  'UMI_APP_LOGIN_VARIANT',
  'UMI_APP_BASE_API',
  'UMI_APP_API_TARGET',
  'UMI_APP_PRODUCT_API',
  'UMI_APP_PRODUCT_TARGET',
  'UMI_APP_VOICE_API',
  'UMI_APP_VOICE_API_TARGET',
  'LINGCHEN_LOCAL_PRODUCT_CODE',
  // Remove legacy aliases only when the operator explicitly applies a profile.
  'UMI_APP_ADMIN_API',
  'UMI_APP_ADMIN_TARGET',
]);

const readEnvKey = (line) => {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  return match?.[1];
};

const readEnvValues = (content) => {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const key = readEnvKey(line);
    if (!key) continue;
    const separator = line.indexOf('=');
    result[key] = line.slice(separator + 1).trim();
  }
  return result;
};

const updateManagedEnvContent = (currentContent, managedValues) => {
  const retained = [];
  let insideManagedBlock = false;
  for (const line of currentContent.split(/\r?\n/)) {
    if (line.trim() === MANAGED_BLOCK_START) {
      insideManagedBlock = true;
      continue;
    }
    if (line.trim() === MANAGED_BLOCK_END) {
      insideManagedBlock = false;
      continue;
    }
    if (insideManagedBlock) continue;
    const key = readEnvKey(line);
    if (key && MANAGED_ENV_KEYS.has(key)) continue;
    retained.push(line);
  }

  while (retained.length > 0 && !retained.at(-1)?.trim()) retained.pop();
  const managedLines = Object.entries(managedValues).map(([key, value]) => {
    if (!MANAGED_ENV_KEYS.has(key)) {
      throw new Error(`本地 Profile 不允许管理环境变量 ${key}。`);
    }
    if (/[\r\n]/.test(value)) {
      throw new Error(`${key} 不能包含换行符。`);
    }
    return `${key}=${value}`;
  });

  return [
    ...retained,
    ...(retained.length > 0 ? [''] : []),
    MANAGED_BLOCK_START,
    ...managedLines,
    MANAGED_BLOCK_END,
    '',
  ].join('\n');
};

const writeManagedEnvFileAtomic = (filePath, managedValues) => {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  const currentContent = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf8')
    : '';
  const nextContent = updateManagedEnvContent(currentContent, managedValues);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  try {
    fs.writeFileSync(temporaryPath, nextContent, {
      encoding: 'utf8',
      mode: 0o600,
    });
    fs.renameSync(temporaryPath, filePath);
    fs.chmodSync(filePath, 0o600);
  } catch (error) {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    throw error;
  }
};

const buildLoginVariantChoices = (catalog) => {
  if (
    !catalog ||
    catalog.schemaVersion !== 1 ||
    !Array.isArray(catalog.layouts)
  ) {
    throw new Error('登录布局注册表格式无效。');
  }
  const seen = new Set();
  const layouts = catalog.layouts.map((layout) => {
    const code = String(layout?.code || '').trim();
    const label = String(layout?.label || '').trim();
    if (
      !/^[a-z][a-z0-9-]{0,63}$/.test(code) ||
      !label ||
      code.toUpperCase() === 'AUTO' ||
      seen.has(code)
    ) {
      throw new Error('登录布局注册表包含无效或重复项。');
    }
    seen.add(code);
    return { code, label };
  });
  return [{ code: 'AUTO', label: '自动（跟随后端站点配置）' }, ...layouts];
};

const validateSameOriginPath = (value) => {
  const normalized = String(value || '').trim();
  if (!/^\/(?:[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*)?$/.test(normalized)) {
    throw new Error('必须是以 / 开头的同源绝对路径。');
  }
  if (normalized === '/') throw new Error('API 通道不能使用站点根路径。');
  return normalized.length > 1 ? normalized.replace(/\/$/, '') : normalized;
};

const validateBackendTarget = (value) => {
  let parsed;
  try {
    parsed = new URL(String(value || '').trim());
  } catch {
    throw new Error('后端目标必须是有效的 HTTP 或 HTTPS URL。');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('后端目标只允许使用 HTTP 或 HTTPS。');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('后端目标不允许携带账号、密码、查询参数或片段。');
  }
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new Error('后端目标只允许配置 Origin，不允许携带路径。');
  }
  return parsed.origin;
};

const normalizeProductCode = (value) => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  if (normalized && !/^[A-Z][A-Z0-9_]{1,63}$/.test(normalized)) {
    throw new Error('产品编码必须为空，或符合 [A-Z][A-Z0-9_]{1,63}。');
  }
  return normalized;
};

const checkBackendTargets = async (
  targets,
  { fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {},
) =>
  Promise.all(
    targets.map(async ({ name, target }) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(target, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
        });
        return { connected: true, name, status: response.status, target };
      } catch (error) {
        const message =
          controller.signal.aborted || error?.name === 'AbortError'
            ? `连接超时（${timeoutMs} ms）`
            : error instanceof Error
              ? error.message
              : String(error);
        return { connected: false, error: message, name, target };
      } finally {
        clearTimeout(timeout);
      }
    }),
  );

module.exports = {
  MANAGED_ENV_KEYS,
  buildLoginVariantChoices,
  checkBackendTargets,
  normalizeProductCode,
  readEnvValues,
  updateManagedEnvContent,
  validateBackendTarget,
  validateSameOriginPath,
  writeManagedEnvFileAtomic,
};
