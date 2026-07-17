import { ruoyiRequest } from '@/adapters/ruoyi/request';

const BASE = '/system/product-catalog';

export type PlatformProductStatus = '0' | '1';

export type PlatformProduct = {
  id?: string;
  productCode?: string;
  productName?: string;
  status?: PlatformProductStatus;
  remark?: string;
  createTime?: string;
  updateTime?: string;
};

export type PlatformProductQuery = {
  keyword?: string;
  status?: PlatformProductStatus;
  pageNum?: number;
  pageSize?: number;
};

export type PlatformProductCreatePayload = {
  productCode: string;
  productName: string;
  status?: PlatformProductStatus;
  remark?: string;
};

export type PlatformProductUpdatePayload = {
  productName: string;
  remark?: string;
};

export type PlatformProductStatusPayload = {
  status: PlatformProductStatus;
};

export const listPlatformProducts = (params: PlatformProductQuery = {}) =>
  ruoyiRequest<PlatformProduct>(`${BASE}/list`, {
    method: 'get',
    params,
  });

export const listEnabledPlatformProducts = () =>
  ruoyiRequest<PlatformProduct[]>(`${BASE}/options`, {
    method: 'get',
  });

export const getPlatformProduct = (id: string) =>
  ruoyiRequest<PlatformProduct>(`${BASE}/${id}`, {
    method: 'get',
  });

export const createPlatformProduct = (data: PlatformProductCreatePayload) =>
  ruoyiRequest<PlatformProduct>(BASE, {
    method: 'post',
    data,
  });

export const updatePlatformProduct = (
  id: string,
  data: PlatformProductUpdatePayload,
) =>
  ruoyiRequest<PlatformProduct>(`${BASE}/${id}`, {
    method: 'put',
    data,
  });

export const updatePlatformProductStatus = (
  id: string,
  data: PlatformProductStatusPayload,
) =>
  ruoyiRequest<PlatformProduct>(`${BASE}/${id}/status`, {
    method: 'put',
    data,
  });
