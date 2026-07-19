import type {
  LawyerCourtOverviewVO,
  LawyerCourtPageQuery,
  LawyerCourtTab,
  MatchedLawyerRowVO,
  UnmatchedCaseRowVO,
} from '@/services/ruoyi/lawyer-court';
import {
  getLawyerCourtOverview,
  getMatchedLawyerPage,
  getUnmatchedCasePage,
  postLawyerCourtAutoMatch,
  postReplaceLawyer,
  postWithdrawCase,
  unwrapLawyerCourtOverview,
  unwrapMatchedLawyerPage,
  unwrapUnmatchedCasePage,
} from '@/services/ruoyi/lawyer-court';

/** 设为 true 时页面仅使用本地数据，不请求后端接口。 */
export const LAWYER_COURT_USE_LOCAL_DATA = true;

export type LawyerReviewStatus = 1 | 2;

export type ApprovedLawyerCandidate = {
  id: string;
  lawyerName: string;
  lawyerFirm: string;
  lawyerTalent: string;
  lawyerDesc: string;
  applyStatus: number | string;
  applyDesc?: string;
};

export type ApprovedLawyerCandidateQuery = {
  pageNum: number;
  pageSize: number;
  applyStatus?: 2;
  lawyerName?: string;
};

export type LawyerReviewCandidateQuery = {
  pageNum: number;
  pageSize: number;
  applyStatus: LawyerReviewStatus;
  lawyerName?: string;
};

export type ApprovedLawyerCandidatePage = {
  rows: ApprovedLawyerCandidate[];
  total: number;
};

export type LawyerCourtReviewPageQuery = {
  tab: LawyerCourtTab;
  pageNum: number;
  pageSize: number;
};

const MOCK_DELAY = 280;
const LOCAL_REVIEW_PAGE_SIZE = 10;

const withDelay = <T>(value: T, ms: number = MOCK_DELAY): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });

let matchedStore: MatchedLawyerRowVO[] = [];
let unmatchedStore: UnmatchedCaseRowVO[] = [];

export const MOCK_OVERVIEW: LawyerCourtOverviewVO = {
  collaborationCaseCount: 378,
  coveredCityCount: 65,
  matchedCaseCount: 208,
  unmatchedCaseCount: 170,
  totalCaseAmount: '10890000',
  avgCaseAmount: '28810',
};

export const getLawyerCourtMockMatchedRows = () => [...REAL_MATCHED_ROWS];

export const getLawyerCourtMockUnmatchedRows = () => [...REAL_UNMATCHED_ROWS];

const filterRows = <T extends { city?: string; project?: string }>(
  rows: T[],
  query: LawyerCourtPageQuery,
) => {
  let next = [...rows];
  if (query.city) {
    next = next.filter((row) => row.city === query.city);
  }
  if (query.project) {
    next = next.filter((row) => row.project === query.project);
  }
  return next;
};

const paginate = <T>(rows: T[], pageNum: number, pageSize: number) => {
  const start = (pageNum - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    total: rows.length,
  };
};

const REPLACEMENT_LAWYERS: Omit<
  MatchedLawyerRowVO,
  'id' | 'caseNo' | 'ownerName' | 'assetNo' | 'city' | 'project' | 'amount'
>[] = [
  {
    lawyerId: 'L-NEW-1',
    lawyerName: '新匹配律师',
    firm: '协作律师联盟',
    region: '全国',
    rating: 4.8,
    caseCount: 36,
    status: '已匹配',
    bio: '系统重新匹配推荐的代开庭律师。',
    phone: '137****0001',
    email: 'new.lawyer@example.com',
  },
  {
    lawyerId: 'L-NEW-2',
    lawyerName: '备选律师',
    firm: '德和律师事务所',
    region: '华东',
    rating: 4.7,
    caseCount: 58,
    status: '已匹配',
    bio: '备选律师资源，覆盖主要城市代开庭需求。',
    phone: '136****0002',
    email: 'backup.lawyer@example.com',
  },
];

const pickReplacementLawyer = () =>
  REPLACEMENT_LAWYERS[Math.floor(Math.random() * REPLACEMENT_LAWYERS.length)];

export const fetchLawyerCourtOverview =
  async (): Promise<LawyerCourtOverviewVO> => {
    if (LAWYER_COURT_USE_LOCAL_DATA) {
      return withDelay(MOCK_OVERVIEW);
    }
    const response = await getLawyerCourtOverview();
    return unwrapLawyerCourtOverview(response);
  };

export const fetchLawyerCourtPage = async (
  query: LawyerCourtPageQuery,
): Promise<{
  rows: MatchedLawyerRowVO[] | UnmatchedCaseRowVO[];
  total: number;
}> => {
  const pageNum = query.pageNum ?? 1;
  const pageSize = query.pageSize ?? 10;

  if (LAWYER_COURT_USE_LOCAL_DATA) {
    if (query.tab === 'matched') {
      const filtered = filterRows(matchedStore, query);
      return withDelay(paginate(filtered, pageNum, pageSize));
    }
    const filtered = filterRows(unmatchedStore, query);
    return withDelay(paginate(filtered, pageNum, pageSize));
  }

  if (query.tab === 'matched') {
    const response = await getMatchedLawyerPage(query);
    return unwrapMatchedLawyerPage(response);
  }
  const response = await getUnmatchedCasePage(query);
  return unwrapUnmatchedCasePage(response);
};

export const runAutoMatch = async (): Promise<void> => {
  if (LAWYER_COURT_USE_LOCAL_DATA) {
    await withDelay(undefined, 1200);
    if (unmatchedStore.length === 0) return;
    const moved = unmatchedStore.slice(0, Math.min(3, unmatchedStore.length));
    unmatchedStore = unmatchedStore.filter(
      (item) => !moved.some((row) => row.id === item.id),
    );
    for (const item of moved) {
      const lawyer = pickReplacementLawyer();
      matchedStore.unshift({
        id: `M-AUTO-${item.id}`,
        ...lawyer,
        caseNo: item.caseNo,
        ownerName: item.ownerName,
        assetNo: item.assetNo,
        city: item.city,
        project: item.project,
        amount: item.amount,
      });
    }
    return;
  }
  await postLawyerCourtAutoMatch();
};

export const replaceMatchedLawyer = async (id: string): Promise<void> => {
  if (LAWYER_COURT_USE_LOCAL_DATA) {
    await withDelay(undefined);
    const index = matchedStore.findIndex((item) => item.id === id);
    if (index < 0) return;
    const current = matchedStore[index];
    const lawyer = pickReplacementLawyer();
    matchedStore[index] = {
      ...current,
      ...lawyer,
      id: current.id,
      lawyerId: `${lawyer.lawyerId}-${Date.now()}`,
    };
    return;
  }
  await postReplaceLawyer(id);
};

export const withdrawUnmatchedCase = async (id: string): Promise<void> => {
  if (LAWYER_COURT_USE_LOCAL_DATA) {
    await withDelay(undefined);
    unmatchedStore = unmatchedStore.filter((item) => item.id !== id);
    return;
  }
  await postWithdrawCase(id);
};

export const exportUnmatchedCases = (rows: UnmatchedCaseRowVO[]): void => {
  const header = [
    '资产编号',
    '城市',
    '项目',
    '案号',
    '业主姓名',
    '涉案金额',
    '区域',
    '未匹配原因',
  ];
  const lines = rows.map((row) =>
    [
      row.assetNo,
      row.city,
      row.project,
      row.caseNo,
      row.ownerName,
      row.amount,
      row.region,
      row.unmatchReason,
    ].join(','),
  );
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `未匹配案件_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const getCityOptions = () => {
  const cities = new Set(
    [...matchedStore, ...unmatchedStore]
      .map((item) => item.city)
      .filter(Boolean),
  );
  return Array.from(cities).map((city) => ({ label: city, value: city }));
};

export const getProjectOptions = () => {
  const projects = new Set(
    [...matchedStore, ...unmatchedStore]
      .map((item) => item.project)
      .filter(Boolean),
  );
  return Array.from(projects).map((project) => ({
    label: project,
    value: project,
  }));
};

export const resetLawyerCourtMockData = () => {
  matchedStore = [...REAL_MATCHED_ROWS];
  unmatchedStore = [...REAL_UNMATCHED_ROWS];
};

type LocalLawyerReview = {
  id: string;
  lawyerName: string;
  phone?: string | null;
  applyStatus: string;
  lawyerFirm: string;
  lawyerTalent?: string | null;
  lawyerLabel?: string | null;
  lawyerDesc?: string | null;
  applyDesc?: string | null;
  phoneAmount?: string | null;
  contractAmount?: string | null;
  evaluate?: string | null;
  helpedNumber?: number | null;
  lawyerPosition?: string | null;
  email?: string | null;
};

const REAL_LAWYER_REVIEWS: LocalLawyerReview[] = [
  {
    id: '2031998571292590081',
    lawyerName: '张东亚',
    phone: '13916233960',
    applyStatus: '2',
    lawyerFirm: '上海市浩信律师事务所',
    lawyerTalent: '劳动合同，工伤，婚家类',
    lawyerLabel: '劳动合同，工伤待遇申请，婚姻家庭纠纷',
    lawyerDesc:
      '上海市浩信律师事务所专职律师，执业年限超过十五年，擅长处理群体性劳动争议案件，婚姻继承纠纷',
    phoneAmount: '300.00',
    contractAmount: '200.00',
    evaluate: '5.0',
    helpedNumber: 0,
    lawyerPosition: '上海市 上海市',
  },
  {
    id: '2001197810802499585',
    lawyerName: '王照鑫',
    phone: '15621473913',
    applyStatus: '2',
    lawyerFirm: '山东颐衡律师事务所',
    lawyerLabel: '交通事故、劳动纠纷、合同纠纷',
    lawyerDesc:
      '王照鑫，山东颐衡律师事务所，承办上百起交通事故、工伤赔偿等案件，在劳动用工方面积累了丰富的办案经验。',
    phoneAmount: '100.00',
    contractAmount: '20.00',
    evaluate: '5.0',
    helpedNumber: 1,
    lawyerPosition: '山东省 青岛市',
  },
  {
    id: '2015604285722537985',
    lawyerName: '陈靖',
    phone: '13570136678',
    applyStatus: '2',
    lawyerFirm: '广东广信君达律师事务所',
    lawyerTalent: '企业合规、民商事、劳动人事法律领域',
    lawyerDesc:
      '广东广信君达律师事务所专职律师，持有证券从业资格，长期关注企业合规、民商事及劳动人事法律服务。',
    phoneAmount: '300.00',
    contractAmount: '100.00',
    evaluate: '5.0',
    helpedNumber: 0,
    lawyerPosition: '广东省 广州市',
  },
  {
    id: '1998206069795282945',
    lawyerName: '申红博',
    phone: '15800967789',
    applyStatus: '2',
    lawyerFirm: '上海市浩信律师事务所',
    lawyerTalent: '知识产权、数据合规、劳动纠纷、婚姻家事等民商事争议。',
    lawyerLabel: '婚姻家庭、劳动纠纷、知识产权、数据合规',
    lawyerDesc: '多年投融资、法律服务经验。擅长各种民事、商业纠纷。',
    phoneAmount: '60.00',
    contractAmount: '60.00',
    evaluate: '5.0',
    helpedNumber: 3,
    lawyerPosition: '上海市 上海市',
  },
  {
    id: '2016498829938876417',
    lawyerName: '刘红利',
    phone: '18518968743',
    applyStatus: '2',
    lawyerFirm: '北京',
    lawyerDesc: '',
    phoneAmount: '0.10',
    contractAmount: '0.10',
    evaluate: '5.0',
    helpedNumber: 0,
    lawyerPosition: '北京市 北京市',
  },
  {
    id: '1999013109560074241',
    lawyerName: '吕纪林',
    phone: '13818872292',
    applyStatus: '2',
    lawyerFirm: '上海市浩信律师事务所',
    lawyerTalent: '合同法，公司法。',
    lawyerLabel: '擅长合同法，公司法，刑法。',
    lawyerDesc:
      '中共党员，上海律协会员，法律硕士。从事专职律师近20年，具有丰富的律师实务经验。',
    phoneAmount: '50.00',
    contractAmount: '50.00',
    evaluate: '5.0',
    helpedNumber: 0,
    lawyerPosition: '上海市 上海市',
  },
  {
    id: '1998958317106192385',
    lawyerName: '徐同亮',
    phone: '13210534897',
    applyStatus: '2',
    lawyerFirm: '山东敬可成律师事务所',
    lawyerTalent: '行政诉讼，民商事纠纷，工伤劳动',
    lawyerLabel: '行政诉讼，婚姻家事，劳动争议',
    lawyerDesc: '法学硕士，中共党员，三级律师，有多年法律从业经验。',
    phoneAmount: '60.00',
    contractAmount: '5.00',
    evaluate: '5.0',
    helpedNumber: 0,
    lawyerPosition: '山东省 济南市',
  },
  {
    id: '1998224457905037313',
    lawyerName: '苗鑫',
    phone: '15522013299',
    applyStatus: '2',
    lawyerFirm: '上海兰迪（天津）律师事务所',
    lawyerTalent: '民事争议解决',
    lawyerDesc: '擅长处理劳动争议纠纷、合同纠纷、公司法律顾问。',
    phoneAmount: '50.00',
    contractAmount: '100.00',
    evaluate: '5.0',
    helpedNumber: 0,
    lawyerPosition: '天津市 天津市',
  },
  {
    id: '1998947250552528897',
    lawyerName: '韦煜钦',
    phone: '19120642020',
    applyStatus: '2',
    lawyerFirm: '广东锦耀律师事务所',
    lawyerTalent: '民商事诉讼、投融资、跨境涉外、互联网合规',
    lawyerLabel:
      '诉讼仲裁，投融资，企业合规，互联网，出海涉外，国际贸易，英文合同，法律英语',
    lawyerDesc:
      '法律硕士，深圳市涉外律师新锐人才，深耕诉讼仲裁、投融资、企业合规与涉外业务。',
    phoneAmount: '500.00',
    contractAmount: '500.00',
    evaluate: '5.0',
    helpedNumber: 0,
    lawyerPosition: '广东省 深圳市',
  },
  {
    id: '2009651997009838082',
    lawyerName: '田振坤',
    phone: '18210643312',
    applyStatus: '2',
    lawyerFirm: '经师律师事务所',
    lawyerDesc: '',
    phoneAmount: '0.10',
    contractAmount: '0.10',
    evaluate: '5.0',
    helpedNumber: 6,
    lawyerPosition: '北京市 北京市',
  },
  {
    id: '1998290630436806658',
    lawyerName: '杨明春',
    phone: '13666132643',
    applyStatus: '2',
    lawyerFirm: '四川发现律师事务所',
    lawyerTalent: '民商事  公司常年法律顾问 资本市场',
    lawyerDesc: '长期提供民商事、公司常年法律顾问及资本市场相关法律服务。',
    phoneAmount: '99.00',
    contractAmount: '20.00',
    evaluate: '5.0',
    helpedNumber: 0,
    lawyerPosition: '四川省 成都市',
  },
  {
    id: '1998947154393915394',
    lawyerName: '张光尧',
    phone: '18221170977',
    applyStatus: '2',
    lawyerFirm: '上海市浩信律师事务所',
    lawyerTalent: '婚姻家事 合同纠纷',
    lawyerDesc: '擅长婚姻家事、合同纠纷等民商事案件处理。',
    phoneAmount: '100.00',
    contractAmount: '50.00',
    evaluate: '5.0',
    helpedNumber: 0,
    lawyerPosition: '上海市 上海市',
  },
];

const MATCHED_CASE_FIELD_MOCKS = [
  {
    caseNo: '(2026)京0105民初1001号',
    ownerName: '周建国',
    amount: '12500',
    region: '朝阳区',
    assetNo: 'A1-10001',
    city: '北京市',
    project: '恒大名都',
  },
  {
    caseNo: '(2026)沪0115民初1002号',
    ownerName: '林晓燕',
    amount: '15600',
    region: '浦东新区',
    assetNo: 'A1-10002',
    city: '上海市',
    project: '金地格林',
  },
  {
    caseNo: '(2026)粤0304民初1003号',
    ownerName: '陈志强',
    amount: '9200',
    region: '福田区',
    assetNo: 'A1-10003',
    city: '深圳市',
    project: '阳光城小区',
  },
  {
    caseNo: '(2026)粤0106民初1004号',
    ownerName: '黄丽萍',
    amount: '18300',
    region: '天河区',
    assetNo: 'A1-10004',
    city: '广州市',
    project: '月亮湾公寓',
  },
  {
    caseNo: '(2026)川0107民初1005号',
    ownerName: '何文华',
    amount: '12800',
    region: '武侯区',
    assetNo: 'A1-10005',
    city: '成都市',
    project: '保利花园',
  },
];

const UNMATCHED_CASE_FIELD_MOCKS = [
  {
    caseNo: '(2026)京0105民初2001号',
    ownerName: '沈秀兰',
    amount: '8900',
    region: '朝阳区',
    assetNo: 'A1-20001',
    city: '北京市',
    project: '万科翡翠',
  },
  {
    caseNo: '(2026)京0108民初2002号',
    ownerName: '高玉梅',
    amount: '15000',
    region: '海淀区',
    assetNo: 'A1-20002',
    city: '北京市',
    project: '恒大名都',
  },
  {
    caseNo: '(2026)沪0115民初2003号',
    ownerName: '梁志远',
    amount: '22000',
    region: '浦东新区',
    assetNo: 'A1-20003',
    city: '上海市',
    project: '世茂滨江',
  },
  {
    caseNo: '(2026)粤0304民初2004号',
    ownerName: '罗桂英',
    amount: '5500',
    region: '福田区',
    assetNo: 'A1-20004',
    city: '深圳市',
    project: '华为荔枝园',
  },
  {
    caseNo: '(2026)粤0106民初2005号',
    ownerName: '许海峰',
    amount: '11000',
    region: '天河区',
    assetNo: 'A1-20005',
    city: '广州市',
    project: '中海花城湾',
  },
];

const getAbsoluteIndex = (pageNum: number, pageSize: number, index: number) =>
  (Math.max(pageNum, 1) - 1) * pageSize + index;

const pickMockFields = <T>(rows: T[], absoluteIndex: number): T =>
  rows[absoluteIndex % rows.length];

const parseLawyerPosition = (position?: string | null) => {
  const parts = (position || '').split(/\s+/).filter(Boolean);
  return {
    province: parts[0] || '',
    city: parts[1] || parts[0] || '',
  };
};

const getLawyerTalentText = (item: LocalLawyerReview) =>
  item.lawyerTalent || item.lawyerLabel || '民商事诉讼、合同纠纷';

const toApprovedLawyerCandidate = (
  item: LocalLawyerReview,
  applyStatus: LawyerReviewStatus,
): ApprovedLawyerCandidate => ({
  id: item.id,
  lawyerName: item.lawyerName,
  lawyerFirm: item.lawyerFirm || '-',
  lawyerTalent: getLawyerTalentText(item),
  lawyerDesc: item.lawyerDesc || getLawyerTalentText(item),
  applyStatus,
  applyDesc: item.applyDesc || '',
});

const mapLocalLawyerToMatchedRow = (
  item: LocalLawyerReview,
  index: number,
  pageNum: number,
  pageSize: number,
): MatchedLawyerRowVO => {
  const absoluteIndex = getAbsoluteIndex(pageNum, pageSize, index);
  const mock = pickMockFields(MATCHED_CASE_FIELD_MOCKS, absoluteIndex);
  const position = parseLawyerPosition(item.lawyerPosition);
  return {
    id: `matched-${item.id}`,
    lawyerId: item.id,
    lawyerName: item.lawyerName,
    firm: item.lawyerFirm || '-',
    rating: Number(item.evaluate || 4.8),
    caseCount: Number(item.helpedNumber || 0),
    status: '已匹配',
    bio: item.lawyerDesc || getLawyerTalentText(item),
    phone: item.phone || '-',
    email: item.email || '-',
    ...mock,
    city: position.city || mock.city,
    region: position.province || mock.region,
  };
};

const mapLocalLawyerToUnmatchedRow = (
  item: LocalLawyerReview,
  index: number,
  pageNum: number,
  pageSize: number,
): UnmatchedCaseRowVO => {
  const absoluteIndex = getAbsoluteIndex(pageNum, pageSize, index);
  const mock = pickMockFields(UNMATCHED_CASE_FIELD_MOCKS, absoluteIndex);
  const position = parseLawyerPosition(item.lawyerPosition);
  return {
    id: `unmatched-${item.id}`,
    ...mock,
    city: position.city || mock.city,
    region: position.province || mock.region,
    unmatchReason:
      item.applyDesc ||
      `待匹配律师：${item.lawyerName}，接口未返回案件匹配结果，暂以 mock 案件补齐`,
  };
};

const REAL_MATCHED_REVIEWS = REAL_LAWYER_REVIEWS.slice(0, 8);
const REAL_UNMATCHED_REVIEWS = REAL_LAWYER_REVIEWS.slice(8, 12);

const REAL_MATCHED_ROWS = REAL_MATCHED_REVIEWS.map((item, index) =>
  mapLocalLawyerToMatchedRow(item, index, 1, LOCAL_REVIEW_PAGE_SIZE),
);

const REAL_UNMATCHED_ROWS = REAL_UNMATCHED_REVIEWS.map((item, index) =>
  mapLocalLawyerToUnmatchedRow(item, index, 1, LOCAL_REVIEW_PAGE_SIZE),
);

matchedStore = [...REAL_MATCHED_ROWS];
unmatchedStore = [...REAL_UNMATCHED_ROWS];

export const fetchLawyerReviewCandidates = async (
  query: LawyerReviewCandidateQuery,
): Promise<ApprovedLawyerCandidatePage> => {
  const lawyerName = query.lawyerName?.trim();
  const source =
    query.applyStatus === 1 ? REAL_UNMATCHED_REVIEWS : REAL_MATCHED_REVIEWS;
  const filtered = lawyerName
    ? source.filter((item) => item.lawyerName.includes(lawyerName))
    : source;
  const page = paginate(
    filtered.map((item) => toApprovedLawyerCandidate(item, query.applyStatus)),
    query.pageNum,
    query.pageSize,
  );

  return withDelay(page, 120);
};

export const fetchApprovedLawyerCandidates = async (
  query: ApprovedLawyerCandidateQuery,
): Promise<ApprovedLawyerCandidatePage> => {
  return fetchLawyerReviewCandidates({
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    applyStatus: 2,
    lawyerName: query.lawyerName,
  });
};

export const fetchLawyerCourtReviewPage = async (
  query: LawyerCourtReviewPageQuery,
): Promise<{
  rows: MatchedLawyerRowVO[] | UnmatchedCaseRowVO[];
  total: number;
}> => {
  const source =
    query.tab === 'matched' ? REAL_MATCHED_REVIEWS : REAL_UNMATCHED_REVIEWS;
  const page = paginate(source, query.pageNum, query.pageSize);

  const result = {
    rows:
      query.tab === 'matched'
        ? page.rows.map((item, index) =>
            mapLocalLawyerToMatchedRow(
              item,
              index,
              query.pageNum,
              query.pageSize,
            ),
          )
        : page.rows.map((item, index) =>
            mapLocalLawyerToUnmatchedRow(
              item,
              index,
              query.pageNum,
              query.pageSize,
            ),
          ),
    total: page.total,
  };

  return withDelay(result, 120);
};
