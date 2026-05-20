import {
  BarChartOutlined,
  MessageOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Flex, message, Space, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
  type FeedbackItem,
  MOCK_FEEDBACK,
  MOCK_IDENTITIES,
  MOCK_LIVE_STATS,
  MOCK_METRICS,
  MOCK_REJECT_REASONS,
  type OutboundOverview,
  type OwnerCommunicationDetail,
  PAGE_TITLE,
  type RejectReasonStat,
} from './_shared';
import CommunicationLogModal from './CommunicationLogModal';
import FeedbackFeed from './FeedbackFeed';
import IdentityGrid from './IdentityGrid';
import LiveMonitorCard from './LiveMonitorCard';
import MetricsRow from './MetricsRow';
import RejectReasonChart from './RejectReasonChart';
import {
  fetchCommunicationLogs,
  fetchOutboundOverview,
  fetchRejectReasonStats,
} from './service';

const { Text } = Typography;

const defaultOverview: OutboundOverview = {
  metrics: MOCK_METRICS,
  liveStats: MOCK_LIVE_STATS,
  identities: MOCK_IDENTITIES,
  feedback: MOCK_FEEDBACK,
};

const IntelligentOutboundPage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();

  const [overview, setOverview] = useState<OutboundOverview>(defaultOverview);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [rejectReasons, setRejectReasons] =
    useState<RejectReasonStat[]>(MOCK_REJECT_REASONS);
  const [rejectLoading, setRejectLoading] = useState(false);

  const [isCalling, setIsCalling] = useState(false);

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logDetail, setLogDetail] = useState<OwnerCommunicationDetail | null>(
    null,
  );
  const [logLoading, setLogLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const data = await fetchOutboundOverview();
      setOverview(data);
    } catch {
      setOverview(defaultOverview);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadRejectReasons = useCallback(async () => {
    setRejectLoading(true);
    try {
      const data = await fetchRejectReasonStats();
      setRejectReasons(data);
    } catch {
      setRejectReasons(MOCK_REJECT_REASONS);
    } finally {
      setRejectLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    void loadRejectReasons();
  }, [loadOverview, loadRejectReasons]);

  const handleToggleCalling = () => {
    const next = !isCalling;
    setIsCalling(next);
    if (next) {
      messageApi.success('AI 外呼已启动，数字员工开始按策略进行外呼。');
    } else {
      messageApi.info('AI 外呼已暂停，将不再发起新一轮通话。');
    }
  };

  const handleFeedbackClick = useCallback(async (item: FeedbackItem) => {
    setLogModalOpen(true);
    setLogDetail(null);
    setLogLoading(true);
    try {
      const detail = await fetchCommunicationLogs(item.ownerName);
      setLogDetail(detail);
    } finally {
      setLogLoading(false);
    }
  }, []);

  const handleCloseLogModal = () => {
    setLogModalOpen(false);
    setLogDetail(null);
  };

  return (
    <PageContainer
      breadcrumbRender={false}
      title={PAGE_TITLE}
      extra={
        <Button
          type="primary"
          size="large"
          icon={isCalling ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={handleToggleCalling}
          danger={isCalling}
        >
          {isCalling ? '暂停 AI 外呼' : '启动 AI 外呼'}
        </Button>
      }
    >
      {messageContextHolder}
      <Flex vertical gap={16} style={{ width: '100%' }}>
        <MetricsRow metrics={overview.metrics} loading={overviewLoading} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
          <ProCard
            className="flex h-full min-h-0 flex-col lg:col-span-1"
            title={
              <Space>
                <MessageOutlined />
                用户反馈与语义分析
              </Space>
            }
            style={{ height: '100%' }}
            styles={{
              body: {
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                paddingRight: 4,
              },
            }}
          >
            <FeedbackFeed
              items={overview.feedback}
              loading={overviewLoading}
              onItemClick={handleFeedbackClick}
            />
          </ProCard>

          <div className="flex h-full min-h-0 flex-col gap-3 lg:col-span-2">
            <div className="flex min-h-[200px] flex-[2] flex-col">
              <LiveMonitorCard
                stats={overview.liveStats}
                loading={overviewLoading}
                fillHeight
              />
            </div>
            <ProCard
              className="flex min-h-[280px] flex-[3] flex-col"
              style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
              title={
                <Space>
                  <TeamOutlined />
                  数字员工身份
                </Space>
              }
              styles={{
                body: {
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                },
              }}
            >
              <IdentityGrid
                identities={overview.identities}
                loading={overviewLoading}
                fillHeight
              />
            </ProCard>
          </div>

          <ProCard
            className="lg:col-span-3"
            title={
              <Space>
                <BarChartOutlined />
                拒缴原因分布
              </Space>
            }
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                语义引擎数据源
              </Text>
            }
          >
            <RejectReasonChart data={rejectReasons} loading={rejectLoading} />
          </ProCard>
        </div>
      </Flex>

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
