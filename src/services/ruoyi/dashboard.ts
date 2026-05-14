import { ruoyiRequest } from '@/adapters/ruoyi/request';

export type DashboardIndicator = {
  totalOverdueAmount?: number | string;
  totalDebtorCount?: number | string;
  avgBillAmount?: number | string;
  avgOverdueDays?: number | string;
  collectionCycle?: number | string;
  totalRecoveredAmount?: number | string;
};

export type AgeDistributionItem = {
  range?: string;
  count?: number | string;
  percentage?: number | string;
};

export type CityDistributionItem = {
  city?: string;
  count?: number | string;
  percentage?: number | string;
};

export type RegionDistributionItem = {
  province?: string;
  provincePercentage?: number | string;
  cities?: CityDistributionItem[];
};

export type DashboardOverview = {
  indicators?: DashboardIndicator;
  ageDistribution?: AgeDistributionItem[];
  regionDistribution?: RegionDistributionItem[];
};

export type RepaymentTrendPoint = {
  day?: number | string;
  label?: string;
  dailyAmount?: number | string;
};

export type RepaymentStatistics = {
  totalRepaidAmount?: number | string;
  totalRepaidCount?: number | string;
  avgRepaidAmount?: number | string;
  maxSingleRepaid?: number | string;
  daysSinceLaunch?: number | string;
};

export type RepaymentTrend = {
  title?: string;
  subtitle?: string;
  trend?: RepaymentTrendPoint[];
  statistics?: RepaymentStatistics;
};

export const getDashboardOverview = () =>
  ruoyiRequest<DashboardOverview>('/system/recov/dashboard/overview', {
    method: 'get',
  });

export const getRepaymentTrend = () =>
  ruoyiRequest<RepaymentTrend>('/system/recov/dashboard/repayment-trend', {
    method: 'get',
  });
