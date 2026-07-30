import {
  BarChartOutlined,
  ExperimentOutlined,
  FieldTimeOutlined,
  HistoryOutlined,
  PhoneOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import type { MenuDataItem } from '@ant-design/pro-components';
import React from 'react';
import { getMenuWorkspaceNames } from '@/adapters/ruoyi/env';
import type { RuoyiRoute } from '@/services/ruoyi/menu';
import { getRouters } from '@/services/ruoyi/menu';
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

const salesAgentPath = '/sales';
const salesOverviewPath = '/sales/dashboard';
const salesOverviewTitle = '数据总览';
const salesIcpModelingPath = '/sales/icp-modeling';
const salesIcpModelingTitle = 'ICP 建模';
const aiCallTasksPath = '/ai-call/tasks';
const aiCallRecordsPath = '/ai-call/records';
const aiCallVoicesPath = '/ai-call/voices';
const aiCallRulesPath = '/ai-call/rules';
const aiCallManagementPaths = new Set([
  '/ai-call/agents',
  '/ai-call/handoffs',
  '/ai-call/follow-ups',
]);

let cachedRuoyiMenuData: RuoyiMenuDataItem[] | undefined;
let cachedRuoyiMenuRequest: Promise<RuoyiMenuDataItem[]> | undefined;

const isExternal = (path?: string) =>
  /^[a-z][a-z\d+\-.]*:\/\//i.test(path || '');

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

const normalizePath = (path?: string) => {
  const value = (path || '').trim();
  if (!value) return '';
  if (isExternal(value)) return value;
  return value.startsWith('/') ? value : `/${value}`;
};

const salesOverviewMenuItem: RuoyiMenuDataItem = {
  key: salesOverviewPath,
  path: salesOverviewPath,
  name: salesOverviewTitle,
  locale: false,
  icon: <BarChartOutlined />,
};

const salesIcpModelingMenuItem: RuoyiMenuDataItem = {
  key: salesIcpModelingPath,
  path: salesIcpModelingPath,
  name: salesIcpModelingTitle,
  locale: false,
  icon: <ExperimentOutlined />,
};

const salesAgentInjectedChildren: RuoyiMenuDataItem[] = [
  salesOverviewMenuItem,
  salesIcpModelingMenuItem,
];

const aiCallInjectedChildren: RuoyiMenuDataItem[] = [
  {
    key: aiCallTasksPath,
    path: aiCallTasksPath,
    name: '外呼任务',
    locale: false,
    icon: <PhoneOutlined />,
  },
  {
    key: aiCallRecordsPath,
    path: aiCallRecordsPath,
    name: '通话记录',
    locale: false,
    icon: <HistoryOutlined />,
  },
  {
    key: aiCallVoicesPath,
    path: aiCallVoicesPath,
    name: '音色管理',
    locale: false,
    icon: <SoundOutlined />,
  },
  {
    key: aiCallRulesPath,
    path: aiCallRulesPath,
    name: '呼叫规则',
    locale: false,
    icon: <FieldTimeOutlined />,
  },
];

const aiCallInjectedPaths = new Set(
  aiCallInjectedChildren.map((item) => normalizePath(item.path)),
);

const isSalesAgentMenuItem = (item: MenuDataItem) => {
  const path = normalizePath(item.path);
  if (path === salesAgentPath) return true;
  const name = String(item.name || '');
  return /sales\s*agent/i.test(name) || name.includes('获客');
};

const hasSalesAgentChild = (
  children: RuoyiMenuDataItem[],
  menuItem: RuoyiMenuDataItem,
) =>
  children.some(
    (child) =>
      normalizePath(child.path) === normalizePath(menuItem.path) ||
      child.name === menuItem.name,
  );

const mergeSalesAgentChildren = (children: RuoyiMenuDataItem[]) => {
  const nextChildren = [...children];
  for (const menuItem of salesAgentInjectedChildren) {
    if (!hasSalesAgentChild(nextChildren, menuItem)) {
      nextChildren.push(menuItem);
    }
  }
  return nextChildren;
};

/** 若依 Sales Agent 常为叶子菜单直达 /sales，补前端子菜单以展示二级导航 */
export const attachSalesAgentOverviewMenu = (
  menuData: RuoyiMenuDataItem[],
): RuoyiMenuDataItem[] =>
  menuData.map((item) => {
    const children = item.children
      ? attachSalesAgentOverviewMenu(item.children as RuoyiMenuDataItem[])
      : [];

    if (!isSalesAgentMenuItem(item)) {
      return children.length > 0 ? { ...item, children } : item;
    }

    const nextChildren = mergeSalesAgentChildren(children);

    const { redirect: _redirect, ...rest } = item;

    return {
      ...rest,
      children: nextChildren,
    };
  });

export const attachAiCallManagementMenu = (
  menuData: RuoyiMenuDataItem[],
): RuoyiMenuDataItem[] =>
  menuData.map((item) => {
    const children = item.children
      ? attachAiCallManagementMenu(item.children as RuoyiMenuDataItem[])
      : [];
    const isAiCallRoot =
      normalizePath(item.path) === '/ai-call' ||
      String(item.name || '')
        .trim()
        .toLowerCase() === 'ai call';
    const hasManagementChild = children.some((child) =>
      aiCallManagementPaths.has(normalizePath(child.path)),
    );

    if (!isAiCallRoot || !hasManagementChild) {
      return children.length > 0 ? { ...item, children } : item;
    }

    return {
      ...item,
      children: [
        ...aiCallInjectedChildren,
        ...children.filter(
          (child) => !aiCallInjectedPaths.has(normalizePath(child.path)),
        ),
      ],
    };
  });

const joinPath = (parentPath: string, childPath?: string) => {
  const child = (childPath || '').trim();
  if (!child) return normalizePath(parentPath) || '/';
  if (isExternal(child)) return child;
  if (child.startsWith('/')) return child;

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

  if (route.meta?.link) {
    item.path = route.meta.link;
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
) => {
  return attachAiCallManagementMenu(
    attachSalesAgentOverviewMenu(ruoyiMenuData),
  );
};

export const setCachedRuoyiMenuData = (menuData: RuoyiMenuDataItem[]) => {
  cachedRuoyiMenuData = menuData;
};

export const clearCachedRuoyiMenuData = () => {
  cachedRuoyiMenuData = undefined;
  cachedRuoyiMenuRequest = undefined;
};

export const getCachedRuoyiMenuData = () => cachedRuoyiMenuData || [];

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

export const loadRuoyiMenuData = async () => {
  if (cachedRuoyiMenuData) return cachedRuoyiMenuData;
  if (cachedRuoyiMenuRequest) return cachedRuoyiMenuRequest;

  cachedRuoyiMenuRequest = getRouters({ skipErrorHandler: true })
    .then((response) => {
      const menuData = attachAiCallManagementMenu(
        attachSalesAgentOverviewMenu(buildRuoyiMenuData(response.data || [])),
      );
      setCachedRuoyiMenuData(menuData);
      return menuData;
    })
    .finally(() => {
      cachedRuoyiMenuRequest = undefined;
    });

  return cachedRuoyiMenuRequest;
};

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
