import { GlobalOutlined } from '@ant-design/icons';
import type {
  Settings as LayoutSettings,
  MenuDataItem,
} from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import { App as AntdApp, type BreadcrumbProps } from 'antd';
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
import { RuoyiError } from '@/adapters/ruoyi/response';
import {
  AvatarDropdown,
  ErrorBoundary,
  Footer,
  NotificationCenter,
  OfflineBanner,
  SseBootstrap,
  TenantSwitch,
} from '@/components';
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
  '/flow-manager',
  '/instrument-list',
  '/litigation-process',
  '/reconciliation',
  '/sys/instrument-standing',
  '/test11',
]);

const isRecovListPagePath = (pathname: string) =>
  recovListPagePaths.has(pathname);

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

const restoreDynamicTenantContext = async () => {
  const storedTenantId = getStoredDynamicTenantId();
  if (!storedTenantId) return undefined;

  try {
    await dynamicTenant(storedTenantId);
    return storedTenantId;
  } catch (error) {
    if (error instanceof RuoyiError) {
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
  if (
    ![loginPath, '/user/register', '/user/register-result'].includes(
      location.pathname,
    )
  ) {
    const dynamicTenantId = await restoreDynamicTenantContext();
    const currentUser = await fetchUserInfo();
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
    settingDrawerOpen: false,
    dynamicTenantId: getStoredDynamicTenantId(),
    tenantSwitchVersion: 0,
    activeMenuWorkspaceKey: undefined,
    menuWorkspaceMode: 'default',
    menuContextPathname: location.pathname,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
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
      const sseConnectionKey = [
        initialState?.currentUser?.userid || 'anonymous',
        initialState?.dynamicTenantId || 'default',
        initialState?.tenantSwitchVersion || 0,
      ].join(':');
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
          />
        </>
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
