import { ruoyiRequest } from '@/api/main';

export type SealCode = 'company_seal' | 'lawyer_seal' | 'law_firm_seal';

export interface SealVO {
  id: number;
  sealCode: string;
  sealName: string;
  instrumentTypeCodes?: string[];
  instrumentTypeCodeList?: string[];
  sealOssId: number | string;
  status: string;
  lawyerUsername?: string;
  accountIdentity?: string;
  startNum?: number | null;
  endNum?: number | null;
  createBy?: number | string;
  createTime?: string;
  updateTime?: string;
  tenantId?: string;
  sealUrl?: string;
  switchLoading?: boolean;
}

export interface SealTypeVO {
  code: string;
  name: string;
  templatesealOssId?: number | string | null;
  required?: boolean;
  category?: string;
  description?: string;
}

export interface SealQuery {
  pageNum?: number;
  pageSize?: number;
  sealCode: string;
  sealName?: string;
  status?: string;
}

export interface SealForm {
  id?: number;
  sealCode: string;
  sealName: string;
  instrumentTypeCodes: string[];
  sealOssId: string;
  status?: string;
  startNum?: number | null;
  endNum?: number | null;
}

export interface LawyerAccountForm {
  id: number;
  lawyerUsername: string;
  lawyerPassword: string;
  accountIdentity: string;
}

export interface SealRangeUsedItem {
  startNum: number;
  endNum: number;
}

export interface SealRangeVO {
  usedRanges: SealRangeUsedItem[];
  minAvailable?: number | null;
  maxAvailable?: number | null;
}

/**
 * 分页查询印章列表。
 */
export const listSeal = (query: SealQuery) =>
  ruoyiRequest<SealVO>('/system/instrument/seal/list', {
    method: 'get',
    params: query as unknown as Record<string, unknown>,
  });

/**
 * 查询关联文书类型列表。
 */
export const listSealType = () =>
  ruoyiRequest<SealTypeVO[]>('/system/instrument/seal/type/list', {
    method: 'get',
  });

/**
 * 根据 ID 查询印章详情。
 */
export const getSeal = (id: number | string) =>
  ruoyiRequest<SealVO>(`/system/instrument/seal/${id}`, {
    method: 'get',
  });

/**
 * 新增印章。
 */
export const addSeal = (data: SealForm) =>
  ruoyiRequest('/system/instrument/seal', {
    method: 'post',
    data,
  });

/**
 * 更新印章。
 */
export const updateSeal = (data: SealForm) =>
  ruoyiRequest('/system/instrument/seal', {
    method: 'put',
    data,
  });

/**
 * 删除印章。ids 支持单个或多个（逗号分隔）。
 */
export const delSeal = (ids: Array<number | string> | number | string) => {
  const path = Array.isArray(ids) ? ids.join(',') : ids;
  return ruoyiRequest(`/system/instrument/seal/${path}`, {
    method: 'delete',
  });
};

/**
 * 修改印章启用状态。
 */
export const updateSealStatus = (id: number | string, status: string) =>
  ruoyiRequest(`/system/instrument/seal/status/${id}`, {
    method: 'put',
    params: { status },
  });

/**
 * 查询某 sealCode 下可用的资产编号范围。
 */
export const getSealRange = (sealCode: string, excludeId?: number | string) =>
  ruoyiRequest<SealRangeVO>(`/system/instrument/seal/range/${sealCode}`, {
    method: 'get',
    params: excludeId == null ? undefined : { excludeId },
  });

/**
 * 新增立案账号（企业章、律师章使用）。
 */
export const addFilingAccount = (
  id: number | string,
  accountUsername: string,
  accountPassword: string,
  accountIdentity: string,
) =>
  ruoyiRequest(`/system/instrument/seal/filing-account/${id}`, {
    method: 'post',
    params: { accountUsername, accountPassword, accountIdentity },
  });

/**
 * 修改立案账号；账号、密码或身份为空时不更新对应字段。
 */
export const updateFilingAccount = (
  id: number | string,
  accountUsername?: string,
  accountPassword?: string,
  accountIdentity?: string,
) => {
  const params: Record<string, string> = {};
  if (accountUsername) params.accountUsername = accountUsername;
  if (accountPassword) params.accountPassword = accountPassword;
  if (accountIdentity) params.accountIdentity = accountIdentity;
  return ruoyiRequest(`/system/instrument/seal/filing-account/${id}`, {
    method: 'put',
    params,
  });
};

/**
 * 删除立案账号。
 */
export const deleteFilingAccount = (id: number | string) =>
  ruoyiRequest(`/system/instrument/seal/filing-account/${id}`, {
    method: 'delete',
  });
