import { BankOutlined } from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import { App, Select } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  clearStoredDynamicTenantId,
  setStoredDynamicTenantId,
} from '@/adapters/ruoyi/dynamicTenant';
import { clearCachedRuoyiMenuData } from '@/adapters/ruoyi/menu';
import { getTenantList, type TenantInfo } from '@/services/ruoyi/auth';
import { dynamicClear, dynamicTenant } from '@/services/ruoyi/tenant';

type TenantOption = TenantInfo['voList'][number];

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

const TenantSwitch = () => {
  const { message } = App.useApp();
  const { initialState, setInitialState } = useModel('@@initialState');
  const [tenantEnabled, setTenantEnabled] = useState(false);
  const [tenantList, setTenantList] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const currentUser = initialState?.currentUser;
  const isSuperAdmin = isSuperAdminUser(currentUser);
  const selectedTenantId = initialState?.dynamicTenantId;

  useEffect(() => {
    if (!isSuperAdmin) {
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
  }, [isSuperAdmin]);

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
    setInitialState((state) => ({
      ...state,
      dynamicTenantId,
      tenantSwitchVersion: (state?.tenantSwitchVersion || 0) + 1,
    }));
    history.push('/');
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

  if (!isSuperAdmin || !tenantEnabled || options.length === 0) return null;

  return (
    <Select
      allowClear
      showSearch
      optionFilterProp="label"
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
