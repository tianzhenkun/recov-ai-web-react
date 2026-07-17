import { ruoyiRequest } from '@/adapters/ruoyi/request';
import type { RuoyiResponse } from '@/adapters/ruoyi/response';

export const SALES_JAVA_API_PREFIX = '/system/sales';

export type SalesId = number | string;
export type SalesTaskStatus =
  | '0'
  | '1'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'canceled'
  | string;
export type SalesTemplateStatus = '0' | '1' | string;
export type SalesRequirementType = 'required' | 'excluded' | 'preferred' | string;
export type SalesMatchMode = 'all' | 'any' | 'none' | string;
export type SalesTemplateAttrSource = 'system' | 'custom' | string;
export type SalesAccountProfileReviewStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'needs_more_evidence'
  | string;

export type SalesRequirement = {
  id?: string;
  type?: SalesRequirementType;
  attrSource?: SalesTemplateAttrSource;
  attr_source?: SalesTemplateAttrSource;
  text?: string;
  attributeKey?: string | null;
  attribute_key?: string | null;
  attributeName?: string | null;
  attribute_name?: string | null;
  scoreWeight?: number;
  score_weight?: number;
  sortOrder?: number;
  sort_order?: number;
  enabled?: boolean;
};

export type SalesIcpTemplateItemRecord = {
  id?: SalesId;
  tplId?: SalesId;
  tpl_id?: SalesId;
  attrSource?: SalesTemplateAttrSource;
  attr_source?: SalesTemplateAttrSource;
  attrKey?: string | null;
  attr_key?: string | null;
  attrName?: string;
  attr_name?: string;
  requirementType?: SalesRequirementType;
  requirement_type?: SalesRequirementType;
  matchMode?: SalesMatchMode;
  match_mode?: SalesMatchMode;
  scoreWeight?: number;
  score_weight?: number;
  valueText?: string;
  value_text?: string;
  sortOrder?: number;
  sort_order?: number;
  enabled?: boolean;
};

export type SalesIcpTemplateItem = {
  id?: SalesId;
  tplId?: SalesId;
  attrSource: SalesTemplateAttrSource;
  attrKey?: string | null;
  attrName: string;
  requirementType: SalesRequirementType;
  matchMode: SalesMatchMode;
  scoreWeight: number;
  valueText: string;
  sortOrder: number;
  enabled: boolean;
  raw?: SalesIcpTemplateItemRecord;
};

export type SalesIcpAttributePolicy = {
  key?: string;
  name?: string;
  desc?: string;
  source?: string;
  required?: boolean | string | number;
  fallback?: boolean | string | number;
  valueMode?: string;
  values?: string[];
  display?: boolean | string | number;
  enabled?: boolean | string | number;
  sortOrder?: number;
  sort_order?: number;
  scoreWeight?: number;
  score_weight?: number;
};

export type SalesIcpPolicy = {
  finalRequirementsShape?: Record<string, unknown>;
  attributePolicies?: SalesIcpAttributePolicy[];
  startupRequirements?: Record<string, unknown>[];
  defaultSearchStrategies?: Record<string, unknown>[];
  storageRule?: string;
};

export type SalesIcpTemplateRecord = {
  id?: SalesId;
  tplName?: string;
  tpl_name?: string;
  description?: string | null;
  items?: SalesIcpTemplateItemRecord[];
  requirements?: SalesRequirement[];
  status?: SalesTemplateStatus;
  canStart?: boolean;
  can_start?: boolean;
  missing?: Record<string, unknown>[];
  createTime?: string;
  create_time?: string;
  updateTime?: string;
  update_time?: string;
};

export type SalesIcpTemplate = {
  id: SalesId;
  tplName: string;
  description?: string;
  items: SalesIcpTemplateItem[];
  requirements?: SalesRequirement[];
  status: SalesTemplateStatus;
  canStart?: boolean;
  missing?: Record<string, unknown>[];
  createTime?: string;
  updateTime?: string;
  raw: SalesIcpTemplateRecord;
};

export type SalesGeneratedTemplateDraft = Omit<SalesIcpTemplate, 'id' | 'raw' | 'status'> & {
  status?: SalesTemplateStatus;
};

export type SalesTaskRecord = {
  id?: SalesId;
  taskName?: string;
  task_name?: string;
  templateId?: SalesId;
  template_id?: SalesId;
  templateSnapshot?: Record<string, unknown>;
  template_snapshot?: Record<string, unknown>;
  templateSnapshotJson?: string;
  template_snapshot_json?: string;
  status?: SalesTaskStatus;
  canStart?: boolean;
  can_start?: boolean;
  missing?: Record<string, unknown>[];
  requirements?: SalesRequirement[];
  errorMessage?: string;
  error_message?: string;
  warning?: string;
  createTime?: string;
  create_time?: string;
  updateTime?: string;
  update_time?: string;
};

export type SalesTask = {
  id: SalesId;
  taskName: string;
  templateId?: SalesId;
  templateSnapshot?: Record<string, unknown>;
  status: SalesTaskStatus;
  canStart: boolean;
  missing: Record<string, unknown>[];
  requirements: SalesRequirement[];
  errorMessage?: string;
  warning?: string;
  createTime?: string;
  updateTime?: string;
  raw: SalesTaskRecord;
};

export type SalesSearchRunRecord = {
  id?: SalesId;
  taskId?: SalesId;
  task_id?: SalesId;
  runType?: string;
  run_type?: string;
  status?: string;
  progress?: number;
  callbackSeq?: number;
  callback_seq?: number;
  lastCallbackEventId?: string;
  last_callback_event_id?: string;
  report?: Record<string, unknown>;
  reportJson?: string;
  report_json?: string;
  errorMessage?: string;
  error_message?: string;
  createTime?: string;
  create_time?: string;
  updateTime?: string;
  update_time?: string;
};

export type SalesSearchRunProgressEventRecord = {
  eventId?: string;
  event_id?: string;
  eventType?: string;
  event_type?: string;
  status?: string;
  progress?: number;
  stage?: string;
  stageLabel?: string;
  stage_label?: string;
  message?: string;
  payload?: Record<string, unknown>;
  createTime?: string;
  create_time?: string;
};

export type SalesSearchRunProgressRecord = {
  taskId?: SalesId;
  task_id?: SalesId;
  taskName?: string;
  task_name?: string;
  taskStatus?: SalesTaskStatus;
  task_status?: SalesTaskStatus;
  taskErrorMessage?: string;
  task_error_message?: string;
  runId?: SalesId;
  run_id?: SalesId;
  runType?: string;
  run_type?: string;
  runStatus?: string;
  run_status?: string;
  progress?: number;
  currentStage?: string;
  current_stage?: string;
  currentStageLabel?: string;
  current_stage_label?: string;
  message?: string;
  errorMessage?: string;
  error_message?: string;
  queryCount?: number;
  query_count?: number;
  resultCount?: number;
  result_count?: number;
  profileCount?: number;
  profile_count?: number;
  sourceCount?: number;
  source_count?: number;
  evidenceCount?: number;
  evidence_count?: number;
  contactCount?: number;
  contact_count?: number;
  eventCount?: number;
  event_count?: number;
  acceptedTime?: string;
  accepted_time?: string;
  startedTime?: string;
  started_time?: string;
  finishedTime?: string;
  finished_time?: string;
  createTime?: string;
  create_time?: string;
  updateTime?: string;
  update_time?: string;
  recentEvents?: SalesSearchRunProgressEventRecord[];
  recent_events?: SalesSearchRunProgressEventRecord[];
};

export type SalesSearchRunProgressEvent = {
  eventId?: string;
  eventType?: string;
  status?: string;
  progress?: number;
  stage?: string;
  stageLabel?: string;
  message?: string;
  payload?: Record<string, unknown>;
  createTime?: string;
};

export type SalesSearchRunProgress = {
  taskId?: SalesId;
  taskName?: string;
  taskStatus?: SalesTaskStatus;
  taskErrorMessage?: string;
  runId?: SalesId;
  runType?: string;
  runStatus?: string;
  progress: number;
  currentStage?: string;
  currentStageLabel?: string;
  message?: string;
  errorMessage?: string;
  queryCount: number;
  resultCount: number;
  profileCount: number;
  sourceCount: number;
  evidenceCount: number;
  contactCount: number;
  eventCount: number;
  acceptedTime?: string;
  startedTime?: string;
  finishedTime?: string;
  createTime?: string;
  updateTime?: string;
  recentEvents: SalesSearchRunProgressEvent[];
  raw: SalesSearchRunProgressRecord;
};

export type SalesTaskStartRecord = {
  taskId?: SalesId;
  task_id?: SalesId;
  runId?: SalesId;
  run_id?: SalesId;
  taskStatus?: string;
  task_status?: string;
  runStatus?: string;
  run_status?: string;
  accepted?: boolean;
  message?: string;
};

export type SalesSearchRun = {
  id: SalesId;
  taskId?: SalesId;
  runType: string;
  status: string;
  progress?: number;
  callbackSeq?: number;
  lastCallbackEventId?: string;
  report?: Record<string, unknown>;
  errorMessage?: string;
  createTime?: string;
  updateTime?: string;
  raw: SalesSearchRunRecord;
};

export type SalesAccountProfileRecord = {
  id?: SalesId;
  tenantId?: string;
  tenant_id?: string;
  runId?: SalesId;
  run_id?: SalesId;
  taskId?: SalesId;
  task_id?: SalesId;
  taskName?: string;
  task_name?: string;
  profileKey?: string;
  profile_key?: string;
  runType?: string;
  run_type?: string;
  runStatus?: string;
  run_status?: string;
  displayName?: string;
  display_name?: string;
  legalName?: string;
  legal_name?: string;
  primaryDomain?: string;
  primary_domain?: string;
  websiteUrl?: string;
  website_url?: string;
  nameConfidence?: string;
  name_confidence?: string;
  identityConfidence?: string;
  identity_confidence?: string;
  summary?: string;
  countryCode?: string;
  country_code?: string;
  countryName?: string;
  country_name?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  sourceTypes?: string[];
  source_types?: string[];
  decision?: string;
  decisionReason?: string;
  decision_reason?: string;
  fitScore?: number;
  fit_score?: number;
  reviewStatus?: SalesAccountProfileReviewStatus;
  review_status?: SalesAccountProfileReviewStatus;
  reviewNote?: string;
  review_note?: string;
  evidenceCount?: number;
  evidence_count?: number;
  sourceCount?: number;
  source_count?: number;
  profile?: Record<string, unknown>;
  createTime?: string;
  create_time?: string;
  updateTime?: string;
  update_time?: string;
};

export type SalesAccountProfile = {
  id: SalesId;
  tenantId?: string;
  runId?: SalesId;
  taskId?: SalesId;
  taskName?: string;
  profileKey?: string;
  runType?: string;
  runStatus?: string;
  displayName?: string;
  legalName?: string;
  primaryDomain: string;
  websiteUrl?: string;
  nameConfidence?: string;
  identityConfidence?: string;
  summary?: string;
  countryCode?: string;
  countryName?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  sourceTypes: string[];
  decision: string;
  decisionReason?: string;
  fitScore?: number;
  reviewStatus: SalesAccountProfileReviewStatus;
  reviewNote?: string;
  evidenceCount: number;
  sourceCount: number;
  profile?: Record<string, unknown>;
  createTime?: string;
  updateTime?: string;
  raw: SalesAccountProfileRecord;
};

export type SalesAccountChannelRecord = {
  id?: SalesId;
  profileId?: SalesId;
  profile_id?: SalesId;
  channelType?: string;
  channel_type?: string;
  channelValue?: string;
  channel_value?: string;
  normalizedValue?: string;
  normalized_value?: string;
  sourceUrl?: string;
  source_url?: string;
  sourceDomain?: string;
  source_domain?: string;
  confidence?: number;
  verifiedStatus?: string;
  verified_status?: string;
  reason?: string;
  raw?: Record<string, unknown>;
  createTime?: string;
  create_time?: string;
};

export type SalesAccountContactChannelRecord = SalesAccountChannelRecord & {
  contactId?: SalesId;
  contact_id?: SalesId;
};

export type SalesAccountContactEvidenceRecord = {
  id?: SalesId;
  contactId?: SalesId;
  contact_id?: SalesId;
  profileId?: SalesId;
  profile_id?: SalesId;
  evidenceKey?: string;
  evidence_key?: string;
  evidenceType?: string;
  evidence_type?: string;
  judgment?: string;
  evidenceText?: string;
  evidence_text?: string;
  sourceUrl?: string;
  source_url?: string;
  sourceDomain?: string;
  source_domain?: string;
  title?: string;
  provider?: string;
  reason?: string;
  raw?: Record<string, unknown>;
  createTime?: string;
  create_time?: string;
};

export type SalesAccountContactRecord = {
  id?: SalesId;
  profileId?: SalesId;
  profile_id?: SalesId;
  runId?: SalesId;
  run_id?: SalesId;
  taskId?: SalesId;
  task_id?: SalesId;
  contactKey?: string;
  contact_key?: string;
  fullName?: string;
  full_name?: string;
  rawName?: string;
  raw_name?: string;
  jobTitle?: string;
  job_title?: string;
  department?: string;
  functionText?: string;
  function_text?: string;
  decisionMakerStatus?: string;
  decision_maker_status?: string;
  confidence?: number;
  contactScore?: number;
  contact_score?: number;
  sourceCount?: number;
  source_count?: number;
  evidenceCount?: number;
  evidence_count?: number;
  reviewStatus?: SalesAccountProfileReviewStatus;
  review_status?: SalesAccountProfileReviewStatus;
  reviewNote?: string;
  review_note?: string;
  reason?: string;
  channels?: SalesAccountContactChannelRecord[];
  evidences?: SalesAccountContactEvidenceRecord[];
  raw?: Record<string, unknown>;
  createTime?: string;
  create_time?: string;
  updateTime?: string;
  update_time?: string;
};

export type SalesProviderUsageProviderRecord = {
  provider?: string;
  eventCount?: number;
  event_count?: number;
  executedRequests?: number;
  executed_requests?: number;
  billableRequests?: number;
  billable_requests?: number;
  cacheHitCount?: number;
  cache_hit_count?: number;
  skipCount?: number;
  skip_count?: number;
  budgetSkipCount?: number;
  budget_skip_count?: number;
  errorCount?: number;
  error_count?: number;
};

export type SalesProviderUsageSummaryRecord = SalesProviderUsageProviderRecord & {
  providers?: SalesProviderUsageProviderRecord[];
};

export type SalesProviderUsageEventRecord = {
  provider?: string;
  endpoint?: string;
  objectKey?: string;
  object_key?: string;
  status?: string;
  reason?: string;
  unitCount?: number;
  unit_count?: number;
  unitType?: string;
  unit_type?: string;
  billable?: boolean | string | number;
  occurredTime?: string;
  occurred_time?: string;
};

export type SalesContactDiscoveryOutcomeRecord = {
  status?: string;
  label?: string;
  description?: string;
  providerAttempted?: boolean | string | number;
  provider_attempted?: boolean | string | number;
  cacheOnly?: boolean | string | number;
  cache_only?: boolean | string | number;
  hasCompanyChannels?: boolean | string | number;
  has_company_channels?: boolean | string | number;
  lastOccurredTime?: string;
  last_occurred_time?: string;
};

export type SalesAccountContactsRecord = {
  profileId?: SalesId;
  profile_id?: SalesId;
  companyChannels?: SalesAccountChannelRecord[];
  company_channels?: SalesAccountChannelRecord[];
  contacts?: SalesAccountContactRecord[];
  discoveryOutcome?: SalesContactDiscoveryOutcomeRecord;
  discovery_outcome?: SalesContactDiscoveryOutcomeRecord;
  providerUsageSummary?: SalesProviderUsageSummaryRecord;
  provider_usage_summary?: SalesProviderUsageSummaryRecord;
  providerUsageEvents?: SalesProviderUsageEventRecord[];
  provider_usage_events?: SalesProviderUsageEventRecord[];
  summary?: {
    companyChannelCount?: number;
    company_channel_count?: number;
    contactCount?: number;
    contact_count?: number;
    contactChannelCount?: number;
    contact_channel_count?: number;
    evidenceCount?: number;
    evidence_count?: number;
  };
};

export type SalesAccountChannel = {
  id?: SalesId;
  profileId?: SalesId;
  channelType: string;
  channelValue: string;
  normalizedValue?: string;
  sourceUrl?: string;
  sourceDomain?: string;
  confidence: number;
  verifiedStatus: string;
  reason?: string;
  raw?: Record<string, unknown>;
  createTime?: string;
};

export type SalesAccountContactChannel = SalesAccountChannel & {
  contactId?: SalesId;
};

export type SalesAccountContactEvidence = {
  id?: SalesId;
  contactId?: SalesId;
  profileId?: SalesId;
  evidenceKey?: string;
  evidenceType: string;
  judgment: string;
  evidenceText?: string;
  sourceUrl?: string;
  sourceDomain?: string;
  title?: string;
  provider?: string;
  reason?: string;
  raw?: Record<string, unknown>;
  createTime?: string;
};

export type SalesAccountContact = {
  id: SalesId;
  profileId?: SalesId;
  runId?: SalesId;
  taskId?: SalesId;
  contactKey?: string;
  fullName: string;
  rawName?: string;
  jobTitle?: string;
  department?: string;
  functionText?: string;
  decisionMakerStatus: string;
  confidence: number;
  contactScore: number;
  sourceCount: number;
  evidenceCount: number;
  reviewStatus: SalesAccountProfileReviewStatus;
  reviewNote?: string;
  reason?: string;
  channels: SalesAccountContactChannel[];
  evidences: SalesAccountContactEvidence[];
  raw?: Record<string, unknown>;
  createTime?: string;
  updateTime?: string;
};

export type SalesProviderUsageProvider = {
  provider: string;
  eventCount: number;
  executedRequests: number;
  billableRequests: number;
  cacheHitCount: number;
  skipCount: number;
  budgetSkipCount: number;
  errorCount: number;
};

export type SalesProviderUsageSummary = SalesProviderUsageProvider & {
  providers: SalesProviderUsageProvider[];
};

export type SalesProviderUsageEvent = {
  provider: string;
  endpoint: string;
  objectKey: string;
  status: string;
  reason?: string;
  unitCount: number;
  unitType: string;
  billable: boolean;
  occurredTime?: string;
};

export type SalesContactDiscoveryOutcome = {
  status: string;
  label: string;
  description: string;
  providerAttempted: boolean;
  cacheOnly: boolean;
  hasCompanyChannels: boolean;
  lastOccurredTime?: string;
};

export type SalesProviderConfigKeyStatus = {
  name?: string;
  configured?: boolean;
  valueReturned?: boolean;
};

export type SalesProviderConfigStatusItem = {
  key?: string;
  name?: string;
  category?: string;
  enabled?: boolean;
  configured?: boolean;
  status?: string;
  description?: string;
  keyStatus?: SalesProviderConfigKeyStatus[];
  limits?: Record<string, unknown>;
  details?: Record<string, unknown>;
};

export type SalesProviderConfigStatusSection = {
  key?: string;
  title?: string;
  description?: string;
  items?: SalesProviderConfigStatusItem[];
};

export type SalesProviderConfigStatus = {
  schemaVersion?: string;
  generatedAt?: string;
  source?: string;
  editable?: boolean;
  secretValueReturned?: boolean;
  summary?: {
    itemCount?: number;
    enabledCount?: number;
    missingKeyCount?: number;
  };
  sections?: SalesProviderConfigStatusSection[];
};

export type SalesAccountContacts = {
  profileId?: SalesId;
  companyChannels: SalesAccountChannel[];
  contacts: SalesAccountContact[];
  summary: {
    companyChannelCount: number;
    contactCount: number;
    contactChannelCount: number;
    evidenceCount: number;
  };
  discoveryOutcome: SalesContactDiscoveryOutcome;
  providerUsageSummary: SalesProviderUsageSummary;
  providerUsageEvents: SalesProviderUsageEvent[];
};

export type SalesTaskQuery = {
  pageNum?: number;
  pageSize?: number;
  taskName?: string;
  templateId?: SalesId;
  status?: SalesTaskStatus;
};

export type SalesTemplateQuery = {
  pageNum?: number;
  pageSize?: number;
  tplName?: string;
  status?: SalesTemplateStatus;
};

export type SalesIcpAttrRecord = {
  id?: SalesId;
  tenantId?: string;
  tenant_id?: string;
  attrKey?: string;
  attr_key?: string;
  attrName?: string;
  attr_name?: string;
  attrDesc?: string;
  attr_desc?: string;
  required?: boolean | string | number;
  scoreWeight?: number;
  score_weight?: number;
  sortOrder?: number;
  sort_order?: number;
  createTime?: string;
  create_time?: string;
  updateTime?: string;
  update_time?: string;
};

export type SalesIcpAttr = {
  id: SalesId;
  tenantId?: string;
  attrKey: string;
  attrName: string;
  attrDesc: string;
  required: boolean;
  scoreWeight: number;
  sortOrder: number;
  createTime?: string;
  updateTime?: string;
  raw: SalesIcpAttrRecord;
};

export type SalesIcpAttrQuery = {
  pageNum?: number;
  pageSize?: number;
  attrKey?: string;
  attrName?: string;
  required?: boolean;
};

export type SalesIcpAttrPayload = {
  id?: SalesId;
  attrKey: string;
  attrName: string;
  attrDesc: string;
  required?: boolean;
  scoreWeight?: number;
  sortOrder?: number;
};

export type SalesSearchRunQuery = {
  pageNum?: number;
  pageSize?: number;
  taskId?: SalesId;
  runType?: string;
  status?: string;
};

export type SalesLeadQuery = {
  pageNum?: number;
  pageSize?: number;
  taskId?: SalesId;
  runId?: SalesId;
  keyword?: string;
  decision?: string;
  reviewStatus?: SalesAccountProfileReviewStatus;
};

export type SalesLeadResultQuery = {
  pageNum?: number;
  pageSize?: number;
  taskId?: SalesId;
  taskStatus?: SalesTaskStatus;
};

export type SalesLeadResultRecord = {
  profileId?: SalesId;
  profile_id?: SalesId;
  contactId?: SalesId;
  contact_id?: SalesId;
  tenantId?: string;
  tenant_id?: string;
  taskId?: SalesId;
  task_id?: SalesId;
  taskName?: string;
  task_name?: string;
  taskStatus?: SalesTaskStatus;
  task_status?: SalesTaskStatus;
  runId?: SalesId;
  run_id?: SalesId;
  runType?: string;
  run_type?: string;
  runStatus?: string;
  run_status?: string;
  displayName?: string;
  display_name?: string;
  legalName?: string;
  legal_name?: string;
  primaryDomain?: string;
  primary_domain?: string;
  websiteUrl?: string;
  website_url?: string;
  nameConfidence?: string;
  name_confidence?: string;
  identityConfidence?: string;
  identity_confidence?: string;
  summary?: string;
  countryCode?: string;
  country_code?: string;
  countryName?: string;
  country_name?: string;
  region?: string;
  city?: string;
  sourceTypes?: string[];
  source_types?: string[];
  decision?: string;
  decisionReason?: string;
  decision_reason?: string;
  fitScore?: number;
  fit_score?: number;
  companyReviewStatus?: SalesAccountProfileReviewStatus;
  company_review_status?: SalesAccountProfileReviewStatus;
  companyReviewNote?: string;
  company_review_note?: string;
  evidenceCount?: number;
  evidence_count?: number;
  sourceCount?: number;
  source_count?: number;
  companyChannelCount?: number;
  company_channel_count?: number;
  companyChannelsText?: string;
  company_channels_text?: string;
  companyChannels?: SalesAccountChannelRecord[];
  company_channels?: SalesAccountChannelRecord[];
  contactKey?: string;
  contact_key?: string;
  fullName?: string;
  full_name?: string;
  rawName?: string;
  raw_name?: string;
  jobTitle?: string;
  job_title?: string;
  department?: string;
  functionText?: string;
  function_text?: string;
  decisionMakerStatus?: string;
  decision_maker_status?: string;
  confidence?: number;
  contactScore?: number;
  contact_score?: number;
  contactSourceCount?: number;
  contact_source_count?: number;
  contactEvidenceCount?: number;
  contact_evidence_count?: number;
  contactChannelCount?: number;
  contact_channel_count?: number;
  contactChannels?: SalesAccountContactChannelRecord[];
  contact_channels?: SalesAccountContactChannelRecord[];
  contactReviewStatus?: SalesAccountProfileReviewStatus;
  contact_review_status?: SalesAccountProfileReviewStatus;
  contactReviewNote?: string;
  contact_review_note?: string;
  contactReason?: string;
  contact_reason?: string;
  profile?: Record<string, unknown>;
  createTime?: string;
  create_time?: string;
  updateTime?: string;
  update_time?: string;
};

export type SalesLeadResult = {
  profileId: SalesId;
  contactId?: SalesId;
  tenantId?: string;
  taskId?: SalesId;
  taskName?: string;
  taskStatus: SalesTaskStatus;
  runId?: SalesId;
  runType?: string;
  runStatus?: string;
  displayName?: string;
  legalName?: string;
  primaryDomain: string;
  websiteUrl?: string;
  nameConfidence?: string;
  identityConfidence?: string;
  summary?: string;
  countryCode?: string;
  countryName?: string;
  region?: string;
  city?: string;
  sourceTypes: string[];
  decision: string;
  decisionReason?: string;
  fitScore: number;
  companyReviewStatus: SalesAccountProfileReviewStatus;
  companyReviewNote?: string;
  evidenceCount: number;
  sourceCount: number;
  companyChannelCount: number;
  companyChannelsText?: string;
  companyChannels: SalesAccountChannel[];
  contactKey?: string;
  fullName?: string;
  rawName?: string;
  jobTitle?: string;
  department?: string;
  functionText?: string;
  decisionMakerStatus?: string;
  confidence: number;
  contactScore: number;
  contactSourceCount: number;
  contactEvidenceCount: number;
  contactChannelCount: number;
  contactChannels: SalesAccountContactChannel[];
  contactReviewStatus?: SalesAccountProfileReviewStatus;
  contactReviewNote?: string;
  contactReason?: string;
  profile?: Record<string, unknown>;
  createTime?: string;
  updateTime?: string;
  raw: SalesLeadResultRecord;
};

export type SalesLeadEvidenceSummaryRecord = {
  evidenceCount?: number;
  evidence_count?: number;
  supportedCount?: number;
  supported_count?: number;
  conflictedCount?: number;
  conflicted_count?: number;
  unknownCount?: number;
  unknown_count?: number;
  sourceCount?: number;
  source_count?: number;
  requirementCount?: number;
  requirement_count?: number;
  coveredRequirementCount?: number;
  covered_requirement_count?: number;
  missingRequiredCount?: number;
  missing_required_count?: number;
};

export type SalesLeadRequirementCoverageRecord = {
  requirementId?: string;
  requirement_id?: string;
  requirementType?: string;
  requirement_type?: string;
  requirementText?: string;
  requirement_text?: string;
  attributeKey?: string;
  attribute_key?: string;
  attributeName?: string;
  attribute_name?: string;
  judgment?: string;
  evidenceCount?: number;
  evidence_count?: number;
  supportedCount?: number;
  supported_count?: number;
  conflictedCount?: number;
  conflicted_count?: number;
  unknownCount?: number;
  unknown_count?: number;
};

export type SalesLeadEvidenceItemRecord = {
  id?: SalesId;
  evidenceKey?: string;
  evidence_key?: string;
  requirementId?: string;
  requirement_id?: string;
  requirementType?: string;
  requirement_type?: string;
  judgment?: string;
  evidenceText?: string;
  evidence_text?: string;
  reason?: string;
  evaluator?: string;
  resultId?: SalesId;
  result_id?: SalesId;
  sourceUrl?: string;
  source_url?: string;
  sourceDomain?: string;
  source_domain?: string;
  title?: string;
  snippet?: string;
  queryText?: string;
  query_text?: string;
  provider?: string;
  page?: number;
  providerRank?: number;
  provider_rank?: number;
  resultType?: string;
  result_type?: string;
  createTime?: string;
  create_time?: string;
};

export type SalesLeadSourceItemRecord = {
  id?: SalesId;
  sourceKey?: string;
  source_key?: string;
  sourceUrl?: string;
  source_url?: string;
  sourceDomain?: string;
  source_domain?: string;
  sourceRole?: string;
  source_role?: string;
  provider?: string;
  page?: number;
  providerRank?: number;
  provider_rank?: number;
  matchedTerms?: string[];
  matched_terms?: string[];
  reason?: string;
  resultId?: SalesId;
  result_id?: SalesId;
  queryId?: SalesId;
  query_id?: SalesId;
  roundId?: SalesId;
  round_id?: SalesId;
  title?: string;
  snippet?: string;
  queryText?: string;
  query_text?: string;
};

export type SalesLeadEvidenceDetailRecord = {
  profile?: SalesAccountProfileRecord;
  summary?: SalesLeadEvidenceSummaryRecord;
  requirementCoverages?: SalesLeadRequirementCoverageRecord[];
  requirement_coverages?: SalesLeadRequirementCoverageRecord[];
  evidences?: SalesLeadEvidenceItemRecord[];
  sources?: SalesLeadSourceItemRecord[];
  accountProfile?: Record<string, unknown>;
  account_profile?: Record<string, unknown>;
  runProgress?: SalesSearchRunProgressRecord;
  run_progress?: SalesSearchRunProgressRecord;
};

export type SalesLeadEvidenceSummary = {
  evidenceCount: number;
  supportedCount: number;
  conflictedCount: number;
  unknownCount: number;
  sourceCount: number;
  requirementCount: number;
  coveredRequirementCount: number;
  missingRequiredCount: number;
};

export type SalesLeadRequirementCoverage = {
  requirementId?: string;
  requirementType?: string;
  requirementText?: string;
  attributeKey?: string;
  attributeName?: string;
  judgment: string;
  evidenceCount: number;
  supportedCount: number;
  conflictedCount: number;
  unknownCount: number;
};

export type SalesLeadEvidenceItem = {
  id?: SalesId;
  evidenceKey?: string;
  requirementId?: string;
  requirementType?: string;
  judgment: string;
  evidenceText?: string;
  reason?: string;
  evaluator?: string;
  resultId?: SalesId;
  sourceUrl?: string;
  sourceDomain?: string;
  title?: string;
  snippet?: string;
  queryText?: string;
  provider?: string;
  page?: number;
  providerRank?: number;
  resultType?: string;
  createTime?: string;
};

export type SalesLeadSourceItem = {
  id?: SalesId;
  sourceKey?: string;
  sourceUrl?: string;
  sourceDomain?: string;
  sourceRole?: string;
  provider?: string;
  page?: number;
  providerRank?: number;
  matchedTerms: string[];
  reason?: string;
  resultId?: SalesId;
  queryId?: SalesId;
  roundId?: SalesId;
  title?: string;
  snippet?: string;
  queryText?: string;
};

export type SalesLeadEvidenceDetail = {
  profile: SalesAccountProfile;
  summary: SalesLeadEvidenceSummary;
  requirementCoverages: SalesLeadRequirementCoverage[];
  evidences: SalesLeadEvidenceItem[];
  sources: SalesLeadSourceItem[];
  accountProfile?: Record<string, unknown>;
  runProgress?: SalesSearchRunProgress;
  raw: SalesLeadEvidenceDetailRecord;
};

export type GenerateSalesTemplatePayload = {
  prompt: string;
  tplName?: string;
  description?: string;
};

export type CreateSalesTemplatePayload = {
  tplName: string;
  description?: string;
  status?: SalesTemplateStatus;
  items: SalesIcpTemplateItem[];
};

export type UpdateSalesTemplatePayload = {
  id: SalesId;
  tplName?: string;
  description?: string;
  status?: SalesTemplateStatus;
  items?: SalesIcpTemplateItem[];
};

export type CreateSalesTaskPayload = {
  taskName?: string;
  description?: string;
  requirements: SalesRequirement[];
};

export type CreateSalesTaskFromTemplatePayload = {
  taskName?: string;
};

export type UpdateSalesAccountProfileReviewPayload = {
  reviewStatus: SalesAccountProfileReviewStatus;
  reviewNote?: string;
};

export type SalesEmailFlag = '0' | '1' | string;
export type SalesEmailEncryption = 'SSL_TLS' | 'STARTTLS' | 'NONE' | string;
export type SalesEmailMessageStatus =
  | 'draft'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'replied'
  | 'bounced'
  | 'cancelled'
  | 'blocked'
  | string;

export type SalesEmailAccountRecord = {
  id?: SalesId;
  ownerUserId?: SalesId;
  owner_user_id?: SalesId;
  accountName?: string;
  account_name?: string;
  emailAddress?: string;
  email_address?: string;
  fromName?: string;
  from_name?: string;
  providerLabel?: string;
  provider_label?: string;
  smtpHost?: string;
  smtp_host?: string;
  smtpPort?: number;
  smtp_port?: number;
  smtpEncryption?: SalesEmailEncryption;
  smtp_encryption?: SalesEmailEncryption;
  smtpUsername?: string;
  smtp_username?: string;
  smtpSecretConfigured?: boolean;
  smtp_secret_configured?: boolean;
  imapEnabled?: SalesEmailFlag;
  imap_enabled?: SalesEmailFlag;
  imapHost?: string;
  imap_host?: string;
  imapPort?: number;
  imap_port?: number;
  imapEncryption?: SalesEmailEncryption;
  imap_encryption?: SalesEmailEncryption;
  imapUsername?: string;
  imap_username?: string;
  imapSecretConfigured?: boolean;
  imap_secret_configured?: boolean;
  enabled?: SalesEmailFlag;
  defaultFlag?: SalesEmailFlag;
  default_flag?: SalesEmailFlag;
  smtpTestStatus?: string;
  smtp_test_status?: string;
  smtpTestMessage?: string;
  smtp_test_message?: string;
  smtpTestTime?: string;
  smtp_test_time?: string;
  imapTestStatus?: string;
  imap_test_status?: string;
  imapTestMessage?: string;
  imap_test_message?: string;
  imapTestTime?: string;
  imap_test_time?: string;
  lastSyncUid?: string;
  last_sync_uid?: string;
  lastSyncTime?: string;
  last_sync_time?: string;
  createTime?: string;
  create_time?: string;
  updateTime?: string;
  update_time?: string;
};

export type SalesEmailAccount = {
  id: SalesId;
  ownerUserId?: SalesId;
  accountName: string;
  emailAddress: string;
  fromName?: string;
  providerLabel?: string;
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: SalesEmailEncryption;
  smtpUsername: string;
  smtpSecretConfigured: boolean;
  imapEnabled: SalesEmailFlag;
  imapHost?: string;
  imapPort?: number;
  imapEncryption: SalesEmailEncryption;
  imapUsername?: string;
  imapSecretConfigured: boolean;
  enabled: SalesEmailFlag;
  defaultFlag: SalesEmailFlag;
  smtpTestStatus: string;
  smtpTestMessage?: string;
  smtpTestTime?: string;
  imapTestStatus: string;
  imapTestMessage?: string;
  imapTestTime?: string;
  lastSyncUid?: string;
  lastSyncTime?: string;
  createTime?: string;
  updateTime?: string;
  raw: SalesEmailAccountRecord;
};

export type SalesEmailAccountQuery = {
  emailAddress?: string;
  enabled?: SalesEmailFlag;
};

export type SalesEmailAccountPayload = {
  id?: SalesId;
  accountName: string;
  emailAddress: string;
  fromName?: string;
  providerLabel?: string;
  smtpHost: string;
  smtpPort: number;
  smtpEncryption?: SalesEmailEncryption;
  smtpUsername: string;
  smtpAuthSecret?: string;
  imapEnabled?: SalesEmailFlag;
  imapHost?: string;
  imapPort?: number;
  imapEncryption?: SalesEmailEncryption;
  imapUsername?: string;
  imapAuthSecret?: string;
  enabled?: SalesEmailFlag;
  defaultFlag?: SalesEmailFlag;
};

export type SalesEmailMessageRecord = {
  id?: SalesId;
  ownerUserId?: SalesId;
  owner_user_id?: SalesId;
  accountId?: SalesId;
  account_id?: SalesId;
  profileId?: SalesId;
  profile_id?: SalesId;
  contactId?: SalesId;
  contact_id?: SalesId;
  contactChannelId?: SalesId;
  contact_channel_id?: SalesId;
  toEmail?: string;
  to_email?: string;
  normalizedToEmail?: string;
  normalized_to_email?: string;
  toName?: string;
  to_name?: string;
  fromEmail?: string;
  from_email?: string;
  fromName?: string;
  from_name?: string;
  subject?: string;
  body?: string;
  contentFormat?: string;
  content_format?: string;
  status?: SalesEmailMessageStatus;
  providerMessageId?: string;
  provider_message_id?: string;
  messageIdHeader?: string;
  message_id_header?: string;
  sentAt?: string;
  sent_at?: string;
  firstReplyAt?: string;
  first_reply_at?: string;
  bouncedAt?: string;
  bounced_at?: string;
  failedAt?: string;
  failed_at?: string;
  lastAttemptAt?: string;
  last_attempt_at?: string;
  retryCount?: number;
  retry_count?: number;
  errorMessage?: string;
  error_message?: string;
  createTime?: string;
  create_time?: string;
  updateTime?: string;
  update_time?: string;
};

export type SalesEmailMessage = {
  id: SalesId;
  ownerUserId?: SalesId;
  accountId?: SalesId;
  profileId?: SalesId;
  contactId?: SalesId;
  contactChannelId?: SalesId;
  toEmail: string;
  normalizedToEmail?: string;
  toName?: string;
  fromEmail?: string;
  fromName?: string;
  subject: string;
  body?: string;
  contentFormat: string;
  status: SalesEmailMessageStatus;
  providerMessageId?: string;
  messageIdHeader?: string;
  sentAt?: string;
  firstReplyAt?: string;
  bouncedAt?: string;
  failedAt?: string;
  lastAttemptAt?: string;
  retryCount: number;
  errorMessage?: string;
  createTime?: string;
  updateTime?: string;
  raw: SalesEmailMessageRecord;
};

export type SalesEmailMessageQuery = {
  pageNum?: number;
  pageSize?: number;
  accountId?: SalesId;
  profileId?: SalesId;
  contactId?: SalesId;
  status?: SalesEmailMessageStatus;
};

export type SalesEmailMessagePayload = {
  accountId: SalesId;
  profileId?: SalesId;
  contactId?: SalesId;
  contactChannelId?: SalesId;
  toEmail: string;
  toName?: string;
  subject: string;
  body: string;
  contentFormat?: string;
};

export type SalesEmailEventRecord = {
  id?: SalesId;
  ownerUserId?: SalesId;
  owner_user_id?: SalesId;
  messageId?: SalesId;
  message_id?: SalesId;
  accountId?: SalesId;
  account_id?: SalesId;
  eventType?: string;
  event_type?: string;
  eventSource?: string;
  event_source?: string;
  eventTime?: string;
  event_time?: string;
  summary?: string;
  raw?: Record<string, unknown>;
  createTime?: string;
  create_time?: string;
};

export type SalesEmailEvent = {
  id?: SalesId;
  ownerUserId?: SalesId;
  messageId?: SalesId;
  accountId?: SalesId;
  eventType: string;
  eventSource?: string;
  eventTime?: string;
  summary?: string;
  raw?: Record<string, unknown>;
  createTime?: string;
};

export type SalesEmailDoNotContactRecord = {
  id?: SalesId;
  ownerUserId?: SalesId;
  owner_user_id?: SalesId;
  email?: string;
  normalizedEmail?: string;
  normalized_email?: string;
  reasonType?: string;
  reason_type?: string;
  reason?: string;
  sourceMessageId?: SalesId;
  source_message_id?: SalesId;
  createTime?: string;
  create_time?: string;
};

export type SalesEmailDoNotContact = {
  id: SalesId;
  ownerUserId?: SalesId;
  email: string;
  normalizedEmail?: string;
  reasonType: string;
  reason?: string;
  sourceMessageId?: SalesId;
  createTime?: string;
  raw: SalesEmailDoNotContactRecord;
};

export type SalesEmailDoNotContactPayload = {
  email: string;
  reasonType?: string;
  reason?: string;
  sourceMessageId?: SalesId;
};

export type SalesEmailOperation = {
  success: boolean;
  status?: string;
  message?: string;
  messageId?: SalesId;
  processedCount?: number;
};

const readValue = (source: unknown, keys: string[]) => {
  if (!source || typeof source !== 'object') return undefined;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
};

const toText = (value: unknown, fallback = '') =>
  value === undefined || value === null ? fallback : String(value);

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['true', '1', 'yes'].includes(value.trim().toLowerCase());
  }
  return false;
};

const toOptionalNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const toList = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const toObject = <T extends Record<string, unknown>>(value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as T)
    : undefined;

const parseStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => toText(item).trim()).filter(Boolean);
      }
    } catch {
      return [value.trim()];
    }
  }
  return [];
};

const parseObjectJson = (value: unknown): Record<string, unknown> | undefined => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

const normalizeResponseRows = <Input, Output>(
  response: RuoyiResponse<Input>,
  normalize: (item: Input) => Output | null,
): RuoyiResponse<Output> => ({
  ...response,
  rows: response.rows?.map(normalize).filter((item): item is Output => !!item),
  data: response.data ? (normalize(response.data) ?? undefined) : undefined,
});

export const normalizeTemplateItem = (
  record?: SalesIcpTemplateItemRecord | null,
): SalesIcpTemplateItem | null => {
  if (!record) return null;
  const attrSource = toText(readValue(record, ['attrSource', 'attr_source']), 'system');
  const attrName = toText(readValue(record, ['attrName', 'attr_name']));
  const valueText = toText(readValue(record, ['valueText', 'value_text']));
  if (!attrName || !valueText) return null;

  return {
    id: record.id,
    tplId: readValue(record, ['tplId', 'tpl_id']) as SalesId,
    attrSource,
    attrKey: readValue(record, ['attrKey', 'attr_key']) as string | null,
    attrName,
    requirementType: toText(
      readValue(record, ['requirementType', 'requirement_type']),
      'required',
    ),
    matchMode: toText(readValue(record, ['matchMode', 'match_mode']), 'all'),
    scoreWeight: toNumber(readValue(record, ['scoreWeight', 'score_weight']), 10),
    valueText,
    sortOrder: Number(readValue(record, ['sortOrder', 'sort_order']) || 0),
    enabled: record.enabled !== false,
    raw: record,
  };
};

const normalizeRequirement = (record?: SalesRequirement | null): SalesRequirement | null => {
  if (!record) return null;
  const id = toText(readValue(record, ['id']));
  const type = toText(
    readValue(record, ['type', 'requirement_type', 'requirementType']),
    'required',
  );
  const text = toText(readValue(record, ['text', 'valueText', 'value_text', 'original']));
  if (!text) return null;
  const attributeKey = readValue(record, [
    'attributeKey',
    'attribute_key',
    'attrKey',
    'attr_key',
  ]) as string | null;
  const attributeName = toText(
    readValue(record, ['attributeName', 'attribute_name', 'attrName', 'attr_name']),
  );
  const scoreWeight = toNumber(readValue(record, ['scoreWeight', 'score_weight']), 10);
  const sortOrder = toNumber(readValue(record, ['sortOrder', 'sort_order']), 0);
  return {
    id: id || undefined,
    type,
    attrSource: toText(
      readValue(record, ['attrSource', 'attr_source']),
      attributeKey ? 'system' : 'custom',
    ),
    attr_source: toText(
      readValue(record, ['attrSource', 'attr_source']),
      attributeKey ? 'system' : 'custom',
    ),
    text,
    attributeKey,
    attribute_key: attributeKey,
    attributeName,
    attribute_name: attributeName,
    scoreWeight,
    score_weight: scoreWeight,
    sortOrder,
    sort_order: sortOrder,
    enabled: record.enabled !== false,
  };
};

const normalizeRequirements = (value: unknown): SalesRequirement[] =>
  toList<SalesRequirement>(value)
    .map(normalizeRequirement)
    .filter((item): item is SalesRequirement => !!item);

const requirementsFromSnapshot = (snapshot?: Record<string, unknown>) =>
  normalizeRequirements(readValue(snapshot, ['requirements']));

export const normalizeSalesIcpAttr = (
  record?: SalesIcpAttrRecord | null,
): SalesIcpAttr | null => {
  if (!record?.id) return null;
  const attrKey = toText(readValue(record, ['attrKey', 'attr_key']));
  const attrName = toText(readValue(record, ['attrName', 'attr_name']));
  if (!attrKey || !attrName) return null;
  const required = readValue(record, ['required']);
  return {
    id: record.id,
    tenantId: toText(readValue(record, ['tenantId', 'tenant_id'])),
    attrKey,
    attrName,
    attrDesc: toText(readValue(record, ['attrDesc', 'attr_desc'])),
    required: required === true || required === '1' || required === 1,
    scoreWeight: toNumber(readValue(record, ['scoreWeight', 'score_weight']), 10),
    sortOrder: toNumber(readValue(record, ['sortOrder', 'sort_order']), 0),
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
    updateTime: toText(readValue(record, ['updateTime', 'update_time'])),
    raw: record,
  };
};

export const normalizeSalesTemplate = (
  record?: SalesIcpTemplateRecord | null,
): SalesIcpTemplate | null => {
  if (!record?.id) return null;
  const canStartValue = readValue(record, ['canStart', 'can_start']);
  const requirements = normalizeRequirements(record.requirements);

  return {
    id: record.id,
    tplName: toText(readValue(record, ['tplName', 'tpl_name']), '未命名模板'),
    description: toText(record.description),
    items: toList<SalesIcpTemplateItemRecord>(record.items)
      .map(normalizeTemplateItem)
      .filter((item): item is SalesIcpTemplateItem => !!item),
    requirements,
    status: toText(record.status, '1'),
    canStart: typeof canStartValue === 'boolean' ? canStartValue : undefined,
    missing: toList<Record<string, unknown>>(record.missing),
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
    updateTime: toText(readValue(record, ['updateTime', 'update_time'])),
    raw: record,
  };
};

export const normalizeGeneratedTemplate = (
  record?: SalesIcpTemplateRecord | null,
): SalesGeneratedTemplateDraft | null => {
  const template = normalizeSalesTemplate({ ...(record || {}), id: '__draft__' });
  if (!template) return null;
  return {
    tplName: template.tplName,
    description: template.description,
    items: template.items,
    requirements: template.requirements,
    status: template.status,
    canStart: template.canStart,
    missing: template.missing,
    createTime: template.createTime,
    updateTime: template.updateTime,
  };
};

export const normalizeSalesTask = (
  record?: SalesTaskRecord | null,
): SalesTask | null => {
  if (!record?.id) return null;
  const canStartValue = readValue(record, ['canStart', 'can_start']);
  const status = toText(record.status, 'blocked');
  const templateSnapshot = toObject<Record<string, unknown>>(
    readValue(record, ['templateSnapshot', 'template_snapshot']),
  );
  const requirements =
    normalizeRequirements(record.requirements).length > 0
      ? normalizeRequirements(record.requirements)
      : requirementsFromSnapshot(templateSnapshot);

  return {
    id: record.id,
    taskName: toText(readValue(record, ['taskName', 'task_name']), '未命名任务'),
    templateId: readValue(record, ['templateId', 'template_id']) as SalesId,
    templateSnapshot,
    status,
    canStart:
      typeof canStartValue === 'boolean'
        ? canStartValue
        : ['1', 'ready', 'failed'].includes(status),
    missing: toList<Record<string, unknown>>(record.missing),
    requirements,
    errorMessage: toText(readValue(record, ['errorMessage', 'error_message'])),
    warning: record.warning,
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
    updateTime: toText(readValue(record, ['updateTime', 'update_time'])),
    raw: record,
  };
};

export const normalizeSalesSearchRun = (
  record?: SalesSearchRunRecord | null,
): SalesSearchRun | null => {
  if (!record?.id) return null;
  const report =
    toObject<Record<string, unknown>>(record.report) ||
    parseObjectJson(readValue(record, ['reportJson', 'report_json']));

  return {
    id: record.id,
    taskId: readValue(record, ['taskId', 'task_id']) as SalesId,
    runType: toText(readValue(record, ['runType', 'run_type']), 'fixture'),
    status: toText(record.status, 'unknown'),
    progress:
      typeof record.progress === 'number' ? Math.max(0, Math.min(record.progress, 100)) : undefined,
    callbackSeq: Number(readValue(record, ['callbackSeq', 'callback_seq']) || 0),
    lastCallbackEventId: toText(
      readValue(record, ['lastCallbackEventId', 'last_callback_event_id']),
    ),
    report,
    errorMessage: toText(readValue(record, ['errorMessage', 'error_message'])),
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
    updateTime: toText(readValue(record, ['updateTime', 'update_time'])),
    raw: record,
  };
};

export const normalizeSalesSearchRunProgressEvent = (
  record?: SalesSearchRunProgressEventRecord | null,
): SalesSearchRunProgressEvent | null => {
  if (!record) return null;
  return {
    eventId: toText(readValue(record, ['eventId', 'event_id'])),
    eventType: toText(readValue(record, ['eventType', 'event_type'])),
    status: toText(record.status),
    progress: toOptionalNumber(record.progress),
    stage: toText(record.stage),
    stageLabel: toText(readValue(record, ['stageLabel', 'stage_label'])),
    message: toText(record.message),
    payload: toObject<Record<string, unknown>>(record.payload),
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
  };
};

export const normalizeSalesSearchRunProgress = (
  record?: SalesSearchRunProgressRecord | null,
): SalesSearchRunProgress | null => {
  if (!record) return null;
  return {
    taskId: readValue(record, ['taskId', 'task_id']) as SalesId,
    taskName: toText(readValue(record, ['taskName', 'task_name'])),
    taskStatus: toText(readValue(record, ['taskStatus', 'task_status'])),
    taskErrorMessage: toText(readValue(record, ['taskErrorMessage', 'task_error_message'])),
    runId: readValue(record, ['runId', 'run_id']) as SalesId,
    runType: toText(readValue(record, ['runType', 'run_type'])),
    runStatus: toText(readValue(record, ['runStatus', 'run_status'])),
    progress: toNumber(record.progress),
    currentStage: toText(readValue(record, ['currentStage', 'current_stage'])),
    currentStageLabel: toText(readValue(record, ['currentStageLabel', 'current_stage_label'])),
    message: toText(record.message),
    errorMessage: toText(readValue(record, ['errorMessage', 'error_message'])),
    queryCount: toNumber(readValue(record, ['queryCount', 'query_count'])),
    resultCount: toNumber(readValue(record, ['resultCount', 'result_count'])),
    profileCount: toNumber(readValue(record, ['profileCount', 'profile_count'])),
    sourceCount: toNumber(readValue(record, ['sourceCount', 'source_count'])),
    evidenceCount: toNumber(readValue(record, ['evidenceCount', 'evidence_count'])),
    contactCount: toNumber(readValue(record, ['contactCount', 'contact_count'])),
    eventCount: toNumber(readValue(record, ['eventCount', 'event_count'])),
    acceptedTime: toText(readValue(record, ['acceptedTime', 'accepted_time'])),
    startedTime: toText(readValue(record, ['startedTime', 'started_time'])),
    finishedTime: toText(readValue(record, ['finishedTime', 'finished_time'])),
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
    updateTime: toText(readValue(record, ['updateTime', 'update_time'])),
    recentEvents: toList<SalesSearchRunProgressEventRecord>(
      readValue(record, ['recentEvents', 'recent_events']),
    )
      .map(normalizeSalesSearchRunProgressEvent)
      .filter((item): item is SalesSearchRunProgressEvent => !!item),
    raw: record,
  };
};

export const normalizeSalesAccountProfile = (
  record?: SalesAccountProfileRecord | null,
): SalesAccountProfile | null => {
  if (!record?.id) return null;
  const primaryDomain = toText(readValue(record, ['primaryDomain', 'primary_domain']));
  if (!primaryDomain) return null;

  return {
    id: record.id,
    tenantId: toText(readValue(record, ['tenantId', 'tenant_id'])),
    runId: readValue(record, ['runId', 'run_id']) as SalesId,
    taskId: readValue(record, ['taskId', 'task_id']) as SalesId,
    taskName: toText(readValue(record, ['taskName', 'task_name'])),
    profileKey: toText(readValue(record, ['profileKey', 'profile_key'])),
    runType: toText(readValue(record, ['runType', 'run_type'])),
    runStatus: toText(readValue(record, ['runStatus', 'run_status'])),
    displayName: toText(readValue(record, ['displayName', 'display_name'])),
    legalName: toText(readValue(record, ['legalName', 'legal_name'])),
    primaryDomain,
    websiteUrl: toText(readValue(record, ['websiteUrl', 'website_url'])),
    nameConfidence: toText(readValue(record, ['nameConfidence', 'name_confidence'])),
    identityConfidence: toText(readValue(record, ['identityConfidence', 'identity_confidence'])),
    summary: toText(record.summary),
    countryCode: toText(readValue(record, ['countryCode', 'country_code'])),
    countryName: toText(readValue(record, ['countryName', 'country_name'])),
    region: toText(record.region),
    city: toText(record.city),
    latitude: toOptionalNumber(record.latitude),
    longitude: toOptionalNumber(record.longitude),
    sourceTypes: parseStringList(readValue(record, ['sourceTypes', 'source_types'])),
    decision: toText(record.decision, 'uncertain'),
    decisionReason: toText(readValue(record, ['decisionReason', 'decision_reason'])),
    fitScore: toNumber(readValue(record, ['fitScore', 'fit_score'])),
    reviewStatus: toText(readValue(record, ['reviewStatus', 'review_status']), 'pending'),
    reviewNote: toText(readValue(record, ['reviewNote', 'review_note'])),
    evidenceCount: toNumber(readValue(record, ['evidenceCount', 'evidence_count'])),
    sourceCount: toNumber(readValue(record, ['sourceCount', 'source_count'])),
    profile: toObject<Record<string, unknown>>(record.profile),
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
    updateTime: toText(readValue(record, ['updateTime', 'update_time'])),
    raw: record,
  };
};

export const normalizeSalesLeadResult = (
  record?: SalesLeadResultRecord | null,
): SalesLeadResult | null => {
  const profileId = readValue(record, ['profileId', 'profile_id']) as SalesId | undefined;
  const primaryDomain = toText(readValue(record, ['primaryDomain', 'primary_domain']));
  if (!record || !profileId || !primaryDomain) return null;
  return {
    profileId,
    contactId: readValue(record, ['contactId', 'contact_id']) as SalesId,
    tenantId: toText(readValue(record, ['tenantId', 'tenant_id'])),
    taskId: readValue(record, ['taskId', 'task_id']) as SalesId,
    taskName: toText(readValue(record, ['taskName', 'task_name'])),
    taskStatus: toText(readValue(record, ['taskStatus', 'task_status']), 'completed'),
    runId: readValue(record, ['runId', 'run_id']) as SalesId,
    runType: toText(readValue(record, ['runType', 'run_type'])),
    runStatus: toText(readValue(record, ['runStatus', 'run_status'])),
    displayName: toText(readValue(record, ['displayName', 'display_name'])),
    legalName: toText(readValue(record, ['legalName', 'legal_name'])),
    primaryDomain,
    websiteUrl: toText(readValue(record, ['websiteUrl', 'website_url'])),
    nameConfidence: toText(readValue(record, ['nameConfidence', 'name_confidence'])),
    identityConfidence: toText(readValue(record, ['identityConfidence', 'identity_confidence'])),
    summary: toText(record.summary),
    countryCode: toText(readValue(record, ['countryCode', 'country_code'])),
    countryName: toText(readValue(record, ['countryName', 'country_name'])),
    region: toText(record.region),
    city: toText(record.city),
    sourceTypes: parseStringList(readValue(record, ['sourceTypes', 'source_types'])),
    decision: toText(record.decision, 'uncertain'),
    decisionReason: toText(readValue(record, ['decisionReason', 'decision_reason'])),
    fitScore: toNumber(readValue(record, ['fitScore', 'fit_score'])),
    companyReviewStatus: toText(
      readValue(record, ['companyReviewStatus', 'company_review_status']),
      'pending',
    ),
    companyReviewNote: toText(readValue(record, ['companyReviewNote', 'company_review_note'])),
    evidenceCount: toNumber(readValue(record, ['evidenceCount', 'evidence_count'])),
    sourceCount: toNumber(readValue(record, ['sourceCount', 'source_count'])),
    companyChannelCount: toNumber(
      readValue(record, ['companyChannelCount', 'company_channel_count']),
    ),
    companyChannelsText: toText(
      readValue(record, ['companyChannelsText', 'company_channels_text']),
    ),
    companyChannels: toList<SalesAccountChannelRecord>(
      readValue(record, ['companyChannels', 'company_channels']),
    )
      .map(normalizeSalesAccountChannel)
      .filter((item): item is SalesAccountChannel => !!item),
    contactKey: toText(readValue(record, ['contactKey', 'contact_key'])),
    fullName: toText(readValue(record, ['fullName', 'full_name'])),
    rawName: toText(readValue(record, ['rawName', 'raw_name'])),
    jobTitle: toText(readValue(record, ['jobTitle', 'job_title'])),
    department: toText(record.department),
    functionText: toText(readValue(record, ['functionText', 'function_text'])),
    decisionMakerStatus: toText(
      readValue(record, ['decisionMakerStatus', 'decision_maker_status']),
    ),
    confidence: toNumber(record.confidence),
    contactScore: toNumber(readValue(record, ['contactScore', 'contact_score'])),
    contactSourceCount: toNumber(
      readValue(record, ['contactSourceCount', 'contact_source_count']),
    ),
    contactEvidenceCount: toNumber(
      readValue(record, ['contactEvidenceCount', 'contact_evidence_count']),
    ),
    contactChannelCount: toNumber(
      readValue(record, ['contactChannelCount', 'contact_channel_count']),
    ),
    contactChannels: toList<SalesAccountContactChannelRecord>(
      readValue(record, ['contactChannels', 'contact_channels']),
    )
      .map(normalizeSalesAccountContactChannel)
      .filter((item): item is SalesAccountContactChannel => !!item),
    contactReviewStatus: toText(
      readValue(record, ['contactReviewStatus', 'contact_review_status']),
    ),
    contactReviewNote: toText(readValue(record, ['contactReviewNote', 'contact_review_note'])),
    contactReason: toText(readValue(record, ['contactReason', 'contact_reason'])),
    profile: toObject<Record<string, unknown>>(record.profile),
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
    updateTime: toText(readValue(record, ['updateTime', 'update_time'])),
    raw: record,
  };
};

const normalizeSalesLeadEvidenceSummary = (
  record?: SalesLeadEvidenceSummaryRecord,
): SalesLeadEvidenceSummary => ({
  evidenceCount: toNumber(readValue(record, ['evidenceCount', 'evidence_count'])),
  supportedCount: toNumber(readValue(record, ['supportedCount', 'supported_count'])),
  conflictedCount: toNumber(readValue(record, ['conflictedCount', 'conflicted_count'])),
  unknownCount: toNumber(readValue(record, ['unknownCount', 'unknown_count'])),
  sourceCount: toNumber(readValue(record, ['sourceCount', 'source_count'])),
  requirementCount: toNumber(readValue(record, ['requirementCount', 'requirement_count'])),
  coveredRequirementCount: toNumber(
    readValue(record, ['coveredRequirementCount', 'covered_requirement_count']),
  ),
  missingRequiredCount: toNumber(
    readValue(record, ['missingRequiredCount', 'missing_required_count']),
  ),
});

const normalizeSalesLeadRequirementCoverage = (
  record?: SalesLeadRequirementCoverageRecord | null,
): SalesLeadRequirementCoverage | null => {
  if (!record) return null;
  return {
    requirementId: toText(readValue(record, ['requirementId', 'requirement_id'])),
    requirementType: toText(readValue(record, ['requirementType', 'requirement_type'])),
    requirementText: toText(readValue(record, ['requirementText', 'requirement_text'])),
    attributeKey: toText(readValue(record, ['attributeKey', 'attribute_key'])),
    attributeName: toText(readValue(record, ['attributeName', 'attribute_name'])),
    judgment: toText(record.judgment, 'unknown'),
    evidenceCount: toNumber(readValue(record, ['evidenceCount', 'evidence_count'])),
    supportedCount: toNumber(readValue(record, ['supportedCount', 'supported_count'])),
    conflictedCount: toNumber(readValue(record, ['conflictedCount', 'conflicted_count'])),
    unknownCount: toNumber(readValue(record, ['unknownCount', 'unknown_count'])),
  };
};

const normalizeSalesLeadEvidenceItem = (
  record?: SalesLeadEvidenceItemRecord | null,
): SalesLeadEvidenceItem | null => {
  if (!record) return null;
  return {
    id: record.id,
    evidenceKey: toText(readValue(record, ['evidenceKey', 'evidence_key'])),
    requirementId: toText(readValue(record, ['requirementId', 'requirement_id'])),
    requirementType: toText(readValue(record, ['requirementType', 'requirement_type'])),
    judgment: toText(record.judgment, 'unknown'),
    evidenceText: toText(readValue(record, ['evidenceText', 'evidence_text'])),
    reason: toText(record.reason),
    evaluator: toText(record.evaluator),
    resultId: readValue(record, ['resultId', 'result_id']) as SalesId,
    sourceUrl: toText(readValue(record, ['sourceUrl', 'source_url'])),
    sourceDomain: toText(readValue(record, ['sourceDomain', 'source_domain'])),
    title: toText(record.title),
    snippet: toText(record.snippet),
    queryText: toText(readValue(record, ['queryText', 'query_text'])),
    provider: toText(record.provider),
    page: toOptionalNumber(record.page),
    providerRank: toOptionalNumber(readValue(record, ['providerRank', 'provider_rank'])),
    resultType: toText(readValue(record, ['resultType', 'result_type'])),
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
  };
};

const normalizeSalesLeadSourceItem = (
  record?: SalesLeadSourceItemRecord | null,
): SalesLeadSourceItem | null => {
  if (!record) return null;
  return {
    id: record.id,
    sourceKey: toText(readValue(record, ['sourceKey', 'source_key'])),
    sourceUrl: toText(readValue(record, ['sourceUrl', 'source_url'])),
    sourceDomain: toText(readValue(record, ['sourceDomain', 'source_domain'])),
    sourceRole: toText(readValue(record, ['sourceRole', 'source_role'])),
    provider: toText(record.provider),
    page: toOptionalNumber(record.page),
    providerRank: toOptionalNumber(readValue(record, ['providerRank', 'provider_rank'])),
    matchedTerms: parseStringList(readValue(record, ['matchedTerms', 'matched_terms'])),
    reason: toText(record.reason),
    resultId: readValue(record, ['resultId', 'result_id']) as SalesId,
    queryId: readValue(record, ['queryId', 'query_id']) as SalesId,
    roundId: readValue(record, ['roundId', 'round_id']) as SalesId,
    title: toText(record.title),
    snippet: toText(record.snippet),
    queryText: toText(readValue(record, ['queryText', 'query_text'])),
  };
};

export const normalizeSalesLeadEvidenceDetail = (
  record?: SalesLeadEvidenceDetailRecord | null,
): SalesLeadEvidenceDetail | null => {
  if (!record) return null;
  const profile = normalizeSalesAccountProfile(record.profile ?? null);
  if (!profile) return null;
  return {
    profile,
    summary: normalizeSalesLeadEvidenceSummary(record.summary),
    requirementCoverages: toList<SalesLeadRequirementCoverageRecord>(
      readValue(record, ['requirementCoverages', 'requirement_coverages']),
    )
      .map(normalizeSalesLeadRequirementCoverage)
      .filter((item): item is SalesLeadRequirementCoverage => !!item),
    evidences: toList<SalesLeadEvidenceItemRecord>(record.evidences)
      .map(normalizeSalesLeadEvidenceItem)
      .filter((item): item is SalesLeadEvidenceItem => !!item),
    sources: toList<SalesLeadSourceItemRecord>(record.sources)
      .map(normalizeSalesLeadSourceItem)
      .filter((item): item is SalesLeadSourceItem => !!item),
    accountProfile: toObject<Record<string, unknown>>(
      readValue(record, ['accountProfile', 'account_profile']),
    ),
    runProgress:
      normalizeSalesSearchRunProgress(
        readValue(record, ['runProgress', 'run_progress']) as SalesSearchRunProgressRecord,
      ) ?? undefined,
    raw: record,
  };
};

export const normalizeSalesAccountChannel = (
  record?: SalesAccountChannelRecord | null,
): SalesAccountChannel | null => {
  if (!record) return null;
  const channelValue = toText(readValue(record, ['channelValue', 'channel_value']));
  if (!channelValue) return null;
  return {
    id: record.id,
    profileId: readValue(record, ['profileId', 'profile_id']) as SalesId,
    channelType: toText(readValue(record, ['channelType', 'channel_type']), 'other'),
    channelValue,
    normalizedValue: toText(readValue(record, ['normalizedValue', 'normalized_value'])),
    sourceUrl: toText(readValue(record, ['sourceUrl', 'source_url'])),
    sourceDomain: toText(readValue(record, ['sourceDomain', 'source_domain'])),
    confidence: toNumber(record.confidence),
    verifiedStatus: toText(readValue(record, ['verifiedStatus', 'verified_status']), 'unverified'),
    reason: toText(record.reason),
    raw: toObject<Record<string, unknown>>(record.raw),
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
  };
};

export const normalizeSalesAccountContactChannel = (
  record?: SalesAccountContactChannelRecord | null,
): SalesAccountContactChannel | null => {
  const channel = normalizeSalesAccountChannel(record);
  if (!channel) return null;
  return {
    ...channel,
    contactId: readValue(record || {}, ['contactId', 'contact_id']) as SalesId,
  };
};

export const normalizeSalesAccountContactEvidence = (
  record?: SalesAccountContactEvidenceRecord | null,
): SalesAccountContactEvidence | null => {
  if (!record) return null;
  return {
    id: record.id,
    contactId: readValue(record, ['contactId', 'contact_id']) as SalesId,
    profileId: readValue(record, ['profileId', 'profile_id']) as SalesId,
    evidenceKey: toText(readValue(record, ['evidenceKey', 'evidence_key'])),
    evidenceType: toText(readValue(record, ['evidenceType', 'evidence_type']), 'identity'),
    judgment: toText(record.judgment, 'unknown'),
    evidenceText: toText(readValue(record, ['evidenceText', 'evidence_text'])),
    sourceUrl: toText(readValue(record, ['sourceUrl', 'source_url'])),
    sourceDomain: toText(readValue(record, ['sourceDomain', 'source_domain'])),
    title: toText(record.title),
    provider: toText(record.provider),
    reason: toText(record.reason),
    raw: toObject<Record<string, unknown>>(record.raw),
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
  };
};

export const normalizeSalesAccountContact = (
  record?: SalesAccountContactRecord | null,
): SalesAccountContact | null => {
  if (!record?.id) return null;
  const fullName = toText(readValue(record, ['fullName', 'full_name']));
  if (!fullName) return null;
  return {
    id: record.id,
    profileId: readValue(record, ['profileId', 'profile_id']) as SalesId,
    runId: readValue(record, ['runId', 'run_id']) as SalesId,
    taskId: readValue(record, ['taskId', 'task_id']) as SalesId,
    contactKey: toText(readValue(record, ['contactKey', 'contact_key'])),
    fullName,
    rawName: toText(readValue(record, ['rawName', 'raw_name'])),
    jobTitle: toText(readValue(record, ['jobTitle', 'job_title'])),
    department: toText(record.department),
    functionText: toText(readValue(record, ['functionText', 'function_text'])),
    decisionMakerStatus: toText(
      readValue(record, ['decisionMakerStatus', 'decision_maker_status']),
      'unknown',
    ),
    confidence: toNumber(record.confidence),
    contactScore: toNumber(readValue(record, ['contactScore', 'contact_score'])),
    sourceCount: toNumber(readValue(record, ['sourceCount', 'source_count'])),
    evidenceCount: toNumber(readValue(record, ['evidenceCount', 'evidence_count'])),
    reviewStatus: toText(readValue(record, ['reviewStatus', 'review_status']), 'pending'),
    reviewNote: toText(readValue(record, ['reviewNote', 'review_note'])),
    reason: toText(record.reason),
    channels: toList<SalesAccountContactChannelRecord>(record.channels)
      .map(normalizeSalesAccountContactChannel)
      .filter((item): item is SalesAccountContactChannel => !!item),
    evidences: toList<SalesAccountContactEvidenceRecord>(record.evidences)
      .map(normalizeSalesAccountContactEvidence)
      .filter((item): item is SalesAccountContactEvidence => !!item),
    raw: toObject<Record<string, unknown>>(record.raw),
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
    updateTime: toText(readValue(record, ['updateTime', 'update_time'])),
  };
};

export const normalizeSalesProviderUsageProvider = (
  record?: SalesProviderUsageProviderRecord | null,
): SalesProviderUsageProvider => ({
  provider: toText(readValue(record, ['provider']), 'unknown'),
  eventCount: toNumber(readValue(record, ['eventCount', 'event_count'])),
  executedRequests: toNumber(
    readValue(record, ['executedRequests', 'executed_requests']),
  ),
  billableRequests: toNumber(
    readValue(record, ['billableRequests', 'billable_requests']),
  ),
  cacheHitCount: toNumber(readValue(record, ['cacheHitCount', 'cache_hit_count'])),
  skipCount: toNumber(readValue(record, ['skipCount', 'skip_count'])),
  budgetSkipCount: toNumber(
    readValue(record, ['budgetSkipCount', 'budget_skip_count']),
  ),
  errorCount: toNumber(readValue(record, ['errorCount', 'error_count'])),
});

export const normalizeSalesProviderUsageSummary = (
  record?: SalesProviderUsageSummaryRecord | null,
): SalesProviderUsageSummary => ({
  ...normalizeSalesProviderUsageProvider(record),
  providers: toList<SalesProviderUsageProviderRecord>(record?.providers).map(
    normalizeSalesProviderUsageProvider,
  ),
});

export const normalizeSalesProviderUsageEvent = (
  record?: SalesProviderUsageEventRecord | null,
): SalesProviderUsageEvent | null => {
  if (!record) return null;
  return {
    provider: toText(readValue(record, ['provider']), 'unknown'),
    endpoint: toText(readValue(record, ['endpoint'])),
    objectKey: toText(readValue(record, ['objectKey', 'object_key'])),
    status: toText(readValue(record, ['status']), 'unknown'),
    reason: toText(readValue(record, ['reason'])),
    unitCount: toNumber(readValue(record, ['unitCount', 'unit_count'])),
    unitType: toText(readValue(record, ['unitType', 'unit_type']), 'request'),
    billable: toBoolean(readValue(record, ['billable'])),
    occurredTime: toText(readValue(record, ['occurredTime', 'occurred_time'])),
  };
};

export const normalizeSalesContactDiscoveryOutcome = (
  record?: SalesContactDiscoveryOutcomeRecord | null,
): SalesContactDiscoveryOutcome => ({
  status: toText(readValue(record, ['status']), 'not_started'),
  label: toText(readValue(record, ['label']), '未开始联系人增强'),
  description: toText(readValue(record, ['description']), '尚无联系人增强调用记录'),
  providerAttempted: toBoolean(
    readValue(record, ['providerAttempted', 'provider_attempted']),
  ),
  cacheOnly: toBoolean(readValue(record, ['cacheOnly', 'cache_only'])),
  hasCompanyChannels: toBoolean(
    readValue(record, ['hasCompanyChannels', 'has_company_channels']),
  ),
  lastOccurredTime: toText(
    readValue(record, ['lastOccurredTime', 'last_occurred_time']),
  ),
});

export const normalizeSalesAccountContacts = (
  record?: SalesAccountContactsRecord | null,
): SalesAccountContacts | null => {
  if (!record) return null;
  const summary = record.summary || {};
  return {
    profileId: readValue(record, ['profileId', 'profile_id']) as SalesId,
    companyChannels: toList<SalesAccountChannelRecord>(
      readValue(record, ['companyChannels', 'company_channels']),
    )
      .map(normalizeSalesAccountChannel)
      .filter((item): item is SalesAccountChannel => !!item),
    contacts: toList<SalesAccountContactRecord>(record.contacts)
      .map(normalizeSalesAccountContact)
      .filter((item): item is SalesAccountContact => !!item),
    summary: {
      companyChannelCount: toNumber(
        readValue(summary, ['companyChannelCount', 'company_channel_count']),
      ),
      contactCount: toNumber(readValue(summary, ['contactCount', 'contact_count'])),
      contactChannelCount: toNumber(
        readValue(summary, ['contactChannelCount', 'contact_channel_count']),
      ),
      evidenceCount: toNumber(readValue(summary, ['evidenceCount', 'evidence_count'])),
    },
    discoveryOutcome: normalizeSalesContactDiscoveryOutcome(
      readValue(record, ['discoveryOutcome', 'discovery_outcome']) as
        | SalesContactDiscoveryOutcomeRecord
        | undefined,
    ),
    providerUsageSummary: normalizeSalesProviderUsageSummary(
      readValue(record, ['providerUsageSummary', 'provider_usage_summary']) as
        | SalesProviderUsageSummaryRecord
        | undefined,
    ),
    providerUsageEvents: toList<SalesProviderUsageEventRecord>(
      readValue(record, ['providerUsageEvents', 'provider_usage_events']),
    )
      .map(normalizeSalesProviderUsageEvent)
      .filter((item): item is SalesProviderUsageEvent => !!item),
  };
};

export const normalizeSalesEmailAccount = (
  record?: SalesEmailAccountRecord | null,
): SalesEmailAccount | null => {
  if (!record?.id) return null;
  const emailAddress = toText(readValue(record, ['emailAddress', 'email_address']));
  const accountName = toText(readValue(record, ['accountName', 'account_name']), emailAddress);
  if (!emailAddress || !accountName) return null;
  return {
    id: record.id,
    ownerUserId: readValue(record, ['ownerUserId', 'owner_user_id']) as SalesId,
    accountName,
    emailAddress,
    fromName: toText(readValue(record, ['fromName', 'from_name'])),
    providerLabel: toText(readValue(record, ['providerLabel', 'provider_label'])),
    smtpHost: toText(readValue(record, ['smtpHost', 'smtp_host'])),
    smtpPort: toNumber(readValue(record, ['smtpPort', 'smtp_port']), 465),
    smtpEncryption: toText(readValue(record, ['smtpEncryption', 'smtp_encryption']), 'SSL_TLS'),
    smtpUsername: toText(readValue(record, ['smtpUsername', 'smtp_username'])),
    smtpSecretConfigured: Boolean(
      readValue(record, ['smtpSecretConfigured', 'smtp_secret_configured']),
    ),
    imapEnabled: toText(readValue(record, ['imapEnabled', 'imap_enabled']), '1'),
    imapHost: toText(readValue(record, ['imapHost', 'imap_host'])),
    imapPort: toOptionalNumber(readValue(record, ['imapPort', 'imap_port'])),
    imapEncryption: toText(readValue(record, ['imapEncryption', 'imap_encryption']), 'SSL_TLS'),
    imapUsername: toText(readValue(record, ['imapUsername', 'imap_username'])),
    imapSecretConfigured: Boolean(
      readValue(record, ['imapSecretConfigured', 'imap_secret_configured']),
    ),
    enabled: toText(record.enabled, '1'),
    defaultFlag: toText(readValue(record, ['defaultFlag', 'default_flag']), '0'),
    smtpTestStatus: toText(
      readValue(record, ['smtpTestStatus', 'smtp_test_status']),
      'untested',
    ),
    smtpTestMessage: toText(readValue(record, ['smtpTestMessage', 'smtp_test_message'])),
    smtpTestTime: toText(readValue(record, ['smtpTestTime', 'smtp_test_time'])),
    imapTestStatus: toText(
      readValue(record, ['imapTestStatus', 'imap_test_status']),
      'untested',
    ),
    imapTestMessage: toText(readValue(record, ['imapTestMessage', 'imap_test_message'])),
    imapTestTime: toText(readValue(record, ['imapTestTime', 'imap_test_time'])),
    lastSyncUid: toText(readValue(record, ['lastSyncUid', 'last_sync_uid'])),
    lastSyncTime: toText(readValue(record, ['lastSyncTime', 'last_sync_time'])),
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
    updateTime: toText(readValue(record, ['updateTime', 'update_time'])),
    raw: record,
  };
};

export const normalizeSalesEmailMessage = (
  record?: SalesEmailMessageRecord | null,
): SalesEmailMessage | null => {
  if (!record?.id) return null;
  const toEmail = toText(readValue(record, ['toEmail', 'to_email']));
  const subject = toText(record.subject);
  if (!toEmail || !subject) return null;
  return {
    id: record.id,
    ownerUserId: readValue(record, ['ownerUserId', 'owner_user_id']) as SalesId,
    accountId: readValue(record, ['accountId', 'account_id']) as SalesId,
    profileId: readValue(record, ['profileId', 'profile_id']) as SalesId,
    contactId: readValue(record, ['contactId', 'contact_id']) as SalesId,
    contactChannelId: readValue(record, ['contactChannelId', 'contact_channel_id']) as SalesId,
    toEmail,
    normalizedToEmail: toText(readValue(record, ['normalizedToEmail', 'normalized_to_email'])),
    toName: toText(readValue(record, ['toName', 'to_name'])),
    fromEmail: toText(readValue(record, ['fromEmail', 'from_email'])),
    fromName: toText(readValue(record, ['fromName', 'from_name'])),
    subject,
    body: toText(record.body),
    contentFormat: toText(readValue(record, ['contentFormat', 'content_format']), 'plain'),
    status: toText(record.status, 'draft'),
    providerMessageId: toText(readValue(record, ['providerMessageId', 'provider_message_id'])),
    messageIdHeader: toText(readValue(record, ['messageIdHeader', 'message_id_header'])),
    sentAt: toText(readValue(record, ['sentAt', 'sent_at'])),
    firstReplyAt: toText(readValue(record, ['firstReplyAt', 'first_reply_at'])),
    bouncedAt: toText(readValue(record, ['bouncedAt', 'bounced_at'])),
    failedAt: toText(readValue(record, ['failedAt', 'failed_at'])),
    lastAttemptAt: toText(readValue(record, ['lastAttemptAt', 'last_attempt_at'])),
    retryCount: toNumber(readValue(record, ['retryCount', 'retry_count'])),
    errorMessage: toText(readValue(record, ['errorMessage', 'error_message'])),
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
    updateTime: toText(readValue(record, ['updateTime', 'update_time'])),
    raw: record,
  };
};

export const normalizeSalesEmailEvent = (
  record?: SalesEmailEventRecord | null,
): SalesEmailEvent | null => {
  if (!record) return null;
  return {
    id: record.id,
    ownerUserId: readValue(record, ['ownerUserId', 'owner_user_id']) as SalesId,
    messageId: readValue(record, ['messageId', 'message_id']) as SalesId,
    accountId: readValue(record, ['accountId', 'account_id']) as SalesId,
    eventType: toText(readValue(record, ['eventType', 'event_type']), 'unknown'),
    eventSource: toText(readValue(record, ['eventSource', 'event_source'])),
    eventTime: toText(readValue(record, ['eventTime', 'event_time'])),
    summary: toText(record.summary),
    raw: toObject<Record<string, unknown>>(record.raw),
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
  };
};

export const normalizeSalesEmailDoNotContact = (
  record?: SalesEmailDoNotContactRecord | null,
): SalesEmailDoNotContact | null => {
  if (!record?.id) return null;
  const email = toText(record.email);
  if (!email) return null;
  return {
    id: record.id,
    ownerUserId: readValue(record, ['ownerUserId', 'owner_user_id']) as SalesId,
    email,
    normalizedEmail: toText(readValue(record, ['normalizedEmail', 'normalized_email'])),
    reasonType: toText(readValue(record, ['reasonType', 'reason_type']), 'manual'),
    reason: toText(record.reason),
    sourceMessageId: readValue(record, ['sourceMessageId', 'source_message_id']) as SalesId,
    createTime: toText(readValue(record, ['createTime', 'create_time'])),
    raw: record,
  };
};

const normalizeSalesEmailOperation = (
  record?: Partial<SalesEmailOperation> | null,
): SalesEmailOperation | undefined =>
  record
    ? {
        success: Boolean(record.success),
        status: toText(record.status),
        message: toText(record.message),
        messageId: record.messageId,
        processedCount: toOptionalNumber(record.processedCount),
      }
    : undefined;

const toTemplateItemPayload = (item: SalesIcpTemplateItem) => ({
  id: item.id,
  attrSource: item.attrSource,
  attrKey: item.attrSource === 'system' ? item.attrKey : undefined,
  attrName: item.attrName,
  scoreWeight: item.scoreWeight,
  valueText: item.valueText,
  sortOrder: item.sortOrder,
  enabled: item.enabled,
});

const toRequirementPayload = (item: SalesRequirement) => ({
  id: item.id,
  type: item.type || 'required',
  attrSource: item.attrSource || item.attr_source || (item.attributeKey || item.attribute_key ? 'system' : 'custom'),
  attrKey: item.attributeKey || item.attribute_key || undefined,
  attrName: item.attributeName || item.attribute_name,
  text: item.text,
  scoreWeight: item.scoreWeight ?? item.score_weight ?? 10,
  sortOrder: item.sortOrder ?? item.sort_order ?? 0,
  enabled: item.enabled !== false,
});

export const getSalesIcpPolicy = () =>
  ruoyiRequest<SalesIcpPolicy>(`${SALES_JAVA_API_PREFIX}/icp/policy`, {
    method: 'get',
  });

export const querySalesIcpAttrPage = async (params?: SalesIcpAttrQuery) => {
  const response = await ruoyiRequest<SalesIcpAttrRecord>(
    `${SALES_JAVA_API_PREFIX}/icp/attrs/page`,
    {
      method: 'get',
      params,
    },
  );
  return normalizeResponseRows(response, normalizeSalesIcpAttr);
};

export const createSalesIcpAttr = (data: SalesIcpAttrPayload) =>
  ruoyiRequest<void>(`${SALES_JAVA_API_PREFIX}/icp/attrs`, {
    method: 'post',
    data,
  });

export const updateSalesIcpAttr = (data: SalesIcpAttrPayload) =>
  ruoyiRequest<void>(`${SALES_JAVA_API_PREFIX}/icp/attrs`, {
    method: 'put',
    data,
  });

export const deleteSalesIcpAttrs = (ids: SalesId[]) =>
  ruoyiRequest<void>(`${SALES_JAVA_API_PREFIX}/icp/attrs/${ids.join(',')}`, {
    method: 'delete',
  });

export const querySalesTaskPage = async (params?: SalesTaskQuery) => {
  const response = await ruoyiRequest<SalesTaskRecord>(
    `${SALES_JAVA_API_PREFIX}/tasks/page`,
    {
      method: 'get',
      params,
    },
  );
  return normalizeResponseRows(response, normalizeSalesTask);
};

export const getSalesTask = async (id: SalesId) => {
  const response = await ruoyiRequest<SalesTaskRecord>(
    `${SALES_JAVA_API_PREFIX}/tasks/${id}`,
    { method: 'get' },
  );
  return {
    ...response,
    data: normalizeSalesTask(response.data ?? null) ?? undefined,
  };
};

export const getSalesTaskProgress = async (id: SalesId) => {
  const response = await ruoyiRequest<SalesSearchRunProgressRecord>(
    `${SALES_JAVA_API_PREFIX}/tasks/${id}/progress`,
    { method: 'get' },
  );
  return {
    ...response,
    data: normalizeSalesSearchRunProgress(response.data ?? null) ?? undefined,
  };
};

export const querySalesTemplatePage = async (params?: SalesTemplateQuery) => {
  const response = await ruoyiRequest<SalesIcpTemplateRecord>(
    `${SALES_JAVA_API_PREFIX}/icp/templates/page`,
    {
      method: 'get',
      params,
    },
  );
  return normalizeResponseRows(response, normalizeSalesTemplate);
};

export const querySalesTemplateList = async (params?: SalesTemplateQuery) => {
  const response = await ruoyiRequest<SalesIcpTemplateRecord[]>(
    `${SALES_JAVA_API_PREFIX}/icp/templates/list`,
    {
      method: 'get',
      params,
    },
  );
  return {
    ...response,
    data: toList<SalesIcpTemplateRecord>(response.data)
      .map(normalizeSalesTemplate)
      .filter((item): item is SalesIcpTemplate => !!item),
  };
};

export const generateSalesTemplate = async (data: GenerateSalesTemplatePayload) => {
  const response = await ruoyiRequest<SalesIcpTemplateRecord>(
    `${SALES_JAVA_API_PREFIX}/icp/templates/generate`,
    {
      method: 'post',
      data,
    },
  );
  return {
    ...response,
    data: normalizeGeneratedTemplate(response.data ?? null) ?? undefined,
  };
};

export const createSalesTemplate = async (data: CreateSalesTemplatePayload) => {
  const response = await ruoyiRequest<SalesIcpTemplateRecord>(
    `${SALES_JAVA_API_PREFIX}/icp/templates`,
    {
      method: 'post',
      data: {
        tplName: data.tplName,
        description: data.description,
        status: data.status ?? '1',
        items: data.items.map(toTemplateItemPayload),
      },
    },
  );
  return {
    ...response,
    data: normalizeSalesTemplate(response.data ?? null) ?? undefined,
  };
};

export const updateSalesTemplate = async (data: UpdateSalesTemplatePayload) => {
  const response = await ruoyiRequest<SalesIcpTemplateRecord>(
    `${SALES_JAVA_API_PREFIX}/icp/templates`,
    {
      method: 'put',
      data: {
        id: data.id,
        tplName: data.tplName,
        description: data.description,
        status: data.status,
        items: data.items?.map(toTemplateItemPayload),
      },
    },
  );
  return {
    ...response,
    data: normalizeSalesTemplate(response.data ?? null) ?? undefined,
  };
};

export const createSalesTask = async (data: CreateSalesTaskPayload) => {
  const response = await ruoyiRequest<SalesTaskRecord>(
    `${SALES_JAVA_API_PREFIX}/tasks`,
    {
      method: 'post',
      data: {
        taskName: data.taskName,
        description: data.description,
        requirements: data.requirements.map(toRequirementPayload),
      },
    },
  );
  return {
    ...response,
    data: normalizeSalesTask(response.data ?? null) ?? undefined,
  };
};

export const deleteSalesTemplates = (ids: SalesId[]) =>
  ruoyiRequest<void>(`${SALES_JAVA_API_PREFIX}/icp/templates/${ids.join(',')}`, {
    method: 'delete',
  });

export const querySalesSearchRunPage = async (params?: SalesSearchRunQuery) => {
  const response = await ruoyiRequest<SalesSearchRunRecord>(
    `${SALES_JAVA_API_PREFIX}/search/runs/page`,
    {
      method: 'get',
      params,
    },
  );
  return normalizeResponseRows(response, normalizeSalesSearchRun);
};

export const querySalesLeadPage = async (params?: SalesLeadQuery) => {
  const response = await ruoyiRequest<SalesAccountProfileRecord>(
    `${SALES_JAVA_API_PREFIX}/leads/page`,
    {
      method: 'get',
      params,
    },
  );
  return normalizeResponseRows(response, normalizeSalesAccountProfile);
};

export const querySalesLeadResultPage = async (params?: SalesLeadResultQuery) => {
  const response = await ruoyiRequest<SalesLeadResultRecord>(
    `${SALES_JAVA_API_PREFIX}/leads/results/page`,
    {
      method: 'get',
      params,
    },
  );
  return normalizeResponseRows(response, normalizeSalesLeadResult);
};

export const getSalesLeadEvidenceDetail = async (profileId: SalesId) => {
  const response = await ruoyiRequest<SalesLeadEvidenceDetailRecord>(
    `${SALES_JAVA_API_PREFIX}/leads/${profileId}`,
    { method: 'get' },
  );
  return {
    ...response,
    data: normalizeSalesLeadEvidenceDetail(response.data ?? null) ?? undefined,
  };
};

export const getSalesLeadContacts = async (profileId: SalesId) => {
  const response = await ruoyiRequest<SalesAccountContactsRecord>(
    `${SALES_JAVA_API_PREFIX}/leads/${profileId}/contacts`,
    { method: 'get' },
  );
  return {
    ...response,
    data: normalizeSalesAccountContacts(response.data ?? null) ?? undefined,
  };
};

export const getSalesProviderConfigStatus = () =>
  ruoyiRequest<SalesProviderConfigStatus>(
    `${SALES_JAVA_API_PREFIX}/provider-config/status`,
    { method: 'get' },
  );

export const discoverSalesLeadContacts = async (profileId: SalesId) => {
  const response = await ruoyiRequest<SalesAccountContactsRecord>(
    `${SALES_JAVA_API_PREFIX}/leads/${profileId}/contacts/discover`,
    { method: 'post' },
  );
  return {
    ...response,
    data: normalizeSalesAccountContacts(response.data ?? null) ?? undefined,
  };
};

export const updateSalesAccountContactReview = async (
  contactId: SalesId,
  data: UpdateSalesAccountProfileReviewPayload,
) => {
  const response = await ruoyiRequest<SalesAccountContactRecord>(
    `${SALES_JAVA_API_PREFIX}/contacts/${contactId}/review`,
    {
      method: 'post',
      data,
    },
  );
  return {
    ...response,
    data: normalizeSalesAccountContact(response.data ?? null) ?? undefined,
  };
};

export const querySalesEmailAccounts = async (
  params?: SalesEmailAccountQuery,
) => {
  const response = await ruoyiRequest<SalesEmailAccountRecord[]>(
    `${SALES_JAVA_API_PREFIX}/email/accounts/list`,
    {
      method: 'get',
      params,
    },
  );
  return {
    ...response,
    data: toList<SalesEmailAccountRecord>(response.data)
      .map(normalizeSalesEmailAccount)
      .filter((item): item is SalesEmailAccount => !!item),
  };
};

export const saveSalesEmailAccount = async (
  data: SalesEmailAccountPayload,
) => {
  const response = await ruoyiRequest<SalesEmailAccountRecord>(
    `${SALES_JAVA_API_PREFIX}/email/accounts`,
    {
      method: data.id ? 'put' : 'post',
      data,
    },
  );
  return {
    ...response,
    data: normalizeSalesEmailAccount(response.data ?? null) ?? undefined,
  };
};

export const deleteSalesEmailAccount = (id: SalesId) =>
  ruoyiRequest<void>(`${SALES_JAVA_API_PREFIX}/email/accounts/${id}`, {
    method: 'delete',
  });

export const testSalesEmailSmtp = async (id: SalesId) => {
  const response = await ruoyiRequest<SalesEmailOperation>(
    `${SALES_JAVA_API_PREFIX}/email/accounts/${id}/test-smtp`,
    { method: 'post' },
  );
  return {
    ...response,
    data: normalizeSalesEmailOperation(response.data),
  };
};

export const testSalesEmailImap = async (id: SalesId) => {
  const response = await ruoyiRequest<SalesEmailOperation>(
    `${SALES_JAVA_API_PREFIX}/email/accounts/${id}/test-imap`,
    { method: 'post' },
  );
  return {
    ...response,
    data: normalizeSalesEmailOperation(response.data),
  };
};

export const syncSalesEmailInbox = async (id: SalesId) => {
  const response = await ruoyiRequest<SalesEmailOperation>(
    `${SALES_JAVA_API_PREFIX}/email/accounts/${id}/sync-inbox`,
    { method: 'post' },
  );
  return {
    ...response,
    data: normalizeSalesEmailOperation(response.data),
  };
};

export const querySalesEmailMessages = async (
  params?: SalesEmailMessageQuery,
) => {
  const response = await ruoyiRequest<SalesEmailMessageRecord>(
    `${SALES_JAVA_API_PREFIX}/email/messages/page`,
    {
      method: 'get',
      params,
    },
  );
  return normalizeResponseRows(response, normalizeSalesEmailMessage);
};

export const createSalesEmailDraft = async (
  data: SalesEmailMessagePayload,
) => {
  const response = await ruoyiRequest<SalesEmailMessageRecord>(
    `${SALES_JAVA_API_PREFIX}/email/messages`,
    {
      method: 'post',
      data: {
        ...data,
        contentFormat: data.contentFormat || 'plain',
      },
    },
  );
  return {
    ...response,
    data: normalizeSalesEmailMessage(response.data ?? null) ?? undefined,
  };
};

export const sendSalesEmailNow = async (id: SalesId) => {
  const response = await ruoyiRequest<SalesEmailOperation>(
    `${SALES_JAVA_API_PREFIX}/email/messages/${id}/send-now`,
    { method: 'post' },
  );
  return {
    ...response,
    data: normalizeSalesEmailOperation(response.data),
  };
};

export const cancelSalesEmailMessage = async (id: SalesId) => {
  const response = await ruoyiRequest<SalesEmailMessageRecord>(
    `${SALES_JAVA_API_PREFIX}/email/messages/${id}/cancel`,
    { method: 'post' },
  );
  return {
    ...response,
    data: normalizeSalesEmailMessage(response.data ?? null) ?? undefined,
  };
};

export const querySalesEmailEvents = async (messageId: SalesId) => {
  const response = await ruoyiRequest<SalesEmailEventRecord[]>(
    `${SALES_JAVA_API_PREFIX}/email/messages/${messageId}/events`,
    { method: 'get' },
  );
  return {
    ...response,
    data: toList<SalesEmailEventRecord>(response.data)
      .map(normalizeSalesEmailEvent)
      .filter((item): item is SalesEmailEvent => !!item),
  };
};

export const querySalesEmailDoNotContacts = async () => {
  const response = await ruoyiRequest<SalesEmailDoNotContactRecord[]>(
    `${SALES_JAVA_API_PREFIX}/email/messages/do-not-contact/list`,
    { method: 'get' },
  );
  return {
    ...response,
    data: toList<SalesEmailDoNotContactRecord>(response.data)
      .map(normalizeSalesEmailDoNotContact)
      .filter((item): item is SalesEmailDoNotContact => !!item),
  };
};

export const addSalesEmailDoNotContact = async (
  data: SalesEmailDoNotContactPayload,
) => {
  const response = await ruoyiRequest<SalesEmailDoNotContactRecord>(
    `${SALES_JAVA_API_PREFIX}/email/messages/do-not-contact`,
    {
      method: 'post',
      data,
    },
  );
  return {
    ...response,
    data: normalizeSalesEmailDoNotContact(response.data ?? null) ?? undefined,
  };
};

export const deleteSalesEmailDoNotContact = (id: SalesId) =>
  ruoyiRequest<void>(
    `${SALES_JAVA_API_PREFIX}/email/messages/do-not-contact/${id}`,
    { method: 'delete' },
  );

export const getSalesSearchRun = async (id: SalesId) => {
  const response = await ruoyiRequest<SalesSearchRunRecord>(
    `${SALES_JAVA_API_PREFIX}/search/runs/${id}`,
    { method: 'get' },
  );
  return {
    ...response,
    data: normalizeSalesSearchRun(response.data ?? null) ?? undefined,
  };
};

export const querySalesRunAccountProfiles = async (runId: SalesId) => {
  const response = await ruoyiRequest<SalesAccountProfileRecord[]>(
    `${SALES_JAVA_API_PREFIX}/search/runs/${runId}/account-profiles`,
    { method: 'get' },
  );
  return {
    ...response,
    data: toList<SalesAccountProfileRecord>(response.data)
      .map(normalizeSalesAccountProfile)
      .filter((item): item is SalesAccountProfile => !!item),
  };
};

export const updateSalesAccountProfileReview = async (
  profileId: SalesId,
  data: UpdateSalesAccountProfileReviewPayload,
) => {
  const response = await ruoyiRequest<SalesAccountProfileRecord>(
    `${SALES_JAVA_API_PREFIX}/search/runs/account-profiles/${profileId}/review`,
    {
      method: 'put',
      data,
    },
  );
  return {
    ...response,
    data: normalizeSalesAccountProfile(response.data ?? null) ?? undefined,
  };
};

export const createSalesTaskFromTemplate = async (
  templateId: SalesId,
  data: CreateSalesTaskFromTemplatePayload = {},
) => {
  const response = await ruoyiRequest<SalesTaskRecord>(
    `${SALES_JAVA_API_PREFIX}/tasks/from-template/${templateId}`,
    {
      method: 'post',
      data,
    },
  );
  return {
    ...response,
    data: normalizeSalesTask(response.data ?? null) ?? undefined,
  };
};

export const startSalesTask = (taskId: SalesId) =>
  ruoyiRequest<SalesTaskStartRecord>(`${SALES_JAVA_API_PREFIX}/tasks/${taskId}/start`, {
    method: 'post',
  });
