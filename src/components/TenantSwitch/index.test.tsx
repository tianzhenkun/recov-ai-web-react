import { render } from '@testing-library/react';
import { createElement } from 'react';
import { buildRuoyiMenuData } from '@/adapters/ruoyi/menu';
import TenantSwitch from './index';
import { resolveTenantSwitchNextPath } from './navigation';

var mockUseModel = jest.fn();
var mockGetTenantList = jest.fn();

jest.mock('@umijs/max', () => ({
  history: {
    location: { pathname: '/' },
    push: jest.fn(),
  },
  useModel: () => mockUseModel(),
}));

jest.mock('@/app/auth', () => ({
  getTenantList: (...args: unknown[]) => mockGetTenantList(...args),
}));

jest.mock('@/shared/services/tenant', () => ({
  dynamicClear: jest.fn(),
  dynamicTenant: jest.fn(),
}));

jest.mock('@/adapters/ruoyi/dynamicTenant', () => ({
  clearStoredDynamicTenantId: jest.fn(),
  setStoredDynamicTenantId: jest.fn(),
}));

jest.mock('../SiderFooterAction', () => () => null);

describe('TenantSwitch portal contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTenantList.mockResolvedValue({
      data: {
        tenantEnabled: true,
        voList: [{ companyName: '测试租户', tenantId: '100001' }],
      },
    });
  });

  it('does not request or expose tenant switching for a FIXED portal', () => {
    mockUseModel.mockReturnValue({
      initialState: {
        currentUser: {
          userid: '1',
          rawUser: { userId: 1 },
        },
        siteProfile: {
          loginVariant: 'default',
          portalScope: 'PLATFORM',
          tenantMode: 'FIXED',
        },
      },
      setInitialState: jest.fn(),
    });

    const { container } = render(createElement(TenantSwitch));

    expect(mockGetTenantList).not.toHaveBeenCalled();
    expect(container.childElementCount).toBe(0);
  });

  it('loads tenant choices for a SELECTABLE super administrator portal', () => {
    mockGetTenantList.mockReturnValueOnce(new Promise(() => undefined));
    mockUseModel.mockReturnValue({
      initialState: {
        currentUser: {
          userid: '1',
          rawUser: { userId: 1 },
        },
        siteProfile: {
          loginVariant: 'default',
          portalScope: 'PRODUCT',
          productCode: 'recov',
          tenantMode: 'SELECTABLE',
        },
      },
      setInitialState: jest.fn(),
    });

    const { unmount } = render(createElement(TenantSwitch));

    expect(mockGetTenantList).toHaveBeenCalledWith(true);
    unmount();
  });
});

describe('resolveTenantSwitchNextPath', () => {
  it('keeps account pages because they are independent from business menus', () => {
    expect(resolveTenantSwitchNextPath('/account/center', [])).toBe(
      '/account/center',
    );
  });

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
