import { GlobalOutlined, UserOutlined } from '@ant-design/icons';
import type {
  Settings as LayoutSettings,
  MenuDataItem,
  ProLayoutProps,
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
  SiderFooterAction,
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
const billingSandboxPath = '/sys/billing-sandbox';
const isExternalPath = (path?: string) =>
  /^[a-z][a-z\d+\-.]*:\/\//i.test(path || '');
const isLocalBillingSandboxPath = (path: string) =>
  process.env.NODE_ENV !== 'production' && path === billingSandboxPath;

type RecovColorTheme = 'default' | 'layeredDarkNav';
type RecovLayoutSettings = Partial<LayoutSettings> & {
  bgLayoutImgList?: ProLayoutProps['bgLayoutImgList'];
  className?: ProLayoutProps['className'];
  recovColorTheme?: RecovColorTheme;
  token?: ProLayoutProps['token'];
};

const layeredDarkNavTheme = 'layeredDarkNav';
const layeredDarkNavLayoutClass = 'recov-layout-theme-layered-dark-nav';
const layeredDarkNavBgColor = '#1a1d24';
const layeredDarkNavSurfaceColor = '#252934';
const layeredDarkNavAccentColor = '#9254de';
const layeredDarkNavAccentHoverBg = 'rgba(114, 46, 209, 0.1)';
const layeredDarkNavAccentSelectedBg = 'rgba(114, 46, 209, 0.16)';

const layeredDarkNavLayoutToken: NonNullable<ProLayoutProps['token']> = {
  bgLayout:
    'linear-gradient(120deg, rgba(226, 232, 240, 0.72) 1px, transparent 1px), linear-gradient(60deg, rgba(226, 232, 240, 0.56) 1px, transparent 1px), #f7f8fa',
  pageContainer: {
    colorBgPageContainer: '#f7f8fa',
    colorBgPageContainerFixed: '#ffffff',
  },
  sider: {
    colorMenuBackground: layeredDarkNavBgColor,
    colorBgMenuItemActive: layeredDarkNavAccentSelectedBg,
    colorBgMenuItemHover: layeredDarkNavAccentHoverBg,
    colorBgMenuItemSelected: layeredDarkNavAccentSelectedBg,
    colorMenuItemDivider: 'rgba(255, 255, 255, 0.08)',
    colorTextMenu: '#c9ced8',
    colorTextMenuActive: '#ffffff',
    colorTextMenuItemHover: '#ffffff',
    colorTextMenuSecondary: '#7d8492',
    colorTextMenuSelected: '#ffffff',
    colorTextMenuTitle: '#ffffff',
    colorTextSubMenuSelected: '#ffffff',
    colorBgCollapsedButton: layeredDarkNavSurfaceColor,
    colorTextCollapsedButton: '#c9ced8',
    colorTextCollapsedButtonHover: layeredDarkNavAccentColor,
  },
};

const resolveRecovColorTheme = (
  settings?: RecovLayoutSettings,
): RecovColorTheme =>
  settings?.recovColorTheme === layeredDarkNavTheme
    ? layeredDarkNavTheme
    : 'default';

const mergeLayeredDarkNavToken = (
  token?: ProLayoutProps['token'],
): ProLayoutProps['token'] => ({
  ...token,
  ...layeredDarkNavLayoutToken,
  pageContainer: {
    ...token?.pageContainer,
    ...layeredDarkNavLayoutToken.pageContainer,
  },
  sider: {
    ...token?.sider,
    ...layeredDarkNavLayoutToken.sider,
  },
});

const buildRuntimeLayoutSettings = (
  settings?: RecovLayoutSettings,
): Partial<LayoutSettings> & Partial<ProLayoutProps> => {
  const {
    bgLayoutImgList,
    className,
    recovColorTheme: _recovColorTheme,
    token,
    ...restSettings
  } = settings || {};
  const colorTheme = resolveRecovColorTheme(settings);

  if (colorTheme !== layeredDarkNavTheme) {
    return {
      ...restSettings,
      bgLayoutImgList,
      className,
      token,
    };
  }

  return {
    ...restSettings,
    bgLayoutImgList: [],
    className: [className, layeredDarkNavLayoutClass].filter(Boolean).join(' '),
    navTheme: 'light',
    token: mergeLayeredDarkNavToken(token),
  };
};

type RecovSiderFooterProps = {
  collapsed?: boolean;
  currentUserName?: React.ReactNode;
  notificationContextKey: string;
  notificationEnabled: boolean;
};

const RecovSiderFooter = ({
  collapsed = false,
  currentUserName,
  notificationContextKey,
  notificationEnabled,
}: RecovSiderFooterProps) => (
  <div
    className={[
      'recov-sider-footer',
      collapsed ? 'recov-sider-footer-collapsed' : undefined,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div className="recov-sider-footer-group">
      <TenantSwitch collapsed={collapsed} variant="sider" />
      <NotificationCenter
        collapsed={collapsed}
        contextKey={notificationContextKey}
        enabled={notificationEnabled}
        variant="sider"
      />
      <AvatarDropdown>
        <SiderFooterAction
          aria-label="用户菜单"
          collapsed={collapsed}
          icon={<UserOutlined />}
          label={currentUserName || '用户'}
        />
      </AvatarDropdown>
    </div>
  </div>
);

const recovListPagePaths = new Set([
  '/datelligence',
  '/delivery',
  '/flow-events',
  '/flow-manager',
  '/instrument-list',
  '/litigation-process',
  '/reconciliation',
  '/sys/instrument-standing',
  '/sys/instrument-template',
  '/sys/project',
  billingSandboxPath,
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

const createBillingSandboxUser = (): RuoyiCurrentUser => ({
  userid: 'billing-sandbox',
  name: '测试用户',
  access: 'admin',
  roles: ['admin'],
  permissions: ['*:*:*'],
});

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
  settings?: RecovLayoutSettings;
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
      if (pathname !== loginPath) {
        history.replace(
          `${loginPath}?redirect=${encodeURIComponent(pathname + search + hash)}`,
        );
      }
    }
    return undefined;
  };
  // 如果不是登录页面，执行
  const { location } = history;
  const floatingProcessPanelDefaultMode =
    getStoredFloatingProcessPanelDefaultMode();
  if (isLocalBillingSandboxPath(location.pathname)) {
    return {
      fetchUserInfo,
      currentUser: createBillingSandboxUser(),
      settings: defaultSettings as RecovLayoutSettings,
      floatingProcessPanelDefaultMode,
      settingDrawerOpen: false,
      tenantSwitchVersion: 0,
      menuWorkspaceMode: 'default',
      menuContextPathname: location.pathname,
    };
  }

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
      settings: defaultSettings as RecovLayoutSettings,
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
    settings: defaultSettings as RecovLayoutSettings,
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
  const recovColorTheme = resolveRecovColorTheme(initialState?.settings);
  const backgroundFeaturesEnabled =
    Boolean(initialState?.currentUser?.userid) &&
    !isLocalBillingSandboxPath(history.location.pathname);
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
  const flowEventUnreadCountRef = React.useRef(0);
  const shouldMarkFlowProcessReadOnCollapseRef = React.useRef(false);

  React.useEffect(() => {
    flowEventUnreadCountRef.current = flowEventUnreadCount;
  }, [flowEventUnreadCount]);

  const loadFlowProcessItems = React.useCallback(
    async (silent = false) => {
      if (!backgroundFeaturesEnabled) {
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
        if (
          flowProcessPanelExpandedRef.current &&
          pageResult.rows.some((item) => item.read === false)
        ) {
          shouldMarkFlowProcessReadOnCollapseRef.current = true;
        }
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
      backgroundFeaturesEnabled,
      initialState?.currentUser?.userid,
      initialState?.dynamicTenantId,
      initialState?.tenantSwitchVersion,
    ],
  );

  const loadFlowEventUnreadCount = React.useCallback(async () => {
    if (!backgroundFeaturesEnabled) {
      setFlowEventUnreadCount(0);
      return;
    }

    flowEventUnreadRequestSeqRef.current += 1;
    const seq = flowEventUnreadRequestSeqRef.current;

    try {
      const response = await getFlowEventUnreadCount();
      if (seq !== flowEventUnreadRequestSeqRef.current) return;
      const nextUnreadCount = normalizeFlowEventUnreadCount(response);
      flowEventUnreadCountRef.current = nextUnreadCount;
      setFlowEventUnreadCount(nextUnreadCount);
    } catch {
      if (seq !== flowEventUnreadRequestSeqRef.current) return;
      flowEventUnreadCountRef.current = 0;
      setFlowEventUnreadCount(0);
    }
  }, [
    backgroundFeaturesEnabled,
    initialState?.currentUser?.userid,
    initialState?.dynamicTenantId,
    initialState?.tenantSwitchVersion,
  ]);

  const markFlowProcessItemsRead = React.useCallback(async () => {
    if (!backgroundFeaturesEnabled) return;

    try {
      await markAllFlowEventsRead();
      setFlowProcessItems((currentItems) =>
        currentItems.map((item) =>
          item.read === false ? { ...item, read: true } : item,
        ),
      );
      flowEventUnreadCountRef.current = 0;
      shouldMarkFlowProcessReadOnCollapseRef.current = false;
      setFlowEventUnreadCount(0);
      void loadFlowEventUnreadCount();
    } catch {
      void loadFlowEventUnreadCount();
    }
  }, [
    backgroundFeaturesEnabled,
    initialState?.currentUser?.userid,
    initialState?.dynamicTenantId,
    initialState?.tenantSwitchVersion,
    loadFlowEventUnreadCount,
  ]);

  const loadFlowProcessItemsForViewing = React.useCallback(
    async (silent = false) => {
      const loaded = await loadFlowProcessItems(silent);
      if (loaded) {
        if (flowEventUnreadCountRef.current > 0) {
          shouldMarkFlowProcessReadOnCollapseRef.current = true;
        }
        return;
      }
      void loadFlowEventUnreadCount();
    },
    [loadFlowEventUnreadCount, loadFlowProcessItems],
  );

  React.useEffect(() => {
    flowProcessPanelExpandedRef.current = false;
    shouldMarkFlowProcessReadOnCollapseRef.current = false;
    setFlowProcessItems([]);
    void loadFlowEventUnreadCount();
  }, [loadFlowEventUnreadCount]);

  React.useEffect(() => {
    if (!backgroundFeaturesEnabled) return;

    return subscribeSseMessage((message) => {
      if (!isFlowEventSseMessage(message)) return;
      if (flowProcessPanelExpandedRef.current) {
        shouldMarkFlowProcessReadOnCollapseRef.current = true;
        flowEventUnreadCountRef.current = Math.max(
          flowEventUnreadCountRef.current,
          1,
        );
        setFlowEventUnreadCount((current) => Math.max(current, 1));
        void loadFlowProcessItemsForViewing(true);
        return;
      }
      flowEventUnreadCountRef.current = Math.max(
        flowEventUnreadCountRef.current,
        1,
      );
      setFlowEventUnreadCount((current) => Math.max(current, 1));
      void loadFlowEventUnreadCount();
    });
  }, [
    backgroundFeaturesEnabled,
    initialState?.currentUser?.userid,
    initialState?.dynamicTenantId,
    initialState?.tenantSwitchVersion,
    loadFlowEventUnreadCount,
    loadFlowProcessItemsForViewing,
  ]);

  const handleFlowProcessPanelExpandedChange = React.useCallback(
    (nextExpanded: boolean) => {
      flowProcessPanelExpandedRef.current = nextExpanded;
      if (nextExpanded) {
        void loadFlowProcessItemsForViewing();
        return;
      }
      if (shouldMarkFlowProcessReadOnCollapseRef.current) {
        void markFlowProcessItemsRead();
      }
    },
    [loadFlowProcessItemsForViewing, markFlowProcessItemsRead],
  );
  const handleRecovColorThemeChange = React.useCallback(
    (nextTheme: RecovColorTheme) => {
      setInitialState((state) =>
        state
          ? {
              ...state,
              settings: {
                ...state.settings,
                recovColorTheme: nextTheme,
                ...(nextTheme === layeredDarkNavTheme
                  ? { navTheme: 'light' as const }
                  : {}),
              },
            }
          : state,
      );
    },
    [setInitialState],
  );

  return (
    <>
      <SseBootstrap
        connectionKey={sseConnectionKey}
        enabled={backgroundFeaturesEnabled}
      />
      <React.Fragment
        key={`${initialState?.dynamicTenantId || 'default'}-${initialState?.tenantSwitchVersion || 0}`}
      >
        {children}
      </React.Fragment>
      <FloatingProcessPanel
        defaultMode={floatingProcessPanelDefaultMode}
        enabled={backgroundFeaturesEnabled}
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
              <Typography.Text type="secondary">界面主题</Typography.Text>
              <Radio.Group
                name="recov-color-theme"
                optionType="button"
                options={[
                  {
                    label: '默认浅色',
                    value: 'default',
                  },
                  {
                    label: '深色导航',
                    value: layeredDarkNavTheme,
                  },
                ]}
                value={recovColorTheme}
                onChange={(event) => {
                  handleRecovColorThemeChange(
                    event.target.value as RecovColorTheme,
                  );
                }}
              />
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
  const isSideLayout = initialState?.settings?.layout === 'side';
  const isBillingSandboxLayout = isLocalBillingSandboxPath(
    history.location.pathname,
  );
  const layoutBackgroundFeaturesEnabled =
    Boolean(initialState?.currentUser) && !isBillingSandboxLayout;
  const currentUserName = initialState?.currentUser?.name || '用户';
  const notificationContextKey = [
    initialState?.currentUser?.userid || 'anonymous',
    initialState?.dynamicTenantId || 'default',
    initialState?.tenantSwitchVersion || 0,
  ].join(':');
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
    siderWidth: defaultSettings.siderWidth,
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
        if (isBillingSandboxLayout) {
          return buildLayoutMenuData([], defaultMenuData);
        }

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
    actionsRender: isSideLayout
      ? false
      : (layoutProps) => {
          const isSiderActionArea =
            layoutProps.hasSiderMenu === undefined &&
            layoutProps.layout === 'side';
          if (isSiderActionArea) {
            return [];
          }
          return [
            <TenantSwitch key="tenant" variant="select" />,
            <NotificationCenter
              key="notification"
              contextKey={notificationContextKey}
              enabled={layoutBackgroundFeaturesEnabled}
              variant="icon"
            />,
            // 使用文档入口暂时隐藏。
            // <DocLink key="doc" />,
            // 历史版本入口暂时隐藏。
            // <VersionDropdown key="version" />,
          ];
        },
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
    avatarProps: isSideLayout
      ? false
      : {
          src: initialState?.currentUser?.avatar,
          title: currentUserName,
          render: () => (
            <AvatarDropdown>
              <div>{currentUserName}</div>
            </AvatarDropdown>
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
      if (
        !initialState?.currentUser &&
        location.pathname !== loginPath &&
        !isLocalBillingSandboxPath(location.pathname)
      ) {
        history.replace(
          `${loginPath}?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`,
        );
        return;
      }

      if (!isLocalBillingSandboxPath(location.pathname)) {
        void syncMenuContextFromPath(location.pathname);
      }
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
    links: isSideLayout
      ? undefined
      : [
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
    menuFooterRender: (siderProps) =>
      siderProps?.layout === 'side' ? (
        <RecovSiderFooter
          collapsed={Boolean(siderProps.collapsed)}
          currentUserName={currentUserName}
          notificationContextKey={notificationContextKey}
          notificationEnabled={layoutBackgroundFeaturesEnabled}
        />
      ) : null,
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
    ...buildRuntimeLayoutSettings(initialState?.settings),
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
