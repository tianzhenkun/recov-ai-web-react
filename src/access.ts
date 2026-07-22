import {
  hasAllPermissions,
  hasAllRoles,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hasRole,
} from '@/utils/permission';

/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState:
    | {
        currentUser?: API.CurrentUser & {
          roles?: string[];
          permissions?: string[];
        };
      }
    | undefined,
) {
  const { currentUser } = initialState ?? {};

  type PermissionRoute = {
    requiredPermission?: string;
  };

  return {
    canAdmin: hasRole(currentUser, 'admin'),
    hasRole: (role: string) => hasRole(currentUser, role),
    hasAnyRole: (roles: string | string[]) => hasAnyRole(currentUser, roles),
    hasAllRoles: (roles: string | string[]) => hasAllRoles(currentUser, roles),
    hasPermission: (permission: string) =>
      hasPermission(currentUser, permission),
    hasAnyPermission: (permissions: string | string[]) =>
      hasAnyPermission(currentUser, permissions),
    hasAllPermissions: (permissions: string | string[]) =>
      hasAllPermissions(currentUser, permissions),
    hasRoutePermission: (route: PermissionRoute) =>
      Boolean(
        route.requiredPermission &&
          hasPermission(currentUser, route.requiredPermission),
      ),
  };
}
