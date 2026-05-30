import {
  AppstoreOutlined,
  LogoutOutlined,
  SettingOutlined,
  SkinOutlined,
} from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import type { MenuProps } from 'antd';
import { Spin } from 'antd';
import React, { startTransition, useEffect, useMemo, useState } from 'react';
import { clearStoredDynamicTenantId } from '@/adapters/ruoyi/dynamicTenant';
import {
  clearCachedRuoyiMenuData,
  getFirstVisibleRuoyiPath,
  loadRuoyiMenuData,
  type RuoyiMenuWorkspace,
  resolveRuoyiMenuWorkspaces,
} from '@/adapters/ruoyi/menu';
import { stopSse } from '@/adapters/ruoyi/sse';
import { removeToken } from '@/adapters/ruoyi/token';
import { logout } from '@/services/ruoyi/auth';
import HeaderDropdown from '../HeaderDropdown';

type GlobalHeaderRightProps = {
  children?: React.ReactNode;
};

const loginPath = '/user/login';

export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({
  children,
}) => {
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<RuoyiMenuWorkspace[]>([]);
  const loginOut = async () => {
    try {
      await logout();
    } finally {
      stopSse();
      removeToken();
      clearStoredDynamicTenantId();
      clearCachedRuoyiMenuData();
    }
    const { search, pathname } = window.location;
    const urlParams = new URL(window.location.href).searchParams;
    const searchParams = new URLSearchParams({
      redirect: pathname + search,
    });
    const redirect = urlParams.get('redirect');
    if (window.location.pathname !== loginPath && !redirect) {
      history.replace({
        pathname: loginPath,
        search: searchParams.toString(),
      });
    }
  };
  const { initialState, setInitialState } = useModel('@@initialState');
  const currentUserId = initialState?.currentUser?.userid;
  const activeWorkspaceKey = initialState?.activeMenuWorkspaceKey;

  useEffect(() => {
    if (!currentUserId) {
      setWorkspaces([]);
      return;
    }

    let mounted = true;
    setWorkspaceLoading(true);

    loadRuoyiMenuData()
      .then((menuData) => {
        if (!mounted) return;
        const nextWorkspaces = resolveRuoyiMenuWorkspaces(menuData);
        setWorkspaces(nextWorkspaces);

        if (
          activeWorkspaceKey &&
          !nextWorkspaces.some((item) => item.key === activeWorkspaceKey)
        ) {
          setInitialState((state) => ({
            ...state,
            activeMenuWorkspaceKey: undefined,
          }));
        }
      })
      .catch(() => {
        if (mounted) {
          setWorkspaces([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setWorkspaceLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    activeWorkspaceKey,
    currentUserId,
    initialState?.dynamicTenantId,
    initialState?.tenantSwitchVersion,
    setInitialState,
  ]);

  const workspaceItems = useMemo(
    () =>
      workspaces.map((item) => ({
        key: `workspace:${item.key}`,
        icon: <AppstoreOutlined />,
        label: item.name,
      })),
    [workspaces],
  );

  const onMenuClick: MenuProps['onClick'] = (event) => {
    const { key } = event;
    if (key === 'logout') {
      startTransition(() => {
        setInitialState((s) => ({ ...s, currentUser: undefined }));
      });
      loginOut();
      return;
    }
    if (key === 'theme') {
      setInitialState((s) => ({ ...s, settingDrawerOpen: true }));
      return;
    }
    if (key.startsWith('workspace:')) {
      const workspaceKey = key.slice('workspace:'.length);
      const nextWorkspace = workspaces.find(
        (item) => item.key === workspaceKey,
      );
      if (!nextWorkspace) return;
      setInitialState((state) => ({
        ...state,
        activeMenuWorkspaceKey: nextWorkspace.key,
      }));
      history.push(
        getFirstVisibleRuoyiPath(nextWorkspace.menuData) ||
          nextWorkspace.path ||
          '/',
      );
      return;
    }
    history.push(`/account/${key}`);
  };

  if (!initialState) {
    return <Spin size="small" />;
  }

  const { currentUser } = initialState;
  const isDynamicTenant = Boolean(initialState.dynamicTenantId);

  if (!currentUser) {
    return <Spin size="small" />;
  }

  const menuItems: MenuProps['items'] = [
    ...(isDynamicTenant
      ? []
      : [
          {
            key: 'settings',
            icon: <SettingOutlined />,
            label: '个人设置',
          },
        ]),
    {
      key: 'theme',
      icon: <SkinOutlined />,
      label: '主题设置',
    },
    ...(workspaceItems.length > 0
      ? [
          { type: 'divider' as const },
          ...(workspaceLoading
            ? [
                {
                  key: 'workspace-loading',
                  disabled: true,
                  label: '菜单目录加载中',
                },
              ]
            : workspaceItems),
        ]
      : []),
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  return (
    <HeaderDropdown
      placement="bottomRight"
      menu={{
        selectedKeys: [],
        onClick: onMenuClick,
        items: menuItems,
      }}
      arrow
    >
      {children}
    </HeaderDropdown>
  );
};
