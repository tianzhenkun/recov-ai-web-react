import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileSearchOutlined,
  LinkOutlined,
  MailOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Progress,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import TableActions from '@/components/TableActions';
import {
  createSalesEmailDraft,
  getSalesLeadContacts,
  getSalesLeadEvidenceDetail,
  getSalesTaskProgress,
  querySalesEmailAccounts,
  querySalesLeadResultPage,
  querySalesTaskPage,
  type SalesAccountChannel,
  type SalesAccountContact,
  type SalesAccountContactChannel,
  type SalesAccountContactEvidence,
  type SalesAccountContacts,
  type SalesAccountProfile,
  type SalesAccountProfileReviewStatus,
  type SalesEmailMessagePayload,
  type SalesLeadEvidenceDetail,
  type SalesLeadEvidenceItem,
  type SalesLeadRequirementCoverage,
  type SalesLeadResult,
  type SalesLeadResultQuery,
  type SalesLeadSourceItem,
  type SalesProviderUsageEvent,
  type SalesSearchRunProgress,
  type SalesSearchRunProgressEvent,
  type SalesTaskStatus,
  sendSalesEmailNow,
  updateSalesAccountContactReview,
} from '@/services/ruoyi/sales';

const { Text } = Typography;

const reviewStatusMeta: Record<string, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'default' },
  approved: { label: '已确认', color: 'success' },
  rejected: { label: '已排除', color: 'error' },
  needs_more_evidence: { label: '待补证', color: 'warning' },
};

const taskStatusMeta: Record<string, { label: string; color: string }> = {
  blocked: { label: '阻塞', color: 'warning' },
  ready: { label: '待开始', color: 'default' },
  running: { label: '执行中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  failed: { label: '失败', color: 'error' },
  canceled: { label: '已取消', color: 'default' },
};

const decisionStatusMeta: Record<string, { label: string; color: string }> = {
  candidate: { label: '候选', color: 'success' },
  uncertain: { label: '待确认', color: 'warning' },
  rejected: { label: '已排除', color: 'error' },
  pending_evidence: { label: '待补证', color: 'processing' },
};

const runStatusMeta: Record<string, { label: string; color: string }> = {
  pending: { label: '待受理', color: 'default' },
  accepted: { label: '已受理', color: 'processing' },
  running: { label: '执行中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  failed: { label: '失败', color: 'error' },
  timeout: { label: '超时', color: 'error' },
  canceled: { label: '已取消', color: 'default' },
};

const evidenceJudgmentMeta: Record<string, { label: string; color: string }> = {
  supported: { label: '已支持', color: 'success' },
  conflicted: { label: '有冲突', color: 'error' },
  unknown: { label: '未知', color: 'default' },
  missing: { label: '缺失', color: 'warning' },
};

const sourceRoleMeta: Record<string, string> = {
  official_site: '官网',
  directory: '企业目录/地图',
  document: '文档',
  social_profile: '社媒主页',
  search_result: '搜索结果',
  google_places: 'Google Places',
};

const decisionMakerMeta: Record<string, { label: string; color: string }> = {
  likely: { label: '可能是', color: 'success' },
  unknown: { label: '未知', color: 'default' },
  no: { label: '否', color: 'default' },
  conflicted: { label: '有冲突', color: 'error' },
};

const channelTypeMeta: Record<string, string> = {
  email: '邮箱',
  phone: '电话',
  mobile: '手机',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  x: 'X',
  instagram: 'Instagram',
  youtube: 'YouTube',
  personal_page: '个人页',
  other: '其他',
};

const verifiedStatusMeta: Record<string, { label: string; color: string }> = {
  unverified: { label: '未验证', color: 'default' },
  format_valid: { label: '格式有效', color: 'processing' },
  deliverable: { label: '可投递', color: 'success' },
  invalid: { label: '无效', color: 'error' },
  conflicted: { label: '有冲突', color: 'error' },
};

const providerUsageStatusMeta: Record<
  string,
  { label: string; color: string }
> = {
  success: { label: '已调用', color: 'success' },
  empty: { label: '无结果', color: 'default' },
  error: { label: '失败', color: 'error' },
  cache_hit: { label: '已复用', color: 'processing' },
  skipped: { label: '已跳过', color: 'warning' },
};

const contactDiscoveryOutcomeMeta: Record<
  string,
  { label: string; color: string }
> = {
  contacts_found: { label: '已发现联系人', color: 'success' },
  provider_no_result: { label: '已增强无联系人', color: 'default' },
  provider_cache_no_result: { label: '缓存无联系人', color: 'processing' },
  provider_skipped: { label: '增强跳过', color: 'warning' },
  provider_error: { label: '增强失败', color: 'error' },
  not_started: { label: '未开始联系人增强', color: 'default' },
};

const providerEndpointMeta: Record<string, string> = {
  contact_enrichment: '联系人增强',
  domain_search: '域名联系人',
  email_enrichment: '邮箱补全',
  email_finder: '邮箱查找',
  email_verifier: '邮箱验证',
  people_search: 'Apollo 找人',
  bulk_people_enrichment: 'Apollo 补全',
  contact_web_search: '联系人搜索',
};

const providerUsageReasonMeta: Record<string, string> = {
  disabled: '能力未启用',
  enough_public_contacts: '公开页面已有联系人',
  missing_company_identity: '缺少公司身份信息',
  missing_domain_for_enrichment: '缺少可用于增强的官网域名',
  excluded_account: '公司已排除',
  provider_error: '服务商调用失败',
  endpoint_limit_reached: '单能力调用上限',
  request_limit_reached: '单公司请求上限',
  invalid_domain: '域名无效',
  missing_input: '缺少输入',
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
};

const toJsonText = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const isLiveTaskStatus = (value?: string) => value === 'running';

const renderStatusTag = (
  value: string | undefined,
  metaMap: Record<string, { label: string; color: string }>,
) => {
  const meta = metaMap[String(value || '')] || {
    label: value || '-',
    color: 'default',
  };
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

const renderWebsite = (profile: SalesAccountProfile) => {
  const text = profile.primaryDomain || profile.websiteUrl;
  const href =
    profile.websiteUrl ||
    (profile.primaryDomain ? `https://${profile.primaryDomain}` : '');
  if (!text || !href) return '-';
  return (
    <a href={href} target="_blank" rel="noreferrer">
      <Space size={4}>
        <LinkOutlined />
        <span>{text}</span>
      </Space>
    </a>
  );
};

const renderSourceLink = (url?: string, label?: string) => {
  if (!url) return '-';
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <Space size={4}>
        <LinkOutlined />
        <span>{label || url}</span>
      </Space>
    </a>
  );
};

type ChannelDisplayContext = {
  contactName?: string;
  companyName?: string;
  companyDomain?: string;
  preferSearchKeyword?: boolean;
};

const socialChannelTypes = new Set([
  'whatsapp',
  'linkedin',
  'facebook',
  'x',
  'instagram',
  'youtube',
  'personal_page',
]);

const readRawText = (
  raw: Record<string, unknown> | undefined,
  keys: string[],
) => {
  for (const key of keys) {
    const value = raw?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const isHttpUrl = (value?: string) => /^https?:\/\//i.test(value || '');

const parseUrl = (value?: string) => {
  if (!value) return undefined;
  try {
    return new URL(
      isHttpUrl(value) ? value : `https://${value.replace(/^\/+/, '')}`,
    );
  } catch {
    return undefined;
  }
};

const pathSegments = (value?: string) =>
  (parseUrl(value)?.pathname || '').split('/').filter(Boolean);

const firstNonReservedSegment = (segments: string[], reserved: string[]) =>
  segments.find(
    (segment) => segment && !reserved.includes(segment.toLowerCase()),
  ) || '';

const inferSocialAccount = (channelType: string, value?: string) => {
  const rawValue = (value || '').trim();
  if (!rawValue) return '';
  if (channelType === 'whatsapp') {
    const segment = pathSegments(rawValue)[0];
    if (segment) {
      const digits = segment.replace(/\D/g, '');
      return digits ? `+${digits}` : segment;
    }
    return rawValue;
  }
  if (!isHttpUrl(rawValue)) return rawValue;
  const segments = pathSegments(rawValue);
  if (!segments.length)
    return parseUrl(rawValue)?.hostname.replace(/^www\./, '') || rawValue;
  const lowerSegments = segments.map((item) => item.toLowerCase());
  if (channelType === 'linkedin') {
    for (const marker of ['in', 'company']) {
      const index = lowerSegments.indexOf(marker);
      if (index >= 0 && segments[index + 1]) return segments[index + 1];
    }
  }
  if (channelType === 'youtube') {
    if (segments[0].startsWith('@')) return segments[0];
    if (['channel', 'c', 'user'].includes(lowerSegments[0]) && segments[1]) {
      return segments[1];
    }
    return segments[0];
  }
  if (['x', 'instagram', 'facebook'].includes(channelType)) {
    return firstNonReservedSegment(segments, [
      'about',
      'channel',
      'company',
      'groups',
      'hashtag',
      'in',
      'pages',
      'people',
      'photo',
      'photos',
      'p',
      'reel',
      'share',
      'watch',
    ]);
  }
  if (channelType === 'personal_page') {
    return (
      parseUrl(rawValue)?.hostname.replace(/^www\./, '') ||
      segments[segments.length - 1]
    );
  }
  return segments[segments.length - 1];
};

const formatSocialAccount = (channelType: string, account: string) => {
  const text = account.trim().replace(/^\/+|\/+$/g, '');
  if (!text) return '';
  if (['x', 'instagram'].includes(channelType) && !text.startsWith('@')) {
    return `@${text}`;
  }
  return text;
};

const channelDisplay = (
  record: Pick<SalesAccountChannel, 'channelType' | 'channelValue' | 'raw'>,
  context: ChannelDisplayContext = {},
) => {
  const value = record.channelValue || '';
  const channelType = record.channelType || 'other';
  const profileUrl =
    readRawText(record.raw, ['profileUrl', 'profile_url']) ||
    (isHttpUrl(value) ? value : '');
  const displayAccount =
    readRawText(record.raw, ['displayAccount', 'display_account']) ||
    formatSocialAccount(channelType, inferSocialAccount(channelType, value));
  const companyKeyword = context.companyName || context.companyDomain || '';
  const derivedSearchKeyword =
    channelType === 'linkedin' && context.contactName
      ? [context.contactName, companyKeyword].filter(Boolean).join(' ')
      : channelType === 'linkedin' && companyKeyword
        ? companyKeyword
        : displayAccount;
  const searchKeyword =
    readRawText(record.raw, ['searchKeyword', 'search_keyword']) ||
    derivedSearchKeyword;
  const text =
    context.preferSearchKeyword && socialChannelTypes.has(channelType)
      ? searchKeyword || displayAccount || value
      : displayAccount || searchKeyword || value;
  return { text, profileUrl, searchKeyword };
};

const renderChannelValue = (
  record: Pick<SalesAccountChannel, 'channelType' | 'channelValue' | 'raw'>,
  context: ChannelDisplayContext = {},
) => {
  const value = record.channelValue;
  if (!value) return '-';
  if (record.channelType === 'email') {
    return <a href={`mailto:${value}`}>{value}</a>;
  }
  const display = channelDisplay(record, context);
  if (display.profileUrl) {
    const tooltip = [
      display.searchKeyword ? `搜索词：${display.searchKeyword}` : '',
      display.profileUrl,
    ]
      .filter(Boolean)
      .join('\n');
    return (
      <Tooltip title={tooltip}>
        <a href={display.profileUrl} target="_blank" rel="noreferrer">
          <Space size={4}>
            <LinkOutlined />
            <span>{display.text}</span>
          </Space>
        </a>
      </Tooltip>
    );
  }
  return display.text || value;
};

const isUnassignedCompanyChannel = (record: Pick<SalesAccountChannel, 'raw'>) =>
  record.raw?.attributionStatus === 'unassigned_personal_like';

const channelsOfTypes = (
  channels: SalesAccountChannel[] | SalesAccountContactChannel[] | undefined,
  types: string[],
) => {
  const typeSet = new Set(types);
  return (channels || []).filter((channel) =>
    typeSet.has(channel.channelType || ''),
  );
};

const getLeadEmailTarget = (record: SalesLeadResult) => {
  const contactChannel = channelsOfTypes(record.contactChannels, ['email'])[0];
  if (contactChannel) {
    return { channel: contactChannel, scope: 'contact' as const };
  }
  const companyChannel = channelsOfTypes(record.companyChannels, ['email'])[0];
  return companyChannel
    ? { channel: companyChannel, scope: 'company' as const }
    : undefined;
};

const getLeadEmailChannel = (record: SalesLeadResult) =>
  getLeadEmailTarget(record)?.channel;

const renderLeadChannelValues = (
  record: SalesLeadResult,
  types: string[],
  options: { fallbackToCompany?: boolean; preferSearchKeyword?: boolean } = {},
) => {
  const contactChannels = channelsOfTypes(record.contactChannels, types);
  const fallbackToCompany = options.fallbackToCompany ?? true;
  const channels = contactChannels.length
    ? contactChannels
    : fallbackToCompany
      ? channelsOfTypes(record.companyChannels, types)
      : [];
  if (!channels.length) return '-';
  const companyScope = !contactChannels.length;
  const displayContext: ChannelDisplayContext = {
    contactName: record.fullName,
    companyName: record.displayName || record.legalName,
    companyDomain: record.primaryDomain,
    preferSearchKeyword: options.preferSearchKeyword,
  };
  const visibleChannels = channels.slice(0, 1);
  const hiddenChannels = channels.slice(1);
  const renderChannelLine = (
    channel: SalesAccountChannel | SalesAccountContactChannel,
    index: number,
  ) => (
    <span
      key={String(
        channel.id || `${channel.channelType}-${channel.channelValue}-${index}`,
      )}
    >
      {renderChannelValue(channel, displayContext)}
      {companyScope ? (
        <Tag
          className="ml-1"
          color={isUnassignedCompanyChannel(channel) ? 'warning' : 'default'}
        >
          {isUnassignedCompanyChannel(channel) ? '待归属' : '公司'}
        </Tag>
      ) : null}
    </span>
  );
  return (
    <Space size={4} wrap>
      {visibleChannels.map(renderChannelLine)}
      {hiddenChannels.length ? (
        <Tooltip
          title={
            <Space direction="vertical" size={2}>
              {channels.map(renderChannelLine)}
            </Space>
          }
        >
          <Tag>+{hiddenChannels.length}</Tag>
        </Tooltip>
      ) : null}
    </Space>
  );
};

const renderProviderUsageSummary = (detail?: SalesAccountContacts) => {
  const summary = detail?.providerUsageSummary;
  if (!summary || summary.eventCount <= 0) {
    return <Tag>数据源调用 0</Tag>;
  }
  return (
    <Space size={[8, 8]} wrap>
      <Tag>数据源调用 {summary.eventCount}</Tag>
      <Tag color="success">实际请求 {summary.executedRequests}</Tag>
      <Tag color="processing">复用 {summary.cacheHitCount}</Tag>
      <Tag color={summary.skipCount > 0 ? 'warning' : 'default'}>
        跳过 {summary.skipCount}
      </Tag>
      <Tag color={summary.errorCount > 0 ? 'error' : 'default'}>
        失败 {summary.errorCount}
      </Tag>
      {summary.providers.map((provider) => (
        <Tag key={provider.provider}>
          {provider.provider} {provider.executedRequests}
        </Tag>
      ))}
    </Space>
  );
};

const renderContactDiscoveryOutcome = (detail?: SalesAccountContacts) => {
  const outcome = detail?.discoveryOutcome;
  const status = outcome?.status || 'not_started';
  const meta =
    contactDiscoveryOutcomeMeta[status] ||
    contactDiscoveryOutcomeMeta.not_started;
  const label = outcome?.label || meta.label;
  return (
    <Tooltip title={outcome?.description || ''}>
      <Tag color={meta.color}>{label}</Tag>
    </Tooltip>
  );
};

const contactEmptyDescription = (detail?: SalesAccountContacts) =>
  detail?.discoveryOutcome?.description || '暂无联系人';

const leadResultToProfile = (record: SalesLeadResult): SalesAccountProfile => ({
  id: record.profileId,
  tenantId: record.tenantId,
  runId: record.runId,
  taskId: record.taskId,
  taskName: record.taskName,
  runType: record.runType,
  runStatus: record.runStatus,
  displayName: record.displayName,
  legalName: record.legalName,
  primaryDomain: record.primaryDomain,
  websiteUrl: record.websiteUrl,
  nameConfidence: record.nameConfidence,
  identityConfidence: record.identityConfidence,
  summary: record.summary,
  countryCode: record.countryCode,
  countryName: record.countryName,
  region: record.region,
  city: record.city,
  sourceTypes: record.sourceTypes,
  decision: record.decision,
  decisionReason: record.decisionReason,
  fitScore: record.fitScore,
  reviewStatus: record.companyReviewStatus,
  reviewNote: record.companyReviewNote,
  evidenceCount: record.evidenceCount,
  sourceCount: record.sourceCount,
  profile: record.profile,
  createTime: record.createTime,
  updateTime: record.updateTime,
  raw: record.raw,
});

const coverageColumns: ColumnsType<SalesLeadRequirementCoverage> = [
  {
    title: 'ICP 条件',
    dataIndex: 'requirementText',
    ellipsis: true,
    render: (_, record) => (
      <div className="flex flex-col gap-1">
        <Text>
          {record.requirementText ||
            record.attributeName ||
            record.requirementId ||
            '-'}
        </Text>
        <span className="text-xs text-[var(--ant-color-text-secondary)]">
          {record.attributeKey || record.requirementId || '-'}
        </span>
      </div>
    ),
  },
  {
    title: '类型',
    dataIndex: 'requirementType',
    width: 96,
    render: (value?: string) => value || '-',
  },
  {
    title: '覆盖状态',
    dataIndex: 'judgment',
    width: 112,
    render: (value?: string) => renderStatusTag(value, evidenceJudgmentMeta),
  },
  {
    title: '证据数',
    dataIndex: 'evidenceCount',
    width: 88,
  },
  {
    title: '支持/冲突/未知',
    key: 'counts',
    width: 132,
    render: (_, record) =>
      `${record.supportedCount || 0}/${record.conflictedCount || 0}/${record.unknownCount || 0}`,
  },
];

const evidenceColumns: ColumnsType<SalesLeadEvidenceItem> = [
  {
    title: '判断',
    dataIndex: 'judgment',
    width: 96,
    render: (value?: string) => renderStatusTag(value, evidenceJudgmentMeta),
  },
  {
    title: '证据',
    dataIndex: 'evidenceText',
    width: 360,
    render: (_, record) => (
      <div className="flex flex-col gap-1">
        <Text>{record.evidenceText || record.reason || '-'}</Text>
        {record.reason ? (
          <span className="text-xs text-[var(--ant-color-text-secondary)]">
            {record.reason}
          </span>
        ) : null}
      </div>
    ),
  },
  {
    title: 'ICP 条件',
    dataIndex: 'requirementId',
    width: 130,
    ellipsis: true,
    render: (value?: string) => value || '-',
  },
  {
    title: '来源',
    dataIndex: 'sourceUrl',
    width: 260,
    ellipsis: true,
    render: (_, record) =>
      renderSourceLink(record.sourceUrl, record.title || record.sourceDomain),
  },
  {
    title: '查询词',
    dataIndex: 'queryText',
    width: 220,
    ellipsis: true,
    render: (value?: string) => value || '-',
  },
];

const sourceColumns: ColumnsType<SalesLeadSourceItem> = [
  {
    title: '页面',
    dataIndex: 'sourceUrl',
    width: 320,
    ellipsis: true,
    render: (_, record) =>
      renderSourceLink(record.sourceUrl, record.title || record.sourceDomain),
  },
  {
    title: '来源角色',
    dataIndex: 'sourceRole',
    width: 110,
    render: (value?: string) => sourceRoleMeta[value || ''] || value || '-',
  },
  {
    title: 'Provider',
    dataIndex: 'provider',
    width: 100,
    render: (value?: string) => value || '-',
  },
  {
    title: '排名',
    dataIndex: 'providerRank',
    width: 80,
    render: (value?: number) => value || '-',
  },
  {
    title: '匹配词',
    dataIndex: 'matchedTerms',
    ellipsis: true,
    render: (value?: string[]) =>
      value?.length ? (
        <Space size={[4, 4]} wrap>
          {value.slice(0, 6).map((term) => (
            <Tag key={term}>{term}</Tag>
          ))}
        </Space>
      ) : (
        '-'
      ),
  },
];

const companyChannelColumns: ColumnsType<SalesAccountChannel> = [
  {
    title: '类型',
    dataIndex: 'channelType',
    width: 110,
    render: (value?: string) => channelTypeMeta[value || ''] || value || '-',
  },
  {
    title: '渠道',
    dataIndex: 'channelValue',
    ellipsis: true,
    render: (_, record) => renderChannelValue(record),
  },
  {
    title: '可信度',
    dataIndex: 'confidence',
    width: 90,
    render: (value?: number) => value ?? 0,
  },
  {
    title: '归属',
    key: 'attributionStatus',
    width: 110,
    render: (_, record) =>
      isUnassignedCompanyChannel(record) ? (
        <Tag color="warning">待归属</Tag>
      ) : (
        <Tag>公司</Tag>
      ),
  },
  {
    title: '验证',
    dataIndex: 'verifiedStatus',
    width: 100,
    render: (value?: string) => renderStatusTag(value, verifiedStatusMeta),
  },
  {
    title: '来源',
    dataIndex: 'sourceUrl',
    width: 260,
    ellipsis: true,
    render: (_, record) =>
      renderSourceLink(
        record.sourceUrl,
        record.sourceDomain || record.sourceUrl,
      ),
  },
];

const contactChannelColumns: ColumnsType<SalesAccountContactChannel> = [
  {
    title: '类型',
    dataIndex: 'channelType',
    width: 110,
    render: (value?: string) => channelTypeMeta[value || ''] || value || '-',
  },
  {
    title: '渠道',
    dataIndex: 'channelValue',
    ellipsis: true,
    render: (_, record) => renderChannelValue(record),
  },
  {
    title: '验证',
    dataIndex: 'verifiedStatus',
    width: 100,
    render: (value?: string) => renderStatusTag(value, verifiedStatusMeta),
  },
  {
    title: '来源',
    dataIndex: 'sourceUrl',
    width: 240,
    ellipsis: true,
    render: (_, record) =>
      renderSourceLink(
        record.sourceUrl,
        record.sourceDomain || record.sourceUrl,
      ),
  },
];

const contactEvidenceColumns: ColumnsType<SalesAccountContactEvidence> = [
  {
    title: '判断',
    dataIndex: 'judgment',
    width: 96,
    render: (value?: string) => renderStatusTag(value, evidenceJudgmentMeta),
  },
  {
    title: '证据',
    dataIndex: 'evidenceText',
    ellipsis: true,
    render: (_, record) => (
      <div className="flex flex-col gap-1">
        <Text>{record.evidenceText || record.reason || '-'}</Text>
        {record.reason ? (
          <span className="text-xs text-[var(--ant-color-text-secondary)]">
            {record.reason}
          </span>
        ) : null}
      </div>
    ),
  },
  {
    title: '来源',
    dataIndex: 'sourceUrl',
    width: 240,
    ellipsis: true,
    render: (_, record) =>
      renderSourceLink(record.sourceUrl, record.title || record.sourceDomain),
  },
];

const providerUsageColumns: ColumnsType<SalesProviderUsageEvent> = [
  {
    title: '服务商',
    dataIndex: 'provider',
    width: 100,
    render: (value?: string) => value || '-',
  },
  {
    title: '能力',
    dataIndex: 'endpoint',
    width: 120,
    render: (value?: string) =>
      providerEndpointMeta[value || ''] || value || '-',
  },
  {
    title: '对象',
    dataIndex: 'objectKey',
    ellipsis: true,
    render: (value?: string) => value || '-',
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (value?: string) => renderStatusTag(value, providerUsageStatusMeta),
  },
  {
    title: '次数',
    dataIndex: 'unitCount',
    width: 80,
    render: (_, record) =>
      `${record.unitCount || 0}${record.unitType ? ` ${record.unitType}` : ''}`,
  },
  {
    title: '计费',
    dataIndex: 'billable',
    width: 80,
    render: (value?: boolean) =>
      value ? <Tag color="success">是</Tag> : <Tag>否</Tag>,
  },
  {
    title: '原因',
    dataIndex: 'reason',
    width: 180,
    ellipsis: true,
    render: (value?: string) =>
      value ? providerUsageReasonMeta[value] || value : '-',
  },
  {
    title: '时间',
    dataIndex: 'occurredTime',
    width: 170,
    render: (value?: string) => formatDateTime(value),
  },
];

const progressEventColumns: ColumnsType<SalesSearchRunProgressEvent> = [
  {
    title: '时间',
    dataIndex: 'createTime',
    width: 170,
    render: (value?: string) => formatDateTime(value),
  },
  {
    title: '阶段',
    dataIndex: 'stageLabel',
    width: 140,
    render: (_, record) => record.stageLabel || record.stage || '-',
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (value?: string) => renderStatusTag(value, runStatusMeta),
  },
  {
    title: '进度',
    dataIndex: 'progress',
    width: 90,
    render: (value?: number) => (typeof value === 'number' ? `${value}%` : '-'),
  },
  {
    title: '消息',
    dataIndex: 'message',
    ellipsis: true,
    render: (value?: string) => value || '-',
  },
];

const renderEvidenceSummary = (detail?: SalesLeadEvidenceDetail) => {
  if (!detail) return null;
  const { summary } = detail;
  return (
    <Space size={[8, 8]} wrap>
      <Tag>证据 {summary.evidenceCount}</Tag>
      <Tag color="success">支持 {summary.supportedCount}</Tag>
      <Tag color="error">冲突 {summary.conflictedCount}</Tag>
      <Tag>来源 {summary.sourceCount}</Tag>
      <Tag color={summary.missingRequiredCount > 0 ? 'warning' : 'success'}>
        必须条件缺失 {summary.missingRequiredCount}
      </Tag>
      <Tag>
        覆盖 {summary.coveredRequirementCount}/{summary.requirementCount}
      </Tag>
    </Space>
  );
};

const renderTaskProgressSummary = (progress?: SalesSearchRunProgress) => {
  if (!progress) return null;
  return (
    <div className="rounded-md border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] px-4 py-3">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,1.2fr)_minmax(420px,2fr)]">
        <div className="flex flex-col gap-2">
          <Space size={[8, 8]} wrap>
            {renderStatusTag(progress.taskStatus, taskStatusMeta)}
            {renderStatusTag(progress.runStatus, runStatusMeta)}
            <Tag color="processing">
              {progress.currentStageLabel ||
                progress.currentStage ||
                '未知阶段'}
            </Tag>
          </Space>
          <Progress
            percent={Math.max(0, Math.min(progress.progress || 0, 100))}
            size="small"
            status={
              progress.runStatus === 'completed'
                ? 'success'
                : ['failed', 'timeout', 'canceled'].includes(
                      progress.runStatus || '',
                    )
                  ? 'exception'
                  : 'active'
            }
          />
          <Text type="secondary" className="text-xs">
            {progress.message || progress.errorMessage || '-'}
          </Text>
        </div>
        <Space size={[8, 8]} wrap>
          <Tag>查询 {progress.queryCount}</Tag>
          <Tag>结果 {progress.resultCount}</Tag>
          <Tag>公司 {progress.profileCount}</Tag>
          <Tag>来源 {progress.sourceCount}</Tag>
          <Tag>证据 {progress.evidenceCount}</Tag>
          <Tag>事件 {progress.eventCount}</Tag>
        </Space>
      </div>
    </div>
  );
};

const SalesLeadsPage: FC = () => {
  const queryClient = useQueryClient();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [mailForm] = Form.useForm<SalesEmailMessagePayload>();
  const [taskStatus, setTaskStatus] = useState<SalesTaskStatus>();
  const [taskId, setTaskId] = useState<SalesLeadResultQuery['taskId']>();
  const [query, setQuery] = useState<SalesLeadResultQuery>({
    pageNum: 1,
    pageSize: 10,
  });
  const [detailProfile, setDetailProfile] = useState<SalesAccountProfile>();
  const [mailTarget, setMailTarget] = useState<SalesLeadResult>();

  const taskListQuery = useQuery({
    queryKey: ['sales-lead-task-options', taskStatus],
    queryFn: () =>
      querySalesTaskPage({
        pageNum: 1,
        pageSize: 500,
        status: taskStatus,
      }),
    refetchInterval: 5000,
  });
  const taskOptions = useMemo(
    () =>
      (taskListQuery.data?.rows || []).map((task) => ({
        label: task.taskName || `任务 ${task.id}`,
        value: String(task.id),
        status: task.status,
      })),
    [taskListQuery.data?.rows],
  );
  const hasLiveTask = useMemo(
    () =>
      (taskListQuery.data?.rows || []).some((task) =>
        isLiveTaskStatus(task.status),
      ),
    [taskListQuery.data?.rows],
  );
  const selectedTaskOption = useMemo(
    () => taskOptions.find((item) => String(item.value) === String(taskId)),
    [taskId, taskOptions],
  );
  const selectedTaskProgressQuery = useQuery({
    queryKey: ['sales-task-progress', taskId],
    queryFn: () => {
      if (!taskId) throw new Error('task id is required');
      return getSalesTaskProgress(taskId);
    },
    enabled: Boolean(taskId),
    refetchInterval:
      selectedTaskOption && isLiveTaskStatus(selectedTaskOption.status)
        ? 5000
        : false,
  });
  useEffect(() => {
    if (!taskId) return;
    if (!taskOptions.some((item) => String(item.value) === String(taskId))) {
      setTaskId(undefined);
      setQuery((prev) => ({ ...prev, pageNum: 1, taskId: undefined }));
    }
  }, [taskId, taskOptions]);

  const leadResultQuery = useQuery({
    queryKey: ['sales-lead-results', query],
    queryFn: () => querySalesLeadResultPage(query),
    refetchInterval:
      isLiveTaskStatus(String(query.taskStatus || '')) ||
      (!query.taskStatus && hasLiveTask)
        ? 5000
        : false,
  });
  const leadEvidenceQuery = useQuery({
    queryKey: ['sales-lead-detail', detailProfile?.id],
    queryFn: () => {
      const profileId = detailProfile?.id;
      if (!profileId) throw new Error('profile id is required');
      return getSalesLeadEvidenceDetail(profileId);
    },
    enabled: Boolean(detailProfile?.id),
  });
  const leadContactsQuery = useQuery({
    queryKey: ['sales-lead-contacts', detailProfile?.id],
    queryFn: () => {
      const profileId = detailProfile?.id;
      if (!profileId) throw new Error('profile id is required');
      return getSalesLeadContacts(profileId);
    },
    enabled: Boolean(detailProfile?.id),
  });
  const emailAccountQuery = useQuery({
    queryKey: ['sales-email-accounts'],
    queryFn: () => querySalesEmailAccounts({ enabled: '1' }),
    enabled: Boolean(mailTarget),
  });
  const emailAccounts = useMemo(
    () => emailAccountQuery.data?.data || [],
    [emailAccountQuery.data?.data],
  );
  const defaultEmailAccount = useMemo(
    () =>
      emailAccounts.find((item) => item.defaultFlag === '1') ||
      emailAccounts[0],
    [emailAccounts],
  );
  const contactReviewMutation = useMutation({
    mutationFn: (payload: {
      contactId: SalesAccountContact['id'];
      reviewStatus: SalesAccountProfileReviewStatus;
    }) =>
      updateSalesAccountContactReview(payload.contactId, {
        reviewStatus: payload.reviewStatus,
      }),
    onSuccess: async () => {
      messageApi.success('联系人审核状态已保存');
      await queryClient.invalidateQueries({
        queryKey: ['sales-lead-contacts'],
      });
      await queryClient.invalidateQueries({ queryKey: ['sales-lead-results'] });
    },
  });
  const sendMailMutation = useMutation({
    mutationFn: async (payload: SalesEmailMessagePayload) => {
      const draftResponse = await createSalesEmailDraft(payload);
      const draftId = draftResponse.data?.id;
      if (!draftId) {
        throw new Error('邮件草稿创建失败');
      }
      return sendSalesEmailNow(draftId);
    },
    onSuccess: async (response) => {
      if (response.data?.success) {
        messageApi.success('邮件已发送');
        setMailTarget(undefined);
        mailForm.resetFields();
      } else {
        messageApi.error(response.data?.message || '邮件发送失败');
      }
      await queryClient.invalidateQueries({
        queryKey: ['sales-email-messages'],
      });
    },
  });

  useEffect(() => {
    if (!mailTarget || !defaultEmailAccount) return;
    if (mailForm.getFieldValue('accountId')) return;
    mailForm.setFieldValue('accountId', defaultEmailAccount.id);
  }, [defaultEmailAccount, mailForm, mailTarget]);

  const applyQuery = () => {
    setQuery((prev) => ({
      ...prev,
      pageNum: 1,
      taskStatus,
      taskId,
    }));
  };

  const resetQuery = () => {
    setTaskStatus(undefined);
    setTaskId(undefined);
    setQuery({ pageNum: 1, pageSize: query.pageSize || 10 });
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setQuery((prev) => ({
      ...prev,
      pageNum: pagination.current || 1,
      pageSize: pagination.pageSize || prev.pageSize || 10,
    }));
  };

  const openMailModal = (record: SalesLeadResult) => {
    const emailTarget = getLeadEmailTarget(record);
    if (!emailTarget?.channel.channelValue) {
      messageApi.warning('该线索没有可用邮箱');
      return;
    }
    const emailChannel = emailTarget.channel;
    setMailTarget(record);
    mailForm.setFieldsValue({
      accountId: defaultEmailAccount?.id,
      profileId: record.profileId,
      contactId: emailTarget.scope === 'contact' ? record.contactId : undefined,
      contactChannelId:
        emailTarget.scope === 'contact' ? emailChannel.id : undefined,
      toEmail: emailChannel.channelValue,
      toName:
        emailTarget.scope === 'contact'
          ? record.fullName || ''
          : record.displayName || record.primaryDomain || '',
      subject: '',
      body: '',
      contentFormat: 'plain',
    });
  };

  const columns: ColumnsType<SalesLeadResult> = [
    {
      title: '任务',
      dataIndex: 'taskName',
      width: 240,
      ellipsis: true,
      render: (_, record) => (
        <div className="flex flex-col gap-1">
          <Text>
            {record.taskName || (record.taskId ? `任务 ${record.taskId}` : '-')}
          </Text>
          <Space size={[4, 4]} wrap>
            {renderStatusTag(record.taskStatus, taskStatusMeta)}
            {record.runStatus
              ? renderStatusTag(record.runStatus, runStatusMeta)
              : null}
          </Space>
        </div>
      ),
    },
    {
      title: '公司',
      dataIndex: 'displayName',
      width: 260,
      ellipsis: true,
      render: (_, record) => (
        <div className="flex flex-col gap-1">
          <Text strong>
            {record.displayName || record.primaryDomain || '-'}
          </Text>
          <span className="text-xs text-[var(--ant-color-text-secondary)]">
            {renderWebsite(leadResultToProfile(record))}
          </span>
          {[
            record.city,
            record.region,
            record.countryName || record.countryCode,
          ]
            .filter(Boolean)
            .join(' / ') ? (
            <span className="text-xs text-[var(--ant-color-text-secondary)]">
              {[
                record.city,
                record.region,
                record.countryName || record.countryCode,
              ]
                .filter(Boolean)
                .join(' / ')}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      title: '公司判断',
      key: 'companyDecision',
      width: 150,
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          <Tag color="blue">Fit {record.fitScore ?? 0}</Tag>
          {renderStatusTag(record.decision, decisionStatusMeta)}
        </Space>
      ),
    },
    {
      title: '联系人',
      dataIndex: 'fullName',
      width: 220,
      ellipsis: true,
      render: (_, record) =>
        record.contactId ? (
          <div className="flex flex-col gap-1">
            <Text strong>{record.fullName || '-'}</Text>
            <span className="text-xs text-[var(--ant-color-text-secondary)]">
              {[record.jobTitle, record.department]
                .filter(Boolean)
                .join(' / ') || '-'}
            </span>
          </div>
        ) : (
          <Tag>无联系人</Tag>
        ),
    },
    {
      title: '决策人',
      dataIndex: 'decisionMakerStatus',
      width: 108,
      render: (_, record) =>
        record.contactId
          ? renderStatusTag(record.decisionMakerStatus, decisionMakerMeta)
          : '-',
    },
    {
      title: '联系人评分',
      dataIndex: 'contactScore',
      width: 110,
      render: (_, record) => (record.contactId ? record.contactScore : '-'),
    },
    {
      title: '邮箱',
      key: 'contactEmail',
      width: 220,
      render: (_, record) => renderLeadChannelValues(record, ['email']),
    },
    {
      title: '电话',
      key: 'contactPhone',
      width: 180,
      render: (_, record) =>
        renderLeadChannelValues(record, ['phone', 'mobile']),
    },
    {
      title: 'WhatsApp',
      key: 'contactWhatsapp',
      width: 180,
      render: (_, record) =>
        renderLeadChannelValues(record, ['whatsapp'], {
          preferSearchKeyword: true,
        }),
    },
    {
      title: 'LinkedIn',
      key: 'contactLinkedin',
      width: 180,
      render: (_, record) =>
        renderLeadChannelValues(record, ['linkedin'], {
          fallbackToCompany: !record.contactId,
          preferSearchKeyword: true,
        }),
    },
    {
      title: '其他社媒',
      key: 'contactSocial',
      width: 200,
      render: (_, record) =>
        renderLeadChannelValues(
          record,
          ['facebook', 'x', 'instagram', 'youtube', 'personal_page', 'other'],
          {
            fallbackToCompany: !record.contactId,
            preferSearchKeyword: true,
          },
        ),
    },
    {
      title: '渠道/证据',
      key: 'counts',
      width: 180,
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          <Tag>公司渠道 {record.companyChannelCount || 0}</Tag>
          {record.contactId ? (
            <>
              <Tag>联系人渠道 {record.contactChannelCount || 0}</Tag>
              <Tag>联系人证据 {record.contactEvidenceCount || 0}</Tag>
            </>
          ) : (
            <>
              <Tag>公司证据 {record.evidenceCount || 0}</Tag>
              <Tag>来源 {record.sourceCount || 0}</Tag>
            </>
          )}
        </Space>
      ),
    },
    {
      title: '审核',
      key: 'review',
      width: 112,
      render: (_, record) =>
        renderStatusTag(
          record.contactId
            ? record.contactReviewStatus
            : record.companyReviewStatus,
          reviewStatusMeta,
        ),
    },
    {
      title: '归档时间',
      dataIndex: 'createTime',
      width: 170,
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 118,
      fixed: 'right',
      render: (_, record) => (
        <TableActions
          maxVisible={2}
          actions={[
            {
              key: 'detail',
              label: '详情',
              icon: <EyeOutlined />,
              onClick: () => setDetailProfile(leadResultToProfile(record)),
            },
            {
              key: 'mail',
              label: '写邮件',
              icon: <MailOutlined />,
              disabled: !getLeadEmailChannel(record),
              onClick: () => openMailModal(record),
            },
          ]}
        />
      ),
    },
  ];

  const contactColumns: ColumnsType<SalesAccountContact> = [
    {
      title: '联系人',
      dataIndex: 'fullName',
      width: 180,
      ellipsis: true,
      render: (_, record) => (
        <div className="flex flex-col gap-1">
          <Text strong>{record.fullName}</Text>
          <span className="text-xs text-[var(--ant-color-text-secondary)]">
            {record.jobTitle || '-'}
          </span>
        </div>
      ),
    },
    {
      title: '可能决策人',
      dataIndex: 'decisionMakerStatus',
      width: 112,
      render: (value?: string) => renderStatusTag(value, decisionMakerMeta),
    },
    {
      title: '评分',
      dataIndex: 'contactScore',
      width: 78,
      render: (value?: number) => value ?? 0,
    },
    {
      title: '渠道/证据',
      key: 'counts',
      width: 110,
      render: (_, record) =>
        `${record.channels.length}/${record.evidences.length}`,
    },
    {
      title: '审核',
      dataIndex: 'reviewStatus',
      width: 102,
      render: (value?: string) => renderStatusTag(value, reviewStatusMeta),
    },
    {
      title: '操作',
      key: 'actions',
      width: 132,
      render: (_, record) => (
        <TableActions
          maxVisible={2}
          actions={[
            {
              key: 'approved',
              label: '确认',
              icon: <CheckCircleOutlined />,
              disabled: record.reviewStatus === 'approved',
              loading: contactReviewMutation.isPending,
              onClick: () =>
                contactReviewMutation.mutate({
                  contactId: record.id,
                  reviewStatus: 'approved',
                }),
            },
            {
              key: 'rejected',
              label: '排除',
              icon: <CloseCircleOutlined />,
              danger: true,
              disabled: record.reviewStatus === 'rejected',
              loading: contactReviewMutation.isPending,
              onClick: () =>
                contactReviewMutation.mutate({
                  contactId: record.id,
                  reviewStatus: 'rejected',
                }),
            },
            {
              key: 'needs_more_evidence',
              label: '待补证',
              icon: <FileSearchOutlined />,
              disabled: record.reviewStatus === 'needs_more_evidence',
              loading: contactReviewMutation.isPending,
              onClick: () =>
                contactReviewMutation.mutate({
                  contactId: record.id,
                  reviewStatus: 'needs_more_evidence',
                }),
            },
          ]}
        />
      ),
    },
  ];

  const evidenceDetail = leadEvidenceQuery.data?.data;
  const detailView = evidenceDetail?.profile || detailProfile;
  const contactDetail = leadContactsQuery.data?.data;
  const selectedTaskProgress = selectedTaskProgressQuery.data?.data;
  const detailRunProgress =
    evidenceDetail?.runProgress ||
    (detailView?.taskId &&
    selectedTaskProgress?.taskId &&
    String(detailView.taskId) === String(selectedTaskProgress.taskId)
      ? selectedTaskProgress
      : undefined);

  return (
    <PageContainer breadcrumbRender={false} title="线索台账">
      {messageContextHolder}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Space size={8} wrap>
            <Select
              allowClear
              placeholder="任务状态"
              style={{ width: 140 }}
              value={taskStatus}
              options={[
                { label: '阻塞', value: 'blocked' },
                { label: '待开始', value: 'ready' },
                { label: '执行中', value: 'running' },
                { label: '已完成', value: 'completed' },
                { label: '失败', value: 'failed' },
                { label: '已取消', value: 'canceled' },
              ]}
              onChange={(value) => {
                setTaskStatus(value);
                setTaskId(undefined);
                setQuery((prev) => ({
                  ...prev,
                  pageNum: 1,
                  taskStatus: value,
                  taskId: undefined,
                }));
              }}
            />
            <Select
              allowClear
              showSearch
              placeholder="任务"
              style={{ width: 320 }}
              value={taskId ? String(taskId) : undefined}
              loading={taskListQuery.isFetching}
              optionFilterProp="label"
              options={taskOptions.map((item) => ({
                label: item.label,
                value: item.value,
              }))}
              onChange={(value) => {
                setTaskId(value);
                setQuery((prev) => ({
                  ...prev,
                  pageNum: 1,
                  taskId: value,
                  taskStatus,
                }));
              }}
            />
            <Button type="primary" onClick={applyQuery}>
              查询
            </Button>
            <Button onClick={resetQuery}>重置</Button>
          </Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              void leadResultQuery.refetch();
              void taskListQuery.refetch();
              if (taskId) {
                void selectedTaskProgressQuery.refetch();
              }
            }}
          >
            刷新
          </Button>
        </div>

        {selectedTaskProgress
          ? renderTaskProgressSummary(selectedTaskProgress)
          : null}

        <Table<SalesLeadResult>
          className="recov-stable-pagination-table"
          rowKey={(record) =>
            String(record.contactId || `company-${record.profileId}`)
          }
          columns={columns}
          dataSource={leadResultQuery.data?.rows || []}
          loading={leadResultQuery.isLoading || leadResultQuery.isFetching}
          size="middle"
          scroll={{ x: 2600 }}
          pagination={{
            current: query.pageNum,
            pageSize: query.pageSize,
            total: leadResultQuery.data?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无任务结果"
              />
            ),
          }}
          onChange={handleTableChange}
        />
      </div>

      <Modal
        title="写邮件"
        open={Boolean(mailTarget)}
        width={720}
        okText="发送"
        confirmLoading={sendMailMutation.isPending}
        onCancel={() => {
          setMailTarget(undefined);
          mailForm.resetFields();
        }}
        onOk={() => mailForm.submit()}
      >
        <Form<SalesEmailMessagePayload>
          form={mailForm}
          layout="vertical"
          onFinish={(values) => sendMailMutation.mutate(values)}
        >
          <Form.Item name="profileId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="contactId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="contactChannelId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="contentFormat" hidden>
            <Input />
          </Form.Item>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <Form.Item
              name="accountId"
              label="发件邮箱"
              rules={[{ required: true, message: '请选择发件邮箱' }]}
            >
              <Select
                loading={
                  emailAccountQuery.isLoading || emailAccountQuery.isFetching
                }
                placeholder="发件邮箱"
                options={emailAccounts.map((item) => ({
                  label: `${item.accountName} <${item.emailAddress}>`,
                  value: item.id,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="toEmail"
              label="收件邮箱"
              rules={[
                { required: true, message: '请输入收件邮箱' },
                { type: 'email', message: '邮箱格式不正确' },
              ]}
            >
              <Input disabled />
            </Form.Item>
          </div>
          <Form.Item name="toName" label="收件人">
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="subject"
            label="主题"
            rules={[{ required: true, message: '请输入邮件主题' }]}
          >
            <Input placeholder="主题" />
          </Form.Item>
          <Form.Item
            name="body"
            label="正文"
            rules={[{ required: true, message: '请输入邮件正文' }]}
          >
            <Input.TextArea rows={8} placeholder="正文" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          detailView?.displayName || detailView?.primaryDomain || '线索详情'
        }
        open={Boolean(detailProfile)}
        width="88vw"
        footer={null}
        destroyOnHidden
        onCancel={() => setDetailProfile(undefined)}
        styles={{
          body: {
            maxHeight: 'calc(90vh - 120px)',
            overflowY: 'auto',
            paddingRight: 16,
          },
        }}
      >
        {detailView ? (
          <div className="flex flex-col gap-4">
            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, md: 2 }}
              items={[
                {
                  label: '公司',
                  children:
                    detailView.displayName || detailView.primaryDomain || '-',
                },
                { label: '官网', children: renderWebsite(detailView) },
                {
                  label: '主域名',
                  children: detailView.primaryDomain || '-',
                },
                {
                  label: '所在地',
                  children:
                    [
                      detailView.city,
                      detailView.region,
                      detailView.countryName || detailView.countryCode,
                    ]
                      .filter(Boolean)
                      .join(' / ') || '-',
                },
                {
                  label: '身份置信度',
                  children: detailView.identityConfidence || '-',
                },
                {
                  label: '来源类型',
                  children: detailView.sourceTypes.length
                    ? detailView.sourceTypes
                        .map((role) => sourceRoleMeta[role] || role)
                        .join('、')
                    : '-',
                },
                {
                  label: '任务',
                  children:
                    detailView.taskName ||
                    (detailView.taskId ? String(detailView.taskId) : '-'),
                },
                {
                  label: '运行ID',
                  children: detailView.runId ? String(detailView.runId) : '-',
                },
                {
                  label: '运行状态',
                  children: renderStatusTag(
                    detailView.runStatus,
                    runStatusMeta,
                  ),
                },
                {
                  label: '系统判断',
                  children: (
                    <Space size={8} wrap>
                      {renderStatusTag(detailView.decision, decisionStatusMeta)}
                      <span>{detailView.decisionReason || '-'}</span>
                    </Space>
                  ),
                },
                {
                  label: '人工审核',
                  children: (
                    <Space size={8} wrap>
                      {renderStatusTag(
                        detailView.reviewStatus,
                        reviewStatusMeta,
                      )}
                      <span>{detailView.reviewNote || '-'}</span>
                    </Space>
                  ),
                },
                {
                  label: '创建时间',
                  children: formatDateTime(detailView.createTime),
                },
              ]}
            />
            {renderTaskProgressSummary(detailRunProgress)}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {contactDetail ? (
                <Space size={[8, 8]} wrap>
                  <Tag>
                    公司渠道 {contactDetail.summary.companyChannelCount}
                  </Tag>
                  <Tag>联系人 {contactDetail.summary.contactCount}</Tag>
                  <Tag>
                    联系人渠道 {contactDetail.summary.contactChannelCount}
                  </Tag>
                  <Tag>联系人证据 {contactDetail.summary.evidenceCount}</Tag>
                  {renderContactDiscoveryOutcome(contactDetail)}
                  {renderProviderUsageSummary(contactDetail)}
                </Space>
              ) : (
                <span />
              )}
            </div>
            {renderEvidenceSummary(evidenceDetail)}
            <Tabs
              items={[
                {
                  key: 'task_progress',
                  label: '任务进度',
                  children: (
                    <div className="flex flex-col gap-3">
                      <Table<SalesSearchRunProgressEvent>
                        rowKey={(record, index) =>
                          String(
                            record.eventId || `${record.eventType}-${index}`,
                          )
                        }
                        columns={progressEventColumns}
                        dataSource={detailRunProgress?.recentEvents || []}
                        pagination={false}
                        size="small"
                        scroll={{ x: 900 }}
                        locale={{
                          emptyText: (
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description="暂无运行事件"
                            />
                          ),
                        }}
                      />
                    </div>
                  ),
                },
                {
                  key: 'coverage',
                  label: 'ICP 覆盖',
                  children: (
                    <Table<SalesLeadRequirementCoverage>
                      rowKey={(record, index) =>
                        record.requirementId || String(index)
                      }
                      columns={coverageColumns}
                      dataSource={evidenceDetail?.requirementCoverages || []}
                      pagination={false}
                      size="small"
                      scroll={{ x: 760 }}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="暂无条件覆盖"
                          />
                        ),
                      }}
                    />
                  ),
                },
                {
                  key: 'evidences',
                  label: '证据',
                  children: (
                    <Table<SalesLeadEvidenceItem>
                      rowKey={(record, index) =>
                        String(record.id || record.evidenceKey || index)
                      }
                      columns={evidenceColumns}
                      dataSource={evidenceDetail?.evidences || []}
                      pagination={false}
                      size="small"
                      scroll={{ x: 980 }}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="暂无证据"
                          />
                        ),
                      }}
                    />
                  ),
                },
                {
                  key: 'sources',
                  label: '来源',
                  children: (
                    <Table<SalesLeadSourceItem>
                      rowKey={(record, index) =>
                        String(record.id || record.sourceKey || index)
                      }
                      columns={sourceColumns}
                      dataSource={evidenceDetail?.sources || []}
                      pagination={false}
                      size="small"
                      scroll={{ x: 920 }}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="暂无来源"
                          />
                        ),
                      }}
                    />
                  ),
                },
                {
                  key: 'company_channels',
                  label: '公司渠道',
                  children: (
                    <Table<SalesAccountChannel>
                      rowKey={(record, index) =>
                        String(
                          record.id ||
                            `${record.channelType}-${record.channelValue}-${index}`,
                        )
                      }
                      columns={companyChannelColumns}
                      dataSource={contactDetail?.companyChannels || []}
                      loading={leadContactsQuery.isFetching}
                      pagination={false}
                      size="small"
                      scroll={{ x: 900 }}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="暂无公司渠道"
                          />
                        ),
                      }}
                    />
                  ),
                },
                {
                  key: 'contacts',
                  label: '联系人',
                  children: (
                    <Table<SalesAccountContact>
                      rowKey={(record) => String(record.id)}
                      columns={contactColumns}
                      dataSource={contactDetail?.contacts || []}
                      loading={leadContactsQuery.isFetching}
                      pagination={false}
                      size="small"
                      scroll={{ x: 760 }}
                      expandable={{
                        expandedRowRender: (record) => (
                          <div className="flex flex-col gap-3">
                            <Table<SalesAccountContactChannel>
                              rowKey={(item, index) =>
                                String(
                                  item.id ||
                                    `${item.channelType}-${item.channelValue}-${index}`,
                                )
                              }
                              columns={contactChannelColumns}
                              dataSource={record.channels}
                              pagination={false}
                              size="small"
                            />
                            <Table<SalesAccountContactEvidence>
                              rowKey={(item, index) =>
                                String(item.id || item.evidenceKey || index)
                              }
                              columns={contactEvidenceColumns}
                              dataSource={record.evidences}
                              pagination={false}
                              size="small"
                            />
                          </div>
                        ),
                      }}
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={contactEmptyDescription(contactDetail)}
                          />
                        ),
                      }}
                    />
                  ),
                },
                {
                  key: 'provider_usage',
                  label: '数据源调用',
                  children: (
                    <div className="flex flex-col gap-3">
                      <div>{renderProviderUsageSummary(contactDetail)}</div>
                      <Table<SalesProviderUsageEvent>
                        rowKey={(record, index) =>
                          `${record.provider}-${record.endpoint}-${record.objectKey}-${record.status}-${record.occurredTime || index}`
                        }
                        columns={providerUsageColumns}
                        dataSource={contactDetail?.providerUsageEvents || []}
                        loading={leadContactsQuery.isFetching}
                        pagination={false}
                        size="small"
                        scroll={{ x: 920 }}
                        locale={{
                          emptyText: (
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description="暂无数据源调用"
                            />
                          ),
                        }}
                      />
                    </div>
                  ),
                },
                {
                  key: 'profile',
                  label: '原始画像',
                  children: (
                    <pre className="max-h-[420px] overflow-auto rounded-lg bg-[var(--ant-color-fill-quaternary)] p-4 text-xs leading-5">
                      {toJsonText(
                        evidenceDetail?.accountProfile || detailView.profile,
                      )}
                    </pre>
                  ),
                },
              ]}
            />
          </div>
        ) : null}
      </Modal>
    </PageContainer>
  );
};

export default SalesLeadsPage;
