import type { CurrentUser } from '@/shared/types';
import {
  hasAllPermissions,
  hasAllRoles,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hasRole,
} from '@/utils/permission';

type AccessCurrentUser = CurrentUser & {
  userId?: number | string;
  roles?: string[];
  permissions?: string[];
  rawUser?: {
    userId?: number | string;
    tenantId?: string;
  };
};

const DEFAULT_PLATFORM_TENANT_ID = '000000';

const isRootUserId = (value: unknown) =>
  value !== undefined && value !== null && String(value).trim() === '1';

export const isPlatformSuperAdmin = (currentUser?: AccessCurrentUser) => {
  if (!currentUser) return false;

  const hasRootUserId = [
    currentUser.userid,
    currentUser.userId,
    currentUser.rawUser?.userId,
  ].some(isRootUserId);
  const hasSuperAdminRole = currentUser.roles?.some(
    (role) => role.trim().toLowerCase() === 'superadmin',
  );

  return hasRootUserId || Boolean(hasSuperAdminRole);
};

export const canManageOAuthIntegration = (
  currentUser?: AccessCurrentUser,
  dynamicTenantId?: string,
) => {
  if (!currentUser) return false;
  const hasRootUserId = [
    currentUser.userid,
    currentUser.userId,
    currentUser.rawUser?.userId,
  ].some(isRootUserId);
  const activeTenantId = dynamicTenantId || currentUser.rawUser?.tenantId || '';
  return hasRootUserId && activeTenantId === DEFAULT_PLATFORM_TENANT_ID;
};

/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState:
    | {
        currentUser?: CurrentUser & {
          userId?: number | string;
          roles?: string[];
          permissions?: string[];
          rawUser?: {
            userId?: number | string;
            tenantId?: string;
          };
        };
        dynamicTenantId?: string;
      }
    | undefined,
) {
  const { currentUser } = initialState ?? {};

  return {
    canAdmin: hasRole(currentUser, 'admin'),
    isSuperAdmin: isPlatformSuperAdmin(currentUser),
    canManageOAuthIntegration: canManageOAuthIntegration(
      currentUser,
      initialState?.dynamicTenantId,
    ),
    hasRole: (role: string) => hasRole(currentUser, role),
    hasAnyRole: (roles: string | string[]) => hasAnyRole(currentUser, roles),
    hasAllRoles: (roles: string | string[]) => hasAllRoles(currentUser, roles),
    hasPermission: (permission: string) =>
      hasPermission(currentUser, permission),
    hasAnyPermission: (permissions: string | string[]) =>
      hasAnyPermission(currentUser, permissions),
    hasAllPermissions: (permissions: string | string[]) =>
      hasAllPermissions(currentUser, permissions),
  };
}
