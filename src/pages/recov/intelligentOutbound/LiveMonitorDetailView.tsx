import {
  ArrowLeftOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Empty,
  Modal,
  message,
  Space,
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
import { listOssByIds, type OssItem } from '@/services/ruoyi/oss';
import { formatDuration } from './_shared';
import { AgentWebRtcStatusBar } from './AgentWebRtcStatusBar';
import {
  type AiCallAgentWebRtcConfig,
  type AiCallRecord,
  claimAiCallHandoff,
  getAiCallAgentWebRtcConfig,
  getAiCallRecordPage,
} from './service';
import { useWebRtcAgent } from './useWebRtcAgent';

const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;
const MOCK_HANDOFF_QUERY_KEY = 'mockHandoff';
const MOCK_GATEWAY_CALL_ID = 'mock-gateway-handoff-001';

type MonitorTabKey = 'ongoing' | 'completed';

type LiveMonitorDetailViewProps = {
  onBack: () => void;
  onRecordSemanticClick: (record: AiCallRecord) => void;
};

const statusLabels: Record<string, string> = {
  '1': '通话中',
  '2': '外呼失败',
  '3': '未接听',
  '4': '已完成',
};

const handoffLabels: Record<string, string> = {
  none: '无需接管',
  waiting_agent: '等待人工',
  agent_claimed: '接管中',
  human_active: '已接管',
  expired: '已超时',
  failed: '接管失败',
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

const isMockHandoffEnabled = () => {
  if (typeof window === 'undefined') return false;
  return (
    new URLSearchParams(window.location.search).get(MOCK_HANDOFF_QUERY_KEY) ===
    '1'
  );
};

const buildMockHandoffRecord = (): AiCallRecord => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
  return {
    callRecordId: 'mock-handoff-001',
    debtId: 'mock-debt-001',
    debtNumber: 'MOCK-001',
    debtorName: '模拟业主',
    identityName: '数字员工小林',
    callerName: 'AI外呼机器人',
    status: '1',
    startedAt: formatDateTime(now),
    gatewayCallId: MOCK_GATEWAY_CALL_ID,
    handoffState: 'waiting_agent',
    handoffCanClaim: true,
    handoffLastUtterance: '我想转人工，帮我找一下客服',
    handoffRequestedAt: formatDateTime(now),
    handoffExpiresAt: formatDateTime(expiresAt),
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

const defaultAgentWebRtcConfig: AiCallAgentWebRtcConfig = {
  wsUrl: 'wss://recov.lingchen-ai.com/sip-ws',
  sipUri: 'sip:1001@111.229.146.182',
  password: 'tenlocal1000',
  displayName: '坐席1001',
  agentExtension: '1001',
  viaTransport: 'WS',
  iceServers: [],
};

const normalizeWebRtcWsUrl = (wsUrl: string) => {
  if (/^ws:\/\/111\.229\.146\.182:5066\/?$/i.test(wsUrl)) {
    return defaultAgentWebRtcConfig.wsUrl;
  }
  return wsUrl;
};

const mergeAgentWebRtcConfig = (
  config?: AiCallAgentWebRtcConfig | null,
): AiCallAgentWebRtcConfig => ({
  ...defaultAgentWebRtcConfig,
  ...config,
  wsUrl: normalizeWebRtcWsUrl(
    firstText(config?.wsUrl, defaultAgentWebRtcConfig.wsUrl),
  ),
  sipUri: firstText(config?.sipUri, defaultAgentWebRtcConfig.sipUri),
  password: firstText(config?.password, defaultAgentWebRtcConfig.password),
  displayName: firstText(
    config?.displayName,
    defaultAgentWebRtcConfig.displayName,
  ),
  agentExtension: firstText(
    config?.agentExtension,
    defaultAgentWebRtcConfig.agentExtension,
  ),
  viaTransport: firstText(
    config?.viaTransport,
    defaultAgentWebRtcConfig.viaTransport,
  ),
  iceServers: config?.iceServers || defaultAgentWebRtcConfig.iceServers,
});

const getResponseData = <T,>(response: unknown): T | undefined => {
  if (response === null || response === undefined) return undefined;
  if (typeof response === 'object' && 'data' in response) {
    return (response as { data?: T }).data;
  }
  return response as T;
};

const getResponseMessage = (response: unknown) => {
  const data = getResponseData<{ message?: unknown }>(response);
  return firstText(data?.message, (response as { msg?: unknown })?.msg);
};

const canClaimHandoff = (record: AiCallRecord) =>
  record.handoffState === 'waiting_agent' &&
  record.handoffCanClaim === true &&
  Boolean(firstText(record.gatewayCallId));

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

const loadRecordingUrlMap = async (records: AiCallRecord[]) => {
  const ossIds = Array.from(
    new Set(
      records.map((record) => firstText(record.recordingOssId)).filter(Boolean),
    ),
  );
  if (!ossIds.length) return {};

  const response = await listOssByIds(ossIds.join(','));
  const result: Record<string, string> = {};
  ((response.data || []) as OssItem[]).forEach((oss) => {
    const ossId = firstText(oss.ossId);
    const url = firstText(oss.url);
    if (ossId && url) {
      result[ossId] = url;
    }
  });
  return result;
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

const LiveMonitorDetailView = ({
  onBack,
  onRecordSemanticClick,
}: LiveMonitorDetailViewProps) => {
  const { token } = theme.useToken();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [activeKey, setActiveKey] = useState<MonitorTabKey>('ongoing');
  const [items, setItems] = useState<AiCallRecord[]>([]);
  const [mockItems, setMockItems] = useState<AiCallRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recordingUrls, setRecordingUrls] = useState<Record<string, string>>(
    {},
  );
  const [audioPreview, setAudioPreview] = useState<{
    open: boolean;
    title?: string;
    url?: string;
  }>({ open: false });
  const [page, setPage] = useState({
    pageNum: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [webRtcConfig, setWebRtcConfig] = useState<AiCallAgentWebRtcConfig>(
    defaultAgentWebRtcConfig,
  );
  const [claimingCallId, setClaimingCallId] = useState('');
  const agent = useWebRtcAgent(webRtcConfig);
  const loadSeqRef = useRef(0);
  const mockHandoffEnabled = useMemo(() => isMockHandoffEnabled(), []);

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
        const rows = res.rows || [];
        setItems(rows);
        setTotal(Number(res.total || 0));
        setRecordingUrls({});
        void loadRecordingUrlMap(rows)
          .then((nextRecordingUrls) => {
            if (seq === loadSeqRef.current) {
              setRecordingUrls(nextRecordingUrls);
            }
          })
          .catch(() => {
            if (seq === loadSeqRef.current) {
              setRecordingUrls({});
            }
          });
      } catch {
        if (seq !== loadSeqRef.current) return;
        setItems([]);
        setTotal(0);
        setRecordingUrls({});
      } finally {
        if (seq === loadSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadList(activeKey, page.pageNum, page.pageSize);
  }, [activeKey, loadList, page.pageNum, page.pageSize]);

  useEffect(() => {
    let active = true;
    getAiCallAgentWebRtcConfig()
      .then((res) => {
        const config = getResponseData<AiCallAgentWebRtcConfig>(res);
        if (active) setWebRtcConfig(mergeAgentWebRtcConfig(config));
      })
      .catch(() => {
        if (active) setWebRtcConfig(defaultAgentWebRtcConfig);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeKey !== 'ongoing') return undefined;
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => {
      window.clearInterval(timer);
    };
  }, [activeKey]);

  const handleClaimHandoff = useCallback(
    async (record: AiCallRecord) => {
      const gatewayCallId = firstText(record.gatewayCallId);
      const agentExtension = firstText(
        webRtcConfig?.agentExtension,
        record.handoffAgentExtension,
      );
      if (!gatewayCallId) {
        messageApi.warning('当前通话缺少网关通话 ID，暂不能接管');
        return;
      }
      if (!agentExtension) {
        messageApi.warning('当前账号未绑定坐席分机，暂不能接管');
        return;
      }
      setClaimingCallId(gatewayCallId);
      try {
        if (gatewayCallId === MOCK_GATEWAY_CALL_ID) {
          setMockItems((records) =>
            records.map((item) =>
              firstText(item.gatewayCallId) === gatewayCallId
                ? {
                    ...item,
                    handoffState: 'human_active',
                    handoffCanClaim: false,
                    handoffClaimedBy: agentExtension,
                    handoffAgentExtension: agentExtension,
                  }
                : item,
            ),
          );
          messageApi.success('已模拟接管');
          return;
        }
        const result = await claimAiCallHandoff({
          callRecordId: record.callRecordId,
          gatewayCallId,
          agentExtension,
          timeoutSeconds: 20,
        });
        messageApi.success(
          getResponseMessage(result) || '接管请求已提交，请在顶部接听来电',
        );
        await loadList(activeKey, page.pageNum, page.pageSize);
      } catch {
        messageApi.error('接管失败，请稍后重试');
      } finally {
        setClaimingCallId('');
      }
    },
    [
      activeKey,
      loadList,
      messageApi,
      page.pageNum,
      page.pageSize,
      webRtcConfig?.agentExtension,
    ],
  );

  const handleMockHandoff = useCallback(() => {
    setActiveKey('ongoing');
    setPage((current) => ({ ...current, pageNum: 1 }));
    setMockItems((records) => {
      const next = buildMockHandoffRecord();
      const withoutExisting = records.filter(
        (record) => firstText(record.gatewayCallId) !== MOCK_GATEWAY_CALL_ID,
      );
      return [next, ...withoutExisting];
    });
    messageApi.success('已生成模拟转人工通话');
  }, [messageApi]);

  const tableItems = useMemo(
    () => (activeKey === 'ongoing' ? [...mockItems, ...items] : items),
    [activeKey, items, mockItems],
  );

  const tableTotal = activeKey === 'ongoing' ? total + mockItems.length : total;

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
      {
        key: 'recording',
        dataIndex: 'recordingOssId',
        title: '录音',
        width: 96,
        render: (_, record) => {
          const recordingOssId = firstText(record.recordingOssId);
          const url = recordingOssId ? recordingUrls[recordingOssId] : '';
          const disabled = !url;
          return (
            <Tooltip
              title={
                recordingOssId
                  ? disabled
                    ? '录音文件加载中'
                    : '播放录音'
                  : '暂无录音'
              }
            >
              <Button
                aria-label="播放录音"
                disabled={disabled}
                icon={<PlayCircleOutlined />}
                size="small"
                type="text"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!url) return;
                  setAudioPreview({
                    open: true,
                    title: `${firstText(record.debtorName, '通话')}录音`,
                    url,
                  });
                }}
              />
            </Tooltip>
          );
        },
      },
    ];

    if (activeKey === 'ongoing') {
      baseColumns.push(
        {
          key: 'handoffState',
          dataIndex: 'handoffState',
          title: '转人工状态',
          width: 150,
          render: (_, record) => {
            const state = firstText(record.handoffState, 'none');
            const label = handoffLabels[state] || '未知';
            const color =
              state === 'waiting_agent'
                ? 'warning'
                : state === 'human_active'
                  ? 'success'
                  : state === 'failed' || state === 'expired'
                    ? 'error'
                    : 'default';
            return (
              <div className="flex min-w-0 flex-col gap-1">
                <Tag color={color} style={{ width: 'fit-content' }}>
                  {label}
                </Tag>
                {record.handoffLastUtterance ? (
                  <Tooltip title={record.handoffLastUtterance}>
                    <Text
                      type="secondary"
                      className="block max-w-full truncate"
                    >
                      {record.handoffLastUtterance}
                    </Text>
                  </Tooltip>
                ) : null}
              </div>
            );
          },
        },
        {
          key: 'handoffAction',
          title: '操作',
          fixed: 'right',
          width: 110,
          render: (_, record) => {
            const gatewayCallId = firstText(record.gatewayCallId);
            const enabled = canClaimHandoff(record);
            return (
              <Button
                autoInsertSpace={false}
                disabled={!enabled}
                loading={claimingCallId === gatewayCallId}
                size="small"
                type={enabled ? 'primary' : 'default'}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleClaimHandoff(record);
                }}
              >
                {record.handoffState === 'human_active'
                  ? '已接管'
                  : record.handoffState === 'waiting_agent'
                    ? '接管'
                    : '无需接管'}
              </Button>
            );
          },
        },
      );
    }

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
    claimingCallId,
    handleClaimHandoff,
    nowMs,
    onRecordSemanticClick,
    recordingUrls,
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
      dataSource={tableItems}
      columns={columns}
      tableLayout="fixed"
      scroll={{ x: activeKey === 'completed' ? 1220 : 1360 }}
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
        total: tableTotal,
        showSizeChanger: true,
        showTotal: (value) => `共 ${value} 条`,
        onChange: (pageNum, pageSize) => {
          setPage({ pageNum, pageSize });
        },
      }}
    />
  );

  return (
    <PageContainer breadcrumbRender={false} title={null}>
      {messageContextHolder}
      <div className="flex flex-col gap-3">
        <div className="rounded border border-solid border-gray-200 bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Tooltip title="返回">
              <Button
                aria-label="返回"
                icon={<ArrowLeftOutlined />}
                type="text"
                onClick={onBack}
              />
            </Tooltip>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Space size={8} wrap>
                <Text strong className="text-base">
                  实时外呼明细
                </Text>
                <Tag color="processing">人工接管</Tag>
              </Space>
              <Text type="secondary">正在通话与今日完成记录</Text>
            </div>
          </div>
        </div>

        <AgentWebRtcStatusBar agent={agent} />

        <div className="rounded border border-solid border-gray-200 bg-white px-4 pb-4 pt-2">
          <Tabs
            activeKey={activeKey}
            onChange={(key) => {
              setActiveKey(key as MonitorTabKey);
              setPage({ pageNum: 1, pageSize: page.pageSize });
            }}
            tabBarExtraContent={
              <Space size={8} wrap>
                {mockHandoffEnabled ? (
                  <Button icon={<PlusOutlined />} onClick={handleMockHandoff}>
                    模拟转人工
                  </Button>
                ) : null}
                <Button
                  icon={<ReloadOutlined />}
                  loading={loading}
                  onClick={() =>
                    void loadList(activeKey, page.pageNum, page.pageSize)
                  }
                >
                  刷新
                </Button>
              </Space>
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
          <Modal
            destroyOnHidden
            footer={null}
            open={audioPreview.open}
            title={audioPreview.title || '通话录音'}
            width={520}
            onCancel={() => setAudioPreview({ open: false })}
          >
            {audioPreview.url ? (
              // biome-ignore lint/a11y/useMediaCaption: 通话录音暂无字幕文件，保留浏览器原生音频控件。
              <audio
                autoPlay
                className="w-full"
                controls
                src={audioPreview.url}
              />
            ) : null}
          </Modal>
        </div>
      </div>
    </PageContainer>
  );
};

export default LiveMonitorDetailView;
