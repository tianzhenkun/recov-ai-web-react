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

  it.each([
    ['/agent-workbench', './agentWorkbench', 'ai_call:agent:console'],
    [
      '/ai-call/agents',
      './agentWorkbench/admin/agents',
      'ai_call:agent:manage',
    ],
    [
      '/ai-call/handoffs',
      './agentWorkbench/admin/handoffs',
      'ai_call:agent:manage',
    ],
    [
      '/ai-call/follow-ups',
      './agentWorkbench/admin/followUps',
      'ai_call:agent:manage',
    ],
  ])('maps %s to the independent agent workbench module', (path, component, requiredPermission) => {
    const route = flattenRoutes(routes).find((item) => item.path === path);

    expect(route).toMatchObject({
      path,
      component,
      hideInMenu: true,
      access: 'hasRoutePermission',
      requiredPermission,
    });
  });

  it.each([
    ['/ai-call/tasks', './aiCallTasks'],
    ['/ai-call/tasks/create', './aiCallTasks/create'],
    ['/ai-call/tasks/:taskId', './aiCallTasks/detail'],
    ['/ai-call/records', './aiCallRecords'],
    ['/ai-call/rules', './aiCallRules'],
  ])('maps %s to %s', (path, component) => {
    const route = flattenRoutes(routes).find((item) => item.path === path);

    expect(route).toMatchObject({
      path,
      component,
      hideInMenu: true,
      access: 'hasRoutePermission',
      requiredPermission: 'ai_call:agent:manage',
    });
  });
});
