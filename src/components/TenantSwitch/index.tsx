import { BankOutlined } from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import type { MenuProps } from 'antd';
import { App, Button, Dropdown, Grid, Select, Tooltip } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  clearStoredDynamicTenantId,
  setStoredDynamicTenantId,
} from '@/adapters/ruoyi/dynamicTenant';
import {
  clearCachedRuoyiMenuData,
  loadRuoyiMenuData,
  resolveRuoyiMenuContext,
} from '@/adapters/ruoyi/menu';
import { getTenantList, type TenantInfo } from '@/app/auth';
import { dynamicClear, dynamicTenant } from '@/shared/services/tenant';
import SiderFooterAction from '../SiderFooterAction';
import { resolveTenantSwitchNextPath } from './navigation';

type TenantOption = TenantInfo['voList'][number];

type TenantSwitchProps = {
  collapsed?: boolean;
  variant?: 'select' | 'sider' | 'icon';
};

const getUserId = (currentUser?: {
  access?: string;
  roles?: string[];
  permissions?: string[];
  userid?: string;
  rawUser?: { userId?: number | string };
}) => currentUser?.rawUser?.userId || currentUser?.userid;

const isSuperAdminUser = (currentUser?: {
  userid?: string;
  rawUser?: { userId?: number | string };
}) => Number(getUserId(currentUser)) === 1;

const TenantSwitch = ({
  collapsed = false,
  variant = 'select',
}: TenantSwitchProps) => {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const { initialState, setInitialState } = useModel('@@initialState');
  const [tenantEnabled, setTenantEnabled] = useState(false);
  const [tenantList, setTenantList] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const currentUser = initialState?.currentUser;
  const isSuperAdmin = isSuperAdminUser(currentUser);
  const canSwitchTenant =
    isSuperAdmin && initialState?.siteProfile?.tenantMode === 'SELECTABLE';
  const selectedTenantId = initialState?.dynamicTenantId;
  const isCompact = !screens.md;

  useEffect(() => {
    if (!canSwitchTenant) {
      clearStoredDynamicTenantId();
      setTenantEnabled(false);
      setTenantList([]);
      return;
    }

    let mounted = true;
    setLoading(true);
    getTenantList(true)
      .then((response) => {
        if (!mounted) return;
        const data = response.data;
        const enabled = data?.tenantEnabled ?? true;
        setTenantEnabled(enabled);
        setTenantList(enabled ? data?.voList || [] : []);
      })
      .catch(() => {
        if (!mounted) return;
        setTenantEnabled(false);
        setTenantList([]);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [canSwitchTenant]);

  const options = useMemo(
    () =>
      tenantList.map((item) => ({
        label: item.companyName,
        value: item.tenantId,
      })),
    [tenantList],
  );

  const refreshAppContext = async (dynamicTenantId?: string) => {
    clearCachedRuoyiMenuData();
    const currentPath = history.location.pathname;
    setInitialState((state) =>
      state
        ? {
            ...state,
            dynamicTenantId,
            tenantSwitchVersion: (state.tenantSwitchVersion || 0) + 1,
          }
        : state,
    );
    const menuData = await loadRuoyiMenuData();
    const menuContext = resolveRuoyiMenuContext(currentPath, menuData);
    const nextPath = resolveTenantSwitchNextPath(
      currentPath,
      menuData,
      menuContext,
    );

    setInitialState((state) => ({
      ...state,
      dynamicTenantId,
      activeMenuWorkspaceKey: menuContext.activeWorkspaceKey,
      menuContextPathname: nextPath,
      menuWorkspaceMode: menuContext.menuMode,
    }));
    history.push(nextPath);
  };

  const handleTenantChange = async (tenantId?: string) => {
    if (!tenantId) {
      setLoading(true);
      try {
        await dynamicClear();
        clearStoredDynamicTenantId();
        await refreshAppContext(undefined);
        message.success('已清除动态租户');
      } finally {
        setLoading(false);
      }
      return;
    }

    const selectedTenant = tenantList.find(
      (item) => item.tenantId === tenantId,
    );
    setLoading(true);
    try {
      await dynamicTenant(tenantId);
      setStoredDynamicTenantId(tenantId);
      await refreshAppContext(tenantId);
      message.success(`已切换到 ${selectedTenant?.companyName || tenantId}`);
    } finally {
      setLoading(false);
    }
  };

  if (!canSwitchTenant || !tenantEnabled || options.length === 0) return null;

  if (variant === 'sider' || variant === 'icon' || isCompact) {
    const menuItems: MenuProps['items'] = [
      {
        disabled: !selectedTenantId,
        key: 'default',
        label: '默认租户',
      },
      { type: 'divider' },
      ...options.map((option) => ({
        key: option.value,
        label: option.label,
      })),
    ];

    if (variant === 'sider') {
      return (
        <Dropdown
          disabled={loading}
          menu={{
            items: menuItems,
            onClick: ({ key }) => {
              handleTenantChange(key === 'default' ? undefined : key);
            },
            selectedKeys: selectedTenantId ? [selectedTenantId] : [],
          }}
          placement="bottomRight"
          trigger={['click']}
        >
          <SiderFooterAction
            aria-label="切换租户"
            className="recov-tenant-switch-trigger-sider"
            collapsed={collapsed}
            disabled={loading}
            icon={<BankOutlined />}
            label="切换租户"
          />
        </Dropdown>
      );
    }

    return (
      <Dropdown
        disabled={loading}
        menu={{
          items: menuItems,
          onClick: ({ key }) => {
            handleTenantChange(key === 'default' ? undefined : key);
          },
          selectedKeys: selectedTenantId ? [selectedTenantId] : [],
        }}
        placement="bottomRight"
        trigger={['click']}
      >
        <Tooltip title="切换租户">
          <Button
            aria-label="切换租户"
            className="recov-tenant-switch-trigger"
            icon={<BankOutlined />}
            loading={loading}
            type="text"
          />
        </Tooltip>
      </Dropdown>
    );
  }

  return (
    <Select
      allowClear
      className="recov-tenant-switch-select"
      showSearch={{ optionFilterProp: 'label' }}
      loading={loading}
      disabled={loading}
      options={options}
      placeholder="切换租户"
      prefix={<BankOutlined />}
      style={{ width: 240 }}
      value={selectedTenantId}
      onChange={handleTenantChange}
    />
  );
};

export default TenantSwitch;
