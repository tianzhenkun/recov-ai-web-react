import { serializeRuoyiParams } from './params';
import {
  type RuoyiRawRequestOptions,
  type RuoyiRequestOptions,
  ruoyiRequest,
} from './request';

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

export const ruoyiDownload = async (
  url: string,
  data: Record<string, unknown>,
  filename: string,
  options: RuoyiRequestOptions = {},
) => {
  const requestOptions: RuoyiRawRequestOptions = {
    ...options,
    method: 'post',
    data: serializeRuoyiParams(data),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(options.headers || {}),
    },
    responseType: 'blob',
  };
  const response = await ruoyiRequest<Blob>(url, requestOptions);
  const blob = response;
  if (isJsonBlob(blob)) {
    const text = await blob.text();
    const result = JSON.parse(text) as { msg?: string };
    throw new Error(result.msg || '下载文件失败');
  }
  saveBlob(blob, filename);
};
