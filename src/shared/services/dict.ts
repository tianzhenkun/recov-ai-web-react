import { ruoyiDownload, ruoyiRequest } from '@/api/main';

export type PageQuery = {
  pageNum?: number;
  pageSize?: number;
  [key: string]: unknown;
};

export type DictTypeItem = {
  dictId?: number | string;
  dictName?: string;
  dictType?: string;
  remark?: string;
  createTime?: string;
};

export type DictTypeForm = {
  dictId?: number | string;
  dictName?: string;
  dictType?: string;
  remark?: string;
};

export type DictTypeQuery = PageQuery & {
  dictName?: string;
  dictType?: string;
};

export type DictDataItem = {
  dictCode?: number | string;
  dictType?: string;
  dictLabel?: string;
  dictValue?: string;
  cssClass?: string;
  listClass?: string;
  dictSort?: number;
  remark?: string;
  createTime?: string;
};

export type DictDataForm = {
  dictCode?: number | string;
  dictType?: string;
  dictLabel?: string;
  dictValue?: string;
  cssClass?: string;
  listClass?: string;
  dictSort?: number;
  remark?: string;
};

export type DictDataQuery = PageQuery & {
  dictType?: string;
  dictLabel?: string;
};

export const listDictTypes = (params: DictTypeQuery) =>
  ruoyiRequest<DictTypeItem>('/system/dict/type/list', {
    method: 'get',
    params,
  });

export const getDictType = (dictId: number | string) =>
  ruoyiRequest<DictTypeItem>(`/system/dict/type/${dictId}`, {
    method: 'get',
  });

export const addDictType = (data: DictTypeForm) =>
  ruoyiRequest('/system/dict/type', {
    method: 'post',
    data,
  });

export const updateDictType = (data: DictTypeForm) =>
  ruoyiRequest('/system/dict/type', {
    method: 'put',
    data,
  });

export const deleteDictTypes = (
  dictIds: number | string | (number | string)[],
) =>
  ruoyiRequest(`/system/dict/type/${dictIds}`, {
    method: 'delete',
  });

export const refreshDictCache = () =>
  ruoyiRequest('/system/dict/type/refreshCache', {
    method: 'delete',
  });

export const selectDictTypes = () =>
  ruoyiRequest<DictTypeItem[]>('/system/dict/type/optionselect', {
    method: 'get',
  });

export const getDicts = (dictType: string) =>
  ruoyiRequest<DictDataItem[]>(`/system/dict/data/type/${dictType}`, {
    method: 'get',
  });

export const exportDictTypes = (
  params: Record<string, unknown>,
  filename = `dict_${Date.now()}.xlsx`,
) => ruoyiDownload('/system/dict/type/export', params, filename);

export const listDictData = (params: DictDataQuery) =>
  ruoyiRequest<DictDataItem>('/system/dict/data/list', {
    method: 'get',
    params,
  });

export const getDictData = (dictCode: number | string) =>
  ruoyiRequest<DictDataItem>(`/system/dict/data/${dictCode}`, {
    method: 'get',
  });

export const addDictData = (data: DictDataForm) =>
  ruoyiRequest('/system/dict/data', {
    method: 'post',
    data,
  });

export const updateDictData = (data: DictDataForm) =>
  ruoyiRequest('/system/dict/data', {
    method: 'put',
    data,
  });

export const deleteDictData = (
  dictCodes: number | string | (number | string)[],
) =>
  ruoyiRequest(`/system/dict/data/${dictCodes}`, {
    method: 'delete',
  });

export const exportDictData = (
  params: Record<string, unknown>,
  filename = `dict_data_${Date.now()}.xlsx`,
) => ruoyiDownload('/system/dict/data/export', params, filename);
