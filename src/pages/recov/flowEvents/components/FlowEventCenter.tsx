import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Badge,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  message,
  Segmented,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  RecovListPage,
  RecovListStack,
  RecovTableCard,
} from '@/pages/recov/components/RecovListLayout';
import FlowWorkbench from '@/pages/recov/flow/components/FlowWorkbench';
import {
  buildFlowEventDisplaySummary,
  type FlowEventPageItem,
  type FlowEventPageQuery,
  getFlowEventPage,
  markAllFlowEventsRead,
  normalizeFlowEventPageResult,
} from '@/services/ruoyi/flowEvent';

const { Text } = Typography;

type FlowEventCenterProps = {
  onEventsRead?: () => void;
};

type EventQueryState = {
  debtRecordId?: string;
  unreadOnly?: boolean;
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
  return dateValue.format('YYYY-MM-DD HH:mm:ss');
};

const formatStructuredText = (value: unknown) => {
  const normalizedValue = String(value ?? '').trim();
  if (!normalizedValue) return '-';

  try {
    return JSON.stringify(JSON.parse(normalizedValue), null, 2);
  } catch {
    return normalizedValue;
  }
};

const renderDetailText = (value: unknown) => {
  const text = formatStructuredText(value);
  if (text === '-') return text;

  return (
    <Typography.Paragraph
      copyable={{ text }}
      style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}
    >
      {text}
    </Typography.Paragraph>
  );
};

const getEventRowKey = (item: FlowEventPageItem) =>
  String(
    item.id ??
      `${item.instanceId ?? 'instance'}-${item.createTime ?? 'time'}-${item.eventType ?? 'event'}`,
  );

const FlowEventCenter = ({ onEventsRead }: FlowEventCenterProps) => {
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
  const [detailRecord, setDetailRecord] = useState<FlowEventPageItem | null>(
    null,
  );
  const requestSeqRef = useRef(0);
  const autoMarkedReadRef = useRef(false);
  const onEventsReadRef = useRef(onEventsRead);

  useEffect(() => {
    onEventsReadRef.current = onEventsRead;
  }, [onEventsRead]);

  const markAllReadOnce = useCallback(async () => {
    if (autoMarkedReadRef.current) return;
    autoMarkedReadRef.current = true;
    try {
      await markAllFlowEventsRead();
      setRows((currentRows) =>
        currentRows.map((item) =>
          item.read === false ? { ...item, read: true } : item,
        ),
      );
      onEventsReadRef.current?.();
    } catch {
      autoMarkedReadRef.current = false;
    }
  }, []);

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
        if (nextQuery.unreadOnly) {
          params.unreadOnly = true;
        }

        const response = await getFlowEventPage(params);
        if (seq !== requestSeqRef.current) return;
        const pageResult = normalizeFlowEventPageResult(response);
        setRows(pageResult.rows);
        setTotal(pageResult.total);
        void markAllReadOnce();
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
    [markAllReadOnce],
  );

  useEffect(() => {
    void loadEvents(query);
  }, [loadEvents, query]);

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
        render: (value, record) => (
          <Space size={6}>
            {record.read === false ? <Badge status="error" /> : null}
            <Text strong={record.read === false}>{toText(value)}</Text>
          </Space>
        ),
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
        title: '节点名称',
        dataIndex: 'nodeName',
        width: 220,
        render: (value) => toText(value),
      },
      {
        title: '描述',
        key: 'summary',
        ellipsis: true,
        render: (_value, record) =>
          toText(buildFlowEventDisplaySummary(record)),
      },
      {
        title: '流程批次',
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
      {
        title: '操作',
        key: 'actions',
        width: 90,
        fixed: 'right',
        align: 'left',
        render: (_value, record) => (
          <Button
            size="small"
            type="link"
            onClick={() => {
              setDetailRecord(record);
            }}
          >
            详情
          </Button>
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
      unreadOnly: false,
      pageNum: DEFAULT_PAGE_NUM,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  };

  const handleReadModeChange = (value: string | number) => {
    setQuery((current) => ({
      ...current,
      unreadOnly: value === 'unread',
      pageNum: DEFAULT_PAGE_NUM,
    }));
  };

  const eventListContent = (
    <RecovListStack className="min-h-0">
      <RecovTableCard title="流程事件">
        <Form form={form} className="recov-table-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Space wrap size={12}>
              <Segmented
                options={[
                  { label: '全部', value: 'all' },
                  { label: '未读', value: 'unread' },
                ]}
                value={query.unreadOnly ? 'unread' : 'all'}
                onChange={handleReadModeChange}
              />
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
            <Space wrap size={12}>
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={() => {
                  void loadEvents(query, true);
                }}
              >
                刷新
              </Button>
            </Space>
          </div>
        </Form>

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
  );

  const content = (
    <div className="flex h-full min-h-0 flex-col">
      {messageContextHolder}
      <Tabs
        className="flow-event-center-tabs flex min-h-0 flex-1 flex-col"
        defaultActiveKey="events"
        destroyOnHidden
        items={[
          {
            key: 'events',
            label: '流程事件',
            children: eventListContent,
          },
          {
            key: 'flow-manager',
            label: '流程管理',
            children: <FlowWorkbench mode="embedded" />,
          },
        ]}
      />
      <Drawer
        destroyOnHidden
        open={Boolean(detailRecord)}
        title="事件详情"
        size="min(680px, calc(100vw - 24px))"
        zIndex={1100}
        onClose={() => {
          setDetailRecord(null);
        }}
      >
        {detailRecord ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="事件 ID">
              {toText(detailRecord.id)}
            </Descriptions.Item>
            <Descriptions.Item label="流程批次">
              {toText(detailRecord.instanceId)}
            </Descriptions.Item>
            <Descriptions.Item label="任务 ID">
              {toText(detailRecord.taskId)}
            </Descriptions.Item>
            <Descriptions.Item label="资产编号">
              {toText(detailRecord.debtNumber)}
            </Descriptions.Item>
            <Descriptions.Item label="事件标题">
              {toText(detailRecord.eventTitle)}
            </Descriptions.Item>
            <Descriptions.Item label="前端描述">
              {buildFlowEventDisplaySummary(detailRecord)}
            </Descriptions.Item>
            <Descriptions.Item label="原始说明">
              {renderDetailText(detailRecord.eventContent)}
            </Descriptions.Item>
            <Descriptions.Item label="失败原因">
              {renderDetailText(detailRecord.reasonText)}
            </Descriptions.Item>
            <Descriptions.Item label="节点名称">
              {toText(detailRecord.nodeName)}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {formatEventTime(detailRecord.createTime)}
            </Descriptions.Item>
            <Descriptions.Item label="事件类型">
              {toText(detailRecord.eventType)}
            </Descriptions.Item>
            <Descriptions.Item label="变更前数据">
              {renderDetailText(detailRecord.beforeData)}
            </Descriptions.Item>
            <Descriptions.Item label="变更后数据">
              {renderDetailText(detailRecord.afterData)}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>
    </div>
  );

  return <RecovListPage title="流程事件中心">{content}</RecovListPage>;
};

export default FlowEventCenter;
