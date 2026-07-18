import type { Request, Response } from 'express';
import type { SalesOverview, SalesTrendMonth } from './data.d';

const DEFAULT_YEAR = 2026;

const BASE_TASK_TREND: SalesTrendMonth[] = [
  { month: '1月', tasks: 12, readyTasks: 8, runs: 3 },
  { month: '2月', tasks: 14, readyTasks: 9, runs: 4 },
  { month: '3月', tasks: 16, readyTasks: 12, runs: 6 },
  { month: '4月', tasks: 15, readyTasks: 11, runs: 5 },
  { month: '5月', tasks: 19, readyTasks: 15, runs: 8 },
  { month: '6月', tasks: 21, readyTasks: 16, runs: 9 },
  { month: '7月', tasks: 24, readyTasks: 18, runs: 11 },
  { month: '8月', tasks: 23, readyTasks: 17, runs: 10 },
  { month: '9月', tasks: 27, readyTasks: 21, runs: 13 },
  { month: '10月', tasks: 31, readyTasks: 25, runs: 16 },
  { month: '11月', tasks: 34, readyTasks: 27, runs: 18 },
  { month: '12月', tasks: 38, readyTasks: 31, runs: 21 },
];

const hashYear = (year: number, salt: number) => {
  let h = year * 31 + salt;
  h = (h ^ (h >>> 16)) * 0x45d9f3b;
  h = (h ^ (h >>> 16)) * 0x45d9f3b;
  h = h ^ (h >>> 16);
  return (h & 0xffff) / 0xffff;
};

const parseYear = (req: Request) => {
  const raw = req.query.year;
  const year = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(year) ? year : DEFAULT_YEAR;
};

const scaleByYear = (
  value: number,
  year: number,
  salt: number,
  spread = 0.25,
) => {
  if (year === DEFAULT_YEAR) return value;
  const factor = 0.75 + hashYear(year, salt) * spread * 2;
  return value * factor;
};

const buildTrendMonths = (year: number): SalesTrendMonth[] =>
  BASE_TASK_TREND.map((item, index) => {
    const monthSalt = index + 1;
    return {
      month: item.month,
      tasks: Math.round(scaleByYear(item.tasks, year, monthSalt + 10)),
      readyTasks: Math.round(
        scaleByYear(item.readyTasks, year, monthSalt + 20),
      ),
      runs: Math.round(scaleByYear(item.runs, year, monthSalt + 30)),
    };
  });

const buildOverview = (year: number): SalesOverview => {
  const months = buildTrendMonths(year);
  const lastMonth = months[months.length - 1];

  if (year === DEFAULT_YEAR) {
    return {
      totalTasks: 248,
      readyTasks: 176,
      pendingTasks: 72,
      searchRuns: 124,
    };
  }

  const factor = 0.8 + hashYear(year, 1) * 0.4;
  return {
    totalTasks: Math.round(lastMonth.tasks * factor),
    readyTasks: Math.round(lastMonth.readyTasks * factor),
    pendingTasks: Math.max(
      0,
      Math.round((lastMonth.tasks - lastMonth.readyTasks) * factor),
    ),
    searchRuns: Math.round(lastMonth.runs * factor),
  };
};

function getOverview(req: Request, res: Response) {
  const year = parseYear(req);
  return res.json({ data: buildOverview(year) });
}

function getTrends(req: Request, res: Response) {
  const year = parseYear(req);
  return res.json({ data: { months: buildTrendMonths(year) } });
}

export default {
  'GET  /api/sales/dashboard/overview': getOverview,
  'GET  /api/sales/dashboard/trends': getTrends,
};
