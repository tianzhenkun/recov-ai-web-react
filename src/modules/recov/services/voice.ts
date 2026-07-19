import { ruoyiRequest } from '@/api/main';

export interface ConcurrencyConfigVo {
  maxConcurrency: number;
  maxRetry: number;
  retryInterval: number;
}

export interface SaveConfigDTO {
  maxConcurrency?: number;
  maxRetry?: number;
  retryInterval?: number;
}

export interface VoiceLibraryQuery {
  pageNum: number;
  pageSize: number;
  gender?: string;
}

export interface VoiceLibraryItem {
  id: string;
  voiceName: string;
  baseVoiceId: string;
  gender: string;
  language: string;
  description: string;
  status: string;
}

export interface EmployeeNameItem {
  id: string;
  name: string;
  voiceId: string | null;
  voiceName?: string | null;
  sortOrder: number;
}

export interface VoiceConfigVo {
  identityName: string;
  voiceId: string | null;
  genderMatch: '0' | '1';
  maleVoiceGender: string | null;
  femaleVoiceGender: string | null;
  employeeNames: EmployeeNameItem[];
}

export interface UpdateVoiceConfigDTO {
  identityName: string;
  voiceId?: string | null;
  genderMatch: string;
  maleVoiceGender?: string | null;
  femaleVoiceGender?: string | null;
}

export interface AddEmployeeDTO {
  name: string;
  voiceId: string;
  sortOrder?: number;
}

/**
 * 获取租户外呼并发与重拨配置。
 */
export const getConcurrencyConfig = () =>
  ruoyiRequest<ConcurrencyConfigVo>('/system/recov/tenant/config/concurrency', {
    method: 'get',
  });

/**
 * 保存租户外呼并发与重拨配置。
 */
export const saveConfig = (data: SaveConfigDTO) =>
  ruoyiRequest('/system/recov/tenant/config', {
    method: 'put',
    data,
  });

/**
 * 分页查询音色资产。
 */
export const getVoiceLibraryPage = (params: VoiceLibraryQuery) =>
  ruoyiRequest<VoiceLibraryItem>('/system/recov/call-config/voice/page', {
    method: 'get',
    params: params as unknown as Record<string, unknown>,
  });

/**
 * 查询数字员工身份的音色配置。
 */
export const getVoiceConfigList = () =>
  ruoyiRequest<VoiceConfigVo[]>('/system/recov/voice-config', {
    method: 'get',
  });

/**
 * 更新指定身份的音色配置。
 */
export const updateVoiceConfig = (data: UpdateVoiceConfigDTO) =>
  ruoyiRequest('/system/recov/voice-config', {
    method: 'put',
    data,
  });

/**
 * 为指定身份新增数字员工。
 */
export const addEmployee = (identityName: string, data: AddEmployeeDTO) =>
  ruoyiRequest('/system/recov/voice-config/employee', {
    method: 'post',
    params: { identityName },
    data,
  });

/**
 * 删除数字员工。ids 为逗号分隔的字符串。
 */
export const deleteEmployees = (ids: string) =>
  ruoyiRequest('/system/recov/voice-config/employee', {
    method: 'delete',
    params: { ids },
  });
