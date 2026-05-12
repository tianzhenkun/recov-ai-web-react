import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type DeptQuery = {
  deptName?: string;
  deptCategory?: string;
  status?: string;
};

export type DeptItem = {
  id?: number | string;
  parentName?: string;
  parentId?: number | string;
  children?: DeptItem[];
  deptId?: number | string;
  deptName?: string;
  deptCategory?: string;
  orderNum?: number;
  leader?: number | string;
  phone?: string;
  email?: string;
  status?: string;
  delFlag?: string;
  ancestors?: string;
  createTime?: string;
};

export type DeptForm = {
  parentName?: string;
  parentId?: number | string;
  children?: DeptForm[];
  deptId?: number | string;
  deptName?: string;
  deptCategory?: string;
  orderNum?: number;
  leader?: number | string;
  phone?: string;
  email?: string;
  status?: string;
  delFlag?: string;
  ancestors?: string;
};

export type DeptTreeItem = {
  id?: number | string;
  label?: string;
  parentId?: number | string;
  weight?: number;
  disabled?: boolean;
  children?: DeptTreeItem[];
};

export const getUserDeptTree = () =>
  ruoyiRequest<DeptTreeItem[]>('/system/user/deptTree', {
    method: 'get',
  });

export const listDepts = (params: DeptQuery = {}) =>
  ruoyiRequest<DeptItem[]>('/system/dept/list', {
    method: 'get',
    params,
  });

export const listDeptsExcludeChild = (deptId: number | string) =>
  ruoyiRequest<DeptItem[]>(`/system/dept/list/exclude/${deptId}`, {
    method: 'get',
  });

export const getDept = (deptId: number | string) =>
  ruoyiRequest<DeptItem>(`/system/dept/${deptId}`, {
    method: 'get',
  });

export const addDept = (data: DeptForm) =>
  ruoyiRequest('/system/dept', {
    method: 'post',
    data,
  });

export const updateDept = (data: DeptForm) =>
  ruoyiRequest('/system/dept', {
    method: 'put',
    data,
  });

export const deleteDept = (deptId: number | string) =>
  ruoyiRequest(`/system/dept/${deptId}`, {
    method: 'delete',
  });
