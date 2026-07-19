import { history } from '@umijs/max';
import { Button, Result, Spin } from 'antd';
import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import {
  clearCachedRuoyiMenuData,
  loadRuoyiMenuCatalog,
} from '@/adapters/ruoyi/menu';
import type { RuoyiRoute } from '@/app/menu';
import {
  isPublicRoutePath,
  resolveRouteAuthorization,
} from './routeAuthorization';

type BoundaryStatus = 'loading' | 'allowed' | 'denied' | 'error';

type BoundaryDecision = {
  key: string;
  status: BoundaryStatus;
};

export type AuthorizedRouteBoundaryProps = {
  children: ReactNode;
  clearRoutes?: () => void;
  contextKey: string;
  loadRoutes?: () => Promise<RuoyiRoute[]>;
  pathname?: string;
  signedIn: boolean;
};

const loadCachedRoutes = async () => (await loadRuoyiMenuCatalog()).routes;

const AuthorizedRouteBoundary = ({
  children,
  clearRoutes = clearCachedRuoyiMenuData,
  contextKey,
  loadRoutes = loadCachedRoutes,
  pathname,
  signedIn,
}: AuthorizedRouteBoundaryProps) => {
  const [observedPathname, setObservedPathname] = useState(
    pathname ?? history.location.pathname,
  );
  const [retryVersion, setRetryVersion] = useState(0);
  const currentPathname = pathname ?? observedPathname;
  const decisionKey = JSON.stringify([
    signedIn,
    contextKey,
    currentPathname,
    retryVersion,
  ]);
  const getPendingStatus = (): BoundaryStatus =>
    (!signedIn && isPublicRoutePath(currentPathname)) ||
    (signedIn && resolveRouteAuthorization(currentPathname, []) === 'allowed')
      ? 'allowed'
      : 'loading';
  const [decision, setDecision] = useState<BoundaryDecision>(() => ({
    key: decisionKey,
    status: getPendingStatus(),
  }));

  useEffect(() => {
    if (pathname !== undefined) {
      setObservedPathname(pathname);
      return undefined;
    }
    setObservedPathname(history.location.pathname);
    return history.listen(({ location }) => {
      setObservedPathname(location.pathname);
    });
  }, [pathname]);

  useEffect(() => {
    let active = true;
    if (!signedIn) {
      setDecision({
        key: decisionKey,
        status: isPublicRoutePath(currentPathname) ? 'allowed' : 'loading',
      });
      return () => {
        active = false;
      };
    }
    if (resolveRouteAuthorization(currentPathname, []) === 'allowed') {
      setDecision({ key: decisionKey, status: 'allowed' });
      return () => {
        active = false;
      };
    }

    setDecision({ key: decisionKey, status: 'loading' });
    loadRoutes()
      .then((routes) => {
        if (!active) return;
        setDecision({
          key: decisionKey,
          status: resolveRouteAuthorization(currentPathname, routes),
        });
      })
      .catch(() => {
        if (active) setDecision({ key: decisionKey, status: 'error' });
      });

    return () => {
      active = false;
    };
  }, [currentPathname, decisionKey, loadRoutes, signedIn]);

  const status =
    decision.key === decisionKey ? decision.status : getPendingStatus();

  if (status === 'allowed') return children;
  if (status === 'denied') {
    return (
      <Result
        status="403"
        title="无权访问该页面"
        subTitle="当前账号或租户未获得该页面的后端路由授权。"
      />
    );
  }
  if (status === 'error') {
    return (
      <Result
        status="error"
        title="页面权限加载失败"
        subTitle="为避免沿用旧权限，页面内容已停止加载。"
        extra={
          <Button
            type="primary"
            onClick={() => {
              clearRoutes();
              setRetryVersion((value) => value + 1);
            }}
          >
            重试
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <Spin description="正在校验页面权限" />
    </div>
  );
};

export default AuthorizedRouteBoundary;
