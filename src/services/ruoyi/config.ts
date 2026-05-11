import { ruoyiRequest } from '@/adapters/ruoyi/request';

export const getConfigKey = (configKey: string) =>
  ruoyiRequest<string>(`/system/config/configKey/${configKey}`, {
    method: 'get',
  });
