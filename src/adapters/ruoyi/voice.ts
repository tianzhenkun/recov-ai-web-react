import { getVoiceApi } from './env';

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

export const getVoiceApiUrl = (path: string) => {
  const channel = getVoiceApi();
  if (!channel) {
    throw new Error('当前站点未配置 Voice API 通道。');
  }
  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(path)) {
    throw new Error('Voice API 请求只允许使用同源相对路径。');
  }
  return `/${trimSlashes(channel)}/${trimSlashes(path)}`;
};

export const voiceFetch = (path: string, init: RequestInit = {}) =>
  fetch(getVoiceApiUrl(path), {
    credentials: 'same-origin',
    ...init,
  });
