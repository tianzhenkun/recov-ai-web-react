import type { MenuDataItem } from '@ant-design/pro-components';
import React from 'react';
import { getMenuWorkspaceNames } from '@/adapters/ruoyi/env';
import { getRouters, type RuoyiRoute } from '@/app/menu';
import { normalizeSafeExternalUrl } from '@/shared/security/url';
import { toRuoyiMenuIcon } from '@/utils/ruoyiIcons';

export type RuoyiMenuDataItem = MenuDataItem & {
  ruoyiComponent?: string;
  ruoyiMeta?: RuoyiRoute['meta'];
  ruoyiName?: string;
};

export type RuoyiMenuWorkspace = {
  key: string;
  name: string;
  path?: string;
  menuData: RuoyiMenuDataItem[];
};

export type RuoyiMenuWorkspaceMode = 'default' | 'workspace';

export type RuoyiMenuContext = {
  menuMode: RuoyiMenuWorkspaceMode;
  activeWorkspaceKey?: string;
  visibleMenuData: RuoyiMenuDataItem[];
  homePath?: string;
  matchedMenuItem?: RuoyiMenuDataItem;
};

export type RuoyiMenuCatalog = {
  routes: RuoyiRoute[];
  menuData: RuoyiMenuDataItem[];
};

type RuoyiMenuCatalogListener = (routes: RuoyiRoute[]) => void;

let cachedRuoyiMenuData: RuoyiMenuDataItem[] | undefined;
let cachedRuoyiMenuCatalog: RuoyiMenuCatalog | undefined;
let cachedRuoyiMenuRequest: Promise<RuoyiMenuCatalog> | undefined;
let cachedRuoyiMenuGeneration = 0;
const ruoyiMenuCatalogListeners = new Set<RuoyiMenuCatalogListener>();

const publishRuoyiMenuCatalog = (routes: RuoyiRoute[]) => {
  ruoyiMenuCatalogListeners.forEach((listener) => {
    listener(routes);
  });
};

const hasUrlScheme = (path?: string) => /^[a-z][a-z\d+\-.]*:/i.test(path || '');

const isExternal = (path?: string) => Boolean(normalizeSafeExternalUrl(path));

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

const normalizePath = (path?: string) => {
  const value = (path || '').trim();
  if (!value) return '';
  const externalUrl = normalizeSafeExternalUrl(value);
  if (externalUrl) return externalUrl;
  if (hasUrlScheme(value) || value.startsWith('//')) return '';
  return value.startsWith('/') ? value : `/${value}`;
};

const joinPath = (parentPath: string, childPath?: string) => {
  const child = (childPath || '').trim();
  if (!child) return normalizePath(parentPath) || '/';
  if (isExternal(child)) return normalizeSafeExternalUrl(child) || '';
  if (hasUrlScheme(child) || child.startsWith('//')) return '';
  if (child.startsWith('/')) return normalizePath(child);

  const parent = normalizePath(parentPath);
  if (!parent || parent === '/') return `/${trimSlashes(child)}`;
  return `${parent}/${trimSlashes(child)}`.replace(/\/+/g, '/');
};

const hasVisibleChildren = (children?: RuoyiMenuDataItem[]) =>
  Boolean(children?.some((item) => !item.hideInMenu));

const normalizeWorkspaceKey = (value?: string) =>
  value ? normalizeComparablePath(value) : '';

const isWorkspaceDirectoryMenu = (item: RuoyiMenuDataItem) =>
  item.ruoyiComponent === 'Layout' &&
  hasVisibleChildren((item.children || []) as RuoyiMenuDataItem[]);

const getWorkspaceKey = (item: RuoyiMenuDataItem) =>
  normalizeWorkspaceKey(item.path) || String(item.key || item.name || '');

const shouldPromoteOnlyChild = (
  route: RuoyiRoute,
  children: RuoyiMenuDataItem[],
) =>
  route.component === 'Layout' &&
  !route.alwaysShow &&
  route.path === '/' &&
  !route.meta?.title &&
  children.length === 1;

const toRuoyiMenuItem = (
  route: RuoyiRoute,
  parentPath = '',
): RuoyiMenuDataItem | undefined => {
  const path = joinPath(parentPath, route.path);
  const children = (route.children || [])
    .map((child) => toRuoyiMenuItem(child, path))
    .filter(Boolean) as RuoyiMenuDataItem[];

  if (shouldPromoteOnlyChild(route, children)) {
    return children[0];
  }

  const title = route.meta?.title || route.name || path;
  const item: RuoyiMenuDataItem = {
    key: path || route.name,
    path,
    name: title,
    locale: false,
    icon: toRuoyiMenuIcon(route.meta?.icon),
    hideInMenu: Boolean(route.hidden),
    ruoyiComponent: route.component,
    ruoyiMeta: route.meta,
    ruoyiName: route.name,
  };

  const safeMetaLink = normalizeSafeExternalUrl(route.meta?.link || undefined);
  if (safeMetaLink) {
    item.path = safeMetaLink;
    item.target = '_blank';
  }

  if (route.meta?.activeMenu) {
    item.parentKeys = [route.meta.activeMenu];
  }

  if (children.length > 0) {
    item.children = children;
  }

  if (route.redirect && route.redirect !== 'noRedirect') {
    item.redirect = route.redirect;
  }

  if (!item.name && !hasVisibleChildren(item.children)) return undefined;

  return item;
};

export const buildRuoyiMenuData = (routes: RuoyiRoute[] = []) =>
  routes
    .map((route) => toRuoyiMenuItem(route))
    .filter(Boolean) as RuoyiMenuDataItem[];

export const buildLayoutMenuData = (
  ruoyiMenuData: RuoyiMenuDataItem[],
  _defaultMenuData: MenuDataItem[],
) => ruoyiMenuData;

export const setCachedRuoyiMenuData = (menuData: RuoyiMenuDataItem[]) => {
  cachedRuoyiMenuData = menuData;
};

export const clearCachedRuoyiMenuData = () => {
  cachedRuoyiMenuGeneration += 1;
  cachedRuoyiMenuData = undefined;
  cachedRuoyiMenuCatalog = undefined;
  cachedRuoyiMenuRequest = undefined;
  publishRuoyiMenuCatalog([]);
};

export const getCachedRuoyiMenuData = () => cachedRuoyiMenuData || [];
export const getCachedRuoyiRoutes = () => cachedRuoyiMenuCatalog?.routes || [];

export const subscribeRuoyiMenuCatalog = (
  listener: RuoyiMenuCatalogListener,
) => {
  ruoyiMenuCatalogListeners.add(listener);
  return () => {
    ruoyiMenuCatalogListeners.delete(listener);
  };
};

export const resolveRuoyiMenuWorkspaces = (
  menuData = getCachedRuoyiMenuData(),
  configuredWorkspaceNames = getMenuWorkspaceNames(),
): RuoyiMenuWorkspace[] => {
  if (configuredWorkspaceNames.length === 0) return [];

  const configuredNameSet = new Set(
    configuredWorkspaceNames.map((item) => item.trim()).filter(Boolean),
  );

  return menuData.flatMap((item) => {
    const name = String(item.name || '').trim();
    if (!configuredNameSet.has(name) || !isWorkspaceDirectoryMenu(item)) {
      return [];
    }

    return [
      {
        key: getWorkspaceKey(item),
        name,
        path: item.path,
        menuData: (item.children || []) as RuoyiMenuDataItem[],
      },
    ];
  });
};

export const omitWorkspaceRootMenus = (
  menuData = getCachedRuoyiMenuData(),
  configuredWorkspaceNames = getMenuWorkspaceNames(),
) => {
  const workspaceKeySet = new Set(
    resolveRuoyiMenuWorkspaces(menuData, configuredWorkspaceNames).map(
      (item) => item.key,
    ),
  );

  if (workspaceKeySet.size === 0) return menuData;

  return menuData.filter((item) => !workspaceKeySet.has(getWorkspaceKey(item)));
};

export const getVisibleRuoyiMenuData = (
  menuData = getCachedRuoyiMenuData(),
  options?: {
    menuMode?: RuoyiMenuWorkspaceMode;
    activeWorkspaceKey?: string;
    configuredWorkspaceNames?: string[];
  },
) => {
  const {
    menuMode = 'default',
    activeWorkspaceKey,
    configuredWorkspaceNames = getMenuWorkspaceNames(),
  } = options || {};

  if (menuMode === 'workspace' && normalizeWorkspaceKey(activeWorkspaceKey)) {
    return getScopedRuoyiMenuData(
      menuData,
      activeWorkspaceKey,
      configuredWorkspaceNames,
    );
  }

  return omitWorkspaceRootMenus(menuData, configuredWorkspaceNames);
};

export const resolveRuoyiMenuContext = (
  pathname: string,
  menuData = getCachedRuoyiMenuData(),
  configuredWorkspaceNames = getMenuWorkspaceNames(),
): RuoyiMenuContext => {
  const workspaces = resolveRuoyiMenuWorkspaces(
    menuData,
    configuredWorkspaceNames,
  );

  for (const workspace of workspaces) {
    const matchedWorkspaceMenu =
      findRuoyiMenuByPath(pathname, workspace.menuData) ||
      (workspace.path &&
      normalizeComparablePath(workspace.path) ===
        normalizeComparablePath(pathname)
        ? ({
            path: workspace.path,
            name: workspace.name,
          } as RuoyiMenuDataItem)
        : undefined);

    if (!matchedWorkspaceMenu) continue;

    const visibleMenuData = getVisibleRuoyiMenuData(menuData, {
      menuMode: 'workspace',
      activeWorkspaceKey: workspace.key,
      configuredWorkspaceNames,
    });

    return {
      menuMode: 'workspace',
      activeWorkspaceKey: workspace.key,
      visibleMenuData,
      homePath: getFirstVisibleRuoyiPath(visibleMenuData) || workspace.path,
      matchedMenuItem: matchedWorkspaceMenu,
    };
  }

  const visibleMenuData = getVisibleRuoyiMenuData(menuData, {
    menuMode: 'default',
    configuredWorkspaceNames,
  });

  return {
    menuMode: 'default',
    activeWorkspaceKey: undefined,
    visibleMenuData,
    homePath: getFirstVisibleRuoyiPath(visibleMenuData),
    matchedMenuItem: findRuoyiMenuByPath(pathname, visibleMenuData),
  };
};

export const getScopedRuoyiMenuData = (
  menuData = getCachedRuoyiMenuData(),
  activeWorkspaceKey?: string,
  configuredWorkspaceNames = getMenuWorkspaceNames(),
) => {
  const normalizedWorkspaceKey = normalizeWorkspaceKey(activeWorkspaceKey);
  if (!normalizedWorkspaceKey) return menuData;

  const workspace = resolveRuoyiMenuWorkspaces(
    menuData,
    configuredWorkspaceNames,
  ).find((item) => item.key === normalizedWorkspaceKey);

  return (
    workspace?.menuData ||
    omitWorkspaceRootMenus(menuData, configuredWorkspaceNames)
  );
};

export const loadRuoyiMenuCatalog = async () => {
  if (cachedRuoyiMenuCatalog) return cachedRuoyiMenuCatalog;
  if (cachedRuoyiMenuRequest) return cachedRuoyiMenuRequest;

  const requestGeneration = cachedRuoyiMenuGeneration;
  const request = getRouters({ skipErrorHandler: true })
    .then((response) => {
      if (!Array.isArray(response.data)) {
        throw new Error('授权路由数据格式无效。');
      }
      const routes = response.data;
      const menuData = buildRuoyiMenuData(routes);
      const catalog = { menuData, routes };
      if (requestGeneration === cachedRuoyiMenuGeneration) {
        cachedRuoyiMenuCatalog = catalog;
        setCachedRuoyiMenuData(menuData);
        publishRuoyiMenuCatalog(routes);
      }
      return catalog;
    })
    .finally(() => {
      if (
        requestGeneration === cachedRuoyiMenuGeneration &&
        cachedRuoyiMenuRequest === request
      ) {
        cachedRuoyiMenuRequest = undefined;
      }
    });

  cachedRuoyiMenuRequest = request;
  return request;
};

export const loadRuoyiMenuData = async () =>
  (await loadRuoyiMenuCatalog()).menuData;

const flattenMenuData = (menuData: RuoyiMenuDataItem[]): RuoyiMenuDataItem[] =>
  menuData.flatMap((item) => [
    item,
    ...flattenMenuData((item.children || []) as RuoyiMenuDataItem[]),
  ]);

const normalizeComparablePath = (path: string) =>
  path.replace(/\/+$/, '') || '/';

const isRoutePathMatch = (routePath: string, pathname: string) => {
  const routeSegments = normalizeComparablePath(routePath).split('/');
  const pathnameSegments = normalizeComparablePath(pathname).split('/');

  if (routeSegments.length !== pathnameSegments.length) return false;

  return routeSegments.every(
    (segment, index) =>
      segment.startsWith(':') || segment === pathnameSegments[index],
  );
};

export const findRuoyiMenuByPath = (
  pathname: string,
  menuData = getCachedRuoyiMenuData(),
) => {
  const normalizedPathname = normalizeComparablePath(pathname);
  return flattenMenuData(menuData).find(
    (item) =>
      item.path &&
      !isExternal(item.path) &&
      isRoutePathMatch(item.path, normalizedPathname),
  );
};

export const isRuoyiDirectoryMenuPath = (
  pathname?: string,
  menuData = getCachedRuoyiMenuData(),
) => {
  if (!pathname || isExternal(pathname)) return false;

  const normalizedPathname = normalizeComparablePath(pathname);
  const item = flattenMenuData(menuData).find(
    (entry) =>
      entry.path &&
      !isExternal(entry.path) &&
      normalizeComparablePath(entry.path) === normalizedPathname,
  );

  return Boolean(
    item?.ruoyiComponent === 'Layout' &&
      item.children?.some((child) => !child.hideInMenu),
  );
};

export const getFirstVisibleRuoyiPath = (menuData = getCachedRuoyiMenuData()) =>
  flattenMenuData(menuData).find(
    (item) =>
      item.path &&
      !item.hideInMenu &&
      !item.children?.some((child) => !child.hideInMenu) &&
      !isExternal(item.path),
  )?.path;
