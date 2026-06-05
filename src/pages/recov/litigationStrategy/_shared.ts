import {
  type AutoCollectionConfigVo,
  FIELD_CONFIGS,
  type LitigationConfigVo,
  type RuleConditionNode,
  type RuleField,
  type RuleGroupNode,
} from '@/services/ruoyi/litigation';

export const PAGE_TITLE = '诉讼策略配置';

export const TAB_LITIGATION = 'litigation';
export const TAB_AUTO_COLLECTION = 'autoCollection';
export const TAB_LAWYER_COURT = 'lawyerCourt';

export type LitigationTabKey =
  | typeof TAB_LITIGATION
  | typeof TAB_AUTO_COLLECTION
  | typeof TAB_LAWYER_COURT;

export type LitigationConfigSnapshot = Pick<
  LitigationConfigVo,
  'litigationThreshold' | 'litigationFrequency' | 'litigationRuleJson'
>;

export type AutoCollectionConfigSnapshot = Pick<
  AutoCollectionConfigVo,
  'collectionAmountLimit' | 'returnPrincipalRate' | 'recallDays'
>;

export const DEFAULT_LITIGATION_FORM: LitigationConfigVo = {
  litigationThreshold: 300,
  litigationFrequency: 10,
  litigationRuleJson: '',
};

export const DEFAULT_AUTO_COLLECTION_FORM: AutoCollectionConfigVo = {
  collectionAmountLimit: 8000,
  returnPrincipalRate: 50,
  recallDays: 5,
};

const isRuleGroup = (value: unknown): value is RuleGroupNode => {
  if (!value || typeof value !== 'object') return false;
  const v = value as { type?: unknown; logic?: unknown; children?: unknown };
  return v.type === 'GROUP' && Array.isArray(v.children);
};

/**
 * 解析规则树 JSON，仅接受根节点 type === 'GROUP'。
 * 解析失败或非法结构一律返回 null，UI 显示"创建规则"空态。
 */
export const parseRuleTree = (json: string): RuleGroupNode | null => {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return isRuleGroup(parsed) ? (parsed as RuleGroupNode) : null;
  } catch {
    return null;
  }
};

export const serializeRuleTree = (node: RuleGroupNode | null): string => {
  if (!node) return '';
  return JSON.stringify(node);
};

const fieldConfigOf = (field: RuleField) =>
  FIELD_CONFIGS.find((item) => item.field === field) ?? FIELD_CONFIGS[0];

export const createEmptyConditionNode = (
  field: RuleField = 'overdueDays',
): RuleConditionNode => {
  const config = fieldConfigOf(field);
  return {
    type: 'COND',
    field,
    op: config.ops[0],
    value: config.valueType === 'number' ? 0 : [],
  };
};

export const createInitialRuleTree = (): RuleGroupNode => ({
  type: 'GROUP',
  logic: 'AND',
  children: [
    {
      type: 'COND',
      field: 'overdueDays',
      op: 'GTE',
      value: 90,
    },
  ],
});

export const getLitigationSnapshot = (
  form: LitigationConfigVo,
): LitigationConfigSnapshot => ({
  litigationThreshold: Number(form.litigationThreshold ?? 0),
  litigationFrequency: Number(form.litigationFrequency ?? 0),
  litigationRuleJson: form.litigationRuleJson || '',
});

export const getAutoCollectionSnapshot = (
  form: AutoCollectionConfigVo,
): AutoCollectionConfigSnapshot => ({
  collectionAmountLimit: Number(form.collectionAmountLimit ?? 0),
  returnPrincipalRate: Number(form.returnPrincipalRate ?? 0),
  recallDays: Number(form.recallDays ?? 0),
});

export const isLitigationDirty = (
  saved: LitigationConfigSnapshot | null,
  current: LitigationConfigSnapshot,
): boolean => {
  if (!saved) return false;
  return (
    current.litigationThreshold !== saved.litigationThreshold ||
    current.litigationFrequency !== saved.litigationFrequency ||
    current.litigationRuleJson !== saved.litigationRuleJson
  );
};

export const isAutoCollectionDirty = (
  saved: AutoCollectionConfigSnapshot | null,
  current: AutoCollectionConfigSnapshot,
): boolean => {
  if (!saved) return false;
  return (
    current.collectionAmountLimit !== saved.collectionAmountLimit ||
    current.returnPrincipalRate !== saved.returnPrincipalRate ||
    current.recallDays !== saved.recallDays
  );
};
