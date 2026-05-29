import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type DeliveryTaskStatus = 0 | 1 | 2 | 3;

export type DeliveryTaskItem = {
  taskId: string;
  deliveryId?: string | null;
  debtId?: string | null;
  debtNumber?: string | number | null;
  businessId?: string | null;
  debtorName?: string | null;
  debtorPhone?: string | null;
  debtorEmail?: string | null;
  city?: string | null;
  projectName?: string | null;
  debtAmount?: string | number | null;
  overdueAmount?: string | number | null;
  overdueDays?: number | null;
  taskStatus?: DeliveryTaskStatus | number | null;
  taskStatusLabel?: string | null;
  errorMessage?: string | null;
  sceneCode?: string | null;
  sceneName?: string | null;
  fileOssId?: string | null;
  fileName?: string | null;
  publicUrl?: string | null;
  wayCode?: string | null;
  wayName?: string | null;
  sortOrder?: number | null;
  flowIndex?: number | null;
  onSuccess?: 'stop' | 'next' | string | null;
  onFail?: 'stop' | 'next' | string | null;
  subjectContent?: string | null;
  sendContent?: string | null;
  providerRequestId?: string | null;
  providerResponse?: string | null;
  retryCount?: number | null;
  taskCreateTime?: string | null;
  createTime?: string | null;
};

export type ListDeliveryTasksParams = {
  pageNum: number;
  pageSize: number;
  debtNumber?: string;
  city?: string;
  organization?: string;
  keyword?: string;
  sceneCode?: string;
  wayCode?: string;
  status?: DeliveryTaskStatus | number;
};

export type DeliveryOverview = {
  pendingCount?: number;
  sendingCount?: number;
  smsTotal?: number;
  emailTotal?: number;
  expressTotal?: number;
  callTotal?: number;
  successCount?: number;
  failedCount?: number;
};

export type DeliveryTaskPageResult = {
  keyword?: string;
  debtNumber?: string;
  city?: string;
  organization?: string;
  overview?: DeliveryOverview;
  total: number;
  rows: DeliveryTaskItem[];
};

export type CreateDeliveryTaskPayload = {
  sceneCode: string;
  debtId: string;
  businessId: string;
  ossId: string;
};

export type CreateDeliveryTaskResult = {
  deliveryId: string;
  taskId: string;
  status: DeliveryTaskStatus | number;
};

const BASE = '/system/recov/delivery/tasks';

const toPageResult = (value: unknown): DeliveryTaskPageResult => {
  const data = (value ?? {}) as Partial<DeliveryTaskPageResult> & {
    rows?: DeliveryTaskItem[];
    total?: number;
  };
  return {
    keyword: data.keyword,
    debtNumber: data.debtNumber,
    city: data.city,
    organization: data.organization,
    overview: data.overview ?? {},
    total: Number(data.total ?? 0),
    rows: Array.isArray(data.rows) ? data.rows : [],
  };
};

export const createDeliveryTask = async (data: CreateDeliveryTaskPayload) => {
  const res = await ruoyiRequest<CreateDeliveryTaskResult>(BASE, {
    method: 'post',
    data,
  });
  return res.data;
};

export const listDeliveryTasks = async (
  params: ListDeliveryTasksParams,
): Promise<DeliveryTaskPageResult> => {
  const res = await ruoyiRequest<DeliveryTaskPageResult>(`${BASE}/page`, {
    method: 'get',
    params,
  });
  return toPageResult(res.data);
};

export const listDeliveryCities = () =>
  ruoyiRequest<string[]>('/system/recov/debt/cities', {
    method: 'get',
  });

export const listDeliveryOrganizations = () =>
  ruoyiRequest<string[]>('/system/recov/debt/organizations', {
    method: 'get',
  });

export const getDeliveryTask = async (taskId: string) => {
  const res = await ruoyiRequest<DeliveryTaskItem>(`${BASE}/${taskId}`, {
    method: 'get',
  });
  return res.data;
};

export const retryDeliveryTask = async (taskId: string) => {
  const res = await ruoyiRequest<DeliveryTaskItem>(`${BASE}/${taskId}/retry`, {
    method: 'post',
  });
  return res.data;
};
