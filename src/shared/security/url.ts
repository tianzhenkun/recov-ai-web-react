type ParsedSafeResourceUrl = {
  base?: URL;
  target: URL;
  value: string;
};

const allowedHttpProtocols = new Set(['http:', 'https:']);

const getBrowserOrigin = () =>
  typeof window === 'undefined' ? undefined : window.location.origin;

const decodeUrl = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    decodeURI(trimmed);
    return trimmed;
  } catch {
    return undefined;
  }
};

const parseSafeResourceUrl = (
  value?: string,
  origin = getBrowserOrigin(),
): ParsedSafeResourceUrl | undefined => {
  const decoded = decodeUrl(value);
  if (!decoded) return undefined;

  try {
    const base = origin ? new URL(origin) : undefined;
    if (base && !allowedHttpProtocols.has(base.protocol)) return undefined;
    const target = base ? new URL(decoded, base) : new URL(decoded);
    if (!allowedHttpProtocols.has(target.protocol)) return undefined;
    return { base, target, value: decoded };
  } catch {
    return undefined;
  }
};

export const normalizeSafeResourceUrl = (value?: string, origin?: string) =>
  parseSafeResourceUrl(value, origin)?.value;

export const normalizeSafeExternalUrl = (value?: string) => {
  const decoded = decodeUrl(value);
  if (!decoded) return undefined;
  try {
    const target = new URL(decoded);
    if (!allowedHttpProtocols.has(target.protocol)) return undefined;
    return decoded;
  } catch {
    return undefined;
  }
};

export const shouldAttachAuthorizationToResource = (
  value?: string,
  origin?: string,
) => {
  if (!origin) return false;
  const parsed = parseSafeResourceUrl(value, origin);
  return Boolean(parsed?.base && parsed.target.origin === parsed.base.origin);
};
