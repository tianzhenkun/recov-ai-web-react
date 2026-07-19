import { ruoyiRequest } from '@/api/main';

export type StandingCode =
  | 'PLAINTIFF_LICENSE'
  | 'LEGAL_REP_ID_CARD'
  | 'LEGAL_REP_CERT';

export interface StandingVO {
  id: number;
  standingCode: StandingCode | string;
  standingName: string;
  standingOssId: number | string;
  status: string;
  startNum?: number | null;
  endNum?: number | null;
  legalRepName?: string | null;
  legalRepIdCard?: string | null;
  legalRepAge?: number | null;
  legalRepAddress?: string | null;
  legalRepPhone?: string | null;
  parseStatus?: string | null;
  parseErrorMessage?: string | null;
  createBy?: number | string;
  createTime?: string;
  updateTime?: string;
  tenantId?: string;
  fileName?: string;
  fileUrl?: string;
  switchLoading?: boolean;
}

export interface StandingQuery {
  pageNum?: number;
  pageSize?: number;
  standingCode?: string;
  standingName?: string;
  status?: string;
  startNum?: number | null;
  endNum?: number | null;
  debtNumber?: number | null;
}

export interface StandingForm {
  id?: number | string;
  standingCode: string;
  standingName: string;
  standingOssId: number | string;
  status?: string;
  startNum?: number | null;
  endNum?: number | null;
}

export interface StandingRangeUsedItem {
  startNum: number;
  endNum: number;
}

export interface StandingRangeVO {
  usedRanges: StandingRangeUsedItem[];
  wildcardUsed?: boolean;
  minAvailable?: number | null;
  maxAvailable?: number | null;
}

export interface StandingMatchItem {
  standingCode: string;
  standingCodeName: string;
  standingId?: number | string;
  standingName?: string;
  standingOssId?: number | string;
  startNum?: number | null;
  endNum?: number | null;
  wildcard?: boolean;
  matched: boolean;
  missingReason?: string;
}

export interface StandingMatchVO {
  debtId: number | string;
  debtNumber: number;
  complete: boolean;
  items: StandingMatchItem[];
}

export const listStanding = (query: StandingQuery) =>
  ruoyiRequest<StandingVO>('/system/instrument/standing/list', {
    method: 'get',
    params: query as unknown as Record<string, unknown>,
  });

export const getStanding = (id: number | string) =>
  ruoyiRequest<StandingVO>(`/system/instrument/standing/${id}`, {
    method: 'get',
  });

export const addStanding = (data: StandingForm) =>
  ruoyiRequest('/system/instrument/standing', {
    method: 'post',
    data,
  });

export const updateStanding = (data: StandingForm) =>
  ruoyiRequest('/system/instrument/standing', {
    method: 'put',
    data,
  });

export const delStanding = (ids: Array<number | string> | number | string) => {
  const path = Array.isArray(ids) ? ids.join(',') : ids;
  return ruoyiRequest(`/system/instrument/standing/${path}`, {
    method: 'delete',
  });
};

export const updateStandingStatus = (id: number | string, status: string) =>
  ruoyiRequest(`/system/instrument/standing/status/${id}`, {
    method: 'put',
    params: { status },
  });

export const retryStandingParse = (id: number | string) =>
  ruoyiRequest(`/system/instrument/standing/${id}/parse/retry`, {
    method: 'post',
  });

export const getStandingRange = (
  standingCode: string,
  excludeId?: number | string,
) =>
  ruoyiRequest<StandingRangeVO>(
    `/system/instrument/standing/range/${standingCode}`,
    {
      method: 'get',
      params: excludeId == null ? undefined : { excludeId },
    },
  );

export const matchStanding = (debtId: number | string) =>
  ruoyiRequest<StandingMatchVO>('/system/instrument/standing/match', {
    method: 'get',
    params: { debtId },
  });
