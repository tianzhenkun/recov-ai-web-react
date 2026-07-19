import { resolveSiteBranding } from './registry';

describe('site branding', () => {
  it('uses a neutral product-independent fallback', () => {
    expect(resolveSiteBranding()).toMatchObject({
      logo: '/brand/lingchen-icon.png',
      title: 'LingChen AI',
    });
  });

  it('uses the site product name without binding productCode to branding', () => {
    expect(
      resolveSiteBranding({
        loginVariant: 'default',
        productCode: 'SALES_AGENT',
        productName: 'Sales Agent',
        tenantMode: 'FIXED',
      }),
    ).toMatchObject({ title: 'Sales Agent' });
  });
});
