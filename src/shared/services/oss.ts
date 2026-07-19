import { ruoyiRequest } from '@/api/main';

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

const isJsonBlob = (blob: Blob) =>
  blob.type.toLowerCase().includes('application/json');

const saveBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
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

export type UploadProgressEvent = {
  loaded?: number;
  total?: number;
};

export const uploadOssFile = (
  file: File,
  onUploadProgress?: (event: UploadProgressEvent) => void,
) => {
  const formData = new FormData();
  formData.append('file', file);

  return ruoyiRequest<OssUploadResult>('/resource/oss/upload', {
    method: 'post',
    data: formData,
    headers: {
      repeatSubmit: false,
    },
    onUploadProgress,
  });
};

export const deleteOss = (ossIds: number | string | (number | string)[]) =>
  ruoyiRequest(`/resource/oss/${ossIds}`, {
    method: 'delete',
  });

export const getOssBlob = async (ossId: number | string) => {
  const blob = await ruoyiRequest<Blob>(`/resource/oss/download/${ossId}`, {
    method: 'get',
    responseType: 'blob',
  });

  if (isJsonBlob(blob)) {
    const text = await blob.text();
    const result = JSON.parse(text) as { msg?: string };
    throw new Error(result.msg || '下载文件失败');
  }

  return blob;
};

export const downloadOss = async (
  ossId: number | string,
  filename = `oss_${ossId}`,
) => {
  const blob = await getOssBlob(ossId);
  saveBlob(blob, filename);
};
