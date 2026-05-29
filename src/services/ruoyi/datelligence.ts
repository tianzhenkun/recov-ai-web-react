import { ruoyiDownload } from '@/adapters/ruoyi/download';
import { ruoyiRequest } from '@/adapters/ruoyi/request';

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
  debtNumber?: number | string;
  city?: string;
  organization?: string;
};

export type DebtRecordItem = {
  id?: number | string;
  batchId?: number | string;
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
  flowId?: number | string | null;
  flowStartBatchId?: number | string | null;
  flowStartStatus?: number | string | null;
  flowStartErrorMessage?: string | null;
  flowStartTime?: string | null;
  overdueDays?: number | string;
  overdueAmount?: number | string;
  currentStatus?: string;
  currentStatusReason?: string | null;
  createBy?: number | string;
  createTime?: string;
  tenantId?: string;
  updateTime?: string;
  initialPersonaId?: number | string;
};

export type DebtAttachmentItem = {
  ossId?: number | string;
  docType?: string;
  name?: string;
  attPath?: string;
  fileName?: string;
  originalName?: string;
  fileSuffix?: string;
  url?: string;
  fileUrl?: string;
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

export type ImportPipelineStatus =
  | 'importing'
  | 'processing'
  | 'success'
  | 'failed'
  | 'partial_failed'
  | 'partial_success';
export type ImportPipelineSubTaskStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed';

export type SubmitImportTaskData = {
  ossId: string | number;
};

export type ImportPipelineSubTask = {
  type?: 'debtImport' | 'assetParse' | 'personaClassify' | string;
  taskId?: string;
  rootTaskId?: string;
  execTaskId?: string;
  name?: string;
  status?: ImportPipelineSubTaskStatus;
  phase?: string;
  progress?: number;
  total?: number;
  current?: number;
  successCount?: number;
  failedCount?: number;
  unmatchedCount?: number | string;
  unmatchedAttachmentCount?: number | string;
  unmatchedFileCount?: number | string;
  unmatchedTotal?: number | string;
  errorMessage?: string | null;
};

export type ImportPipelineProgressResult = {
  taskId?: string;
  status?: ImportPipelineStatus;
  phase?: string;
  progress?: number;
  total?: number;
  current?: number;
  successCount?: number;
  failedCount?: number;
  errorMessage?: string | null;
  startedAt?: number | string | null;
  finishedAt?: number | string | null;
  subTasks?: ImportPipelineSubTask[];
};

export type ImportFailureStage =
  | 'assetParse'
  | 'assetParseUnmatched'
  | 'personaClassify';

export type ImportFailureDetail = {
  id?: string;
  stage?: ImportFailureStage | string;
  batchId?: string;
  taskId?: string;
  execTaskId?: string;
  debtId?: string;
  debtNumber?: string;
  debtorName?: string;
  city?: string;
  organization?: string;
  name?: string;
  bizType?: string;
  status?: string;
  statusName?: string;
  errorMessage?: string;
  retryCount?: number;
  ossId?: string;
  attPath?: string;
  docType?: string;
  updateTime?: string;
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

export const getCurrentAssetPackagePipelineProgress = () =>
  ruoyiRequest<ImportPipelineProgressResult | null>(
    '/system/recov/debt/import/current',
    {
      method: 'get',
      skipErrorHandler: true,
    },
  );

export const getAssetPackagePipelineProgress = (taskId: string | number) =>
  ruoyiRequest<ImportPipelineProgressResult>(
    `/system/recov/debt/import/tasks/${taskId}/progress`,
    {
      method: 'get',
      skipErrorHandler: true,
    },
  );

export const retryAssetPackagePipelineTask = (
  taskId: string | number,
) =>
  ruoyiRequest<ImportPipelineProgressResult>(
    `/system/recov/debt/import/tasks/${taskId}/retry`,
    {
      method: 'post',
    },
  );

export const ignoreAssetPackagePipelineFailures = (
  taskId: string | number,
) =>
  ruoyiRequest<ImportPipelineProgressResult>(
    `/system/recov/debt/import/tasks/${taskId}/ignore-failures`,
    {
      method: 'post',
    },
  );

export const getAssetParseFailurePage = (
  taskId: string | number,
  params?: PageQuery,
) =>
  ruoyiRequest<ImportFailureDetail>(
    `/system/recov/debt/import/tasks/${taskId}/asset-parse/failures`,
    {
      method: 'get',
      params,
    },
  );

export const getAssetParseUnmatchedPage = (
  taskId: string | number,
  params?: PageQuery,
) =>
  ruoyiRequest<ImportFailureDetail>(
    `/system/recov/debt/import/tasks/${taskId}/asset-parse/unmatched`,
    {
      method: 'get',
      params,
    },
  );

export const getPersonaClassifyFailurePage = (
  taskId: string | number,
  params?: PageQuery,
) =>
  ruoyiRequest<ImportFailureDetail>(
    `/system/recov/debt/import/tasks/${taskId}/persona-classify/failures`,
    {
      method: 'get',
      params,
    },
  );
