import { Result, Spin } from 'antd';
import { Suspense } from 'react';
import { getLoginVariantOverride } from '@/adapters/ruoyi/env';
import { isProductionRuntime } from '@/api/runtimeConfig';
import { useLoginController } from './controller';
import { getLoginLayoutComponent, resolveLoginLayoutVariant } from './registry';

const Login = () => {
  const { layoutProps, siteConfig } = useLoginController();
  const resolution = resolveLoginLayoutVariant({
    isProduction: isProductionRuntime,
    localOverride: getLoginVariantOverride(),
    siteVariant: siteConfig?.loginVariant,
  });

  if (!resolution.ok) {
    return (
      <Result
        status="error"
        title="登录页配置错误"
        subTitle={`${resolution.message}请联系管理员检查站点配置。`}
      />
    );
  }

  const Layout = getLoginLayoutComponent(resolution.variant);
  return (
    <Suspense fallback={<Spin fullscreen description="正在加载登录页" />}>
      <Layout {...layoutProps} />
    </Suspense>
  );
};

export default Login;
