import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type LawyerCourtFeeConfigItem = {
  id: string | number;
  cityCode: string;
  cityName: string;
  debtAmountMin: number;
  debtAmountMax?: number | null;
  debtAmountRangeText?: string;
  courtFeeMin: number;
  courtFeeMax: number;
  courtFeeRangeText?: string;
  status?: number;
  remark?: string | null;
  createTime?: string;
  updateTime?: string;
};

export type LawyerCourtCityOption = {
  cityCode: string;
  cityName: string;
  debtCount: number;
};

export type LawyerCourtFeeQuery = {
  pageNum?: number;
  pageSize?: number;
  cityCode?: string;
  debtAmount?: number;
};

export type LawyerCourtFeePayload = {
  id?: string | number;
  cityCode: string;
  debtAmountMin: number;
  debtAmountMax?: number | null;
  courtFeeMin: number;
  courtFeeMax: number;
  remark?: string | null;
};

const API_PREFIX = '/system/recov/lawyer-court/fee-config';

export const getLawyerCourtFeePage = (params: LawyerCourtFeeQuery) =>
  ruoyiRequest<LawyerCourtFeeConfigItem>(`${API_PREFIX}/page`, {
    method: 'get',
    params,
  });

export const getLawyerCourtCityOptions = () =>
  ruoyiRequest<LawyerCourtCityOption[]>(`${API_PREFIX}/city-options`, {
    method: 'get',
  });

export const addLawyerCourtFeeConfig = (data: LawyerCourtFeePayload) =>
  ruoyiRequest<void>(API_PREFIX, {
    method: 'post',
    data,
  });

export const updateLawyerCourtFeeConfig = (data: LawyerCourtFeePayload) =>
  ruoyiRequest<void>(API_PREFIX, {
    method: 'put',
    data,
  });

export const deleteLawyerCourtFeeConfig = (id: string | number) =>
  ruoyiRequest<void>(`${API_PREFIX}/${id}`, {
    method: 'delete',
  });
