import { parseSiteProfile } from './index';

describe('site profile', () => {
  it('normalizes optional product metadata independently from login layout', () => {
    expect(
      parseSiteProfile({
        loginVariant: ' default ',
        portalScope: 'PRODUCT',
        productCode: ' sales ',
        productName: ' Sales Agent ',
        tenantMode: 'FIXED',
      }),
    ).toEqual({
      loginVariant: 'default',
      portalScope: 'PRODUCT',
      productCode: 'sales',
      productName: 'Sales Agent',
      tenantMode: 'FIXED',
    });
  });

  it('accepts a fixed platform portal without a product code', () => {
    const profile = parseSiteProfile({
      loginVariant: 'default',
      portalScope: 'PLATFORM',
      productCode: '   ',
      tenantMode: 'FIXED',
      fixedTenantId: '000000',
    } as Parameters<typeof parseSiteProfile>[0] & { fixedTenantId: string });

    expect(profile).toEqual({
      loginVariant: 'default',
      portalScope: 'PLATFORM',
      productCode: undefined,
      productName: undefined,
      tenantMode: 'FIXED',
    });
    expect(profile).not.toHaveProperty('fixedTenantId');
  });

  it.each([
    ['PLATFORM', 'recov', 'FIXED'],
    ['PLATFORM', '', 'SELECTABLE'],
    ['PRODUCT', '', 'FIXED'],
    ['UNKNOWN', 'recov', 'FIXED'],
  ])('rejects an invalid portal combination: %s / %s / %s', (portalScope, productCode, tenantMode) => {
    expect(() =>
      parseSiteProfile({
        loginVariant: 'default',
        portalScope: portalScope as 'PLATFORM' | 'PRODUCT',
        productCode,
        tenantMode: tenantMode as 'SELECTABLE' | 'FIXED',
      }),
    ).toThrow('站点配置');
  });

  it.each([
    'RECOV',
    'SALES_AGENT',
  ])('rejects a non-canonical product code: %s', (productCode) => {
    expect(() =>
      parseSiteProfile({
        loginVariant: 'default',
        portalScope: 'PRODUCT',
        productCode,
        tenantMode: 'FIXED',
      }),
    ).toThrow('站点配置');
  });
});
