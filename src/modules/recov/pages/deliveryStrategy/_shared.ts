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
import {
  type DeliveryExpressExcelField,
  type DeliveryStrategyFlowNode,
  type DeliveryWayListRow,
  normalizeDeliveryWayCode,
} from '@/modules/recov/services/delivery';
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

export const normalizeWayId = (id: string): DeliveryTemplateTabId | null =>
  normalizeDeliveryWayCode(id);

export const isDeliveryWayEnabled = (
  way: Pick<DeliveryWayListRow, 'enabled' | 'status'>,
) => {
  const status = (way as { status?: unknown }).status;
  return (
    way.enabled !== false && status !== 0 && status !== '0' && status !== false
  );
};

export const EXPRESS_EXCEL_TEMPLATE_TYPE = 'expressDebtExcel';

export const EXPRESS_EXCEL_FIELDS_FALLBACK: DeliveryExpressExcelField[] = [
  { key: 'debtorName', label: '业主姓名', sortOrder: 10 },
  { key: 'debtorPhone', label: '手机号', sortOrder: 20 },
  { key: 'address', label: '住址', sortOrder: 30 },
];

export const normalizeExpressExcelFields = (
  fields: DeliveryExpressExcelField[] | undefined,
): DeliveryExpressExcelField[] => {
  if (!Array.isArray(fields) || fields.length === 0) {
    return EXPRESS_EXCEL_FIELDS_FALLBACK;
  }
  const seen = new Set<string>();
  const normalized = fields
    .map<DeliveryExpressExcelField | null>((field, index) => {
      const key = String(field?.key ?? '').trim();
      const label = String(field?.label ?? '').trim();
      if (!key || !label || seen.has(key)) return null;
      seen.add(key);
      return {
        key,
        label,
        sortOrder: field.sortOrder ?? (index + 1) * 10,
      };
    })
    .filter((field): field is DeliveryExpressExcelField => field !== null)
    .sort(
      (a, b) =>
        Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0) ||
        a.key.localeCompare(b.key),
    );
  return normalized.length > 0 ? normalized : EXPRESS_EXCEL_FIELDS_FALLBACK;
};

export const expressExcelFieldKeys = (
  fields: DeliveryExpressExcelField[] = EXPRESS_EXCEL_FIELDS_FALLBACK,
) => normalizeExpressExcelFields(fields).map((field) => field.key);

export const parseExpressExcelTemplate = (
  value: string | null | undefined,
  fields: DeliveryExpressExcelField[] = EXPRESS_EXCEL_FIELDS_FALLBACK,
): string[] => {
  const availableKeys = expressExcelFieldKeys(fields);
  const allowed = new Set(availableKeys);
  const fallback = availableKeys;
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  if (!raw.startsWith('{')) return fallback;
  try {
    const parsed = JSON.parse(raw) as { fields?: unknown };
    if (!Array.isArray(parsed.fields)) return fallback;
    const selected = parsed.fields
      .map((key) => String(key ?? '').trim())
      .filter(
        (key, index, list) => allowed.has(key) && list.indexOf(key) === index,
      );
    return selected;
  } catch {
    return fallback;
  }
};

export const stringifyExpressExcelTemplate = (fields: string[]) =>
  JSON.stringify({
    type: EXPRESS_EXCEL_TEMPLATE_TYPE,
    fields,
  });

export const cloneTemplates = (t: DeliveryContentTemplates) =>
  JSON.parse(JSON.stringify(t)) as DeliveryContentTemplates;

const normalizeTemplateText = (value: string | null | undefined) =>
  String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, name: string) => {
      return `{{${String(name).trim()}}}`;
    })
    .trim();

const decodeBasicHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const normalizeVariableSpanText = (value: string) =>
  value.replace(
    /<span\b([^>]*data-type=(["'])variable\2[^>]*)>[\s\S]*?<\/span>/gi,
    (full, attrs: string) => {
      const name =
        attrs.match(/\sdata-name=(["'])(.*?)\1/i)?.[2] ||
        attrs.match(/\sdata-token=(["'])(.*?)\1/i)?.[2];
      return name ? `{{${String(name).replace(/[{}]/g, '').trim()}}}` : full;
    },
  );

const toSimpleTemplateText = (value: string | null | undefined) => {
  const normalized = normalizeVariableSpanText(normalizeTemplateText(value));
  if (!normalized) return '';

  const textLike = normalized
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/^<p>/i, '')
    .replace(/<\/p>$/i, '')
    .replace(/<br\s*\/?>/gi, '\n');

  if (/<[^>]+>/.test(textLike)) return null;
  return normalizeTemplateText(decodeBasicHtmlEntities(textLike));
};

const isTemplateTextDirty = (
  saved: string | null | undefined,
  current: string | null | undefined,
) => normalizeTemplateText(saved) !== normalizeTemplateText(current);

const isTemplateHtmlDirty = (
  saved: string | null | undefined,
  current: string | null | undefined,
) => {
  const savedNormalized = normalizeTemplateText(
    normalizeVariableSpanText(saved ?? ''),
  );
  const currentNormalized = normalizeTemplateText(
    normalizeVariableSpanText(current ?? ''),
  );
  if (savedNormalized === currentNormalized) return false;

  const savedSimpleText = toSimpleTemplateText(saved);
  const currentSimpleText = toSimpleTemplateText(current);
  if (
    savedSimpleText !== null &&
    currentSimpleText !== null &&
    savedSimpleText === currentSimpleText
  ) {
    return false;
  }

  return true;
};

export const isTabDirty = (
  saved: DeliveryContentTemplates | null,
  current: DeliveryContentTemplates,
  tab: DeliveryTemplateTabId,
) => {
  if (!saved) return false;
  if (tab === 'sms') {
    return isTemplateTextDirty(saved.sms.content, current.sms.content);
  }
  if (tab === 'email') {
    return (
      isTemplateTextDirty(saved.email.subject, current.email.subject) ||
      isTemplateHtmlDirty(saved.email.html, current.email.html)
    );
  }
  if (tab === 'express') {
    return (
      JSON.stringify(saved.express.excelFields) !==
      JSON.stringify(current.express.excelFields)
    );
  }
  return isTemplateTextDirty(saved.call.script, current.call.script);
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
