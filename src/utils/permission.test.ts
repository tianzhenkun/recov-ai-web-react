import {
  canAccess,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  hasRole,
} from './permission';

describe('permission utilities', () => {
  const user = {
    access: 'user',
    roles: ['common'],
    permissions: ['system:user:list', 'system:user:edit'],
  };

  it('checks exact permissions and wildcard permissions', () => {
    expect(hasPermission(user, 'system:user:list')).toBe(true);
    expect(hasPermission(user, 'system:role:list')).toBe(false);
    expect(
      hasPermission({ permissions: ['*:*:*'] }, 'system:role:remove'),
    ).toBe(true);
  });

  it('lets admin role pass any role check', () => {
    expect(hasRole({ roles: ['admin'] }, 'system')).toBe(true);
    expect(hasRole(user, 'admin')).toBe(false);
  });

  it('supports any and all permission modes', () => {
    expect(
      hasAnyPermission(user, ['system:role:list', 'system:user:list']),
    ).toBe(true);
    expect(
      hasAllPermissions(user, ['system:user:list', 'system:user:edit']),
    ).toBe(true);
    expect(
      hasAllPermissions(user, ['system:user:list', 'system:role:list']),
    ).toBe(false);
  });

  it('combines role and permission requirements', () => {
    expect(
      canAccess(user, {
        roles: 'common',
        permissions: 'system:user:list',
      }),
    ).toBe(true);
    expect(
      canAccess(user, {
        roles: 'common',
        permissions: ['system:user:list', 'system:role:list'],
        mode: 'all',
      }),
    ).toBe(false);
    expect(canAccess(undefined, { permissions: 'system:user:list' })).toBe(
      false,
    );
    expect(canAccess(undefined)).toBe(true);
  });
});
