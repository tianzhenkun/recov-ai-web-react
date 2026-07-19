import {
  creditWorkspaceTabLabels,
  getCreditWorkspaceTitle,
} from './creditWorkspaceCopy';

describe('credit workspace copy', () => {
  it('uses entitlement-oriented customer language', () => {
    expect(getCreditWorkspaceTitle('me')).toBe('个人权益');
    expect(getCreditWorkspaceTitle('tenant')).toBe('团队权益');
    expect(creditWorkspaceTabLabels).toEqual({
      overview: '权益概览',
      packages: '套餐与充值',
      grants: '权益明细',
      orders: '订单记录',
      coupons: '我的优惠券',
      ledgers: '收支明细',
    });
  });
});
