import { ruoyiRequest } from '@/adapters/ruoyi/request';
import type { RuoyiResponse } from '@/adapters/ruoyi/response';

export type LitigationNodeType =
  | 'MATERIAL_SUBMIT'
  | 'PRE_MEDIATION'
  | 'WAITING_FILING'
  | 'FILED'
  | 'FEE_MANAGEMENT'
  | 'COURT_MEDIATION'
  | 'WAITING_HEARING'
  | 'HEARING_DONE'
  | 'WAITING_VERDICT'
  | 'VERDICT_DONE'
  | 'APPLY_ENFORCEMENT'
  | 'ENFORCING';

/** Backend status codes (varchar string digits). */
export type LitigationStatus = '0' | '1' | '2' | '3' | '4';

export type LitigationOverviewVO = {
  totalCount: number;
  materialSubmittedCount: number;
  courtAcceptedCount: number;
  nodeDebtAmount: string;
  nodeRepaymentAmount: string;
};

export type LitigationNodeStatVO = {
  nodeType: LitigationNodeType;
  nodeDesc: string;
  count: number;
};

export type FeeManagementResult = {
  paymentDeadline: string;
  paymentAmount: string;
  remainingDays: number;
  warningMessage: string | null;
  paid: boolean;
};

export type LitigationRowVO = {
  id: string;
  flowId?: string | number | null;
  debtNumber: number;
  city: string;
  organization: string;
  debtorName: string;
  debtAmount: string;
  overdueAmount: string;
  overdueDays: number;
  courtName: string | null;
  caseNo: string | null;
  status: LitigationStatus;
  failReason: string | null;
  result: string | null;
};

export type LitigationPageQuery = {
  pageNum?: number;
  pageSize?: number;
  nodeType: LitigationNodeType;
  debtNumber?: number | string;
  city?: string;
  organization?: string;
};

export type LitigationPageResult = {
  rows: LitigationRowVO[];
  total: number;
};

export type LitigationFilingMaterialDocumentVO = {
  taskId: string;
  revisionId: string;
  taskSource: string;
  instrumentCode: string;
  instrumentName: string;
  category: string;
  displayGroupCode: string;
  materialType: string;
  status: number | null;
  statusName: string;
  fileStage: string;
  ossId: string;
  publicUrl: string;
  viewable: boolean;
  downloadable: boolean;
  submittable: boolean;
  errorMessage: string;
};

export type LitigationFilingMaterialMissingItemVO = {
  instrumentCode: string;
  instrumentName: string;
  category: string;
  displayGroupCode: string;
  materialType: string;
  reason: string;
};

export type LitigationFilingMaterialsVO = {
  litigationId: string;
  debtId: string;
  debtNumber: number;
  debtorName: string;
  city: string;
  organization: string;
  courtName: string;
  caseNo: string;
  submitReady: boolean;
  summaryMessage: string;
  readyCount: number;
  blockedCount: number;
  missingCount: number;
  documents: LitigationFilingMaterialDocumentVO[];
  missingItems: LitigationFilingMaterialMissingItemVO[];
};

const LITIGATION_NODE_TYPES: LitigationNodeType[] = [
  'MATERIAL_SUBMIT',
  'PRE_MEDIATION',
  'WAITING_FILING',
  'FILED',
  'FEE_MANAGEMENT',
  'COURT_MEDIATION',
  'WAITING_HEARING',
  'HEARING_DONE',
  'WAITING_VERDICT',
  'VERDICT_DONE',
  'APPLY_ENFORCEMENT',
  'ENFORCING',
];

const isLitigationNodeType = (value: string): value is LitigationNodeType =>
  LITIGATION_NODE_TYPES.includes(value as LitigationNodeType);

/** Backend uses lowercase snake_case (e.g. material_submit). */
export const toApiNodeType = (nodeType: LitigationNodeType): string =>
  nodeType.toLowerCase();

/** Normalize API node codes to frontend enum keys (e.g. material_submit → MATERIAL_SUBMIT). */
export const normalizeLitigationNodeType = (
  value: unknown,
): LitigationNodeType | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalized = value.trim().toUpperCase() as LitigationNodeType;
  return isLitigationNodeType(normalized) ? normalized : null;
};

const normalizeLitigationStatus = (value: unknown): LitigationStatus => {
  const raw = String(value ?? '').trim();
  if (raw === '0' || raw === '1' || raw === '2' || raw === '3' || raw === '4') {
    return raw;
  }
  const legacyMap: Record<string, LitigationStatus> = {
    PENDING: '0',
    IN_PROGRESS: '1',
    COMPLETED: '2',
    FAILED: '3',
    SKIPPED: '4',
  };
  return legacyMap[raw.toUpperCase()] ?? '0';
};

const normalizeLitigationNodeStat = (
  item: Partial<LitigationNodeStatVO> & { nodeType?: string },
): LitigationNodeStatVO | null => {
  const nodeType = normalizeLitigationNodeType(item.nodeType);
  if (!nodeType) return null;
  return {
    nodeType,
    nodeDesc: String(item.nodeDesc ?? ''),
    count: Number(item.count ?? 0),
  };
};

const normalizeAmountString = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '0';
  return String(value);
};

const normalizeString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const normalizeIdString = (value: unknown): string => normalizeString(value);

const normalizeBoolean = (value: unknown): boolean =>
  value === true || value === 'true' || value === 1 || value === '1';

const normalizeLitigationRow = (
  row: Partial<LitigationRowVO> & {
    status?: string;
    nodeStatus?: string;
    id?: number | string;
  },
): LitigationRowVO => ({
  id: String(row.id ?? ''),
  flowId: row.flowId ?? null,
  debtNumber: Number(row.debtNumber ?? 0),
  city: String(row.city ?? ''),
  organization: String(row.organization ?? ''),
  debtorName: String(row.debtorName ?? ''),
  debtAmount: normalizeAmountString(row.debtAmount),
  overdueAmount: normalizeAmountString(row.overdueAmount),
  overdueDays: Number(row.overdueDays ?? 0),
  courtName: row.courtName ?? null,
  caseNo: row.caseNo ?? null,
  status: normalizeLitigationStatus(row.status ?? row.nodeStatus),
  failReason: row.failReason ?? null,
  result: row.result ?? null,
});

const normalizeFilingMaterialDocument = (
  document: Partial<LitigationFilingMaterialDocumentVO> & {
    taskId?: number | string | null;
    revisionId?: number | string | null;
    ossId?: number | string | null;
  },
): LitigationFilingMaterialDocumentVO => ({
  taskId: normalizeIdString(document.taskId),
  revisionId: normalizeIdString(document.revisionId),
  taskSource: normalizeString(document.taskSource),
  instrumentCode: normalizeString(document.instrumentCode),
  instrumentName: normalizeString(document.instrumentName),
  category: normalizeString(document.category),
  displayGroupCode: normalizeString(document.displayGroupCode),
  materialType: normalizeString(document.materialType),
  status:
    document.status === null || document.status === undefined
      ? null
      : Number(document.status),
  statusName: normalizeString(document.statusName),
  fileStage: normalizeString(document.fileStage),
  ossId: normalizeIdString(document.ossId),
  publicUrl: normalizeString(document.publicUrl),
  viewable: normalizeBoolean(document.viewable),
  downloadable: normalizeBoolean(document.downloadable),
  submittable: normalizeBoolean(document.submittable),
  errorMessage: normalizeString(document.errorMessage),
});

const normalizeFilingMaterialMissingItem = (
  item: Partial<LitigationFilingMaterialMissingItemVO>,
): LitigationFilingMaterialMissingItemVO => ({
  instrumentCode: normalizeString(item.instrumentCode),
  instrumentName: normalizeString(item.instrumentName),
  category: normalizeString(item.category),
  displayGroupCode: normalizeString(item.displayGroupCode),
  materialType: normalizeString(item.materialType),
  reason: normalizeString(item.reason),
});

export const getLitigationOverview = (nodeType: LitigationNodeType) =>
  ruoyiRequest<LitigationOverviewVO>('/system/recov/litigation/overview', {
    method: 'get',
    params: { nodeType: toApiNodeType(nodeType) },
  });

export const getLitigationNodeStats = () =>
  ruoyiRequest<LitigationNodeStatVO[]>('/system/recov/litigation/stats', {
    method: 'get',
  });

export const getLitigationPage = (params: LitigationPageQuery) =>
  ruoyiRequest<LitigationRowVO>('/system/recov/litigation/page', {
    method: 'get',
    params: {
      pageNum: params.pageNum,
      pageSize: params.pageSize,
      nodeType: toApiNodeType(params.nodeType),
      debtNumber: params.debtNumber,
      city: params.city,
      organization: params.organization,
    },
  });

export const getLitigationFilingMaterials = (litigationId: string | number) =>
  ruoyiRequest<LitigationFilingMaterialsVO>(
    `/system/recov/litigation/${litigationId}/filing-materials`,
    {
      method: 'get',
    },
  );

export const unwrapLitigationOverview = (
  response: RuoyiResponse<LitigationOverviewVO>,
): LitigationOverviewVO => {
  const data = response.data;
  return {
    totalCount: Number(data?.totalCount ?? 0),
    materialSubmittedCount: Number(data?.materialSubmittedCount ?? 0),
    courtAcceptedCount: Number(data?.courtAcceptedCount ?? 0),
    nodeDebtAmount: normalizeAmountString(data?.nodeDebtAmount),
    nodeRepaymentAmount: normalizeAmountString(data?.nodeRepaymentAmount),
  };
};

export const unwrapLitigationNodeStats = (
  response: RuoyiResponse<LitigationNodeStatVO[]>,
): LitigationNodeStatVO[] => {
  const rawRows = Array.isArray(response.data)
    ? response.data
    : Array.isArray(response.rows)
      ? response.rows
      : [];

  return rawRows
    .map((item) =>
      normalizeLitigationNodeStat(
        item as Partial<LitigationNodeStatVO> & { nodeType?: string },
      ),
    )
    .filter((item): item is LitigationNodeStatVO => item !== null);
};

export const unwrapLitigationPage = (
  response: RuoyiResponse<LitigationRowVO>,
): LitigationPageResult => {
  const nested = response.data as
    | { rows?: LitigationRowVO[]; total?: number }
    | LitigationRowVO[]
    | undefined;

  const rawRows =
    nested && !Array.isArray(nested) && Array.isArray(nested.rows)
      ? nested.rows
      : Array.isArray(response.rows)
        ? response.rows
        : Array.isArray(nested)
          ? nested
          : [];

  const total =
    nested && !Array.isArray(nested)
      ? Number(nested.total) || 0
      : Number(response.total) || 0;

  return {
    rows: rawRows.map((row) =>
      normalizeLitigationRow(
        row as Partial<LitigationRowVO> & {
          status?: string;
          nodeStatus?: string;
          id?: number | string;
        },
      ),
    ),
    total,
  };
};

export const unwrapLitigationFilingMaterials = (
  response: RuoyiResponse<unknown>,
): LitigationFilingMaterialsVO => {
  const data = (response.data ?? {}) as Partial<LitigationFilingMaterialsVO>;
  const documents = Array.isArray(data.documents) ? data.documents : [];
  const missingItems = Array.isArray(data.missingItems)
    ? data.missingItems
    : [];

  return {
    litigationId: normalizeIdString(data.litigationId),
    debtId: normalizeIdString(data.debtId),
    debtNumber: Number(data.debtNumber ?? 0),
    debtorName: normalizeString(data.debtorName),
    city: normalizeString(data.city),
    organization: normalizeString(data.organization),
    courtName: normalizeString(data.courtName),
    caseNo: normalizeString(data.caseNo),
    submitReady: normalizeBoolean(data.submitReady),
    summaryMessage: normalizeString(data.summaryMessage),
    readyCount: Number(data.readyCount ?? 0),
    blockedCount: Number(data.blockedCount ?? 0),
    missingCount: Number(data.missingCount ?? 0),
    documents: documents.map((item) =>
      normalizeFilingMaterialDocument(
        item as Partial<LitigationFilingMaterialDocumentVO> & {
          taskId?: number | string | null;
          revisionId?: number | string | null;
          ossId?: number | string | null;
        },
      ),
    ),
    missingItems: missingItems.map((item) =>
      normalizeFilingMaterialMissingItem(
        item as Partial<LitigationFilingMaterialMissingItemVO>,
      ),
    ),
  };
};
