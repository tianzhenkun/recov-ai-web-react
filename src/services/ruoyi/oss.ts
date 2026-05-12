import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type OssItem = {
  ossId?: number | string;
  fileName?: string;
  originalName?: string;
  fileSuffix?: string;
  url?: string;
  createByName?: string;
  createTime?: string;
  service?: string;
};

export type OssQuery = {
  pageNum?: number;
  pageSize?: number;
  fileName?: string;
  originalName?: string;
  fileSuffix?: string;
  createTime?: string;
  service?: string;
  orderByColumn?: string;
  isAsc?: string;
  params?: Record<string, unknown>;
};

export type OssUploadResult = {
  ossId: number | string;
  fileName: string;
  url: string;
};

const isJsonBlob = (blob: Blob) => blob.type === 'application/json';

const saveBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const listOss = (params: OssQuery) =>
  ruoyiRequest<OssItem>('/resource/oss/list', {
    method: 'get',
    params,
  });

export const listOssByIds = (ossId: number | string) =>
  ruoyiRequest<OssItem[]>(`/resource/oss/listByIds/${ossId}`, {
    method: 'get',
  });

export const uploadOssFile = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return ruoyiRequest<OssUploadResult>('/resource/oss/upload', {
    method: 'post',
    data: formData,
    headers: {
      repeatSubmit: false,
    },
  });
};

export const deleteOss = (ossIds: number | string | (number | string)[]) =>
  ruoyiRequest(`/resource/oss/${ossIds}`, {
    method: 'delete',
  });

export const downloadOss = async (
  ossId: number | string,
  filename = `oss_${ossId}`,
) => {
  const blob = await ruoyiRequest<Blob>(`/resource/oss/download/${ossId}`, {
    method: 'get',
    responseType: 'blob',
  });

  if (isJsonBlob(blob)) {
    const text = await blob.text();
    const result = JSON.parse(text) as { msg?: string };
    throw new Error(result.msg || '下载文件失败');
  }

  saveBlob(blob, filename);
};
