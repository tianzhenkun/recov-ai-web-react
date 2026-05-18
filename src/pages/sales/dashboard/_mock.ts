import type { Request, Response } from 'express';
import type { SalesOverview, SalesTrendMonth } from './data.d';

const DEFAULT_YEAR = 2026;

const BASE_LEADS_TREND: Omit<SalesTrendMonth, 'revenue' | 'roi'>[] = [
  { month: '1月', leads: 120 },
  { month: '2月', leads: 145 },
  { month: '3月', leads: 168 },
  { month: '4月', leads: 155 },
  { month: '5月', leads: 192 },
  { month: '6月', leads: 215 },
  { month: '7月', leads: 248 },
  { month: '8月', leads: 235 },
  { month: '9月', leads: 278 },
  { month: '10月', leads: 312 },
  { month: '11月', leads: 345 },
  { month: '12月', leads: 380 },
];

const BASE_REVENUE_ROI: Pick<SalesTrendMonth, 'revenue' | 'roi'>[] = [
  { revenue: 350, roi: 1.5 },
  { revenue: 420, roi: 1.8 },
  { revenue: 480, roi: 2.1 },
  { revenue: 440, roi: 1.9 },
  { revenue: 520, roi: 2.4 },
  { revenue: 610, roi: 2.8 },
  { revenue: 700, roi: 3.2 },
  { revenue: 680, roi: 3.0 },
  { revenue: 790, roi: 3.5 },
  { revenue: 820, roi: 3.9 },
  { revenue: 910, roi: 4.2 },
  { revenue: 980, roi: 4.8 },
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
  BASE_LEADS_TREND.map((item, index) => {
    const revenueRoi = BASE_REVENUE_ROI[index];
    const monthSalt = index + 1;
    return {
      month: item.month,
      leads: Math.round(scaleByYear(item.leads, year, monthSalt + 10)),
      revenue: Math.round(
        scaleByYear(revenueRoi.revenue, year, monthSalt + 20),
      ),
      roi: Number(
        scaleByYear(revenueRoi.roi, year, monthSalt + 30, 0.15).toFixed(1),
      ),
    };
  });

const buildOverview = (year: number): SalesOverview => {
  const months = buildTrendMonths(year);
  const lastMonth = months[months.length - 1];

  if (year === DEFAULT_YEAR) {
    return {
      newLeads: 248,
      leadQualityScore: 8.4,
      positiveReplyRate: 0.057,
      estimatedRoi: 3.2,
    };
  }

  const factor = 0.8 + hashYear(year, 1) * 0.4;
  return {
    newLeads: Math.round(lastMonth.leads * factor),
    leadQualityScore: Number(scaleByYear(8.4, year, 2, 0.12).toFixed(1)),
    positiveReplyRate: Number(scaleByYear(0.057, year, 3, 0.2).toFixed(3)),
    estimatedRoi: Number(scaleByYear(3.2, year, 4, 0.15).toFixed(1)),
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
