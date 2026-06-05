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

jest.mock('@umijs/max', () => ({
  history: mockHistory,
  Link: ({ children }: { children: any }) => children,
}));

jest.mock('@ant-design/pro-components', () => ({
  SettingDrawer: () => null,
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
  NotificationCenter: () => null,
  OfflineBanner: () => null,
  SseBootstrap: () => null,
  TenantSwitch: () => null,
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
});

describe('layout floating process panel read state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFloatingProcessPanelProps.length = 0;
    mockSseListeners.length = 0;
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
