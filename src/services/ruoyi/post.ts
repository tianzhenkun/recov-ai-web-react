import { ruoyiRequest } from '@/adapters/ruoyi/request';
import { ruoyiDownload } from '@/adapters/ruoyi/download';
import type { DeptTreeItem } from './dept';

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

export type PostForm = {
  postId?: number | string;
  deptId?: number | string;
  postCode?: string;
  postName?: string;
  postCategory?: string;
  postSort?: number;
  status?: string;
  remark?: string;
};

export type PostQuery = {
  pageNum?: number;
  pageSize?: number;
  deptId?: number | string;
  belongDeptId?: number | string;
  postCode?: string;
  postName?: string;
  postCategory?: string;
  status?: string;
};

export const selectPosts = (
  params: {
    deptId?: number | string;
    postIds?: number | string | (number | string)[];
  } = {},
) =>
  ruoyiRequest<PostItem[]>('/system/post/optionselect', {
    method: 'get',
    params,
  });

export const listPosts = (params: PostQuery) =>
  ruoyiRequest<PostItem>('/system/post/list', {
    method: 'get',
    params,
  });

export const getPost = (postId: number | string) =>
  ruoyiRequest<PostItem>(`/system/post/${postId}`, {
    method: 'get',
  });

export const addPost = (data: PostForm) =>
  ruoyiRequest('/system/post', {
    method: 'post',
    data,
  });

export const updatePost = (data: PostForm) =>
  ruoyiRequest('/system/post', {
    method: 'put',
    data,
  });

export const deletePosts = (postIds: number | string | (number | string)[]) =>
  ruoyiRequest(`/system/post/${postIds}`, {
    method: 'delete',
  });

export const exportPosts = (
  params: Record<string, unknown>,
  filename = `post_${Date.now()}.xlsx`,
) => ruoyiDownload('/system/post/export', params, filename);

export const getPostDeptTree = () =>
  ruoyiRequest<DeptTreeItem[]>('/system/post/deptTree', {
    method: 'get',
  });
