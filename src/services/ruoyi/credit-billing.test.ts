import { ruoyiRequest } from '@/adapters/ruoyi/request';
import {
  adjustAdminCreditCharge,
  createCreditPackage,
  createScopedCreditPackageOrder,
  getScopedCreditEntitlements,
  getScopedCreditPackageOrder,
  grantAdminCredit,
  issueCreditCoupon,
  listCreditProducts,
  pageCreditAccounts,
  pageScopedCreditPackageOrders,
  saveCreditCouponTemplate,
  updateCreditPackage,
  updateCreditPackageStatus,
} from './credit-billing';

jest.mock('@/adapters/ruoyi/request', () => ({
  ruoyiRequest: jest.fn(),
}));

const mockedRequest = ruoyiRequest as jest.Mock;

describe('scoped credit billing service', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({ code: 200, data: {} });
  });

  it('creates tenant package orders without client supplied ownership or price', async () => {
    await createScopedCreditPackageOrder('tenant', {
      packageId: '2067000010000000001',
      productCode: 'RECOV',
      idempotencyKey: 'tenant-purchase-1',
      couponId: '2067000010000000002',
      remark: '团队购买',
    });

    expect(mockedRequest).toHaveBeenCalledWith(
      '/system/credit/tenant/package-orders',
      expect.objectContaining({
        method: 'post',
        data: {
          packageId: '2067000010000000001',
          productCode: 'RECOV',
          idempotencyKey: 'tenant-purchase-1',
          couponId: '2067000010000000002',
          remark: '团队购买',
        },
      }),
    );
    const payload = mockedRequest.mock.calls[0][1].data;
    expect(payload).not.toHaveProperty('tenantId');
    expect(payload).not.toHaveProperty('ownerId');
    expect(payload).not.toHaveProperty('amountFen');
    expect(payload).not.toHaveProperty('bizType');
  });

  it('creates personal package orders with the caller supplied idempotency key', async () => {
    await createScopedCreditPackageOrder('me', {
      packageId: '2067000010000000003',
      productCode: 'SALES_AGENT',
      idempotencyKey: 'personal-purchase-1',
    });

    expect(mockedRequest).toHaveBeenCalledWith(
      '/system/credit/me/package-orders',
      expect.objectContaining({
        method: 'post',
        data: {
          packageId: '2067000010000000003',
          productCode: 'SALES_AGENT',
          idempotencyKey: 'personal-purchase-1',
        },
      }),
    );
  });

  it('requires explicit product scope for package maintenance and purchase attribution', async () => {
    const payload = {
      packageName: '团队期限包',
      ownerScope: 'TENANT' as const,
      packageKind: 'TERM_POINTS' as const,
      termMonths: 1 as const,
      points: 1000,
      price: 399,
      productCodes: ['RECOV', 'SALES_AGENT'],
    };

    await createCreditPackage(payload);
    expect(mockedRequest.mock.calls.at(-1)?.[1].data.productCodes).toEqual([
      'RECOV',
      'SALES_AGENT',
    ]);

    await updateCreditPackage('package-1', payload);
    expect(mockedRequest.mock.calls.at(-1)?.[0]).toBe(
      '/system/credit/admin/packages/package-1',
    );

    await getScopedCreditEntitlements('me');
    expect(mockedRequest.mock.calls.at(-1)?.[0]).toBe(
      '/system/credit/me/entitlements',
    );
  });

  it('uses the personal order detail endpoint for polling', async () => {
    await getScopedCreditPackageOrder('me', '90071992547409931234');

    expect(mockedRequest).toHaveBeenCalledWith(
      '/system/credit/me/package-orders/90071992547409931234',
      { method: 'get' },
    );
  });

  it('reads paged tenant orders and preserves bigint identifiers as strings', async () => {
    mockedRequest.mockResolvedValue({
      code: 200,
      rows: [
        {
          id: '90071992547409931234',
          payStatus: 'PENDING_PAYMENT',
        },
      ],
      total: 27,
    });

    await expect(
      pageScopedCreditPackageOrders('tenant', { pageNum: 2, pageSize: 10 }),
    ).resolves.toEqual({
      rows: [
        {
          id: '90071992547409931234',
          payStatus: 'PENDING_PAYMENT',
        },
      ],
      total: 27,
    });
    expect(mockedRequest.mock.calls[0][1].params).toEqual({
      pageNum: 2,
      pageSize: 10,
    });
  });

  it('reads admin account TableDataInfo totals from the response root', async () => {
    mockedRequest.mockResolvedValue({
      code: 200,
      rows: [{ id: '90071992547409931234', ownerType: 'TENANT' }],
      total: 101,
    });

    await expect(pageCreditAccounts({ pageNum: 1, pageSize: 10 })).resolves.toEqual({
      rows: [{ id: '90071992547409931234', ownerType: 'TENANT' }],
      total: 101,
    });
  });

  it('uses accountId for admin grants and never submits tenant ownership', async () => {
    await grantAdminCredit({
      accountId: '90071992547409931234',
      points: 100,
      grantType: 'compensation',
      sourceType: 'ADMIN_GRANT',
      sourceId: 'ticket-1',
      remark: '补偿',
    });

    const [url, options] = mockedRequest.mock.calls[0];
    expect(url).toBe('/system/credit/admin/accounts/grants');
    expect(options.data.accountId).toBe('90071992547409931234');
    expect(options.data).not.toHaveProperty('tenantId');
    expect(options.data).not.toHaveProperty('ownerId');
    expect(options.data).not.toHaveProperty('productCode');
    expect(options.data).not.toHaveProperty('expiresAt');
  });

  it('issues coupons with an account and traceable source only', async () => {
    await issueCreditCoupon({
      templateId: 'template-1',
      accountId: '90071992547409931234',
      sourceType: 'direct_issue',
      sourceId: 'campaign-1',
    });

    const [url, options] = mockedRequest.mock.calls[0];
    expect(url).toBe('/system/credit/admin/coupons/issue');
    expect(options.data).toEqual({
      templateId: 'template-1',
      accountId: '90071992547409931234',
      sourceType: 'direct_issue',
      sourceId: 'campaign-1',
    });
    expect(options.data).not.toHaveProperty('remark');
  });

  it('submits bounded charge adjustment facts', async () => {
    await adjustAdminCreditCharge({
      chargeOrderId: 'charge-1',
      adjustmentType: 'REFUND',
      points: 8,
      idempotencyKey: 'adjust-1',
      reason: '业务退点',
    });

    expect(mockedRequest).toHaveBeenCalledWith(
      '/system/credit/admin/charge-orders/adjustments',
      expect.objectContaining({
        data: expect.objectContaining({
          chargeOrderId: 'charge-1',
          points: 8,
        }),
      }),
    );
  });

  it('uses the admin catalog namespace', async () => {
    mockedRequest.mockResolvedValue({ code: 200, data: [] });
    await listCreditProducts();
    expect(mockedRequest.mock.calls[0][0]).toBe(
      '/system/credit/admin/catalog/products',
    );
  });

  it('submits semantic package and coupon status codes', async () => {
    await updateCreditPackageStatus('package-1', {
      packageStatus: 'OFF_SALE',
    });
    expect(mockedRequest.mock.calls[0]).toEqual([
      '/system/credit/admin/packages/package-1/status',
      expect.objectContaining({
        method: 'put',
        data: { packageStatus: 'OFF_SALE' },
      }),
    ]);

    mockedRequest.mockClear();
    await saveCreditCouponTemplate({
      campaignCode: 'campaign-1',
      couponName: '新客券',
      couponType: 'AMOUNT_OFF',
      ownerScope: 'TENANT',
      packageScope: 'ALL',
      receiveMode: 'DIRECT_ISSUE',
      validityType: 'FIXED',
      status: 'ENABLED',
    });

    expect(mockedRequest.mock.calls[0][1].data).toEqual(
      expect.objectContaining({
        packageScope: 'ALL',
        receiveMode: 'DIRECT_ISSUE',
        validityType: 'FIXED',
        status: 'ENABLED',
      }),
    );
  });
});
