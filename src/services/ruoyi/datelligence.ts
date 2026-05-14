import { ruoyiDownload } from '@/adapters/ruoyi/download';
import { adminRequest, ruoyiRequest } from '@/adapters/ruoyi/request';

export type PageQuery = {
  pageNum?: number;
  pageSize?: number;
  [key: string]: unknown;
};

export type TableDataInfo<T> = {
  code?: number;
  msg?: string;
  rows?: T[];
  total?: number;
};

export type DebtRecordQuery = PageQuery & {
  city?: string;
  organization?: string;
};

export type DebtRecordItem = {
  id?: number | string;
  debtNumber?: number | string;
  debtAmount?: number | string;
  debtTime?: string;
  debtorName?: string;
  debtorPhone?: string;
  debtorGender?: string;
  debtorAge?: string | number;
  debtor_gender?: string;
  debtor_age?: string | number;
  city?: string;
  organization?: string;
  debtorEmail?: string;
  reminderStatus?: string;
  reminderRemark?: string | null;
  address?: string;
  area?: string;
  unitPrice?: number | string;
  parkingFee?: number | string;
  deadlineTime?: string;
  taskId?: number | string;
  debtIdCard?: string;
  personaId?: number | string;
  overdueDays?: number | string;
  overdueAmount?: number | string;
  currentStatus?: string;
  createBy?: number | string;
  createTime?: string;
  tenantId?: string;
  updateTime?: string;
};

export type DebtAttachmentItem = {
  ossId?: number | string;
  docType?: string;
};

export type DebtRecordDetail = DebtRecordItem & {
  attachments?: DebtAttachmentItem[];
};

export type DebtStats = {
  totalOverdueAmount?: number | string;
  totalDebtorCount?: number | string;
  avgBillAmount?: number | string;
  avgOverdueDays?: number | string;
  projectCount?: number | string;
};

export type DebtPageResult = {
  page?: TableDataInfo<DebtRecordItem>;
  stats?: DebtStats;
};

export type ImportProgressStatus = 'processing' | 'success' | 'failed';

export type SubmitImportTaskData = {
  ossId: string | number;
};

export type SubmitParseTaskData = {
  taskId: string | number;
};

export type TaskProgressResult = {
  progress?: number;
  total?: number;
  current?: number;
  phase?: string;
  status?: ImportProgressStatus;
  errorMsg?: string | null;
};

export type ParseTaskProgressResult = {
  taskId?: string;
  rootTaskId?: string;
  progress?: number;
  phase?: string;
  status?: ImportProgressStatus;
  startTs?: number;
  errorMsg?: string | null;
};

export type StartPersonaClassificationData = {
  taskId: string | number;
  batchSize?: number;
};

export type StartPersonaClassificationResult = {
  taskId?: string;
  inserted?: number;
  status?: ImportProgressStatus;
  backgroundRunning?: boolean;
};

export type PersonaClassificationProgressResult = {
  taskId?: string;
  total?: number;
  pending?: number;
  processing?: number;
  succeeded?: number;
  failed?: number;
  progress?: number;
  percent?: number;
  phase?: string;
  status?: ImportProgressStatus;
  timestamp?: number;
};

export const getDebtRecordPage = (params: DebtRecordQuery) =>
  ruoyiRequest<DebtPageResult>('/system/recov/debt/page', {
    method: 'get',
    params,
  });

export const getDebtRecordDetail = (id: number | string) =>
  ruoyiRequest<DebtRecordDetail>(`/system/recov/debt/${id}`, {
    method: 'get',
  });

export const getDebtCityOptions = () =>
  ruoyiRequest<string[]>('/system/recov/debt/cities', {
    method: 'get',
  });

export const getDebtOrganizationOptions = () =>
  ruoyiRequest<string[]>('/system/recov/debt/organizations', {
    method: 'get',
  });

export const downloadDebtImportTemplate = () =>
  ruoyiDownload(
    '/system/recov/debt/importTemplate',
    {},
    '债务记录导入模板.xlsx',
  );

export const submitAssetPackageImport = (data: SubmitImportTaskData) =>
  ruoyiRequest<string | number>('/system/recov/debt/import', {
    method: 'post',
    data,
  });

export const getAssetPackageTaskStatus = (taskId: string | number) =>
  ruoyiRequest<TaskProgressResult>(
    `/system/recov/debt/import/progress/${taskId}`,
    {
      method: 'get',
    },
  );

export const submitAssetPackageParse = (data: SubmitParseTaskData) =>
  adminRequest<string | number | Record<string, unknown>>(
    '/business/asset-package/parse/submit',
    {
      method: 'post',
      data,
    },
  );

export const getParseTaskProgress = (taskId: string | number) =>
  adminRequest<ParseTaskProgressResult>(
    `/business/asset-package/import/task/${taskId}`,
    {
      method: 'get',
    },
  );

export const startPersonaClassification = (
  data: StartPersonaClassificationData,
) =>
  adminRequest<StartPersonaClassificationResult>(
    '/business/persona/classification/start',
    {
      method: 'post',
      data,
    },
  );

export const getPersonaClassificationProgress = (taskId: string | number) =>
  adminRequest<PersonaClassificationProgressResult>(
    `/business/persona/classification/progress/${taskId}`,
    {
      method: 'get',
    },
  );

export const retryPersonaClassification = (
  data: StartPersonaClassificationData,
) =>
  adminRequest<StartPersonaClassificationResult>(
    '/business/persona/classification/retry',
    {
      method: 'post',
      data,
    },
  );
