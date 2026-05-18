import { request } from '@umijs/max';
import type { SalesDashboardQuery, SalesOverview, SalesTrends } from './data.d';

export async function getSalesOverview(
  params: SalesDashboardQuery,
): Promise<{ data: SalesOverview }> {
  return request('/api/sales/dashboard/overview', { params });
}

export async function getSalesTrends(
  params: SalesDashboardQuery,
): Promise<{ data: SalesTrends }> {
  return request('/api/sales/dashboard/trends', { params });
}
