import { history, useModel } from '@umijs/max';
import { Button, Result } from 'antd';
import type React from 'react';
import { usePermission } from '@/components/Permission';

type OperationsGuardProps = {
  children: React.ReactNode;
  permissions?: string | string[];
};

const DEFAULT_PLATFORM_TENANT_ID = '000000';

export const isPlatformOperationsTenant = (tenantId?: string | null) =>
  tenantId === DEFAULT_PLATFORM_TENANT_ID;

export const OperationsGuard = ({
  children,
  permissions,
}: OperationsGuardProps) => {
  const { initialState } = useModel('@@initialState');
  const { canAccess } = usePermission();
  const rawTenantId = (
    initialState?.currentUser?.rawUser as { tenantId?: string } | undefined
  )?.tenantId;
  const activeTenantId = String(
    initialState?.dynamicTenantId || rawTenantId || '',
  );
  const isPlatformTenant = isPlatformOperationsTenant(activeTenantId);

  if (!isPlatformTenant) {
    return (
      <Result
        status="403"
        title="当前租户不可访问计费管理"
        subTitle="请先切回平台租户后再进入该页面。"
        extra={
          <Button type="primary" onClick={() => history.push('/')}>
            返回首页
          </Button>
        }
      />
    );
  }

  if (!canAccess({ permissions })) {
    return (
      <Result
        status="403"
        title="无计费管理权限"
        subTitle="当前账号未获得该管理能力。"
        extra={
          <Button type="primary" onClick={() => history.push('/')}>
            返回首页
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
};

export default OperationsGuard;
