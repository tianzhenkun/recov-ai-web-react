import {
  ApartmentOutlined,
  ApiOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BookOutlined,
  ControlOutlined,
  DashboardOutlined,
  EditOutlined,
  FileTextOutlined,
  FormOutlined,
  GlobalOutlined,
  IdcardOutlined,
  LoginOutlined,
  MessageOutlined,
  PartitionOutlined,
  SettingOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuDataItem } from '@ant-design/pro-components';
import type { RuoyiRoute } from '@/services/ruoyi/menu';
import { getRouters } from '@/services/ruoyi/menu';

export type RuoyiMenuDataItem = MenuDataItem & {
  ruoyiComponent?: string;
  ruoyiMeta?: RuoyiRoute['meta'];
  ruoyiName?: string;
};

const templateMenuPath = '/template';
let cachedRuoyiMenuData: RuoyiMenuDataItem[] | undefined;
let cachedRuoyiMenuRequest: Promise<RuoyiMenuDataItem[]> | undefined;

const iconMap = {
  button: <ControlOutlined />,
  chart: <BarChartOutlined />,
  component: <AppstoreOutlined />,
  dashboard: <DashboardOutlined />,
  dict: <BookOutlined />,
  edit: <EditOutlined />,
  form: <FormOutlined />,
  international: <GlobalOutlined />,
  list: <UnorderedListOutlined />,
  logininfor: <LoginOutlined />,
  log: <FileTextOutlined />,
  message: <MessageOutlined />,
  peoples: <TeamOutlined />,
  post: <IdcardOutlined />,
  swagger: <ApiOutlined />,
  system: <SettingOutlined />,
  tree: <ApartmentOutlined />,
  'tree-table': <PartitionOutlined />,
  upload: <UploadOutlined />,
  user: <UserOutlined />,
} as const;

const normalizeIconKey = (icon?: string) =>
  (icon || '').trim().replace(/^#/, '').toLowerCase();

const toMenuIcon = (icon?: string) => {
  const key = normalizeIconKey(icon);
  if (!key) return undefined;
  return iconMap[key as keyof typeof iconMap] || <AppstoreOutlined />;
};

const isExternal = (path?: string) =>
  /^[a-z][a-z\d+\-.]*:\/\//i.test(path || '');

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

const normalizePath = (path?: string) => {
  const value = (path || '').trim();
  if (!value) return '';
  if (isExternal(value)) return value;
  return value.startsWith('/') ? value : `/${value}`;
};

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
    icon: toMenuIcon(route.meta?.icon),
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

const isTemplateMenuItem = (item: MenuDataItem) => {
  if (item.hideInMenu) return false;
  if (!item.path) return false;
  if (item.path === '/' || item.path.startsWith('/user')) return false;
  if (!item.name && !item.children?.length) return false;
  return true;
};

const cloneTemplateMenuItem = (item: MenuDataItem): MenuDataItem => ({
  ...item,
  locale: item.locale ?? false,
  children: item.children
    ?.filter(isTemplateMenuItem)
    .map((child) => cloneTemplateMenuItem(child)),
});

const buildTemplateMenu = (
  defaultMenuData: MenuDataItem[],
): MenuDataItem | null => {
  const children = defaultMenuData
    .filter(isTemplateMenuItem)
    .map((item) => cloneTemplateMenuItem(item));

  if (children.length === 0) return null;

  return {
    key: templateMenuPath,
    name: '模板示例',
    locale: false,
    icon: <AppstoreOutlined />,
    children,
  };
};

export const buildRuoyiMenuData = (routes: RuoyiRoute[] = []) =>
  routes
    .map((route) => toRuoyiMenuItem(route))
    .filter(Boolean) as RuoyiMenuDataItem[];

export const buildLayoutMenuData = (
  ruoyiMenuData: RuoyiMenuDataItem[],
  defaultMenuData: MenuDataItem[],
) => {
  const templateMenu = buildTemplateMenu(defaultMenuData);
  return templateMenu ? [...ruoyiMenuData, templateMenu] : ruoyiMenuData;
};

export const setCachedRuoyiMenuData = (menuData: RuoyiMenuDataItem[]) => {
  cachedRuoyiMenuData = menuData;
};

export const clearCachedRuoyiMenuData = () => {
  cachedRuoyiMenuData = undefined;
  cachedRuoyiMenuRequest = undefined;
};

export const getCachedRuoyiMenuData = () => cachedRuoyiMenuData || [];

export const loadRuoyiMenuData = async () => {
  if (cachedRuoyiMenuData) return cachedRuoyiMenuData;
  if (cachedRuoyiMenuRequest) return cachedRuoyiMenuRequest;

  cachedRuoyiMenuRequest = getRouters({ skipErrorHandler: true })
    .then((response) => {
      const menuData = buildRuoyiMenuData(response.data || []);
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

export const getFirstVisibleRuoyiPath = (menuData = getCachedRuoyiMenuData()) =>
  flattenMenuData(menuData).find(
    (item) =>
      item.path &&
      !item.hideInMenu &&
      !item.children?.some((child) => !child.hideInMenu) &&
      !isExternal(item.path),
  )?.path;
