import {
  CloseOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  message,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RecovListPage,
  RecovListStack,
  RecovStatsStrip,
  RecovTableCard,
} from '@/pages/recov/components/RecovListLayout';
import {
  type FlowEventPageItem,
  type FlowEventPageQuery,
  getFlowEventPage,
  normalizeFlowEventPageResult,
} from '@/services/ruoyi/flowEvent';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

export type FlowEventCenterMode = 'page' | 'overlay';

type FlowEventCenterProps = {
  mode?: FlowEventCenterMode;
  onClose?: () => void;
};

type EventQueryState = {
  debtRecordId?: string;
  pageNum: number;
  pageSize: number;
};

const DEFAULT_PAGE_NUM = 1;
const DEFAULT_PAGE_SIZE = 20;

const scopeMeta: Record<string, { color: string; label: string }> = {
  flow: { color: 'purple', label: '流程' },
  node: { color: 'blue', label: '节点' },
  business: { color: 'gold', label: '业务' },
};

const eventTypeColor = (eventType?: string) => {
  if (!eventType) return 'default';
  if (eventType.includes('failed')) return 'error';
  if (eventType.includes('completed')) return 'success';
  if (eventType.includes('terminated')) return 'default';
  if (eventType.includes('delayed')) return 'warning';
  return 'processing';
};

const toText = (value: unknown) =>
  value === null || value === undefined || value === '' ? '-' : String(value);

const toTrimmedValue = (value: string) => {
  const normalizedValue = value.trim();
  return normalizedValue || undefined;
};

const formatEventTime = (value?: string) => {
  if (!value) return '-';
  const dateValue = dayjs(value);
  if (!dateValue.isValid()) return value;
  return `${dateValue.format('YYYY-MM-DD HH:mm:ss')} · ${dateValue.fromNow()}`;
};

const summarizeExtra = (event: FlowEventPageItem) => {
  const description = [event.eventContent, event.reasonText]
    .map((item) => toTrimmedValue(String(item ?? '')))
    .find(Boolean);

  const accountPrefix =
    event.debtNumber !== null && event.debtNumber !== undefined
      ? `${event.debtNumber}号账户`
      : '账户';

  return description ? `${accountPrefix} ${description}` : `${accountPrefix} -`;
};

const getEventRowKey = (item: FlowEventPageItem) =>
  String(
    item.id ??
      `${item.instanceId ?? 'instance'}-${item.createTime ?? 'time'}-${item.eventType ?? 'event'}`,
  );

const FlowEventCenter = ({
  mode = 'overlay',
  onClose,
}: FlowEventCenterProps) => {
  const [form] = Form.useForm<{ debtRecordId?: string }>();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [query, setQuery] = useState<EventQueryState>({
    pageNum: DEFAULT_PAGE_NUM,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [draftDebtRecordId, setDraftDebtRecordId] = useState('');
  const [rows, setRows] = useState<FlowEventPageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestSeqRef = useRef(0);

  const loadEvents = useCallback(
    async (nextQuery: EventQueryState, silent = false) => {
      requestSeqRef.current += 1;
      const seq = requestSeqRef.current;
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const params: FlowEventPageQuery = {
          pageNum: nextQuery.pageNum,
          pageSize: nextQuery.pageSize,
        };
        if (nextQuery.debtRecordId) {
          params.debtRecordId = nextQuery.debtRecordId;
        }

        const response = await getFlowEventPage(params);
        if (seq !== requestSeqRef.current) return;
        const pageResult = normalizeFlowEventPageResult(response);
        setRows(pageResult.rows);
        setTotal(pageResult.total);
      } catch {
        if (seq === requestSeqRef.current) {
          setRows([]);
          setTotal(0);
          messageApi.error('流程事件加载失败，请稍后重试');
        }
      } finally {
        if (seq === requestSeqRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadEvents(query);
  }, [loadEvents, query]);

  useEffect(() => {
    if (mode !== 'overlay' || typeof document === 'undefined') return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== 'overlay' || !onClose) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mode, onClose]);

  const scopeStats = useMemo(() => {
    return rows.reduce(
      (result, item) => {
        const key = item.eventScope || 'unknown';
        result[key] = (result[key] || 0) + 1;
        return result;
      },
      {} as Record<string, number>,
    );
  }, [rows]);

  const statCards = useMemo(
    () => [
      { key: 'total', label: '事件总数', value: total },
      { key: 'current', label: '当前页条数', value: rows.length },
      { key: 'flow', label: '流程事件', value: scopeStats.flow || 0 },
      { key: 'node', label: '节点事件', value: scopeStats.node || 0 },
    ],
    [rows.length, scopeStats.flow, scopeStats.node, total],
  );

  const columns = useMemo<ColumnsType<FlowEventPageItem>>(
    () => [
      {
        title: '资产编号',
        dataIndex: 'debtNumber',
        width: 120,
        render: (value) => toText(value),
      },
      {
        title: '事件标题',
        dataIndex: 'eventTitle',
        width: 220,
        ellipsis: true,
        render: (value) => <Text strong>{toText(value)}</Text>,
      },
      {
        title: '事件范围',
        dataIndex: 'eventScope',
        width: 100,
        align: 'center',
        render: (value) => {
          const meta = scopeMeta[String(value || '')] || {
            color: 'default',
            label: toText(value),
          };
          return <Tag color={meta.color}>{meta.label}</Tag>;
        },
      },
      {
        title: '事件类型',
        dataIndex: 'eventType',
        width: 140,
        align: 'center',
        render: (value) => (
          <Tag color={eventTypeColor(String(value || ''))}>{toText(value)}</Tag>
        ),
      },
      {
        title: '节点名称',
        dataIndex: 'nodeName',
        width: 140,
        render: (value) => toText(value),
      },
      {
        title: '描述',
        key: 'summary',
        ellipsis: true,
        render: (_value, record) => toText(summarizeExtra(record)),
      },
      {
        title: '流程实例 ID',
        dataIndex: 'instanceId',
        width: 180,
        ellipsis: true,
        render: (value) => toText(value),
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        width: 180,
        render: (value) => (
          <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
            {formatEventTime(String(value || ''))}
          </Text>
        ),
      },
    ],
    [],
  );

  const handleSearch = () => {
    const nextDebtRecordId = toTrimmedValue(draftDebtRecordId);
    setQuery((current) => ({
      ...current,
      debtRecordId: nextDebtRecordId,
      pageNum: DEFAULT_PAGE_NUM,
    }));
  };

  const handleReset = () => {
    setDraftDebtRecordId('');
    form.resetFields();
    setQuery({
      debtRecordId: undefined,
      pageNum: DEFAULT_PAGE_NUM,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  };

  const content = (
    <div className="flex h-full min-h-0 flex-col">
      {messageContextHolder}
      <RecovListStack className="min-h-0 flex-1">
        <RecovStatsStrip className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <div
              className="rounded-xl border border-solid border-[rgba(5,5,5,0.06)] bg-white px-4 py-3 shadow-sm"
              key={card.key}
            >
              <Text type="secondary">{card.label}</Text>
              <div className="mt-2">
                <Title level={4} style={{ margin: 0 }}>
                  {card.value}
                </Title>
              </div>
            </div>
          ))}
        </RecovStatsStrip>

        <RecovTableCard
          extra={
            <Button
              icon={<ReloadOutlined />}
              loading={refreshing}
              onClick={() => {
                void loadEvents(query, true);
              }}
            >
              刷新
            </Button>
          }
          title="流程事件列表"
        >
          <Form form={form} className="recov-table-toolbar">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Space wrap size={12}>
                <Input
                  allowClear
                  placeholder="债务记录 ID"
                  prefix={<SearchOutlined />}
                  style={{ width: 220 }}
                  value={draftDebtRecordId}
                  onChange={(event) => {
                    setDraftDebtRecordId(event.target.value);
                  }}
                  onPressEnter={handleSearch}
                />
                <Button
                  icon={<SearchOutlined />}
                  type="primary"
                  onClick={handleSearch}
                >
                  查询
                </Button>
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </div>
          </Form>

          <Alert
            className="mb-3"
            description={
              query.debtRecordId
                ? `当前仅展示债务记录 ${query.debtRecordId} 的流程事件。`
                : '当前展示全局流程事件分页结果。'
            }
            showIcon
            type="info"
          />

          <Table<FlowEventPageItem>
            bordered
            className="recov-stable-pagination-table"
            columns={columns}
            dataSource={rows}
            loading={loading}
            locale={{
              emptyText: <Empty description="暂无流程事件" />,
            }}
            pagination={{
              current: query.pageNum,
              pageSize: query.pageSize,
              total,
              showSizeChanger: true,
              showTotal: (value) => `共 ${value} 条`,
              onChange: (pageNum, pageSize) => {
                setQuery((current) => ({
                  ...current,
                  pageNum,
                  pageSize,
                }));
              },
            }}
            rowKey={getEventRowKey}
            scroll={{ x: 1500 }}
          />
        </RecovTableCard>
      </RecovListStack>
    </div>
  );

  if (mode === 'overlay') {
    return (
      <div className="fixed inset-0 z-[1000] bg-[#f5f7fb]">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between border-0 border-b border-solid border-[rgba(5,5,5,0.06)] bg-[rgba(255,255,255,0.92)] px-6 py-4 backdrop-blur">
            <div className="min-w-0">
              <Title level={4} style={{ margin: 0 }}>
                流程事件中心
              </Title>
              <Text type="secondary">
                基于全局流程事件分页接口查看最新事件时间线，支持按债务记录筛选。
              </Text>
            </div>
            <Button icon={<CloseOutlined />} onClick={onClose} type="text">
              关闭
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden px-6 py-6">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return <RecovListPage title="流程事件中心">{content}</RecovListPage>;
};

export default FlowEventCenter;
