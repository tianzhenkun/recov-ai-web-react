export type RoleItem = {
  roleId?: number | string;
  roleName?: string;
  roleKey?: string;
  roleSort?: number;
  dataScope?: string;
  menuCheckStrictly?: boolean;
  deptCheckStrictly?: boolean;
  status?: string;
  delFlag?: string;
  remark?: string;
  createTime?: string;
  menuIds?: (number | string)[];
  deptIds?: (number | string)[];
  admin?: boolean;
  flag?: boolean;
};

export type PostItem = {
  postId?: number | string;
  deptId?: number | string;
  postName?: string;
  postCode?: string;
  postCategory?: string;
  deptName?: string;
  postSort?: number;
  status?: string;
  remark?: string;
  createTime?: string;
};

export type MenuTreeItem = {
  id?: number | string;
  label?: string;
  parentId?: number | string;
  weight?: number;
  children?: MenuTreeItem[];
};
