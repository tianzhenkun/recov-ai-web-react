import routes from './routes';

type RouteLike = {
  path?: string;
  component?: string;
  hideInMenu?: boolean;
  access?: string;
  routes?: RouteLike[];
};

const flattenRoutes = (items: RouteLike[]): RouteLike[] =>
  items.flatMap((item) => [
    item,
    ...(item.routes ? flattenRoutes(item.routes) : []),
  ]);

describe('routes', () => {
  it('does not ship Ant Design Pro example routes', () => {
    const paths = new Set(flattenRoutes(routes).map((item) => item.path));

    [
      '/welcome',
      '/admin',
      '/dashboard',
      '/form',
      '/list',
      '/profile',
      '/result',
      '/chatbot',
      '/test11',
      '/user/register',
      '/user/register-result',
    ].forEach((path) => {
      expect(paths.has(path)).toBe(false);
    });
  });

  it('keeps tenant billing and platform billing operations as independent route spaces', () => {
    const paths = new Set(flattenRoutes(routes).map((item) => item.path));

    expect(paths.has('/billing')).toBe(true);
    expect(paths.has('/billing-operations')).toBe(true);
    expect(paths.has('/billing-operations/coupon-templates')).toBe(true);
    expect(paths.has('/billing-operations/coupons')).toBe(false);
  });

  it('exposes the standard flow events page as a hidden route', () => {
    const flowEventsRoute = flattenRoutes(routes).find(
      (item) => item.path === '/flow-events',
    );

    expect(flowEventsRoute).toMatchObject({
      component: './recov/flowEvents',
      hideInMenu: true,
    });
  });

  it('protects integration configuration routes with the super-admin access rule', () => {
    const routeMap = new Map(
      flattenRoutes(routes).map((item) => [item.path, item]),
    );

    expect(routeMap.get('/sys-conf/integrations')).toMatchObject({
      component: './ruoyi/system/integration-center',
      hideInMenu: true,
      access: 'isSuperAdmin',
    });
    expect(routeMap.get('/sys-conf/oss-config/index')).toMatchObject({
      component: './ruoyi/system/oss-config',
      hideInMenu: true,
      access: 'isSuperAdmin',
    });
    expect(routeMap.get('/sys-conf/payment-channel-config')).toMatchObject({
      component: './ruoyi/system/payment-channel-config',
      hideInMenu: true,
      access: 'isSuperAdmin',
    });
    expect(routeMap.get('/sys-conf/oauth-providers')).toMatchObject({
      component: './ruoyi/system/oauth-provider-config',
      hideInMenu: true,
      access: 'canManageOAuthIntegration',
    });
  });
});
