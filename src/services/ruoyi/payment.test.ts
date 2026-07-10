import { ruoyiRequest } from '@/adapters/ruoyi/request';
import {
  createAdminPaymentRefund,
  listAdminPaymentOrders,
  pageAdminPaymentOrders,
  queryAdminPaymentOrder,
} from './payment';

jest.mock('@/adapters/ruoyi/request', () => ({
  ruoyiRequest: jest.fn(),
}));

const mockedRequest = ruoyiRequest as jest.Mock;

describe('admin payment service', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({ code: 200, data: {} });
  });

  it('creates a full refund without accepting a client amount', async () => {
    await createAdminPaymentRefund({
      paymentOrderId: '90071992547409931234',
      idempotencyKey: 'refund-1',
      reason: '客户申请全额退款',
      mockScenario: 'REFUND_SUCCESS',
    });

    const [url, options] = mockedRequest.mock.calls[0];
    expect(url).toBe('/system/payment/admin/refunds');
    expect(options.data.paymentOrderId).toBe('90071992547409931234');
    expect(options.data).not.toHaveProperty('amountFen');
    expect(options.data).not.toHaveProperty('tenantId');
    expect(options.data).not.toHaveProperty('bizType');
  });

  it('queries a payment order through the admin endpoint', async () => {
    await queryAdminPaymentOrder('pay-1');
    expect(mockedRequest.mock.calls[0][0]).toBe(
      '/system/payment/admin/orders/pay-1/query',
    );
  });

  it('unwraps RuoYi TableDataInfo rows without coercing bigint ids', async () => {
    mockedRequest.mockResolvedValue({
      code: 200,
      rows: [{ id: '90071992547409931234', status: 'PENDING' }],
      total: 1,
    });

    await expect(listAdminPaymentOrders()).resolves.toEqual([
      { id: '90071992547409931234', status: 'PENDING' },
    ]);

    await expect(pageAdminPaymentOrders()).resolves.toEqual({
      rows: [{ id: '90071992547409931234', status: 'PENDING' }],
      total: 1,
    });
  });
});
