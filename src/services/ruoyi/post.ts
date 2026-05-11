import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type PostItem = {
  postId?: number | string;
  postName?: string;
  postCode?: string;
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
