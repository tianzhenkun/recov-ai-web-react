export type CreditWorkspaceScope = 'tenant' | 'me';

export type CreditWorkspaceTab =
  | 'overview'
  | 'packages'
  | 'grants'
  | 'orders'
  | 'coupons'
  | 'ledgers';

const commonTabLabels: Record<CreditWorkspaceTab, string> = {
  overview: '权益概览',
  packages: '套餐与充值',
  grants: '权益明细',
  orders: '订单记录',
  coupons: '优惠券',
  ledgers: '收支明细',
};

export const creditWorkspaceTabLabels = {
  ...commonTabLabels,
  coupons: '我的优惠券',
};

export const getCreditWorkspaceTabLabels = (
  scope: CreditWorkspaceScope,
): Record<CreditWorkspaceTab, string> =>
  scope === 'tenant'
    ? { ...commonTabLabels, coupons: '团队优惠券' }
    : creditWorkspaceTabLabels;

export const getCreditWorkspaceTitle = (scope: CreditWorkspaceScope) =>
  scope === 'tenant' ? '团队权益' : '个人权益';
