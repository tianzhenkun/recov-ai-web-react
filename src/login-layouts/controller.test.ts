import {
  buildLoginRequest,
  resolveTenantId,
  shouldLoadTenantList,
} from './controller';

describe('login controller model', () => {
  it('loads tenant options only for selectable sites', () => {
    expect(shouldLoadTenantList('SELECTABLE')).toBe(true);
    expect(shouldLoadTenantList('FIXED')).toBe(false);
  });

  it('omits tenantId for a server-canonical fixed-tenant site', () => {
    expect(
      buildLoginRequest(
        {
          tenantId: 'browser-controlled-tenant',
          username: 'alice',
          password: 'password',
          code: '1234',
          uuid: 'captcha-id',
        },
        'FIXED',
      ),
    ).toEqual({
      username: 'alice',
      password: 'password',
      code: '1234',
      uuid: 'captcha-id',
    });
  });

  it('keeps the selected tenant for a selectable site', () => {
    expect(
      buildLoginRequest(
        {
          tenantId: '720978',
          username: ' alice ',
          password: 'password',
        },
        'SELECTABLE',
      ),
    ).toMatchObject({
      tenantId: '720978',
      username: 'alice',
    });
  });

  it('resolves a remembered tenant only when it is still available', () => {
    const tenantList = [
      { companyName: '甲', domain: null, tenantId: '100001' },
      { companyName: '乙', domain: null, tenantId: '100002' },
    ];

    expect(resolveTenantId(tenantList, '100002', '100001')).toBe('100002');
    expect(resolveTenantId(tenantList, 'missing', '100001')).toBe('100001');
    expect(resolveTenantId(tenantList, 'missing', 'missing')).toBe('100001');
  });
});
