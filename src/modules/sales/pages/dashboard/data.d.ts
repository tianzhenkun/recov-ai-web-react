export type SalesOverview = {
  totalTasks: number;
  readyTasks: number;
  pendingTasks: number;
  searchRuns: number;
};

export type SalesTrendMonth = {
  month: string;
  tasks: number;
  readyTasks: number;
  runs: number;
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
