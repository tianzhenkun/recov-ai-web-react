import { parseSiteProfile } from './index';

describe('site profile', () => {
  it('normalizes optional product metadata independently from login layout', () => {
    expect(
      parseSiteProfile({
        loginVariant: ' default ',
        productCode: ' sales ',
        productName: ' Sales Agent ',
        tenantMode: 'FIXED',
      }),
    ).toEqual({
      loginVariant: 'default',
      productCode: 'sales',
      productName: 'Sales Agent',
      tenantMode: 'FIXED',
    });
  });

  it('keeps an empty product code for the public site', () => {
    expect(
      parseSiteProfile({
        loginVariant: 'default',
        productCode: '   ',
        tenantMode: 'SELECTABLE',
      }),
    ).toEqual({
      loginVariant: 'default',
      productCode: undefined,
      productName: undefined,
      tenantMode: 'SELECTABLE',
    });
  });

  it.each([
    'RECOV',
    'SALES_AGENT',
  ])('rejects a non-canonical product code: %s', (productCode) => {
    expect(() =>
      parseSiteProfile({
        loginVariant: 'default',
        productCode,
        tenantMode: 'FIXED',
      }),
    ).toThrow('站点配置');
  });
});
