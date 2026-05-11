import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type RuoyiRouteMeta = {
  title?: string;
  icon?: string;
  noCache?: boolean;
  link?: string;
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

export const getRouters = () =>
  ruoyiRequest<RuoyiRoute[]>('/system/menu/getRouters', {
    method: 'get',
  });
