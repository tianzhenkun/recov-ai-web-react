import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createElement } from 'react';

const mockCallOrder: string[] = [];
const mockFloatingProcessPanelProps: any[] = [];
const mockSseListeners: any[] = [];

const mockHistory = {
  location: {
    hash: '',
    pathname: '/sys/settle',
    search: '',
  },
  push: jest.fn(),
  replace: jest.fn(),
};

const mockGetStoredDynamicTenantId = jest.fn();
const mockClearStoredDynamicTenantId = jest.fn();
const mockDynamicTenant = jest.fn();
const mockGetInfo = jest.fn();
const mockLoadRuoyiMenuData = jest.fn();
const mockResolveRuoyiMenuContext = jest.fn();
const mockSettingDrawerProps: any[] = [];

jest.mock('@umijs/max', () => ({
  history: mockHistory,
  Link: ({ children }: { children: any }) => children,
}));

jest.mock('@ant-design/pro-components', () => ({
  SettingDrawer: (props: any) => {
    mockSettingDrawerProps.push(props);
    const React = require('react');
    return React.createElement(
      'div',
      { 'data-testid': 'mock-setting-drawer' },
      props.drawerProps?.title,
    );
  },
}));

jest.mock('@/adapters/ruoyi/dynamicTenant', () => ({
  clearStoredDynamicTenantId: mockClearStoredDynamicTenantId,
  getStoredDynamicTenantId: mockGetStoredDynamicTenantId,
}));

jest.mock('@/adapters/ruoyi/menu', () => ({
  buildLayoutMenuData: jest.fn(() => []),
  getCachedRuoyiMenuData: jest.fn(() => []),
  getFirstVisibleRuoyiPath: jest.fn(() => '/index'),
  getVisibleRuoyiMenuData: jest.fn(() => []),
  isRuoyiDirectoryMenuPath: jest.fn(() => false),
  loadRuoyiMenuData: mockLoadRuoyiMenuData,
  resolveRuoyiMenuContext: mockResolveRuoyiMenuContext,
}));

jest.mock('@/adapters/ruoyi/message', () => ({
  setRuoyiMessage: jest.fn(),
}));

jest.mock('@/adapters/ruoyi/sse', () => ({
  subscribeSseMessage: jest.fn((listener) => {
    mockSseListeners.push(listener);
    return jest.fn();
  }),
}));

jest.mock('@/components', () => ({
  AvatarDropdown: ({ children }: { children: any }) => children,
  ErrorBoundary: ({ children }: { children: any }) => children,
  FloatingProcessPanel: (props: any) => {
    mockFloatingProcessPanelProps.push(props);
    const React = require('react');
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'button',
        {
          'data-has-unread': String(props.hasUnread),
          'data-testid': 'mock-flow-process-panel-expand',
          type: 'button',
          onClick: () => props.onExpandedChange?.(true),
        },
        '展开流程信息面板',
      ),
      React.createElement(
        'button',
        {
          'data-testid': 'mock-flow-process-panel-collapse',
          type: 'button',
          onClick: () => props.onExpandedChange?.(false),
        },
        '收起流程信息面板',
      ),
      React.createElement(
        'button',
        {
          'data-testid': 'mock-flow-process-panel-view-all',
          type: 'button',
          onClick: () => props.onViewAllLogs?.(),
        },
        '查看全量运行日志',
      ),
    );
  },
  Footer: () => null,
  SiderFooterAction: (props: any) => {
    const React = require('react');
    return React.createElement(
      props.href ? 'a' : 'button',
      {
        'aria-label': props['aria-label'],
        className: [
          'recov-sider-footer-action',
          props.collapsed ? 'recov-sider-footer-action-collapsed' : undefined,
          props.className,
        ]
          .filter(Boolean)
          .join(' '),
        'data-collapsed': String(Boolean(props.collapsed)),
        href: props.href,
      },
      props.label,
    );
  },
  NotificationCenter: (props: any) => {
    const React = require('react');
    return React.createElement(
      'div',
      {
        'data-collapsed': String(Boolean(props.collapsed)),
        'data-testid': 'mock-notification-center',
        'data-variant': props.variant,
      },
      '通知中心',
    );
  },
  OfflineBanner: () => null,
  SseBootstrap: () => null,
  TenantSwitch: (props: any) => {
    const React = require('react');
    return React.createElement(
      'div',
      {
        'data-collapsed': String(Boolean(props.collapsed)),
        'data-testid': 'mock-tenant-switch',
        'data-variant': props.variant,
      },
      '切换租户',
    );
  },
}));

jest.mock('@/services/ruoyi/flowEvent', () => ({
  buildFlowEventDisplaySummary: (event: any) => {
    const accountPrefix =
      event.debtNumber === null || event.debtNumber === undefined
        ? '账户'
        : `${event.debtNumber}号账户`;
    return `${accountPrefix} ${event.eventContent || event.eventTitle || '流程事件已更新。'}`;
  },
  getFlowEventUnreadCount: jest.fn(),
  getFlowEventPage: jest.fn(),
  markAllFlowEventsRead: jest.fn(),
  normalizeFlowEventPageResult: jest.fn(() => ({ rows: [] })),
  normalizeFlowEventUnreadCount: jest.fn(() => 0),
}));

jest.mock('@/services/ruoyi/tenant', () => ({
  dynamicTenant: mockDynamicTenant,
}));

jest.mock('@/services/ruoyi/user', () => ({
  getInfo: mockGetInfo,
}));

describe('getInitialState dynamic tenant restore', () => {
  beforeEach(() => {
    mockCallOrder.length = 0;
    jest.clearAllMocks();
    mockFloatingProcessPanelProps.length = 0;
    mockHistory.location = {
      hash: '',
      pathname: '/sys/settle',
      search: '',
    };

    mockGetStoredDynamicTenantId.mockReturnValue('277201');
    mockGetInfo.mockImplementation(async () => {
      mockCallOrder.push('getInfo');
      return {
        data: {
          permissions: [],
          roles: ['admin'],
          user: {
            nickName: '超级管理员',
            userId: 1,
            userName: 'admin',
          },
        },
      };
    });
    mockDynamicTenant.mockImplementation(async () => {
      mockCallOrder.push('dynamicTenant');
      return {};
    });
    mockLoadRuoyiMenuData.mockImplementation(async () => {
      mockCallOrder.push('loadMenu');
      return [];
    });
    mockResolveRuoyiMenuContext.mockReturnValue({
      activeWorkspaceKey: undefined,
      homePath: '/index',
      menuMode: 'default',
      visibleMenuData: [],
    });
  });

  it('re-applies stored dynamic tenant after getInfo clears backend dynamic state', async () => {
    const { getInitialState } = require('./app');

    const initialState = await getInitialState();

    expect(initialState.dynamicTenantId).toBe('277201');
    expect(mockDynamicTenant).toHaveBeenCalledWith('277201');
    expect(mockCallOrder).toEqual(['getInfo', 'dynamicTenant', 'loadMenu']);
  });

  it('keeps stored dynamic tenant when restore fails with a transient server error', async () => {
    const { RuoyiError } = require('@/adapters/ruoyi/response');
    mockDynamicTenant.mockRejectedValueOnce(
      new RuoyiError('服务暂时不可用', { code: 500 }),
    );
    const { getInitialState } = require('./app');

    const initialState = await getInitialState();

    expect(initialState.dynamicTenantId).toBeUndefined();
    expect(mockClearStoredDynamicTenantId).not.toHaveBeenCalled();
  });

  it('does not wrap an existing login redirect when getInfo already redirected', async () => {
    mockHistory.location = {
      hash: '',
      pathname: '/intelligent-outbound',
      search: '',
    };
    mockGetInfo.mockImplementationOnce(async () => {
      mockHistory.location = {
        hash: '',
        pathname: '/user/login',
        search: '?redirect=%2Fintelligent-outbound',
      };
      throw new Error('会话已过期');
    });
    const { getInitialState } = require('./app');

    await getInitialState();

    expect(mockHistory.replace).not.toHaveBeenCalled();
  });
});

describe('layout floating process panel read state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFloatingProcessPanelProps.length = 0;
    mockSseListeners.length = 0;
    mockSettingDrawerProps.length = 0;
  });

  it('keeps unread dot on first open and marks visible events read after collapsing the floating panel', async () => {
    const flowEventService = require('@/services/ruoyi/flowEvent');
    flowEventService.getFlowEventUnreadCount.mockResolvedValue({ data: 1 });
    flowEventService.normalizeFlowEventUnreadCount
      .mockReturnValueOnce(1)
      .mockReturnValue(0);
    flowEventService.getFlowEventPage.mockResolvedValue({ rows: [], total: 0 });
    flowEventService.normalizeFlowEventPageResult.mockReturnValue({
      rows: [
        {
          id: '1',
          eventTitle: '流程事件更新',
          createTime: '2026-05-31T12:00:00',
        },
      ],
      total: 1,
    });
    flowEventService.markAllFlowEventsRead.mockResolvedValue({});

    const { layout } = require('./app');
    const config = layout({
      initialState: {
        currentUser: { userid: '7' },
        settings: {},
      },
      setInitialState: jest.fn(),
    });

    render(config.childrenRender(createElement('div')));

    fireEvent.click(screen.getByTestId('mock-flow-process-panel-expand'));

    await waitFor(() => {
      expect(flowEventService.getFlowEventPage).toHaveBeenCalledWith({
        pageNum: 1,
        pageSize: 10,
      });
    });
    expect(flowEventService.markAllFlowEventsRead).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mockFloatingProcessPanelProps.at(-1)?.hasUnread).toBe(true);
    });

    fireEvent.click(screen.getByTestId('mock-flow-process-panel-collapse'));

    await waitFor(() => {
      expect(flowEventService.markAllFlowEventsRead).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the unread dot immediately after a flow-event SSE signal while unread count refresh is pending', async () => {
    const flowEventService = require('@/services/ruoyi/flowEvent');
    flowEventService.getFlowEventUnreadCount
      .mockResolvedValueOnce({ data: 0 })
      .mockImplementationOnce(() => new Promise(() => {}));
    flowEventService.normalizeFlowEventUnreadCount.mockReturnValue(0);

    const { layout } = require('./app');
    const config = layout({
      initialState: {
        currentUser: { userid: '7' },
        settings: {},
      },
      setInitialState: jest.fn(),
    });

    render(config.childrenRender(createElement('div')));

    await waitFor(() => {
      expect(mockSseListeners).toHaveLength(1);
    });
    await waitFor(() => {
      expect(mockFloatingProcessPanelProps.at(-1)?.hasUnread).toBe(false);
    });

    await act(async () => {
      mockSseListeners[0]({
        data: { type: 'recov.flow_event.changed' },
        event: 'message',
        type: 'recov.flow_event.changed',
      });
    });

    await waitFor(() => {
      expect(mockFloatingProcessPanelProps.at(-1)?.hasUnread).toBe(true);
    });
  });

  it('routes all flow logs to the standard flow events page', async () => {
    const flowEventService = require('@/services/ruoyi/flowEvent');
    flowEventService.getFlowEventUnreadCount.mockResolvedValue({ data: 1 });
    flowEventService.normalizeFlowEventUnreadCount
      .mockReturnValueOnce(1)
      .mockReturnValue(0);
    flowEventService.markAllFlowEventsRead.mockResolvedValue({});

    const { layout } = require('./app');
    const config = layout({
      initialState: {
        currentUser: { userid: '7' },
        settings: {},
      },
      setInitialState: jest.fn(),
    });

    render(config.childrenRender(createElement('div')));

    fireEvent.click(screen.getByTestId('mock-flow-process-panel-view-all'));

    expect(mockHistory.push).toHaveBeenCalledWith('/flow-events');
    await waitFor(() => {
      expect(flowEventService.markAllFlowEventsRead).toHaveBeenCalledTimes(1);
    });
  });
});

describe('layout color theme settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettingDrawerProps.length = 0;
  });

  it('adds a layered dark navigation theme entry to the preference drawer', () => {
    const { layout } = require('./app');
    const config = layout({
      initialState: {
        currentUser: { userid: '7' },
        settings: {},
      },
      setInitialState: jest.fn(),
    });

    render(config.childrenRender(createElement('div')));

    expect(screen.getByText('界面主题')).toBeTruthy();
    expect(screen.getByText('默认浅色')).toBeTruthy();
    expect(screen.getByText('深色导航')).toBeTruthy();
  });

  it('applies local tokens for the layered dark navigation theme', () => {
    const { layout } = require('./app');
    const config = layout({
      initialState: {
        currentUser: { userid: '7' },
        settings: {
          colorPrimary: '#722ED1',
          recovColorTheme: 'layeredDarkNav',
        },
      },
      setInitialState: jest.fn(),
    });

    expect(config.className).toContain('recov-layout-theme-layered-dark-nav');
    expect(config.bgLayoutImgList).toEqual([]);
    expect(config.token?.bgLayout).toContain('#f7f8fa');
    expect(config.token?.header?.colorBgHeader).toBeUndefined();
    expect(config.token?.header?.colorBgMenuItemSelected).toBeUndefined();
    expect(config.token?.sider?.colorMenuBackground).toBe('#1a1d24');
    expect(config.token?.sider?.colorTextMenuTitle).toBe('#ffffff');
    expect(config.token?.sider?.colorBgMenuItemSelected).toBe(
      'rgba(114, 46, 209, 0.16)',
    );
    expect(config.token?.sider?.colorTextMenuSelected).toBe('#ffffff');
    expect(config.token?.sider?.colorTextCollapsedButtonHover).toBe('#9254de');
  });

  it('keeps the sider brand header available in side layout', () => {
    const { layout } = require('./app');
    const config = layout({
      initialState: {
        currentUser: { userid: '7' },
        settings: {
          layout: 'side',
          recovColorTheme: 'layeredDarkNav',
        },
      },
      setInitialState: jest.fn(),
    });

    expect(config.menuHeaderRender).not.toBe(false);
  });

  it('uses a unified side-layout footer instead of mixed links and actions', () => {
    const { layout } = require('./app');
    const config = layout({
      initialState: {
        currentUser: { name: '超级管理员', userid: '7' },
        settings: {
          layout: 'side',
          recovColorTheme: 'layeredDarkNav',
        },
      },
      setInitialState: jest.fn(),
    });

    expect(config.links).toBeUndefined();
    expect(config.actionsRender).toBe(false);
    expect(config.avatarProps).toBe(false);
    expect(typeof config.menuFooterRender).toBe('function');

    const { container, rerender } = render(
      config.menuFooterRender({
        collapsed: false,
        layout: 'side',
      }),
    );

    expect(container.querySelector('.recov-sider-footer')).toBeTruthy();
    expect(screen.queryByText('灵宸官网')).toBeNull();
    expect(screen.getByText('超级管理员')).toBeTruthy();
    expect(
      screen.getByTestId('mock-tenant-switch').getAttribute('data-variant'),
    ).toBe('sider');
    expect(
      screen.getByTestId('mock-tenant-switch').getAttribute('data-collapsed'),
    ).toBe('false');
    expect(
      screen
        .getByTestId('mock-notification-center')
        .getAttribute('data-variant'),
    ).toBe('sider');
    expect(container.textContent).toMatch(/切换租户.*通知中心.*超级管理员/);

    rerender(
      config.menuFooterRender({
        collapsed: true,
        layout: 'side',
      }),
    );

    expect(
      container.querySelector('.recov-sider-footer-collapsed'),
    ).toBeTruthy();
    expect(
      screen.getByTestId('mock-tenant-switch').getAttribute('data-collapsed'),
    ).toBe('true');
  });

  it('keeps non-side layout controls on the original header and links channels', () => {
    const { layout } = require('./app');
    const config = layout({
      initialState: {
        currentUser: { userid: '7' },
        settings: {
          layout: 'mix',
          recovColorTheme: 'layeredDarkNav',
        },
      },
      setInitialState: jest.fn(),
    });

    const mixSiderActions = config.actionsRender({ layout: 'mix' }) as any[];
    const headerActions = config.actionsRender({ hasSiderMenu: true }) as any[];
    const staleSideActions = config.actionsRender({ layout: 'side' }) as any[];

    expect(config.links).toHaveLength(1);
    expect(config.avatarProps).toBeTruthy();
    expect(mixSiderActions[0].props.variant).toBe('select');
    expect(mixSiderActions[1].props.variant).toBe('icon');
    expect(headerActions[0].props.variant).toBe('select');
    expect(headerActions[1].props.variant).toBe('icon');
    expect(staleSideActions).toEqual([]);
    expect(config.avatarProps.icon).toBeUndefined();
  });

  it('renders the header user dropdown trigger without the default avatar outside side layout', () => {
    const { layout } = require('./app');
    const config = layout({
      initialState: {
        currentUser: { name: '超级管理员', userid: '7' },
        settings: {
          layout: 'mix',
          recovColorTheme: 'layeredDarkNav',
        },
      },
      setInitialState: jest.fn(),
    });

    const defaultAvatar = createElement(
      'div',
      { 'data-testid': 'default-avatar-node' },
      '默认头像节点',
    );

    render(
      config.avatarProps.render(config.avatarProps, defaultAvatar, {
        layout: 'mix',
      }),
    );

    expect(screen.getByText('超级管理员')).toBeTruthy();
    expect(screen.queryByTestId('default-avatar-node')).toBeNull();
  });

  it('keeps the default layout theme free of layered dark navigation overrides', () => {
    const { layout } = require('./app');
    const config = layout({
      initialState: {
        currentUser: { userid: '7' },
        settings: {
          colorPrimary: '#722ED1',
        },
      },
      setInitialState: jest.fn(),
    });

    expect(config.className || '').not.toContain(
      'recov-layout-theme-layered-dark-nav',
    );
    expect(config.token?.sider?.colorMenuBackground).toBeUndefined();
  });
});
