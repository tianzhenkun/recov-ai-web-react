import access from './access';

describe('route permission access', () => {
  it('allows a static route when the current user owns its permission', () => {
    const permissions = access({
      currentUser: { permissions: ['ai_call:agent:console'] },
    });

    expect(
      permissions.hasRoutePermission({
        requiredPermission: 'ai_call:agent:console',
      }),
    ).toBe(true);
  });

  it('rejects a static route when the permission is missing', () => {
    const permissions = access({ currentUser: { permissions: [] } });

    expect(
      permissions.hasRoutePermission({
        requiredPermission: 'ai_call:agent:manage',
      }),
    ).toBe(false);
  });
});
