import {
  MessageOutlined,
  PhoneOutlined,
  ReloadOutlined,
  RightOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Button,
  Flex,
  Modal,
  message,
  Pagination,
  Space,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getCurrentAssetPackagePipelineProgress,
  getDebtRecordPage,
  type ImportPipelineStatus,
  type ImportPipelineSubTask,
} from '@/services/ruoyi/datelligence';
import {
  getFlowBatchProgress,
  startFlowBatch,
} from '@/services/ruoyi/flowBatchStart';
import {
  buildCommunicationDetail,
  buildOutboundOverview,
  DEFAULT_FEEDBACK_PAGE_SIZE,
  emptyDashboard,
  type FeedbackItem,
  FIXED_DIGITAL_IDENTITIES,
  type OwnerCommunicationDetail,
  PAGE_TITLE,
  resolveOutboundStartDisabledReason,
  resolveOutboundStartNotice,
  toDebtFeedbackItem,
} from './_shared';
import CommunicationLogModal from './CommunicationLogModal';
import FeedbackAllDrawer from './FeedbackAllDrawer';
import FeedbackFeed from './FeedbackFeed';
import IdentityGrid from './IdentityGrid';
import LiveMonitorCard from './LiveMonitorCard';
import LiveMonitorDetailModal from './LiveMonitorDetailModal';
import MetricsRow from './MetricsRow';
import {
  type AiCallDashboard,
  type AiCallRecord,
  getAiCallDashboard,
  getAiCallDebtFeedbackPage,
  getAiCallDebtTimeline,
} from './service';

const { Text } = Typography;

const FLOW_START_POLLING_INTERVAL = 2000;

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const IntelligentOutboundPage = () => {
  const { token } = theme.useToken();
  const [messageApi, messageContextHolder] = message.useMessage();

  const [dashboard, setDashboard] = useState<AiCallDashboard>(emptyDashboard);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackPage, setFeedbackPage] = useState({
    pageNum: 1,
    pageSize: DEFAULT_FEEDBACK_PAGE_SIZE,
  });
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackDrawerOpen, setFeedbackDrawerOpen] = useState(false);
  const [monitorDetailOpen, setMonitorDetailOpen] = useState(false);

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logDetail, setLogDetail] = useState<OwnerCommunicationDetail | null>(
    null,
  );
  const [logLoading, setLogLoading] = useState(false);
  const [recordTotal, setRecordTotal] = useState(0);
  const [startPrecheckLoading, setStartPrecheckLoading] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<
    ImportPipelineStatus | ''
  >('');
  const [pipelineSubTasks, setPipelineSubTasks] = useState<
    ImportPipelineSubTask[]
  >([]);
  const [outboundStarting, setOutboundStarting] = useState(false);
  const [outboundFlowProcessing, setOutboundFlowProcessing] = useState(false);
  const outboundFlowPollingTimerRef = useRef<number | null>(null);
  const outboundFlowProgressSeqRef = useRef(0);

  const overview = useMemo(() => buildOutboundOverview(dashboard), [dashboard]);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const res = await getAiCallDashboard();
      setDashboard(res.data || emptyDashboard);
    } catch {
      setDashboard(emptyDashboard);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadFeedback = useCallback(
    async (pageNum: number, pageSize: number) => {
      setFeedbackLoading(true);
      try {
        const res = await getAiCallDebtFeedbackPage({
          pageNum,
          pageSize,
          analysisStatus: '2',
        });
        setFeedbackItems((res.rows || []).map(toDebtFeedbackItem));
        setFeedbackTotal(Number(res.total || 0));
      } catch {
        setFeedbackItems([]);
        setFeedbackTotal(0);
      } finally {
        setFeedbackLoading(false);
      }
    },
    [],
  );

  const loadOutboundStartPrecheck = useCallback(async () => {
    setStartPrecheckLoading(true);
    try {
      const [debtRes, pipelineRes] = await Promise.all([
        getDebtRecordPage({
          pageNum: 1,
          pageSize: 1,
        }),
        getCurrentAssetPackagePipelineProgress().catch(() => ({ data: null })),
      ]);

      setRecordTotal(Number(debtRes.data?.page?.total || 0));
      const pipeline = pipelineRes.data;
      setPipelineStatus(pipeline?.status || '');
      setPipelineSubTasks(pipeline?.subTasks || []);
    } catch {
      setRecordTotal(0);
      setPipelineStatus('');
      setPipelineSubTasks([]);
    } finally {
      setStartPrecheckLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    void loadDashboard();
    void loadFeedback(feedbackPage.pageNum, feedbackPage.pageSize);
    void loadOutboundStartPrecheck();
  }, [
    feedbackPage.pageNum,
    feedbackPage.pageSize,
    loadDashboard,
    loadFeedback,
    loadOutboundStartPrecheck,
  ]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    void loadFeedback(feedbackPage.pageNum, feedbackPage.pageSize);
  }, [feedbackPage.pageNum, feedbackPage.pageSize, loadFeedback]);

  useEffect(() => {
    void loadOutboundStartPrecheck();
  }, [loadOutboundStartPrecheck]);

  const stopOutboundFlowPolling = useCallback(() => {
    outboundFlowProgressSeqRef.current += 1;
    if (outboundFlowPollingTimerRef.current) {
      window.clearInterval(outboundFlowPollingTimerRef.current);
      outboundFlowPollingTimerRef.current = null;
    }
  }, []);

  const pollOutboundFlowProgress = useCallback(
    async (batchId: string | number, options?: { silent?: boolean }) => {
      outboundFlowProgressSeqRef.current += 1;
      const seq = outboundFlowProgressSeqRef.current;
      try {
        const res = await getFlowBatchProgress(batchId);
        if (seq !== outboundFlowProgressSeqRef.current) return;
        const data = res.data;
        if (!data) return;

        if (toNumber(data.pendingCount) > 0) {
          return;
        }

        stopOutboundFlowPolling();
        setOutboundFlowProcessing(false);
        refreshAll();

        const failedCount = toNumber(data.failedCount);
        if (failedCount > 0) {
          messageApi.warning(
            `催收流程发起完成，${failedCount} 条失败，可到流程管理查看`,
          );
          return;
        }

        if (!options?.silent) {
          messageApi.success('催收流程发起完成');
        }
      } catch {
        if (seq !== outboundFlowProgressSeqRef.current) return;
        stopOutboundFlowPolling();
        setOutboundFlowProcessing(false);
        refreshAll();
        messageApi.error('催收流程进度查询失败，请稍后刷新页面');
      }
    },
    [messageApi, refreshAll, stopOutboundFlowPolling],
  );

  const startOutboundFlowPolling = useCallback(
    (batchId: string | number) => {
      const normalizedBatchId = String(batchId || '');
      if (!normalizedBatchId) return;
      stopOutboundFlowPolling();
      setOutboundFlowProcessing(true);
      void pollOutboundFlowProgress(normalizedBatchId, { silent: true });
      outboundFlowPollingTimerRef.current = window.setInterval(() => {
        void pollOutboundFlowProgress(normalizedBatchId, { silent: true });
      }, FLOW_START_POLLING_INTERVAL);
    },
    [pollOutboundFlowProgress, stopOutboundFlowPolling],
  );

  useEffect(() => () => stopOutboundFlowPolling(), [stopOutboundFlowPolling]);

  const isImportWorkflowProcessing =
    startPrecheckLoading ||
    pipelineStatus === 'importing' ||
    pipelineStatus === 'processing' ||
    pipelineSubTasks.some((task) => task.status === 'processing');
  const outboundDisabledReason = resolveOutboundStartDisabledReason({
    outboundStarting,
    outboundFlowProcessing,
    recordTotal,
    isImportWorkflowProcessing,
    pipelineStatus,
  });
  const outboundStartNotice = resolveOutboundStartNotice({
    pipelineStatus,
  });
  const canStartOutbound = !outboundDisabledReason;

  const handleFeedbackClick = useCallback(
    async (item: FeedbackItem) => {
      if (!item.debtId) {
        messageApi.warning('债务 ID 为空，无法查看详情');
        return;
      }

      setLogModalOpen(true);
      setLogDetail(null);
      setLogLoading(true);
      try {
        const res = await getAiCallDebtTimeline(item.debtId);
        setLogDetail(
          buildCommunicationDetail(res.data || null, null, item.summary),
        );
      } catch {
        messageApi.error('加载沟通记录失败');
      } finally {
        setLogLoading(false);
      }
    },
    [messageApi],
  );

  const handleMonitorRecordSemanticClick = useCallback(
    async (record: AiCallRecord) => {
      if (!record.debtId) {
        messageApi.warning('债务 ID 为空，无法查看语义分析');
        return;
      }

      setLogModalOpen(true);
      setLogDetail(null);
      setLogLoading(true);
      try {
        const res = await getAiCallDebtTimeline(record.debtId);
        setLogDetail(
          buildCommunicationDetail(res.data || null, null, record.summary),
        );
      } catch {
        messageApi.error('加载语义分析记录失败');
      } finally {
        setLogLoading(false);
      }
    },
    [messageApi],
  );

  const handleCloseLogModal = () => {
    setLogModalOpen(false);
    setLogDetail(null);
  };

  const handleStartAllOutbound = useCallback(() => {
    if (!canStartOutbound) {
      messageApi.warning(outboundDisabledReason);
      return;
    }

    Modal.confirm({
      title: '确认启动 AI 外呼',
      content: (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Text strong>启动范围</Text>
            <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <Text type="secondary">所属城市</Text>
              <Text>全部</Text>
              <Text type="secondary">所属项目</Text>
              <Text>全部</Text>
            </div>
          </div>
          <Text type="secondary">
            将按当前筛选范围，对未开始的债务启动 AI
            外呼。已启动或正在处理的债务会自动跳过。
          </Text>
          {outboundStartNotice ? (
            <Text type="warning">{outboundStartNotice}</Text>
          ) : null}
        </div>
      ),
      okText: '确认启动',
      cancelText: '取消',
      onOk: async () => {
        setOutboundStarting(true);
        try {
          const res = await startFlowBatch({});
          const result = res.data;
          if (!result) return;

          if (toNumber(result.matchedCount) === 0) {
            messageApi.warning('当前权限范围内无匹配债务');
            refreshAll();
            return;
          }

          if (toNumber(result.acceptedCount) === 0) {
            messageApi.info('当前权限范围内没有可发起的债务');
            refreshAll();
            return;
          }

          messageApi.success('催收流程发起任务已受理');
          const batchId = String(result.batchId || '');
          if (batchId) {
            startOutboundFlowPolling(batchId);
          } else {
            refreshAll();
          }
        } catch {
          messageApi.error('催收流程发起失败，请稍后重试');
        } finally {
          setOutboundStarting(false);
        }
      },
    });
  }, [
    canStartOutbound,
    messageApi,
    outboundDisabledReason,
    outboundStartNotice,
    refreshAll,
    startOutboundFlowPolling,
  ]);

  return (
    <PageContainer
      breadcrumbRender={false}
      title={PAGE_TITLE}
      extra={
        <Space wrap size={8}>
          <Tooltip title={outboundDisabledReason || undefined}>
            <span style={{ display: 'inline-block' }}>
              <Button
                disabled={!canStartOutbound}
                icon={<PhoneOutlined />}
                loading={
                  startPrecheckLoading ||
                  outboundStarting ||
                  outboundFlowProcessing
                }
                onClick={handleStartAllOutbound}
              >
                启动 AI 外呼
              </Button>
            </span>
          </Tooltip>
          <Button
            icon={<ReloadOutlined />}
            loading={
              dashboardLoading || feedbackLoading || startPrecheckLoading
            }
            onClick={refreshAll}
          >
            刷新
          </Button>
        </Space>
      }
    >
      {messageContextHolder}
      <Flex vertical gap={12} style={{ width: '100%' }}>
        <MetricsRow metrics={overview.metrics} loading={dashboardLoading} />

        <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <LiveMonitorCard
              stats={overview.liveStats}
              loading={dashboardLoading}
              onDetailClick={() => setMonitorDetailOpen(true)}
            />

            <ProCard
              className="flex-1"
              title={
                <Space>
                  <TeamOutlined />
                  数字员工身份
                </Space>
              }
              styles={{
                body: {
                  height: '100%',
                  minHeight: 0,
                  padding: 16,
                },
              }}
            >
              <IdentityGrid identities={FIXED_DIGITAL_IDENTITIES} fillHeight />
            </ProCard>
          </div>

          <ProCard
            className="min-w-0"
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
            title={
              <Space>
                <MessageOutlined />
                用户反馈与语义分析
              </Space>
            }
            extra={
              <Button
                icon={<RightOutlined />}
                iconPlacement="end"
                size="small"
                type="text"
                onClick={() => setFeedbackDrawerOpen(true)}
                style={{
                  color: token.colorPrimary,
                  fontSize: 13,
                  fontWeight: 500,
                  height: 28,
                  paddingInline: '8px 0',
                }}
              >
                查看所有
              </Button>
            }
            styles={{
              body: {
                display: 'flex',
                flex: 1,
                minHeight: 0,
                flexDirection: 'column',
                gap: 12,
                padding: 16,
              },
            }}
          >
            <FeedbackFeed
              items={feedbackItems}
              loading={feedbackLoading}
              pageSize={feedbackPage.pageSize}
              onItemClick={handleFeedbackClick}
            />
            {feedbackTotal > 0 ? (
              <Pagination
                align="end"
                current={feedbackPage.pageNum}
                pageSize={feedbackPage.pageSize}
                size="small"
                total={feedbackTotal}
                showSizeChanger={false}
                style={{ flexShrink: 0 }}
                showTotal={(total) => `共 ${total} 条`}
                onChange={(pageNum, pageSize) => {
                  setFeedbackPage({ pageNum, pageSize });
                }}
              />
            ) : null}
          </ProCard>
        </div>
      </Flex>

      <FeedbackAllDrawer
        open={feedbackDrawerOpen}
        onClose={() => setFeedbackDrawerOpen(false)}
        onItemClick={handleFeedbackClick}
      />

      <LiveMonitorDetailModal
        open={monitorDetailOpen}
        onClose={() => setMonitorDetailOpen(false)}
        onRecordSemanticClick={handleMonitorRecordSemanticClick}
      />

      <CommunicationLogModal
        open={logModalOpen}
        loading={logLoading}
        detail={logDetail}
        onClose={handleCloseLogModal}
      />
    </PageContainer>
  );
};

export default IntelligentOutboundPage;
