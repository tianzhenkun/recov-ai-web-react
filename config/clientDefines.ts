export const CLIENT_ENV_KEYS = [
  'UMI_APP_BASE_API',
  'UMI_APP_ENCRYPT',
  'UMI_APP_RSA_PUBLIC_KEY',
  'UMI_APP_RSA_PRIVATE_KEY',
  'UMI_APP_CLIENT_ID',
  'UMI_APP_LOGIN_VARIANT',
  'UMI_APP_SSE',
  'UMI_APP_MENU_WORKSPACE_NAMES',
] as const;

const normalizeEnvValue = (value?: string) => {
  const trimmed = (value || '').trim();
  const quote = trimmed[0];

  if (
    trimmed.length >= 2 &&
    (quote === '"' || quote === "'") &&
    trimmed[trimmed.length - 1] === quote
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

export const buildClientEnvDefines = (
  environment: Readonly<Record<string, string | undefined>>,
  production: boolean,
) =>
  Object.fromEntries(
    CLIENT_ENV_KEYS.map((key) => [
      `process.env.${key}`,
      production ? '' : normalizeEnvValue(environment[key]),
    ]),
  );
