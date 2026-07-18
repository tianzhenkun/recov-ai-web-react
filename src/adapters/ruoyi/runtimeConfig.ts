export const RUNTIME_CONFIG_SCHEMA_VERSION = 1 as const;

export type LingchenRuntimeConfig = {
  readonly schemaVersion: typeof RUNTIME_CONFIG_SCHEMA_VERSION;
  readonly baseApi: string;
  /** @deprecated Use productApi for new deployments. */
  readonly adminApi?: string;
  readonly productApi?: string;
  readonly voiceApi?: string;
  readonly ssePath: string;
  readonly clientId: string;
  readonly encrypt: boolean;
  readonly requestRsaPublicKey?: string;
};

declare global {
  interface Window {
    __LINGCHEN_RUNTIME_CONFIG__?: unknown;
  }
}

type UnknownRecord = Record<string, unknown>;

const allowedKeys = new Set<keyof LingchenRuntimeConfig>([
  'schemaVersion',
  'baseApi',
  'adminApi',
  'productApi',
  'voiceApi',
  'ssePath',
  'clientId',
  'encrypt',
  'requestRsaPublicKey',
]);

const isProduction = process.env.NODE_ENV === 'production';

const fail = (message: string): never => {
  throw new Error(`[Lingchen runtime config] ${message}`);
};

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readRequiredString = (config: UnknownRecord, key: string) => {
  const value = config[key];
  if (typeof value !== 'string' || !value.trim()) {
    return fail(`${key} must be a non-empty string.`);
  }
  return value.trim();
};

const readOptionalString = (config: UnknownRecord, key: string) => {
  const value = config[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) {
    return fail(`${key} must be a non-empty string when provided.`);
  }
  return value.trim();
};

const readSameOriginPath = (config: UnknownRecord, key: string) => {
  const value = readRequiredString(config, key);
  if (!/^\/(?:[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*)?$/.test(value)) {
    return fail(`${key} must be a same-origin absolute path.`);
  }

  return value.length > 1 ? value.replace(/\/$/, '') : value;
};

const readOptionalSameOriginPath = (config: UnknownRecord, key: string) => {
  if (config[key] === undefined) return undefined;
  return readSameOriginPath(config, key);
};

const rejectUnknownKeys = (config: UnknownRecord) => {
  const unknownKeys = Object.keys(config).filter(
    (key) => !allowedKeys.has(key as keyof LingchenRuntimeConfig),
  );
  if (unknownKeys.length > 0) {
    fail(`unsupported field(s): ${unknownKeys.join(', ')}.`);
  }
};

export const parseRuntimeConfig = (value: unknown): LingchenRuntimeConfig => {
  if (!isRecord(value)) {
    return fail('window.__LINGCHEN_RUNTIME_CONFIG__ must be an object.');
  }

  rejectUnknownKeys(value);

  if (value.schemaVersion !== RUNTIME_CONFIG_SCHEMA_VERSION) {
    fail(`schemaVersion must be ${RUNTIME_CONFIG_SCHEMA_VERSION}.`);
  }
  const encryptValue = value.encrypt;
  const encrypt =
    typeof encryptValue === 'boolean'
      ? encryptValue
      : fail('encrypt must be a boolean.');

  const clientId = readRequiredString(value, 'clientId');
  if (clientId.length > 128 || /\s/.test(clientId)) {
    fail(
      'clientId must not contain whitespace and must be at most 128 characters.',
    );
  }

  const requestRsaPublicKey = readOptionalString(value, 'requestRsaPublicKey');
  if (encrypt && !requestRsaPublicKey) {
    fail('requestRsaPublicKey is required when encrypt is true.');
  }

  const baseApi = readSameOriginPath(value, 'baseApi');
  const adminApi = readOptionalSameOriginPath(value, 'adminApi');
  const productApi = readOptionalSameOriginPath(value, 'productApi');
  const voiceApi = readOptionalSameOriginPath(value, 'voiceApi');
  const ssePath = readSameOriginPath(value, 'ssePath');
  if (adminApi && productApi) {
    fail('productApi and adminApi must not be configured together.');
  }
  if (
    baseApi === '/' ||
    adminApi === '/' ||
    productApi === '/' ||
    voiceApi === '/'
  ) {
    fail('API channels must not use the site root.');
  }
  const apiChannels = [baseApi, productApi || adminApi, voiceApi].filter(
    (item): item is string => Boolean(item),
  );
  if (new Set(apiChannels).size !== apiChannels.length) {
    fail('baseApi, productApi/adminApi and voiceApi must use different paths.');
  }

  return Object.freeze({
    schemaVersion: RUNTIME_CONFIG_SCHEMA_VERSION,
    baseApi,
    adminApi,
    productApi,
    voiceApi,
    ssePath,
    clientId,
    encrypt,
    requestRsaPublicKey,
  });
};

const readRuntimeConfig = () => {
  const rawConfig =
    typeof window === 'undefined'
      ? undefined
      : window.__LINGCHEN_RUNTIME_CONFIG__;

  if (
    !isProduction &&
    (rawConfig === undefined ||
      (isRecord(rawConfig) && Object.keys(rawConfig).length === 0))
  ) {
    return undefined;
  }

  if (rawConfig === undefined) {
    return fail('runtime-config.js was not loaded.');
  }

  return parseRuntimeConfig(rawConfig);
};

export const runtimeConfig = readRuntimeConfig();
export const isProductionRuntime = isProduction;
