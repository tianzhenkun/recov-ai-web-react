import { PageLoading } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { useEffect } from 'react';
import {
  loadRuoyiMenuData,
  resolveRuoyiMenuContext,
} from '@/adapters/ruoyi/menu';

const fallbackPath = '/exception/500';

const RuoyiLanding = () => {
  useEffect(() => {
    let mounted = true;

    const redirectToFirstMenu = async () => {
      try {
        const menuData = await loadRuoyiMenuData();
        const menuContext = resolveRuoyiMenuContext(
          history.location.pathname,
          menuData,
        );
        const firstPath = menuContext.homePath;
        if (mounted) {
          history.replace(firstPath || fallbackPath);
        }
      } catch {
        if (mounted) {
          history.replace(fallbackPath);
        }
      }
    };

    void redirectToFirstMenu();

    return () => {
      mounted = false;
    };
  }, []);

  return <PageLoading />;
};

export default RuoyiLanding;
