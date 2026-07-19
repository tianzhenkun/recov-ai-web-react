import { ruoyiRequest } from '@/api/main';

export type TimeEnabledFlag = '0' | '1';

export interface TimeConfigVo {
  timeEnabled: TimeEnabledFlag;
  startTime: string;
  endTime: string;
  holidayPolicy: string;
  runningStatus?: string;
}

export interface SaveTimeConfigDTO {
  timeEnabled?: TimeEnabledFlag;
  startTime?: string;
  endTime?: string;
  holidayPolicy?: string;
}

/**
 * 运营时间配置查询。
 */
export const getTimeConfig = () =>
  ruoyiRequest<TimeConfigVo>('/system/recov/tenant/config/time', {
    method: 'get',
  });

/**
 * 保存运营时间配置（与其它租户配置共用 PUT 接口，仅下发时间相关字段）。
 */
export const saveTimeConfig = (data: SaveTimeConfigDTO) =>
  ruoyiRequest('/system/recov/tenant/config', { method: 'put', data });
