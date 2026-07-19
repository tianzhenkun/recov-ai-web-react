import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

(globalThis as typeof globalThis & { React: unknown }).React = React;

const mockListLicenseProducts = jest.fn();
const mockCreateLicenseProduct = jest.fn();
const mockUpdateLicenseProduct = jest.fn();
const mockListLicenseProductRoutes = jest.fn();
const mockCreateLicenseProductRoute = jest.fn();
const mockUpdateLicenseProductRoute = jest.fn();

jest.mock('@/modules/admin/services/license', () => ({
  listLicenseProducts: (...args: unknown[]) => mockListLicenseProducts(...args),
  createLicenseProduct: (...args: unknown[]) =>
    mockCreateLicenseProduct(...args),
  updateLicenseProduct: (...args: unknown[]) =>
    mockUpdateLicenseProduct(...args),
  listLicenseProductRoutes: (...args: unknown[]) =>
    mockListLicenseProductRoutes(...args),
  createLicenseProductRoute: (...args: unknown[]) =>
    mockCreateLicenseProductRoute(...args),
  updateLicenseProductRoute: (...args: unknown[]) =>
    mockUpdateLicenseProductRoute(...args),
}));

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
  useModel: () => ({
    initialState: {
      currentUser: { roles: ['admin'], permissions: ['*:*:*'] },
    },
  }),
}));

const ProductManagement = require('./ProductManagement').default;

describe('ProductManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListLicenseProducts.mockResolvedValue({
      code: 200,
      msg: '操作成功',
      rows: [],
      total: 0,
    });
    mockCreateLicenseProduct.mockResolvedValue({
      code: 200,
      msg: '操作成功',
      data: { productCode: 'sales' },
    });
    mockListLicenseProductRoutes.mockResolvedValue({
      code: 200,
      msg: '操作成功',
      data: [],
    });
  });

  it('创建许可证产品时去除首尾空格并保留小写产品编码', async () => {
    render(<ProductManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /新增产品/ }));
    fireEvent.change(await screen.findByLabelText('产品编码'), {
      target: { value: 'SALES' },
    });
    fireEvent.change(screen.getByLabelText('产品名称'), {
      target: { value: '智能销售' },
    });
    fireEvent.click(screen.getByRole('button', { name: '确 认' }));

    expect(
      await screen.findByText(
        '编码需以小写英文字母开头，仅使用小写字母、数字和下划线',
      ),
    ).toBeTruthy();
    expect(mockCreateLicenseProduct).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('产品编码'), {
      target: { value: ' sales ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '确 认' }));

    await waitFor(() => expect(mockCreateLicenseProduct).toHaveBeenCalled());
    expect(mockCreateLicenseProduct).toHaveBeenCalledTimes(1);
    const payload = mockCreateLicenseProduct.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({ productCode: 'sales' }));
    expect(payload.productCode).not.toBe('SALES');
    expect(mockCreateLicenseProduct).not.toHaveBeenCalledWith(
      expect.objectContaining({ productCode: 'SALES' }),
    );
  });
});
