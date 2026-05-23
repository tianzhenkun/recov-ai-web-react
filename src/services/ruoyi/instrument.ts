import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type InstrumentTaskStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type InstrumentTaskGroupItem = {
  groupId?: string;
  debtId?: number | string;
  debtorName?: string;
  debtNumber?: string;
  overdueAmount?: number | string;
  overdueDays?: number | string;
  debtIdCard?: string;
  city?: string;
  organization?: string;
  category?: string;
  displayGroupCode?: string;
  displayGroupName?: string;
  primaryTaskId?: number | string;
  totalCount?: number | string;
  sealedCount?: number | string;
  generatedCount?: number | string;
  processingCount?: number | string;
  failedCount?: number | string;
  readyForFiling?: boolean;
  latestUpdateTime?: string;
};

export type InstrumentTaskItem = {
  id: number | string;
  debtId?: number | string;
  taskSource?: 'BUILTIN' | 'SUPPLEMENTAL' | string;
  debtorName?: string;
  debtNumber?: string;
  debtAmount?: number | string;
  overdueAmount?: number | string;
  overdueDays?: number | string;
  debtIdCard?: string;
  debtorPhone?: string;
  city?: string;
  organization?: string;
  instrumentCode?: string;
  instrumentName?: string;
  category?: string;
  displayGroupCode?: string;
  displayGroupName?: string;
  revisionId?: number | string;
  currentRevisionNo?: number;
  hasPendingRevision?: boolean;
  draftOssId?: number | string;
  sealedOssId?: number | string;
  displayOssId?: number | string;
  displayStage?: 'SEALED' | 'DRAFT' | string;
  errorMessage?: string;
  batchId?: number | string;
  batchAction?: string;
  hasContent?: boolean;
  status?: InstrumentTaskStatus | number;
  deliveryTaskId?: string | null;
  editable?: boolean;
  createTime?: string;
};

export type InstrumentTaskDetail = InstrumentTaskItem & {
  templateJson?: string;
  templateHtml?: string;
  customTemplateJson?: string;
  customTemplateHtml?: string;
  contentJson?: string;
  contentHtml?: string;
  previewHtml?: string;
  sealIds?: string;
  updateTime?: string;
};

export type InstrumentTaskGroupDetail = {
  debtId?: number | string;
  debtorName?: string;
  debtNumber?: string;
  city?: string;
  organization?: string;
  debtIdCard?: string;
  overdueAmount?: number | string;
  overdueDays?: number | string;
  category?: string;
  displayGroupCode?: string;
  displayGroupName?: string;
  documents?: InstrumentTaskItem[];
};

export type InstrumentTaskQuery = {
  pageNum?: number;
  pageSize?: number;
  category?: string;
  status?: number;
  instrumentCode?: string;
  displayGroupCode?: string;
  debtorName?: string;
  debtNumber?: string;
  city?: string;
  organization?: string;
};

export type InstrumentTaskRunParams = {
  category?: string;
  displayGroupCode?: string;
  debtIds?: Array<number | string>;
  taskIds?: Array<number | string>;
  includeSupplemental?: boolean;
};

export type InstrumentTaskActionResult = {
  batchId?: number | string;
  accepted?: number;
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
    rows?: InstrumentTaskGroupItem[];
  };
  metrics?: InstrumentMetricItem[];
};

export type InstrumentSupplementalPayload = {
  debtId: number | string;
  category: string;
  displayGroupCode: string;
  displayGroupName: string;
  instrumentName: string;
  customTemplateJson: Record<string, unknown>;
  customTemplateHtml: string;
  autoRun?: boolean;
};

export type InstrumentContentPayload = {
  contentJson?: Record<string, unknown>;
  contentHtml?: string;
  customTemplateJson?: Record<string, unknown>;
  customTemplateHtml?: string;
  autoRun?: boolean;
};

export type InstrumentSupplementalResult = {
  taskId?: number | string;
  batchId?: number | string;
  accepted?: number;
};

export type InstrumentEffectiveDocument = {
  taskId?: number | string;
  revisionId?: number | string;
  taskSource?: string;
  instrumentCode?: string;
  instrumentName?: string;
  category?: string;
  displayGroupCode?: string;
  ossId?: number | string;
  publicUrl?: string;
  fileStage?: string;
  status?: number;
  missingReason?: string;
};

export const pageInstrumentTask = (params: InstrumentTaskQuery) =>
  ruoyiRequest<InstrumentTaskPageData>('/system/instrument/task/page', {
    method: 'get',
    params,
  });

export const pageInstrumentTaskDebts = (params: InstrumentTaskQuery) =>
  ruoyiRequest<{
    page?: {
      rows?: InstrumentTaskItem[];
      total?: number;
    };
    rows?: InstrumentTaskItem[];
    total?: number;
  }>('/system/recov/debt/page', {
    method: 'get',
    params,
  });

export const getInstrumentTaskDetail = (taskId: number | string) =>
  ruoyiRequest<InstrumentTaskDetail>(`/system/instrument/task/${taskId}`, {
    method: 'get',
  });

export const getInstrumentTaskGroupDetail = (
  debtId: number | string,
  displayGroupCode: string,
) =>
  ruoyiRequest<InstrumentTaskGroupDetail>(
    `/system/instrument/task/groups/${debtId}/${displayGroupCode}`,
    {
      method: 'get',
    },
  );

export const addSupplementalInstrumentTask = (
  data: InstrumentSupplementalPayload,
) =>
  ruoyiRequest<InstrumentSupplementalResult>(
    '/system/instrument/task/supplemental',
    {
      method: 'post',
      data,
      headers: { repeatSubmit: false },
    },
  );

export const updateInstrumentTaskContent = (
  taskId: number | string,
  data: InstrumentContentPayload,
) =>
  ruoyiRequest(`/system/instrument/task/${taskId}/content`, {
    method: 'put',
    data,
    headers: { repeatSubmit: false },
  });

export const runInstrumentTasks = (data?: InstrumentTaskRunParams) =>
  ruoyiRequest<InstrumentTaskActionResult>('/system/instrument/task/actions/run', {
    method: 'post',
    data,
    headers: { repeatSubmit: false },
  });

export const retryInstrumentTasks = (data?: InstrumentTaskRunParams) =>
  ruoyiRequest<InstrumentTaskActionResult>(
    '/system/instrument/task/actions/retry',
    {
      method: 'post',
      data,
      headers: { repeatSubmit: false },
    },
  );

export const deleteInstrumentTask = (id: number | string) =>
  ruoyiRequest(`/system/instrument/task/${id}`, {
    method: 'delete',
  });

export const queryEffectiveInstrumentDocuments = (params: {
  debtId: number | string;
  category?: string;
  displayGroupCode?: string;
  sealedOnly?: boolean;
}) =>
  ruoyiRequest<InstrumentEffectiveDocument[]>(
    '/system/instrument/documents/effective',
    {
      method: 'get',
      params,
    },
  );

export const listInstrumentCities = () =>
  ruoyiRequest<string[]>('/system/recov/debt/cities', {
    method: 'get',
  });

export const listInstrumentOrganizations = () =>
  ruoyiRequest<string[]>('/system/recov/debt/organizations', {
    method: 'get',
  });
