import routes from './routes';

type RouteLike = {
  path?: string;
  component?: string;
  hideInMenu?: boolean;
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

  it('routes the legal court menu path to the migrated lawyer court page', () => {
    const lawyerCourtRoute = flattenRoutes(routes).find(
      (item) => item.path === '/lawyerCourtIndex',
    );

    expect(lawyerCourtRoute).toMatchObject({
      component: './recov/lawyerCourt',
      hideInMenu: true,
    });
  });

  it('does not keep the temporary test11 lawyer court route', () => {
    const legacyRoute = flattenRoutes(routes).find(
      (item) => item.path === '/test11',
    );

    expect(legacyRoute).toBeUndefined();
  });
});
