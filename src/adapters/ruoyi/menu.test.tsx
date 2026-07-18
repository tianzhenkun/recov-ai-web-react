import {
  attachSalesAgentOverviewMenu,
  buildLayoutMenuData,
  buildRuoyiMenuData,
  findRuoyiMenuByPath,
  getFirstVisibleRuoyiPath,
  getScopedRuoyiMenuData,
  getVisibleRuoyiMenuData,
  isRuoyiDirectoryMenuPath,
  omitWorkspaceRootMenus,
  resolveRuoyiMenuContext,
  resolveRuoyiMenuWorkspaces,
} from './menu';

jest.mock('@/services/ruoyi/menu', () => ({
  getRouters: jest.fn(),
}));

const ruoyiRoutes = [
  {
    name: '2048944252769067009',
    path: '/',
    hidden: false,
    component: 'Layout',
    children: [
      {
        name: 'Datelligence2048944252769067009',
        path: 'datelligence',
        component: 'recov/datelligence/index',
        meta: {
          title: '数据智能解析管理',
          icon: 'component',
        },
      },
    ],
  },
  {
    name: 'System1',
    path: '/system',
    hidden: false,
    redirect: 'noRedirect',
    component: 'Layout',
    alwaysShow: true,
    meta: {
      title: '账户管理',
      icon: 'system',
    },
    children: [
      {
        name: 'User100',
        path: 'user',
        hidden: false,
        component: 'system/user/index',
        meta: {
          title: '用户管理',
          icon: 'user',
        },
      },
      {
        name: 'User-auth/role/:userId131',
        path: 'user-auth/role/:userId',
        hidden: true,
        component: 'system/user/authRole',
        meta: {
          title: '分配角色',
          icon: '#',
          noCache: true,
          activeMenu: '/system/user',
        },
      },
    ],
  },
];

describe('RuoYi menu transform', () => {
  it('promotes Layout root menus with only one child', () => {
    const menuData = buildRuoyiMenuData(ruoyiRoutes);

    expect(menuData[0]).toMatchObject({
      path: '/datelligence',
      name: '数据智能解析管理',
      ruoyiComponent: 'recov/datelligence/index',
      ruoyiName: 'Datelligence2048944252769067009',
    });
  });

  it('preserves grouped menus and active hidden routes', () => {
    const menuData = buildRuoyiMenuData(ruoyiRoutes);
    const systemMenu = menuData.find((item) => item.path === '/system');

    expect(systemMenu).toMatchObject({
      path: '/system',
      name: '账户管理',
      ruoyiComponent: 'Layout',
    });
    expect(systemMenu?.children?.[0]).toMatchObject({
      path: '/system/user',
      name: '用户管理',
      hideInMenu: false,
    });
    expect(systemMenu?.children?.[1]).toMatchObject({
      path: '/system/user-auth/role/:userId',
      name: '分配角色',
      hideInMenu: true,
      parentKeys: ['/system/user'],
    });
  });

  it('matches dynamic menu paths', () => {
    const menuData = buildRuoyiMenuData(ruoyiRoutes);
    const matched = findRuoyiMenuByPath('/system/user-auth/role/100', menuData);

    expect(matched?.ruoyiName).toBe('User-auth/role/:userId131');
  });

  it('detects grouped Layout menu paths without direct page navigation', () => {
    const menuData = buildRuoyiMenuData(ruoyiRoutes);

    expect(isRuoyiDirectoryMenuPath('/system', menuData)).toBe(true);
    expect(isRuoyiDirectoryMenuPath('/system/user', menuData)).toBe(false);
  });

  it('uses first visible leaf route as the landing path', () => {
    const menuData = buildRuoyiMenuData(ruoyiRoutes);

    expect(getFirstVisibleRuoyiPath(menuData)).toBe('/datelligence');
  });

  it('adds overview and ICP children under Sales Agent leaf menu', () => {
    const menuData = attachSalesAgentOverviewMenu([
      {
        path: '/sales',
        name: 'Sales Agent',
      },
    ]);

    expect(menuData[0]).toMatchObject({
      path: '/sales',
      name: 'Sales Agent',
    });
    expect(menuData[0].children).toEqual([
      expect.objectContaining({
        path: '/sales/dashboard',
        name: '数据总览',
      }),
      expect.objectContaining({
        path: '/sales/source-coverage',
        name: '来源与字段覆盖',
      }),
      expect.objectContaining({
        path: '/sales/provider-settings',
        name: '服务商配置',
      }),
      expect.objectContaining({
        path: '/sales/icp-modeling',
        name: 'ICP 建模',
      }),
      expect.objectContaining({
        path: '/sales/icp-attrs',
        name: 'ICP 属性配置',
      }),
      expect.objectContaining({
        path: '/sales/leads',
        name: '线索台账',
      }),
      expect.objectContaining({
        path: '/sales/email-outreach',
        name: '邮件触达',
      }),
    ]);
    expect(menuData[0].redirect).toBeUndefined();
  });

  it('does not append template example menus to business navigation', () => {
    const defaultMenuData = [
      { path: '/user/login', name: 'login' },
      { path: '/', name: 'root' },
      {
        path: '/dashboard',
        name: 'dashboard',
        children: [
          { path: '/dashboard/analysis', name: 'analysis' },
          { path: '/dashboard/hidden', name: 'hidden', hideInMenu: true },
        ],
      },
    ];

    const layoutMenuData = buildLayoutMenuData([], defaultMenuData);

    expect(layoutMenuData).toEqual([]);
  });

  it('only resolves configured workspace names from directory menus', () => {
    const menuData = buildRuoyiMenuData([
      ...ruoyiRoutes,
      {
        name: 'System2',
        path: '/admin-tools',
        hidden: false,
        component: 'Layout',
        meta: {
          title: '后台管理',
          icon: 'system',
        },
        children: [
          {
            name: 'Menu101',
            path: 'menu',
            hidden: false,
            component: 'system/menu/index',
            meta: {
              title: '菜单管理',
              icon: 'tree',
            },
          },
        ],
      },
      {
        name: 'LeafName',
        path: '/leaf-only',
        hidden: false,
        component: 'system/leaf/index',
        meta: {
          title: '系统管理',
          icon: 'setting',
        },
      },
    ]);

    expect(
      resolveRuoyiMenuWorkspaces(menuData, [
        '账户管理',
        '后台管理',
        '系统管理',
      ]),
    ).toEqual([
      expect.objectContaining({
        key: '/system',
        name: '账户管理',
      }),
      expect.objectContaining({
        key: '/admin-tools',
        name: '后台管理',
      }),
    ]);
  });

  it('separates customer entitlements from platform billing operations', () => {
    const menuData = buildRuoyiMenuData([
      ...ruoyiRoutes.filter((route) => route.path !== '/system'),
      {
        name: 'EntitlementCenter',
        path: '/entitlements',
        hidden: false,
        component: 'Layout',
        alwaysShow: true,
        meta: {
          title: '权益中心',
          icon: 'gift',
        },
        children: [
          {
            name: 'PersonalCredit',
            path: '/account/credit',
            hidden: false,
            component: 'account/credit/index',
            meta: {
              title: '个人权益',
              icon: 'wallet',
            },
          },
          {
            name: 'TeamBilling',
            path: '/billing',
            hidden: false,
            component: 'ParentView',
            meta: {
              title: '团队权益',
              icon: 'team',
            },
            children: [
              {
                name: 'TeamOverview',
                path: 'overview',
                hidden: false,
                component: 'billing/index',
                meta: { title: '团队概览' },
              },
            ],
          },
        ],
      },
      {
        name: 'AdminCenter',
        path: '/admin-tools',
        hidden: false,
        component: 'Layout',
        alwaysShow: true,
        meta: {
          title: '后台管理',
          icon: 'appstore',
        },
        children: [
          {
            name: 'BillingOperations',
            path: '/billing-operations',
            hidden: false,
            component: 'ParentView',
            meta: {
              title: '计费运营',
              icon: 'fund',
            },
            children: [
              {
                name: 'BillingCatalog',
                path: 'catalog',
                hidden: false,
                component: 'billing/operations/catalog/index',
                meta: { title: '产品与计价' },
              },
            ],
          },
        ],
      },
    ]);
    const workspaceNames = ['权益中心', '后台管理', '系统管理'];

    expect(resolveRuoyiMenuWorkspaces(menuData, workspaceNames)).toEqual([
      expect.objectContaining({
        key: '/entitlements',
        name: '权益中心',
      }),
      expect.objectContaining({
        key: '/admin-tools',
        name: '后台管理',
      }),
    ]);
    expect(
      getVisibleRuoyiMenuData(menuData, {
        menuMode: 'default',
        configuredWorkspaceNames: workspaceNames,
      }).map((item) => item.path),
    ).toEqual(['/datelligence']);
    expect(
      getVisibleRuoyiMenuData(menuData, {
        menuMode: 'workspace',
        activeWorkspaceKey: '/entitlements',
        configuredWorkspaceNames: workspaceNames,
      }).map((item) => item.path),
    ).toEqual(['/account/credit', '/billing']);
    expect(
      resolveRuoyiMenuContext(
        '/billing-operations/catalog',
        menuData,
        workspaceNames,
      ),
    ).toMatchObject({
      menuMode: 'workspace',
      activeWorkspaceKey: '/admin-tools',
    });
  });

  it('scopes left menu data to the selected workspace', () => {
    const menuData = buildRuoyiMenuData([
      ...ruoyiRoutes,
      {
        name: 'System2',
        path: '/admin-tools',
        hidden: false,
        component: 'Layout',
        meta: {
          title: '后台管理',
          icon: 'system',
        },
        children: [
          {
            name: 'Menu101',
            path: 'menu',
            hidden: false,
            component: 'system/menu/index',
            meta: {
              title: '菜单管理',
              icon: 'tree',
            },
          },
        ],
      },
    ]);

    expect(
      getScopedRuoyiMenuData(menuData, '/admin-tools', [
        '账户管理',
        '后台管理',
      ]),
    ).toEqual([
      expect.objectContaining({
        path: '/admin-tools/menu',
        name: '菜单管理',
      }),
    ]);

    expect(
      getScopedRuoyiMenuData(menuData, '/missing', [
        '账户管理',
        '后台管理',
      ]).map((item) => item.path),
    ).toEqual(['/datelligence']);
  });

  it('hides workspace root menus from the default left sidebar', () => {
    const menuData = buildRuoyiMenuData([
      ...ruoyiRoutes,
      {
        name: 'System2',
        path: '/admin-tools',
        hidden: false,
        component: 'Layout',
        meta: {
          title: '后台管理',
          icon: 'system',
        },
        children: [
          {
            name: 'Menu101',
            path: 'menu',
            hidden: false,
            component: 'system/menu/index',
            meta: {
              title: '菜单管理',
              icon: 'tree',
            },
          },
        ],
      },
    ]);

    expect(
      omitWorkspaceRootMenus(menuData, ['账户管理', '后台管理']).map(
        (item) => item.path,
      ),
    ).toEqual(['/datelligence']);
  });

  it('derives visible menu data from explicit menu mode', () => {
    const menuData = buildRuoyiMenuData([
      ...ruoyiRoutes,
      {
        name: 'System2',
        path: '/admin-tools',
        hidden: false,
        component: 'Layout',
        meta: {
          title: '后台管理',
          icon: 'system',
        },
        children: [
          {
            name: 'Menu101',
            path: 'menu',
            hidden: false,
            component: 'system/menu/index',
            meta: {
              title: '菜单管理',
              icon: 'tree',
            },
          },
        ],
      },
    ]);

    expect(
      getVisibleRuoyiMenuData(menuData, {
        menuMode: 'default',
        configuredWorkspaceNames: ['账户管理', '后台管理'],
      }).map((item) => item.path),
    ).toEqual(['/datelligence']);

    expect(
      getVisibleRuoyiMenuData(menuData, {
        menuMode: 'workspace',
        activeWorkspaceKey: '/admin-tools',
        configuredWorkspaceNames: ['账户管理', '后台管理'],
      }),
    ).toEqual([
      expect.objectContaining({
        path: '/admin-tools/menu',
        name: '菜单管理',
      }),
    ]);
  });

  it('resolves workspace menu context from workspace paths', () => {
    const menuData = buildRuoyiMenuData([
      ...ruoyiRoutes,
      {
        name: 'System2',
        path: '/admin-tools',
        hidden: false,
        component: 'Layout',
        meta: {
          title: '后台管理',
          icon: 'system',
        },
        children: [
          {
            name: 'Menu101',
            path: 'menu',
            hidden: false,
            component: 'system/menu/index',
            meta: {
              title: '菜单管理',
              icon: 'tree',
            },
          },
        ],
      },
    ]);

    expect(
      resolveRuoyiMenuContext('/admin-tools/menu', menuData, [
        '账户管理',
        '后台管理',
      ]),
    ).toMatchObject({
      menuMode: 'workspace',
      activeWorkspaceKey: '/admin-tools',
      homePath: '/admin-tools/menu',
      matchedMenuItem: expect.objectContaining({
        path: '/admin-tools/menu',
      }),
    });

    expect(
      resolveRuoyiMenuContext('/system', menuData, ['账户管理', '后台管理']),
    ).toMatchObject({
      menuMode: 'workspace',
      activeWorkspaceKey: '/system',
      homePath: '/system/user',
      matchedMenuItem: expect.objectContaining({
        path: '/system',
      }),
    });
  });

  it('falls back to default menu context for non-workspace paths', () => {
    const menuData = buildRuoyiMenuData([
      ...ruoyiRoutes,
      {
        name: 'System2',
        path: '/admin-tools',
        hidden: false,
        component: 'Layout',
        meta: {
          title: '后台管理',
          icon: 'system',
        },
        children: [
          {
            name: 'Menu101',
            path: 'menu',
            hidden: false,
            component: 'system/menu/index',
            meta: {
              title: '菜单管理',
              icon: 'tree',
            },
          },
        ],
      },
    ]);

    expect(
      resolveRuoyiMenuContext('/datelligence', menuData, [
        '账户管理',
        '后台管理',
      ]),
    ).toMatchObject({
      menuMode: 'default',
      activeWorkspaceKey: undefined,
      homePath: '/datelligence',
      matchedMenuItem: expect.objectContaining({
        path: '/datelligence',
      }),
    });
  });
});
