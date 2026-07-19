import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

(globalThis as typeof globalThis & { React: unknown }).React = React;

const mockListPlatformProducts = jest.fn();
const mockCreatePlatformProduct = jest.fn();
const mockUpdatePlatformProduct = jest.fn();
const mockUpdatePlatformProductStatus = jest.fn();

jest.mock('@/shared/services/product-catalog', () => ({
  listPlatformProducts: (...args: unknown[]) =>
    mockListPlatformProducts(...args),
  createPlatformProduct: (...args: unknown[]) =>
    mockCreatePlatformProduct(...args),
  updatePlatformProduct: (...args: unknown[]) =>
    mockUpdatePlatformProduct(...args),
  updatePlatformProductStatus: (...args: unknown[]) =>
    mockUpdatePlatformProductStatus(...args),
}));

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
  useModel: () => ({
    initialState: {
      currentUser: { roles: ['admin'], permissions: ['*:*:*'] },
    },
  }),
}));

const PlatformProductPage = require('./index').default;

describe('PlatformProductPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListPlatformProducts.mockResolvedValue({
      code: 200,
      msg: '操作成功',
      rows: [],
      total: 0,
    });
    mockCreatePlatformProduct.mockResolvedValue({
      code: 200,
      msg: '操作成功',
      data: { productCode: 'recov' },
    });
  });

  it('创建产品时去除首尾空格并保留小写产品编码', async () => {
    render(<PlatformProductPage />);

    fireEvent.click(await screen.findByRole('button', { name: /新增产品/ }));
    fireEvent.change(await screen.findByLabelText('产品编码'), {
      target: { value: 'RECOV' },
    });
    fireEvent.change(screen.getByLabelText('产品名称'), {
      target: { value: '智能催收' },
    });
    fireEvent.click(screen.getByRole('button', { name: /确.*定/ }));

    expect(
      await screen.findByText(
        '编码需以小写英文字母开头，仅使用小写字母、数字和下划线',
      ),
    ).toBeTruthy();
    expect(mockCreatePlatformProduct).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('产品编码'), {
      target: { value: ' recov ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /确.*定/ }));

    await waitFor(() => expect(mockCreatePlatformProduct).toHaveBeenCalled());
    expect(mockCreatePlatformProduct).toHaveBeenCalledTimes(1);
    const payload = mockCreatePlatformProduct.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({ productCode: 'recov' }));
    expect(payload.productCode).not.toBe('RECOV');
    expect(mockCreatePlatformProduct).not.toHaveBeenCalledWith(
      expect.objectContaining({ productCode: 'RECOV' }),
    );
  });
});
