import {
  attachSalesAgentOverviewMenu,
  buildLayoutMenuData,
  buildRuoyiMenuData,
  findRuoyiMenuByPath,
  getFirstVisibleRuoyiPath,
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
        path: '/sales/icp-modeling',
        name: 'ICP 建模',
      }),
    ]);
    expect(menuData[0].redirect).toBeUndefined();
  });

  it('groups template menus without changing their original paths', () => {
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

    expect(layoutMenuData).toHaveLength(1);
    expect(layoutMenuData[0]).toMatchObject({
      name: '模板示例',
    });
    expect(layoutMenuData[0].path).toBeUndefined();
    expect(layoutMenuData[0].children).toEqual([
      expect.objectContaining({
        path: '/dashboard',
        children: [
          expect.objectContaining({
            path: '/dashboard/analysis',
          }),
        ],
      }),
    ]);
  });
});
