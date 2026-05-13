import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type PageQuery = {
  pageNum?: number;
  pageSize?: number;
  [key: string]: unknown;
};

export type PersonaItem = {
  id?: number | string;
  personaName?: string;
  icon?: string;
  traits?: string;
  classification?: string;
  keyword?: string;
  dialogue?: string;
  createBy?: number | string;
  createTime?: string;
  updateTime?: string;
  tenantId?: string;
};

export type PersonaQuery = PageQuery & {
  personaName?: string;
};

export type PersonaForm = {
  id?: number | string;
  personaName?: string;
  icon?: string;
  traits?: string;
  classification?: string;
  keyword?: string;
  dialogue?: string;
};

export const listPersona = (params: PersonaQuery) =>
  ruoyiRequest<PersonaItem>('/system/persona/page', {
    method: 'get',
    params,
  });

export const getPersona = (id: number | string) =>
  ruoyiRequest<PersonaItem>(`/system/persona/${id}`, {
    method: 'get',
  });

export const addPersona = (data: PersonaForm) =>
  ruoyiRequest('/system/persona', {
    method: 'post',
    data,
  });

export const updatePersona = (data: PersonaForm) =>
  ruoyiRequest('/system/persona', {
    method: 'put',
    data,
  });

export const deletePersonas = (ids: number | string | (number | string)[]) =>
  ruoyiRequest(`/system/persona/${ids}`, {
    method: 'delete',
  });

export const importPersonaTemplate = () =>
  ruoyiRequest<Blob>('/system/persona/importTemplate', {
    method: 'post',
    responseType: 'blob',
  });

export const importPersona = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return ruoyiRequest<unknown>('/system/persona/import', {
    method: 'post',
    data: formData,
  });
};
