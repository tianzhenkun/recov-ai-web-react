import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import React from 'react';

(globalThis as typeof globalThis & { React: unknown }).React = React;

const mockListCreditProducts = jest.fn();
const mockListCreditMeterScenarios = jest.fn();
const mockListCreditPricingRules = jest.fn();
const mockSaveCreditProduct = jest.fn();
const mockSaveCreditMeterScenario = jest.fn();
const mockSaveCreditPricingRule = jest.fn();
const mockListEnabledPlatformProducts = jest.fn();

jest.mock('@/modules/billing/services/credit-billing', () => ({
  listCreditProducts: (...args: unknown[]) => mockListCreditProducts(...args),
  listCreditMeterScenarios: (...args: unknown[]) =>
    mockListCreditMeterScenarios(...args),
  listCreditPricingRules: (...args: unknown[]) =>
    mockListCreditPricingRules(...args),
  saveCreditProduct: (...args: unknown[]) => mockSaveCreditProduct(...args),
  saveCreditMeterScenario: (...args: unknown[]) =>
    mockSaveCreditMeterScenario(...args),
  saveCreditPricingRule: (...args: unknown[]) =>
    mockSaveCreditPricingRule(...args),
}));

jest.mock('@/shared/services/product-catalog', () => ({
  listEnabledPlatformProducts: (...args: unknown[]) =>
    mockListEnabledPlatformProducts(...args),
}));

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
  useModel: () => ({
    initialState: {
      currentUser: {
        roles: ['admin'],
        permissions: ['*:*:*'],
        rawUser: { tenantId: '000000' },
      },
      dynamicTenantId: '000000',
    },
  }),
}));

const CreditRulePage = require('./index').default;

describe('CreditRulePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListCreditProducts.mockResolvedValue([]);
    mockListCreditMeterScenarios.mockResolvedValue([]);
    mockListCreditPricingRules.mockResolvedValue([]);
    mockSaveCreditProduct.mockResolvedValue({ productCode: 'recov' });
    mockListEnabledPlatformProducts.mockResolvedValue({
      code: 200,
      msg: '操作成功',
      data: [
        {
          id: '1',
          productCode: 'recov',
          productName: '智能催收',
          loginVariant: 'default',
          tenantMode: 'SELECTABLE',
          status: '0',
        },
      ],
    });
  });

  it('从平台产品选择后按原样保存小写产品编码', async () => {
    render(<CreditRulePage />);

    fireEvent.click(
      await screen.findByRole('button', { name: /新增计量产品/ }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: '新增计量产品',
    });
    const productSelect = within(dialog).getByLabelText('产品编码');
    fireEvent.mouseDown(productSelect);
    fireEvent.click(await screen.findByText('智能催收 · recov'));
    fireEvent.click(within(dialog).getByRole('button', { name: /保.*存/ }));

    await waitFor(() => expect(mockSaveCreditProduct).toHaveBeenCalled());
    expect(mockSaveCreditProduct).toHaveBeenCalledTimes(1);
    const payload = mockSaveCreditProduct.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({ productCode: 'recov' }));
    expect(payload.productCode).not.toBe('RECOV');
    expect(mockSaveCreditProduct).not.toHaveBeenCalledWith(
      expect.objectContaining({ productCode: 'RECOV' }),
    );
  });
});
