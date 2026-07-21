import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Alert, Button, Result, Spin, Tabs } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePermission } from '@/components/Permission';
import { getLicenseCapabilities } from '@/modules/admin/services/license';
import DeploymentManagement from './DeploymentManagement';
import IssueRecordManagement from './IssueRecordManagement';

type CapabilityState = 'loading' | 'enabled' | 'disabled' | 'error';

const LicenseManagementPage = () => {
  const { hasPermission } = usePermission();
  const [activeKey, setActiveKey] = useState('deployments');
  const [issueReloadToken, setIssueReloadToken] = useState(0);
  const [capabilityState, setCapabilityState] =
    useState<CapabilityState>('loading');

  const loadCapabilities = useCallback(async () => {
    setCapabilityState('loading');
    try {
      const response = await getLicenseCapabilities();
      if (typeof response.data?.issuerEnabled !== 'boolean') {
        throw new Error('许可证能力状态响应无效');
      }
      setCapabilityState(response.data.issuerEnabled ? 'enabled' : 'disabled');
    } catch {
      setCapabilityState('error');
    }
  }, []);

  useEffect(() => {
    void loadCapabilities();
  }, [loadCapabilities]);

  const items = useMemo(
    () =>
      [
        hasPermission('system:license:deployment:list')
          ? {
              key: 'deployments',
              label: '部署管理',
              children: (
                <DeploymentManagement
                  onIssued={() => setIssueReloadToken((current) => current + 1)}
                />
              ),
            }
          : undefined,
        hasPermission('system:license:issue:list')
          ? {
              key: 'issues',
              label: '签发记录',
              children: (
                <IssueRecordManagement reloadToken={issueReloadToken} />
              ),
            }
          : undefined,
      ].filter(Boolean) as {
        key: string;
        label: string;
        children: React.ReactNode;
      }[],
    [hasPermission, issueReloadToken],
  );

  useEffect(() => {
    if (items.length > 0 && !items.some((item) => item.key === activeKey)) {
      setActiveKey(items[0].key);
    }
  }, [activeKey, items]);

  return (
    <PageContainer title="许可证管理">
      {capabilityState === 'loading' ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin description="正在加载许可证能力状态" />
        </div>
      ) : capabilityState === 'error' ? (
        <Alert
          action={
            <Button size="small" onClick={() => void loadCapabilities()}>
              重新加载
            </Button>
          }
          description="无法确认当前部署是否提供许可证签发服务，请检查 System 服务配置后重试。"
          showIcon
          title="许可证能力状态加载失败"
          type="error"
        />
      ) : capabilityState === 'disabled' ? (
        <Alert
          description="当前部署未启用许可证签发能力。许可证管理入口会保留；启用签发服务后即可在此维护部署并签发许可证。"
          showIcon
          title="许可证签发能力未启用"
          type="warning"
        />
      ) : items.length > 0 ? (
        <Tabs activeKey={activeKey} items={items} onChange={setActiveKey} />
      ) : (
        <Result
          status="403"
          title="无许可证管理权限"
          extra={
            <Button type="primary" onClick={() => history.push('/')}>
              返回首页
            </Button>
          }
        />
      )}
    </PageContainer>
  );
};

export default LicenseManagementPage;
