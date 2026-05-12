import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type PageQuery = {
  pageNum?: number;
  pageSize?: number;
  [key: string]: unknown;
};

export type NoticeItem = {
  noticeId?: number | string;
  noticeTitle?: string;
  noticeType?: string;
  noticeContent?: string;
  status?: string;
  remark?: string;
  createByName?: string;
  createTime?: string;
};

export type NoticeQuery = PageQuery & {
  noticeTitle?: string;
  createByName?: string;
  status?: string;
  noticeType?: string;
};

export type NoticeForm = {
  noticeId?: number | string;
  noticeTitle?: string;
  noticeType?: string;
  noticeContent?: string;
  status?: string;
  remark?: string;
  createByName?: string;
};

export const listNotices = (params: NoticeQuery) =>
  ruoyiRequest<NoticeItem>('/system/notice/list', {
    method: 'get',
    params,
  });

export const getNotice = (noticeId: number | string) =>
  ruoyiRequest<NoticeItem>(`/system/notice/${noticeId}`, {
    method: 'get',
  });

export const addNotice = (data: NoticeForm) =>
  ruoyiRequest('/system/notice', {
    method: 'post',
    data,
  });

export const updateNotice = (data: NoticeForm) =>
  ruoyiRequest('/system/notice', {
    method: 'put',
    data,
  });

export const deleteNotices = (
  noticeIds: number | string | (number | string)[],
) =>
  ruoyiRequest(`/system/notice/${noticeIds}`, {
    method: 'delete',
  });
