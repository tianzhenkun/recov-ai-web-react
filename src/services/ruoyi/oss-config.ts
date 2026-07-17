import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type OssConfigItem = {
  ossConfigId?: number | string;
  configKey?: string;
  accessKey?: string;
  secretKeyConfigured?: boolean;
  bucketName?: string;
  prefix?: string;
  endpoint?: string;
  domain?: string;
  isHttps?: string;
  region?: string;
  status?: string;
  ext1?: string;
  remark?: string;
  accessPolicy?: string;
};

export type OssConfigForm = {
  ossConfigId?: number | string;
  configKey?: string;
  accessKey?: string;
  secretKey?: string;
  bucketName?: string;
  prefix?: string;
  endpoint?: string;
  domain?: string;
  isHttps?: string;
  accessPolicy?: string;
  region?: string;
  status?: string;
  remark?: string;
};

export type OssConfigQuery = {
  pageNum?: number;
  pageSize?: number;
  configKey?: string;
  bucketName?: string;
  status?: string;
};

export const listOssConfigs = (params: OssConfigQuery) =>
  ruoyiRequest<OssConfigItem>('/resource/oss/config/list', {
    method: 'get',
    params,
  });

export const getOssConfig = (ossConfigId: number | string) =>
  ruoyiRequest<OssConfigItem>(`/resource/oss/config/${ossConfigId}`, {
    method: 'get',
  });

export const addOssConfig = (data: OssConfigForm) =>
  ruoyiRequest('/resource/oss/config', {
    method: 'post',
    data,
  });

export const updateOssConfig = (data: OssConfigForm) =>
  ruoyiRequest('/resource/oss/config', {
    method: 'put',
    data,
  });

export const deleteOssConfigs = (
  ossConfigIds: number | string | (number | string)[],
) =>
  ruoyiRequest(`/resource/oss/config/${ossConfigIds}`, {
    method: 'delete',
  });

export const changeOssConfigStatus = (
  ossConfigId: number | string,
  status: string,
  configKey: string,
) =>
  ruoyiRequest('/resource/oss/config/changeStatus', {
    method: 'put',
    data: {
      ossConfigId,
      status,
      configKey,
    },
  });
