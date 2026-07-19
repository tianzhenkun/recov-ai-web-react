export type DebtStatusDisplay = {
  text: string;
  color?: string;
  rawText: string;
};

const normalizeStatusText = (value: unknown) => String(value ?? '').trim();

const rawStatusColorMap: Record<string, string> = {
  未开始: 'default',
  发起中: 'processing',
  已发起: 'processing',
  待触发: 'processing',
  执行中: 'processing',
  等待回调: 'processing',
  处理中: 'processing',
  已完成: 'success',
  流程已完成: 'success',
  已还款: 'success',
  已还款终止: 'success',
  节点失败: 'error',
  发起失败: 'error',
  流程异常: 'error',
  人工终止: 'default',
  条件不满足终止: 'default',
  已终止: 'default',
  未知状态: 'default',
};

const listStatusLabelMap: Record<string, string> = {
  发起中: '处理中',
  已发起: '处理中',
  待触发: '处理中',
  执行中: '处理中',
  等待回调: '处理中',
  处理中: '处理中',
  节点失败: '流程异常',
  发起失败: '流程异常',
  人工终止: '已终止',
  条件不满足终止: '已终止',
  已还款终止: '已还款',
  流程已完成: '已完成',
};

export const resolveDebtStatusColor = (status: unknown) => {
  const text = normalizeStatusText(status);
  if (!text) return undefined;
  if (rawStatusColorMap[text]) return rawStatusColorMap[text];
  if (/(完成|成功|已结清|已缴清|已还款)/.test(text)) return 'success';
  if (/(失败|异常|逾期|拒绝)/.test(text)) return 'error';
  if (/(进行|处理中|外呼中|执行中|发起中|已发起|等待|待触发)/.test(text)) {
    return 'processing';
  }
  if (/(暂停|停止|终止)/.test(text)) return 'default';
  if (/(待处理|未开始)/.test(text)) return 'warning';
  return 'default';
};

export const resolveDebtRawStatusDisplay = (
  status: unknown,
): DebtStatusDisplay => {
  const rawText = normalizeStatusText(status);
  if (!rawText) {
    return {
      text: '-',
      rawText: '',
    };
  }

  return {
    text: rawText,
    color: resolveDebtStatusColor(rawText),
    rawText,
  };
};

export const resolveDebtListStatusDisplay = (
  status: unknown,
): DebtStatusDisplay => {
  const rawText = normalizeStatusText(status);
  if (!rawText) {
    return {
      text: '-',
      rawText: '',
    };
  }

  const text = listStatusLabelMap[rawText] || rawText;
  return {
    text,
    color: resolveDebtStatusColor(text),
    rawText,
  };
};
