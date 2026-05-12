import { ruoyiDownload } from '@/adapters/ruoyi/download';
import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type PageQuery = {
  pageNum?: number;
  pageSize?: number;
  [key: string]: unknown;
};

export type ClientItem = {
  id?: number | string;
  clientId?: number | string;
  clientKey?: string;
  clientSecret?: string;
  grantTypeList?: string[];
  deviceType?: string;
  activeTimeout?: number;
  timeout?: number;
  status?: string;
};

export type ClientForm = {
  id?: number | string;
  clientId?: number | string;
  clientKey?: string;
  clientSecret?: string;
  grantTypeList?: string[];
  deviceType?: string;
  activeTimeout?: number;
  timeout?: number;
  status?: string;
};

export type ClientQuery = PageQuery & {
  clientId?: number | string;
  clientKey?: string;
  clientSecret?: string;
  grantType?: string;
  deviceType?: string;
  activeTimeout?: number;
  timeout?: number;
  status?: string;
};

export const listClients = (params?: ClientQuery) =>
  ruoyiRequest<ClientItem>('/system/client/list', {
    method: 'get',
    params,
  });

export const getClient = (id: number | string) =>
  ruoyiRequest<ClientItem>(`/system/client/${id}`, {
    method: 'get',
  });

export const addClient = (data: ClientForm) =>
  ruoyiRequest('/system/client', {
    method: 'post',
    data,
  });

export const updateClient = (data: ClientForm) =>
  ruoyiRequest('/system/client', {
    method: 'put',
    data,
  });

export const deleteClients = (ids: number | string | (number | string)[]) =>
  ruoyiRequest(`/system/client/${ids}`, {
    method: 'delete',
  });

export const changeClientStatus = (
  clientId: number | string,
  status: string,
) =>
  ruoyiRequest('/system/client/changeStatus', {
    method: 'put',
    data: {
      clientId,
      status,
    },
  });

export const exportClients = (
  params: Record<string, unknown>,
  filename = `client_${Date.now()}.xlsx`,
) => ruoyiDownload('/system/client/export', params, filename);
