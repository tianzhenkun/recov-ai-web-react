import {
  querySalesSearchRunPage,
  querySalesTaskPage,
  type SalesSearchRun,
  type SalesTask,
} from '@/services/ruoyi/sales';
import type { SalesDashboardQuery, SalesOverview, SalesTrends } from './data.d';

const monthLabel = (index: number) => `${index + 1}月`;

const createEmptyMonths = () =>
  Array.from({ length: 12 }, (_, index) => ({
    month: monthLabel(index),
    tasks: 0,
    readyTasks: 0,
    runs: 0,
  }));

const isSameYear = (value: string | undefined, year: number) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getFullYear() === year;
};

const monthIndexOf = (value: string | undefined) => {
  if (!value) return -1;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? -1 : date.getMonth();
};

const countTotal = async (params: Parameters<typeof querySalesTaskPage>[0]) => {
  const response = await querySalesTaskPage({
    pageNum: 1,
    pageSize: 1,
    ...params,
  });
  return response.total || 0;
};

export async function getSalesOverview(
  _params: SalesDashboardQuery,
): Promise<{ data: SalesOverview }> {
  const [totalTasks, readyTasks, pendingTasks, searchRunResponse] =
    await Promise.all([
      countTotal({}),
      countTotal({ status: '1' }),
      countTotal({ status: '0' }),
      querySalesSearchRunPage({ pageNum: 1, pageSize: 1 }),
    ]);

  return {
    data: {
      totalTasks,
      readyTasks,
      pendingTasks,
      searchRuns: searchRunResponse.total || 0,
    },
  };
}

export async function getSalesTrends(
  params: SalesDashboardQuery,
): Promise<{ data: SalesTrends }> {
  const [taskResponse, runResponse] = await Promise.all([
    querySalesTaskPage({ pageNum: 1, pageSize: 500 }),
    querySalesSearchRunPage({ pageNum: 1, pageSize: 500 }),
  ]);
  const months = createEmptyMonths();

  const applyTask = (task: SalesTask) => {
    if (!isSameYear(task.createTime, params.year)) return;
    const monthIndex = monthIndexOf(task.createTime);
    if (monthIndex < 0) return;
    months[monthIndex].tasks += 1;
    if (task.canStart || task.status === '1') {
      months[monthIndex].readyTasks += 1;
    }
  };

  const applyRun = (run: SalesSearchRun) => {
    if (!isSameYear(run.createTime, params.year)) return;
    const monthIndex = monthIndexOf(run.createTime);
    if (monthIndex < 0) return;
    months[monthIndex].runs += 1;
  };

  taskResponse.rows?.forEach(applyTask);
  runResponse.rows?.forEach(applyRun);

  return { data: { months } };
}
