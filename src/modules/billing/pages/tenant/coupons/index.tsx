import { Result } from 'antd';
import { Permission } from '@/components/Permission';
import { CreditWorkspace } from '../../../components/CreditWorkspace';
import { billingPermissions } from '../../../components/shared';

const TenantBillingCouponsPage = () => (
  <Permission
    permissions={billingPermissions.tenantCouponList}
    fallback={
      <Result
        status="403"
        title="无团队优惠券权限"
        subTitle="当前成员不能查看或领取团队优惠券。"
      />
    }
  >
    <CreditWorkspace scope="tenant" initialTab="coupons" />
  </Permission>
);

export default TenantBillingCouponsPage;
