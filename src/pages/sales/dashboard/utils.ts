export const formatLeads = (n: number) => Math.round(n).toLocaleString('zh-CN');

export const formatScore = (n: number) => n.toFixed(1);

export const formatPositiveRate = (n: number) => `${(n * 100).toFixed(2)}%`;

export const formatRoi = (n: number) => `${n.toFixed(1)}倍`;

export const formatRevenue = (n: number) =>
  `${Math.round(n).toLocaleString('zh-CN')}万元`;
