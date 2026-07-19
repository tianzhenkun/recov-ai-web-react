import type { SiteConfig } from '@/app/auth';

export type SiteProfile = SiteConfig;

export const parseSiteProfile = (value?: SiteConfig): SiteProfile => {
  if (
    !value?.loginVariant?.trim() ||
    !['SELECTABLE', 'FIXED'].includes(value.tenantMode)
  ) {
    throw new Error('站点配置响应不完整。');
  }

  return Object.freeze({
    ...value,
    loginVariant: value.loginVariant.trim(),
    productCode: value.productCode?.trim() || undefined,
    productName: value.productName?.trim() || undefined,
  });
};
