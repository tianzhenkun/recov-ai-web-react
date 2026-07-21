import type { SiteConfig } from '@/app/auth';

export type SiteProfile = SiteConfig;

export const parseSiteProfile = (value?: SiteConfig): SiteProfile => {
  if (
    !value?.loginVariant?.trim() ||
    !['PLATFORM', 'PRODUCT'].includes(value.portalScope) ||
    !['SELECTABLE', 'FIXED'].includes(value.tenantMode)
  ) {
    throw new Error('站点配置响应不完整。');
  }

  const productCode = value.productCode?.trim() || undefined;
  if (productCode && !/^[a-z][a-z0-9_]{1,63}$/.test(productCode)) {
    throw new Error('站点配置响应的产品编码格式不正确。');
  }
  if (
    (value.portalScope === 'PLATFORM' &&
      (productCode || value.tenantMode !== 'FIXED')) ||
    (value.portalScope === 'PRODUCT' && !productCode)
  ) {
    throw new Error('站点配置响应的入口范围组合不正确。');
  }

  return Object.freeze({
    loginVariant: value.loginVariant.trim(),
    portalScope: value.portalScope,
    productCode,
    productName: value.productName?.trim() || undefined,
    tenantMode: value.tenantMode,
  });
};
