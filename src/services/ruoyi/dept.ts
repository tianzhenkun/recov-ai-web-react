import { ruoyiRequest } from '@/adapters/ruoyi/request';

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
