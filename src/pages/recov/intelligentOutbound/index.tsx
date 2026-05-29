import {
  MessageOutlined,
  ReloadOutlined,
  RightOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Flex, message, Pagination, Space, theme } from 'antd';
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
  toDebtFeedbackItem,
} from './_shared';
import CommunicationLogModal from './CommunicationLogModal';
import FeedbackAllDrawer from './FeedbackAllDrawer';
import FeedbackFeed from './FeedbackFeed';
import IdentityGrid from './IdentityGrid';
import LiveMonitorCard from './LiveMonitorCard';
import MetricsRow from './MetricsRow';
import {
  type AiCallDashboard,
  getAiCallDashboard,
  getAiCallDebtFeedbackPage,
  getAiCallDebtTimeline,
} from './service';

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
      <Flex vertical gap={12} style={{ width: '100%' }}>
        <MetricsRow metrics={overview.metrics} loading={dashboardLoading} />

        <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <LiveMonitorCard
              stats={overview.liveStats}
              loading={dashboardLoading}
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
