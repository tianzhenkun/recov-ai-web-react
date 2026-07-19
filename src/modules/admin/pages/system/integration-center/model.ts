import type { RuoyiRoute } from '@/app/menu';

const isExternalPath = (path: string) => /^[a-z][a-z\d+\-.]*:\/\//i.test(path);

const normalizePath = (path?: string) => {
  const value = (path || '').trim();
  if (!value || isExternalPath(value)) return '';

  const normalized = `/${value}`.replace(/\/{2,}/g, '/');
  return normalized.replace(/\/+$/, '') || '/';
};

const resolveRoutePath = (parentPath: string, routePath?: string) => {
  const value = (routePath || '').trim();
  if (!value) return normalizePath(parentPath);
  if (isExternalPath(value)) return '';
  if (value.startsWith('/')) return normalizePath(value);

  return normalizePath(`${normalizePath(parentPath)}/${value}`);
};

export const hasInstalledRoute = (
  routes: RuoyiRoute[],
  targetPath: string,
  parentPath = '',
): boolean => {
  const normalizedTarget = normalizePath(targetPath);
  if (!normalizedTarget) return false;

  return routes.some((route) => {
    const currentPath = resolveRoutePath(parentPath, route.path);
    if (currentPath === normalizedTarget) return true;

    return Boolean(
      route.children?.length &&
        hasInstalledRoute(route.children, normalizedTarget, currentPath),
    );
  });
};
