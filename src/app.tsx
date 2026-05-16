import { GlobalOutlined } from '@ant-design/icons';
import type {
  Settings as LayoutSettings,
  MenuDataItem,
} from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import { App as AntdApp } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React from 'react';

// Initialize dayjs plugins globally
dayjs.extend(relativeTime);

import { getStoredDynamicTenantId } from '@/adapters/ruoyi/dynamicTenant';
import { buildLayoutMenuData, loadRuoyiMenuData } from '@/adapters/ruoyi/menu';
import { setRuoyiMessage } from '@/adapters/ruoyi/message';
import {
  AvatarDropdown,
  ErrorBoundary,
  Footer,
  LangDropdown,
  OfflineBanner,
  TenantSwitch,
} from '@/components';
import { getInfo, type UserInfo } from '@/services/ruoyi/user';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';

const loginPath = '/user/login';
const isExternalPath = (path?: string) =>
  /^[a-z][a-z\d+\-.]*:\/\//i.test(path || '');

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
    const currentUser = await fetchUserInfo();
    const dynamicTenantId = getStoredDynamicTenantId();
    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
      settingDrawerOpen: false,
      dynamicTenantId,
      tenantSwitchVersion: 0,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
    settingDrawerOpen: false,
    dynamicTenantId: getStoredDynamicTenantId(),
    tenantSwitchVersion: 0,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
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
      },
      request: async (_params, defaultMenuData: MenuDataItem[]) => {
        if (!initialState?.currentUser) {
          return buildLayoutMenuData([], defaultMenuData);
        }

        try {
          const ruoyiMenuData = await loadRuoyiMenuData();
          return buildLayoutMenuData(ruoyiMenuData, defaultMenuData);
        } catch {
          return buildLayoutMenuData([], defaultMenuData);
        }
      },
    },
    actionsRender: () => [
      <TenantSwitch key="tenant" />,
      // 使用文档入口暂时隐藏。
      // <DocLink key="doc" />,
      // 历史版本入口暂时隐藏。
      // <VersionDropdown key="version" />,
      <LangDropdown key="lang" />,
    ],
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
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.replace(
          `${loginPath}?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`,
        );
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
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <>
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
