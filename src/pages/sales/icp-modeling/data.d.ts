export type IcpRegionType = 'domestic' | 'foreign';

export type SectionKey =
  | 'base'
  | 'match'
  | 'value'
  | 'intent'
  | 'persona'
  | 'negative';

export type CustomDimension = {
  id: string;
  name: string;
  value: string;
  enabled: boolean;
};

export type IcpFormState = {
  regionType: IcpRegionType;
  regionValues: string[];
  industry: string;
  companyScale: string;
  yearsEstablished: string;
  companyType: string;
  mainProducts: string;
  salesModel: string;
  painPoints: string;
  isCrossBorder: string;
  crossBorderSignal: string;
  revenueSize: string;
  revenueGrowth: string;
  employeeGrowth: string;
  budgetPossibility: string;
  ticketSizeMatch: string;
  payingAbilityScore: string;
  purchaseHistory: string;
  teams: string;
  recentRecruitment: string;
  newLaunch: string;
  tradeShow: string;
  news: string;
  adSigns: string;
  competitorSimilarity: string;
  partnerRecruitment: string;
  decisionMaker: string;
  decisionMakerDept: string;
  influencer: string;
  recentPosts: string;
  reachability: string;
  negDecisionMaker: string;
  negInfluencer: string;
  negUserRole: string;
  negRecentPosts: string;
  negReachability: string;
  negLayoffs: string;
  negAbnormal: string;
  negNonProfit: string;
};

export type IcpFieldKey = keyof IcpFormState | 'region' | 'target';

export type FixedFieldConfig = {
  enabledKey: string;
  label: string;
  formKey?: keyof IcpFormState;
  placeholder?: string;
  kind?: 'regionType' | 'regionValues' | 'input';
};

export type SectionConfig = {
  key: SectionKey;
  title: string;
  negative?: boolean;
  fields: FixedFieldConfig[];
};

export type IcpModelResult = {
  modelName: string;
  formState: IcpFormState;
  enabled: Record<string, boolean>;
  customDims: Record<SectionKey, CustomDimension[]>;
};
