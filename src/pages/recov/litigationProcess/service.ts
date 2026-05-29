import {
  getLitigationNodeStats,
  getLitigationOverview,
  getLitigationPage,
  type LitigationNodeStatVO,
  type LitigationNodeType,
  type LitigationOverviewVO,
  type LitigationPageQuery,
  type LitigationRowVO,
  unwrapLitigationNodeStats,
  unwrapLitigationOverview,
  unwrapLitigationPage,
} from '@/services/ruoyi/litigation-process';

import {
  type DisplayRow,
  parseFeeResult,
  parseLitigationResult,
} from './_shared';

/** 设为 true 时页面仅使用本地数据，不请求后端接口。 */

export const LITIGATION_USE_LOCAL_DATA = false;

export type { LitigationNodeStatVO, LitigationNodeType, LitigationOverviewVO };

export type LitigationListQuery = LitigationPageQuery;

const MOCK_DELAY = 280;

const withDelay = <T>(value: T, ms: number = MOCK_DELAY): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });

export const MOCK_NODE_STATS: LitigationNodeStatVO[] = [
  { nodeType: 'MATERIAL_SUBMIT', nodeDesc: '材料提交', count: 3 },

  { nodeType: 'PRE_MEDIATION', nodeDesc: '诉前调解', count: 0 },

  { nodeType: 'WAITING_FILING', nodeDesc: '等待立案', count: 0 },

  { nodeType: 'FILED', nodeDesc: '已立案', count: 0 },

  { nodeType: 'FEE_MANAGEMENT', nodeDesc: '缴费管理', count: 1 },

  { nodeType: 'COURT_MEDIATION', nodeDesc: '法院调解', count: 0 },

  { nodeType: 'WAITING_HEARING', nodeDesc: '待开庭', count: 0 },

  { nodeType: 'HEARING_DONE', nodeDesc: '已开庭', count: 0 },

  { nodeType: 'WAITING_VERDICT', nodeDesc: '待判决', count: 0 },

  { nodeType: 'VERDICT_DONE', nodeDesc: '已判决', count: 0 },

  { nodeType: 'APPLY_ENFORCEMENT', nodeDesc: '申请强执', count: 0 },

  { nodeType: 'ENFORCING', nodeDesc: '执行中', count: 0 },
];

const MOCK_OVERVIEW_BY_NODE: Record<LitigationNodeType, LitigationOverviewVO> =
  {
    MATERIAL_SUBMIT: {
      totalCount: 3,

      materialSubmittedCount: 0,

      courtAcceptedCount: 0,

      nodeDebtAmount: '4388.20',

      nodeRepaymentAmount: '0',
    },

    PRE_MEDIATION: {
      totalCount: 2,

      materialSubmittedCount: 2,

      courtAcceptedCount: 0,

      nodeDebtAmount: '4388.20',

      nodeRepaymentAmount: '0',
    },

    WAITING_FILING: {
      totalCount: 2,

      materialSubmittedCount: 2,

      courtAcceptedCount: 0,

      nodeDebtAmount: '4388.20',

      nodeRepaymentAmount: '0',
    },

    FILED: {
      totalCount: 2,

      materialSubmittedCount: 2,

      courtAcceptedCount: 1,

      nodeDebtAmount: '4388.20',

      nodeRepaymentAmount: '0',
    },

    FEE_MANAGEMENT: {
      totalCount: 2,

      materialSubmittedCount: 2,

      courtAcceptedCount: 1,

      nodeDebtAmount: '4388.20',

      nodeRepaymentAmount: '0',
    },

    COURT_MEDIATION: {
      totalCount: 2,

      materialSubmittedCount: 2,

      courtAcceptedCount: 1,

      nodeDebtAmount: '4388.20',

      nodeRepaymentAmount: '0',
    },

    WAITING_HEARING: {
      totalCount: 2,

      materialSubmittedCount: 2,

      courtAcceptedCount: 2,

      nodeDebtAmount: '4388.20',

      nodeRepaymentAmount: '0',
    },

    HEARING_DONE: {
      totalCount: 2,

      materialSubmittedCount: 2,

      courtAcceptedCount: 2,

      nodeDebtAmount: '4388.20',

      nodeRepaymentAmount: '0',
    },

    WAITING_VERDICT: {
      totalCount: 2,

      materialSubmittedCount: 2,

      courtAcceptedCount: 2,

      nodeDebtAmount: '4388.20',

      nodeRepaymentAmount: '0',
    },

    VERDICT_DONE: {
      totalCount: 2,

      materialSubmittedCount: 2,

      courtAcceptedCount: 2,

      nodeDebtAmount: '4388.20',

      nodeRepaymentAmount: '0',
    },

    APPLY_ENFORCEMENT: {
      totalCount: 2,

      materialSubmittedCount: 2,

      courtAcceptedCount: 2,

      nodeDebtAmount: '4388.20',

      nodeRepaymentAmount: '0',
    },

    ENFORCING: {
      totalCount: 2,

      materialSubmittedCount: 2,

      courtAcceptedCount: 2,

      nodeDebtAmount: '4388.20',

      nodeRepaymentAmount: '0',
    },
  };

const MOCK_ROWS_BY_NODE: Partial<
  Record<LitigationNodeType, LitigationRowVO[]>
> = {
  MATERIAL_SUBMIT: [
    {
      id: '2057123005109211137',

      debtNumber: 8212,

      city: '上海市',

      organization: '阳光花园一期',

      debtorName: '测试业主张三',

      debtAmount: '1200.00',

      overdueAmount: '36.00',

      overdueDays: 503,

      courtName: null,

      caseNo: null,

      status: '0',

      failReason: null,

      result: null,
    },

    {
      id: '2057117313463869442',

      debtNumber: 8214,

      city: '上海市',

      organization: '阳光花园一期',

      debtorName: '测试业主王五',

      debtAmount: '3188.20',

      overdueAmount: '120.00',

      overdueDays: 138,

      courtName: null,

      caseNo: null,

      status: '0',

      failReason: null,

      result: null,
    },

    {
      id: '2057117313463869443',

      debtNumber: 8215,

      city: '深圳市',

      organization: '金地格林',

      debtorName: '李女士',

      debtAmount: '2680.00',

      overdueAmount: '80.00',

      overdueDays: 95,

      courtName: null,

      caseNo: null,

      status: '1',

      failReason: null,

      result: null,
    },
  ],

  FEE_MANAGEMENT: [
    {
      id: '2057123005109211138',

      debtNumber: 8212,

      city: '上海市',

      organization: '阳光花园一期',

      debtorName: '测试业主张三',

      debtAmount: '1200.00',

      overdueAmount: '36.00',

      overdueDays: 503,

      courtName: '上海市浦东新区人民法院',

      caseNo: '(2026)沪0115民初12345号',

      status: '1',

      failReason: null,

      result: JSON.stringify({
        paymentDeadline: '2026-06-15',

        paymentAmount: '580.00',

        remainingDays: 12,

        warningMessage: null,

        paid: false,
      }),
    },
  ],

  FILED: [
    {
      id: '2057123005109211139',

      debtNumber: 8212,

      city: '上海市',

      organization: '阳光花园一期',

      debtorName: '测试业主张三',

      debtAmount: '1200.00',

      overdueAmount: '36.00',

      overdueDays: 503,

      courtName: '上海市浦东新区人民法院',

      caseNo: '(2026)沪0115民初12345号',

      status: '2',

      failReason: null,

      result: null,
    },
  ],
};

const filterRows = (
  rows: LitigationRowVO[],

  query: LitigationPageQuery,
): LitigationRowVO[] =>
  rows.filter((row) => {
    if (
      query.debtNumber &&
      !String(row.debtNumber ?? '').includes(String(query.debtNumber))
    ) {
      return false;
    }

    if (query.city && row.city !== query.city) return false;

    if (query.organization && row.organization !== query.organization) {
      return false;
    }

    return true;
  });

const paginateRows = (
  rows: LitigationRowVO[],

  pageNum: number,

  pageSize: number,
) => {
  const start = (pageNum - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),

    total: rows.length,
  };
};

const toDisplayRows = (
  rows: LitigationRowVO[],

  nodeType: LitigationNodeType,
): DisplayRow[] =>
  rows.map((row) => ({
    ...row,

    _result: parseLitigationResult(row.result),

    _fee:
      nodeType === 'FEE_MANAGEMENT' ? parseFeeResult(row.result) : undefined,
  }));

const fetchLitigationNodeStatsLocal = (): Promise<LitigationNodeStatVO[]> =>
  withDelay(MOCK_NODE_STATS);

const fetchLitigationOverviewLocal = (
  nodeType: LitigationNodeType,
): Promise<LitigationOverviewVO> =>
  withDelay(
    MOCK_OVERVIEW_BY_NODE[nodeType] ?? MOCK_OVERVIEW_BY_NODE.MATERIAL_SUBMIT,
  );

const fetchLitigationPageLocal = (
  query: LitigationPageQuery,
): Promise<{ rows: DisplayRow[]; total: number }> => {
  const source = MOCK_ROWS_BY_NODE[query.nodeType] ?? [];

  const filtered = filterRows(source, query);

  const page = paginateRows(
    filtered,

    query.pageNum ?? 1,

    query.pageSize ?? 10,
  );

  return withDelay({
    rows: toDisplayRows(page.rows, query.nodeType),

    total: page.total,
  });
};

const fetchLitigationNodeStatsFromApi = async (): Promise<
  LitigationNodeStatVO[]
> => unwrapLitigationNodeStats(await getLitigationNodeStats());

const fetchLitigationOverviewFromApi = async (
  nodeType: LitigationNodeType,
): Promise<LitigationOverviewVO> =>
  unwrapLitigationOverview(await getLitigationOverview(nodeType));

const fetchLitigationPageFromApi = async (
  query: LitigationPageQuery,
): Promise<{ rows: DisplayRow[]; total: number }> => {
  const page = unwrapLitigationPage(await getLitigationPage(query));

  return {
    rows: page.rows.map((row) => ({
      ...row,

      _result: parseLitigationResult(row.result),

      _fee:
        query.nodeType === 'FEE_MANAGEMENT'
          ? parseFeeResult(row.result)
          : undefined,
    })),

    total: page.total,
  };
};

export const fetchLitigationNodeStats = (): Promise<LitigationNodeStatVO[]> =>
  LITIGATION_USE_LOCAL_DATA
    ? fetchLitigationNodeStatsLocal()
    : fetchLitigationNodeStatsFromApi();

export const fetchLitigationOverview = (
  nodeType: LitigationNodeType,
): Promise<LitigationOverviewVO> =>
  LITIGATION_USE_LOCAL_DATA
    ? fetchLitigationOverviewLocal(nodeType)
    : fetchLitigationOverviewFromApi(nodeType);

export const fetchLitigationPage = (
  query: LitigationPageQuery,
): Promise<{ rows: DisplayRow[]; total: number }> =>
  LITIGATION_USE_LOCAL_DATA
    ? fetchLitigationPageLocal(query)
    : fetchLitigationPageFromApi(query);
