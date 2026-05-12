import { PageContainer, ProCard } from '@ant-design/pro-components';
import { history, useLocation } from '@umijs/max';
import {
  Button,
  Descriptions,
  Result,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import {
  findRuoyiMenuByPath,
  getFirstVisibleRuoyiPath,
  loadRuoyiMenuData,
  type RuoyiMenuDataItem,
} from '@/adapters/ruoyi/menu';
import RoleAuthUserPage from '@/pages/ruoyi/system/role-auth-user';
import AuthRolePage from '@/pages/ruoyi/system/user-auth-role';

const { Text } = Typography;

const getMigratedAuthRoleUserId = (pathname: string) => {
  const match = pathname.match(/^\/system\/user-auth\/role\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
};

const getMigratedRoleAuthRoleId = (pathname: string) => {
  const match = pathname.match(/^\/system\/role-auth\/user\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
};

const RuoyiPlaceholder = () => {
  const routeLocation = useLocation();
  const pathname = routeLocation.pathname;
  const migratedAuthRoleUserId = getMigratedAuthRoleUserId(pathname);
  const migratedRoleAuthRoleId = getMigratedRoleAuthRoleId(pathname);
  const [loading, setLoading] = useState(false);
  const [menuItem, setMenuItem] = useState<RuoyiMenuDataItem | undefined>(() =>
    findRuoyiMenuByPath(pathname),
  );

  useEffect(() => {
    let mounted = true;
    const cachedItem = findRuoyiMenuByPath(pathname);

    if (cachedItem) {
      setMenuItem(cachedItem);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    loadRuoyiMenuData()
      .then((menuData) => {
        if (mounted) {
          setMenuItem(findRuoyiMenuByPath(pathname, menuData));
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [pathname]);

  if (migratedAuthRoleUserId) {
    return <AuthRolePage userId={migratedAuthRoleUserId} />;
  }

  if (migratedRoleAuthRoleId) {
    return <RoleAuthUserPage roleId={migratedRoleAuthRoleId} />;
  }

  if (loading) {
    return (
      <PageContainer title="页面加载中">
        <ProCard>
          <Skeleton active paragraph={{ rows: 4 }} />
        </ProCard>
      </PageContainer>
    );
  }

  if (!menuItem) {
    return (
      <PageContainer title="页面不存在">
        <ProCard>
          <Result
            status="404"
            title="404"
            subTitle="当前路径没有匹配到后端菜单或前端路由。"
            extra={
              <Button type="primary" onClick={() => history.replace('/')}>
                返回首页
              </Button>
            }
          />
        </ProCard>
      </PageContainer>
    );
  }

  const title = menuItem.name || '未迁移页面';

  return (
    <PageContainer title={title}>
      <ProCard>
        <Result
          status="info"
          title="页面待迁移"
          subTitle="该菜单已由后端返回，React 页面尚未实现。当前阶段先提供占位页，后续按模块迁移真实页面。"
          extra={
            <Space>
              <Button
                type="primary"
                onClick={() => {
                  const firstPath = getFirstVisibleRuoyiPath();
                  history.replace(firstPath || '/');
                }}
              >
                返回业务首页
              </Button>
              <Button onClick={() => history.back()}>返回上一页</Button>
            </Space>
          }
        />
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="菜单标题">{title}</Descriptions.Item>
          <Descriptions.Item label="当前路径">
            <Text code>{pathname}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Vue 组件">
            <Text code>{menuItem.ruoyiComponent || '-'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="后端路由名">
            <Text code>{menuItem.ruoyiName || '-'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="激活菜单">
            <Text code>{String(menuItem.ruoyiMeta?.activeMenu || '-')}</Text>
          </Descriptions.Item>
        </Descriptions>
      </ProCard>
    </PageContainer>
  );
};

export default RuoyiPlaceholder;
