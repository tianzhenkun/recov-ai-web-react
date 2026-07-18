import access from './access';

describe('access', () => {
  it.each([
    [{ userid: '1' }, 'userid'],
    [{ userId: 1 }, 'userId'],
    [{ rawUser: { userId: '1' } }, 'rawUser.userId'],
    [{ userid: '9', roles: ['superadmin'] }, 'superadmin role'],
  ])('recognizes the platform super administrator by %s', (currentUser, _source) => {
    expect(access({ currentUser } as never).isSuperAdmin).toBe(true);
  });

  it.each([
    undefined,
    { userid: '2' },
    { userId: 2, roles: ['admin'] },
    { userid: '2', permissions: ['*:*:*'] },
  ])('does not broaden platform-super-admin access for %p', (currentUser) => {
    expect(access({ currentUser } as never).isSuperAdmin).toBe(false);
  });

  it('allows OAuth integration management only for user 1 in the default tenant', () => {
    expect(
      access({
        currentUser: {
          userid: '1',
          rawUser: { userId: 1, tenantId: '000000' },
        },
      } as never).canManageOAuthIntegration,
    ).toBe(true);
  });

  it.each([
    {
      currentUser: {
        userid: '9',
        roles: ['superadmin'],
        rawUser: { tenantId: '000000' },
      },
    },
    {
      currentUser: {
        userid: '1',
        rawUser: { userId: 1, tenantId: '720978' },
      },
    },
    {
      currentUser: {
        userid: '1',
        rawUser: { userId: 1, tenantId: '000000' },
      },
      dynamicTenantId: '720978',
    },
  ])('rejects OAuth integration management for %p', (initialState) => {
    expect(access(initialState as never).canManageOAuthIntegration).toBe(false);
  });
});
