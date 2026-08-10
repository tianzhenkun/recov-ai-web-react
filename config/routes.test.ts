import routes from './routes';

type RouteLike = {
  path?: string;
  component?: string;
  hideInMenu?: boolean;
  access?: string;
  requiredPermission?: string;
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

  it('does not expose routes migrated to AI Reach', () => {
    const migratedRoute = flattenRoutes(routes).find((item) => {
      const path = item.path || '';
      return (
        path === '/agent-workbench' ||
        path === '/ai-call' ||
        path.startsWith('/ai-call/') ||
        path.startsWith('/ai-call-lab/')
      );
    });

    expect(migratedRoute).toBeUndefined();
  });
});
