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
  getCachedRuoyiMenuData,
  getFirstVisibleRuoyiPath,
  loadRuoyiMenuData,
  type RuoyiMenuDataItem,
  resolveRuoyiMenuContext,
} from '@/adapters/ruoyi/menu';

const { Text } = Typography;

const RuoyiPlaceholder = () => {
  const routeLocation = useLocation();
  const pathname = routeLocation.pathname;
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
                onClick={async () => {
                  const cachedMenuData = getCachedRuoyiMenuData();
                  const menuData =
                    cachedMenuData.length > 0
                      ? cachedMenuData
                      : await loadRuoyiMenuData();
                  const menuContext = resolveRuoyiMenuContext(
                    pathname,
                    menuData,
                  );
                  const firstPath =
                    menuContext.homePath || getFirstVisibleRuoyiPath(menuData);
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
