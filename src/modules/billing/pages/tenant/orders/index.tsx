import { Result } from 'antd';
import { Permission } from '@/components/Permission';
import { CreditWorkspace } from '../../../components/CreditWorkspace';
import { billingPermissions } from '../../../components/shared';

const TenantBillingOrdersPage = () => (
  <Permission
    permissions={billingPermissions.tenantOrderList}
    fallback={
      <Result
        status="403"
        title="无团队订单权限"
        subTitle="团队订单和支付记录仅对租户管理员开放。"
      />
    }
  >
    <CreditWorkspace scope="tenant" initialTab="orders" />
  </Permission>
);

export default TenantBillingOrdersPage;
