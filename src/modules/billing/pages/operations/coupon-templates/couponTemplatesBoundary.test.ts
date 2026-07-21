import fs from 'node:fs';
import path from 'node:path';

const pagePath = path.join(__dirname, 'index.tsx');
const servicePath = path.join(__dirname, '../../../services/credit-billing.ts');
const permissionsPath = path.join(__dirname, '../../../permissions.ts');
const legacyModulePagePath = path.join(__dirname, '../coupons/index.tsx');
const legacyPageEntryPath = path.join(
  __dirname,
  '../../../../../pages/billing/operations/coupons/index.tsx',
);

describe('platform coupon template page boundary', () => {
  it('has a dedicated page that excludes coupon issuance and tenant coupon queries', () => {
    expect(fs.existsSync(pagePath)).toBe(true);
    if (!fs.existsSync(pagePath)) return;

    const source = fs.readFileSync(pagePath, 'utf8');
    expect(source).toContain('listCreditCouponTemplates');
    expect(source).toContain('saveCreditCouponTemplate');
    expect(source).toContain('listCreditPackages');
    expect(source).not.toContain('pageCreditCoupons');
    expect(source).not.toContain('issueCreditCoupon');
    expect(source).not.toContain('adminCouponIssue');
    expect(source).not.toContain('派发优惠券');
  });

  it('removes obsolete admin coupon issuance while retaining self-claim capability', () => {
    const serviceSource = fs.readFileSync(servicePath, 'utf8');
    const permissionsSource = fs.readFileSync(permissionsPath, 'utf8');

    expect(serviceSource).not.toContain('CreditCouponIssuePayload');
    expect(serviceSource).not.toContain('issueCreditCoupon');
    expect(serviceSource).not.toContain('/coupons/issue');
    expect(serviceSource).toContain('claimScopedCreditCoupon');
    expect(permissionsSource).not.toContain('adminCouponIssue');
    expect(permissionsSource).not.toContain('credit:admin:coupon:issue');
    expect(permissionsSource).toContain('adminCouponList');
    expect(permissionsSource).toContain('adminCouponEdit');
    expect(fs.existsSync(legacyModulePagePath)).toBe(false);
    expect(fs.existsSync(legacyPageEntryPath)).toBe(false);
  });
});
