import { PageLoading } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { useEffect } from 'react';
import {
  getFirstVisibleRuoyiPath,
  loadRuoyiMenuData,
} from '@/adapters/ruoyi/menu';

const fallbackPath = '/welcome';

const RuoyiLanding = () => {
  useEffect(() => {
    let mounted = true;

    const redirectToFirstMenu = async () => {
      try {
        const menuData = await loadRuoyiMenuData();
        const firstPath = getFirstVisibleRuoyiPath(menuData);
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
