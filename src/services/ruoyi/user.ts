import {
  ruoyiRequest,
  type RuoyiRequestOptions,
} from '@/adapters/ruoyi/request';

export type RuoyiUser = {
  userId?: number | string;
  userName?: string;
  nickName?: string;
  avatar?: string;
  email?: string;
  phonenumber?: string;
};

export type UserInfo = {
  user?: RuoyiUser;
  roles?: string[];
  permissions?: string[];
};

export const getInfo = (options: RuoyiRequestOptions = {}) =>
  ruoyiRequest<UserInfo>('/system/user/getInfo', {
    method: 'get',
    ...options,
  });
