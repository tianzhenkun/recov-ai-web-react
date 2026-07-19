import { ruoyiRequest } from '@/api/main';
import type { MenuTreeItem } from '@/shared/types';

export type { MenuTreeItem } from '@/shared/types';

export type MenuType = 'M' | 'C' | 'F';

export type MenuItem = {
  parentName?: string;
  parentId?: number | string;
  children?: MenuItem[];
  menuId?: number | string;
  menuName?: string;
  orderNum?: number;
  path?: string;
  component?: string;
  queryParam?: string;
  query?: string;
  isFrame?: string;
  isCache?: string;
  menuType?: MenuType;
  visible?: string;
  status?: string;
  icon?: string;
  perms?: string;
  remark?: string;
  createTime?: string;
};

export type MenuForm = {
  parentName?: string;
  parentId?: number | string;
  menuId?: number | string;
  menuName?: string;
  orderNum?: number;
  path?: string;
  component?: string;
  queryParam?: string;
  query?: string;
  isFrame?: string;
  isCache?: string;
  menuType?: MenuType;
  visible?: string;
  status?: string;
  icon?: string;
  perms?: string;
  remark?: string;
};

export type MenuQuery = {
  menuName?: string;
  status?: string;
};

export type RoleMenuTree = {
  menus?: MenuTreeItem[];
  checkedKeys?: (number | string)[];
};

export const listMenus = (params: MenuQuery = {}) =>
  ruoyiRequest<MenuItem[]>('/system/menu/list', {
    method: 'get',
    params,
  });

export const getMenu = (menuId: number | string) =>
  ruoyiRequest<MenuItem>(`/system/menu/${menuId}`, {
    method: 'get',
  });

export const menuTreeSelect = () =>
  ruoyiRequest<MenuTreeItem[]>('/system/menu/treeselect', {
    method: 'get',
  });

export const roleMenuTreeSelect = (roleId: number | string) =>
  ruoyiRequest<RoleMenuTree>(`/system/menu/roleMenuTreeselect/${roleId}`, {
    method: 'get',
  });

export const addMenu = (data: MenuForm) =>
  ruoyiRequest('/system/menu', {
    method: 'post',
    data,
  });

export const updateMenu = (data: MenuForm) =>
  ruoyiRequest('/system/menu', {
    method: 'put',
    data,
  });

export const deleteMenu = (menuId: number | string) =>
  ruoyiRequest(`/system/menu/${menuId}`, {
    method: 'delete',
  });

export const cascadeDeleteMenus = (menuIds: (number | string)[]) =>
  ruoyiRequest(`/system/menu/cascade/${menuIds.join(',')}`, {
    method: 'delete',
  });
