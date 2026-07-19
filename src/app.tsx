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
import { getSiteConfig } from '@/app/auth';
import { AuthorizedRouteBoundary } from '@/app/authorization';
import {
  AppExtensions,
  type FloatingProcessPanelDefaultMode,
  getStoredFloatingProcessPanelDefaultMode,
  setStoredFloatingProcessPanelDefaultMode,
} from '@/app/extensions';
import { resolveSiteBranding } from '@/branding';
import defaultSettings from '@/branding/base';
import {
  AvatarDropdown,
  ErrorBoundary,
  Footer,
  NotificationCenter,
  OfflineBanner,
  SiderFooterAction,
  SseBootstrap,
  TenantSwitch,
} from '@/components';
import { normalizeSafeExternalUrl } from '@/shared/security/url';
import { dynamicTenant } from '@/shared/services/tenant';
import { getInfo, type UserInfo } from '@/shared/services/user';
import type { CurrentUser } from '@/shared/types';
import { parseSiteProfile, type SiteProfile } from '@/site-profiles';
import { errorConfig } from './requestErrorConfig';

const loginPath = '/user/login';

type AppColorTheme = 'default' | 'layeredDarkNav';
type AppLayoutSettings = Partial<LayoutSettings> & {
  bgLayoutImgList?: ProLayoutProps['bgLayoutImgList'];
  className?: ProLayoutProps['className'];
  colorTheme?: AppColorTheme;
  token?: ProLayoutProps['token'];
};

const layeredDarkNavTheme = 'layeredDarkNav';
const layeredDarkNavLayoutClass = 'app-layout-theme-layered-dark-nav';
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

const resolveAppColorTheme = (settings?: AppLayoutSettings): AppColorTheme =>
  settings?.colorTheme === layeredDarkNavTheme
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
  settings?: AppLayoutSettings,
): Partial<LayoutSettings> & Partial<ProLayoutProps> => {
  const {
    bgLayoutImgList,
    className,
    colorTheme: _colorTheme,
    token,
    ...restSettings
  } = settings || {};
  const colorTheme = resolveAppColorTheme(settings);

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

export type RuoyiCurrentUser = CurrentUser & {
  roles?: string[];
  permissions?: string[];
  rawUser?: UserInfo['user'];
};

const toCurrentUser = (info?: UserInfo): RuoyiCurrentUser | undefined => {
  const user = info?.user;
  if (!user) return undefined;
  const userId = String(user.userId ?? '').trim();
  if (!userId || userId === '0') return undefined;
  const roles = info?.roles || [];
  return {
    userid: userId,
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

const loadSiteProfile = async (): Promise<SiteProfile | undefined> => {
  try {
    const response = await getSiteConfig();
    return parseSiteProfile(response.data);
  } catch {
    return undefined;
  }
};

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: AppLayoutSettings;
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
  siteProfile?: SiteProfile;
}> {
  const fetchUserInfo = async () => {
    try {
      const response = await getInfo({ skipErrorHandler: true });
      const currentUser = toCurrentUser(response.data);
      if (!currentUser) throw new Error('当前用户信息缺少有效标识。');
      return currentUser;
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
  if (location.pathname !== loginPath) {
    const [currentUser, siteProfile] = await Promise.all([
      fetchUserInfo(),
      loadSiteProfile(),
    ]);
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
      settings: defaultSettings as AppLayoutSettings,
      floatingProcessPanelDefaultMode,
      settingDrawerOpen: false,
      dynamicTenantId,
      tenantSwitchVersion: 0,
      activeMenuWorkspaceKey,
      menuWorkspaceMode,
      menuContextPathname: location.pathname,
      siteProfile,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as AppLayoutSettings,
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
  const colorTheme = resolveAppColorTheme(initialState?.settings);
  const backgroundFeaturesEnabled = Boolean(initialState?.currentUser?.userid);
  const sseConnectionKey = [
    initialState?.currentUser?.userid || 'anonymous',
    initialState?.dynamicTenantId || 'default',
    initialState?.tenantSwitchVersion || 0,
  ].join(':');
  const handleAppColorThemeChange = React.useCallback(
    (nextTheme: AppColorTheme) => {
      setInitialState((state) =>
        state
          ? {
              ...state,
              settings: {
                ...state.settings,
                colorTheme: nextTheme,
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
        <AuthorizedRouteBoundary
          contextKey={sseConnectionKey}
          signedIn={backgroundFeaturesEnabled}
        >
          {children}
        </AuthorizedRouteBoundary>
      </React.Fragment>
      <AppExtensions
        contextKey={sseConnectionKey}
        floatingProcessPanelDefaultMode={floatingProcessPanelDefaultMode}
        signedIn={backgroundFeaturesEnabled}
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
                value={colorTheme}
                onChange={(event) => {
                  handleAppColorThemeChange(
                    event.target.value as AppColorTheme,
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
  const layoutBackgroundFeaturesEnabled = Boolean(initialState?.currentUser);
  const currentUserName = initialState?.currentUser?.name || '用户';
  const notificationContextKey = [
    initialState?.currentUser?.userid || 'anonymous',
    initialState?.dynamicTenantId || 'default',
    initialState?.tenantSwitchVersion || 0,
  ].join(':');
  const branding = resolveSiteBranding(initialState?.siteProfile);
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
        const externalPath = normalizeSafeExternalUrl(item.path);
        if (externalPath) {
          return (
            <a
              href={externalPath}
              rel="noopener noreferrer"
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
    // 禁用 Umi 旧版右侧内容兜底，避免注入模板头像和外部资源。
    rightContentRender: false,
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
      <button
        type="button"
        aria-label="返回首页"
        onClick={() => {
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
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 0,
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        {logo}
        {title}
      </button>
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
      isRecovListPagePath(history.location.pathname) ? null : (
        <Footer title={branding.title} />
      ),
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
    bgLayoutImgList: [],
    links: isSideLayout
      ? undefined
      : [
          <a
            href="https://lingchen-ai.com/"
            key="lingchen-website"
            rel="noopener noreferrer"
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
    logo: branding.logo,
    title: branding.title,
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
