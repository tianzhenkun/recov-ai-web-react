import { ruoyiRequest } from '@/adapters/ruoyi/request';
import type { RuoyiRequestOptions } from '@/adapters/ruoyi/request';

export type RuoyiRouteMeta = {
  title?: string;
  icon?: string;
  noCache?: boolean;
  link?: string | null;
  activeMenu?: string | null;
  [key: string]: unknown;
};

export type RuoyiRoute = {
  name?: string;
  path?: string;
  hidden?: boolean;
  redirect?: string;
  component?: string;
  alwaysShow?: boolean;
  meta?: RuoyiRouteMeta;
  children?: RuoyiRoute[];
};

export const getRouters = (options: RuoyiRequestOptions = {}) =>
  ruoyiRequest<RuoyiRoute[]>('/system/menu/getRouters', {
    method: 'get',
    ...options,
  });
