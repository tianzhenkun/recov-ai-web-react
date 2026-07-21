import { ruoyiRequest } from '@/api/main';

const BASE = '/system/license-management';

export type LicenseCapabilityStatus = {
  issuerEnabled: boolean;
};

export const getLicenseCapabilities = () =>
  ruoyiRequest<LicenseCapabilityStatus>(`${BASE}/capabilities`, {
    method: 'GET',
  });

export type LicenseStatus = '0' | '1';
export type LicenseIssueType =
  | 'INITIAL'
  | 'RENEWAL'
  | 'PRODUCT_CHANGE'
  | 'REPLACEMENT';

export type LicensePageQuery = {
  pageNum?: number;
  pageSize?: number;
};

export type LicenseProduct = {
  id?: string;
  productCode?: string;
  productName?: string;
  status?: LicenseStatus;
  remark?: string;
  createTime?: string;
  updateTime?: string;
};

export type LicenseProductCreatePayload = {
  productCode: string;
  productName: string;
  status?: LicenseStatus;
  remark?: string;
};

export type LicenseProductUpdatePayload = {
  productName: string;
  status: LicenseStatus;
  remark?: string;
};

export type LicenseProductQuery = LicensePageQuery & {
  keyword?: string;
  status?: LicenseStatus;
};

export type LicenseProductRoute = {
  id?: string;
  productCode?: string;
  routeId?: string;
  serviceId?: string;
  pathPatterns?: string;
  status?: LicenseStatus;
  remark?: string;
  createTime?: string;
  updateTime?: string;
};

export type LicenseProductRouteCreatePayload = {
  routeId: string;
  serviceId: string;
  pathPatterns: string;
  status?: LicenseStatus;
  remark?: string;
};

export type LicenseProductRouteUpdatePayload = {
  pathPatterns: string;
  status: LicenseStatus;
  remark?: string;
};

export type LicenseDeployment = {
  id?: string;
  deploymentId?: string;
  customerName?: string;
  status?: LicenseStatus;
  lastIssuedRevision?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
};

export type LicenseDeploymentCreatePayload = {
  customerName: string;
  remark?: string;
};

export type LicenseDeploymentUpdatePayload = {
  customerName: string;
  status: LicenseStatus;
  remark?: string;
};

export type LicenseDeploymentQuery = LicensePageQuery & {
  keyword?: string;
  status?: LicenseStatus;
};

export type LicenseProductGrant = {
  productCode: string;
  validFrom: string;
  validUntil?: string | null;
};

export type LicenseIssue = {
  id?: string;
  licenseId?: string;
  deploymentId?: string;
  licenseRevision?: string;
  issueType?: LicenseIssueType;
  products?: LicenseProductGrant[];
  documentSha256?: string;
  status?: LicenseStatus;
  issueReason?: string;
  issuedAt?: string;
  issuedBy?: string;
};

export type LicenseIssueProductPayload = {
  productCode: string;
  validFrom: string;
  permanent: boolean;
  validUntil?: string;
};

export type LicenseIssueCreatePayload = {
  issueType: LicenseIssueType;
  issueReason: string;
  products: LicenseIssueProductPayload[];
};

export type LicenseIssueQuery = LicensePageQuery & {
  deploymentId?: string;
};

export const listLicenseProducts = (params: LicenseProductQuery = {}) =>
  ruoyiRequest<LicenseProduct>(`${BASE}/products`, {
    method: 'get',
    params,
  });

export const createLicenseProduct = (data: LicenseProductCreatePayload) =>
  ruoyiRequest<LicenseProduct>(`${BASE}/products`, {
    method: 'post',
    data,
  });

export const updateLicenseProduct = (
  id: string,
  data: LicenseProductUpdatePayload,
) =>
  ruoyiRequest(`${BASE}/products/${id}`, {
    method: 'put',
    data,
  });

export const listLicenseProductRoutes = (productCode: string) =>
  ruoyiRequest<LicenseProductRoute[]>(
    `${BASE}/products/${encodeURIComponent(productCode)}/routes`,
    { method: 'get' },
  );

export const createLicenseProductRoute = (
  productId: string,
  data: LicenseProductRouteCreatePayload,
) =>
  ruoyiRequest<LicenseProductRoute>(`${BASE}/products/${productId}/routes`, {
    method: 'post',
    data,
  });

export const updateLicenseProductRoute = (
  id: string,
  data: LicenseProductRouteUpdatePayload,
) =>
  ruoyiRequest(`${BASE}/routes/${id}`, {
    method: 'put',
    data,
  });

export const listLicenseDeployments = (params: LicenseDeploymentQuery = {}) =>
  ruoyiRequest<LicenseDeployment>(`${BASE}/deployments`, {
    method: 'get',
    params,
  });

export const createLicenseDeployment = (data: LicenseDeploymentCreatePayload) =>
  ruoyiRequest<LicenseDeployment>(`${BASE}/deployments`, {
    method: 'post',
    data,
  });

export const updateLicenseDeployment = (
  id: string,
  data: LicenseDeploymentUpdatePayload,
) =>
  ruoyiRequest(`${BASE}/deployments/${id}`, {
    method: 'put',
    data,
  });

export const listLicenseIssues = (params: LicenseIssueQuery = {}) =>
  ruoyiRequest<LicenseIssue>(`${BASE}/issues`, {
    method: 'get',
    params,
  });

export const issueLicense = (
  deploymentRecordId: string,
  data: LicenseIssueCreatePayload,
) =>
  ruoyiRequest<LicenseIssue>(
    `${BASE}/deployments/${deploymentRecordId}/issues`,
    {
      method: 'post',
      data,
    },
  );

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

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const parseJson = (text: string) => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
};

const getResponseErrorMessage = (text: string) => {
  const response = asRecord(parseJson(text));
  if (!response || !('code' in response)) return undefined;
  return typeof response.msg === 'string' && response.msg.trim()
    ? response.msg
    : '文件下载失败';
};

const isNonBlankString = (value: unknown): value is string =>
  typeof value === 'string' && Boolean(value.trim());

const validateLicenseDocument = (text: string) => {
  const errorMessage = getResponseErrorMessage(text);
  if (errorMessage) throw new Error(errorMessage);

  const envelope = asRecord(parseJson(text));
  const valid =
    envelope?.format === 'LC-LICENSE' &&
    typeof envelope.version === 'number' &&
    Number.isInteger(envelope.version) &&
    envelope.version > 0 &&
    isNonBlankString(envelope.keyId) &&
    isNonBlankString(envelope.payload) &&
    isNonBlankString(envelope.signature);
  if (!valid) {
    throw new Error('下载内容不是有效的license.lic');
  }
};

const deploymentIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const validateDeploymentIdDocument = (text: string) => {
  const errorMessage = getResponseErrorMessage(text);
  if (errorMessage) throw new Error(errorMessage);
  if (!deploymentIdPattern.test(text.trim())) {
    throw new Error('下载内容不是有效的deployment.id');
  }
};

type DownloadContentValidator = (text: string) => void;

const readBlobText = (blob: Blob) => {
  if (typeof blob.text === 'function') return blob.text();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () =>
      reject(reader.error || new Error('读取下载文件失败'));
    reader.readAsText(blob);
  });
};

const downloadFile = async (
  url: string,
  filename: string,
  validate: DownloadContentValidator,
) => {
  const blob = await ruoyiRequest<Blob>(url, {
    method: 'get',
    responseType: 'blob',
  });
  const text = await readBlobText(blob);
  validate(text);
  saveBlob(blob, filename);
};

export const downloadLicenseFile = (issueId: string) =>
  downloadFile(
    `${BASE}/issues/${issueId}/download`,
    'license.lic',
    validateLicenseDocument,
  );

export const downloadDeploymentIdFile = (deploymentRecordId: string) =>
  downloadFile(
    `${BASE}/deployments/${deploymentRecordId}/deployment-id-file`,
    'deployment.id',
    validateDeploymentIdDocument,
  );
