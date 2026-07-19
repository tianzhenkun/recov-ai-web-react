import { ruoyiDownload, ruoyiRequest } from '@/api/main';

export type PageQuery = {
  pageNum?: number;
  pageSize?: number;
  [key: string]: unknown;
};

export type OperLogItem = {
  operId?: number | string;
  tenantId?: string;
  title?: string;
  businessType?: number | string;
  businessTypes?: (number | string)[];
  method?: string;
  requestMethod?: string;
  operatorType?: number | string;
  operName?: string;
  deptName?: string;
  operUrl?: string;
  operIp?: string;
  operLocation?: string;
  operParam?: string;
  jsonResult?: string;
  status?: number | string;
  errorMsg?: string;
  operTime?: string;
  costTime?: number;
};

export type OperLogQuery = PageQuery & {
  operIp?: string;
  title?: string;
  operName?: string;
  businessType?: string;
  status?: string;
  orderByColumn?: string;
  isAsc?: string;
};

export type LoginInfoItem = {
  infoId?: number | string;
  tenantId?: number | string;
  userName?: string;
  clientKey?: string;
  deviceType?: string;
  status?: string;
  ipaddr?: string;
  loginLocation?: string;
  browser?: string;
  os?: string;
  msg?: string;
  loginTime?: string;
};

export type LoginInfoQuery = PageQuery & {
  ipaddr?: string;
  userName?: string;
  status?: string;
  orderByColumn?: string;
  isAsc?: string;
};

export const listOperLogs = (params: OperLogQuery) =>
  ruoyiRequest<OperLogItem>('/monitor/operlog/list', {
    method: 'get',
    params,
  });

export const deleteOperLogs = (
  operIds: number | string | (number | string)[],
) =>
  ruoyiRequest(`/monitor/operlog/${operIds}`, {
    method: 'delete',
  });

export const cleanOperLogs = () =>
  ruoyiRequest('/monitor/operlog/clean', {
    method: 'delete',
  });

export const exportOperLogs = (
  params: Record<string, unknown>,
  filename = `operlog_${Date.now()}.xlsx`,
) => ruoyiDownload('/monitor/operlog/export', params, filename);

export const listLoginInfos = (params: LoginInfoQuery) =>
  ruoyiRequest<LoginInfoItem>('/monitor/logininfor/list', {
    method: 'get',
    params,
  });

export const deleteLoginInfos = (
  infoIds: number | string | (number | string)[],
) =>
  ruoyiRequest(`/monitor/logininfor/${infoIds}`, {
    method: 'delete',
  });

export const cleanLoginInfos = () =>
  ruoyiRequest('/monitor/logininfor/clean', {
    method: 'delete',
  });

export const unlockLoginInfo = (userName: string | string[]) =>
  ruoyiRequest(
    `/monitor/logininfor/unlock/${encodeURIComponent(String(userName))}`,
    {
      method: 'get',
    },
  );

export const exportLoginInfos = (
  params: Record<string, unknown>,
  filename = `logininfor_${Date.now()}.xlsx`,
) => ruoyiDownload('/monitor/logininfor/export', params, filename);
