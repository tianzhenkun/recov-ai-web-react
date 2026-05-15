import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type InstrumentTaskStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type InstrumentTaskItem = {
  id: number | string;
  debtId?: number | string;
  debtorName?: string;
  debtNumber?: string;
  debtAmount?: number | string;
  overdueAmount?: number | string;
  overdueDays?: number | string;
  city?: string;
  organization?: string;
  instrumentCode?: string;
  instrumentName?: string;
  category?: string;
  templateOssId?: number | string;
  status?: InstrumentTaskStatus | number;
  deliveryTaskId?: string | null;
  editable?: boolean;
  createTime?: string;
};

export type InstrumentTaskQuery = {
  pageNum?: number;
  pageSize?: number;
  category?: string;
  status?: number;
  instrumentCode?: string;
  debtorName?: string;
  debtNumber?: string;
  city?: string;
  organization?: string;
};

export type InstrumentMetricItem = {
  key: string;
  label?: string;
  value?: number;
  displayValue?: string;
  unit?: string;
};

export type InstrumentTaskPageData = {
  page?: {
    total?: number;
    rows?: InstrumentTaskItem[];
  };
  metrics?: InstrumentMetricItem[];
};

export type InstrumentTaskContentData =
  | string
  | {
      htmlContent?: string;
      templateHtml?: string;
      contentHtml?: string;
    };

export const pageInstrumentTask = (params: InstrumentTaskQuery) =>
  ruoyiRequest<InstrumentTaskPageData>('/system/instrument/task/page', {
    method: 'get',
    params,
  });

export const pageInstrumentTaskDebts = (params: InstrumentTaskQuery) =>
  ruoyiRequest<InstrumentTaskItem>('/system/instrument/task/debts', {
    method: 'get',
    params,
  });

export const addInstrumentTask = (
  debtId: number | string,
  instrumentName: string,
  htmlContent: string,
) =>
  ruoyiRequest('/system/instrument/task', {
    method: 'post',
    data: { debtId, instrumentName, htmlContent },
    headers: { repeatSubmit: false },
  });

export const updateInstrumentTaskTemplate = (
  taskId: number | string,
  htmlContent: string,
  instrumentName?: string,
) =>
  ruoyiRequest('/system/instrument/task/template', {
    method: 'put',
    data: { taskId, htmlContent, instrumentName },
    headers: { repeatSubmit: false },
  });

export const getInstrumentTaskContent = (taskId: number | string) =>
  ruoyiRequest<InstrumentTaskContentData>(
    `/system/instrument/task/content/${taskId}`,
    {
      method: 'get',
    },
  );

export const deleteInstrumentTask = (id: number | string) =>
  ruoyiRequest(`/system/instrument/task/${id}`, {
    method: 'delete',
  });

export const executeInstrumentTask = (id: number | string) =>
  ruoyiRequest(`/system/instrument/task/execute/${id}`, {
    method: 'post',
  });

export const listInstrumentCities = () =>
  ruoyiRequest<string[]>('/system/recov/debt/cities', {
    method: 'get',
  });

export const listInstrumentOrganizations = () =>
  ruoyiRequest<string[]>('/system/recov/debt/organizations', {
    method: 'get',
  });
