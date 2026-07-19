import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Result, Tabs } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { usePermission } from '@/components/Permission';
import DeploymentManagement from './DeploymentManagement';
import IssueRecordManagement from './IssueRecordManagement';

const LicenseManagementPage = () => {
  const { hasPermission } = usePermission();
  const [activeKey, setActiveKey] = useState('deployments');
  const [issueReloadToken, setIssueReloadToken] = useState(0);

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
      {items.length > 0 ? (
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
