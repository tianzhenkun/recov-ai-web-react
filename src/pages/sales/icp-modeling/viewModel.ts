import type {
  SalesIcpAttributePolicy,
  SalesIcpTemplate,
  SalesIcpTemplateItem,
  SalesRequirement,
  SalesTask,
} from '@/services/ruoyi/sales';

export type SalesCardView = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  statusText?: string;
  statusColor?: string;
  createTime?: string;
};

const taskStatusMeta: Record<string, { label: string; color: string }> = {
  '0': { label: '待补全', color: 'warning' },
  '1': { label: '待开始', color: 'blue' },
  blocked: { label: '待补全', color: 'warning' },
  ready: { label: '待开始', color: 'blue' },
  running: { label: '执行中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  failed: { label: '执行失败', color: 'error' },
  canceled: { label: '已取消', color: 'default' },
};

const templateStatusMeta: Record<string, { label: string; color: string }> = {
  '0': { label: '停用', color: 'default' },
  '1': { label: '启用', color: 'success' },
};

const toCleanText = (value?: string | null) => String(value || '').trim();

const uniquePush = (items: string[], value?: string | null) => {
  const text = toCleanText(value);
  if (text && !items.includes(text)) items.push(text);
};

export const getCardPreviewItems = (items: string[], limit = 3) => {
  const result: string[] = [];
  items.forEach((item) => {
    uniquePush(result, item);
  });
  return result.slice(0, limit);
};

export type VisibleSalesIcpAttributePolicy = SalesIcpAttributePolicy & {
  key: string;
};

const isEnabledFlag = (value: unknown) =>
  value !== false && value !== '0' && value !== 0;

const isRequiredPolicy = (policy: SalesIcpAttributePolicy) =>
  policy.required === true || policy.required === '1' || policy.required === 1;

const getPolicySortOrder = (policy: SalesIcpAttributePolicy) => {
  const sortOrder = Number(policy.sortOrder ?? policy.sort_order);
  return Number.isFinite(sortOrder) ? sortOrder : Number.MAX_SAFE_INTEGER;
};

export const getVisibleIcpAttributePolicies = (
  policies: SalesIcpAttributePolicy[] = [],
): VisibleSalesIcpAttributePolicy[] =>
  policies
    .filter(
      (policy): policy is VisibleSalesIcpAttributePolicy =>
        Boolean(policy.key) &&
        isEnabledFlag(policy.enabled) &&
        isEnabledFlag(policy.display),
    )
    .sort((prev, next) => getPolicySortOrder(prev) - getPolicySortOrder(next));

export const buildDefaultTemplateItems = (
  policies: SalesIcpAttributePolicy[] = [],
): SalesIcpTemplateItem[] =>
  getVisibleIcpAttributePolicies(policies).map((policy, index) => ({
    attrSource: 'system',
    attrKey: policy.key,
    attrName: policy.name || policy.key,
    requirementType: isRequiredPolicy(policy) ? 'required' : 'preferred',
    matchMode: 'all',
    scoreWeight: Number(policy.scoreWeight ?? policy.score_weight) || 10,
    valueText: '',
    sortOrder: index + 1,
    enabled: isRequiredPolicy(policy),
  }));

const getRequirementName = (item: SalesRequirement) =>
  toCleanText(
    item.attributeName ||
      item.attribute_name ||
      item.attributeKey ||
      item.attribute_key ||
      '条件',
  );

const getRequirementText = (item: SalesRequirement) => toCleanText(item.text);

const buildRequirementSummaries = (requirements: SalesRequirement[] = []) =>
  requirements
    .map((item) => {
      const text = getRequirementText(item);
      if (!text) return '';
      return `${getRequirementName(item)}：${text}`;
    })
    .filter(Boolean);

export const buildTaskCardView = (task: SalesTask): SalesCardView => {
  const requirements = task.requirements || [];
  const requirementSummaries = buildRequirementSummaries(requirements);
  const statusKey = String(
    task.status || (task.canStart ? 'ready' : 'blocked'),
  );
  const status = taskStatusMeta[statusKey] || {
    label: statusKey || '-',
    color: 'default',
  };

  return {
    id: String(task.id),
    title: task.taskName || '未命名任务',
    description:
      requirementSummaries.slice(0, 2).join('；') ||
      task.errorMessage ||
      task.warning ||
      '暂无客户画像条件',
    tags: getCardPreviewItems(requirements.map(getRequirementText)),
    statusText: status.label,
    statusColor: status.color,
    createTime: task.createTime,
  };
};

export const buildTemplateCardView = (
  template: SalesIcpTemplate,
): SalesCardView => {
  const enabledItems = template.items.filter((item) => item.enabled !== false);
  const status = templateStatusMeta[String(template.status || '1')] || {
    label: template.status || '-',
    color: 'default',
  };
  const itemSummary = enabledItems
    .slice(0, 2)
    .map((item) => `${item.attrName}：${item.valueText}`)
    .join('；');

  return {
    id: String(template.id),
    title: template.tplName || '未命名模板',
    description: template.description || itemSummary || '暂无模板说明',
    tags: getCardPreviewItems(enabledItems.map((item) => item.valueText)),
    statusText: status.label,
    statusColor: status.color,
    createTime: template.createTime,
  };
};
