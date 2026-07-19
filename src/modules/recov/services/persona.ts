import { ruoyiRequest } from '@/api/main';

export type PageQuery = {
  pageNum?: number;
  pageSize?: number;
  [key: string]: unknown;
};

export type PersonaItem = {
  id?: number | string;
  personaName?: string;
  icon?: string;
  motivation?: string;
  overview?: string;
  tags?: string[] | string;
  priority?: string | number;
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

type SortablePersona = {
  id?: number | string;
  personaName?: string | null;
};

const collator = new Intl.Collator('zh-Hans-CN', {
  numeric: true,
  sensitivity: 'base',
});

export const sortPersonasByName = <T extends SortablePersona>(items: T[]) =>
  [...items].sort((left, right) => {
    const nameCompare = collator.compare(
      left.personaName?.trim() || '',
      right.personaName?.trim() || '',
    );
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return String(left.id ?? '').localeCompare(String(right.id ?? ''));
  });

export const listPersona = async (params: PersonaQuery) => {
  const res = await ruoyiRequest<PersonaItem>('/system/persona/page', {
    method: 'get',
    params,
  });
  return Array.isArray(res.rows)
    ? { ...res, rows: sortPersonasByName(res.rows) }
    : res;
};

export type PersonaSimple = {
  id: number | string;
  personaName: string;
};

/**
 * 精简版画像列表，仅返回 id + personaName，用于下拉/多选场景。
 */
export const listPersonasSimple = async () => {
  const res = await ruoyiRequest<PersonaSimple[]>('/system/persona/list', {
    method: 'get',
  });
  return Array.isArray(res.data)
    ? { ...res, data: sortPersonasByName(res.data) }
    : res;
};

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
