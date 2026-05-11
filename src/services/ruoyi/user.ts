import {
  ruoyiRequest,
  type RuoyiRequestOptions,
} from '@/adapters/ruoyi/request';
import { ruoyiDownload } from '@/adapters/ruoyi/download';
import type { RoleItem } from './role';
import type { PostItem } from './post';

export type PageQuery = {
  pageNum?: number;
  pageSize?: number;
  [key: string]: unknown;
};

export type RuoyiUser = {
  userId?: number | string;
  userName?: string;
  nickName?: string;
  avatar?: string;
  email?: string;
  phonenumber?: string;
  sex?: string;
  status?: string;
  deptId?: number | string;
  deptName?: string;
  createTime?: string;
  remark?: string;
  roles?: RoleItem[];
  postIds?: (number | string)[];
  roleIds?: (number | string)[];
  admin?: boolean;
};

export type UserQuery = PageQuery & {
  userName?: string;
  nickName?: string;
  phonenumber?: string;
  status?: string;
  deptId?: number | string;
};

export type UserForm = {
  userId?: number | string;
  deptId?: number | string;
  userName?: string;
  nickName?: string;
  password?: string;
  phonenumber?: string;
  email?: string;
  sex?: string;
  status?: string;
  remark?: string;
  postIds?: (number | string)[];
  roleIds?: (number | string)[];
};

export type UserDetail = {
  user?: RuoyiUser;
  roles?: RoleItem[];
  roleIds?: (number | string)[];
  posts?: PostItem[];
  postIds?: (number | string)[];
  roleGroup?: string;
  postGroup?: string;
};

export type AuthRoleDetail = {
  user?: RuoyiUser;
  roles?: RoleItem[];
};

export type UserInfo = {
  user?: RuoyiUser;
  roles?: string[];
  permissions?: string[];
};

export const getInfo = (options: RuoyiRequestOptions = {}) =>
  ruoyiRequest<UserInfo>('/system/user/getInfo', {
    method: 'get',
    ...options,
  });

export const listUsers = (params: UserQuery) =>
  ruoyiRequest<RuoyiUser>('/system/user/list', {
    method: 'get',
    params,
  });

export const getUser = (userId: number | string) =>
  ruoyiRequest<UserDetail>(`/system/user/${userId}`, {
    method: 'get',
  });

export const addUser = (data: UserForm) =>
  ruoyiRequest('/system/user', {
    method: 'post',
    data,
  });

export const updateUser = (data: UserForm) =>
  ruoyiRequest('/system/user', {
    method: 'put',
    data,
  });

export const deleteUsers = (userIds: number | string | (number | string)[]) =>
  ruoyiRequest(`/system/user/${userIds}`, {
    method: 'delete',
  });

export const resetUserPassword = (userId: number | string, password: string) =>
  ruoyiRequest('/system/user/resetPwd', {
    method: 'put',
    headers: {
      isEncrypt: true,
      repeatSubmit: false,
    },
    data: { userId, password },
  });

export const changeUserStatus = (
  userId: number | string,
  status: string,
) =>
  ruoyiRequest('/system/user/changeStatus', {
    method: 'put',
    data: { userId, status },
  });

export const exportUsers = (
  params: Record<string, unknown>,
  filename = `user_${Date.now()}.xlsx`,
) => ruoyiDownload('/system/user/export', params, filename);

export const downloadUserImportTemplate = (
  filename = `user_template_${Date.now()}.xlsx`,
) => ruoyiDownload('/system/user/importTemplate', {}, filename);

export const importUsers = (
  file: File,
  updateSupport: boolean | number,
) => {
  const formData = new FormData();
  formData.append('file', file);

  return ruoyiRequest<string | null>('/system/user/importData', {
    method: 'post',
    params: {
      updateSupport: updateSupport ? 1 : 0,
    },
    data: formData,
  });
};

export const getAuthRole = (userId: number | string) =>
  ruoyiRequest<AuthRoleDetail>(`/system/user/authRole/${userId}`, {
    method: 'get',
  });

export const updateAuthRole = (params: {
  userId: number | string;
  roleIds: string;
}) =>
  ruoyiRequest('/system/user/authRole', {
    method: 'put',
    params,
  });
