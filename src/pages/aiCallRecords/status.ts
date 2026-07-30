import type { AiCallRecord } from './service';

export type StatusPresentation = {
  text: string;
  color: string;
  tooltip: string;
  target: 'record' | 'follow_up' | null;
};

const customerIntentPresentations = {
  positive: {
    text: '正向',
    color: 'success',
    tooltip: 'AI 语义分析判断客户意向为正向',
    target: 'record',
  },
  neutral: {
    text: '中性',
    color: 'processing',
    tooltip: 'AI 语义分析判断客户意向为中性',
    target: 'record',
  },
  negative: {
    text: '负向',
    color: 'error',
    tooltip: 'AI 语义分析判断客户意向为负向',
    target: 'record',
  },
} as const satisfies Record<string, StatusPresentation>;

const analysisPresentations = {
  '0': {
    text: '待分析',
    color: 'default',
    tooltip: '通话已进入语义分析队列',
    target: 'record',
  },
  '1': {
    text: '分析中',
    color: 'processing',
    tooltip: '正在生成通话摘要和客户意向',
    target: 'record',
  },
  '3': {
    text: '分析失败',
    color: 'error',
    tooltip: '语义分析未完成，可进入详情查看失败原因',
    target: 'record',
  },
} as const satisfies Record<string, StatusPresentation>;

const followUpPresentations = {
  pending: {
    text: '待跟进',
    color: 'warning',
    tooltip: '已生成正式跟进任务，等待坐席领取',
    target: 'follow_up',
  },
  processing: {
    text: '跟进中',
    color: 'processing',
    tooltip: '正式跟进任务正在处理',
    target: 'follow_up',
  },
  completed: {
    text: '已完成',
    color: 'success',
    tooltip: '正式跟进任务已完成',
    target: 'follow_up',
  },
  closed: {
    text: '已关闭',
    color: 'default',
    tooltip: '正式跟进任务已关闭',
    target: 'follow_up',
  },
} as const satisfies Record<string, StatusPresentation>;

const isFormalSipRecord = (record: Pick<AiCallRecord, 'entryType'>) =>
  record.entryType === 'sip_outbound' || record.entryType === 'sip_inbound';

export const getCustomerIntentPresentation = (
  record: Pick<AiCallRecord, 'entryType' | 'analysisStatus' | 'customerIntent'>,
): StatusPresentation | null => {
  if (!isFormalSipRecord(record) || record.analysisStatus === '4') {
    return null;
  }
  if (record.analysisStatus && record.analysisStatus in analysisPresentations) {
    return analysisPresentations[
      record.analysisStatus as keyof typeof analysisPresentations
    ];
  }
  if (
    record.analysisStatus === '2' &&
    record.customerIntent &&
    record.customerIntent in customerIntentPresentations
  ) {
    return customerIntentPresentations[record.customerIntent];
  }
  return null;
};

export const getFollowUpPresentation = (
  record: Pick<
    AiCallRecord,
    'entryType' | 'followUpId' | 'followUpStatus' | 'followUpSuggested'
  >,
): StatusPresentation | null => {
  if (!isFormalSipRecord(record)) {
    return null;
  }
  if (record.followUpId) {
    if (
      record.followUpStatus &&
      record.followUpStatus in followUpPresentations
    ) {
      return followUpPresentations[record.followUpStatus];
    }
    return {
      text: '状态异常',
      color: 'error',
      tooltip: '跟进任务已关联，但缺少可识别的任务状态',
      target: null,
    };
  }
  if (record.followUpStatus) {
    return {
      text: '状态异常',
      color: 'error',
      tooltip: '存在跟进任务状态，但缺少任务标识',
      target: null,
    };
  }
  if (record.followUpSuggested) {
    return {
      text: '建议跟进',
      color: 'warning',
      tooltip: 'AI 建议后续跟进，但尚未生成正式跟进任务',
      target: 'record',
    };
  }
  return null;
};

export const hasUnstablePostCallData = (
  records: Array<Pick<AiCallRecord, 'entryType' | 'status' | 'analysisStatus'>>,
) =>
  records.some((record) => {
    if (!isFormalSipRecord(record)) {
      return false;
    }
    if (record.status !== 'completed' && record.status !== 'failed') {
      return true;
    }
    return (
      record.analysisStatus == null ||
      record.analysisStatus === '0' ||
      record.analysisStatus === '1'
    );
  });
