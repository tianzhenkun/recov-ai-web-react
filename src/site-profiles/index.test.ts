import { parseSiteProfile } from './index';

describe('site profile', () => {
  it('normalizes optional product metadata independently from login layout', () => {
    expect(
      parseSiteProfile({
        loginVariant: ' default ',
        productCode: ' SALES_AGENT ',
        productName: ' Sales Agent ',
        tenantMode: 'FIXED',
      }),
    ).toEqual({
      loginVariant: 'default',
      productCode: 'SALES_AGENT',
      productName: 'Sales Agent',
      tenantMode: 'FIXED',
    });
  });
});
