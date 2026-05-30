import {
  MailOutlined,
  PhoneOutlined,
  RobotOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { Button, Typography } from 'antd';
import { createStyles } from 'antd-style';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React, { useCallback, useEffect, useRef, useState } from 'react';

dayjs.extend(relativeTime);

export type FlowProcessStatus = 'running' | 'waiting' | 'success' | 'warning';
export type FlowProcessChannel = 'phone' | 'message' | 'system';

export type FlowProcessItem = {
  id: string;
  title: string;
  summary: string;
  time: string;
  status: FlowProcessStatus;
  channel: FlowProcessChannel;
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
  },
  {
    id: '2',
    title: '人工复核',
    summary: 'AI 已生成 10 号账户的跟进建议，等待人工复核。',
    time: dayjs().subtract(1, 'minute').toISOString(),
    status: 'waiting',
    channel: 'phone',
  },
  {
    id: '3',
    title: '结果回收',
    summary: 'AI 已完成 70 号账户的短信触达，进入结果回收阶段。',
    time: dayjs().subtract(3, 'minute').toISOString(),
    status: 'success',
    channel: 'message',
  },
  {
    id: '4',
    title: '异常切换',
    summary: '48 号账户的拨号链路异常，已切换备用策略并待确认。',
    time: dayjs().subtract(6, 'minute').toISOString(),
    status: 'warning',
    channel: 'phone',
  },
  {
    id: '5',
    title: '日志归档',
    summary: '19 号账户的流程日志已归档，可继续下一轮策略执行。',
    time: dayjs().subtract(8, 'minute').toISOString(),
    status: 'success',
    channel: 'system',
  },
];

const defaultViewportMargin = 16;
const defaultBottomOffset = 56;
const dockedDefaultBottomOffset = 84;
const defaultRightContentGap = 20;
const dockSnapThreshold = 32;
const expandedPanelWidth = 336;
const collapsedPanelWidth = 236;
const dockedCollapsedWidth = 48;
const dockedVisibleWidth = 48;

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
      0 20px 48px rgba(5, 8, 22, 0.28),
      0 8px 20px rgba(5, 8, 22, 0.2);
    color: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(20px);

    @media (max-width: 768px) {
      width: min(calc(100vw - 24px), 320px);
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
    background: rgba(93, 101, 255, 0.2);
    color: #7d84ff;
    font-size: 20px;
  `,
  dockedBadgeWrap: css`
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    border-radius: 50%;
    background: rgba(93, 101, 255, 0.2);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.04),
      0 8px 18px rgba(34, 42, 132, 0.18);
    color: #7d84ff;
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
    padding: 10px 16px 12px;
  `,
  list: css`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  item: css`
    position: relative;
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 10px;
  `,
  itemTail: css`
    position: absolute;
    top: 34px;
    left: 15px;
    width: 1px;
    height: calc(100% + 6px);
    background: rgba(255, 255, 255, 0.09);
  `,
  itemIcon: css`
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.82);
    font-size: 14px;
  `,
  itemContent: css`
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
    padding-top: 2px;
  `,
  itemMeta: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,
  itemTitle: css`
    color: rgba(255, 255, 255, 0.52);
    font-size: 11px;
    line-height: 1.4;
  `,
  itemTime: css`
    color: rgba(255, 255, 255, 0.4);
    font-size: 11px;
    white-space: nowrap;
  `,
  itemSummary: css`
    color: rgba(255, 255, 255, 0.9);
    font-weight: 600;
    font-size: 13px;
    line-height: 1.6;
  `,
  footer: css`
    padding: 0 16px 14px;
  `,
  footerButton: css`
    height: 42px;
    border: 0;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.92);
    font-weight: 600;

    &:hover,
    &:focus {
      background: rgba(255, 255, 255, 0.18) !important;
      color: rgba(255, 255, 255, 0.98) !important;
    }
  `,
}));

const renderChannelIcon = (channel: FlowProcessChannel) => {
  if (channel === 'phone') return <PhoneOutlined />;
  if (channel === 'message') return <MailOutlined />;
  return <RobotOutlined />;
};

const formatTimelineTime = (value: string) => {
  const time = dayjs(value);
  if (!time.isValid()) return value;
  return time.fromNow();
};

const resolveItemsSignature = (items: FlowProcessItem[]) =>
  items.map((item) => `${item.id}:${item.time}`).join('|');

const FloatingProcessPanel: React.FC<FloatingProcessPanelProps> = ({
  enabled = true,
  title = '智能体动态',
  items = defaultItems,
  defaultExpanded = false,
  defaultMode = 'normal',
  onViewAllLogs,
}) => {
  const { styles } = useStyles();
  const itemsSignature = resolveItemsSignature(items);
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
  const [hasUnread, setHasUnread] = useState(
    () => items.length > 0 && !defaultExpanded,
  );
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const isDocked = dockSide !== null;
  const isDockedCollapsed = isDocked && !expanded;

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
    if (expanded) {
      lastSeenItemsSignatureRef.current = itemsSignature;
      setHasUnread(false);
      return;
    }

    if (!itemsSignature) {
      setHasUnread(false);
      return;
    }

    if (!lastSeenItemsSignatureRef.current) {
      setHasUnread(items.length > 0);
      return;
    }

    setHasUnread(itemsSignature !== lastSeenItemsSignatureRef.current);
  }, [expanded, items.length, itemsSignature]);

  useEffect(() => {
    if (!expanded) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      if (dragStateRef.current) return;

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
  }, [expanded]);

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
        top: resolveDockedTop({
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
    updatePosition(clampToViewport(basePosition.left, basePosition.top), {
      rememberFloating: true,
    });
  }, [expanded, dockSide, clampToViewport, updatePosition]);

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
          top: resolveDockedTop({
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

      updatePosition(clampToViewport(basePosition.left, basePosition.top), {
        rememberFloating: true,
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
            expanded ? styles.shell : `${styles.shell} ${styles.collapsedShell}`
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
                : styles.header
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
                    : styles.badgeWrap
                }
              >
                <RobotOutlined />
                {hasUnread ? (
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
                <span className={styles.title}>{title}</span>
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
                <div className={styles.list}>
                  {items.map((item, index) => (
                    <div className={styles.item} key={item.id}>
                      {index < items.length - 1 ? (
                        <span aria-hidden className={styles.itemTail} />
                      ) : null}
                      <span className={styles.itemIcon}>
                        {renderChannelIcon(item.channel)}
                      </span>
                      <div className={styles.itemContent}>
                        <div className={styles.itemMeta}>
                          <Typography.Text className={styles.itemTitle}>
                            {item.title}
                          </Typography.Text>
                          <Typography.Text className={styles.itemTime}>
                            {formatTimelineTime(item.time)}
                          </Typography.Text>
                        </div>
                        <Typography.Text className={styles.itemSummary}>
                          {item.summary}
                        </Typography.Text>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.footer}>
                <Button
                  block
                  className={styles.footerButton}
                  type="default"
                  onClick={onViewAllLogs}
                >
                  查看全量运行日志
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default FloatingProcessPanel;
