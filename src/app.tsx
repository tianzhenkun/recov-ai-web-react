import { GlobalOutlined } from '@ant-design/icons';
import type {
  Settings as LayoutSettings,
  MenuDataItem,
} from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import {
  App as AntdApp,
  type BreadcrumbProps,
  Radio,
  Space,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React from 'react';

// Initialize dayjs plugins globally
dayjs.extend(relativeTime);

import {
  clearStoredDynamicTenantId,
  getStoredDynamicTenantId,
} from '@/adapters/ruoyi/dynamicTenant';
import {
  buildLayoutMenuData,
  getCachedRuoyiMenuData,
  getFirstVisibleRuoyiPath,
  getVisibleRuoyiMenuData,
  isRuoyiDirectoryMenuPath,
  loadRuoyiMenuData,
  type RuoyiMenuWorkspaceMode,
  resolveRuoyiMenuContext,
} from '@/adapters/ruoyi/menu';
import { setRuoyiMessage } from '@/adapters/ruoyi/message';
import { RuoYiCode, RuoyiError } from '@/adapters/ruoyi/response';
import { subscribeSseMessage } from '@/adapters/ruoyi/sse';
import {
  AvatarDropdown,
  ErrorBoundary,
  FloatingProcessPanel,
  Footer,
  NotificationCenter,
  OfflineBanner,
  SseBootstrap,
  TenantSwitch,
} from '@/components';
import type {
  FloatingProcessPanelDefaultMode,
  FlowProcessChannel,
  FlowProcessIconKind,
  FlowProcessItem,
  FlowProcessStatus,
} from '@/components/FloatingProcessPanel';
import type { FlowEventPageItem } from '@/services/ruoyi/flowEvent';
import {
  buildFlowEventDisplaySummary,
  getFlowEventPage,
  getFlowEventUnreadCount,
  markAllFlowEventsRead,
  normalizeFlowEventPageResult,
  normalizeFlowEventUnreadCount,
} from '@/services/ruoyi/flowEvent';
import { dynamicTenant } from '@/services/ruoyi/tenant';
import { getInfo, type UserInfo } from '@/services/ruoyi/user';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';

const loginPath = '/user/login';
const isExternalPath = (path?: string) =>
  /^[a-z][a-z\d+\-.]*:\/\//i.test(path || '');

const recovListPagePaths = new Set([
  '/datelligence',
  '/delivery',
  '/flow-events',
  '/flow-manager',
  '/instrument-list',
  '/litigation-process',
  '/reconciliation',
  '/sys/instrument-standing',
  '/test11',
]);

const floatingProcessPanelDefaultModeStorageKey =
  'recov:floating-process-panel-default-mode';
const canUseStorage = () =>
  typeof window !== 'undefined' && typeof localStorage !== 'undefined';
const isFloatingProcessPanelDefaultMode = (
  value: string | null,
): value is FloatingProcessPanelDefaultMode =>
  value === 'normal' || value === 'docked';
const getStoredFloatingProcessPanelDefaultMode =
  (): FloatingProcessPanelDefaultMode => {
    if (!canUseStorage()) return 'normal';
    const storedValue = localStorage.getItem(
      floatingProcessPanelDefaultModeStorageKey,
    );
    return isFloatingProcessPanelDefaultMode(storedValue)
      ? storedValue
      : 'normal';
  };
const setStoredFloatingProcessPanelDefaultMode = (
  value: FloatingProcessPanelDefaultMode,
) => {
  if (!canUseStorage()) return;
  localStorage.setItem(floatingProcessPanelDefaultModeStorageKey, value);
};

const isRecovListPagePath = (pathname: string) =>
  recovListPagePaths.has(pathname);

const floatingProcessPanelPageSize = 10;
const flowEventSseType = 'recov.flow_event.changed';

const resolveFlowProcessStatus = (eventType?: string): FlowProcessStatus => {
  if (!eventType) return 'running';
  if (eventType.includes('failed')) return 'warning';
  if (eventType.includes('completed')) return 'success';
  if (eventType.includes('terminated') || eventType.includes('skipped')) {
    return 'waiting';
  }
  return 'running';
};

const resolveFlowProcessChannel = (
  event: FlowEventPageItem,
): FlowProcessChannel => {
  const sourceType = String(event.sourceType || '').toLowerCase();
  const eventType = String(event.eventType || '').toLowerCase();

  if (
    sourceType.includes('sms') ||
    sourceType.includes('message') ||
    eventType.includes('sms') ||
    eventType.includes('message')
  ) {
    return 'message';
  }

  if (
    sourceType.includes('call') ||
    sourceType.includes('phone') ||
    eventType.includes('call') ||
    eventType.includes('phone')
  ) {
    return 'phone';
  }

  return 'system';
};

const resolveFlowProcessIconKind = (
  event: FlowEventPageItem,
): FlowProcessIconKind => {
  const nodeCode = String(event.nodeCode || '').toLowerCase();
  const sourceType = String(event.sourceType || '').toLowerCase();
  const searchText = [
    event.nodeCode,
    event.nodeName,
    event.eventType,
    event.eventTitle,
    event.eventContent,
    event.reasonText,
    event.sourceType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (nodeCode === 'ai_call') return 'phone';
  if (nodeCode === 'corp_letter') return 'corp-letter';
  if (nodeCode === 'law_letter') return 'law-letter';
  if (
    nodeCode === 'filing_material_submit' ||
    nodeCode === 'litigation_screenshot'
  ) {
    return 'litigation';
  }
  if (nodeCode === 'litigation_result') return 'litigation-result';
  if (nodeCode === 'lawyer_court') return 'workflow';
  if (nodeCode === 'enforcement_screenshot') return 'litigation';
  if (nodeCode === 'enforcement_result') return 'litigation-result';
  if (nodeCode === 'restrict_consumption') return 'warning';
  if (nodeCode === 'credit_blacklist') return 'blacklist';

  if (searchText.includes('律师函') || searchText.includes('law_letter')) {
    return 'law-letter';
  }
  if (
    searchText.includes('企业催收函') ||
    searchText.includes('催收函') ||
    searchText.includes('corp_letter')
  ) {
    return 'corp-letter';
  }
  if (
    searchText.includes('申请诉讼') ||
    searchText.includes('诉讼') ||
    searchText.includes('立案') ||
    searchText.includes('filing') ||
    searchText.includes('litigation')
  ) {
    return 'litigation';
  }
  if (
    searchText.includes('快递') ||
    searchText.includes('express') ||
    searchText.includes('delivery')
  ) {
    return 'express';
  }
  if (
    sourceType.includes('email') ||
    sourceType.includes('mail') ||
    sourceType.includes('sms') ||
    sourceType.includes('message') ||
    searchText.includes('邮件') ||
    searchText.includes('email') ||
    searchText.includes('mail') ||
    searchText.includes('sms') ||
    searchText.includes('message')
  ) {
    return 'email';
  }
  if (
    searchText.includes('盖章') ||
    searchText.includes('seal') ||
    searchText.includes('签章')
  ) {
    return 'seal';
  }
  if (
    sourceType.includes('call') ||
    sourceType.includes('phone') ||
    searchText.includes('外呼') ||
    searchText.includes('电话') ||
    searchText.includes('call') ||
    searchText.includes('phone')
  ) {
    return 'phone';
  }

  return 'system';
};

const toFlowProcessItem = (event: FlowEventPageItem): FlowProcessItem => ({
  id: String(
    event.id ??
      `${event.instanceId ?? 'instance'}-${event.createTime ?? 'time'}-${event.eventType ?? 'event'}`,
  ),
  title: String(event.eventTitle || event.eventType || '流程事件更新'),
  summary: buildFlowEventDisplaySummary(event),
  time: event.createTime || new Date().toISOString(),
  status: resolveFlowProcessStatus(event.eventType),
  channel: resolveFlowProcessChannel(event),
  iconKind: resolveFlowProcessIconKind(event),
  detail: {
    createTime: event.createTime,
    debtNumber: event.debtNumber,
    eventContent: event.eventContent,
    eventTitle: event.eventTitle,
    eventType: event.eventType,
    instanceId: event.instanceId,
    nodeName: event.nodeName,
    reasonText: event.reasonText,
    taskId: event.taskId,
  },
  read: event.read,
});

const isFlowEventSseMessage = (message: { event?: string; type?: string }) =>
  message.type === flowEventSseType || message.event === flowEventSseType;

type LayoutBreadcrumbItem = NonNullable<BreadcrumbProps['items']>[number] & {
  linkPath?: string;
  path?: string;
};

const breadcrumbRender = (
  items: BreadcrumbProps['items'] = [],
): BreadcrumbProps['items'] =>
  items.map((item) => {
    const breadcrumbItem = item as LayoutBreadcrumbItem;
    const path = breadcrumbItem.linkPath || breadcrumbItem.path;

    if (!isRuoyiDirectoryMenuPath(path)) {
      return item;
    }

    return {
      ...breadcrumbItem,
      linkPath: undefined,
      path: undefined,
    };
  });

const RuoyiAppBridge = ({ children }: { children: React.ReactNode }) => {
  const { message } = AntdApp.useApp();

  React.useEffect(() => {
    setRuoyiMessage(message);
  }, [message]);

  return <>{children}</>;
};

export type RuoyiCurrentUser = API.CurrentUser & {
  roles?: string[];
  permissions?: string[];
  rawUser?: UserInfo['user'];
};

const toCurrentUser = (info?: UserInfo): RuoyiCurrentUser | undefined => {
  const user = info?.user;
  if (!user) return undefined;
  const roles = info?.roles || [];
  return {
    userid: String(user.userId || ''),
    name: user.nickName || user.userName || '用户',
    avatar: user.avatar,
    email: user.email,
    phone: user.phonenumber,
    access: roles.includes('admin') ? 'admin' : 'user',
    roles,
    permissions: info?.permissions || [],
    rawUser: user,
  };
};

const getCurrentUserId = (currentUser?: RuoyiCurrentUser) =>
  currentUser?.rawUser?.userId || currentUser?.userid;

const isSuperAdminCurrentUser = (currentUser?: RuoyiCurrentUser) =>
  Number(getCurrentUserId(currentUser)) === 1;

const shouldClearStoredDynamicTenantAfterRestoreError = (error: unknown) =>
  error instanceof RuoyiError &&
  [RuoYiCode.UNAUTHORIZED, 403].includes(Number(error.code));

const restoreDynamicTenantContext = async (currentUser?: RuoyiCurrentUser) => {
  const storedTenantId = getStoredDynamicTenantId();
  if (!storedTenantId) return undefined;
  if (!currentUser) return undefined;

  if (!isSuperAdminCurrentUser(currentUser)) {
    clearStoredDynamicTenantId();
    return undefined;
  }

  try {
    await dynamicTenant(storedTenantId);
    return storedTenantId;
  } catch (error) {
    if (shouldClearStoredDynamicTenantAfterRestoreError(error)) {
      clearStoredDynamicTenantId();
    }
    return undefined;
  }
};

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: RuoyiCurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<RuoyiCurrentUser | undefined>;
  floatingProcessPanelDefaultMode?: FloatingProcessPanelDefaultMode;
  settingDrawerOpen?: boolean;
  dynamicTenantId?: string;
  tenantSwitchVersion?: number;
  activeMenuWorkspaceKey?: string;
  menuWorkspaceMode?: RuoyiMenuWorkspaceMode;
  menuContextPathname?: string;
}> {
  const fetchUserInfo = async () => {
    try {
      const response = await getInfo({ skipErrorHandler: true });
      return toCurrentUser(response.data);
    } catch (_error) {
      const { pathname, search, hash } = history.location;
      history.replace(
        `${loginPath}?redirect=${encodeURIComponent(pathname + search + hash)}`,
      );
    }
    return undefined;
  };
  // 如果不是登录页面，执行
  const { location } = history;
  const floatingProcessPanelDefaultMode =
    getStoredFloatingProcessPanelDefaultMode();
  if (
    ![loginPath, '/user/register', '/user/register-result'].includes(
      location.pathname,
    )
  ) {
    const currentUser = await fetchUserInfo();
    const dynamicTenantId = await restoreDynamicTenantContext(currentUser);
    let menuWorkspaceMode: RuoyiMenuWorkspaceMode = 'default';
    let activeMenuWorkspaceKey: string | undefined;

    if (currentUser) {
      try {
        const menuData = await loadRuoyiMenuData();
        const menuContext = resolveRuoyiMenuContext(
          location.pathname,
          menuData,
        );
        menuWorkspaceMode = menuContext.menuMode;
        activeMenuWorkspaceKey = menuContext.activeWorkspaceKey;
      } catch {
        menuWorkspaceMode = 'default';
        activeMenuWorkspaceKey = undefined;
      }
    }

    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
      floatingProcessPanelDefaultMode,
      settingDrawerOpen: false,
      dynamicTenantId,
      tenantSwitchVersion: 0,
      activeMenuWorkspaceKey,
      menuWorkspaceMode,
      menuContextPathname: location.pathname,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
    floatingProcessPanelDefaultMode,
    settingDrawerOpen: false,
    dynamicTenantId: getStoredDynamicTenantId(),
    tenantSwitchVersion: 0,
    activeMenuWorkspaceKey: undefined,
    menuWorkspaceMode: 'default',
    menuContextPathname: location.pathname,
  };
}

type RuntimeInitialState = Awaited<ReturnType<typeof getInitialState>>;

type AppLayoutChildrenProps = {
  children: React.ReactNode;
  floatingProcessPanelDefaultMode: FloatingProcessPanelDefaultMode;
  initialState?: RuntimeInitialState;
  setInitialState: React.Dispatch<
    React.SetStateAction<RuntimeInitialState | undefined>
  >;
};

const AppLayoutChildren = ({
  children,
  floatingProcessPanelDefaultMode,
  initialState,
  setInitialState,
}: AppLayoutChildrenProps) => {
  const sseConnectionKey = [
    initialState?.currentUser?.userid || 'anonymous',
    initialState?.dynamicTenantId || 'default',
    initialState?.tenantSwitchVersion || 0,
  ].join(':');
  const [flowProcessItems, setFlowProcessItems] = React.useState<
    FlowProcessItem[]
  >([]);
  const [flowProcessItemsLoading, setFlowProcessItemsLoading] =
    React.useState(false);
  const [flowEventUnreadCount, setFlowEventUnreadCount] = React.useState(0);
  const flowProcessRequestSeqRef = React.useRef(0);
  const flowEventUnreadRequestSeqRef = React.useRef(0);
  const flowProcessPanelExpandedRef = React.useRef(false);

  const loadFlowProcessItems = React.useCallback(
    async (silent = false) => {
      if (!initialState?.currentUser?.userid) {
        setFlowProcessItems([]);
        setFlowProcessItemsLoading(false);
        return false;
      }

      flowProcessRequestSeqRef.current += 1;
      const seq = flowProcessRequestSeqRef.current;
      if (!silent) {
        setFlowProcessItemsLoading(true);
      }

      try {
        const response = await getFlowEventPage({
          pageNum: 1,
          pageSize: floatingProcessPanelPageSize,
        });
        if (seq !== flowProcessRequestSeqRef.current) return false;
        const pageResult = normalizeFlowEventPageResult(response);
        setFlowProcessItems(pageResult.rows.map(toFlowProcessItem));
        return true;
      } catch {
        if (seq !== flowProcessRequestSeqRef.current) return false;
        setFlowProcessItems([]);
        return false;
      } finally {
        if (seq === flowProcessRequestSeqRef.current && !silent) {
          setFlowProcessItemsLoading(false);
        }
      }
    },
    [
      initialState?.currentUser?.userid,
      initialState?.dynamicTenantId,
      initialState?.tenantSwitchVersion,
    ],
  );

  const loadFlowEventUnreadCount = React.useCallback(async () => {
    if (!initialState?.currentUser?.userid) {
      setFlowEventUnreadCount(0);
      return;
    }

    flowEventUnreadRequestSeqRef.current += 1;
    const seq = flowEventUnreadRequestSeqRef.current;

    try {
      const response = await getFlowEventUnreadCount();
      if (seq !== flowEventUnreadRequestSeqRef.current) return;
      setFlowEventUnreadCount(normalizeFlowEventUnreadCount(response));
    } catch {
      if (seq !== flowEventUnreadRequestSeqRef.current) return;
      setFlowEventUnreadCount(0);
    }
  }, [
    initialState?.currentUser?.userid,
    initialState?.dynamicTenantId,
    initialState?.tenantSwitchVersion,
  ]);

  const markFlowProcessItemsRead = React.useCallback(async () => {
    if (!initialState?.currentUser?.userid) return;

    try {
      await markAllFlowEventsRead();
      setFlowProcessItems((currentItems) =>
        currentItems.map((item) =>
          item.read === false ? { ...item, read: true } : item,
        ),
      );
      setFlowEventUnreadCount(0);
      void loadFlowEventUnreadCount();
    } catch {
      void loadFlowEventUnreadCount();
    }
  }, [
    initialState?.currentUser?.userid,
    initialState?.dynamicTenantId,
    initialState?.tenantSwitchVersion,
    loadFlowEventUnreadCount,
  ]);

  const loadFlowProcessItemsAndMarkRead = React.useCallback(
    async (silent = false) => {
      const loaded = await loadFlowProcessItems(silent);
      if (loaded) {
        await markFlowProcessItemsRead();
        return;
      }
      void loadFlowEventUnreadCount();
    },
    [loadFlowEventUnreadCount, loadFlowProcessItems, markFlowProcessItemsRead],
  );

  React.useEffect(() => {
    flowProcessPanelExpandedRef.current = false;
    setFlowProcessItems([]);
    void loadFlowEventUnreadCount();
  }, [loadFlowEventUnreadCount]);

  React.useEffect(() => {
    if (!initialState?.currentUser?.userid) return;

    return subscribeSseMessage((message) => {
      if (!isFlowEventSseMessage(message)) return;
      if (flowProcessPanelExpandedRef.current) {
        void loadFlowProcessItemsAndMarkRead(true);
        return;
      }
      void loadFlowEventUnreadCount();
    });
  }, [
    initialState?.currentUser?.userid,
    initialState?.dynamicTenantId,
    initialState?.tenantSwitchVersion,
    loadFlowEventUnreadCount,
    loadFlowProcessItemsAndMarkRead,
  ]);

  const handleFlowProcessPanelExpandedChange = React.useCallback(
    (nextExpanded: boolean) => {
      flowProcessPanelExpandedRef.current = nextExpanded;
      if (nextExpanded) {
        void loadFlowProcessItemsAndMarkRead();
      }
    },
    [loadFlowProcessItemsAndMarkRead],
  );

  return (
    <>
      <SseBootstrap
        connectionKey={sseConnectionKey}
        enabled={Boolean(initialState?.currentUser)}
      />
      <React.Fragment
        key={`${initialState?.dynamicTenantId || 'default'}-${initialState?.tenantSwitchVersion || 0}`}
      >
        {children}
      </React.Fragment>
      <FloatingProcessPanel
        defaultMode={floatingProcessPanelDefaultMode}
        enabled={Boolean(initialState?.currentUser)}
        hasUnread={flowEventUnreadCount > 0}
        items={flowProcessItems}
        loading={flowProcessItemsLoading}
        onExpandedChange={handleFlowProcessPanelExpandedChange}
        onViewAllLogs={() => {
          void markFlowProcessItemsRead();
          history.push('/flow-events');
        }}
      />
      <SettingDrawer
        disableUrlParams
        enableDarkTheme
        collapse={initialState?.settingDrawerOpen}
        onCollapseChange={(open) => {
          setInitialState((s) => ({
            ...s,
            settingDrawerOpen: open,
          }));
        }}
        settings={initialState?.settings}
        onSettingChange={(settings) => {
          setInitialState((s) => ({
            ...s,
            settings,
          }));
        }}
        drawerProps={{
          closable: { placement: 'end' },
          title: (
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
              <Typography.Text strong>偏好设置</Typography.Text>
              <Typography.Text type="secondary">智能体默认展示</Typography.Text>
              <Radio.Group
                optionType="button"
                options={[
                  {
                    label: '正常展示',
                    value: 'normal',
                  },
                  {
                    label: '贴边缩起',
                    value: 'docked',
                  },
                ]}
                value={floatingProcessPanelDefaultMode}
                onChange={(event) => {
                  const nextMode = event.target
                    .value as FloatingProcessPanelDefaultMode;
                  setStoredFloatingProcessPanelDefaultMode(nextMode);
                  setInitialState((state) =>
                    state
                      ? {
                          ...state,
                          floatingProcessPanelDefaultMode: nextMode,
                        }
                      : state,
                  );
                }}
              />
              <Typography.Text type="secondary">
                控制智能体入口默认以正常胶囊还是贴边缩起方式出现。
              </Typography.Text>
            </Space>
          ),
        }}
      />
    </>
  );
};

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  const floatingProcessPanelDefaultMode =
    initialState?.floatingProcessPanelDefaultMode ?? 'normal';
  const syncMenuContextFromPath = async (pathname: string) => {
    if (!initialState?.currentUser) return;

    try {
      const cachedMenuData = getCachedRuoyiMenuData();
      const menuData =
        cachedMenuData.length > 0 ? cachedMenuData : await loadRuoyiMenuData();
      const menuContext = resolveRuoyiMenuContext(pathname, menuData);

      setInitialState((state) => {
        if (!state) return state;
        if (
          state.menuContextPathname === pathname &&
          state.menuWorkspaceMode === menuContext.menuMode &&
          state.activeMenuWorkspaceKey === menuContext.activeWorkspaceKey
        ) {
          return state;
        }

        return {
          ...state,
          activeMenuWorkspaceKey: menuContext.activeWorkspaceKey,
          menuContextPathname: pathname,
          menuWorkspaceMode: menuContext.menuMode,
        };
      });
    } catch {
      // Ignore menu context sync failures and keep the current layout state.
    }
  };

  return {
    menuItemRender: (item, dom) => {
      if (item.path) {
        if (isExternalPath(item.path)) {
          return (
            <a
              href={item.path}
              rel="noreferrer"
              target={item.target || '_blank'}
            >
              {dom}
            </a>
          );
        }
        return (
          <Link to={item.path} prefetch>
            {dom}
          </Link>
        );
      }
      return dom;
    },
    menu: {
      params: {
        currentUserId: initialState?.currentUser?.userid,
        dynamicTenantId: initialState?.dynamicTenantId,
        tenantSwitchVersion: initialState?.tenantSwitchVersion,
        menuContextPathname: initialState?.menuContextPathname,
        activeMenuWorkspaceKey: initialState?.activeMenuWorkspaceKey,
        menuWorkspaceMode: initialState?.menuWorkspaceMode,
      },
      request: async (params, defaultMenuData: MenuDataItem[]) => {
        if (!initialState?.currentUser) {
          return buildLayoutMenuData([], defaultMenuData);
        }

        try {
          const ruoyiMenuData = await loadRuoyiMenuData();
          const pathname =
            typeof params?.menuContextPathname === 'string'
              ? params.menuContextPathname
              : history.location.pathname;
          const menuContext = resolveRuoyiMenuContext(pathname, ruoyiMenuData);

          if (
            menuContext.menuMode === 'workspace' &&
            menuContext.activeWorkspaceKey
          ) {
            return menuContext.visibleMenuData;
          }
          return buildLayoutMenuData(
            menuContext.visibleMenuData,
            defaultMenuData,
          );
        } catch {
          return buildLayoutMenuData([], defaultMenuData);
        }
      },
    },
    breadcrumbRender,
    actionsRender: () => [
      <TenantSwitch key="tenant" />,
      <NotificationCenter
        key="notification"
        contextKey={[
          initialState?.currentUser?.userid || 'anonymous',
          initialState?.dynamicTenantId || 'default',
          initialState?.tenantSwitchVersion || 0,
        ].join(':')}
        enabled={Boolean(initialState?.currentUser)}
      />,
      // 使用文档入口暂时隐藏。
      // <DocLink key="doc" />,
      // 历史版本入口暂时隐藏。
      // <VersionDropdown key="version" />,
    ],
    headerTitleRender: (logo, title) => (
      <a
        href="/"
        onClick={(event) => {
          event.preventDefault();
          const nextPath = getFirstVisibleRuoyiPath(
            getVisibleRuoyiMenuData(getCachedRuoyiMenuData(), {
              menuMode: 'default',
            }),
          );
          setInitialState((state) => ({
            ...state,
            activeMenuWorkspaceKey: undefined,
            menuContextPathname: nextPath || '/',
            menuWorkspaceMode: 'default',
          }));
          history.push(nextPath || '/');
        }}
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
        {logo}
        {title}
      </a>
    ),
    menuHeaderRender: false,
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: initialState?.currentUser?.name || '用户',
      render: (_, avatarChildren) => (
        <AvatarDropdown>{avatarChildren}</AvatarDropdown>
      ),
    },
    // waterMarkProps: {
    //   content: initialState?.currentUser?.name,
    // },
    footerRender: () =>
      isRecovListPagePath(history.location.pathname) ? null : <Footer />,
    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.replace(
          `${loginPath}?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`,
        );
        return;
      }

      void syncMenuContextFromPath(location.pathname);
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: [
      <a
        href="https://lingchen-ai.com/"
        key="lingchen-website"
        rel="noreferrer"
        target="_blank"
      >
        <GlobalOutlined />
        <span>灵宸官网</span>
      </a>,
    ],
    // Replace ProLayout's default ErrorBoundary with our offline-aware version,
    // so chunk load errors show friendly messages instead of "Something went wrong."
    ErrorBoundary,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <AppLayoutChildren
          floatingProcessPanelDefaultMode={floatingProcessPanelDefaultMode}
          initialState={initialState}
          setInitialState={setInitialState}
        >
          {children}
        </AppLayoutChildren>
      );
    },
    ...initialState?.settings,
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  ...errorConfig,
};

export function rootContainer(container: React.ReactNode) {
  return (
    <AntdApp>
      <RuoyiAppBridge>
        <OfflineBanner />
        <ErrorBoundary>{container}</ErrorBoundary>
      </RuoyiAppBridge>
    </AntdApp>
  );
}
