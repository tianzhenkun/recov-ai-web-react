import { normalizeProductSiteContract } from './model';

describe('product site contract model', () => {
  it('clears fixedTenantId for a selectable product site', () => {
    expect(
      normalizeProductSiteContract({
        fixedTenantId: 'stale-tenant',
        loginVariant: 'default',
        tenantMode: 'SELECTABLE',
        webClientId: ' web-client ',
      }),
    ).toEqual({
      fixedTenantId: undefined,
      loginVariant: 'default',
      tenantMode: 'SELECTABLE',
      webClientId: 'web-client',
    });
  });

  it('requires fixedTenantId only for a fixed product site', () => {
    expect(
      normalizeProductSiteContract({
        fixedTenantId: ' 720978 ',
        loginVariant: 'sales-login',
        tenantMode: 'FIXED',
      }),
    ).toMatchObject({
      fixedTenantId: '720978',
      tenantMode: 'FIXED',
    });
    expect(() =>
      normalizeProductSiteContract({
        loginVariant: 'default',
        tenantMode: 'FIXED',
      }),
    ).toThrow('固定租户ID');
  });

  it('validates layout code format without treating the current registry as a DB whitelist', () => {
    expect(
      normalizeProductSiteContract({
        loginVariant: 'future-layout',
        tenantMode: 'SELECTABLE',
      }).loginVariant,
    ).toBe('future-layout');
    expect(() =>
      normalizeProductSiteContract({
        loginVariant: 'Future_Layout',
        tenantMode: 'SELECTABLE',
      }),
    ).toThrow('登录布局编码');
  });
});
