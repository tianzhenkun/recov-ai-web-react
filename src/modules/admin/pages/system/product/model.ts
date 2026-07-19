import type { PlatformProductTenantMode } from '@/shared/services/product-catalog';

export const LOGIN_VARIANT_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;

type ProductSiteContractInput = {
  loginVariant?: string;
  tenantMode?: PlatformProductTenantMode;
  fixedTenantId?: string;
  webClientId?: string;
};

export type ProductSiteContract = {
  loginVariant: string;
  tenantMode: PlatformProductTenantMode;
  fixedTenantId?: string;
  webClientId?: string;
};

export const normalizeProductSiteContract = (
  input: ProductSiteContractInput,
): ProductSiteContract => {
  const loginVariant = input.loginVariant?.trim() || '';
  if (
    !LOGIN_VARIANT_PATTERN.test(loginVariant) ||
    loginVariant.toUpperCase() === 'AUTO'
  ) {
    throw new Error(
      '登录布局编码需以小写字母开头，只能包含小写字母、数字和连字符，且不能使用 AUTO。',
    );
  }

  if (input.tenantMode !== 'SELECTABLE' && input.tenantMode !== 'FIXED') {
    throw new Error('请选择租户模式。');
  }

  const fixedTenantId = input.fixedTenantId?.trim() || undefined;
  if (input.tenantMode === 'FIXED' && !fixedTenantId) {
    throw new Error('固定租户模式必须填写固定租户ID。');
  }
  if (fixedTenantId && fixedTenantId.length > 20) {
    throw new Error('固定租户ID不能超过20个字符。');
  }

  const webClientId = input.webClientId?.trim() || undefined;
  if (webClientId && webClientId.length > 64) {
    throw new Error('Web客户端ID不能超过64个字符。');
  }

  return {
    loginVariant,
    tenantMode: input.tenantMode,
    fixedTenantId: input.tenantMode === 'FIXED' ? fixedTenantId : undefined,
    webClientId,
  };
};
