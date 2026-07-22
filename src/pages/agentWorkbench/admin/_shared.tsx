import { ProCard } from '@ant-design/pro-components';
import { Typography } from 'antd';
import * as React from 'react';
import type { PageResult } from '@/services/ruoyi/agent-console';
import './admin.css';

const { Text } = Typography;

export const sceneLabels: Record<string, string> = {
  intro_contract: '合同审核',
  intro_document: '跨境文书',
  intro_overseas: '海外获客',
  intro_geo: 'GEO',
};

export const sceneValueEnum = Object.fromEntries(
  Object.entries(sceneLabels).map(([value, text]) => [value, { text }]),
);

export const statusLabels: Record<string, string> = {
  offline: '离线',
  available: '空闲',
  claiming: '认领中',
  in_call: '通话中',
  reconnecting: '重连中',
  wrap_up_quick: '话后处理中',
  paused: '暂停',
  requested: '待接听',
  accepted: '已认领',
  connected: '已接通',
  completed: '已完成',
  expired: '等待超时',
  canceled: '已取消',
  failed: '失败',
  pending: '待处理',
  processing: '处理中',
  closed: '已关闭',
};

export const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : '-';

export const unwrapPage = <T,>(response: unknown): PageResult<T> => {
  if (!response || typeof response !== 'object') return { rows: [], total: 0 };
  const data = Reflect.get(response, 'data');
  const page = data && typeof data === 'object' ? data : response;
  const rows = Reflect.get(page, 'rows');
  const total = Reflect.get(page, 'total');
  const metrics = Reflect.get(page, 'metrics');
  return {
    rows: Array.isArray(rows) ? rows : [],
    total: typeof total === 'number' ? total : 0,
    metrics: metrics && typeof metrics === 'object' ? metrics : undefined,
  };
};

export type MetricItem = {
  key: string;
  label: string;
  value: string | number;
  tone: 'blue' | 'green' | 'orange' | 'red' | 'purple';
};

export const AdminMetricRow = ({ items }: { items: MetricItem[] }) => (
  <div className="agent-admin-metrics">
    {items.map((item) => (
      <ProCard key={item.key} size="small" className="agent-admin-metric-card">
        <span className="agent-admin-metric-icon" data-tone={item.tone} />
        <div>
          <Text type="secondary">{item.label}</Text>
          <div className="agent-admin-metric-value">{item.value}</div>
        </div>
      </ProCard>
    ))}
  </div>
);
