import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type OnlineQuery = {
  pageNum?: number;
  pageSize?: number;
  ipaddr?: string;
  userName?: string;
};

export type OnlineItem = {
  tokenId?: string;
  deptName?: string;
  userName?: string;
  clientKey?: string;
  deviceType?: string;
  ipaddr?: string;
  loginLocation?: string;
  browser?: string;
  os?: string;
  loginTime?: number | string;
};

export const listOnlineUsers = (params: OnlineQuery) =>
  ruoyiRequest<OnlineItem>('/monitor/online/list', {
    method: 'get',
    params,
  });

export const forceLogoutOnlineUser = (tokenId: string) =>
  ruoyiRequest(`/monitor/online/${encodeURIComponent(tokenId)}`, {
    method: 'delete',
  });

export const listCurrentOnlineDevices = () =>
  ruoyiRequest<OnlineItem[]>('/monitor/online', {
    method: 'get',
  });

export const deleteCurrentOnlineDevice = (tokenId: string) =>
  ruoyiRequest(`/monitor/online/myself/${encodeURIComponent(tokenId)}`, {
    method: 'delete',
  });
