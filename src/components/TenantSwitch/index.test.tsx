import { buildRuoyiMenuData } from '@/adapters/ruoyi/menu';
import { resolveTenantSwitchNextPath } from './navigation';

describe('resolveTenantSwitchNextPath', () => {
  it('keeps the concrete current path when it matches a dynamic menu route', () => {
    const menuData = buildRuoyiMenuData([
      {
        component: 'Layout',
        name: 'System',
        path: '/system',
        children: [
          {
            component: 'system/user/authRole',
            hidden: true,
            meta: {
              activeMenu: '/system/user',
              title: '分配角色',
            },
            name: 'UserAuthRole',
            path: 'user-auth/role/:userId',
          },
        ],
      },
    ]);

    expect(
      resolveTenantSwitchNextPath('/system/user-auth/role/100', menuData),
    ).toBe('/system/user-auth/role/100');
  });
});
