import {
  CheckCircleOutlined,
  FilePdfOutlined,
  InboxOutlined,
  MailOutlined,
  MessageOutlined,
  PhoneOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { ComponentType, CSSProperties } from 'react';
import type { TemplateVariable } from '@/components/TemplateEditor/types';
import {
  type DeliveryStrategyFlowNode,
  type DeliveryWayListRow,
  normalizeDeliveryWayCode,
} from '@/services/ruoyi/delivery';
import type { DeliveryContentTemplates, DeliveryTemplateTabId } from './_types';

type AntdIcon = ComponentType<{ style?: CSSProperties; className?: string }>;

export const TEMPLATE_TAB_IDS: DeliveryTemplateTabId[] = [
  'sms',
  'email',
  'express',
  'call',
];

export const TEMPLATE_TAB_LABEL: Record<DeliveryTemplateTabId, string> = {
  sms: '智能短信',
  email: '智能邮件',
  express: '智能快递',
  call: '电话提醒',
};

export const TEMPLATE_TAB_ICON: Record<DeliveryTemplateTabId, AntdIcon> = {
  sms: MessageOutlined,
  email: MailOutlined,
  express: InboxOutlined,
  call: PhoneOutlined,
};

const DOC_ICON_MAP: Record<string, AntdIcon> = {
  UR_CO: MailOutlined,
  UR_LAW: FilePdfOutlined,
  LITIGATION_APPLY_SCREENSHOT: MessageOutlined,
  CASE_NOTICE: CheckCircleOutlined,
};

export const docIcon = (code: string): AntdIcon =>
  DOC_ICON_MAP[code] ?? ToolOutlined;

const CHANNEL_ICON_MAP: Record<string, AntdIcon> = {
  sms: MessageOutlined,
  email: MailOutlined,
  express: InboxOutlined,
  call: PhoneOutlined,
  智能短信: MessageOutlined,
  智能邮件: MailOutlined,
  智能快递: InboxOutlined,
  电话提醒: PhoneOutlined,
};

export const channelIcon = (channel: string): AntdIcon =>
  CHANNEL_ICON_MAP[channel] ?? ToolOutlined;

const CHANNEL_COLOR_MAP: Record<string, string> = {
  sms: '#3b82f6',
  email: '#8b5cf6',
  express: '#f59e0b',
  call: '#10b981',
  智能短信: '#3b82f6',
  智能邮件: '#8b5cf6',
  智能快递: '#f59e0b',
  电话提醒: '#10b981',
};

export const channelColor = (channel: string) =>
  CHANNEL_COLOR_MAP[channel] ?? '#6b7280';

export const normalizeWayId = (id: string): DeliveryTemplateTabId | null =>
  normalizeDeliveryWayCode(id);

export const TEMPLATE_VARS_FALLBACK: TemplateVariable[] = [
  { label: '客户名称', value: 'name' },
  { label: '账单金额', value: 'debt_amount' },
  { label: '截止日期', value: 'deadline_time' },
  { label: '企业名称', value: 'organization' },
  { label: '文书链接清单', value: 'documentLinks' },
];

export const renderTemplateForDisplay = (
  content: string,
  variables: TemplateVariable[],
) => {
  const labelMap = new Map(
    variables.map((item) => [String(item.value).trim(), item.label]),
  );
  return String(content ?? '').replace(
    /\{\{\s*([^{}]+?)\s*\}\}/g,
    (full, key) => {
      const label = labelMap.get(String(key).trim());
      return label ? `{{${label}}}` : full;
    },
  );
};

export const computeSmsBillCount = (charCount: number) => {
  if (charCount <= 0) return 0;
  return Math.max(1, Math.ceil(charCount / 70));
};

export const computePhoneSeconds = (
  script: string,
  variables: TemplateVariable[],
) => {
  const t = renderTemplateForDisplay(script, variables).trim();
  if (!t) return 0;
  return Math.max(1, Math.ceil(t.length / 4));
};

export const cloneTemplates = (t: DeliveryContentTemplates) =>
  JSON.parse(JSON.stringify(t)) as DeliveryContentTemplates;

export const isTabDirty = (
  saved: DeliveryContentTemplates | null,
  current: DeliveryContentTemplates,
  tab: DeliveryTemplateTabId,
) => {
  if (!saved) return false;
  return JSON.stringify(current[tab]) !== JSON.stringify(saved[tab]);
};

export type FlowDrawerNode = {
  nodeId: string;
  nodeName: string;
  proceedOnSuccess: boolean;
};

export const normalizeFlowNode = (
  node: DeliveryStrategyFlowNode | undefined | null,
  wayMap: Map<string, DeliveryWayListRow>,
): FlowDrawerNode | null => {
  if (!node) return null;
  const nodeId = String(node.wayCode ?? node.nodeId ?? '').trim();
  if (!nodeId) return null;
  const way = wayMap.get(nodeId);
  const nodeName = String(
    node.wayName ?? node.nodeName ?? way?.wayName ?? way?.nodeName ?? nodeId,
  ).trim();
  return {
    nodeId,
    nodeName: nodeName || nodeId,
    proceedOnSuccess: node.proceedOnSuccess === true,
  };
};

export const pickAvailableWays = (
  wayRows: DeliveryWayListRow[],
  usedIds: Set<string>,
) =>
  wayRows.filter((item) => item.enabled !== false && !usedIds.has(item.nodeId));

export const normalizeVariables = (
  variables: Array<{ key?: string; label?: string }> | undefined,
): TemplateVariable[] => {
  if (!Array.isArray(variables) || variables.length === 0) {
    return TEMPLATE_VARS_FALLBACK;
  }
  const list = variables
    .map((item) => {
      const label = String(item?.label ?? '').trim();
      const value = String(item?.key ?? '').trim();
      return label && value ? { label, value } : null;
    })
    .filter((item): item is TemplateVariable => item !== null);
  return list.length > 0 ? list : TEMPLATE_VARS_FALLBACK;
};
