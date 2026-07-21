import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';

(globalThis as typeof globalThis & { React: unknown }).React = React;

const mockClaimScopedCreditCoupon = jest.fn();
const mockCreateScopedCreditPackageOrder = jest.fn();
const mockGetScopedCreditAccount = jest.fn();
const mockGetScopedCreditEntitlements = jest.fn();
const mockGetScopedCreditPackageOrder = jest.fn();
const mockListScopedClaimableCouponTemplates = jest.fn();
const mockListScopedCreditCoupons = jest.fn();
const mockListScopedCreditGrants = jest.fn();
const mockListScopedCreditPackages = jest.fn();
const mockPageScopedCreditCoupons = jest.fn();
const mockPageScopedCreditLedgers = jest.fn();
const mockPageScopedCreditPackageOrders = jest.fn();
const mockRetryScopedCreditPackagePayment = jest.fn();

const mockInitialState = {
  currentUser: {
    roles: ['admin'],
    permissions: ['*:*:*'],
    rawUser: { tenantId: '720978' },
  },
  dynamicTenantId: '720978',
  tenantSwitchVersion: 0,
};

jest.mock('@umijs/max', () => ({
  useModel: () => ({
    initialState: mockInitialState,
  }),
}));

jest.mock('@/modules/billing/services/credit-billing', () => ({
  claimScopedCreditCoupon: (...args: unknown[]) =>
    mockClaimScopedCreditCoupon(...args),
  createScopedCreditPackageOrder: (...args: unknown[]) =>
    mockCreateScopedCreditPackageOrder(...args),
  getScopedCreditAccount: (...args: unknown[]) =>
    mockGetScopedCreditAccount(...args),
  getScopedCreditEntitlements: (...args: unknown[]) =>
    mockGetScopedCreditEntitlements(...args),
  getScopedCreditPackageOrder: (...args: unknown[]) =>
    mockGetScopedCreditPackageOrder(...args),
  listScopedClaimableCouponTemplates: (...args: unknown[]) =>
    mockListScopedClaimableCouponTemplates(...args),
  listScopedCreditCoupons: (...args: unknown[]) =>
    mockListScopedCreditCoupons(...args),
  listScopedCreditGrants: (...args: unknown[]) =>
    mockListScopedCreditGrants(...args),
  listScopedCreditPackages: (...args: unknown[]) =>
    mockListScopedCreditPackages(...args),
  pageScopedCreditCoupons: (...args: unknown[]) =>
    mockPageScopedCreditCoupons(...args),
  pageScopedCreditLedgers: (...args: unknown[]) =>
    mockPageScopedCreditLedgers(...args),
  pageScopedCreditPackageOrders: (...args: unknown[]) =>
    mockPageScopedCreditPackageOrders(...args),
  retryScopedCreditPackagePayment: (...args: unknown[]) =>
    mockRetryScopedCreditPackagePayment(...args),
}));

const { CreditWorkspace } = require('./CreditWorkspace');

const packageRecord = {
  id: 'package-1',
  packageName: '测试套餐',
  ownerScope: 'USER',
  packageKind: 'FIXED_POINTS',
  points: 1_000,
  price: 99,
  status: 'ON_SALE',
  products: [{ productCode: 'recov', productName: '智能催收' }],
};

const retryableOrder = {
  id: 'order-1',
  orderNo: 'ORDER-1',
  packageId: 'package-1',
  packageNameSnapshot: '测试套餐',
  packageKindSnapshot: 'FIXED_POINTS',
  productCode: 'recov',
  productNameSnapshot: '智能催收',
  points: 1_000,
  packagePrice: 99,
  payAmount: 99,
  payStatus: 'PENDING_PAYMENT',
  paymentStatus: 'FAILED',
};

const pendingOrder = {
  ...retryableOrder,
  paymentOrderId: 'payment-1',
  paymentStatus: 'PENDING',
};

const claimableCoupon = {
  id: 'coupon-template-1',
  couponName: '测试优惠券',
  couponType: 'AMOUNT_OFF',
  discountAmount: 10,
  receiveMode: 'SELF_CLAIM',
  ownerScope: 'USER',
  packageScope: 'ALL',
  validityType: 'AFTER_RECEIVE',
  validDays: 30,
  status: 'ENABLED',
};

const setupReadModels = () => {
  mockGetScopedCreditAccount.mockResolvedValue({
    id: 'account-1',
    ownerType: 'USER',
    ownerId: 'user-1',
    availablePoints: 100,
    outstandingPoints: 0,
    totalGrantedPoints: 100,
    totalChargedPoints: 0,
    totalSettledPoints: 0,
    totalRefundedPoints: 0,
    status: 'NORMAL',
  });
  mockGetScopedCreditEntitlements.mockResolvedValue({
    accountId: 'account-1',
    ownerType: 'USER',
    ownerId: 'user-1',
    fixedPoints: { totalPoints: 100, remainingPoints: 100 },
    products: [],
  });
  mockListScopedCreditGrants.mockResolvedValue([]);
  mockListScopedCreditPackages.mockResolvedValue([packageRecord]);
  mockPageScopedCreditPackageOrders.mockResolvedValue({
    rows: [retryableOrder],
    total: 1,
  });
  mockPageScopedCreditCoupons.mockResolvedValue({ rows: [], total: 0 });
  mockListScopedClaimableCouponTemplates.mockResolvedValue([claimableCoupon]);
  mockPageScopedCreditLedgers.mockResolvedValue({ rows: [], total: 0 });
  mockListScopedCreditCoupons.mockResolvedValue([]);
  mockGetScopedCreditPackageOrder.mockResolvedValue(retryableOrder);
};

describe('CreditWorkspace runtime request isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialState.dynamicTenantId = '720978';
    mockInitialState.tenantSwitchVersion = 0;
    setupReadModels();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads the workspace and enables business actions without a capability preflight', async () => {
    render(<CreditWorkspace scope="me" initialTab="packages" />);

    const purchaseButton = await screen.findByRole('button', {
      name: /购\s*买/,
    });
    expect((purchaseButton as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(/Billing 服务|业务能力|正在确认/)).toBeNull();

    fireEvent.click(purchaseButton);

    expect(await screen.findByText('购买测试套餐')).toBeTruthy();
    expect(mockListScopedCreditCoupons).toHaveBeenCalledWith('me', {
      packageId: 'package-1',
      status: 'UNUSED',
      pageNum: 1,
      pageSize: 100,
    });
  });

  it('keeps the page frame and refresh entry when every initial read API rejects', async () => {
    const unavailable = new Error('billing unavailable');
    mockGetScopedCreditAccount.mockRejectedValue(unavailable);
    mockGetScopedCreditEntitlements.mockRejectedValue(unavailable);
    mockListScopedCreditGrants.mockRejectedValue(unavailable);
    mockListScopedCreditPackages.mockRejectedValue(unavailable);
    mockPageScopedCreditPackageOrders.mockRejectedValue(unavailable);
    mockPageScopedCreditCoupons.mockRejectedValue(unavailable);
    mockListScopedClaimableCouponTemplates.mockRejectedValue(unavailable);
    mockPageScopedCreditLedgers.mockRejectedValue(unavailable);

    render(
      <AntdApp>
        <CreditWorkspace scope="me" />
      </AntdApp>,
    );

    expect(screen.getByText('个人权益')).toBeTruthy();
    const refreshButton = screen.getByRole('button', { name: /刷\s*新/ });
    expect(refreshButton).toBeTruthy();
    await waitFor(() =>
      expect(refreshButton.classList.contains('ant-btn-loading')).toBe(false),
    );
    expect(screen.getByRole('tab', { name: /权益概览/ })).toBeTruthy();
    expect(screen.queryByText(/Billing 服务|业务能力|正在确认/)).toBeNull();
  });

  it('keeps payment polling active without a capability preflight', async () => {
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    mockPageScopedCreditPackageOrders.mockResolvedValue({
      rows: [pendingOrder],
      total: 1,
    });
    mockGetScopedCreditPackageOrder.mockResolvedValue(pendingOrder);

    render(<CreditWorkspace scope="me" initialTab="orders" />);

    fireEvent.click(await screen.findByRole('button', { name: /详\s*情/ }));
    expect(await screen.findByText(/每 3 秒自动刷新/)).toBeTruthy();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 3_000);
  });

  it('does not let a late detail response from closed order A overwrite opened order B', async () => {
    let resolveOrderADetail: (value: typeof retryableOrder) => void = () => {};
    const orderADetailRequest = new Promise<typeof retryableOrder>(
      (resolve) => {
        resolveOrderADetail = resolve;
      },
    );
    const orderB = {
      ...retryableOrder,
      id: 'order-2',
      orderNo: 'ORDER-2',
    };
    mockPageScopedCreditPackageOrders.mockResolvedValue({
      rows: [retryableOrder, orderB],
      total: 2,
    });
    mockGetScopedCreditPackageOrder
      .mockImplementationOnce(() => orderADetailRequest)
      .mockResolvedValueOnce(orderB);

    render(<CreditWorkspace scope="me" initialTab="orders" />);

    await screen.findAllByRole('button', { name: /详\s*情/ });
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: /刷\s*新/ })
          .classList.contains('ant-btn-loading'),
      ).toBe(false),
    );
    const detailButtons = screen.getAllByRole('button', { name: /详\s*情/ });
    expect(detailButtons).toHaveLength(2);
    expect(detailButtons[0].isConnected).toBe(true);
    fireEvent.click(detailButtons[0]);
    await waitFor(() =>
      expect(mockGetScopedCreditPackageOrder).toHaveBeenCalledWith(
        'me',
        'order-1',
      ),
    );
    const orderADialog = await screen.findByRole('dialog');
    expect(within(orderADialog).getByText('ORDER-1')).toBeTruthy();
    fireEvent.click(
      within(orderADialog).getByRole('button', { name: 'Close' }),
    );

    fireEvent.click(detailButtons[1]);
    const orderBDialog = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(within(orderBDialog).getByText('ORDER-2')).toBeTruthy(),
    );

    await act(async () => {
      resolveOrderADetail(retryableOrder);
      await orderADetailRequest;
    });

    expect(within(orderBDialog).getByText('ORDER-2')).toBeTruthy();
    expect(within(orderBDialog).queryByText('ORDER-1')).toBeNull();
  });

  it('finishes a coupon claim even when another modal interaction starts', async () => {
    let resolveClaim: () => void = () => {};
    const claimRequest = new Promise<void>((resolve) => {
      resolveClaim = resolve;
    });
    mockClaimScopedCreditCoupon.mockReturnValue(claimRequest);

    render(
      <AntdApp>
        <CreditWorkspace scope="me" initialTab="coupons" />
      </AntdApp>,
    );

    const claimButton = await screen.findByRole('button', {
      name: /领\s*取/,
    });
    fireEvent.click(claimButton);
    await waitFor(() =>
      expect(mockClaimScopedCreditCoupon).toHaveBeenCalledWith(
        'me',
        'coupon-template-1',
      ),
    );
    expect(claimButton.classList.contains('ant-btn-loading')).toBe(true);

    fireEvent.click(screen.getByRole('tab', { name: /套餐与充值/ }));
    fireEvent.click(await screen.findByRole('button', { name: /购\s*买/ }));
    const purchaseDialog = await screen.findByRole('dialog');
    fireEvent.click(
      within(purchaseDialog).getByRole('button', { name: 'Close' }),
    );

    await act(async () => {
      resolveClaim();
      await claimRequest;
    });

    fireEvent.click(screen.getByRole('tab', { name: /我的优惠券/ }));
    const settledClaimButton = await screen.findByRole('button', {
      name: /领\s*取/,
    });
    await waitFor(() =>
      expect(settledClaimButton.classList.contains('ant-btn-loading')).toBe(
        false,
      ),
    );
  });

  it('keeps a submitted purchase intent locked until create order settles', async () => {
    let resolveCreate: (value: typeof retryableOrder) => void = () => {};
    const createRequest = new Promise<typeof retryableOrder>((resolve) => {
      resolveCreate = resolve;
    });
    mockCreateScopedCreditPackageOrder.mockReturnValue(createRequest);

    render(
      <AntdApp>
        <CreditWorkspace scope="me" initialTab="packages" />
      </AntdApp>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /购\s*买/ }));
    const purchaseDialog = await screen.findByRole('dialog');
    fireEvent.click(
      within(purchaseDialog).getByRole('button', { name: /创建订单/ }),
    );

    await waitFor(() =>
      expect(mockCreateScopedCreditPackageOrder).toHaveBeenCalledTimes(1),
    );
    expect(
      mockCreateScopedCreditPackageOrder.mock.calls[0][1].idempotencyKey,
    ).toEqual(expect.any(String));
    await waitFor(() =>
      expect(
        within(purchaseDialog).queryByRole('button', { name: 'Close' }),
      ).toBeNull(),
    );

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(screen.getByText('购买测试套餐')).toBeTruthy();

    await act(async () => {
      resolveCreate(retryableOrder);
      await createRequest;
    });

    expect(mockCreateScopedCreditPackageOrder).toHaveBeenCalledTimes(1);
    const orderDialog = await screen.findByRole('dialog');
    expect(within(orderDialog).getByText('ORDER-1')).toBeTruthy();
  });

  it('updates order A after retry without overwriting the currently opened order B', async () => {
    let resolveRetry: (value: typeof retryableOrder) => void = () => {};
    const retryRequest = new Promise<typeof retryableOrder>((resolve) => {
      resolveRetry = resolve;
    });
    const orderB = {
      ...retryableOrder,
      id: 'order-2',
      orderNo: 'ORDER-2',
    };
    mockPageScopedCreditPackageOrders.mockResolvedValue({
      rows: [retryableOrder, orderB],
      total: 2,
    });
    mockGetScopedCreditPackageOrder
      .mockResolvedValueOnce(retryableOrder)
      .mockResolvedValueOnce(orderB);
    mockRetryScopedCreditPackagePayment.mockReturnValue(retryRequest);

    render(
      <AntdApp>
        <CreditWorkspace scope="me" initialTab="orders" />
      </AntdApp>,
    );

    const detailButtons = await screen.findAllByRole('button', {
      name: /详\s*情/,
    });
    fireEvent.click(detailButtons[0]);
    const orderADialog = await screen.findByRole('dialog');
    fireEvent.click(
      within(orderADialog).getByRole('button', {
        name: /重新获取支付二维码/,
      }),
    );
    await waitFor(() =>
      expect(mockRetryScopedCreditPackagePayment).toHaveBeenCalledWith(
        'me',
        'order-1',
      ),
    );
    fireEvent.click(
      within(orderADialog).getByRole('button', { name: 'Close' }),
    );

    fireEvent.click(detailButtons[1]);
    const orderBDialog = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(within(orderBDialog).getByText('ORDER-2')).toBeTruthy(),
    );

    await act(async () => {
      resolveRetry({ ...retryableOrder, paymentStatus: 'PENDING' });
      await retryRequest;
    });

    expect(within(orderBDialog).getByText('ORDER-2')).toBeTruthy();
    expect(within(orderBDialog).queryByText('ORDER-1')).toBeNull();
  });

  it('keeps the latest poll response when two reads finish out of order', async () => {
    let intervalCallback: (() => void) | undefined;
    jest.spyOn(window, 'setInterval').mockImplementation((callback, delay) => {
      if (delay === 3_000) intervalCallback = callback as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    });
    let resolveOlderPoll: (value: typeof pendingOrder) => void = () => {};
    let resolveNewerPoll: (value: typeof pendingOrder) => void = () => {};
    const olderPoll = new Promise<typeof pendingOrder>((resolve) => {
      resolveOlderPoll = resolve;
    });
    const newerPoll = new Promise<typeof pendingOrder>((resolve) => {
      resolveNewerPoll = resolve;
    });
    mockPageScopedCreditPackageOrders.mockResolvedValue({
      rows: [pendingOrder],
      total: 1,
    });
    mockGetScopedCreditPackageOrder
      .mockResolvedValueOnce(pendingOrder)
      .mockReturnValueOnce(olderPoll)
      .mockReturnValueOnce(newerPoll);

    render(<CreditWorkspace scope="me" initialTab="orders" />);

    fireEvent.click(await screen.findByRole('button', { name: /详\s*情/ }));
    const orderDialog = await screen.findByRole('dialog');
    await waitFor(() => expect(intervalCallback).toEqual(expect.any(Function)));

    act(() => intervalCallback?.());
    await waitFor(() =>
      expect(mockGetScopedCreditPackageOrder).toHaveBeenCalledTimes(2),
    );
    act(() => intervalCallback?.());
    await waitFor(() =>
      expect(mockGetScopedCreditPackageOrder).toHaveBeenCalledTimes(3),
    );

    await act(async () => {
      resolveNewerPoll({ ...pendingOrder, orderNo: 'ORDER-LATEST' });
      await newerPoll;
    });
    expect(within(orderDialog).getByText('ORDER-LATEST')).toBeTruthy();

    await act(async () => {
      resolveOlderPoll({ ...pendingOrder, orderNo: 'ORDER-STALE' });
      await olderPoll;
    });
    expect(within(orderDialog).getByText('ORDER-LATEST')).toBeTruthy();
    expect(within(orderDialog).queryByText('ORDER-STALE')).toBeNull();
  });

  it('drops stale tenant requests and never reopens an old tenant order', async () => {
    let resolveOldOrder: (value: typeof retryableOrder) => void = () => {};
    const oldOrderRequest = new Promise<typeof retryableOrder>((resolve) => {
      resolveOldOrder = resolve;
    });
    const nextOrder = {
      ...retryableOrder,
      id: 'order-2',
      orderNo: 'ORDER-2',
    };
    mockPageScopedCreditPackageOrders
      .mockResolvedValueOnce({ rows: [retryableOrder], total: 1 })
      .mockResolvedValue({ rows: [nextOrder], total: 1 });
    mockGetScopedCreditPackageOrder
      .mockImplementationOnce(() => oldOrderRequest)
      .mockResolvedValue(nextOrder);

    const { rerender } = render(
      <CreditWorkspace scope="me" initialTab="orders" />,
    );

    fireEvent.click(await screen.findByRole('button', { name: /详\s*情/ }));
    await screen.findByText('套餐订单');

    mockInitialState.dynamicTenantId = '720979';
    mockInitialState.tenantSwitchVersion = 1;
    rerender(<CreditWorkspace scope="me" initialTab="orders" />);

    expect(await screen.findByText('ORDER-2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /详\s*情/ }));
    await waitFor(() =>
      expect(mockGetScopedCreditPackageOrder).toHaveBeenCalledWith(
        'me',
        'order-2',
      ),
    );
    expect(await screen.findByText('套餐订单')).toBeTruthy();
    expect(screen.getAllByText('ORDER-2').length).toBeGreaterThanOrEqual(2);

    await act(async () => {
      resolveOldOrder(retryableOrder);
      await oldOrderRequest;
    });

    expect(screen.queryByText('ORDER-1')).toBeNull();
    expect(screen.getAllByText('ORDER-2').length).toBeGreaterThanOrEqual(2);
  });

  it('clears old tenant data while the next tenant request is pending', async () => {
    let resolveNextOrders: (value: {
      rows: (typeof retryableOrder)[];
      total: number;
    }) => void = () => {};
    const nextOrders = new Promise<{
      rows: (typeof retryableOrder)[];
      total: number;
    }>((resolve) => {
      resolveNextOrders = resolve;
    });
    mockPageScopedCreditPackageOrders
      .mockResolvedValueOnce({ rows: [retryableOrder], total: 1 })
      .mockReturnValueOnce(nextOrders);

    const { rerender } = render(
      <CreditWorkspace scope="me" initialTab="orders" />,
    );

    expect(await screen.findByText('ORDER-1')).toBeTruthy();

    mockInitialState.dynamicTenantId = '720979';
    mockInitialState.tenantSwitchVersion = 1;
    rerender(<CreditWorkspace scope="me" initialTab="orders" />);

    expect(screen.queryByText('ORDER-1')).toBeNull();
    await waitFor(() =>
      expect(mockPageScopedCreditPackageOrders).toHaveBeenCalledTimes(2),
    );
    expect(
      screen
        .getByRole('button', { name: /刷\s*新/ })
        .classList.contains('ant-btn-loading'),
    ).toBe(true);

    await act(async () => {
      resolveNextOrders({ rows: [], total: 0 });
      await nextOrders;
    });
    expect(screen.queryByText('ORDER-1')).toBeNull();
  });

  it('drops an older workspace refresh after the tenant generation advances', async () => {
    let resolveOldPackages: (value: (typeof packageRecord)[]) => void =
      () => {};
    let resolveNewPackages: (value: (typeof packageRecord)[]) => void =
      () => {};
    const oldPackagesRequest = new Promise<(typeof packageRecord)[]>(
      (resolve) => {
        resolveOldPackages = resolve;
      },
    );
    const newPackagesRequest = new Promise<(typeof packageRecord)[]>(
      (resolve) => {
        resolveNewPackages = resolve;
      },
    );
    const oldPackage = {
      ...packageRecord,
      id: 'package-old',
      packageName: '旧套餐',
    };
    const newPackage = {
      ...packageRecord,
      id: 'package-new',
      packageName: '新套餐',
    };
    mockListScopedCreditPackages
      .mockReset()
      .mockReturnValueOnce(oldPackagesRequest)
      .mockReturnValueOnce(newPackagesRequest);

    const { rerender } = render(
      <CreditWorkspace scope="me" initialTab="packages" />,
    );

    await waitFor(() =>
      expect(mockListScopedCreditPackages).toHaveBeenCalledTimes(1),
    );
    mockInitialState.dynamicTenantId = '720979';
    mockInitialState.tenantSwitchVersion = 1;
    rerender(<CreditWorkspace scope="me" initialTab="packages" />);
    await waitFor(() =>
      expect(mockListScopedCreditPackages).toHaveBeenCalledTimes(2),
    );

    await act(async () => {
      resolveOldPackages([oldPackage]);
      await oldPackagesRequest;
    });

    expect(screen.queryByText('旧套餐')).toBeNull();
    expect(
      screen
        .getByRole('button', { name: /刷\s*新/ })
        .classList.contains('ant-btn-loading'),
    ).toBe(true);

    await act(async () => {
      resolveNewPackages([newPackage]);
      await newPackagesRequest;
    });

    expect(await screen.findByText('新套餐')).toBeTruthy();
    expect(screen.queryByText('旧套餐')).toBeNull();
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: /刷\s*新/ })
          .classList.contains('ant-btn-loading'),
      ).toBe(false),
    );
  });
});
