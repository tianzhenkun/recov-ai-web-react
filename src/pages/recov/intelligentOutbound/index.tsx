import {
  MessageOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Flex, message, Pagination, Space } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildCommunicationDetail,
  buildOutboundOverview,
  DEFAULT_FEEDBACK_PAGE_SIZE,
  emptyDashboard,
  type FeedbackItem,
  FIXED_DIGITAL_IDENTITIES,
  type OwnerCommunicationDetail,
  PAGE_TITLE,
  toFeedbackItem,
} from './_shared';
import CommunicationLogModal from './CommunicationLogModal';
import FeedbackFeed from './FeedbackFeed';
import IdentityGrid from './IdentityGrid';
import LiveMonitorCard from './LiveMonitorCard';
import MetricsRow from './MetricsRow';
import {
  type AiCallDashboard,
  getAiCallDashboard,
  getAiCallDebtTimeline,
  getAiCallRecordDetail,
  getAiCallRecordPage,
} from './service';

const IntelligentOutboundPage = () => {
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

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logDetail, setLogDetail] = useState<OwnerCommunicationDetail | null>(
    null,
  );
  const [logLoading, setLogLoading] = useState(false);

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
        const res = await getAiCallRecordPage({
          pageNum,
          pageSize,
          analysisStatus: '2',
        });
        setFeedbackItems((res.rows || []).map(toFeedbackItem));
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

  const refreshAll = useCallback(() => {
    void loadDashboard();
    void loadFeedback(feedbackPage.pageNum, feedbackPage.pageSize);
  }, [
    feedbackPage.pageNum,
    feedbackPage.pageSize,
    loadDashboard,
    loadFeedback,
  ]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    void loadFeedback(feedbackPage.pageNum, feedbackPage.pageSize);
  }, [feedbackPage.pageNum, feedbackPage.pageSize, loadFeedback]);

  const handleFeedbackClick = useCallback(
    async (item: FeedbackItem) => {
      if (!item.callRecordId) {
        messageApi.warning('通话记录 ID 为空，无法查看详情');
        return;
      }

      setLogModalOpen(true);
      setLogDetail(null);
      setLogLoading(true);
      try {
        const [detailResult, timelineResult] = await Promise.allSettled([
          getAiCallRecordDetail(item.callRecordId),
          item.debtId
            ? getAiCallDebtTimeline(item.debtId)
            : Promise.resolve(null),
        ]);
        const detail =
          detailResult.status === 'fulfilled' ? detailResult.value.data : null;
        const timeline =
          timelineResult.status === 'fulfilled'
            ? timelineResult.value?.data
            : null;
        setLogDetail(buildCommunicationDetail(timeline, detail));
      } catch {
        messageApi.error('加载沟通记录失败');
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

  return (
    <PageContainer
      breadcrumbRender={false}
      title={PAGE_TITLE}
      extra={
        <Button
          icon={<ReloadOutlined />}
          loading={dashboardLoading || feedbackLoading}
          onClick={refreshAll}
        >
          刷新
        </Button>
      }
    >
      {messageContextHolder}
      <Flex vertical gap={16} style={{ width: '100%' }}>
        <MetricsRow metrics={overview.metrics} loading={dashboardLoading} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <LiveMonitorCard
              stats={overview.liveStats}
              loading={dashboardLoading}
            />

            <ProCard
              title={
                <Space>
                  <TeamOutlined />
                  数字员工身份
                </Space>
              }
              styles={{
                body: {
                  minHeight: 0,
                },
              }}
            >
              <IdentityGrid identities={FIXED_DIGITAL_IDENTITIES} />
            </ProCard>
          </div>

          <ProCard
            className="h-full min-w-0"
            title={
              <Space>
                <MessageOutlined />
                用户反馈与语义分析
              </Space>
            }
            styles={{
              body: {
                display: 'flex',
                height: '100%',
                minHeight: 0,
                flexDirection: 'column',
                gap: 12,
              },
            }}
          >
            <FeedbackFeed
              items={feedbackItems}
              loading={feedbackLoading}
              onItemClick={handleFeedbackClick}
            />
            {feedbackTotal > 0 ? (
              <Pagination
                align="end"
                current={feedbackPage.pageNum}
                pageSize={feedbackPage.pageSize}
                total={feedbackTotal}
                showSizeChanger
                style={{ marginTop: 'auto' }}
                showTotal={(total, range) =>
                  `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`
                }
                onChange={(pageNum, pageSize) => {
                  setFeedbackPage({ pageNum, pageSize });
                }}
              />
            ) : null}
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
