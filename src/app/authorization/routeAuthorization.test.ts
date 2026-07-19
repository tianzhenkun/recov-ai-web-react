import type { RuoyiRoute } from '@/app/menu';
import {
  collectAuthorizedRoutePaths,
  resolveRouteAuthorization,
} from './routeAuthorization';

const routes: RuoyiRoute[] = [
  {
    component: 'Layout',
    path: '/sales',
    children: [
      { component: 'sales/dashboard', path: 'dashboard' },
      { component: 'sales/leads', path: 'leads' },
    ],
  },
  {
    component: 'Layout',
    path: '/system',
    children: [
      { component: 'system/user', path: 'user' },
      {
        component: 'system/user/authRole',
        hidden: true,
        path: 'user-auth/role/:userId',
        meta: { activeMenu: '/system/user' },
      },
    ],
  },
  {
    component: 'Layout',
    path: '/external',
    children: [
      {
        component: 'external',
        path: 'https://example.invalid/help',
      },
    ],
  },
];

describe('backend route authorization', () => {
  it.each([
    '/',
    '/user/login',
    '/exception/403',
    '/account/center',
  ])('allows framework and account routes independently: %s', (pathname) => {
    expect(resolveRouteAuthorization(pathname, [])).toBe('allowed');
  });

  it.each([
    '/sales',
    '/sales/dashboard',
    '/sales/leads/',
    '/system/user-auth/role/42',
  ])('allows paths present in the complete backend tree: %s', (pathname) => {
    expect(resolveRouteAuthorization(pathname, routes)).toBe('allowed');
  });

  it.each([
    '/billing/orders',
    '/sales/leads/export',
    '/salesforce',
    '/system/user-auth/role',
    '/account/credit',
    '/user/register',
    '/user/unknown',
    'https://example.invalid/help',
  ])('denies paths absent from the backend tree: %s', (pathname) => {
    expect(resolveRouteAuthorization(pathname, routes)).toBe('denied');
  });

  it('collects normalized raw paths without granting activeMenu aliases or external links', () => {
    expect(collectAuthorizedRoutePaths(routes)).toEqual([
      '/sales',
      '/sales/dashboard',
      '/sales/leads',
      '/system',
      '/system/user',
      '/system/user-auth/role/:userId',
      '/external',
    ]);
  });
});
