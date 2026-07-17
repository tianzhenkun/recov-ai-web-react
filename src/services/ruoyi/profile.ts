import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type CurrentProfileUser = {
  userId?: number | string;
  tenantId?: string;
  deptId?: number | string;
  deptName?: string;
  userName?: string;
  nickName?: string;
  email?: string;
  phonenumber?: string;
  sex?: string;
  avatar?: number | string;
  loginIp?: string;
  loginDate?: string;
};

export type CurrentProfile = {
  user?: CurrentProfileUser;
  roleGroup?: string;
  postGroup?: string;
};

export type CurrentProfileUpdate = {
  nickName?: string;
  email?: string;
  phonenumber?: string;
  sex?: string;
};

export type CurrentPasswordUpdate = {
  oldPassword: string;
  newPassword: string;
};

export type CurrentAvatarUpdate = {
  imgUrl?: string;
};

export const getCurrentProfile = () =>
  ruoyiRequest<CurrentProfile>('/system/user/profile', { method: 'get' });

export const updateCurrentProfile = (data: CurrentProfileUpdate) =>
  ruoyiRequest('/system/user/profile', { method: 'put', data });

export const updateCurrentPassword = (data: CurrentPasswordUpdate) =>
  ruoyiRequest('/system/user/profile/updatePwd', {
    method: 'put',
    headers: {
      isEncrypt: true,
      repeatSubmit: false,
    },
    data,
  });

export const uploadCurrentAvatar = (file: File) => {
  const formData = new FormData();
  formData.append('avatarfile', file);
  return ruoyiRequest<CurrentAvatarUpdate>('/system/user/profile/avatar', {
    method: 'post',
    headers: { repeatSubmit: false },
    data: formData,
  });
};
