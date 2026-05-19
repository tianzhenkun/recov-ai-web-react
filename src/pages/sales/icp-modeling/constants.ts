import type {
  CustomDimension,
  IcpFormState,
  SectionConfig,
  SectionKey,
} from './data.d';

export type IcpQuickTemplate = {
  id: string;
  label: string;
  template: string;
};

export const ICP_QUICK_TEMPLATES: IcpQuickTemplate[] = [
  {
    id: 'manufacturing',
    label: '制造业经销商',
    template:
      '寻找中国华东地区年营收 5000 万以上的制造业经销商，主营工业自动化设备，具备稳定渠道与售后服务能力。',
  },
  {
    id: 'cross-border',
    label: '跨境电商',
    template:
      '面向欧美市场的跨境电商卖家，主营消费电子品类，具备独立站运营经验，月 GMV 超过 50 万美元。',
  },
  {
    id: 'saas-b2b',
    label: 'SaaS B2B',
    template:
      '寻找 50-200 人规模的 B2B SaaS 企业，决策人为销售 VP 或 CRO，有明确的销售自动化采购预算。',
  },
  {
    id: 'new-energy',
    label: '新能源',
    template:
      '聚焦新能源产业链上游材料供应商，具备出口资质，年产能稳定，正在拓展海外经销商网络。',
  },
  {
    id: 'high-growth',
    label: '高成长企业',
    template:
      '近 3 年员工规模增长超过 50% 的科技型企业，融资轮次 B 轮及以上，有出海业务拓展计划。',
  },
  {
    id: 'brand-agent',
    label: '品牌代理商',
    template:
      '一线消费品牌的省级独家代理商，覆盖连锁零售渠道，具备成熟的终端铺货与促销团队。',
  },
];

export const DOMESTIC_REGIONS = [
  '北京',
  '上海',
  '天津',
  '重庆',
  '河北',
  '山西',
  '辽宁',
  '吉林',
  '黑龙江',
  '江苏',
  '浙江',
  '安徽',
  '福建',
  '江西',
  '山东',
  '河南',
  '湖北',
  '湖南',
  '广东',
  '海南',
  '四川',
  '贵州',
  '云南',
  '陕西',
  '甘肃',
  '青海',
  '台湾',
  '内蒙古',
  '广西',
  '西藏',
  '宁夏',
  '新疆',
  '香港',
  '澳门',
];

export const FOREIGN_REGIONS = [
  '美国',
  '英国',
  '法国',
  '德国',
  '日本',
  '韩国',
  '加拿大',
  '澳大利亚',
  '新加坡',
  '越南',
  '泰国',
  '马来西亚',
  '印度',
  '巴西',
  '俄罗斯',
  '墨西哥',
  '意大利',
  '西班牙',
  '荷兰',
  '瑞士',
  '瑞典',
  '挪威',
  '丹麦',
  '芬兰',
  '阿联酋',
  '沙特',
  '南非',
  '埃及',
  '土耳其',
  '菲律宾',
  '印度尼西亚',
  '希腊',
  '葡萄牙',
  '比利时',
  '波兰',
  '捷克',
  '匈牙利',
  '奥地利',
  '爱尔兰',
  '以色列',
];

export const REGION_TYPE_OPTIONS = [
  { label: '国内', value: 'domestic' as const },
  { label: '国外', value: 'foreign' as const },
];

export const INITIAL_FORM_STATE: IcpFormState = {
  regionType: 'domestic',
  regionValues: ['上海'],
  industry: '通用行业',
  companyScale: '',
  yearsEstablished: '',
  companyType: '',
  mainProducts: '',
  salesModel: '',
  painPoints: '',
  isCrossBorder: '',
  crossBorderSignal: '',
  revenueSize: '',
  revenueGrowth: '',
  employeeGrowth: '',
  budgetPossibility: '',
  ticketSizeMatch: '',
  payingAbilityScore: '',
  purchaseHistory: '',
  teams: '',
  recentRecruitment: '',
  newLaunch: '',
  tradeShow: '',
  news: '',
  adSigns: '',
  competitorSimilarity: '',
  partnerRecruitment: '',
  decisionMaker: '',
  decisionMakerDept: '',
  influencer: '',
  recentPosts: '',
  reachability: '',
  negDecisionMaker: '',
  negInfluencer: '',
  negUserRole: '',
  negRecentPosts: '',
  negReachability: '',
  negLayoffs: '',
  negAbnormal: '',
  negNonProfit: '',
};

export const SECTION_CONFIGS: SectionConfig[] = [
  {
    key: 'base',
    title: '一、公司基础画像',
    fields: [
      { enabledKey: 'region', label: '采集区域', kind: 'regionType' },
      {
        enabledKey: 'target',
        label: '区域目标',
        kind: 'regionValues',
        placeholder: '请选择区域目标',
      },
      {
        enabledKey: 'industry',
        label: '行业/细分赛道',
        formKey: 'industry',
        placeholder: '通用行业',
      },
      {
        enabledKey: 'scale',
        label: '员工规模',
        formKey: 'companyScale',
        placeholder: '例如：100-500人...',
      },
      {
        enabledKey: 'years',
        label: '成立年限',
        formKey: 'yearsEstablished',
        placeholder: '请输入成立年限',
      },
      {
        enabledKey: 'type',
        label: '公司类型',
        formKey: 'companyType',
        placeholder: '例如：品牌商、制造商、批发商、零售商等',
      },
    ],
  },
  {
    key: 'match',
    title: '二、业务匹配度',
    fields: [
      {
        enabledKey: 'product',
        label: '主营产品/服务',
        formKey: 'mainProducts',
        placeholder: '请输入主营产品/服务',
      },
      {
        enabledKey: 'salesMode',
        label: '销售模式',
        formKey: 'salesModel',
        placeholder: '例如：直销、代理商、经销商、电商...',
      },
      {
        enabledKey: 'pain',
        label: '当前业务痛点推测',
        formKey: 'painPoints',
        placeholder: '请输入业务痛点',
      },
      {
        enabledKey: 'cross',
        label: '是否跨境经营',
        formKey: 'isCrossBorder',
        placeholder: '请输入是否跨境经营',
      },
      {
        enabledKey: 'signal',
        label: '是否有跨境业务信号',
        formKey: 'crossBorderSignal',
        placeholder: '请输入跨境业务信号',
      },
    ],
  },
  {
    key: 'value',
    title: '三、购买能力与商业价值',
    fields: [
      {
        enabledKey: 'revenue',
        label: '收入规模',
        formKey: 'revenueSize',
        placeholder: '请输入收入规模',
      },
      {
        enabledKey: 'revGrowth',
        label: '收入规模增长趋势',
        formKey: 'revenueGrowth',
        placeholder: '请输入增长趋势',
      },
      {
        enabledKey: 'empGrowth',
        label: '员工规模增长趋势',
        formKey: 'employeeGrowth',
        placeholder: '请输入增长趋势',
      },
      {
        enabledKey: 'budget',
        label: '采购预算可能性',
        formKey: 'budgetPossibility',
        placeholder: '请输入采购预算可能性',
      },
      {
        enabledKey: 'ticket',
        label: '客单价匹配度',
        formKey: 'ticketSizeMatch',
        placeholder: '请输入客单价匹配度',
      },
      {
        enabledKey: 'pay',
        label: '付费能力评分',
        formKey: 'payingAbilityScore',
        placeholder: '请输入付费能力评分',
      },
    ],
  },
  {
    key: 'intent',
    title: '四、购买意图信号',
    fields: [
      {
        enabledKey: 'history',
        label: '是否已有类似采购记录',
        formKey: 'purchaseHistory',
        placeholder: '请输入采购记录',
      },
      {
        enabledKey: 'teams',
        label: '是否有海外市场或销售团队',
        formKey: 'teams',
        placeholder: '请输入海外市场/销售团队',
      },
      {
        enabledKey: 'hiring',
        label: '最近招聘趋势',
        formKey: 'recentRecruitment',
        placeholder: '请输入招聘趋势',
      },
      {
        enabledKey: 'launch',
        label: '新市场发布、新产品发布',
        formKey: 'newLaunch',
        placeholder: '请输入发布信息',
      },
      {
        enabledKey: 'show',
        label: '参加海外展会',
        formKey: 'tradeShow',
        placeholder: '请输入展会信息',
      },
      {
        enabledKey: 'news',
        label: '融资、并购、扩张新闻',
        formKey: 'news',
        placeholder: '请输入相关新闻',
      },
      {
        enabledKey: 'ads',
        label: '广告投放迹象',
        formKey: 'adSigns',
        placeholder: '请输入广告投放迹象',
      },
      {
        enabledKey: 'sim',
        label: '竞品相似性',
        formKey: 'competitorSimilarity',
        placeholder: '请输入竞品相似性',
      },
      {
        enabledKey: 'partner',
        label: '采购或合作伙伴招募信息',
        formKey: 'partnerRecruitment',
        placeholder: '请输入招募信息',
      },
    ],
  },
  {
    key: 'persona',
    title: '五、联系人决策链',
    fields: [
      {
        enabledKey: 'dm',
        label: '决策人职位',
        formKey: 'decisionMaker',
        placeholder: '请输入决策人职位',
      },
      {
        enabledKey: 'dmDept',
        label: '决策人部门',
        formKey: 'decisionMakerDept',
        placeholder: '请输入决策人部门',
      },
      {
        enabledKey: 'infl',
        label: '影响人职位',
        formKey: 'influencer',
        placeholder: '请输入影响人职位',
      },
      {
        enabledKey: 'posts',
        label: '最近发帖内容',
        formKey: 'recentPosts',
        placeholder: '请输入最近发帖内容',
      },
      {
        enabledKey: 'reach',
        label: '邮箱 / 社媒 等可触达性',
        formKey: 'reachability',
        placeholder: '请输入可触达性',
      },
    ],
  },
  {
    key: 'negative',
    title: '六、负向筛选维度',
    negative: true,
    fields: [
      {
        enabledKey: 'negDm',
        label: '员工规模',
        formKey: 'negDecisionMaker',
        placeholder: '请输入负向员工规模',
      },
      {
        enabledKey: 'negInfl',
        label: '行业/细分赛道',
        formKey: 'negInfluencer',
        placeholder: '请输入负向行业',
      },
      {
        enabledKey: 'negUser',
        label: '收入规模',
        formKey: 'negUserRole',
        placeholder: '请输入负向收入规模',
      },
      {
        enabledKey: 'negPosts',
        label: '预算不足',
        formKey: 'negRecentPosts',
        placeholder: '请输入预算不足',
      },
      {
        enabledKey: 'negReach',
        label: '不可服务地区',
        formKey: 'negReachability',
        placeholder: '请输入不可服务地区',
      },
      {
        enabledKey: 'negLayoffs',
        label: '近期裁员',
        formKey: 'negLayoffs',
        placeholder: '请输入近期裁员',
      },
      {
        enabledKey: 'negAbnormal',
        label: '经营异常',
        formKey: 'negAbnormal',
        placeholder: '请输入经营异常',
      },
      {
        enabledKey: 'negNonProfit',
        label: '非营利组织',
        formKey: 'negNonProfit',
        placeholder: '请输入非营利组织',
      },
    ],
  },
];

const collectEnabledKeys = (sections: SectionConfig[]) => {
  const keys: string[] = [];
  for (const section of sections) {
    for (const field of section.fields) {
      keys.push(field.enabledKey);
    }
  }
  return keys;
};

export const ALL_ENABLED_KEYS = collectEnabledKeys(SECTION_CONFIGS);

export const createInitialEnabled = (): Record<string, boolean> =>
  Object.fromEntries(ALL_ENABLED_KEYS.map((key) => [key, true]));

export const createEmptyCustomDims = (): Record<
  SectionKey,
  CustomDimension[]
> => ({
  base: [],
  match: [],
  value: [],
  intent: [],
  persona: [],
  negative: [],
});
