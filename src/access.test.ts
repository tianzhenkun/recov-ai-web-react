import access from './access';

describe('route permission access', () => {
  it('allows a static route when the current user owns its permission', () => {
    const permissions = access({
      currentUser: { permissions: ['system:user:list'] },
    });

    expect(
      permissions.hasRoutePermission({
        requiredPermission: 'system:user:list',
      }),
    ).toBe(true);
  });

  it('rejects a static route when the permission is missing', () => {
    const permissions = access({ currentUser: { permissions: [] } });

    expect(
      permissions.hasRoutePermission({
        requiredPermission: 'system:user:edit',
      }),
    ).toBe(false);
  });
});
