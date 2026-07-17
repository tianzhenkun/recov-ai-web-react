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
