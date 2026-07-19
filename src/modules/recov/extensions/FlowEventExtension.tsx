import { history } from '@umijs/max';
import React from 'react';
import { subscribeSseMessage } from '@/adapters/ruoyi/sse';
import { FloatingProcessPanel } from '@/components';
import type {
  FlowProcessChannel,
  FlowProcessIconKind,
  FlowProcessItem,
  FlowProcessStatus,
} from '@/components/FloatingProcessPanel';
import type { FlowEventPageItem } from '../services/flowEvent';
import {
  buildFlowEventDisplaySummary,
  getFlowEventPage,
  getFlowEventUnreadCount,
  markAllFlowEventsRead,
  normalizeFlowEventPageResult,
  normalizeFlowEventUnreadCount,
} from '../services/flowEvent';
import type { FloatingProcessPanelDefaultMode } from './preferences';

const pageSize = 10;
const sseType = 'recov.flow_event.changed';

const resolveStatus = (eventType?: string): FlowProcessStatus => {
  if (!eventType) return 'running';
  if (eventType.includes('failed')) return 'warning';
  if (eventType.includes('completed')) return 'success';
  if (eventType.includes('terminated') || eventType.includes('skipped')) {
    return 'waiting';
  }
  return 'running';
};

const resolveChannel = (event: FlowEventPageItem): FlowProcessChannel => {
  const sourceType = String(event.sourceType || '').toLowerCase();
  const eventType = String(event.eventType || '').toLowerCase();
  if (
    sourceType.includes('sms') ||
    sourceType.includes('message') ||
    eventType.includes('sms') ||
    eventType.includes('message')
  ) {
    return 'message';
  }
  if (
    sourceType.includes('call') ||
    sourceType.includes('phone') ||
    eventType.includes('call') ||
    eventType.includes('phone')
  ) {
    return 'phone';
  }
  return 'system';
};

const resolveIconKind = (event: FlowEventPageItem): FlowProcessIconKind => {
  const nodeCode = String(event.nodeCode || '').toLowerCase();
  const sourceType = String(event.sourceType || '').toLowerCase();
  const searchText = [
    event.nodeCode,
    event.nodeName,
    event.eventType,
    event.eventTitle,
    event.eventContent,
    event.reasonText,
    event.sourceType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (nodeCode === 'ai_call') return 'phone';
  if (nodeCode === 'corp_letter') return 'corp-letter';
  if (nodeCode === 'law_letter') return 'law-letter';
  if (
    nodeCode === 'filing_material_submit' ||
    nodeCode === 'litigation_screenshot'
  ) {
    return 'litigation';
  }
  if (nodeCode === 'litigation_result') return 'litigation-result';
  if (nodeCode === 'lawyer_court') return 'workflow';
  if (nodeCode === 'enforcement_screenshot') return 'litigation';
  if (nodeCode === 'enforcement_result') return 'litigation-result';
  if (nodeCode === 'restrict_consumption') return 'warning';
  if (nodeCode === 'credit_blacklist') return 'blacklist';
  if (searchText.includes('律师函') || searchText.includes('law_letter')) {
    return 'law-letter';
  }
  if (
    searchText.includes('企业催收函') ||
    searchText.includes('催收函') ||
    searchText.includes('corp_letter')
  ) {
    return 'corp-letter';
  }
  if (
    searchText.includes('申请诉讼') ||
    searchText.includes('诉讼') ||
    searchText.includes('立案') ||
    searchText.includes('filing') ||
    searchText.includes('litigation')
  ) {
    return 'litigation';
  }
  if (
    searchText.includes('快递') ||
    searchText.includes('express') ||
    searchText.includes('delivery')
  ) {
    return 'express';
  }
  if (
    sourceType.includes('email') ||
    sourceType.includes('mail') ||
    sourceType.includes('sms') ||
    sourceType.includes('message') ||
    searchText.includes('邮件') ||
    searchText.includes('email') ||
    searchText.includes('mail') ||
    searchText.includes('sms') ||
    searchText.includes('message')
  ) {
    return 'email';
  }
  if (
    searchText.includes('盖章') ||
    searchText.includes('seal') ||
    searchText.includes('签章')
  ) {
    return 'seal';
  }
  if (
    sourceType.includes('call') ||
    sourceType.includes('phone') ||
    searchText.includes('外呼') ||
    searchText.includes('电话') ||
    searchText.includes('call') ||
    searchText.includes('phone')
  ) {
    return 'phone';
  }
  return 'system';
};

const toProcessItem = (event: FlowEventPageItem): FlowProcessItem => ({
  id: String(
    event.id ??
      `${event.instanceId ?? 'instance'}-${event.createTime ?? 'time'}-${event.eventType ?? 'event'}`,
  ),
  title: String(event.eventTitle || event.eventType || '流程事件更新'),
  summary: buildFlowEventDisplaySummary(event),
  time: event.createTime || new Date().toISOString(),
  status: resolveStatus(event.eventType),
  channel: resolveChannel(event),
  iconKind: resolveIconKind(event),
  detail: {
    createTime: event.createTime,
    debtNumber: event.debtNumber,
    eventContent: event.eventContent,
    eventTitle: event.eventTitle,
    eventType: event.eventType,
    instanceId: event.instanceId,
    nodeName: event.nodeName,
    reasonText: event.reasonText,
    taskId: event.taskId,
  },
  read: event.read,
});

const isFlowEventMessage = (message: { event?: string; type?: string }) =>
  message.type === sseType || message.event === sseType;

type FlowEventExtensionProps = {
  contextKey: string;
  defaultMode: FloatingProcessPanelDefaultMode;
  enabled: boolean;
};

export const FlowEventExtension = ({
  contextKey,
  defaultMode,
  enabled,
}: FlowEventExtensionProps) => {
  const [items, setItems] = React.useState<FlowProcessItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const itemRequestSeqRef = React.useRef(0);
  const unreadRequestSeqRef = React.useRef(0);
  const expandedRef = React.useRef(false);
  const unreadCountRef = React.useRef(0);
  const markReadOnCollapseRef = React.useRef(false);

  React.useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const loadItems = React.useCallback(
    async (silent = false) => {
      if (!enabled) {
        setItems([]);
        setLoading(false);
        return false;
      }
      itemRequestSeqRef.current += 1;
      const seq = itemRequestSeqRef.current;
      if (!silent) setLoading(true);
      try {
        const response = await getFlowEventPage({ pageNum: 1, pageSize });
        if (seq !== itemRequestSeqRef.current) return false;
        const pageResult = normalizeFlowEventPageResult(response);
        if (
          expandedRef.current &&
          pageResult.rows.some((item) => item.read === false)
        ) {
          markReadOnCollapseRef.current = true;
        }
        setItems(pageResult.rows.map(toProcessItem));
        return true;
      } catch {
        if (seq === itemRequestSeqRef.current) setItems([]);
        return false;
      } finally {
        if (seq === itemRequestSeqRef.current && !silent) setLoading(false);
      }
    },
    [contextKey, enabled],
  );

  const loadUnreadCount = React.useCallback(async () => {
    if (!enabled) {
      setUnreadCount(0);
      return;
    }
    unreadRequestSeqRef.current += 1;
    const seq = unreadRequestSeqRef.current;
    try {
      const response = await getFlowEventUnreadCount();
      if (seq !== unreadRequestSeqRef.current) return;
      const nextUnreadCount = normalizeFlowEventUnreadCount(response);
      unreadCountRef.current = nextUnreadCount;
      setUnreadCount(nextUnreadCount);
    } catch {
      if (seq !== unreadRequestSeqRef.current) return;
      unreadCountRef.current = 0;
      setUnreadCount(0);
    }
  }, [contextKey, enabled]);

  const markItemsRead = React.useCallback(async () => {
    if (!enabled) return;
    try {
      await markAllFlowEventsRead();
      setItems((current) =>
        current.map((item) =>
          item.read === false ? { ...item, read: true } : item,
        ),
      );
      unreadCountRef.current = 0;
      markReadOnCollapseRef.current = false;
      setUnreadCount(0);
      void loadUnreadCount();
    } catch {
      void loadUnreadCount();
    }
  }, [enabled, loadUnreadCount]);

  const loadItemsForViewing = React.useCallback(
    async (silent = false) => {
      const loaded = await loadItems(silent);
      if (loaded) {
        if (unreadCountRef.current > 0) markReadOnCollapseRef.current = true;
        return;
      }
      void loadUnreadCount();
    },
    [loadItems, loadUnreadCount],
  );

  React.useEffect(() => {
    expandedRef.current = false;
    markReadOnCollapseRef.current = false;
    setItems([]);
    void loadUnreadCount();
  }, [loadUnreadCount]);

  React.useEffect(() => {
    if (!enabled) return;
    return subscribeSseMessage((message) => {
      if (!isFlowEventMessage(message)) return;
      unreadCountRef.current = Math.max(unreadCountRef.current, 1);
      setUnreadCount((current) => Math.max(current, 1));
      if (expandedRef.current) {
        markReadOnCollapseRef.current = true;
        void loadItemsForViewing(true);
      } else {
        void loadUnreadCount();
      }
    });
  }, [contextKey, enabled, loadItemsForViewing, loadUnreadCount]);

  const handleExpandedChange = React.useCallback(
    (expanded: boolean) => {
      expandedRef.current = expanded;
      if (expanded) {
        void loadItemsForViewing();
      } else if (markReadOnCollapseRef.current) {
        void markItemsRead();
      }
    },
    [loadItemsForViewing, markItemsRead],
  );

  return (
    <FloatingProcessPanel
      defaultMode={defaultMode}
      enabled={enabled}
      hasUnread={unreadCount > 0}
      items={items}
      loading={loading}
      onExpandedChange={handleExpandedChange}
      onViewAllLogs={() => {
        void markItemsRead();
        history.push('/flow-events');
      }}
    />
  );
};
