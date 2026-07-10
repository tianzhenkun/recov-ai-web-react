import { Result } from 'antd';
import { Permission } from '@/components/Permission';
import { CreditWorkspace } from '../components/CreditWorkspace';
import { billingPermissions } from '../shared';

const TenantBillingPackagesPage = () => (
  <Permission
    permissions={billingPermissions.tenantPackageList}
    fallback={
      <Result
        status="403"
        title="无团队套餐权限"
        subTitle="当前成员不能查看或购买团队套餐。"
      />
    }
  >
    <CreditWorkspace scope="tenant" initialTab="packages" />
  </Permission>
);

export default TenantBillingPackagesPage;
