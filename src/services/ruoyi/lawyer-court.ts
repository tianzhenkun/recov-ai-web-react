import { ruoyiRequest } from '@/adapters/ruoyi/request';
import type { RuoyiResponse } from '@/adapters/ruoyi/response';

export type LawyerCourtTab = 'matched' | 'unmatched';

export type LawyerCourtOverviewVO = {
  collaborationCaseCount: number;
  coveredCityCount: number;
  matchedCaseCount: number;
  unmatchedCaseCount: number;
  totalCaseAmount: string;
  avgCaseAmount: string;
};

export type MatchedLawyerRowVO = {
  id: string;
  lawyerId: string;
  lawyerName: string;
  firm: string;
  region: string;
  rating: number;
  caseCount: number;
  status: string;
  bio: string;
  phone: string;
  email: string;
  caseNo: string;
  ownerName: string;
  assetNo: string;
  city: string;
  project: string;
  amount: string;
};

export type UnmatchedCaseRowVO = {
  id: string;
  caseNo: string;
  ownerName: string;
  amount: string;
  region: string;
  unmatchReason: string;
  assetNo: string;
  city: string;
  project: string;
};

export type LawyerCourtPageQuery = {
  pageNum?: number;
  pageSize?: number;
  tab: LawyerCourtTab;
  city?: string;
  project?: string;
};

export type LawyerCourtPageResult<T> = {
  rows: T[];
  total: number;
};

const API_PREFIX = '/system/recov/lawyer-court';

export const getLawyerCourtOverview = () =>
  ruoyiRequest<LawyerCourtOverviewVO>(`${API_PREFIX}/overview`, {
    method: 'get',
  });

export const getMatchedLawyerPage = (params: LawyerCourtPageQuery) =>
  ruoyiRequest<MatchedLawyerRowVO>(`${API_PREFIX}/matched/page`, {
    method: 'get',
    params: {
      pageNum: params.pageNum,
      pageSize: params.pageSize,
      city: params.city,
      project: params.project,
    },
  });

export const getUnmatchedCasePage = (params: LawyerCourtPageQuery) =>
  ruoyiRequest<UnmatchedCaseRowVO>(`${API_PREFIX}/unmatched/page`, {
    method: 'get',
    params: {
      pageNum: params.pageNum,
      pageSize: params.pageSize,
      city: params.city,
      project: params.project,
    },
  });

export const postLawyerCourtAutoMatch = () =>
  ruoyiRequest<void>(`${API_PREFIX}/auto-match`, { method: 'post' });

export const postReplaceLawyer = (id: string) =>
  ruoyiRequest<void>(`${API_PREFIX}/matched/${id}/replace`, {
    method: 'post',
  });

export const postBlacklistLawyer = (id: string) =>
  ruoyiRequest<void>(`${API_PREFIX}/matched/${id}/blacklist`, {
    method: 'post',
  });

export const postWithdrawCase = (id: string) =>
  ruoyiRequest<void>(`${API_PREFIX}/unmatched/${id}/withdraw`, {
    method: 'post',
  });

export const postManualMatch = (id: string) =>
  ruoyiRequest<void>(`${API_PREFIX}/unmatched/${id}/manual-match`, {
    method: 'post',
  });

const normalizeAmountString = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '0';
  return String(value);
};

export const unwrapLawyerCourtOverview = (
  response: RuoyiResponse<LawyerCourtOverviewVO>,
): LawyerCourtOverviewVO => {
  const data = response.data;
  return {
    collaborationCaseCount: Number(data?.collaborationCaseCount ?? 0),
    coveredCityCount: Number(data?.coveredCityCount ?? 0),
    matchedCaseCount: Number(data?.matchedCaseCount ?? 0),
    unmatchedCaseCount: Number(data?.unmatchedCaseCount ?? 0),
    totalCaseAmount: normalizeAmountString(data?.totalCaseAmount),
    avgCaseAmount: normalizeAmountString(data?.avgCaseAmount),
  };
};

const unwrapPage = <T>(
  response: RuoyiResponse<T>,
): LawyerCourtPageResult<T> => {
  const nested = response.data as
    | { rows?: T[]; total?: number }
    | T[]
    | undefined;

  const rawRows =
    nested && !Array.isArray(nested) && Array.isArray(nested.rows)
      ? nested.rows
      : Array.isArray(response.rows)
        ? response.rows
        : Array.isArray(nested)
          ? nested
          : [];

  const total =
    nested && !Array.isArray(nested)
      ? Number(nested.total) || 0
      : Number(response.total) || 0;

  return { rows: rawRows, total };
};

export const unwrapMatchedLawyerPage = (
  response: RuoyiResponse<MatchedLawyerRowVO>,
) => unwrapPage(response);

export const unwrapUnmatchedCasePage = (
  response: RuoyiResponse<UnmatchedCaseRowVO>,
) => unwrapPage(response);
