import { ruoyiDownload, ruoyiRequest } from '@/api/main';
import type { RuoyiUser, UserQuery } from '@/shared/services/user';
import type { RoleItem } from '@/shared/types';
import type { DeptTreeItem } from './dept';

export type { RoleItem } from '@/shared/types';

export type PageQuery = {
  pageNum?: number;
  pageSize?: number;
  [key: string]: unknown;
};

export type RoleForm = {
  roleId?: number | string;
  roleName?: string;
  roleKey?: string;
  roleSort?: number;
  status?: string;
  menuCheckStrictly?: boolean;
  deptCheckStrictly?: boolean;
  remark?: string;
  dataScope?: string;
  menuIds?: (number | string)[];
  deptIds?: (number | string)[];
};

export type RoleQuery = PageQuery & {
  roleName?: string;
  roleKey?: string;
  status?: string;
};

export type RoleDeptTree = {
  checkedKeys?: (number | string)[];
  depts?: DeptTreeItem[];
};

export const listRoles = (params: RoleQuery) =>
  ruoyiRequest<RoleItem>('/system/role/list', {
    method: 'get',
    params,
  });

export const selectRoles = (roleIds?: number | string | (number | string)[]) =>
  ruoyiRequest<RoleItem[]>('/system/role/optionselect', {
    method: 'get',
    params: roleIds ? { roleIds } : undefined,
  });

export const getRole = (roleId: number | string) =>
  ruoyiRequest<RoleItem>(`/system/role/${roleId}`, {
    method: 'get',
  });

export const addRole = (data: RoleForm) =>
  ruoyiRequest('/system/role', {
    method: 'post',
    data,
  });

export const updateRole = (data: RoleForm) =>
  ruoyiRequest('/system/role', {
    method: 'put',
    data,
  });

export const updateRoleDataScope = (data: RoleForm) =>
  ruoyiRequest('/system/role/dataScope', {
    method: 'put',
    data,
  });

export const roleDeptTreeSelect = (roleId: number | string) =>
  ruoyiRequest<RoleDeptTree>(`/system/role/deptTree/${roleId}`, {
    method: 'get',
  });

export const changeRoleStatus = (roleId: number | string, status: string) =>
  ruoyiRequest('/system/role/changeStatus', {
    method: 'put',
    data: { roleId, status },
  });

export const deleteRoles = (roleIds: number | string | (number | string)[]) =>
  ruoyiRequest(`/system/role/${roleIds}`, {
    method: 'delete',
  });

export const exportRoles = (
  params: Record<string, unknown>,
  filename = `role_${Date.now()}.xlsx`,
) => ruoyiDownload('/system/role/export', params, filename);

export const allocatedUserList = (params: UserQuery) =>
  ruoyiRequest<RuoyiUser>('/system/role/authUser/allocatedList', {
    method: 'get',
    params,
  });

export const unallocatedUserList = (params: UserQuery) =>
  ruoyiRequest<RuoyiUser>('/system/role/authUser/unallocatedList', {
    method: 'get',
    params,
  });

export const authUserCancel = (data: {
  userId?: number | string;
  roleId?: number | string;
}) =>
  ruoyiRequest('/system/role/authUser/cancel', {
    method: 'put',
    data,
  });

export const authUserCancelAll = (params: {
  roleId?: number | string;
  userIds: string;
}) =>
  ruoyiRequest('/system/role/authUser/cancelAll', {
    method: 'put',
    params,
  });

export const authUserSelectAll = (params: {
  roleId?: number | string;
  userIds: string;
}) =>
  ruoyiRequest('/system/role/authUser/selectAll', {
    method: 'put',
    params,
  });
