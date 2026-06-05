import {
  ApartmentOutlined,
  CloseOutlined,
  ExclamationCircleFilled,
  FileDoneOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  MailOutlined,
  PhoneOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  TruckOutlined,
  UpOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Button, Descriptions, Drawer, Spin, Typography } from 'antd';
import { createStyles } from 'antd-style';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export type FlowProcessStatus = 'running' | 'waiting' | 'success' | 'warning';
export type FlowProcessChannel = 'phone' | 'message' | 'system';
export type FlowProcessIconKind =
  | 'phone'
  | 'email'
  | 'corp-letter'
  | 'law-letter'
  | 'litigation'
  | 'litigation-result'
  | 'express'
  | 'seal'
  | 'workflow'
  | 'warning'
  | 'blacklist'
  | 'system';

export type FlowProcessItemDetail = {
  debtNumber?: number | string | null;
  eventType?: string | null;
  eventTitle?: string | null;
  eventContent?: string | null;
  instanceId?: number | string | null;
  nodeName?: string | null;
  reasonText?: string | null;
  taskId?: number | string | null;
  createTime?: string | null;
};

export type FlowProcessItem = {
  id: string;
  title: string;
  summary: string;
  time: string;
  status: FlowProcessStatus;
  channel: FlowProcessChannel;
  detail?: FlowProcessItemDetail;
  iconKind?: FlowProcessIconKind;
  read?: boolean;
};

export type FloatingProcessPanelDefaultMode = 'normal' | 'docked';
export type FloatingProcessDockSide = 'left' | 'right' | null;
type PanelPosition = { left: number; top: number };

type FloatingProcessPanelProps = {
  enabled?: boolean;
  title?: string;
  items?: FlowProcessItem[];
  defaultExpanded?: boolean;
  defaultMode?: FloatingProcessPanelDefaultMode;
  hasUnread?: boolean;
  loading?: boolean;
  emptyText?: string;
  onExpandedChange?: (expanded: boolean) => void;
  onViewAllLogs?: () => void;
};

const defaultItems: FlowProcessItem[] = [
  {
    id: '1',
    title: '短信任务',
    summary: 'AI 正在处理 32 号账户的催收任务，当前进入电话触达环节。',
    time: dayjs().subtract(2, 'minute').toISOString(),
    status: 'running',
    channel: 'message',
    iconKind: 'email',
  },
  {
    id: '2',
    title: '人工复核',
    summary: 'AI 已生成 10 号账户的跟进建议，等待人工复核。',
    time: dayjs().subtract(1, 'minute').toISOString(),
    status: 'waiting',
    channel: 'phone',
    iconKind: 'phone',
  },
  {
    id: '3',
    title: '结果回收',
    summary: 'AI 已完成 70 号账户的短信触达，进入结果回收阶段。',
    time: dayjs().subtract(3, 'minute').toISOString(),
    status: 'success',
    channel: 'message',
    iconKind: 'email',
  },
  {
    id: '4',
    title: '异常切换',
    summary: '48 号账户的拨号链路异常，已切换备用策略并待确认。',
    time: dayjs().subtract(6, 'minute').toISOString(),
    status: 'warning',
    channel: 'phone',
    iconKind: 'phone',
  },
  {
    id: '5',
    title: '日志归档',
    summary: '19 号账户的流程日志已归档，可继续下一轮策略执行。',
    time: dayjs().subtract(8, 'minute').toISOString(),
    status: 'success',
    channel: 'system',
    iconKind: 'workflow',
  },
];

const defaultViewportMargin = 16;
const defaultBottomOffset = 56;
const dockedDefaultBottomOffset = 84;
const defaultRightContentGap = 20;
const dockSnapThreshold = 32;
const expandedPanelWidth = 360;
const collapsedPanelWidth = 196;
const collapsedPanelHeight = 52;
const dockedCollapsedWidth = 48;
const dockedCollapsedHeight = 48;
const dockedVisibleWidth = 48;
const agentIconBackgroundColor = 'rgba(93, 101, 255, 0.2)';
const agentIconColor = '#7d84ff';
const agentIconShadowColor = 'rgba(34, 42, 132, 0.18)';

export const floatingProcessPanelMetrics = {
  expandedWidth: expandedPanelWidth,
  collapsedWidth: collapsedPanelWidth,
  collapsedHeight: collapsedPanelHeight,
  dockedCollapsedWidth,
  dockedCollapsedHeight,
} as const;

const clamp = (value: number, min: number, max: number) => {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
};

const getPreferredAnchorRect = () => {
  if (typeof document === 'undefined') return null;

  const selectors = [
    '.ant-pro-page-container-children-container',
    '.ant-pro-grid-content-children',
    '.ant-pro-layout-content',
  ];

  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return rect;
    }
  }

  return null;
};

export const resolveDockSide = ({
  left,
  width,
  viewportWidth,
  margin = defaultViewportMargin,
  threshold = dockSnapThreshold,
}: {
  left: number;
  width: number;
  viewportWidth: number;
  margin?: number;
  threshold?: number;
}): FloatingProcessDockSide => {
  const rightGap = viewportWidth - left - width;
  if (left <= margin + threshold) return 'left';
  if (rightGap <= margin + threshold) return 'right';
  return null;
};

export const resolveDockedLeft = ({
  side,
  viewportWidth,
  visibleWidth = dockedVisibleWidth,
  dockedWidth = dockedCollapsedWidth,
}: {
  side: Exclude<FloatingProcessDockSide, null>;
  viewportWidth: number;
  visibleWidth?: number;
  dockedWidth?: number;
}) =>
  side === 'left'
    ? Math.max(0, -(dockedWidth - visibleWidth))
    : viewportWidth - visibleWidth;

export const resolveFloatingLeft = ({
  side,
  viewportWidth,
  width,
  margin = defaultViewportMargin,
}: {
  side: Exclude<FloatingProcessDockSide, null>;
  viewportWidth: number;
  width: number;
  margin?: number;
}) =>
  side === 'left'
    ? margin
    : clamp(
        viewportWidth - width - margin,
        margin,
        viewportWidth - width - margin,
      );

export const resolveExpandedDockLeft = ({
  side,
  viewportWidth,
  width = expandedPanelWidth,
  margin = defaultViewportMargin,
}: {
  side: Exclude<FloatingProcessDockSide, null>;
  viewportWidth: number;
  width?: number;
  margin?: number;
}) =>
  resolveFloatingLeft({
    side,
    viewportWidth,
    width,
    margin,
  });

export const resolveDockedTop = ({
  anchorTop,
  viewportHeight,
  shellHeight,
  margin = defaultViewportMargin,
}: {
  anchorTop: number;
  viewportHeight: number;
  shellHeight: number;
  margin?: number;
}) => clamp(anchorTop, margin, viewportHeight - shellHeight - margin);

export const resolveAnchoredPanelTop = ({
  anchorTop,
  anchorHeight,
  panelHeight,
  viewportHeight,
  margin = defaultViewportMargin,
}: {
  anchorTop: number;
  anchorHeight: number;
  panelHeight: number;
  viewportHeight: number;
  margin?: number;
}) => {
  const maxTop = viewportHeight - panelHeight - margin;
  const opensDown = anchorTop + panelHeight <= viewportHeight - margin;
  const preferredTop = opensDown
    ? anchorTop
    : anchorTop + anchorHeight - panelHeight;
  return clamp(preferredTop, margin, maxTop);
};

const resolveDefaultPosition = (
  width: number,
  height: number,
  horizontalMargin = defaultViewportMargin,
  bottomOffset = defaultBottomOffset,
) => ({
  left: (() => {
    const anchorRect = getPreferredAnchorRect();
    if (anchorRect) {
      return clamp(
        anchorRect.right - width - defaultRightContentGap,
        horizontalMargin,
        window.innerWidth - width - horizontalMargin,
      );
    }

    return Math.max(
      horizontalMargin,
      window.innerWidth - width - horizontalMargin,
    );
  })(),
  top: Math.max(
    defaultViewportMargin,
    window.innerHeight - height - bottomOffset,
  ),
});

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1080;
    pointer-events: none;
  `,
  panelWrap: css`
    position: relative;
    pointer-events: auto;
  `,
  shell: css`
    width: ${expandedPanelWidth}px;
    border: 1px solid rgba(95, 108, 255, 0.16);
    border-radius: 20px;
    background:
      linear-gradient(180deg, rgba(10, 12, 22, 0.97), rgba(15, 17, 30, 0.98)),
      ${token.colorBgElevated};
    box-shadow:
      0 14px 32px rgba(5, 8, 22, 0.22),
      0 6px 14px rgba(5, 8, 22, 0.16);
    color: rgba(255, 255, 255, 0.92);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    backdrop-filter: saturate(180%) blur(20px);

    @media (max-width: 768px) {
      width: min(calc(100vw - 24px), ${expandedPanelWidth}px);
    }
  `,
  collapsedShell: css`
    width: ${collapsedPanelWidth}px;
    border-radius: 16px;

    @media (max-width: 768px) {
      width: min(calc(100vw - 24px), ${collapsedPanelWidth}px);
    }
  `,
  dockedShell: css`
    width: ${dockedCollapsedWidth}px;
    border: 0;
    border-radius: 0;
    background:
      linear-gradient(180deg, rgba(10, 12, 22, 0.97), rgba(15, 17, 30, 0.98)),
      ${token.colorBgElevated};
    box-shadow:
      0 14px 32px rgba(5, 8, 22, 0.22),
      0 6px 14px rgba(5, 8, 22, 0.16);
    color: rgba(255, 255, 255, 0.92);
    overflow: hidden;
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    backdrop-filter: saturate(180%) blur(20px);
  `,
  dockedLeftShell: css`
    border-top-right-radius: ${token.borderRadiusLG}px;
    border-bottom-right-radius: ${token.borderRadiusLG}px;
  `,
  dockedRightShell: css`
    border-top-left-radius: ${token.borderRadiusLG}px;
    border-bottom-left-radius: ${token.borderRadiusLG}px;
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    cursor: grab;
    touch-action: none;

    &:active {
      cursor: grabbing;
    }
  `,
  collapsedHeader: css`
    min-height: ${collapsedPanelHeight}px;
    padding: 8px 10px;
  `,
  headerMain: css`
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 8px;
  `,
  dockedHeaderMain: css`
    width: 100%;
    min-width: 100%;
    height: 48px;
    flex: none;
    gap: 0;
    justify-content: center;
  `,
  dockedHeader: css`
    height: 48px;
    padding: 0;
    gap: 0;
  `,
  badgeWrap: css`
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    border-radius: 50%;
    background: ${agentIconBackgroundColor};
    color: ${agentIconColor};
    font-size: 20px;
  `,
  collapsedBadgeWrap: css`
    width: 36px;
    height: 36px;
    flex-basis: 36px;
    font-size: 18px;
  `,
  dockedBadgeWrap: css`
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    border-radius: 50%;
    background: ${agentIconBackgroundColor};
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.04),
      0 8px 18px ${agentIconShadowColor};
    color: ${agentIconColor};
    font-size: 20px;
  `,
  pulse: css`
    position: absolute;
    top: 2px;
    right: 2px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #ff4d4f;
    box-shadow: 0 0 0 4px rgba(255, 77, 79, 0.16);
  `,
  dockedPulse: css`
    top: 2px;
    right: 2px;
    width: 8px;
    height: 8px;
    box-shadow: 0 0 0 3px rgba(255, 77, 79, 0.12);
  `,
  titleWrap: css`
    display: flex;
    min-width: 0;
    align-items: center;
  `,
  dockedTitleWrap: css`
    display: none;
  `,
  title: css`
    color: rgba(255, 255, 255, 0.96);
    font-weight: 700;
    font-size: 14px;
    line-height: 1.4;
  `,
  collapsedTitle: css`
    font-size: 13px;
  `,
  toggle: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: rgba(255, 255, 255, 0.72);
    cursor: pointer;
    transition:
      background ${token.motionDurationMid},
      color ${token.motionDurationMid},
      transform ${token.motionDurationMid};

    &:hover {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.96);
    }
  `,
  collapsedToggle: css`
    width: 26px;
    height: 26px;
    flex-basis: 26px;
    transform: rotate(180deg);
  `,
  dockedToggle: css`
    display: none;
  `,
  divider: css`
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
  `,
  body: css`
    max-height: min(52vh, 420px);
    overflow-y: auto;
    padding: 10px 14px 12px;
  `,
  list: css`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 10px;
  `,
  item: css`
    position: relative;
    display: grid;
    width: 100%;
    grid-template-columns: 32px minmax(0, 1fr);
    align-items: start;
    gap: 8px;
    border: 0;
    border-radius: 10px;
    padding: 6px 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    text-align: left;
    transition: background ${token.motionDurationMid};

    &:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    &:focus-visible {
      outline: 2px solid rgba(125, 132, 255, 0.52);
      outline-offset: 2px;
    }
  `,
  itemIcon: css`
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.62);
    font-size: 14px;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  `,
  itemContent: css`
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
  `,
  itemTimeLine: css`
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 4px;
  `,
  itemErrorMarker: css`
    display: inline-flex;
    flex: 0 0 auto;
    color: ${token.colorError};
    font-size: 10px;
    line-height: 1;
    opacity: 0.86;
  `,
  itemUnreadDot: css`
    position: absolute;
    top: -1px;
    right: -1px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #ff4d4f;
    box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.12);
  `,
  itemTime: css`
    display: block;
    color: rgba(255, 255, 255, 0.46);
    font-size: 10px;
    line-height: 1.3;
    text-align: left;
    white-space: normal;
  `,
  itemSummary: css`
    color: rgba(255, 255, 255, 0.72);
    font-weight: 500;
    font-size: 12px;
    line-height: 1.55;
  `,
  loadingState: css`
    display: flex;
    min-height: 148px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 8px 18px;
    text-align: center;

    .ant-spin {
      color: ${agentIconColor};
    }
  `,
  emptyState: css`
    display: flex;
    min-height: 118px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 10px 8px 14px;
    text-align: center;
  `,
  emptyIcon: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
    font-size: 16px;
  `,
  emptyTitle: css`
    color: rgba(255, 255, 255, 0.9);
    font-weight: 600;
    font-size: 13px;
    line-height: 1.5;
  `,
  emptyDescription: css`
    max-width: 240px;
    color: rgba(255, 255, 255, 0.46);
    font-size: 12px;
    line-height: 1.6;
  `,
  footer: css`
    padding: 0 16px 12px;
  `,
  footerButton: css`
    height: 34px;
    border: 0;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.92);
    font-size: 13px;
    font-weight: 600;

    &:hover,
    &:focus {
      background: rgba(255, 255, 255, 0.18) !important;
      color: rgba(255, 255, 255, 0.98) !important;
    }
  `,
}));

const resolveIconKind = (
  item: Pick<FlowProcessItem, 'channel' | 'iconKind'>,
): FlowProcessIconKind => {
  if (item.iconKind) return item.iconKind;
  if (item.channel === 'phone') return 'phone';
  if (item.channel === 'message') return 'email';
  return 'system';
};

const renderProcessIcon = (iconKind: FlowProcessIconKind) => {
  if (iconKind === 'phone') return <PhoneOutlined />;
  if (iconKind === 'email') return <MailOutlined />;
  if (iconKind === 'corp-letter') return <FileTextOutlined />;
  if (iconKind === 'law-letter') return <FilePdfOutlined />;
  if (iconKind === 'litigation') return <FileImageOutlined />;
  if (iconKind === 'litigation-result') return <FileDoneOutlined />;
  if (iconKind === 'express') return <TruckOutlined />;
  if (iconKind === 'seal') return <SafetyCertificateOutlined />;
  if (iconKind === 'workflow') return <ApartmentOutlined />;
  if (iconKind === 'warning') return <WarningOutlined />;
  if (iconKind === 'blacklist') return <StopOutlined />;
  return <RobotOutlined />;
};

const itemIconStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.06)',
  color: 'rgba(255, 255, 255, 0.62)',
};

export const formatTimelineTime = (value: string, now = dayjs()) => {
  const time = dayjs(value);
  if (!time.isValid()) return value;
  const elapsedSeconds = Math.max(0, now.diff(time, 'second'));
  if (elapsedSeconds < 60) return '刚刚';

  const elapsedMinutes = Math.max(1, now.diff(time, 'minute'));
  if (elapsedMinutes < 60) return `${elapsedMinutes}分钟前`;

  const elapsedHours = now.diff(time, 'hour');
  if (elapsedHours < 24) return `${elapsedHours}小时前`;

  const elapsedDays = now.diff(time, 'day');
  if (elapsedDays < 30) return `${elapsedDays}天前`;

  const elapsedMonths = now.diff(time, 'month');
  if (elapsedMonths < 12) return `${Math.max(1, elapsedMonths)}个月前`;

  const elapsedYears = now.diff(time, 'year');
  return `${Math.max(1, elapsedYears)}年前`;
};

const toDetailText = (value: unknown) => {
  const text = String(value ?? '').trim();
  return text || undefined;
};

const formatDetailTime = (value: string) => {
  const time = dayjs(value);
  if (!time.isValid()) return value;
  return time.format('YYYY-MM-DD HH:mm:ss');
};

const buildDetailItems = (item: FlowProcessItem) => {
  const detail = item.detail;
  return [
    {
      key: 'summary',
      label: '事件摘要',
      children: item.summary,
    },
    {
      key: 'time',
      label: '发生时间',
      children: formatDetailTime(item.time),
    },
    {
      key: 'nodeName',
      label: '节点名称',
      children: toDetailText(detail?.nodeName),
    },
    {
      key: 'debtNumber',
      label: '资产编号',
      children: toDetailText(detail?.debtNumber),
    },
    {
      key: 'reasonText',
      label: '失败原因',
      children: toDetailText(detail?.reasonText),
    },
    {
      key: 'eventContent',
      label: '详细说明',
      children: toDetailText(detail?.eventContent),
    },
  ].filter((entry) => entry.children);
};

const resolveItemsSignature = (items: FlowProcessItem[]) =>
  items.map((item) => `${item.id}:${item.time}`).join('|');

const FloatingProcessPanel: React.FC<FloatingProcessPanelProps> = ({
  enabled = true,
  title = '智能体动态',
  items = defaultItems,
  defaultExpanded = false,
  defaultMode = 'normal',
  hasUnread: hasUnreadProp,
  loading = false,
  emptyText = '暂无流程动态',
  onExpandedChange,
  onViewAllLogs,
}) => {
  const { styles } = useStyles();
  const badgeStyle = React.useMemo<React.CSSProperties>(
    () => ({
      backgroundColor: agentIconBackgroundColor,
      color: agentIconColor,
    }),
    [],
  );
  const dockedBadgeStyle = React.useMemo<React.CSSProperties>(
    () => ({
      ...badgeStyle,
      boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 8px 18px ${agentIconShadowColor}`,
    }),
    [badgeStyle],
  );
  const itemsSignature = resolveItemsSignature(items);
  const hasItems = items.length > 0;
  const hasControlledUnread = typeof hasUnreadProp === 'boolean';
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [dockSide, setDockSide] = useState<FloatingProcessDockSide>(
    defaultMode === 'docked' ? 'right' : null,
  );
  const shellRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    moved: boolean;
    dockSideAtStart: FloatingProcessDockSide;
    expandedAtStart: boolean;
  } | null>(null);
  const ignoreDockedClickRef = useRef(false);
  const latestPositionRef = useRef<PanelPosition | null>(null);
  const lastFloatingPositionRef = useRef<PanelPosition | null>(null);
  const dockedAnchorTopRef = useRef<number | null>(null);
  const hasDefaultModeInitializedRef = useRef(false);
  const lastSeenItemsSignatureRef = useRef(
    defaultExpanded ? itemsSignature : '',
  );
  const [internalHasUnread, setInternalHasUnread] = useState(
    () => items.length > 0 && !defaultExpanded,
  );
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const [detailItem, setDetailItem] = useState<FlowProcessItem | null>(null);
  const isDocked = dockSide !== null;
  const isDockedCollapsed = isDocked && !expanded;
  const hasUnread = hasControlledUnread
    ? Boolean(hasUnreadProp)
    : internalHasUnread;
  const showCollapsedUnreadDot = hasUnread && !expanded;
  const contentLayoutKey = `${loading ? 'loading' : 'ready'}:${items.length}:${itemsSignature}:${emptyText}`;
  const detailItems = detailItem ? buildDetailItems(detailItem) : [];

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  useEffect(() => {
    if (expanded) return;
    setDetailItem(null);
  }, [expanded]);

  const clampToViewport = useCallback((left: number, top: number) => {
    const shell = shellRef.current;
    if (!shell) return { left, top };

    const margin = defaultViewportMargin;
    const maxLeft = window.innerWidth - shell.offsetWidth - margin;
    const maxTop = window.innerHeight - shell.offsetHeight - margin;

    return {
      left: clamp(left, margin, maxLeft),
      top: clamp(top, margin, maxTop),
    };
  }, []);

  const updatePosition = useCallback(
    (
      nextPosition: PanelPosition | null,
      options?: {
        rememberFloating?: boolean;
      },
    ) => {
      latestPositionRef.current = nextPosition;
      if (nextPosition && options?.rememberFloating) {
        lastFloatingPositionRef.current = nextPosition;
      }
      setPosition(nextPosition);
    },
    [],
  );

  useEffect(() => {
    if (hasControlledUnread) return;

    if (expanded) {
      lastSeenItemsSignatureRef.current = itemsSignature;
      setInternalHasUnread(false);
      return;
    }

    if (!itemsSignature) {
      setInternalHasUnread(false);
      return;
    }

    if (!lastSeenItemsSignatureRef.current) {
      setInternalHasUnread(items.length > 0);
      return;
    }

    setInternalHasUnread(itemsSignature !== lastSeenItemsSignatureRef.current);
  }, [expanded, hasControlledUnread, items.length, itemsSignature]);

  useEffect(() => {
    if (!expanded) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      if (dragStateRef.current) return;
      if (detailItem) return;

      const shell = shellRef.current;
      const target = event.target;
      if (!shell || !(target instanceof Node)) return;
      if (shell.contains(target)) return;

      setExpanded(false);
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [detailItem, expanded]);

  useEffect(() => {
    const shell = shellRef.current;

    if (hasDefaultModeInitializedRef.current) {
      setExpanded(false);
    } else {
      hasDefaultModeInitializedRef.current = true;
    }

    if (defaultMode === 'docked') {
      const nextAnchorTop =
        dockedAnchorTopRef.current ??
        latestPositionRef.current?.top ??
        lastFloatingPositionRef.current?.top ??
        (shell
          ? resolveDefaultPosition(
              shell.offsetWidth,
              shell.offsetHeight,
              defaultViewportMargin,
              dockedDefaultBottomOffset,
            ).top
          : null);

      dockedAnchorTopRef.current = nextAnchorTop;
      setDockSide('right');
      return;
    }

    dockedAnchorTopRef.current = null;
    updatePosition(null);
    setDockSide(null);
  }, [defaultMode, updatePosition]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    if (dockSide) {
      const dockedAnchorTop =
        dockedAnchorTopRef.current ??
        latestPositionRef.current?.top ??
        lastFloatingPositionRef.current?.top ??
        resolveDefaultPosition(shell.offsetWidth, shell.offsetHeight).top;
      dockedAnchorTopRef.current = dockedAnchorTop;
      updatePosition({
        left: expanded
          ? resolveExpandedDockLeft({
              side: dockSide,
              viewportWidth: window.innerWidth,
            })
          : resolveDockedLeft({
              side: dockSide,
              viewportWidth: window.innerWidth,
            }),
        top: expanded
          ? resolveAnchoredPanelTop({
              anchorTop: dockedAnchorTop,
              anchorHeight: dockedCollapsedHeight,
              viewportHeight: window.innerHeight,
              panelHeight: shell.offsetHeight,
            })
          : resolveDockedTop({
              anchorTop: dockedAnchorTop,
              viewportHeight: window.innerHeight,
              shellHeight: shell.offsetHeight,
            }),
      });
      return;
    }

    const basePosition =
      lastFloatingPositionRef.current ??
      latestPositionRef.current ??
      resolveDefaultPosition(shell.offsetWidth, shell.offsetHeight);
    const nextPosition = expanded
      ? {
          left: clamp(
            basePosition.left,
            defaultViewportMargin,
            window.innerWidth - shell.offsetWidth - defaultViewportMargin,
          ),
          top: resolveAnchoredPanelTop({
            anchorTop: basePosition.top,
            anchorHeight: dockedCollapsedHeight,
            viewportHeight: window.innerHeight,
            panelHeight: shell.offsetHeight,
          }),
        }
      : clampToViewport(basePosition.left, basePosition.top);

    updatePosition(nextPosition, {
      rememberFloating: !expanded,
    });
  }, [expanded, dockSide, contentLayoutKey, clampToViewport, updatePosition]);

  useEffect(() => {
    const handleResize = () => {
      const shell = shellRef.current;
      if (!shell) return;

      if (dockSide) {
        const dockedAnchorTop =
          dockedAnchorTopRef.current ??
          latestPositionRef.current?.top ??
          lastFloatingPositionRef.current?.top ??
          resolveDefaultPosition(shell.offsetWidth, shell.offsetHeight).top;
        dockedAnchorTopRef.current = dockedAnchorTop;
        updatePosition({
          left: expanded
            ? resolveExpandedDockLeft({
                side: dockSide,
                viewportWidth: window.innerWidth,
              })
            : resolveDockedLeft({
                side: dockSide,
                viewportWidth: window.innerWidth,
              }),
          top: expanded
            ? resolveAnchoredPanelTop({
                anchorTop: dockedAnchorTop,
                anchorHeight: dockedCollapsedHeight,
                viewportHeight: window.innerHeight,
                panelHeight: shell.offsetHeight,
              })
            : resolveDockedTop({
                anchorTop: dockedAnchorTop,
                viewportHeight: window.innerHeight,
                shellHeight: shell.offsetHeight,
              }),
        });
        return;
      }

      const basePosition =
        lastFloatingPositionRef.current ??
        latestPositionRef.current ??
        resolveDefaultPosition(shell.offsetWidth, shell.offsetHeight);
      const nextPosition = expanded
        ? {
            left: clamp(
              basePosition.left,
              defaultViewportMargin,
              window.innerWidth - shell.offsetWidth - defaultViewportMargin,
            ),
            top: resolveAnchoredPanelTop({
              anchorTop: basePosition.top,
              anchorHeight: dockedCollapsedHeight,
              viewportHeight: window.innerHeight,
              panelHeight: shell.offsetHeight,
            }),
          }
        : clampToViewport(basePosition.left, basePosition.top);

      updatePosition(nextPosition, {
        rememberFloating: !expanded,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampToViewport, dockSide, expanded, updatePosition]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      const shell = shellRef.current;
      if (!dragState || !shell) return;

      event.preventDefault();
      if (!dragState.moved) {
        const exceededThreshold =
          Math.abs(event.clientX - dragState.startX) > 4 ||
          Math.abs(event.clientY - dragState.startY) > 4;

        if (!exceededThreshold) {
          return;
        }

        dragState.moved = true;
        if (dragState.dockSideAtStart) {
          const nextFloatingPosition = {
            left: resolveFloatingLeft({
              side: dragState.dockSideAtStart,
              viewportWidth: window.innerWidth,
              width: dragState.expandedAtStart
                ? expandedPanelWidth
                : collapsedPanelWidth,
            }),
            top: clamp(
              latestPositionRef.current?.top ??
                shell.getBoundingClientRect().top,
              defaultViewportMargin,
              window.innerHeight - shell.offsetHeight - defaultViewportMargin,
            ),
          };
          dragState.offsetX = event.clientX - nextFloatingPosition.left;
          dragState.offsetY = event.clientY - nextFloatingPosition.top;
          updatePosition(nextFloatingPosition, { rememberFloating: true });
          dockedAnchorTopRef.current = null;
          setDockSide(null);
        }
      }

      updatePosition(
        clampToViewport(
          event.clientX - dragState.offsetX,
          event.clientY - dragState.offsetY,
        ),
        { rememberFloating: true },
      );
    },
    [clampToViewport, updatePosition],
  );

  const stopDragging = useCallback(
    (event?: PointerEvent) => {
      const dragState = dragStateRef.current;
      const shell = shellRef.current;
      dragStateRef.current = null;
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);

      const currentPosition = latestPositionRef.current;
      if (!dragState || !shell || !currentPosition) return;
      if (event && event.pointerId !== dragState.pointerId) return;
      ignoreDockedClickRef.current = dragState.moved;

      const nextDockSide = resolveDockSide({
        left: currentPosition.left,
        width: shell.offsetWidth,
        viewportWidth: window.innerWidth,
      });

      if (nextDockSide) {
        setExpanded(false);
        setDockSide(nextDockSide);
        dockedAnchorTopRef.current = currentPosition.top;
        updatePosition({
          left: resolveDockedLeft({
            side: nextDockSide,
            viewportWidth: window.innerWidth,
          }),
          top: resolveDockedTop({
            anchorTop: currentPosition.top,
            viewportHeight: window.innerHeight,
            shellHeight: shell.offsetHeight,
          }),
        });
        return;
      }

      dockedAnchorTopRef.current = null;
      setDockSide(null);
      updatePosition(
        clampToViewport(currentPosition.left, currentPosition.top),
        {
          rememberFloating: true,
        },
      );
    },
    [clampToViewport, handlePointerMove, updatePosition],
  );

  useEffect(() => stopDragging, [stopDragging]);

  const handleDragStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || !shellRef.current) return;

      const { left, top } = shellRef.current.getBoundingClientRect();

      dragStateRef.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - left,
        offsetY: event.clientY - top,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        dockSideAtStart: dockSide,
        expandedAtStart: expanded,
      };

      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', stopDragging);
      window.addEventListener('pointercancel', stopDragging);
    },
    [dockSide, expanded, handlePointerMove, stopDragging],
  );

  if (!enabled) {
    return null;
  }

  return (
    <>
      <div
        className={styles.root}
        style={
          position
            ? {
                left: position.left,
                top: position.top,
              }
            : undefined
        }
      >
        <div className={styles.panelWrap}>
          <div
            ref={shellRef}
            className={`${
              expanded
                ? styles.shell
                : `${styles.shell} ${styles.collapsedShell}`
            } ${
              isDockedCollapsed
                ? `${styles.dockedShell} ${
                    dockSide === 'left'
                      ? styles.dockedLeftShell
                      : styles.dockedRightShell
                  }`
                : ''
            }`}
            onClick={() => {
              if (!isDockedCollapsed) return;
              if (ignoreDockedClickRef.current) {
                ignoreDockedClickRef.current = false;
                return;
              }
              setExpanded(true);
            }}
          >
            <div
              className={
                isDockedCollapsed
                  ? `${styles.header} ${styles.dockedHeader}`
                  : `${styles.header} ${expanded ? '' : styles.collapsedHeader}`
              }
              onPointerDown={handleDragStart}
            >
              <div
                className={
                  isDockedCollapsed
                    ? `${styles.headerMain} ${styles.dockedHeaderMain}`
                    : styles.headerMain
                }
              >
                <span
                  className={
                    isDockedCollapsed
                      ? `${styles.badgeWrap} ${styles.dockedBadgeWrap}`
                      : `${styles.badgeWrap} ${expanded ? '' : styles.collapsedBadgeWrap}`
                  }
                  style={isDockedCollapsed ? dockedBadgeStyle : badgeStyle}
                >
                  <RobotOutlined />
                  {showCollapsedUnreadDot ? (
                    <span
                      aria-hidden
                      className={
                        isDockedCollapsed
                          ? `${styles.pulse} ${styles.dockedPulse}`
                          : styles.pulse
                      }
                      data-testid="floating-process-unread-dot"
                    />
                  ) : null}
                </span>
                <span
                  className={
                    isDockedCollapsed
                      ? `${styles.titleWrap} ${styles.dockedTitleWrap}`
                      : styles.titleWrap
                  }
                >
                  <span
                    className={
                      expanded
                        ? styles.title
                        : `${styles.title} ${styles.collapsedTitle}`
                    }
                  >
                    {title}
                  </span>
                </span>
              </div>
              <button
                aria-expanded={expanded}
                aria-label={expanded ? '收起流程信息面板' : '展开流程信息面板'}
                className={
                  expanded
                    ? styles.toggle
                    : `${styles.toggle} ${styles.collapsedToggle} ${isDockedCollapsed ? styles.dockedToggle : ''}`
                }
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => {
                  setExpanded((current) => !current);
                }}
              >
                <UpOutlined />
              </button>
            </div>
            {expanded ? (
              <>
                <div className={styles.divider} />
                <div className={styles.body}>
                  {loading ? (
                    <div className={styles.loadingState}>
                      <Spin size="small" />
                      <Typography.Text className={styles.emptyTitle}>
                        正在加载流程动态
                      </Typography.Text>
                      <Typography.Text className={styles.emptyDescription}>
                        请稍候
                      </Typography.Text>
                    </div>
                  ) : hasItems ? (
                    <div className={styles.list}>
                      {items.map((item) => {
                        const iconKind = resolveIconKind(item);
                        return (
                          <button
                            aria-label={`查看动态详情：${item.summary}`}
                            className={styles.item}
                            key={item.id}
                            type="button"
                            onClick={() => setDetailItem(item)}
                          >
                            <span
                              className={styles.itemIcon}
                              style={itemIconStyle}
                            >
                              {renderProcessIcon(iconKind)}
                              {item.read === false ? (
                                <span
                                  aria-hidden
                                  className={styles.itemUnreadDot}
                                  data-testid="floating-process-item-unread-dot"
                                />
                              ) : null}
                            </span>
                            <div className={styles.itemContent}>
                              <div className={styles.itemTimeLine}>
                                <Typography.Text className={styles.itemTime}>
                                  {formatTimelineTime(item.time)}
                                </Typography.Text>
                                {item.status === 'warning' ? (
                                  <span
                                    aria-hidden
                                    className={styles.itemErrorMarker}
                                    data-testid="floating-process-error-marker"
                                  >
                                    <ExclamationCircleFilled />
                                  </span>
                                ) : null}
                              </div>
                              <Typography.Text className={styles.itemSummary}>
                                {item.summary}
                              </Typography.Text>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon} style={badgeStyle}>
                        <RobotOutlined />
                      </span>
                      <Typography.Text className={styles.emptyTitle}>
                        {emptyText}
                      </Typography.Text>
                      <Typography.Text className={styles.emptyDescription}>
                        当前暂无可展示的流程事件
                      </Typography.Text>
                    </div>
                  )}
                </div>
                {!loading && hasItems ? (
                  <div className={styles.footer}>
                    <Button
                      block
                      className={styles.footerButton}
                      size="small"
                      type="default"
                      onClick={onViewAllLogs}
                    >
                      查看全量运行日志
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
      <Drawer
        closeIcon={<CloseOutlined />}
        destroyOnHidden
        open={Boolean(detailItem)}
        size={560}
        title="智能体动态详情"
        zIndex={1200}
        onClose={() => setDetailItem(null)}
      >
        <Descriptions bordered column={1} items={detailItems} size="small" />
      </Drawer>
    </>
  );
};

export default FloatingProcessPanel;
