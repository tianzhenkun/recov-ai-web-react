import type { RuoyiRoute } from '@/app/menu';

export type RouteAuthorizationResult = 'allowed' | 'denied';

const isExternalPath = (path: string) =>
  /^[a-z][a-z\d+\-.]*:\/\//i.test(path) || path.startsWith('//');

const normalizePath = (path: string) => {
  const withoutQuery = path.trim().split(/[?#]/, 1)[0] || '';
  if (!withoutQuery || isExternalPath(withoutQuery)) return '';
  const withLeadingSlash = withoutQuery.startsWith('/')
    ? withoutQuery
    : `/${withoutQuery}`;
  return withLeadingSlash.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
};

const joinRoutePath = (parentPath: string, childPath?: string) => {
  const child = (childPath || '').trim();
  if (!child) return normalizePath(parentPath);
  if (isExternalPath(child)) return '';
  if (child.startsWith('/')) return normalizePath(child);
  const parent = normalizePath(parentPath);
  return normalizePath(`${parent === '/' ? '' : parent}/${child}`);
};

const collectPaths = (
  routes: RuoyiRoute[],
  parentPath: string,
  result: string[],
  seen: Set<string>,
) => {
  routes.forEach((route) => {
    const path = joinRoutePath(parentPath, route.path);
    if (path && !seen.has(path)) {
      seen.add(path);
      result.push(path);
    }
    collectPaths(route.children || [], path || parentPath, result, seen);
  });
};

export const collectAuthorizedRoutePaths = (routes: RuoyiRoute[] = []) => {
  const result: string[] = [];
  collectPaths(routes, '', result, new Set());
  return result;
};

const publicRoutes = new Set([
  '/user',
  '/user/login',
  '/exception',
  '/exception/403',
  '/exception/404',
  '/exception/500',
]);

const signedInFrameworkRoutes = new Set([
  '/',
  '/account',
  '/account/center',
  '/account/settings',
]);

const isFrameworkRoute = (pathname: string) =>
  publicRoutes.has(pathname) || signedInFrameworkRoutes.has(pathname);

export const isPublicRoutePath = (pathname: string) => {
  const normalizedPathname = normalizePath(pathname);
  return Boolean(normalizedPathname && publicRoutes.has(normalizedPathname));
};

const isPathMatch = (routePath: string, pathname: string) => {
  const routeSegments = routePath.split('/');
  const pathnameSegments = pathname.split('/');
  if (routeSegments.length !== pathnameSegments.length) return false;
  return routeSegments.every(
    (segment, index) =>
      (segment.startsWith(':') && Boolean(pathnameSegments[index])) ||
      segment === pathnameSegments[index],
  );
};

export const resolveRouteAuthorization = (
  pathname: string,
  routes: RuoyiRoute[] = [],
): RouteAuthorizationResult => {
  const normalizedPathname = normalizePath(pathname);
  if (!normalizedPathname) return 'denied';
  if (isFrameworkRoute(normalizedPathname)) return 'allowed';

  return collectAuthorizedRoutePaths(routes).some((routePath) =>
    isPathMatch(routePath, normalizedPathname),
  )
    ? 'allowed'
    : 'denied';
};
