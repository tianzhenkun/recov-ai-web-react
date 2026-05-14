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
import type {
  DeliveryStrategyFlowNode,
  DeliveryWayListRow,
} from '@/services/ruoyi/delivery';
import type { DeliveryContentTemplates, DeliveryTemplateTabId } from './_mock';

type AntdIcon = ComponentType<{ style?: CSSProperties; className?: string }>;

export const TEMPLATE_TAB_IDS: DeliveryTemplateTabId[] = [
  'sms',
  'email',
  'express',
  'phone',
];

export const TEMPLATE_TAB_LABEL: Record<DeliveryTemplateTabId, string> = {
  sms: '智能短信',
  email: '智能邮件',
  express: '智能快递',
  phone: '智能电话',
};

export const TEMPLATE_TAB_ICON: Record<DeliveryTemplateTabId, AntdIcon> = {
  sms: MessageOutlined,
  email: MailOutlined,
  express: InboxOutlined,
  phone: PhoneOutlined,
};

export const DOC_ICON_MAP: Record<string, AntdIcon> = {
  corp: MailOutlined,
  lawyer: FilePdfOutlined,
  litigation: MessageOutlined,
  receipt: CheckCircleOutlined,
};

export const docIcon = (code: string): AntdIcon =>
  DOC_ICON_MAP[code] ?? ToolOutlined;

export const CHANNEL_ICON_MAP: Record<string, AntdIcon> = {
  短信: MessageOutlined,
  邮件: MailOutlined,
  快递: InboxOutlined,
  电话: PhoneOutlined,
};

export const channelIcon = (channel: string): AntdIcon =>
  CHANNEL_ICON_MAP[channel] ?? ToolOutlined;

export const CHANNEL_COLOR_MAP: Record<string, string> = {
  短信: '#3b82f6',
  邮件: '#8b5cf6',
  快递: '#f59e0b',
  电话: '#10b981',
};

export const channelColor = (channel: string) =>
  CHANNEL_COLOR_MAP[channel] ?? '#6b7280';

/**
 * 把后端节点 id（如 sms / email / express / phone）规范化到模板 tab id。
 */
export const normalizeWayId = (id: string): DeliveryTemplateTabId | null => {
  const v = String(id || '').trim();
  if (v === 'sms' || v === 'email' || v === 'express' || v === 'phone') {
    return v;
  }
  return null;
};

export const SMS_VARS_FALLBACK: TemplateVariable[] = [
  { label: '客户姓名', value: 'customerName' },
  { label: '项目名称', value: 'projectName' },
  { label: '账单名称', value: 'billName' },
  { label: '欠费金额', value: 'overdueAmount' },
  { label: '详情链接', value: 'detailUrl' },
  { label: '企业名称', value: 'companyName' },
  { label: '客服电话', value: 'servicePhone' },
];

export const EMAIL_VARS_FALLBACK: TemplateVariable[] = [
  { label: '客户名称', value: 'customerName' },
  { label: '项目名称', value: 'projectName' },
  { label: '账单金额', value: 'billAmount' },
  { label: '欠费金额', value: 'overdueAmount' },
  { label: '详情链接', value: 'detailUrl' },
  { label: '截止日期', value: 'deadline' },
  { label: '企业名称', value: 'companyName' },
  { label: '客服电话', value: 'servicePhone' },
];

export const PHONE_VARS_FALLBACK: TemplateVariable[] = [
  { label: '客户名称', value: 'customerName' },
  { label: '项目名称', value: 'projectName' },
  { label: '企业名称', value: 'companyName' },
  { label: '机构名称', value: 'organizationName' },
  { label: '催收人员身份', value: 'collectorRole' },
  { label: '催收人员姓名', value: 'collectorName' },
  { label: '逾期费用名称', value: 'overdueFeeName' },
  { label: '需送达函件类型', value: 'deliveryDocumentType' },
];

/**
 * 把模板中的 `{{key}}` 替换为对应的中文 label，用来计算可视字数。
 */
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
  const nodeId = String(node.nodeId ?? '').trim();
  if (!nodeId) return null;
  const way = wayMap.get(nodeId);
  const nodeName = String(node.nodeName ?? way?.nodeName ?? nodeId).trim();
  return {
    nodeId,
    nodeName: nodeName || nodeId,
    proceedOnSuccess: node.proceedOnSuccess === true,
  };
};

/**
 * 给定全部送达节点与已加入的节点 id 集合，返回当前可加入的节点。
 */
export const pickAvailableWays = (
  wayRows: DeliveryWayListRow[],
  usedIds: Set<string>,
) =>
  wayRows.filter((item) => item.enabled !== false && !usedIds.has(item.nodeId));

/**
 * dict 数据规范化为 TemplateVariable[]，dict 为空时返回 fallback。
 */
export const normalizeDictVariables = (
  options: Array<{ label?: string; value?: string }> | undefined,
  fallback: TemplateVariable[],
): TemplateVariable[] => {
  if (!Array.isArray(options) || options.length === 0) return fallback;
  const list = options
    .map((item) => {
      const label = String(item?.label ?? '').trim();
      const value = String(item?.value ?? '').trim();
      return label && value ? { label, value } : null;
    })
    .filter((x): x is TemplateVariable => x !== null);
  return list.length > 0 ? list : fallback;
};
