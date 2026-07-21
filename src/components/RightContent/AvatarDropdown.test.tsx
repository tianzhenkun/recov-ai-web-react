import { act, render } from '@testing-library/react';
import { createElement } from 'react';
import { AvatarDropdown } from './AvatarDropdown';

var mockPush = jest.fn();
var mockReplace = jest.fn();
var mockUseModel = jest.fn();
var mockSetInitialState = jest.fn();
var mockLoadRuoyiMenuData = jest.fn();
var mockHeaderDropdownProps: any[] = [];

jest.mock('@umijs/max', () => ({
  history: {
    push: (...args: any[]) => mockPush(...args),
    replace: (...args: any[]) => mockReplace(...args),
  },
  useModel: () => mockUseModel(),
}));

jest.mock('@/adapters/ruoyi/dynamicTenant', () => ({
  clearStoredDynamicTenantId: jest.fn(),
}));

jest.mock('@/adapters/ruoyi/menu', () => ({
  clearCachedRuoyiMenuData: jest.fn(),
  getFirstVisibleRuoyiPath: jest.fn(() => '/index'),
  loadRuoyiMenuData: (...args: any[]) => mockLoadRuoyiMenuData(...args),
  resolveRuoyiMenuWorkspaces: jest.fn(() => []),
}));

jest.mock('@/adapters/ruoyi/sse', () => ({
  stopSse: jest.fn(),
}));

jest.mock('@/adapters/ruoyi/token', () => ({
  removeToken: jest.fn(),
}));

jest.mock('@/components/Permission', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}));

jest.mock('@/app/auth', () => ({
  logout: jest.fn(() => Promise.resolve()),
}));

jest.mock('../HeaderDropdown', () => (props: any) => {
  const React = require('react');
  mockHeaderDropdownProps.push(props);
  return React.createElement(
    'div',
    { 'data-testid': 'mock-header-dropdown' },
    props.children,
  );
});

describe('AvatarDropdown', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    mockHeaderDropdownProps.length = 0;
    mockLoadRuoyiMenuData.mockReset();
    mockLoadRuoyiMenuData.mockResolvedValue([]);
    mockUseModel.mockReturnValue({
      initialState: {
        currentUser: {
          name: '超级管理员',
          userid: '1',
        },
        siteProfile: {
          portalScope: 'PRODUCT',
        },
      },
      setInitialState: mockSetInitialState,
    });
  });

  it('opens from explicit click triggers so side footer user rows can show the menu', async () => {
    render(
      createElement(
        AvatarDropdown,
        null,
        createElement('button', { type: 'button' }, '超级管理员'),
      ),
    );
    await act(async () => {
      await mockLoadRuoyiMenuData.mock.results[0].value;
    });

    expect(mockHeaderDropdownProps.at(-1).trigger).toEqual(['click']);
  });

  it('opens the production personal center from the profile menu', async () => {
    render(
      createElement(
        AvatarDropdown,
        null,
        createElement('button', { type: 'button' }, '超级管理员'),
      ),
    );
    await act(async () => {
      await mockLoadRuoyiMenuData.mock.results[0].value;
    });

    mockHeaderDropdownProps.at(-1).menu.onClick({ key: 'settings' });

    expect(mockPush).toHaveBeenCalledWith('/account/center');
  });

  it('opens the purchased credit entitlement workspace from the account menu', async () => {
    render(
      createElement(
        AvatarDropdown,
        null,
        createElement('button', { type: 'button' }, '超级管理员'),
      ),
    );
    await act(async () => {
      await mockLoadRuoyiMenuData.mock.results[0].value;
    });

    mockHeaderDropdownProps.at(-1).menu.onClick({ key: 'credit' });

    expect(mockPush).toHaveBeenCalledWith('/account/credit');
  });

  it('keeps account actions but hides tenant credit entitlements on the platform portal', () => {
    mockUseModel.mockReturnValue({
      initialState: {
        currentUser: {
          name: '超级管理员',
          userid: '1',
        },
        siteProfile: {
          portalScope: 'PLATFORM',
        },
      },
      setInitialState: mockSetInitialState,
    });

    render(
      createElement(
        AvatarDropdown,
        null,
        createElement('button', { type: 'button' }, '超级管理员'),
      ),
    );

    const labels = mockHeaderDropdownProps[0].menu.items.map(
      (item: any) => item.label,
    );

    expect(labels).toEqual(
      expect.arrayContaining(['个人中心', '偏好设置', '退出登录']),
    );
    expect(labels).not.toContain('信用点权益');
  });

  it('does not turn platform router categories into account workspaces', () => {
    mockUseModel.mockReturnValue({
      initialState: {
        currentUser: {
          name: '超级管理员',
          userid: '1',
        },
        siteProfile: {
          portalScope: 'PLATFORM',
        },
      },
      setInitialState: mockSetInitialState,
    });

    render(
      createElement(
        AvatarDropdown,
        null,
        createElement('button', { type: 'button' }, '超级管理员'),
      ),
    );

    expect(mockLoadRuoyiMenuData).not.toHaveBeenCalled();
  });

  it('fails closed for tenant credit entitlements when the site profile is unavailable', () => {
    mockUseModel.mockReturnValue({
      initialState: {
        currentUser: {
          name: '超级管理员',
          userid: '1',
        },
      },
      setInitialState: mockSetInitialState,
    });

    render(
      createElement(
        AvatarDropdown,
        null,
        createElement('button', { type: 'button' }, '超级管理员'),
      ),
    );

    expect(
      mockHeaderDropdownProps[0].menu.items.map((item: any) => item.label),
    ).not.toContain('信用点权益');
  });

  it('does not load account workspaces when the site profile is unavailable', () => {
    mockUseModel.mockReturnValue({
      initialState: {
        currentUser: {
          name: '超级管理员',
          userid: '1',
        },
      },
      setInitialState: mockSetInitialState,
    });

    render(
      createElement(
        AvatarDropdown,
        null,
        createElement('button', { type: 'button' }, '超级管理员'),
      ),
    );

    expect(mockLoadRuoyiMenuData).not.toHaveBeenCalled();
  });
});
