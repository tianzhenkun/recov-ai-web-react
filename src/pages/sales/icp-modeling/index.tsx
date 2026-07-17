import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileSearchOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Modal,
  message,
  Progress,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import TableActions from '@/components/TableActions';
import {
  createSalesTask,
  createSalesTaskFromTemplate,
  createSalesTemplate,
  deleteSalesTemplates,
  generateSalesTemplate,
  getSalesIcpPolicy,
  getSalesSearchRun,
  getSalesTask,
  querySalesRunAccountProfiles,
  querySalesSearchRunPage,
  querySalesTaskPage,
  querySalesTemplatePage,
  type SalesAccountProfile,
  type SalesAccountProfileReviewStatus,
  type SalesGeneratedTemplateDraft,
  type SalesIcpAttributePolicy,
  type SalesIcpTemplate,
  type SalesIcpTemplateItem,
  type SalesId,
  type SalesRequirement,
  type SalesSearchRun,
  type SalesTask,
  type SalesTaskQuery,
  type SalesTemplateQuery,
  startSalesTask,
  updateSalesAccountProfileReview,
  updateSalesTemplate,
} from '@/services/ruoyi/sales';
import {
  buildDefaultTemplateItems,
  buildTaskCardView,
  buildTemplateCardView,
  getVisibleIcpAttributePolicies,
} from './viewModel';

const { TextArea } = Input;
const { Text } = Typography;

type PreviewState = {
  open: boolean;
  title: string;
  data?: Record<string, unknown>;
  run?: SalesSearchRun;
};

type TemplateFormState = {
  id?: string | number;
  tplName: string;
  description?: string;
  status: string;
  items: SalesIcpTemplateItem[];
};

type TemplateEditorState = {
  open: boolean;
  mode: 'create' | 'edit';
  source?: 'manual' | 'generated';
  data: TemplateFormState;
};

type AccountProfileReviewState = {
  profile: SalesAccountProfile;
  reviewStatus: SalesAccountProfileReviewStatus;
  reviewNote: string;
};

const requirementTypeMeta: Record<string, { label: string; color: string }> = {
  required: { label: '必须', color: 'blue' },
  preferred: { label: '偏好', color: 'green' },
  excluded: { label: '排除', color: 'red' },
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

const runStatusColorMap: Record<string, string> = {
  pending: 'default',
  accepted: 'processing',
  completed: 'success',
  blocked: 'warning',
  failed: 'error',
  running: 'processing',
  timeout: 'error',
  canceled: 'default',
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
};

const toJsonText = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readField = (source: unknown, keys: string[]) => {
  if (!isRecord(source)) return undefined;
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
};

const readObjectField = (source: unknown, keys: string[]) => {
  const value = readField(source, keys);
  return isRecord(value) ? value : {};
};

const readArrayField = (source: unknown, keys: string[]) => {
  const value = readField(source, keys);
  return Array.isArray(value) ? value : [];
};

const toRecordList = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const toTextValue = (value: unknown, fallback = ''): string => {
  if (value === undefined || value === null || value === '') return fallback;
  if (Array.isArray(value))
    return (
      value
        .map((item) => toTextValue(item, ''))
        .filter(Boolean)
        .join('、') || fallback
    );
  if (typeof value === 'object') return fallback;
  return String(value);
};

const toNumberValue = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const normalizeDomainKey = (value: unknown) =>
  toTextValue(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^\/\//, '')
    .split(/[/?#]/)[0]
    .replace(/^www\./, '')
    .replace(/\.$/, '');

const isNonEmptyRecord = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && Object.keys(value).length > 0;

const firstNonEmptyObject = (...values: unknown[]) =>
  values.find(isNonEmptyRecord) as Record<string, unknown> | undefined;

const normalizeRunReportForDisplay = (report?: Record<string, unknown>) => {
  if (!report) return {};
  const nested = readObjectField(report, ['report']);
  const hasDirectReportFields = Boolean(
    readField(report, [
      'run',
      'search_queries',
      'searchQueries',
      'account_profiles',
      'accountProfiles',
    ]),
  );
  return Object.keys(nested).length && !hasDirectReportFields ? nested : report;
};

const renderUrl = (url: unknown, label?: unknown) => {
  const href = toTextValue(url);
  if (!href) return '-';
  const text = toTextValue(label, href);
  return (
    <a href={href} target="_blank" rel="noreferrer">
      <Space size={4}>
        <LinkOutlined />
        <span>{text}</span>
      </Space>
    </a>
  );
};

const countRecords = (
  records: Record<string, unknown>[],
  predicate: (record: Record<string, unknown>) => boolean,
) => records.filter(predicate).length;

const getLeadProfiles = (report: Record<string, unknown>) =>
  toRecordList(readArrayField(report, ['account_profiles', 'accountProfiles']));

const accountCompany = (profile: Record<string, unknown>) =>
  readObjectField(profile, ['company']);

const accountIcpFit = (profile: Record<string, unknown>) =>
  readObjectField(profile, ['icpFit', 'icp_fit']);

const accountProfileDomain = (profile: Record<string, unknown>) => {
  const company = accountCompany(profile);
  return toTextValue(readField(company, ['primaryDomain', 'primary_domain']));
};

const findAccountProfileForLead = (
  lead: Record<string, unknown>,
  candidates: SalesAccountProfile[],
) => {
  const candidateKey = toTextValue(
    readField(lead, ['profileKey', 'profile_key']),
  );
  const domain = accountProfileDomain(lead);
  const normalizedDomain = normalizeDomainKey(domain);
  return candidates.find((candidate) => {
    if (candidateKey && candidate.profileKey === candidateKey) return true;
    return Boolean(
      normalizedDomain &&
        normalizeDomainKey(candidate.primaryDomain) === normalizedDomain,
    );
  });
};

const findWebsiteProfile = (report: Record<string, unknown>, domain: string) =>
  toRecordList(
    readArrayField(report, [
      'company_website_profiles',
      'companyWebsiteProfiles',
    ]),
  ).find(
    (profile) =>
      toTextValue(
        readField(profile, [
          'company_domain',
          'companyDomain',
          'primaryDomain',
          'primary_domain',
        ]),
      ) === domain,
  );

const renderMetricTags = (source: Record<string, unknown>, keys: string[]) => {
  const tags = keys
    .map((key) => {
      const value = readField(source, [
        key,
        key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase()),
      ]);
      if (value === undefined || value === null || value === '') return null;
      return {
        key,
        label: metricLabelMap[key] || key,
        value: toTextValue(value),
      };
    })
    .filter((item): item is { key: string; label: string; value: string } =>
      Boolean(item),
    );

  if (!tags.length) return <Text type="secondary">-</Text>;
  return (
    <Space size={[6, 6]} wrap>
      {tags.map((item) => (
        <Tag key={item.key}>
          {item.label} {item.value}
        </Tag>
      ))}
    </Space>
  );
};

const formatPercent = (value: unknown) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return '-';
  return `${Math.round(numberValue * 100)}%`;
};

const traceStatusMeta: Record<string, { label: string; color: string }> = {
  completed: { label: '已完成', color: 'success' },
  ready: { label: '已就绪', color: 'processing' },
  planned: { label: '已规划', color: 'processing' },
  blocked: { label: '已阻断', color: 'warning' },
  failed: { label: '失败', color: 'error' },
  skipped: { label: '未执行', color: 'default' },
};

const decisionStatusMeta: Record<string, { label: string; color: string }> = {
  candidate: { label: '候选', color: 'success' },
  uncertain: { label: '待确认', color: 'warning' },
  rejected: { label: '已排除', color: 'error' },
  pending_evidence: { label: '待补证', color: 'processing' },
};

const reviewStatusMeta: Record<string, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'default' },
  approved: { label: '已确认', color: 'success' },
  rejected: { label: '已排除', color: 'error' },
  needs_more_evidence: { label: '待补证', color: 'warning' },
};

const evidenceStatusMeta: Record<string, { label: string; color: string }> = {
  supported: { label: '已支持', color: 'success' },
  unknown: { label: '未知', color: 'default' },
  conflicted: { label: '冲突', color: 'error' },
  missing: { label: '缺失', color: 'warning' },
};

const profileCompletenessMeta: Record<
  string,
  { label: string; color: string }
> = {
  usable: { label: '可用', color: 'success' },
  partial: { label: '部分可用', color: 'warning' },
  thin: { label: '证据薄', color: 'default' },
};

const fieldLabelMap: Record<string, string> = {
  product_or_service: '产品/服务',
  customer_type: '客户类型',
  market_scope: '市场范围',
  qualification_signal: '资质信号',
  exclusion_rule: '排除条件',
  other: '其他',
};

const metricLabelMap: Record<string, string> = {
  max_rounds: '最大轮次',
  max_queries: '最大 Query',
  queries_per_round: '每轮 Query',
  executed_query_count: '执行 Query',
  executed_request_count: '请求数',
  result_count: '搜索结果',
  error_count: '错误',
  target_count: '目标页',
  attempted_count: '尝试',
  fetched_count: '成功抓取',
  failed_count: '失败',
  skipped_count: '跳过',
  usable_text_count: '可用正文',
  usable_for_evidence_count: '可作证据',
  needs_rendering_fallback_count: '需渲染',
  company_expansion_page_count: '站内扩展页',
  planned_company_count: '补证公司',
  upgraded_ready_for_semantic_count: '补证升级',
  unique_domains: '唯一域名',
  candidate: '候选',
  uncertain: '待确认',
  rejected: '排除',
  needs_more_evidence_count: '需补证',
  lead_profile_count: '线索画像',
  usable_lead_profile_count: '可用线索',
  website_profile_count: '官网画像',
  usable_website_profile_count: '可用官网画像',
};

const renderTraceStatus = (status?: string) => {
  const meta = traceStatusMeta[String(status || '')] || {
    label: status || '-',
    color: 'default',
  };
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

const renderDecisionStatus = (status?: string) => {
  const meta = decisionStatusMeta[String(status || '')] || {
    label: status || '-',
    color: 'default',
  };
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

const renderReviewStatus = (status?: string) => {
  const meta = reviewStatusMeta[String(status || '')] || {
    label: status || '-',
    color: 'default',
  };
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

const renderEvidenceStatus = (status?: string) => {
  const meta = evidenceStatusMeta[String(status || '')] || {
    label: status || '-',
    color: 'default',
  };
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

const renderProfileCompleteness = (value?: string) => {
  const meta = profileCompletenessMeta[String(value || '')] || {
    label: value || '-',
    color: 'default',
  };
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

const attrKeyOfRequirement = (item: SalesRequirement) =>
  item.attributeKey || item.attribute_key || '';

const attrNameOfRequirement = (item: SalesRequirement) =>
  item.attributeName || item.attribute_name || '';

const renderRequirementType = (value?: string) => {
  const meta = requirementTypeMeta[String(value || '')] || {
    label: value || '-',
    color: 'default',
  };
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

const renderTaskStatus = (task: SalesTask) => {
  const status = String(task.status || (task.canStart ? 'ready' : 'blocked'));
  const meta = taskStatusMeta[status] || { label: status, color: 'default' };
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

const renderTemplateStatus = (status?: string) => {
  const meta = templateStatusMeta[String(status || '1')] || {
    label: status || '-',
    color: 'default',
  };
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

const renderRunStatus = (status?: string) => (
  <Tag color={runStatusColorMap[String(status || '')] || 'default'}>
    {status || '-'}
  </Tag>
);

const createEmptyTemplateItem = (
  attrSource: 'system' | 'custom',
  sortOrder: number,
): SalesIcpTemplateItem => ({
  attrSource,
  attrKey: undefined,
  attrName: '',
  requirementType: 'preferred',
  matchMode: 'all',
  scoreWeight: 10,
  valueText: '',
  sortOrder,
  enabled: true,
});

const requirementIdForIndex = (index: number) =>
  `req_${String(index + 1).padStart(3, '0')}`;

const requirementsFromTemplateItems = (
  items: SalesIcpTemplateItem[],
): SalesRequirement[] =>
  items.map((item, index) => ({
    id: requirementIdForIndex(index),
    type: item.requirementType || 'required',
    attrSource: item.attrSource,
    attributeKey: item.attrSource === 'system' ? item.attrKey : null,
    attribute_key: item.attrSource === 'system' ? item.attrKey : null,
    attributeName: item.attrName,
    attribute_name: item.attrName,
    text: item.valueText,
    scoreWeight: item.scoreWeight || 10,
    score_weight: item.scoreWeight || 10,
    sortOrder: index + 1,
    sort_order: index + 1,
    enabled: item.enabled !== false,
  }));

const fromTemplate = (
  template?: SalesIcpTemplate | SalesGeneratedTemplateDraft,
): TemplateFormState => ({
  id: 'id' in (template || {}) ? (template as SalesIcpTemplate).id : undefined,
  tplName: template?.tplName || '',
  description: template?.description || '',
  status: template?.status || '1',
  items: (template?.items || []).map((item, index) => ({
    ...item,
    matchMode: item.matchMode || 'all',
    scoreWeight: Number(item.scoreWeight) || 10,
    sortOrder: item.sortOrder || index + 1,
    enabled: item.enabled !== false,
  })),
});

const templateItemSummary = (template: SalesIcpTemplate) => {
  if (template.items.length === 0) return <Text type="secondary">-</Text>;
  return (
    <Space size={[4, 4]} wrap>
      {template.items.slice(0, 4).map((item) => (
        <Tag
          key={
            item.id ||
            `${item.attrSource}-${item.attrKey || item.attrName}-${item.valueText}`
          }
        >
          {item.attrName}：{item.valueText} · 权重 {item.scoreWeight || 10}
        </Tag>
      ))}
      {template.items.length > 4 ? (
        <Tag>+{template.items.length - 4}</Tag>
      ) : null}
    </Space>
  );
};

const renderRequirements = (
  requirements: SalesRequirement[] | undefined,
  attributeLabelMap: Map<string, string>,
) => {
  if (!requirements?.length) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 ICP 条件" />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {requirements.map((item, index) => {
        const attrKey = attrKeyOfRequirement(item);
        const attrName = attrKey
          ? attributeLabelMap.get(attrKey) || attrKey
          : attrNameOfRequirement(item);
        return (
          <div
            key={`${item.id || index}-${item.text}`}
            className="rounded-lg border border-solid border-[var(--ant-color-border-secondary)] px-3 py-2"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {renderRequirementType(item.type)}
              {attrName ? <Tag>{attrName}</Tag> : null}
              <Tag>权重 {item.scoreWeight ?? item.score_weight ?? 10}</Tag>
            </div>
            <div className="text-sm leading-6 text-[var(--ant-color-text)]">
              {item.text || '-'}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const buildRunTraceSteps = (
  report: Record<string, unknown>,
  run?: SalesSearchRun,
) => {
  const inputSnapshot = readObjectField(report, [
    'inputSnapshot',
    'input_snapshot',
  ]);
  const requirements = readArrayField(inputSnapshot, ['requirements']);
  const searchContext = readObjectField(inputSnapshot, [
    'searchContext',
    'search_context',
  ]);
  const quality = readObjectField(report, [
    'searchContextQuality',
    'search_context_quality',
  ]);
  const qualityMetrics = readObjectField(quality, ['metrics']);
  const queries = readArrayField(report, ['searchQueries', 'search_queries']);
  const coverage = readObjectField(report, [
    'coverageExplain',
    'coverage_explain',
  ]);
  const coverageMetrics = readObjectField(coverage, ['metrics']);
  const contactPlan = readObjectField(report, [
    'contactDiscoveryPlan',
    'contact_discovery_plan',
  ]);
  const providerSummary = readObjectField(report, [
    'providerSummary',
    'provider_summary',
  ]);
  const accountProfiles = readArrayField(report, [
    'accountProfiles',
    'account_profiles',
  ]);
  const retrievedResults = readArrayField(report, [
    'retrievedResults',
    'retrieved_results',
  ]);
  const requirementTypeCount = (type: string) =>
    requirements.filter((item) => {
      if (!item || typeof item !== 'object') return false;
      const requirementType = readField(item as Record<string, unknown>, [
        'type',
        'requirement_type',
        'requirementType',
      ]);
      return String(requirementType || '').trim() === type;
    }).length;
  const requiredCount = requirementTypeCount('required');
  const preferredCount = requirementTypeCount('preferred');
  const excludedCount = requirementTypeCount('excluded');
  const contextItems = readArrayField(searchContext, ['items']).length;
  const qualityOk = quality.ok === true;
  const provider = toTextValue(readField(providerSummary, ['provider']), '-');
  const providerResultCount = toNumberValue(
    readField(providerSummary, ['result_count', 'resultCount']),
    retrievedResults.length,
  );

  return [
    {
      key: 'icp_snapshot',
      title: 'ICP 条件快照',
      status:
        requiredCount || preferredCount || excludedCount
          ? 'completed'
          : 'skipped',
      metrics: [
        `必须 ${requiredCount}`,
        `偏好 ${preferredCount}`,
        `排除 ${excludedCount}`,
      ],
    },
    {
      key: 'search_context',
      title: '搜索上下文生成',
      status: qualityOk
        ? 'completed'
        : quality.blockers
          ? 'blocked'
          : 'skipped',
      metrics: [
        `搜索项 ${contextItems}`,
        `必选覆盖 ${formatPercent(readField(qualityMetrics, ['required_coverage_rate', 'requiredCoverageRate']))}`,
        `警告 ${toNumberValue(readField(qualityMetrics, ['warning_count', 'warningCount']))}`,
      ],
    },
    {
      key: 'query_plan',
      title: '搜索 Query 计划',
      status: queries.length ? 'ready' : 'skipped',
      metrics: [
        `Query ${queries.length}`,
        `ICP覆盖 ${formatPercent(readField(coverageMetrics, ['coverage_rate', 'coverageRate']))}`,
      ],
    },
    {
      key: 'contact_discovery',
      title: '联系人发现计划',
      status: contactPlan.stage ? 'planned' : 'skipped',
      metrics: [
        toTextValue(
          readField(readObjectField(contactPlan, ['target']), ['source']),
          'default',
        ) === 'explicit'
          ? '用户指定角色'
          : '默认决策人',
      ],
    },
    {
      key: 'provider_search',
      title: '搜索执行与候选结果',
      status:
        run?.status === 'failed'
          ? 'failed'
          : providerResultCount || accountProfiles.length
            ? 'completed'
            : 'skipped',
      metrics: [
        `Provider ${provider}`,
        `搜索结果 ${providerResultCount}`,
        `客户画像 ${accountProfiles.length}`,
      ],
    },
  ];
};

const renderRunOverview = (
  run: SalesSearchRun | undefined,
  report: Record<string, unknown>,
) => {
  const providerSummary = readObjectField(report, [
    'providerSummary',
    'provider_summary',
  ]);
  const quality = readObjectField(report, [
    'searchContextQuality',
    'search_context_quality',
  ]);
  const coverage = readObjectField(report, [
    'coverageExplain',
    'coverage_explain',
  ]);
  const coverageMetrics = readObjectField(coverage, ['metrics']);
  const provider = toTextValue(readField(providerSummary, ['provider']), '-');
  const executedQueryCount = toTextValue(
    readField(providerSummary, ['executed_query_count', 'executedQueryCount']),
    '-',
  );
  const coverageRate = formatPercent(
    readField(coverageMetrics, ['coverage_rate', 'coverageRate']),
  );

  return (
    <div className="flex flex-col gap-4">
      {run?.errorMessage ? (
        <Alert type="error" showIcon title={run.errorMessage} />
      ) : null}
      <Descriptions
        size="small"
        bordered
        column={2}
        items={[
          { label: '运行ID', children: run?.id ? String(run.id) : '-' },
          { label: '任务ID', children: run?.taskId ? String(run.taskId) : '-' },
          { label: '状态', children: renderRunStatus(run?.status) },
          {
            label: '进度',
            children:
              typeof run?.progress === 'number' ? (
                <Progress percent={run.progress} size="small" />
              ) : (
                '-'
              ),
          },
          { label: 'Provider', children: provider },
          { label: '已执行 Query', children: executedQueryCount },
          {
            label: 'SearchContext',
            children: quality.ok === true ? '通过' : '存在风险',
          },
          { label: 'ICP 覆盖率', children: coverageRate },
          { label: '创建时间', children: formatDateTime(run?.createTime) },
          { label: '更新时间', children: formatDateTime(run?.updateTime) },
        ]}
      />
    </div>
  );
};

const renderTraceTab = (
  run: SalesSearchRun | undefined,
  report: Record<string, unknown>,
) => {
  const steps = buildRunTraceSteps(report, run);
  return (
    <div className="flex flex-col gap-4">
      {renderRunOverview(run, report)}
      <Timeline
        items={steps.map((step) => ({
          key: step.key,
          color:
            step.status === 'completed'
              ? 'green'
              : step.status === 'blocked' || step.status === 'failed'
                ? 'red'
                : step.status === 'skipped'
                  ? 'gray'
                  : 'blue',
          children: (
            <div className="rounded-lg border border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-medium">{step.title}</span>
                {renderTraceStatus(step.status)}
              </div>
              <Space size={[6, 6]} wrap>
                {step.metrics.map((item) => (
                  <Tag key={item}>{item}</Tag>
                ))}
              </Space>
            </div>
          ),
        }))}
      />
    </div>
  );
};

const renderCoverageTab = (report: Record<string, unknown>) => {
  const coverage = readObjectField(report, [
    'coverageExplain',
    'coverage_explain',
  ]);
  const requirements = toRecordList(readArrayField(coverage, ['requirements']));
  const defaultActions = toRecordList(
    readArrayField(coverage, ['defaultActions', 'default_actions']),
  );
  if (!requirements.length && !defaultActions.length) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无覆盖解释" />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Table<Record<string, unknown>>
        rowKey={(record, index) =>
          String(
            readField(record, ['requirement_id', 'requirementId']) || index,
          )
        }
        size="small"
        pagination={false}
        dataSource={requirements}
        scroll={{ x: 980 }}
        columns={[
          {
            title: '条件',
            dataIndex: 'original',
            width: 220,
            ellipsis: true,
            render: (_, record) =>
              toTextValue(readField(record, ['original', 'text'])),
          },
          {
            title: '类型',
            dataIndex: 'requirement_type',
            width: 88,
            render: (_, record) =>
              renderRequirementType(
                toTextValue(
                  readField(record, ['requirement_type', 'requirementType']),
                  '',
                ),
              ),
          },
          {
            title: '属性',
            dataIndex: 'attribute_key',
            width: 140,
            render: (_, record) =>
              toTextValue(readField(record, ['attribute_key', 'attributeKey'])),
          },
          {
            title: '搜索词',
            dataIndex: 'terms',
            render: (_, record) => (
              <Space size={[4, 4]} wrap>
                {readArrayField(record, ['terms']).map((term) => (
                  <Tag key={String(term)}>{toTextValue(term)}</Tag>
                ))}
              </Space>
            ),
          },
          {
            title: '使用位置',
            dataIndex: 'usage',
            width: 180,
            render: (_, record) =>
              toTextValue(readArrayField(record, ['usage']), '-'),
          },
          {
            title: 'Query',
            dataIndex: 'used_by_queries',
            width: 160,
            render: (_, record) =>
              toTextValue(
                readArrayField(record, ['used_by_queries', 'usedByQueries']),
                '-',
              ),
          },
        ]}
      />
      {defaultActions.length ? (
        <Alert
          type="info"
          showIcon
          title={defaultActions
            .map(
              (item) =>
                `${toTextValue(readField(item, ['stage']))}：${toTextValue(readField(item, ['intent']))}`,
            )
            .join('；')}
        />
      ) : null}
    </div>
  );
};

const renderQueriesTab = (report: Record<string, unknown>) => {
  const queries = toRecordList(
    readArrayField(report, ['searchQueries', 'search_queries']),
  );
  if (!queries.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无 Query 计划"
      />
    );
  }

  return (
    <Table<Record<string, unknown>>
      rowKey={(record, index) =>
        String(readField(record, ['query_id', 'queryId']) || index)
      }
      size="small"
      pagination={false}
      dataSource={queries}
      scroll={{ x: 1080 }}
      columns={[
        {
          title: 'ID',
          dataIndex: 'query_id',
          width: 88,
          render: (_, record) =>
            toTextValue(readField(record, ['query_id', 'queryId'])),
        },
        {
          title: '角度',
          dataIndex: 'angle',
          width: 156,
          render: (_, record) => toTextValue(readField(record, ['angle'])),
        },
        {
          title: 'Query',
          dataIndex: 'query_text',
          ellipsis: true,
          render: (_, record) => (
            <Text
              copyable={{
                text: toTextValue(
                  readField(record, ['query_text', 'queryText']),
                  '',
                ),
              }}
            >
              {toTextValue(readField(record, ['query_text', 'queryText']))}
            </Text>
          ),
        },
        {
          title: '来源条件',
          dataIndex: 'source_requirement_ids',
          width: 180,
          render: (_, record) =>
            toTextValue(
              readArrayField(record, [
                'source_requirement_ids',
                'sourceRequirementIds',
              ]),
              '-',
            ),
        },
        {
          title: '负向词',
          dataIndex: 'negative_terms',
          width: 220,
          render: (_, record) =>
            toTextValue(
              readArrayField(record, ['negative_terms', 'negativeTerms']),
              '-',
            ),
        },
      ]}
    />
  );
};

const renderExecutionTab = (report: Record<string, unknown>) => {
  const providerSummary = readObjectField(report, [
    'providerSummary',
    'provider_summary',
  ]);
  const queryBudget = readObjectField(report, ['queryBudget', 'query_budget']);
  const pageFetch = readObjectField(report, ['pageFetch', 'page_fetch']);
  const recovery = readObjectField(report, [
    'companyEvidenceRecovery',
    'company_evidence_recovery',
  ]);
  const searchRounds = toRecordList(
    readArrayField(report, ['searchRounds', 'search_rounds']),
  );
  const pageFetchSummary =
    firstNonEmptyObject(
      readObjectField(pageFetch, ['summary']),
      readObjectField(providerSummary, ['evidence_fetch', 'evidenceFetch']),
    ) || {};
  const recoverySummary =
    firstNonEmptyObject(
      readObjectField(recovery, ['summary']),
      readObjectField(providerSummary, [
        'company_evidence_recovery',
        'companyEvidenceRecovery',
      ]),
    ) || {};

  return (
    <div className="flex flex-col gap-4">
      <Descriptions
        size="small"
        bordered
        column={2}
        items={[
          {
            label: '搜索源',
            children: toTextValue(
              readField(providerSummary, ['provider']),
              '-',
            ),
          },
          {
            label: '执行规模',
            children: renderMetricTags(providerSummary, [
              'executed_query_count',
              'executed_request_count',
              'result_count',
              'error_count',
            ]),
          },
          {
            label: 'Query 预算',
            children: renderMetricTags(queryBudget, [
              'max_rounds',
              'max_queries',
              'queries_per_round',
            ]),
          },
          {
            label: '复杂度',
            children: `${toTextValue(readField(queryBudget, ['level']), '-')}/${toTextValue(
              readField(queryBudget, ['score']),
              '-',
            )}`,
          },
          {
            label: '页面抓取',
            children: renderMetricTags(pageFetchSummary, [
              'target_count',
              'attempted_count',
              'fetched_count',
              'usable_for_evidence_count',
              'failed_count',
              'needs_rendering_fallback_count',
            ]),
          },
          {
            label: '公司补证',
            children: renderMetricTags(recoverySummary, [
              'planned_company_count',
              'target_count',
              'fetched_count',
              'usable_for_evidence_count',
              'failed_count',
              'upgraded_ready_for_semantic_count',
            ]),
          },
        ]}
      />
      <Table<Record<string, unknown>>
        rowKey={(record, index) =>
          String(readField(record, ['round_index', 'roundIndex']) || index)
        }
        size="small"
        dataSource={searchRounds}
        pagination={false}
        scroll={{ x: 1080 }}
        columns={[
          {
            title: '轮次',
            dataIndex: 'round_index',
            width: 80,
            render: (_, record) =>
              toTextValue(
                readField(record, ['round_index', 'roundIndex']),
                '-',
              ),
          },
          {
            title: '类型',
            dataIndex: 'round_type',
            width: 112,
            render: (_, record) =>
              toTextValue(readField(record, ['round_type', 'roundType']), '-'),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (_, record) =>
              renderTraceStatus(toTextValue(readField(record, ['status']), '')),
          },
          {
            title: 'Query',
            dataIndex: 'queries',
            width: 88,
            render: (_, record) =>
              toRecordList(readArrayField(record, ['queries'])).length ||
              toTextValue(
                readField(record, ['query_budget', 'queryBudget']),
                '-',
              ),
          },
          {
            title: '结果',
            dataIndex: 'retrieved_results',
            width: 88,
            render: (_, record) =>
              toRecordList(
                readArrayField(record, [
                  'retrieved_results',
                  'retrievedResults',
                ]),
              ).length || '-',
          },
          {
            title: '质量摘要',
            dataIndex: 'quality',
            render: (_, record) =>
              renderMetricTags(
                readObjectField(record, [
                  'quality',
                  'quality_summary',
                  'qualitySummary',
                ]),
                [
                  'unique_domains',
                  'candidate',
                  'uncertain',
                  'rejected',
                  'needs_more_evidence_count',
                  'lead_profile_count',
                ],
              ),
          },
          {
            title: '停止/继续原因',
            dataIndex: 'stop_reason',
            width: 260,
            ellipsis: true,
            render: (_, record) => {
              const quality = readObjectField(record, [
                'quality',
                'quality_summary',
                'qualitySummary',
              ]);
              return (
                toTextValue(readField(record, ['stop_reason', 'stopReason'])) ||
                toTextValue(readField(quality, ['reason'])) ||
                '-'
              );
            },
          },
        ]}
      />
    </div>
  );
};

const renderSearchResultsTab = (report: Record<string, unknown>) => {
  const results = toRecordList(
    readArrayField(report, ['retrievedResults', 'retrieved_results']),
  );
  if (!results.length) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无搜索结果" />
    );
  }

  return (
    <Table<Record<string, unknown>>
      rowKey={(record, index) =>
        String(readField(record, ['result_id', 'resultId']) || index)
      }
      size="small"
      dataSource={results}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
      }}
      scroll={{ x: 1280 }}
      columns={[
        {
          title: '结果',
          dataIndex: 'title',
          width: 320,
          ellipsis: true,
          render: (_, record) =>
            renderUrl(
              readField(record, ['source_url', 'sourceUrl']),
              readField(record, ['title']),
            ),
        },
        {
          title: '域名',
          dataIndex: 'source_domain',
          width: 170,
          ellipsis: true,
          render: (_, record) =>
            toTextValue(
              readField(record, [
                'company_domain',
                'companyDomain',
                'primary_domain',
                'primaryDomain',
              ]),
            ) ||
            toTextValue(readField(record, ['source_domain', 'sourceDomain'])) ||
            '-',
        },
        {
          title: 'Query',
          dataIndex: 'query_id',
          width: 96,
          render: (_, record) =>
            toTextValue(readField(record, ['query_id', 'queryId']), '-'),
        },
        {
          title: 'Provider',
          dataIndex: 'provider',
          width: 110,
          render: (_, record) =>
            toTextValue(readField(record, ['provider']), '-'),
        },
        {
          title: '页面抓取',
          dataIndex: 'page_fetch_status',
          width: 160,
          render: (_, record) => (
            <Space size={4} wrap>
              <Tag>
                {toTextValue(
                  readField(record, ['page_fetch_status', 'pageFetchStatus']),
                  '-',
                )}
              </Tag>
              <Tag>
                {toTextValue(
                  readField(record, ['page_text_quality', 'pageTextQuality']),
                  '-',
                )}
              </Tag>
            </Space>
          ),
        },
        {
          title: '候选使用',
          dataIndex: 'used_in_profile',
          width: 110,
          render: (_, record) =>
            readField(record, ['used_in_profile', 'usedInProfile']) === true ? (
              <Tag color="success">已使用</Tag>
            ) : (
              <Tag color="default">未使用</Tag>
            ),
        },
        {
          title: '未使用原因',
          dataIndex: 'reject_reason',
          ellipsis: true,
          render: (_, record) =>
            toTextValue(
              readField(record, ['reject_reason', 'rejectReason']),
              '-',
            ),
        },
      ]}
    />
  );
};

const renderRequirementFitTable = (lead: Record<string, unknown>) => {
  const rows = toRecordList(
    readArrayField(lead, ['requirement_fit', 'requirementFit']),
  );
  if (!rows.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无需求匹配结果"
      />
    );
  }
  return (
    <Table<Record<string, unknown>>
      rowKey={(record, index) =>
        String(readField(record, ['requirement_id', 'requirementId']) || index)
      }
      size="small"
      dataSource={rows}
      pagination={false}
      scroll={{ x: 1120 }}
      columns={[
        {
          title: '类型',
          dataIndex: 'requirement_type',
          width: 88,
          render: (_, record) =>
            renderRequirementType(
              toTextValue(
                readField(record, ['requirement_type', 'requirementType']),
                '',
              ),
            ),
        },
        {
          title: '条件',
          dataIndex: 'requirement_text',
          width: 220,
          ellipsis: true,
          render: (_, record) =>
            toTextValue(
              readField(record, ['requirement_text', 'requirementText']),
              '-',
            ),
        },
        {
          title: '判断',
          dataIndex: 'status',
          width: 96,
          render: (_, record) =>
            renderEvidenceStatus(
              toTextValue(readField(record, ['status']), ''),
            ),
        },
        {
          title: '原文证据',
          dataIndex: 'evidence_text',
          render: (_, record) => {
            const text = toTextValue(
              readField(record, ['evidence_text', 'evidenceText']),
            );
            return text ? (
              <Text copyable={{ text }}>
                <span className="line-clamp-3">{text}</span>
              </Text>
            ) : (
              '-'
            );
          },
        },
        {
          title: '来源',
          dataIndex: 'source_url',
          width: 220,
          ellipsis: true,
          render: (_, record) =>
            renderUrl(readField(record, ['source_url', 'sourceUrl']), '打开'),
        },
        {
          title: '原因',
          dataIndex: 'reason',
          width: 260,
          ellipsis: true,
          render: (_, record) =>
            toTextValue(readField(record, ['reason']), '-'),
        },
      ]}
    />
  );
};

const renderWebsiteFieldsTable = (websiteProfile?: Record<string, unknown>) => {
  const rows = toRecordList(readArrayField(websiteProfile, ['fields']));
  if (!rows.length) return null;
  return (
    <Table<Record<string, unknown>>
      rowKey={(record, index) =>
        String(readField(record, ['field_key', 'fieldKey']) || index)
      }
      size="small"
      dataSource={rows}
      pagination={false}
      scroll={{ x: 920 }}
      columns={[
        {
          title: '画像字段',
          dataIndex: 'field_key',
          width: 140,
          render: (_, record) => {
            const key = toTextValue(
              readField(record, ['field_key', 'fieldKey']),
            );
            return fieldLabelMap[key] || key || '-';
          },
        },
        {
          title: '状态',
          dataIndex: 'status',
          width: 96,
          render: (_, record) =>
            renderEvidenceStatus(
              toTextValue(readField(record, ['status']), ''),
            ),
        },
        {
          title: '已支持内容',
          dataIndex: 'supported_texts',
          render: (_, record) =>
            toTextValue(
              readArrayField(record, ['supported_texts', 'supportedTexts']),
              '-',
            ),
        },
        {
          title: '缺失必填',
          dataIndex: 'missing_required',
          width: 180,
          render: (_, record) =>
            toTextValue(
              readArrayField(record, ['missing_required', 'missingRequired']),
              '-',
            ),
        },
      ]}
    />
  );
};

const renderSourcePagesTable = (pages: Record<string, unknown>[]) => {
  if (!pages.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无官网页面证据"
      />
    );
  }
  return (
    <Table<Record<string, unknown>>
      rowKey={(record, index) =>
        String(readField(record, ['source_url', 'sourceUrl']) || index)
      }
      size="small"
      dataSource={pages}
      pagination={false}
      scroll={{ x: 920 }}
      columns={[
        {
          title: '页面',
          dataIndex: 'title',
          render: (_, record) =>
            renderUrl(
              readField(record, ['source_url', 'sourceUrl']),
              readField(record, ['title']),
            ),
        },
        {
          title: '角色',
          dataIndex: 'page_role',
          width: 120,
          render: (_, record) =>
            toTextValue(readField(record, ['page_role', 'pageRole']), '-'),
        },
        {
          title: '质量',
          dataIndex: 'quality_level',
          width: 120,
          render: (_, record) =>
            toTextValue(
              readField(record, ['quality_level', 'qualityLevel']),
              '-',
            ),
        },
        {
          title: '证据可用',
          dataIndex: 'usable_for_evidence',
          width: 100,
          render: (_, record) =>
            readField(record, ['usable_for_evidence', 'usableForEvidence']) ===
            true ? (
              <Tag color="success">是</Tag>
            ) : (
              <Tag color="default">否</Tag>
            ),
        },
      ]}
    />
  );
};

const renderLeadProfileExpanded = (
  lead: Record<string, unknown>,
  report: Record<string, unknown>,
) => {
  const company = accountCompany(lead);
  const domain = accountProfileDomain(lead);
  const decision = accountIcpFit(lead);
  const websiteProfile = findWebsiteProfile(report, domain);
  const contacts = firstNonEmptyObject(
    readObjectField(lead, ['companyContacts', 'company_contacts']),
    readObjectField(websiteProfile, ['contacts']),
  ) || { emails: [], phones: [] };
  const directSourcePages = toRecordList(
    readArrayField(lead, ['websiteSourcePages', 'website_source_pages']),
  );
  const sourcePages = directSourcePages.length
    ? directSourcePages
    : toRecordList(
        readArrayField(websiteProfile, ['source_pages', 'sourcePages']),
      );
  const warnings = [
    ...toRecordList(readArrayField(lead, ['warnings'])),
    ...toRecordList(readArrayField(websiteProfile, ['warnings'])),
  ];
  const websiteProfileSummary = readObjectField(lead, [
    'websiteProfileSummary',
    'website_profile_summary',
  ]);

  return (
    <div className="flex flex-col gap-4 py-2">
      <Descriptions
        size="small"
        bordered
        column={2}
        items={[
          {
            label: '公司名称可信度',
            children: toTextValue(
              readField(company, ['nameConfidence', 'name_confidence']),
              '-',
            ),
          },
          {
            label: '官网画像',
            children: renderProfileCompleteness(
              toTextValue(
                readField(lead, [
                  'profile_completeness',
                  'profileCompleteness',
                ]),
                '',
              ),
            ),
          },
          {
            label: '联系方式',
            children: `邮箱 ${readArrayField(contacts, ['emails']).length} / 电话 ${
              readArrayField(contacts, ['phones']).length
            }`,
          },
          {
            label: '来源页',
            children: `${sourcePages.length} 个`,
          },
          {
            label: '判断原因',
            children: toTextValue(readField(decision, ['reason']), '-'),
          },
          {
            label: '业务摘要',
            children:
              toTextValue(readField(company, ['summary'])) ||
              toTextValue(readField(websiteProfileSummary, ['summary'])) ||
              '-',
          },
        ]}
      />
      {warnings.length ? (
        <Alert
          type="warning"
          showIcon
          title={warnings
            .map((item) => toTextValue(readField(item, ['message']), ''))
            .join('；')}
        />
      ) : null}
      <div className="flex flex-col gap-2">
        <div className="font-medium">需求匹配证据</div>
        {renderRequirementFitTable(lead)}
      </div>
      {websiteProfile ? (
        <div className="flex flex-col gap-2">
          <div className="font-medium">官网画像字段</div>
          {renderWebsiteFieldsTable(websiteProfile)}
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <div className="font-medium">官网证据页面</div>
        {renderSourcePagesTable(sourcePages)}
      </div>
    </div>
  );
};

const renderLeadProfilesTab = (
  report: Record<string, unknown>,
  candidates: SalesAccountProfile[],
  onReviewCandidate?: (
    candidate: SalesAccountProfile,
    reviewStatus: SalesAccountProfileReviewStatus,
  ) => void,
  reviewingCandidateId?: string,
) => {
  const leads = getLeadProfiles(report);
  if (!leads.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无公司线索画像"
      />
    );
  }

  return (
    <Table<Record<string, unknown>>
      rowKey={(record, index) =>
        toTextValue(readField(record, ['profileKey', 'profile_key'])) ||
        accountProfileDomain(record) ||
        String(index)
      }
      size="small"
      dataSource={leads}
      pagination={false}
      scroll={{ x: 1420 }}
      expandable={{
        expandedRowRender: (record) =>
          renderLeadProfileExpanded(record, report),
      }}
      columns={[
        {
          title: '公司',
          dataIndex: 'company',
          width: 260,
          render: (_, record) => {
            const company = accountCompany(record);
            const name =
              toTextValue(
                readField(company, ['displayName', 'display_name']),
              ) || accountProfileDomain(record);
            return (
              <div className="flex flex-col gap-1">
                <span className="font-medium">{name || '-'}</span>
                <span className="text-xs text-[var(--ant-color-text-secondary)]">
                  {renderUrl(
                    readField(company, ['websiteUrl', 'website_url']),
                    accountProfileDomain(record),
                  )}
                </span>
              </div>
            );
          },
        },
        {
          title: '判断',
          dataIndex: 'decision',
          width: 150,
          render: (_, record) => {
            const decision = accountIcpFit(record);
            return (
              <Space size={[4, 4]} wrap>
                {renderDecisionStatus(
                  toTextValue(readField(decision, ['status']), ''),
                )}
                <Tag>
                  {toTextValue(readField(decision, ['confidence']), '-')}
                </Tag>
              </Space>
            );
          },
        },
        {
          title: '画像完整度',
          dataIndex: 'profile_completeness',
          width: 130,
          render: (_, record) =>
            renderProfileCompleteness(
              toTextValue(
                readField(record, [
                  'profile_completeness',
                  'profileCompleteness',
                ]),
                '',
              ),
            ),
        },
        {
          title: 'ICP 匹配',
          dataIndex: 'requirement_fit',
          width: 180,
          render: (_, record) => {
            const fit = accountIcpFit(record);
            const required = toRecordList(
              readArrayField(fit, ['requiredCoverage', 'required_coverage']),
            );
            const supported = countRecords(
              required,
              (item) =>
                toTextValue(readField(item, ['status'])) === 'supported',
            );
            const missing = countRecords(
              required,
              (item) =>
                toTextValue(readField(item, ['status'])) !== 'supported',
            );
            return (
              <Space size={[4, 4]} wrap>
                <Tag color="success">支持 {supported}</Tag>
                <Tag color={missing ? 'warning' : 'default'}>
                  缺口 {missing}
                </Tag>
              </Space>
            );
          },
        },
        {
          title: '证据页',
          dataIndex: 'websiteSourcePages',
          width: 120,
          render: (_, record) => {
            const summary = readObjectField(record, [
              'websiteProfileSummary',
              'website_profile_summary',
            ]);
            return `${toTextValue(
              readField(summary, ['usable_page_count', 'usablePageCount']),
              '0',
            )}/${toTextValue(readField(summary, ['source_page_count', 'sourcePageCount']), '0')}`;
          },
        },
        {
          title: '联系方式',
          dataIndex: 'companyContacts',
          width: 130,
          render: (_, record) => {
            const contacts = readObjectField(record, [
              'companyContacts',
              'company_contacts',
            ]);
            return `邮箱 ${readArrayField(contacts, ['emails']).length} / 电话 ${
              readArrayField(contacts, ['phones']).length
            }`;
          },
        },
        {
          title: '摘要',
          dataIndex: 'summary',
          ellipsis: true,
          render: (_, record) => {
            const company = accountCompany(record);
            const websiteSummary = readObjectField(record, [
              'websiteProfileSummary',
              'website_profile_summary',
            ]);
            return (
              toTextValue(readField(company, ['summary'])) ||
              toTextValue(readField(websiteSummary, ['summary']), '-')
            );
          },
        },
        {
          title: '人工审核',
          dataIndex: 'review_status',
          width: 150,
          render: (_, record) => {
            const candidate = findAccountProfileForLead(record, candidates);
            if (!candidate) return <Tag color="default">未归档</Tag>;
            return (
              <Space size={[4, 4]} direction="vertical">
                {renderReviewStatus(candidate.reviewStatus)}
                {candidate.reviewNote ? (
                  <Text
                    type="secondary"
                    className="line-clamp-2 text-xs"
                    title={candidate.reviewNote}
                  >
                    {candidate.reviewNote}
                  </Text>
                ) : null}
              </Space>
            );
          },
        },
        {
          title: '审核操作',
          key: 'reviewActions',
          width: 128,
          fixed: 'right',
          render: (_, record) => {
            const candidate = findAccountProfileForLead(record, candidates);
            if (!candidate || !onReviewCandidate) return '-';
            const loading = reviewingCandidateId === String(candidate.id);
            return (
              <TableActions
                maxVisible={3}
                actions={[
                  {
                    key: 'approved',
                    label: '确认线索',
                    icon: <CheckCircleOutlined />,
                    loading,
                    disabled: candidate.reviewStatus === 'approved',
                    onClick: () => onReviewCandidate(candidate, 'approved'),
                  },
                  {
                    key: 'rejected',
                    label: '排除线索',
                    icon: <CloseCircleOutlined />,
                    danger: true,
                    loading,
                    disabled: candidate.reviewStatus === 'rejected',
                    onClick: () => onReviewCandidate(candidate, 'rejected'),
                  },
                  {
                    key: 'needs_more_evidence',
                    label: '待补证',
                    icon: <FileSearchOutlined />,
                    loading,
                    disabled: candidate.reviewStatus === 'needs_more_evidence',
                    onClick: () =>
                      onReviewCandidate(candidate, 'needs_more_evidence'),
                  },
                ]}
              />
            );
          },
        },
      ]}
    />
  );
};

const renderContextTab = (report: Record<string, unknown>) => {
  const inputSnapshot = readObjectField(report, [
    'inputSnapshot',
    'input_snapshot',
  ]);
  const searchContext = readObjectField(inputSnapshot, [
    'searchContext',
    'search_context',
  ]);
  const items = toRecordList(readArrayField(searchContext, ['items']));
  const quality = readObjectField(report, [
    'searchContextQuality',
    'search_context_quality',
  ]);
  const blockers = readArrayField(quality, ['blockers']);
  const warnings = readArrayField(quality, ['warnings']);

  return (
    <div className="flex flex-col gap-4">
      {blockers.length ? (
        <Alert
          type="error"
          showIcon
          title="质量门禁阻断"
          description={blockers
            .map((item) => toTextValue(readField(item, ['message']), ''))
            .join('；')}
        />
      ) : null}
      {warnings.length ? (
        <Alert
          type="warning"
          showIcon
          title="质量风险"
          description={warnings
            .map((item) => toTextValue(readField(item, ['message']), ''))
            .join('；')}
        />
      ) : null}
      <Table<Record<string, unknown>>
        rowKey={(record, index) =>
          `${toTextValue(readField(record, ['requirement_id', 'requirementId']), '')}-${index}`
        }
        size="small"
        pagination={false}
        dataSource={items}
        scroll={{ x: 920 }}
        columns={[
          {
            title: '原始条件',
            dataIndex: 'original',
            width: 220,
            ellipsis: true,
            render: (_, record) => toTextValue(readField(record, ['original'])),
          },
          {
            title: '类型',
            dataIndex: 'requirement_type',
            width: 88,
            render: (_, record) =>
              renderRequirementType(
                toTextValue(
                  readField(record, ['requirement_type', 'requirementType']),
                  '',
                ),
              ),
          },
          {
            title: '属性',
            dataIndex: 'attribute_key',
            width: 140,
            render: (_, record) =>
              toTextValue(readField(record, ['attribute_key', 'attributeKey'])),
          },
          {
            title: 'terms',
            dataIndex: 'terms',
            render: (_, record) =>
              toTextValue(readArrayField(record, ['terms']), '-'),
          },
          {
            title: 'term_groups',
            dataIndex: 'term_groups',
            render: (_, record) =>
              toRecordList(
                readArrayField(record, ['term_groups', 'termGroups']),
              )
                .map(
                  (group) =>
                    `${toTextValue(readField(group, ['original']))}: ${toTextValue(readArrayField(group, ['terms']), '-')}`,
                )
                .join('；') || '-',
          },
        ]}
      />
    </div>
  );
};

const renderRunTraceDetail = (
  run: SalesSearchRun | undefined,
  report?: Record<string, unknown>,
  candidates: SalesAccountProfile[] = [],
  onReviewCandidate?: (
    candidate: SalesAccountProfile,
    reviewStatus: SalesAccountProfileReviewStatus,
  ) => void,
  reviewingCandidateId?: string,
) => {
  const safeReport = normalizeRunReportForDisplay(report);
  if (!Object.keys(safeReport).length) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无执行报告" />
    );
  }
  return (
    <Tabs
      destroyOnHidden
      items={[
        {
          key: 'trace',
          label: '执行链路',
          children: renderTraceTab(run, safeReport),
        },
        {
          key: 'context',
          label: 'SearchContext',
          children: renderContextTab(safeReport),
        },
        {
          key: 'coverage',
          label: 'ICP 覆盖',
          children: renderCoverageTab(safeReport),
        },
        {
          key: 'queries',
          label: 'Query 计划',
          children: renderQueriesTab(safeReport),
        },
        {
          key: 'execution',
          label: '搜索执行',
          children: renderExecutionTab(safeReport),
        },
        {
          key: 'results',
          label: '搜索结果',
          children: renderSearchResultsTab(safeReport),
        },
        {
          key: 'leads',
          label: '线索画像',
          children: renderLeadProfilesTab(
            safeReport,
            candidates,
            onReviewCandidate,
            reviewingCandidateId,
          ),
        },
        {
          key: 'raw',
          label: '原始 JSON',
          children: (
            <pre className="max-h-[calc(100vh-240px)] overflow-auto rounded-lg bg-[var(--ant-color-fill-quaternary)] p-4 text-xs leading-5">
              {toJsonText(safeReport)}
            </pre>
          ),
        },
      ]}
    />
  );
};

const IcpModelingPage: FC = () => {
  const queryClient = useQueryClient();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [taskQuery, setTaskQuery] = useState<SalesTaskQuery>({
    pageNum: 1,
    pageSize: 10,
  });
  const [templateQuery, setTemplateQuery] = useState<SalesTemplateQuery>({
    pageNum: 1,
    pageSize: 10,
  });
  const [taskKeyword, setTaskKeyword] = useState('');
  const [taskStatus, setTaskStatus] = useState<string>();
  const [templateKeyword, setTemplateKeyword] = useState('');
  const [templateStatus, setTemplateStatus] = useState<string>();
  const [editor, setEditor] = useState<TemplateEditorState>();
  const [editorOpening, setEditorOpening] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SalesTask>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<string>();
  const [previewState, setPreviewState] = useState<PreviewState>({
    open: false,
    title: '',
  });
  const [accountProfileReview, setAccountProfileReview] =
    useState<AccountProfileReviewState>();
  const [accountProfileReviewSaving, setAccountProfileReviewSaving] =
    useState(false);
  const [createTaskTemplate, setCreateTaskTemplate] =
    useState<SalesIcpTemplate>();
  const [createTaskName, setCreateTaskName] = useState('');
  const [taskCreating, setTaskCreating] = useState(false);
  const [taskListOpen, setTaskListOpen] = useState(false);
  const [templateListOpen, setTemplateListOpen] = useState(false);
  const [runListOpen, setRunListOpen] = useState(false);

  const policyQuery = useQuery({
    queryKey: ['sales-icp-policy'],
    queryFn: () => getSalesIcpPolicy().then((res) => res.data),
  });

  const taskPageQuery = useQuery({
    queryKey: ['sales-task-page', taskQuery],
    queryFn: () => querySalesTaskPage(taskQuery),
  });

  const templatePageQuery = useQuery({
    queryKey: ['sales-template-page', templateQuery],
    queryFn: () => querySalesTemplatePage(templateQuery),
  });

  const runPageQuery = useQuery({
    queryKey: ['sales-search-run-page'],
    queryFn: () => querySalesSearchRunPage({ pageNum: 1, pageSize: 10 }),
  });

  const selectedTaskId = selectedTask?.id;
  const selectedTaskRunQuery = useQuery({
    queryKey: ['sales-search-run-page', 'task', selectedTaskId],
    queryFn: () =>
      querySalesSearchRunPage({
        taskId: selectedTaskId,
        pageNum: 1,
        pageSize: 5,
      }),
    enabled: detailOpen && Boolean(selectedTaskId),
  });

  const previewRunId = previewState.open ? previewState.run?.id : undefined;
  const runAccountProfileQuery = useQuery({
    queryKey: ['sales-run-account-profiles', previewRunId],
    queryFn: () => querySalesRunAccountProfiles(previewRunId as SalesId),
    enabled: previewState.open && Boolean(previewRunId),
  });

  const policies = useMemo(
    () =>
      getVisibleIcpAttributePolicies(policyQuery.data?.attributePolicies || []),
    [policyQuery.data?.attributePolicies],
  );

  const policyByKey = useMemo(
    () => new Map(policies.map((item) => [item.key, item])),
    [policies],
  );

  const attributeLabelMap = useMemo(
    () => new Map(policies.map((item) => [item.key, item.name || item.key])),
    [policies],
  );

  const policyOptions = useMemo(
    () =>
      policies.map((item) => ({
        label: item.name || item.key,
        value: item.key,
      })),
    [policies],
  );

  const policyScoreWeight = (attrKey?: string | null) => {
    if (!attrKey) return 10;
    const policy = policyByKey.get(attrKey);
    return Number(policy?.scoreWeight ?? policy?.score_weight) || 10;
  };

  const isPolicyRequired = (attrKey?: string | null) => {
    if (!attrKey) return false;
    const policy = policyByKey.get(attrKey);
    return (
      policy?.required === true ||
      policy?.required === '1' ||
      policy?.required === 1
    );
  };

  const policyDefaultRequirementType = (attrKey?: string | null) =>
    isPolicyRequired(attrKey) ? 'required' : 'preferred';

  const selectedSystemAttrKeys = (currentIndex?: number) =>
    new Set(
      (editor?.data.items || [])
        .filter(
          (item, index) =>
            index !== currentIndex &&
            item.attrSource === 'system' &&
            item.attrKey,
        )
        .map((item) => String(item.attrKey)),
    );

  const policyOptionsForItem = (index: number) => {
    const usedKeys = selectedSystemAttrKeys(index);
    return policyOptions.map((option) => ({
      ...option,
      disabled: usedKeys.has(String(option.value)),
    }));
  };

  const refreshSalesData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sales-task-page'] }),
      queryClient.invalidateQueries({ queryKey: ['sales-template-page'] }),
      queryClient.invalidateQueries({ queryKey: ['sales-search-run-page'] }),
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard-trends'] }),
    ]);
  };

  const applyTaskQuery = () => {
    setTaskQuery((prev) => ({
      ...prev,
      pageNum: 1,
      taskName: taskKeyword.trim() || undefined,
      status: taskStatus,
    }));
  };

  const resetTaskQuery = () => {
    setTaskKeyword('');
    setTaskStatus(undefined);
    setTaskQuery({ pageNum: 1, pageSize: taskQuery.pageSize || 10 });
  };

  const applyTemplateQuery = () => {
    setTemplateQuery((prev) => ({
      ...prev,
      pageNum: 1,
      tplName: templateKeyword.trim() || undefined,
      status: templateStatus,
    }));
  };

  const resetTemplateQuery = () => {
    setTemplateKeyword('');
    setTemplateStatus(undefined);
    setTemplateQuery({ pageNum: 1, pageSize: templateQuery.pageSize || 10 });
  };

  const handleTaskTableChange = (pagination: TablePaginationConfig) => {
    setTaskQuery((prev) => ({
      ...prev,
      pageNum: pagination.current || 1,
      pageSize: pagination.pageSize || prev.pageSize || 10,
    }));
  };

  const handleTemplateTableChange = (pagination: TablePaginationConfig) => {
    setTemplateQuery((prev) => ({
      ...prev,
      pageNum: pagination.current || 1,
      pageSize: pagination.pageSize || prev.pageSize || 10,
    }));
  };

  const createInitialTemplateItems = (
    attributePolicies: SalesIcpAttributePolicy[] = policies,
  ) => {
    const defaultItems = buildDefaultTemplateItems(attributePolicies);
    return defaultItems.length > 0
      ? defaultItems
      : [createEmptyTemplateItem('system', 1)];
  };

  const loadIcpPolicy = async () => {
    if (policyQuery.data?.attributePolicies?.length) return policyQuery.data;
    return queryClient.fetchQuery({
      queryKey: ['sales-icp-policy'],
      queryFn: () => getSalesIcpPolicy().then((res) => res.data),
    });
  };

  const openCreateEditor = async () => {
    setEditorOpening(true);
    try {
      const policy = await loadIcpPolicy();
      setEditor({
        open: true,
        mode: 'create',
        source: 'manual',
        data: {
          tplName: '',
          description: '',
          status: '1',
          items: createInitialTemplateItems(policy?.attributePolicies || []),
        },
      });
    } finally {
      setEditorOpening(false);
    }
  };

  const openEditEditor = (template: SalesIcpTemplate) => {
    setEditor({
      open: true,
      mode: 'edit',
      data: fromTemplate(template),
    });
  };

  const generateTemplateDraft = async () => {
    const finalPrompt = prompt.trim();
    if (!finalPrompt) {
      messageApi.warning('请输入客户需求');
      return;
    }
    setGenerating(true);
    try {
      const response = await generateSalesTemplate({ prompt: finalPrompt });
      if (!response.data) {
        messageApi.error('生成结果为空，请重新生成');
        return;
      }
      setEditor({
        open: true,
        mode: 'create',
        source: 'generated',
        data: fromTemplate(response.data),
      });
      setPrompt('');
      messageApi.success('已生成 ICP 草稿，请确认后创建任务');
    } finally {
      setGenerating(false);
    }
  };

  const updateEditorData = (patch: Partial<TemplateFormState>) => {
    setEditor((prev) =>
      prev
        ? {
            ...prev,
            data: { ...prev.data, ...patch },
          }
        : prev,
    );
  };

  const updateEditorItem = (
    index: number,
    patch: Partial<SalesIcpTemplateItem>,
  ) => {
    setEditor((prev) => {
      if (!prev) return prev;
      const items = prev.data.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      );
      return { ...prev, data: { ...prev.data, items } };
    });
  };

  const addEditorItem = (attrSource: 'system' | 'custom') => {
    setEditor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: {
          ...prev.data,
          items: [
            ...prev.data.items,
            createEmptyTemplateItem(attrSource, prev.data.items.length + 1),
          ],
        },
      };
    });
  };

  const removeEditorItem = (index: number) => {
    setEditor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: {
          ...prev.data,
          items: prev.data.items.filter((_, itemIndex) => itemIndex !== index),
        },
      };
    });
  };

  const normalizeEditorItems = () => {
    const data = editor?.data;
    if (!data) return [];
    return data.items
      .map((item, index) => {
        if (item.attrSource === 'system') {
          const policy = item.attrKey
            ? policyByKey.get(item.attrKey)
            : undefined;
          const requirementType = policyDefaultRequirementType(item.attrKey);
          return {
            ...item,
            attrName: policy?.name || item.attrName,
            requirementType,
            matchMode: item.matchMode || 'all',
            scoreWeight:
              Number(item.scoreWeight) || policyScoreWeight(item.attrKey),
            valueText: item.valueText.trim(),
            sortOrder: index + 1,
            enabled: item.enabled !== false || Boolean(item.valueText.trim()),
          };
        }
        return {
          ...item,
          attrKey: undefined,
          attrName: item.attrName.trim(),
          requirementType: item.requirementType || 'preferred',
          matchMode: item.matchMode || 'all',
          scoreWeight: Number(item.scoreWeight) || 10,
          valueText: item.valueText.trim(),
          sortOrder: index + 1,
          enabled: item.enabled !== false || Boolean(item.valueText.trim()),
        };
      })
      .filter((item) => {
        if (item.attrSource === 'system') {
          return (
            isPolicyRequired(item.attrKey) ||
            item.enabled !== false ||
            item.valueText
          );
        }
        return item.enabled !== false || item.valueText;
      });
  };

  const buildEditorPayload = (nameLabel: '任务名称' | '模板名称') => {
    if (!editor) return;
    const name = editor.data.tplName.trim();
    if (!name) {
      messageApi.warning(`请输入${nameLabel}`);
      return;
    }
    const items = normalizeEditorItems();
    if (items.length === 0) {
      messageApi.warning('请至少维护一个 ICP 条件');
      return;
    }
    const invalid = items.find((item) => {
      if (item.attrSource === 'system') {
        if (!item.attrKey) return true;
        if (isPolicyRequired(item.attrKey)) return !item.valueText;
        return item.enabled !== false && !item.valueText;
      }
      return !item.attrName || !item.valueText;
    });
    if (invalid) {
      messageApi.warning('请补全属性和值');
      return;
    }
    const duplicate = items.find((item, index) => {
      const identity =
        item.attrSource === 'system'
          ? item.attrKey
          : item.attrName.trim().toLowerCase();
      return items.some((other, otherIndex) => {
        if (otherIndex >= index) return false;
        const otherIdentity =
          other.attrSource === 'system'
            ? other.attrKey
            : other.attrName.trim().toLowerCase();
        return (
          other.attrSource === item.attrSource && otherIdentity === identity
        );
      });
    });
    if (duplicate) {
      messageApi.warning(`属性「${duplicate.attrName}」不能重复`);
      return;
    }

    return {
      name,
      description: editor.data.description?.trim(),
      status: editor.data.status,
      items,
    };
  };

  const saveTemplate = async () => {
    if (!editor) return;
    const payload = buildEditorPayload('模板名称');
    if (!payload) return;

    setEditorSaving(true);
    try {
      if (editor.data.id) {
        await updateSalesTemplate({
          id: editor.data.id,
          tplName: payload.name,
          description: payload.description,
          status: payload.status,
          items: payload.items,
        });
        messageApi.success('ICP 模板已更新');
      } else {
        await createSalesTemplate({
          tplName: payload.name,
          description: payload.description,
          status: payload.status,
          items: payload.items,
        });
        messageApi.success('ICP 模板已保存');
      }
      setEditor(undefined);
      await refreshSalesData();
    } finally {
      setEditorSaving(false);
    }
  };

  const createTaskFromEditor = async () => {
    if (!editor) return;
    const payload = buildEditorPayload('任务名称');
    if (!payload) return;

    setEditorSaving(true);
    try {
      const response = await createSalesTask({
        taskName: payload.name,
        description: payload.description,
        requirements: requirementsFromTemplateItems(payload.items),
      });
      if (response.data) {
        setSelectedTask(response.data);
        setDetailOpen(true);
      }
      setEditor(undefined);
      await refreshSalesData();
      messageApi.success(
        response.data?.status === 'blocked'
          ? '任务已创建，需补全 ICP 后开始'
          : '任务已创建',
      );
    } finally {
      setEditorSaving(false);
    }
  };

  const openTaskDetail = async (task: SalesTask) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const response = await getSalesTask(task.id);
      setSelectedTask(response.data || task);
    } finally {
      setDetailLoading(false);
    }
  };

  const startTaskExecution = async (task: SalesTask) => {
    const key = `start-${task.id}`;
    setPreviewLoading(key);
    try {
      await startSalesTask(task.id);
      messageApi.success('任务已开启');
      await queryClient.invalidateQueries({ queryKey: ['sales-task-page'] });
      await queryClient.invalidateQueries({
        queryKey: ['sales-search-run-page'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['sales-dashboard-overview'],
      });
    } finally {
      setPreviewLoading(undefined);
    }
  };

  const openRunReport = async (run: SalesSearchRun) => {
    setPreviewState({
      open: true,
      title: `执行详情：${run.id}`,
      data: run.report || run.raw.report || {},
      run,
    });
    setPreviewLoading(`run-${run.id}`);
    try {
      const response = await getSalesSearchRun(run.id);
      if (response.data) {
        setPreviewState({
          open: true,
          title: `执行详情：${response.data.id}`,
          data: response.data.report || response.data.raw.report || {},
          run: response.data,
        });
      }
    } finally {
      setPreviewLoading(undefined);
    }
  };

  const openAccountProfileReview = (
    profile: SalesAccountProfile,
    reviewStatus: SalesAccountProfileReviewStatus,
  ) => {
    setAccountProfileReview({
      profile,
      reviewStatus,
      reviewNote: profile.reviewNote || '',
    });
  };

  const submitAccountProfileReview = async () => {
    if (!accountProfileReview) return;
    setAccountProfileReviewSaving(true);
    try {
      await updateSalesAccountProfileReview(accountProfileReview.profile.id, {
        reviewStatus: accountProfileReview.reviewStatus,
        reviewNote: accountProfileReview.reviewNote.trim() || undefined,
      });
      messageApi.success('审核状态已保存');
      setAccountProfileReview(undefined);
      await queryClient.invalidateQueries({
        queryKey: ['sales-run-account-profiles', previewRunId],
      });
    } finally {
      setAccountProfileReviewSaving(false);
    }
  };

  const submitCreateTask = async () => {
    if (!createTaskTemplate) return;
    setTaskCreating(true);
    try {
      const response = await createSalesTaskFromTemplate(
        createTaskTemplate.id,
        {
          taskName: createTaskName.trim() || undefined,
        },
      );
      if (response.data) {
        setSelectedTask(response.data);
        setDetailOpen(true);
      }
      setCreateTaskName('');
      setCreateTaskTemplate(undefined);
      await refreshSalesData();
      messageApi.success('任务已创建');
    } finally {
      setTaskCreating(false);
    }
  };

  const toggleTemplateStatus = async (template: SalesIcpTemplate) => {
    const nextStatus = template.status === '1' ? '0' : '1';
    await updateSalesTemplate({
      id: template.id,
      tplName: template.tplName,
      description: template.description,
      status: nextStatus,
    });
    await refreshSalesData();
    messageApi.success(nextStatus === '1' ? '模板已启用' : '模板已停用');
  };

  const confirmDeleteTemplate = (template: SalesIcpTemplate) => {
    modalApi.confirm({
      title: '删除 ICP 模板',
      content: `删除后，模板「${template.tplName}」不能再用于创建新任务。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await deleteSalesTemplates([template.id]);
        await refreshSalesData();
        messageApi.success('模板已删除');
      },
    });
  };

  const taskColumns: ColumnsType<SalesTask> = [
    {
      title: '任务名称',
      dataIndex: 'taskName',
      width: 240,
      ellipsis: true,
    },
    {
      title: '模板ID',
      dataIndex: 'templateId',
      width: 180,
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_, record) => renderTaskStatus(record),
    },
    {
      title: 'ICP 条件',
      dataIndex: 'requirements',
      render: (_, record) => {
        const count = record.requirements?.length || 0;
        return count ? `${count} 项` : '-';
      },
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 156,
      fixed: 'right',
      render: (_, record) => (
        <TableActions
          maxVisible={3}
          actions={[
            {
              key: 'detail',
              label: '详情',
              icon: <EyeOutlined />,
              onClick: () => void openTaskDetail(record),
            },
            {
              key: 'start',
              label: record.status === 'running' ? '执行中' : '开启任务',
              icon: <PlayCircleOutlined />,
              disabled: !record.canStart || record.status === 'running',
              loading: previewLoading === `start-${record.id}`,
              onClick: () => void startTaskExecution(record),
            },
          ]}
        />
      ),
    },
  ];

  const templateColumns: ColumnsType<SalesIcpTemplate> = [
    {
      title: '模板名称',
      dataIndex: 'tplName',
      width: 220,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 96,
      render: renderTemplateStatus,
    },
    {
      title: '属性',
      dataIndex: 'items',
      render: (_, record) => templateItemSummary(record),
    },
    {
      title: '说明',
      dataIndex: 'description',
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 156,
      fixed: 'right',
      render: (_, record) => (
        <TableActions
          maxVisible={3}
          actions={[
            {
              key: 'create',
              label: '创建任务',
              icon: <PlayCircleOutlined />,
              disabled: record.status !== '1',
              onClick: () => {
                setCreateTaskTemplate(record);
                setCreateTaskName(record.tplName);
              },
            },
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              onClick: () => openEditEditor(record),
            },
            {
              key: 'toggle',
              label: record.status === '1' ? '停用' : '启用',
              icon: <ReloadOutlined />,
              onClick: () => void toggleTemplateStatus(record),
            },
            {
              key: 'delete',
              label: '删除',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => confirmDeleteTemplate(record),
            },
          ]}
        />
      ),
    },
  ];

  const runColumns: ColumnsType<SalesSearchRun> = [
    {
      title: '运行ID',
      dataIndex: 'id',
      width: 180,
      ellipsis: true,
    },
    {
      title: '任务ID',
      dataIndex: 'taskId',
      width: 180,
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'runType',
      width: 112,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 112,
      render: renderRunStatus,
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 88,
      fixed: 'right',
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'report',
              label: '执行详情',
              icon: <EyeOutlined />,
              onClick: () => void openRunReport(record),
            },
          ]}
        />
      ),
    },
  ];

  const taskRunColumns: ColumnsType<SalesSearchRun> = [
    {
      title: '运行ID',
      dataIndex: 'id',
      width: 160,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 96,
      render: renderRunStatus,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      width: 120,
      render: (value?: number) =>
        typeof value === 'number' ? (
          <Progress percent={value} size="small" />
        ) : (
          '-'
        ),
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      width: 168,
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 96,
      fixed: 'right',
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => void openRunReport(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  const editorItemColumns: ColumnsType<SalesIcpTemplateItem> = [
    {
      title: '来源',
      dataIndex: 'attrSource',
      width: 112,
      render: (value, _record, index) => (
        <Select
          value={value}
          style={{ width: 96 }}
          options={[
            { label: '内置', value: 'system' },
            { label: '自定义', value: 'custom' },
          ]}
          onChange={(nextValue) =>
            updateEditorItem(index, {
              attrSource: nextValue,
              attrKey: undefined,
              attrName: '',
              requirementType: 'preferred',
              matchMode: 'all',
              scoreWeight: 10,
              valueText: '',
              enabled: nextValue === 'custom',
            })
          }
        />
      ),
    },
    {
      title: '属性',
      dataIndex: 'attrName',
      width: 220,
      render: (_, record, index) =>
        record.attrSource === 'system' ? (
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            value={record.attrKey || undefined}
            style={{ width: '100%' }}
            placeholder="选择内置属性"
            options={policyOptionsForItem(index)}
            onChange={(attrKey) => {
              const policy = policyByKey.get(attrKey);
              const requirementType = policyDefaultRequirementType(attrKey);
              updateEditorItem(index, {
                attrKey,
                attrName: policy?.name || attrKey,
                requirementType,
                matchMode: 'all',
                scoreWeight: policyScoreWeight(attrKey),
                valueText: '',
                enabled: isPolicyRequired(attrKey),
              });
            }}
          />
        ) : (
          <Input
            maxLength={64}
            value={record.attrName}
            placeholder="属性名"
            onChange={(event) =>
              updateEditorItem(index, { attrName: event.target.value })
            }
          />
        ),
    },
    {
      title: '权重',
      dataIndex: 'scoreWeight',
      width: 104,
      render: (value, _, index) => (
        <InputNumber
          min={1}
          max={100}
          precision={0}
          value={Number(value) || 10}
          style={{ width: 88 }}
          onChange={(scoreWeight) =>
            updateEditorItem(index, { scoreWeight: Number(scoreWeight) || 10 })
          }
        />
      ),
    },
    {
      title: '属性值',
      dataIndex: 'valueText',
      width: 300,
      render: (value: string, record, index) => (
        <Input
          value={value}
          style={{ minWidth: 260 }}
          placeholder="输入属性要求"
          onChange={(event) => {
            const text = event.target.value;
            updateEditorItem(index, {
              valueText: text,
              enabled: text.trim() ? true : record.enabled,
            });
          }}
        />
      ),
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (value: boolean, record, index) => (
        <Switch
          checked={isPolicyRequired(record.attrKey) || value !== false}
          disabled={isPolicyRequired(record.attrKey)}
          onChange={(enabled) => updateEditorItem(index, { enabled })}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 64,
      render: (_, __, index) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          size="small"
          type="link"
          onClick={() => removeEditorItem(index)}
        />
      ),
    },
  ];

  const selectedTaskRequirements = selectedTask?.requirements || [];
  const visibleTaskCards = useMemo(
    () =>
      (taskPageQuery.data?.rows || [])
        .slice(0, 3)
        .map((task) => ({ task, card: buildTaskCardView(task) })),
    [taskPageQuery.data?.rows],
  );
  const visibleTemplateCards = useMemo(
    () =>
      (templatePageQuery.data?.rows || []).slice(0, 3).map((template) => ({
        template,
        card: buildTemplateCardView(template),
      })),
    [templatePageQuery.data?.rows],
  );
  const editorIsTemplateEdit = editor?.mode === 'edit';
  const editorTitle = editorIsTemplateEdit
    ? '编辑 ICP 模板'
    : editor?.source === 'generated'
      ? '确认并创建任务'
      : '创建获客任务';
  const editorNamePlaceholder = editorIsTemplateEdit ? '模板名称' : '任务名称';
  const editorDescriptionPlaceholder = editorIsTemplateEdit
    ? '模板说明'
    : '任务说明';
  const editorPrimaryActionText = editorIsTemplateEdit
    ? '保存模板'
    : '创建任务';

  const renderCardTags = (tags: string[]) => {
    if (tags.length === 0) {
      return <Tag>暂无条件</Tag>;
    }
    return tags.map((tag) => <Tag key={tag}>{tag}</Tag>);
  };

  const renderCardEmptyState = (description: string, helpText: string) => (
    <div className="rounded-lg border border-dashed border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] px-4">
      <div className="flex min-h-[212px] flex-col items-center justify-center gap-2 text-center">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={description}
          styles={{ image: { height: 34, marginBottom: 8 } }}
        />
        <div className="text-xs text-[var(--ant-color-text-tertiary)]">
          {helpText}
        </div>
      </div>
    </div>
  );

  return (
    <PageContainer breadcrumbRender={false} title={false}>
      {messageContextHolder}
      {modalContextHolder}
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8">
        <div className="mx-auto flex min-h-[380px] w-full max-w-[820px] flex-col items-center justify-center text-center">
          <div className="mb-6 text-[32px] font-semibold leading-10 text-[var(--ant-color-text)]">
            客户画像建模
          </div>
          <div className="w-full overflow-hidden rounded-[24px] border border-solid border-[rgba(218,224,235,0.95)] bg-[rgba(255,255,255,0.96)] shadow-[0_24px_64px_rgba(25,33,61,0.10)]">
            <TextArea
              autoSize={{ minRows: 4, maxRows: 8 }}
              className="text-[15px] leading-7 shadow-none"
              placeholder="例如：寻找沙特市场做工业阀门进口和分销的公司，优先有工程项目案例，不要维修服务商。"
              style={{ padding: '20px 28px 12px' }}
              value={prompt}
              variant="borderless"
              onChange={(event) => setPrompt(event.target.value)}
            />
            <div className="flex min-h-[58px] flex-wrap items-center justify-between gap-3 px-4 pb-3">
              <Button
                icon={<EditOutlined />}
                loading={editorOpening}
                onClick={() => void openCreateEditor()}
              >
                自主构建模型
              </Button>
              <Button
                type="primary"
                icon={<StarOutlined />}
                loading={generating}
                disabled={!prompt.trim()}
                onClick={() => void generateTemplateDraft()}
              >
                {generating ? '生成中' : '生成草稿'}
              </Button>
            </div>
          </div>
        </div>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-solid border-[var(--ant-color-border-secondary)] pb-3">
            <div className="text-lg font-semibold">最近任务记录</div>
            <Button
              type="link"
              className="h-auto p-0 font-medium"
              onClick={() => setTaskListOpen(true)}
            >
              查看全部任务
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {visibleTaskCards.length > 0 ? (
              visibleTaskCards.map(({ task, card }) => (
                <div
                  key={card.id}
                  className="flex min-h-[204px] flex-col justify-between rounded-lg border border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Tooltip title={card.title}>
                          <div className="truncate text-base font-semibold">
                            {card.title}
                          </div>
                        </Tooltip>
                        <div className="mt-1 text-xs text-[var(--ant-color-text-tertiary)]">
                          {formatDateTime(card.createTime)}
                        </div>
                      </div>
                      <Tag color={card.statusColor}>{card.statusText}</Tag>
                    </div>
                    <div className="mt-3 line-clamp-2 min-h-11 text-sm leading-6 text-[var(--ant-color-text-secondary)]">
                      {card.description}
                    </div>
                    <div className="mt-3 flex min-h-7 flex-wrap gap-1">
                      {renderCardTags(card.tags)}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button onClick={() => void openTaskDetail(task)}>
                      查看详情
                    </Button>
                    <Button
                      type="primary"
                      disabled={!task.canStart || task.status === 'running'}
                      loading={previewLoading === `start-${task.id}`}
                      onClick={() => void startTaskExecution(task)}
                    >
                      {task.status === 'running' ? '执行中' : '开启任务'}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="lg:col-span-3">
                {renderCardEmptyState('暂无任务记录', '创建后展示最近任务')}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-solid border-[var(--ant-color-border-secondary)] pb-3">
            <div className="text-lg font-semibold">客户画像模板</div>
            <Button
              type="link"
              className="h-auto p-0 font-medium"
              onClick={() => setTemplateListOpen(true)}
            >
              管理模板
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {visibleTemplateCards.length > 0 ? (
              visibleTemplateCards.map(({ template, card }) => (
                <div
                  key={card.id}
                  className="flex min-h-[218px] flex-col justify-between rounded-lg border border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-base font-semibold">
                          {card.title}
                        </div>
                        <div className="mt-1 text-xs text-[var(--ant-color-text-tertiary)]">
                          {formatDateTime(card.createTime)}
                        </div>
                      </div>
                      <Tag color={card.statusColor}>{card.statusText}</Tag>
                    </div>
                    <div className="mt-3 line-clamp-2 min-h-11 text-sm leading-6 text-[var(--ant-color-text-secondary)]">
                      {card.description}
                    </div>
                    <div className="mt-3 flex min-h-7 flex-wrap gap-1">
                      {renderCardTags(card.tags)}
                    </div>
                  </div>
                  <Button
                    className="mt-4"
                    type="primary"
                    disabled={template.status !== '1'}
                    onClick={() => {
                      setCreateTaskTemplate(template);
                      setCreateTaskName(template.tplName);
                    }}
                  >
                    使用模板
                  </Button>
                </div>
              ))
            ) : (
              <div className="lg:col-span-3">
                {renderCardEmptyState(
                  '暂无客户画像模板',
                  '保存后展示可复用模板',
                )}
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] px-5 py-4">
          <div>
            <div className="font-semibold">搜索运行记录</div>
            <Text type="secondary">
              运行明细下沉到列表查看，不占用建模首屏。
            </Text>
          </div>
          <Button onClick={() => setRunListOpen(true)}>查看运行记录</Button>
        </section>
      </div>

      <Modal
        title={editorTitle}
        open={Boolean(editor?.open)}
        width={1180}
        destroyOnHidden
        onCancel={() => setEditor(undefined)}
        footer={
          editor ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                {editor.mode !== 'edit' ? (
                  <Button
                    disabled={editorSaving}
                    onClick={() => void saveTemplate()}
                  >
                    另存为模板
                  </Button>
                ) : null}
              </div>
              <Space>
                <Button
                  disabled={editorSaving}
                  onClick={() => setEditor(undefined)}
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  loading={editorSaving}
                  onClick={() =>
                    void (editor.mode === 'edit'
                      ? saveTemplate()
                      : createTaskFromEditor())
                  }
                >
                  {editorPrimaryActionText}
                </Button>
              </Space>
            </div>
          ) : null
        }
      >
        {editor ? (
          <div className="flex flex-col gap-4">
            <div
              className={
                editor.mode === 'edit'
                  ? 'grid grid-cols-1 gap-3 md:grid-cols-2'
                  : 'grid grid-cols-1 gap-3'
              }
            >
              <Input
                value={editor.data.tplName}
                placeholder={editorNamePlaceholder}
                onChange={(event) =>
                  updateEditorData({ tplName: event.target.value })
                }
              />
              {editor.mode === 'edit' ? (
                <Select
                  value={editor.data.status}
                  options={[
                    { label: '启用', value: '1' },
                    { label: '停用', value: '0' },
                  ]}
                  onChange={(status) => updateEditorData({ status })}
                />
              ) : null}
            </div>
            <TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              value={editor.data.description}
              placeholder={editorDescriptionPlaceholder}
              onChange={(event) =>
                updateEditorData({ description: event.target.value })
              }
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => addEditorItem('system')}>
                添加内置属性
              </Button>
              <Button onClick={() => addEditorItem('custom')}>
                添加自定义属性
              </Button>
            </div>
            <Table<SalesIcpTemplateItem>
              rowKey={(record, index) => `${record.id || index}`}
              columns={editorItemColumns}
              dataSource={editor.data.items}
              pagination={false}
              size="small"
              scroll={{ x: 1120 }}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        title="创建任务"
        open={Boolean(createTaskTemplate)}
        confirmLoading={taskCreating}
        destroyOnHidden
        okText="创建"
        cancelText="取消"
        onOk={() => void submitCreateTask()}
        onCancel={() => {
          setCreateTaskTemplate(undefined);
          setCreateTaskName('');
        }}
      >
        <div className="flex flex-col gap-3">
          <Descriptions
            size="small"
            bordered
            column={1}
            items={[
              { label: '模板', children: createTaskTemplate?.tplName || '-' },
              {
                label: '属性数',
                children: createTaskTemplate?.items.length || 0,
              },
            ]}
          />
          <Input
            value={createTaskName}
            placeholder="任务名称"
            onChange={(event) => setCreateTaskName(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        title="线索审核"
        open={Boolean(accountProfileReview)}
        confirmLoading={accountProfileReviewSaving}
        destroyOnHidden
        okText="保存"
        cancelText="取消"
        onOk={() => void submitAccountProfileReview()}
        onCancel={() => setAccountProfileReview(undefined)}
      >
        {accountProfileReview ? (
          <div className="flex flex-col gap-3">
            <Descriptions
              size="small"
              bordered
              column={1}
              items={[
                {
                  label: '公司',
                  children:
                    accountProfileReview.profile.displayName ||
                    accountProfileReview.profile.primaryDomain ||
                    '-',
                },
                {
                  label: '域名',
                  children: accountProfileReview.profile.primaryDomain || '-',
                },
                {
                  label: '系统判断',
                  children: renderDecisionStatus(
                    accountProfileReview.profile.decision,
                  ),
                },
              ]}
            />
            <Select
              value={accountProfileReview.reviewStatus}
              options={[
                { label: '确认线索', value: 'approved' },
                { label: '排除线索', value: 'rejected' },
                { label: '待补证', value: 'needs_more_evidence' },
                { label: '待审核', value: 'pending' },
              ]}
              onChange={(reviewStatus) =>
                setAccountProfileReview((prev) =>
                  prev ? { ...prev, reviewStatus } : prev,
                )
              }
            />
            <TextArea
              autoSize={{ minRows: 3, maxRows: 6 }}
              maxLength={500}
              showCount
              value={accountProfileReview.reviewNote}
              placeholder="填写审核原因或补证要求"
              onChange={(event) =>
                setAccountProfileReview((prev) =>
                  prev ? { ...prev, reviewNote: event.target.value } : prev,
                )
              }
            />
          </div>
        ) : null}
      </Modal>

      <Drawer
        title="任务列表"
        open={taskListOpen}
        size={1080}
        destroyOnHidden
        onClose={() => setTaskListOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Space size={8} wrap>
              <Input
                allowClear
                placeholder="任务名称"
                value={taskKeyword}
                style={{ width: 220 }}
                onChange={(event) => setTaskKeyword(event.target.value)}
                onPressEnter={applyTaskQuery}
              />
              <Select
                allowClear
                placeholder="任务状态"
                value={taskStatus}
                style={{ width: 140 }}
                options={[
                  { label: '待补全', value: 'blocked' },
                  { label: '待开始', value: 'ready' },
                  { label: '执行中', value: 'running' },
                  { label: '已完成', value: 'completed' },
                  { label: '执行失败', value: 'failed' },
                  { label: '已取消', value: 'canceled' },
                ]}
                onChange={setTaskStatus}
              />
              <Button type="primary" onClick={applyTaskQuery}>
                查询
              </Button>
              <Button onClick={resetTaskQuery}>重置</Button>
            </Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void refreshSalesData()}
            >
              刷新
            </Button>
          </div>
          <Table<SalesTask>
            className="recov-stable-pagination-table"
            rowKey={(record) => String(record.id)}
            columns={taskColumns}
            dataSource={taskPageQuery.data?.rows || []}
            loading={taskPageQuery.isLoading || taskPageQuery.isFetching}
            size="middle"
            scroll={{ x: 1180 }}
            pagination={{
              current: taskQuery.pageNum,
              pageSize: taskQuery.pageSize,
              total: taskPageQuery.data?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            onChange={handleTaskTableChange}
          />
        </div>
      </Drawer>

      <Drawer
        title="ICP 模板管理"
        open={templateListOpen}
        size={1080}
        destroyOnHidden
        onClose={() => setTemplateListOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Space size={8} wrap>
              <Input
                allowClear
                placeholder="模板名称"
                value={templateKeyword}
                style={{ width: 220 }}
                onChange={(event) => setTemplateKeyword(event.target.value)}
                onPressEnter={applyTemplateQuery}
              />
              <Select
                allowClear
                placeholder="模板状态"
                value={templateStatus}
                style={{ width: 140 }}
                options={[
                  { label: '启用', value: '1' },
                  { label: '停用', value: '0' },
                ]}
                onChange={setTemplateStatus}
              />
              <Button type="primary" onClick={applyTemplateQuery}>
                查询
              </Button>
              <Button onClick={resetTemplateQuery}>重置</Button>
            </Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void refreshSalesData()}
            >
              刷新
            </Button>
          </div>
          <Table<SalesIcpTemplate>
            className="recov-stable-pagination-table"
            rowKey={(record) => String(record.id)}
            columns={templateColumns}
            dataSource={templatePageQuery.data?.rows || []}
            loading={
              templatePageQuery.isLoading || templatePageQuery.isFetching
            }
            size="middle"
            scroll={{ x: 1120 }}
            pagination={{
              current: templateQuery.pageNum,
              pageSize: templateQuery.pageSize,
              total: templatePageQuery.data?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            onChange={handleTemplateTableChange}
          />
        </div>
      </Drawer>

      <Drawer
        title="搜索运行记录"
        open={runListOpen}
        size={980}
        destroyOnHidden
        onClose={() => setRunListOpen(false)}
      >
        <Table<SalesSearchRun>
          className="recov-stable-pagination-table"
          rowKey={(record) => String(record.id)}
          columns={runColumns}
          dataSource={runPageQuery.data?.rows || []}
          loading={runPageQuery.isLoading || runPageQuery.isFetching}
          size="middle"
          scroll={{ x: 960 }}
          pagination={false}
        />
      </Drawer>

      <Drawer
        title={selectedTask?.taskName || '任务详情'}
        open={detailOpen}
        size={760}
        destroyOnHidden
        loading={detailLoading}
        onClose={() => setDetailOpen(false)}
      >
        {selectedTask ? (
          <div className="flex flex-col gap-4">
            <Descriptions
              size="small"
              bordered
              column={1}
              items={[
                { label: '任务ID', children: String(selectedTask.id) },
                {
                  label: '模板ID',
                  children: selectedTask.templateId
                    ? String(selectedTask.templateId)
                    : '-',
                },
                { label: '状态', children: renderTaskStatus(selectedTask) },
                {
                  label: '错误信息',
                  children: selectedTask.errorMessage || '-',
                },
                {
                  label: '创建时间',
                  children: formatDateTime(selectedTask.createTime),
                },
              ]}
            />
            <ProCard
              title="ICP 条件"
              style={{ borderRadius: 8 }}
              styles={{ body: { padding: 12 } }}
            >
              {renderRequirements(selectedTaskRequirements, attributeLabelMap)}
            </ProCard>
            <ProCard
              title="执行记录"
              style={{ borderRadius: 8 }}
              styles={{ body: { padding: 12 } }}
            >
              <Table<SalesSearchRun>
                rowKey={(record) => String(record.id)}
                columns={taskRunColumns}
                dataSource={selectedTaskRunQuery.data?.rows || []}
                loading={
                  selectedTaskRunQuery.isLoading ||
                  selectedTaskRunQuery.isFetching
                }
                size="small"
                scroll={{ x: 680 }}
                pagination={false}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无执行记录"
                    />
                  ),
                }}
              />
            </ProCard>
            <ProCard
              title="模板快照"
              style={{ borderRadius: 8 }}
              styles={{ body: { padding: 12 } }}
            >
              <pre className="max-h-[360px] overflow-auto rounded-lg bg-[var(--ant-color-fill-quaternary)] p-4 text-xs leading-5">
                {toJsonText(selectedTask.templateSnapshot)}
              </pre>
            </ProCard>
          </div>
        ) : null}
      </Drawer>

      <Drawer
        title={previewState.title}
        open={previewState.open}
        size={1040}
        destroyOnHidden
        loading={Boolean(previewLoading)}
        onClose={() => {
          setAccountProfileReview(undefined);
          setPreviewState({ open: false, title: '' });
        }}
      >
        {renderRunTraceDetail(
          previewState.run,
          previewState.data,
          runAccountProfileQuery.data?.data || [],
          openAccountProfileReview,
          accountProfileReviewSaving && accountProfileReview
            ? String(accountProfileReview.profile.id)
            : undefined,
        )}
      </Drawer>
    </PageContainer>
  );
};

export default IcpModelingPage;
