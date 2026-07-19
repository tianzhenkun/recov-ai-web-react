import { ruoyiRequest } from '@/api/main';

export type CacheCommandStat = {
  name?: string;
  value?: string | number;
};

export type CacheInfo = Record<string, string | undefined>;

export type CacheDetail = {
  commandStats?: CacheCommandStat[];
  dbSize?: number;
  info?: CacheInfo;
};

export type CacheNameItem = {
  cacheName?: string;
  cacheKey?: string;
  cacheValue?: string;
  remark?: string;
};

export const getCache = () =>
  ruoyiRequest<CacheDetail>('/monitor/cache', {
    method: 'get',
  });

export const listCacheNames = () =>
  ruoyiRequest<CacheNameItem[]>('/monitor/cache/getNames', {
    method: 'get',
  });

export const listCacheKeys = (cacheName: string) =>
  ruoyiRequest<string[]>(`/monitor/cache/getKeys/${cacheName}`, {
    method: 'get',
  });

export const getCacheValue = (cacheName: string, cacheKey: string) =>
  ruoyiRequest<CacheNameItem>(
    `/monitor/cache/getValue/${cacheName}/${cacheKey}`,
    {
      method: 'get',
    },
  );

export const clearCacheName = (cacheName: string) =>
  ruoyiRequest(`/monitor/cache/clearCacheName/${cacheName}`, {
    method: 'delete',
  });

export const clearCacheKey = (cacheName: string, cacheKey: string) =>
  ruoyiRequest(`/monitor/cache/clearCacheKey/${cacheName}/${cacheKey}`, {
    method: 'delete',
  });

export const clearAllCache = () =>
  ruoyiRequest('/monitor/cache/clearCacheAll', {
    method: 'delete',
  });
