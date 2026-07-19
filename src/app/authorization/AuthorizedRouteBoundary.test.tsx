import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';
import type { RuoyiRoute } from '@/app/menu';
import AuthorizedRouteBoundary from './AuthorizedRouteBoundary';

const salesRoutes: RuoyiRoute[] = [
  {
    component: 'Layout',
    path: '/sales',
    children: [{ component: 'sales/leads', path: 'leads' }],
  },
];

describe('AuthorizedRouteBoundary', () => {
  it.each([
    '/billing/orders',
    '/account/center',
  ])('does not mount private content for an anonymous path: %s', (pathname) => {
    const privateMount = jest.fn();
    const PrivatePage = () => {
      useEffect(() => {
        privateMount();
      }, []);
      return <div>匿名不可见页面</div>;
    };

    render(
      <AuthorizedRouteBoundary
        contextKey="anonymous:default"
        loadRoutes={jest.fn()}
        pathname={pathname}
        signedIn={false}
      >
        <PrivatePage />
      </AuthorizedRouteBoundary>,
    );

    expect(privateMount).not.toHaveBeenCalled();
    expect(screen.queryByText('匿名不可见页面')).toBeNull();
  });

  it('allows the login page for an anonymous user', () => {
    render(
      <AuthorizedRouteBoundary
        contextKey="anonymous:default"
        loadRoutes={jest.fn()}
        pathname="/user/login"
        signedIn={false}
      >
        <div>登录页面</div>
      </AuthorizedRouteBoundary>,
    );

    expect(screen.getByText('登录页面')).toBeTruthy();
  });

  it('does not mount children while the authorized tree is loading', () => {
    render(
      <AuthorizedRouteBoundary
        contextKey="user:tenant"
        loadRoutes={() => new Promise(() => {})}
        pathname="/sales/leads"
        signedIn
      >
        <div>受保护页面</div>
      </AuthorizedRouteBoundary>,
    );

    expect(screen.queryByText('受保护页面')).toBeNull();
    expect(screen.getByText('正在校验页面权限')).toBeTruthy();
  });

  it('mounts children only when the backend tree grants the route', async () => {
    render(
      <AuthorizedRouteBoundary
        contextKey="user:tenant"
        loadRoutes={async () => salesRoutes}
        pathname="/sales/leads"
        signedIn
      >
        <div>受保护页面</div>
      </AuthorizedRouteBoundary>,
    );

    expect(await screen.findByText('受保护页面')).toBeTruthy();
  });

  it('renders 403 without mounting denied content', async () => {
    render(
      <AuthorizedRouteBoundary
        contextKey="user:tenant"
        loadRoutes={async () => salesRoutes}
        pathname="/billing/orders"
        signedIn
      >
        <div>未授权页面</div>
      </AuthorizedRouteBoundary>,
    );

    expect(await screen.findByText('无权访问该页面')).toBeTruthy();
    expect(screen.queryByText('未授权页面')).toBeNull();
  });

  it('does not mount the next page with a stale allowed decision', async () => {
    let resolveDeniedRoutes: ((routes: RuoyiRoute[]) => void) | undefined;
    const loadRoutes = jest
      .fn()
      .mockResolvedValueOnce(salesRoutes)
      .mockImplementationOnce(
        () =>
          new Promise<RuoyiRoute[]>((resolve) => {
            resolveDeniedRoutes = resolve;
          }),
      );
    const deniedMount = jest.fn();
    const DeniedPage = () => {
      useEffect(() => {
        deniedMount();
      }, []);
      return <div>不应挂载的新页面</div>;
    };

    const { rerender } = render(
      <AuthorizedRouteBoundary
        contextKey="user:tenant"
        loadRoutes={loadRoutes}
        pathname="/sales/leads"
        signedIn
      >
        <div>已授权页面</div>
      </AuthorizedRouteBoundary>,
    );

    expect(await screen.findByText('已授权页面')).toBeTruthy();

    rerender(
      <AuthorizedRouteBoundary
        contextKey="user:tenant"
        loadRoutes={loadRoutes}
        pathname="/billing/orders"
        signedIn
      >
        <DeniedPage />
      </AuthorizedRouteBoundary>,
    );

    expect(deniedMount).not.toHaveBeenCalled();
    expect(screen.queryByText('不应挂载的新页面')).toBeNull();
    expect(screen.getByText('正在校验页面权限')).toBeTruthy();

    resolveDeniedRoutes?.(salesRoutes);
    expect(await screen.findByText('无权访问该页面')).toBeTruthy();
    expect(deniedMount).not.toHaveBeenCalled();
  });

  it('distinguishes load failures and retries fail-closed', async () => {
    const loadRoutes = jest
      .fn()
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce(salesRoutes);
    const clearRoutes = jest.fn();

    render(
      <AuthorizedRouteBoundary
        clearRoutes={clearRoutes}
        contextKey="user:tenant"
        loadRoutes={loadRoutes}
        pathname="/sales/leads"
        signedIn
      >
        <div>重试后页面</div>
      </AuthorizedRouteBoundary>,
    );

    expect(await screen.findByText('页面权限加载失败')).toBeTruthy();
    expect(screen.queryByText('重试后页面')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));

    await waitFor(() => expect(clearRoutes).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('重试后页面')).toBeTruthy();
  });
});
