import { ruoyiRequest } from '@/adapters/ruoyi/request';

export const PROJECT_API_PREFIX = '/system/recov/project';

export type FeeTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_OTHER';

export type ProjectStatus = 0 | 1;

export type ProjectQuery = {
  pageNum?: number;
  pageSize?: number;
  projectName?: string;
  feeTier?: FeeTier | string;
  status?: ProjectStatus;
};

export type RecovProjectItem = {
  id: number | string;
  projectName: string;
  feeTier: FeeTier | string;
  feeTierName?: string;
  status?: ProjectStatus;
  sortOrder?: number;
  remark?: string | null;
  referenced?: boolean;
  debtCount?: number | string;
  createTime?: string;
  updateTime?: string;
};

export type ProjectPayload = {
  id?: number | string;
  projectName: string;
  feeTier: FeeTier | string;
  status?: ProjectStatus;
  sortOrder?: number;
  remark?: string | null;
};

export type BatchProjectPayload = {
  items: ProjectPayload[];
};

export const getProjectPage = (params?: ProjectQuery) =>
  ruoyiRequest<RecovProjectItem>(`${PROJECT_API_PREFIX}/page`, {
    method: 'get',
    params,
  });

export const getProjectList = (params?: ProjectQuery) =>
  ruoyiRequest<RecovProjectItem[]>(`${PROJECT_API_PREFIX}/list`, {
    method: 'get',
    params,
  });

export const getProject = (id: number | string) =>
  ruoyiRequest<RecovProjectItem>(`${PROJECT_API_PREFIX}/${id}`, {
    method: 'get',
  });

export const addProject = (data: ProjectPayload) =>
  ruoyiRequest<void>(PROJECT_API_PREFIX, {
    method: 'post',
    data,
  });

export const batchAddProjects = (data: BatchProjectPayload) =>
  ruoyiRequest<void>(`${PROJECT_API_PREFIX}/batch`, {
    method: 'post',
    data,
  });

export const updateProject = (data: ProjectPayload) =>
  ruoyiRequest<void>(PROJECT_API_PREFIX, {
    method: 'put',
    data,
  });

export const deleteProject = (id: number | string) =>
  ruoyiRequest<void>(`${PROJECT_API_PREFIX}/${id}`, {
    method: 'delete',
  });
