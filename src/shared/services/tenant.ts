import { ruoyiDownload, ruoyiRequest } from '@/api/main';
import type { MenuTreeItem } from '@/shared/types';

export type TenantItem = {
  id?: number | string;
  tenantId?: number | string;
  username?: string;
  contactUserName?: string;
  contactPhone?: string;
  companyName?: string;
  licenseNumber?: string;
  address?: string;
  domain?: string;
  intro?: string;
  remark?: string;
  packageId?: number | string;
  expireTime?: string;
  accountCount?: number;
  status?: string;
};

export type TenantForm = {
  id?: number | string;
  tenantId?: number | string;
  username?: string;
  password?: string;
  contactUserName?: string;
  contactPhone?: string;
  companyName?: string;
  licenseNumber?: string;
  domain?: string;
  address?: string;
  intro?: string;
  remark?: string;
  packageId?: number | string;
  expireTime?: string;
  accountCount?: number;
  status?: string;
};

export type TenantQuery = {
  pageNum?: number;
  pageSize?: number;
  tenantId?: number | string;
  contactUserName?: string;
  contactPhone?: string;
  companyName?: string;
};

export type TenantPackageItem = {
  packageId?: number | string;
  packageName?: string;
  menuIds?: string | (number | string)[];
  remark?: string;
  menuCheckStrictly?: boolean;
  status?: string;
};

export type TenantPackageForm = {
  packageId?: number | string;
  packageName?: string;
  menuIds?: string | (number | string)[];
  remark?: string;
  menuCheckStrictly?: boolean;
  status?: string;
};

export type TenantPackageQuery = {
  pageNum?: number;
  pageSize?: number;
  packageName?: string;
};

export const listTenants = (params: TenantQuery) =>
  ruoyiRequest<TenantItem>('/system/tenant/list', {
    method: 'get',
    params,
  });

export const getTenant = (id: number | string) =>
  ruoyiRequest<TenantItem>(`/system/tenant/${id}`, {
    method: 'get',
  });

export const addTenant = (data: TenantForm) =>
  ruoyiRequest('/system/tenant', {
    method: 'post',
    data,
    headers: {
      isEncrypt: true,
      repeatSubmit: false,
    },
  });

export const updateTenant = (data: TenantForm) =>
  ruoyiRequest('/system/tenant', {
    method: 'put',
    data,
  });

export const changeTenantStatus = (
  id: number | string,
  tenantId: number | string,
  status: string,
) =>
  ruoyiRequest('/system/tenant/changeStatus', {
    method: 'put',
    data: {
      id,
      tenantId,
      status,
    },
  });

export const deleteTenants = (ids: number | string | (number | string)[]) =>
  ruoyiRequest(`/system/tenant/${ids}`, {
    method: 'delete',
  });

export const dynamicTenant = (tenantId: number | string) =>
  ruoyiRequest(`/system/tenant/dynamic/${tenantId}`, {
    method: 'get',
  });

export const dynamicClear = () =>
  ruoyiRequest('/system/tenant/dynamic/clear', {
    method: 'get',
  });

export const syncTenantPackage = (
  tenantId: number | string,
  packageId: number | string,
) =>
  ruoyiRequest('/system/tenant/syncTenantPackage', {
    method: 'get',
    params: {
      tenantId,
      packageId,
    },
  });

export const syncTenantDict = () =>
  ruoyiRequest('/system/tenant/syncTenantDict', {
    method: 'get',
  });

export const syncTenantConfig = () =>
  ruoyiRequest('/system/tenant/syncTenantConfig', {
    method: 'get',
  });

export const selectTenantPackages = () =>
  ruoyiRequest<TenantPackageItem[]>('/system/tenant/package/selectList', {
    method: 'get',
  });

export const listTenantPackages = (params: TenantPackageQuery = {}) =>
  ruoyiRequest<TenantPackageItem>('/system/tenant/package/list', {
    method: 'get',
    params,
  });

export const getTenantPackage = (packageId: number | string) =>
  ruoyiRequest<TenantPackageItem>(`/system/tenant/package/${packageId}`, {
    method: 'get',
  });

export const addTenantPackage = (data: TenantPackageForm) =>
  ruoyiRequest('/system/tenant/package', {
    method: 'post',
    data,
  });

export const updateTenantPackage = (data: TenantPackageForm) =>
  ruoyiRequest('/system/tenant/package', {
    method: 'put',
    data,
  });

export const changeTenantPackageStatus = (
  packageId: number | string,
  status: string,
) =>
  ruoyiRequest('/system/tenant/package/changeStatus', {
    method: 'put',
    data: {
      packageId,
      status,
    },
  });

export const deleteTenantPackages = (
  packageIds: number | string | (number | string)[],
) =>
  ruoyiRequest(`/system/tenant/package/${packageIds}`, {
    method: 'delete',
  });

export const tenantPackageMenuTreeSelect = (packageId: number | string) =>
  ruoyiRequest<{
    menus?: MenuTreeItem[];
    checkedKeys?: (number | string)[];
  }>(`/system/menu/tenantPackageMenuTreeselect/${packageId}`, {
    method: 'get',
  });

export const exportTenantPackages = (
  params: Record<string, unknown>,
  filename = `tenantPackage_${Date.now()}.xlsx`,
) => ruoyiDownload('/system/tenant/package/export', params, filename);

export const exportTenants = (
  params: Record<string, unknown>,
  filename = `tenant_${Date.now()}.xlsx`,
) => ruoyiDownload('/system/tenant/export', params, filename);
