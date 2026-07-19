import type { DebtRecordItem } from '@/modules/recov/services/datelligence';

export type DebtRecordActionKey = 'detail' | 'persona' | 'flow-trace';

const normalizeOptionalId = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
};

export const normalizePersonaId = normalizeOptionalId;

export const normalizeFlowId = normalizeOptionalId;

export const normalizeFlowStartBatchId = normalizeOptionalId;

export const isFlowStartFailedRecord = (record: DebtRecordItem) =>
  String(record.flowStartStatus ?? '').trim() === '3' ||
  String(record.currentStatus ?? '').trim() === '发起失败';

export const isDebtFlowExceptionRecord = (record: DebtRecordItem) => {
  const status = String(record.currentStatus ?? '').trim();
  return (
    isFlowStartFailedRecord(record) ||
    status.includes('异常') ||
    status.includes('失败')
  );
};

export const canShowDebtFlowDetail = (record: DebtRecordItem) =>
  isDebtFlowExceptionRecord(record) || Boolean(normalizeFlowId(record.flowId));

export const canShowDebtPersonaAction = (
  record: DebtRecordItem,
  hasCommunicationAnalysis: boolean,
) => Boolean(normalizePersonaId(record.personaId)) || hasCommunicationAnalysis;

export const resolveDebtRecordActionKeys = (
  record: DebtRecordItem,
  hasCommunicationAnalysis: boolean,
): DebtRecordActionKey[] => {
  const keys: DebtRecordActionKey[] = ['detail'];

  if (canShowDebtPersonaAction(record, hasCommunicationAnalysis)) {
    keys.push('persona');
  }

  if (canShowDebtFlowDetail(record)) {
    keys.push('flow-trace');
  }

  return keys;
};
