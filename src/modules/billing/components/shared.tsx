import { Tag, Typography } from 'antd';
import type React from 'react';

const { Text } = Typography;

export const ownerTypeText: Record<string, string> = {
  TENANT: '团队共享账户',
  USER: '个人账户',
};

export const accountStatusText: Record<string, string> = {
  NORMAL: '正常',
  ARREARS_BLOCKED: '欠费冻结',
  DISABLED: '停用',
};

export const accountStatusTone: Record<string, string> = {
  NORMAL: 'green',
  ARREARS_BLOCKED: 'red',
  DISABLED: 'default',
};

export const grantStatusText: Record<string, string> = {
  AVAILABLE: '可用',
  EXHAUSTED: '已耗尽',
  EXPIRED: '已过期',
  VOIDED: '已作废',
  REFUND_LOCKED: '退款冻结',
};

export const grantTypeText: Record<string, string> = {
  purchase: '购买充值',
  compensation: '补偿调整',
  gift: '运营赠送',
  refund: '退款返还',
};

export const packageOwnerScopeText: Record<string, string> = {
  USER: '个人套餐',
  TENANT: '团队套餐',
};

export const packageKindText: Record<string, string> = {
  FIXED_POINTS: '固定点数包',
  TERM_POINTS: '周期点数包',
};

export const packageStatusText: Record<string, string> = {
  ON_SALE: '在售',
  OFF_SALE: '停售',
};

export const packageStatusTone: Record<string, string> = {
  ON_SALE: 'green',
  OFF_SALE: 'default',
};

export const couponTypeText: Record<string, string> = {
  AMOUNT_OFF: '立减券',
  PERCENT_OFF: '折扣券',
};

export const couponReceiveModeText: Record<string, string> = {
  DIRECT_ISSUE: '系统派发',
  SELF_CLAIM: '用户领取',
};

export const couponValidityTypeText: Record<string, string> = {
  FIXED: '固定有效期',
  AFTER_RECEIVE: '领取后有效',
};

export const couponStatusText: Record<string, string> = {
  UNUSED: '未使用',
  LOCKED: '锁定中',
  USED: '已使用',
  EXPIRED: '已过期',
  VOIDED: '已作废',
};

export const couponStatusTone: Record<string, string> = {
  UNUSED: 'green',
  LOCKED: 'gold',
  USED: 'blue',
  EXPIRED: 'default',
  VOIDED: 'red',
};

export const payStatusText: Record<string, string> = {
  PENDING_PAYMENT: '待支付',
  PAID: '已支付',
  CLOSED: '已关闭',
  REFUND_LOCKED: '退款处理中',
  REFUNDED: '已退款',
};

export const payStatusTone: Record<string, string> = {
  PENDING_PAYMENT: 'gold',
  PAID: 'green',
  CLOSED: 'default',
  REFUND_LOCKED: 'processing',
  REFUNDED: 'purple',
};

export const orderStatusText: Record<string, string> = {
  PROCESSING: '处理中',
  SETTLED: '已结清',
  PARTIAL_OUTSTANDING: '部分欠费',
  OUTSTANDING: '欠费',
  PARTIAL_REFUNDED: '部分退点',
  REFUNDED: '已退点',
  FAILED: '失败',
};

export const orderStatusTone: Record<string, string> = {
  PROCESSING: 'processing',
  SETTLED: 'green',
  PARTIAL_OUTSTANDING: 'orange',
  OUTSTANDING: 'red',
  PARTIAL_REFUNDED: 'purple',
  REFUNDED: 'purple',
  FAILED: 'red',
};

export const ledgerTypeText: Record<string, string> = {
  GRANT: '发放',
  CHARGE: '扣费',
  REFUND: '退点',
  REVERSAL: '冲正',
  ADJUSTMENT: '运营调整',
  ARREARS_SETTLEMENT: '欠费偿还',
  EXPIRE: '过期',
  CASH_REFUND_LOCK: '现金退款锁定',
  CASH_REFUND_RESTORE: '现金退款恢复',
  CASH_REFUND_VOID: '现金退款作废',
};

export const ledgerTone: Record<string, string> = {
  GRANT: 'green',
  CHARGE: 'red',
  REFUND: 'purple',
  REVERSAL: 'volcano',
  ADJUSTMENT: 'cyan',
  ARREARS_SETTLEMENT: 'blue',
  EXPIRE: 'default',
  CASH_REFUND_LOCK: 'gold',
  CASH_REFUND_RESTORE: 'green',
  CASH_REFUND_VOID: 'default',
};

export const directionText: Record<string, string> = {
  IN: '入账',
  OUT: '出账',
};

export const toNumber = (value: unknown) => {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

export const formatPoints = (value?: unknown) =>
  `${toNumber(value).toLocaleString('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;

export const formatAmount = (value?: unknown) =>
  `¥${toNumber(value).toLocaleString('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;

export const formatFenAmount = (value?: unknown) =>
  formatAmount(toNumber(value) / 100);

export const describePackageTerm = (
  packageKind?: string,
  termMonths?: unknown,
) => {
  if (packageKind === 'FIXED_POINTS') {
    return '永久有效';
  }
  const months = toNumber(termMonths);
  return months > 0 ? `${months} 个自然月` : '周期有效';
};

export { billingPermissions } from '../permissions';

export const shortId = (value?: string | number) => {
  if (value === undefined || value === null || value === '') return '-';
  const text = String(value);
  return text.length > 10 ? `${text.slice(0, 6)}...${text.slice(-4)}` : text;
};

export const formatDate = (value?: string) => value || '-';

export const renderCodeId = (value?: string | number) => (
  <Text code>{shortId(value)}</Text>
);

export const renderDictTag = (
  value: unknown,
  dict: Record<string, string>,
  color?: string,
) => {
  const key = String(value || '');
  if (!key) return '-';
  return (
    <Tag color={color}>
      {dict[key] || key} · {key}
    </Tag>
  );
};

export const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export const prettyJson = (value?: string) => {
  if (!value) return '-';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

export const jsonBlockStyle: React.CSSProperties = {
  maxHeight: 260,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
};
