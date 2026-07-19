import { ruoyiDownload, ruoyiRequest } from '@/api/main';

export type ConfigItem = {
  configId?: number | string;
  configName?: string;
  configKey?: string;
  configValue?: string;
  configType?: string;
  remark?: string;
  createTime?: string;
};

export type ConfigForm = {
  configId?: number | string;
  configName?: string;
  configKey?: string;
  configValue?: string;
  configType?: string;
  remark?: string;
};

export type ConfigQuery = {
  pageNum?: number;
  pageSize?: number;
  configName?: string;
  configKey?: string;
  configType?: string;
  params?: Record<string, unknown>;
};

export const listConfigs = (params: ConfigQuery) =>
  ruoyiRequest<ConfigItem>('/system/config/list', {
    method: 'get',
    params,
  });

export const getConfig = (configId: number | string) =>
  ruoyiRequest<ConfigItem>(`/system/config/${configId}`, {
    method: 'get',
  });

export const getConfigKey = (configKey: string) =>
  ruoyiRequest<string>(`/system/config/configKey/${configKey}`, {
    method: 'get',
  });

export const addConfig = (data: ConfigForm) =>
  ruoyiRequest('/system/config', {
    method: 'post',
    data,
  });

export const updateConfig = (data: ConfigForm) =>
  ruoyiRequest('/system/config', {
    method: 'put',
    data,
  });

export const updateConfigByKey = (configKey: string, configValue: unknown) =>
  ruoyiRequest('/system/config/updateByKey', {
    method: 'put',
    data: {
      configKey,
      configValue,
    },
  });

export const deleteConfigs = (
  configIds: number | string | (number | string)[],
) =>
  ruoyiRequest(`/system/config/${configIds}`, {
    method: 'delete',
  });

export const refreshConfigCache = () =>
  ruoyiRequest('/system/config/refreshCache', {
    method: 'delete',
  });

export const exportConfigs = (
  params: Record<string, unknown>,
  filename = `config_${Date.now()}.xlsx`,
) => ruoyiDownload('/system/config/export', params, filename);
