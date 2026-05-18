/** AI 按条件（地区、公司规模等）筛出的经销商数量 */
export type SalesOverview = {
  /** 新增有效线索，整数 */
  newLeads: number;
  /** 线索质量评分，满分 10，保留 1 位小数 */
  leadQualityScore: number;
  /** 正向回复率，[0,1] 浮点 */
  positiveReplyRate: number;
  /** 预计收入 ROI 倍数 */
  estimatedRoi: number;
};

export type SalesTrendMonth = {
  month: string;
  leads: number;
  revenue: number;
  roi: number;
};

export type SalesTrends = {
  months: SalesTrendMonth[];
};

export type SalesDashboardQuery = {
  year: number;
  /** 预留：时间范围筛选 */
  startYear?: number;
  endYear?: number;
};
