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
  const roles = currentUser?.roles || [];
  const permissions = currentUser?.permissions || [];
  const hasRole = (role: string) =>
    roles.includes('admin') || roles.includes(role);
  const hasPermission = (permission: string) =>
    permissions.includes('*:*:*') || permissions.includes(permission);

  return {
    canAdmin: currentUser?.access === 'admin' || hasRole('admin'),
    hasRole,
    hasPermission,
  };
}
