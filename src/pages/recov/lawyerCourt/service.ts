import type {
  LawyerCourtOverviewVO,
  LawyerCourtPageQuery,
  MatchedLawyerRowVO,
  UnmatchedCaseRowVO,
} from '@/services/ruoyi/lawyer-court';
import {
  getLawyerCourtOverview,
  getMatchedLawyerPage,
  getUnmatchedCasePage,
  postBlacklistLawyer,
  postLawyerCourtAutoMatch,
  postManualMatch,
  postReplaceLawyer,
  postWithdrawCase,
  unwrapLawyerCourtOverview,
  unwrapMatchedLawyerPage,
  unwrapUnmatchedCasePage,
} from '@/services/ruoyi/lawyer-court';

/** 设为 true 时页面仅使用本地数据，不请求后端接口。 */
export const LAWYER_COURT_USE_LOCAL_DATA = true;

const MOCK_DELAY = 280;

const withDelay = <T>(value: T, ms: number = MOCK_DELAY): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });

const INITIAL_MATCHED: MatchedLawyerRowVO[] = [
  {
    id: 'M-001',
    lawyerId: 'L-001',
    lawyerName: '陈律师',
    firm: '智律法律事务所',
    region: '朝阳区',
    rating: 4.9,
    caseCount: 124,
    status: '已匹配',
    bio: '陈律师拥有超过10年的民商事诉讼经验，擅长物业纠纷与代开庭协作。',
    phone: '138****8888',
    email: 'chen.lawyer@example.com',
    caseNo: '(2026)京0105民初1234号',
    ownerName: '张伟',
    assetNo: 'A1-00004',
    city: '北京市',
    project: '恒大名都',
    amount: '15600',
  },
  {
    id: 'M-002',
    lawyerId: 'L-002',
    lawyerName: '林律师',
    firm: '正义大成律师行',
    region: '海淀区',
    rating: 4.8,
    caseCount: 89,
    status: '已匹配',
    bio: '林律师专注于房地产与建筑工程法律事务。',
    phone: '139****9999',
    email: 'lin.lawyer@example.com',
    caseNo: '(2026)京0108民初5678号',
    ownerName: '李娜',
    assetNo: 'A1-00005',
    city: '杭州市',
    project: '万科城',
    amount: '12400',
  },
  {
    id: 'M-003',
    lawyerId: 'L-003',
    lawyerName: '王律师',
    firm: '智律法律事务所',
    region: '西城区',
    rating: 5,
    caseCount: 210,
    status: '已匹配',
    bio: '王律师是智律事务所合伙人，长期负责批量代开庭协作。',
    phone: '137****7777',
    email: 'wang.lawyer@example.com',
    caseNo: '(2026)京0102民初9012号',
    ownerName: '王五',
    assetNo: 'A1-00003',
    city: '上海市',
    project: '金地格林',
    amount: '8800',
  },
  {
    id: 'M-004',
    lawyerId: 'L-004',
    lawyerName: '张律师',
    firm: '海诚律师事务所',
    region: '福田区',
    rating: 4.7,
    caseCount: 56,
    status: '已匹配',
    bio: '擅长处理物业纠纷与线下开庭协作。',
    phone: '136****5555',
    email: 'zhang.lawyer@example.com',
    caseNo: '(2026)粤0304民初2233号',
    ownerName: '赵铁柱',
    assetNo: 'A1-00006',
    city: '深圳市',
    project: '阳光城小区',
    amount: '9200',
  },
  {
    id: 'M-005',
    lawyerId: 'L-005',
    lawyerName: '李律师',
    firm: '大成律师事务所',
    region: '天河区',
    rating: 4.9,
    caseCount: 132,
    status: '已匹配',
    bio: '资深诉讼律师，熟悉华南区域批量代开庭流程。',
    phone: '135****4444',
    email: 'li.lawyer@example.com',
    caseNo: '(2026)粤0106民初4455号',
    ownerName: '马冬梅',
    assetNo: 'A1-00007',
    city: '广州市',
    project: '月亮湾公寓',
    amount: '18300',
  },
  {
    id: 'M-006',
    lawyerId: 'L-006',
    lawyerName: '刘律师',
    firm: '德恒律师事务所',
    region: '朝阳区',
    rating: 4.6,
    caseCount: 45,
    status: '已匹配',
    bio: '精通民商法，可承接高频代开庭任务。',
    phone: '134****3333',
    email: 'liu.lawyer@example.com',
    caseNo: '(2026)京0105民初7788号',
    ownerName: '孙悟空',
    assetNo: 'A1-00010',
    city: '北京市',
    project: '万科锦程',
    amount: '6700',
  },
  {
    id: 'M-007',
    lawyerId: 'L-007',
    lawyerName: '孙律师',
    firm: '盈科律师事务所',
    region: '福田区',
    rating: 4.8,
    caseCount: 98,
    status: '已匹配',
    bio: '高效办案风格，适合紧急开庭排期。',
    phone: '133****2222',
    email: 'sun.lawyer@example.com',
    caseNo: '(2026)粤0304民初9900号',
    ownerName: '猪八戒',
    assetNo: 'A1-00015',
    city: '深圳市',
    project: '金地格林',
    amount: '11500',
  },
  {
    id: 'M-008',
    lawyerId: 'L-008',
    lawyerName: '周律师',
    firm: '金杜律师事务所',
    region: '天河区',
    rating: 4.7,
    caseCount: 67,
    status: '已匹配',
    bio: '细致周到，擅长复杂案件庭前准备。',
    phone: '132****1111',
    email: 'zhou.lawyer@example.com',
    caseNo: '(2026)粤0106民初1122号',
    ownerName: '沙悟净',
    assetNo: 'A1-00016',
    city: '广州市',
    project: '保利四季',
    amount: '22400',
  },
  {
    id: 'M-009',
    lawyerId: 'L-009',
    lawyerName: '吴律师',
    firm: '君合律师事务所',
    region: '浦东新区',
    rating: 4.9,
    caseCount: 156,
    status: '已匹配',
    bio: '经验丰富，覆盖长三角核心物业项目。',
    phone: '131****0000',
    email: 'wu.lawyer@example.com',
    caseNo: '(2026)沪0115民初3344号',
    ownerName: '唐三藏',
    assetNo: 'A1-00017',
    city: '上海市',
    project: '星河湾别墅',
    amount: '35000',
  },
  {
    id: 'M-010',
    lawyerId: 'L-010',
    lawyerName: '郑律师',
    firm: '中伦律师事务所',
    region: '武侯区',
    rating: 4.8,
    caseCount: 82,
    status: '已匹配',
    bio: '专业负责，熟悉西南区域批量协作。',
    phone: '130****9999',
    email: 'zheng.lawyer@example.com',
    caseNo: '(2026)川0107民初5566号',
    ownerName: '白骨精',
    assetNo: 'A1-00018',
    city: '成都市',
    project: '保利花园',
    amount: '12800',
  },
  {
    id: 'M-011',
    lawyerId: 'L-011',
    lawyerName: '赵律师',
    firm: '锦天城律师事务所',
    region: '静安区',
    rating: 4.8,
    caseCount: 73,
    status: '已匹配',
    bio: '专注物业催收相关诉讼与代开庭协作。',
    phone: '131****8888',
    email: 'zhao.lawyer@example.com',
    caseNo: '(2026)沪0106民初7788号',
    ownerName: '白龙马',
    assetNo: 'A1-00019',
    city: '上海市',
    project: '融创外滩',
    amount: '14200',
  },
];

const INITIAL_UNMATCHED: UnmatchedCaseRowVO[] = [
  {
    id: 'C-001',
    caseNo: '(2026)京0105民初8888号',
    ownerName: '赵六',
    amount: '12500',
    region: '朝阳区',
    unmatchReason: '代开庭费用较低、暂无承接律师',
    assetNo: 'A1-00008',
    city: '北京市',
    project: '恒大华府',
  },
  {
    id: 'C-002',
    caseNo: '(2026)京0108民初9999号',
    ownerName: '钱七',
    amount: '8900',
    region: '海淀区',
    unmatchReason: '其他原因',
    assetNo: 'A1-00009',
    city: '北京市',
    project: '万科翡翠',
  },
  {
    id: 'C-003',
    caseNo: '(2026)京0105民初7777号',
    ownerName: '周八',
    amount: '15000',
    region: '朝阳区',
    unmatchReason: '地域覆盖不足',
    assetNo: 'A1-00011',
    city: '北京市',
    project: '恒大名都',
  },
  {
    id: 'C-004',
    caseNo: '(2026)沪0115民初1122号',
    ownerName: '李九',
    amount: '22000',
    region: '浦东新区',
    unmatchReason: '律师时间冲突',
    assetNo: 'A1-00012',
    city: '上海市',
    project: '世茂滨江',
  },
  {
    id: 'C-005',
    caseNo: '(2026)粤0304民初3344号',
    ownerName: '郑十',
    amount: '5500',
    region: '福田区',
    unmatchReason: '代开庭费用较低',
    assetNo: 'A1-00013',
    city: '深圳市',
    project: '华为荔枝园',
  },
  {
    id: 'C-006',
    caseNo: '(2026)粤0106民初5566号',
    ownerName: '吴十一',
    amount: '11000',
    region: '天河区',
    unmatchReason: '暂无推荐律师',
    assetNo: 'A1-00014',
    city: '广州市',
    project: '中海花城湾',
  },
  {
    id: 'C-007',
    caseNo: '(2026)京0102民初4433号',
    ownerName: '孙十二',
    amount: '9800',
    region: '西城区',
    unmatchReason: '案件复杂度高',
    assetNo: 'A1-00019',
    city: '北京市',
    project: '金融街国际',
  },
  {
    id: 'C-008',
    caseNo: '(2026)沪0110民初2211号',
    ownerName: '刘十三',
    amount: '13500',
    region: '杨浦区',
    unmatchReason: '其他原因',
    assetNo: 'A1-00020',
    city: '上海市',
    project: '创智天地',
  },
  {
    id: 'C-009',
    caseNo: '(2026)粤0305民初6677号',
    ownerName: '陈十四',
    amount: '7200',
    region: '南山区',
    unmatchReason: '代开庭费用较低',
    assetNo: 'A1-00021',
    city: '深圳市',
    project: '华润城',
  },
  {
    id: 'C-010',
    caseNo: '(2026)川0109民初8899号',
    ownerName: '王十五',
    amount: '19000',
    region: '高新区',
    unmatchReason: '地域覆盖不足',
    assetNo: 'A1-00022',
    city: '成都市',
    project: '中德英伦联邦',
  },
];

let matchedStore = [...INITIAL_MATCHED];
let unmatchedStore = [...INITIAL_UNMATCHED];

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

const buildOverview = (): LawyerCourtOverviewVO => ({
  collaborationCaseCount: matchedStore.length + unmatchedStore.length,
  coveredCityCount: new Set(
    [...matchedStore, ...unmatchedStore].map((item) => item.city),
  ).size,
  matchedCaseCount: matchedStore.length,
  unmatchedCaseCount: unmatchedStore.length,
  totalCaseAmount: String(
    [...matchedStore, ...unmatchedStore].reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    ),
  ),
  avgCaseAmount: String(
    Math.round(
      [...matchedStore, ...unmatchedStore].reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      ) / Math.max(matchedStore.length + unmatchedStore.length, 1),
    ),
  ),
});

const MOCK_OVERVIEW: LawyerCourtOverviewVO = buildOverview();

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
      return withDelay(buildOverview());
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

export const blacklistMatchedLawyer = async (id: string): Promise<void> => {
  if (LAWYER_COURT_USE_LOCAL_DATA) {
    await withDelay(undefined);
    matchedStore = matchedStore.filter((item) => item.id !== id);
    return;
  }
  await postBlacklistLawyer(id);
};

export const withdrawUnmatchedCase = async (id: string): Promise<void> => {
  if (LAWYER_COURT_USE_LOCAL_DATA) {
    await withDelay(undefined);
    unmatchedStore = unmatchedStore.filter((item) => item.id !== id);
    return;
  }
  await postWithdrawCase(id);
};

export const manualMatchCase = async (id: string): Promise<void> => {
  if (LAWYER_COURT_USE_LOCAL_DATA) {
    await withDelay(undefined);
    const index = unmatchedStore.findIndex((item) => item.id === id);
    if (index < 0) return;
    const item = unmatchedStore[index];
    unmatchedStore = unmatchedStore.filter((row) => row.id !== id);
    const lawyer = pickReplacementLawyer();
    matchedStore.unshift({
      id: `M-MANUAL-${item.id}`,
      ...lawyer,
      caseNo: item.caseNo,
      ownerName: item.ownerName,
      assetNo: item.assetNo,
      city: item.city,
      project: item.project,
      amount: item.amount,
    });
    return;
  }
  await postManualMatch(id);
};

export const exportUnmatchedCases = (rows: UnmatchedCaseRowVO[]): void => {
  const header = [
    '资产编号',
    '城市',
    '项目',
    '案号',
    '业主',
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
  matchedStore = [...INITIAL_MATCHED];
  unmatchedStore = [...INITIAL_UNMATCHED];
};

export { MOCK_OVERVIEW };
