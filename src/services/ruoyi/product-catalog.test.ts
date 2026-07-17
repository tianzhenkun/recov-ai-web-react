import { ruoyiRequest } from '@/adapters/ruoyi/request';
import {
  createPlatformProduct,
  getPlatformProduct,
  listEnabledPlatformProducts,
  listPlatformProducts,
  updatePlatformProduct,
  updatePlatformProductStatus,
} from './product-catalog';

jest.mock('@/adapters/ruoyi/request', () => ({
  ruoyiRequest: jest.fn(),
}));

const mockedRequest = ruoyiRequest as jest.Mock;

describe('platform product catalog service', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({ code: 200, data: {} });
  });

  it('uses the neutral public product catalog endpoints', async () => {
    await listPlatformProducts({ keyword: 'RECOV', status: '0' });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/product-catalog/list',
      expect.objectContaining({
        method: 'get',
        params: { keyword: 'RECOV', status: '0' },
      }),
    );

    await listEnabledPlatformProducts();
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/product-catalog/options',
      { method: 'get' },
    );

    await getPlatformProduct('101');
    expect(mockedRequest.mock.calls.at(-1)?.[0]).toBe(
      '/system/product-catalog/101',
    );
  });

  it('separates identity editing from the explicit status transition', async () => {
    await createPlatformProduct({
      productCode: 'RECOV',
      productName: '智能催收',
      status: '0',
    });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/product-catalog',
      expect.objectContaining({ method: 'post' }),
    );

    await updatePlatformProduct('101', {
      productName: '智能催收',
      remark: '公共产品',
    });
    expect(mockedRequest.mock.calls.at(-1)?.[0]).toBe(
      '/system/product-catalog/101',
    );
    expect(mockedRequest.mock.calls.at(-1)?.[1].data).not.toHaveProperty(
      'status',
    );

    await updatePlatformProductStatus('101', { status: '1' });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/product-catalog/101/status',
      expect.objectContaining({ method: 'put', data: { status: '1' } }),
    );
  });
});
