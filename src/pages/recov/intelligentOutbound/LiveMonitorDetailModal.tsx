import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Button,
  Empty,
  Modal,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { formatDuration } from './_shared';
import { type AiCallRecord, getAiCallRecordPage } from './service';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;

type MonitorTabKey = 'ongoing' | 'completed';

type LiveMonitorDetailModalProps = {
  open: boolean;
  onClose: () => void;
  onRecordSemanticClick: (record: AiCallRecord) => void;
};

const statusLabels: Record<string, string> = {
  '1': '通话中',
  '2': '外呼失败',
  '3': '未接听',
  '4': '已完成',
};

const pad = (value: number) => String(value).padStart(2, '0');

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatDateTime = (date: Date) =>
  `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}`;

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return {
    dateStart: formatDateTime(start),
    dateEnd: formatDateTime(end),
  };
};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const parseDateTimeMs = (value: unknown) => {
  const text = firstText(value);
  if (!text) return 0;
  const normalized = text.includes('T') ? text : text.replace(' ', 'T');
  const ms = new Date(normalized).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const toDisplayDurationSeconds = (record: AiCallRecord, nowMs: number) => {
  const provided = Number(record.durationSeconds || 0);
  if (provided > 0) return provided;
  if (String(record.status || '') !== '1') return 0;
  const startedAt = parseDateTimeMs(record.startedAt);
  if (!startedAt || nowMs <= startedAt) return 0;
  return Math.floor((nowMs - startedAt) / 1000);
};

const renderSingleLine = (
  value: unknown,
  options?: { strong?: boolean; secondary?: boolean },
) => {
  const text = firstText(value);
  if (!text) return <Text type="secondary">-</Text>;
  return (
    <Tooltip title={text}>
      <Text
        strong={options?.strong}
        type={options?.secondary ? 'secondary' : undefined}
        className="block max-w-full truncate"
      >
        {text}
      </Text>
    </Tooltip>
  );
};

const LiveMonitorDetailModal = ({
  open,
  onClose,
  onRecordSemanticClick,
}: LiveMonitorDetailModalProps) => {
  const { token } = theme.useToken();
  const [activeKey, setActiveKey] = useState<MonitorTabKey>('ongoing');
  const [items, setItems] = useState<AiCallRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState({
    pageNum: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [nowMs, setNowMs] = useState(() => Date.now());
  const loadSeqRef = useRef(0);

  const loadList = useCallback(
    async (tabKey: MonitorTabKey, pageNum: number, pageSize: number) => {
      const seq = loadSeqRef.current + 1;
      loadSeqRef.current = seq;
      setLoading(true);
      try {
        const range = tabKey === 'completed' ? getTodayRange() : {};
        const res = await getAiCallRecordPage({
          pageNum,
          pageSize,
          ...(tabKey === 'ongoing' ? { status: '1' } : range),
        });
        if (seq !== loadSeqRef.current) return;
        setItems(res.rows || []);
        setTotal(Number(res.total || 0));
      } catch {
        if (seq !== loadSeqRef.current) return;
        setItems([]);
        setTotal(0);
      } finally {
        if (seq === loadSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (open) return;
    loadSeqRef.current += 1;
    setActiveKey('ongoing');
    setPage({ pageNum: 1, pageSize: DEFAULT_PAGE_SIZE });
    setItems([]);
    setTotal(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void loadList(activeKey, page.pageNum, page.pageSize);
  }, [activeKey, loadList, open, page.pageNum, page.pageSize]);

  useEffect(() => {
    if (!open || activeKey !== 'ongoing') return undefined;
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => {
      window.clearInterval(timer);
    };
  }, [activeKey, open]);

  const columns = useMemo<ColumnsType<AiCallRecord>>(() => {
    const baseColumns: ColumnsType<AiCallRecord> = [
      {
        key: 'debtNumber',
        dataIndex: 'debtNumber',
        title: '业主编号',
        fixed: 'left',
        width: 110,
        render: (value) => renderSingleLine(value, { strong: true }),
      },
      {
        key: 'debtorName',
        dataIndex: 'debtorName',
        title: '业主姓名',
        width: 140,
        ellipsis: true,
        render: (value) => renderSingleLine(value),
      },
      {
        key: 'identityName',
        dataIndex: 'identityName',
        title: '数字员工身份',
        width: 180,
        ellipsis: true,
        render: (_, record) => {
          const identityName = firstText(record.identityName, '未知身份');
          const callerName = firstText(record.callerName);
          return (
            <div className="flex min-w-0 flex-col">
              {renderSingleLine(identityName, { strong: true })}
              {callerName ? (
                <Text type="secondary" className="block max-w-full truncate">
                  {callerName}
                </Text>
              ) : null}
            </div>
          );
        },
      },
      {
        key: 'status',
        dataIndex: 'status',
        title: '通话状态',
        width: 110,
        render: (value) => {
          const status = firstText(value);
          const isRunning = status === '1';
          return (
            <Tag
              style={{
                marginInlineEnd: 0,
                color: isRunning
                  ? token.colorPrimary
                  : token.colorTextSecondary,
                backgroundColor: isRunning
                  ? token.colorPrimaryBg
                  : token.colorFillQuaternary,
                borderColor: isRunning
                  ? token.colorPrimaryBorder
                  : token.colorBorderSecondary,
              }}
            >
              {statusLabels[status] || '未知'}
            </Tag>
          );
        },
      },
      {
        key: 'startedAt',
        dataIndex: 'startedAt',
        title: '开始时间',
        width: 170,
        ellipsis: true,
        render: (value) => renderSingleLine(value, { secondary: true }),
      },
      {
        key: 'finishedAt',
        dataIndex: 'finishedAt',
        title: '完成时间',
        width: 170,
        ellipsis: true,
        render: (value) => renderSingleLine(value, { secondary: true }),
      },
      {
        key: 'durationSeconds',
        dataIndex: 'durationSeconds',
        title: '通话时长',
        width: 120,
        render: (_, record) => {
          const seconds = toDisplayDurationSeconds(record, nowMs);
          return (
            <Text type="secondary">
              {seconds > 0 ? formatDuration(seconds) : '-'}
            </Text>
          );
        },
      },
    ];

    if (activeKey === 'completed') {
      baseColumns.push({
        key: 'actions',
        title: '操作',
        fixed: 'right',
        width: 120,
        render: (_, record) => (
          <Button
            disabled={!firstText(record.debtId)}
            icon={<EyeOutlined />}
            size="small"
            type="link"
            onClick={(event) => {
              event.stopPropagation();
              onRecordSemanticClick(record);
            }}
          >
            查看语义分析
          </Button>
        ),
      });
    }

    return baseColumns;
  }, [
    activeKey,
    nowMs,
    onRecordSemanticClick,
    token.colorBorderSecondary,
    token.colorFillQuaternary,
    token.colorPrimary,
    token.colorPrimaryBg,
    token.colorPrimaryBorder,
    token.colorTextSecondary,
  ]);

  const table = (
    <Table<AiCallRecord>
      rowKey={(record) =>
        firstText(record.callRecordId, record.debtId, record.startedAt)
      }
      loading={loading}
      size="middle"
      dataSource={items}
      columns={columns}
      tableLayout="fixed"
      scroll={{ x: activeKey === 'completed' ? 1120 : 1000 }}
      locale={{
        emptyText: (
          <Empty
            description={
              activeKey === 'ongoing' ? '暂无正在通话' : '暂无今日完成通话'
            }
          />
        ),
      }}
      pagination={{
        current: page.pageNum,
        pageSize: page.pageSize,
        total,
        showSizeChanger: true,
        showTotal: (value) => `共 ${value} 条`,
        onChange: (pageNum, pageSize) => {
          setPage({ pageNum, pageSize });
        },
      }}
    />
  );

  return (
    <Modal
      open={open}
      title="实时外呼明细"
      width="min(1040px, 94vw)"
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      styles={{
        body: {
          paddingTop: 8,
        },
      }}
    >
      <Tabs
        activeKey={activeKey}
        onChange={(key) => {
          setActiveKey(key as MonitorTabKey);
          setPage({ pageNum: 1, pageSize: page.pageSize });
        }}
        tabBarExtraContent={
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() =>
              void loadList(activeKey, page.pageNum, page.pageSize)
            }
          >
            刷新
          </Button>
        }
        items={[
          {
            key: 'ongoing',
            label: '正在通话',
          },
          {
            key: 'completed',
            label: '今日已完成',
          },
        ]}
      />
      {table}
    </Modal>
  );
};

export default LiveMonitorDetailModal;
