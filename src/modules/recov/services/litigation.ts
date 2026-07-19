import { ruoyiRequest } from '@/api/main';

export type RuleLogic = 'AND' | 'OR';
export type RuleOperator = 'GTE' | 'LTE' | 'EQ' | 'IN' | 'NOT_IN';
export type RuleField =
  | 'overdueDays'
  | 'overdueAmount'
  | 'customerGroups'
  | 'personaIds';

export interface RuleGroupNode {
  type: 'GROUP';
  logic: RuleLogic;
  children: RuleNode[];
}

export interface RuleConditionNode {
  type: 'COND';
  field: RuleField;
  op: RuleOperator;
  value: number | string[];
}

export type RuleNode = RuleGroupNode | RuleConditionNode;

export interface FieldConfig {
  field: RuleField;
  label: string;
  valueType: 'number' | 'string[]';
  ops: RuleOperator[];
}

export const FIELD_CONFIGS: FieldConfig[] = [
  {
    field: 'overdueDays',
    label: '逾期天数',
    valueType: 'number',
    ops: ['GTE', 'LTE', 'EQ'],
  },
  {
    field: 'overdueAmount',
    label: '逾期金额',
    valueType: 'number',
    ops: ['GTE', 'LTE', 'EQ'],
  },
  {
    field: 'customerGroups',
    label: '客户群体',
    valueType: 'string[]',
    ops: ['IN', 'NOT_IN'],
  },
  {
    field: 'personaIds',
    label: '客户画像',
    valueType: 'string[]',
    ops: ['IN', 'NOT_IN'],
  },
];

export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  GTE: '大于等于',
  LTE: '小于等于',
  EQ: '等于',
  IN: '包含任一',
  NOT_IN: '不包含',
};

export interface LitigationConfigVo {
  litigationThreshold: number;
  litigationFrequency: number;
  litigationRuleJson: string;
}

export interface AutoCollectionConfigVo {
  collectionAmountLimit: number;
  returnPrincipalRate: number;
  recallDays: number;
}

export interface SaveConfigDTO {
  litigationThreshold?: number;
  litigationFrequency?: number;
  litigationRuleJson?: string;
  collectionAmountLimit?: number;
  returnPrincipalRate?: number;
  recallDays?: number;
}

export type UploadCustomerGroupsResult = {
  code: number;
  msg: string;
  data: number[] | null;
};

/**
 * 立案起诉配置查询。
 */
export const getLitigationConfig = () =>
  ruoyiRequest<LitigationConfigVo>('/system/recov/tenant/config/litigation', {
    method: 'get',
  });

/**
 * 自动撤诉策略配置查询。
 */
export const getAutoCollectionConfig = () =>
  ruoyiRequest<AutoCollectionConfigVo>(
    '/system/recov/tenant/config/auto-collection',
    { method: 'get' },
  );

/**
 * 立案起诉 / 自动撤诉 共用保存接口，仅下发各自字段。
 */
export const saveTenantConfig = (data: SaveConfigDTO) =>
  ruoyiRequest('/system/recov/tenant/config', { method: 'put', data });

/**
 * 上传 Excel 解析客户群体（资产编号数组）。
 * 注意：后端返回的 number[] 体在 ruoyiRequest 的 RuoyiResponse 外层中以 data 字段呈现。
 */
export const uploadCustomerGroups = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return ruoyiRequest<number[]>('/system/recov/litigation/import-assets', {
    method: 'post',
    data: formData,
  });
};
