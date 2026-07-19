import {
  normalizeSafeResourceUrl,
  shouldAttachAuthorizationToResource,
} from '@/shared/security/url';

export const normalizeSafePdfUrl = (value?: string, origin?: string) => {
  if (!origin) return undefined;
  return normalizeSafeResourceUrl(value, origin);
};

export const shouldAttachPdfAuthorization = (value?: string, origin?: string) =>
  shouldAttachAuthorizationToResource(value, origin);
