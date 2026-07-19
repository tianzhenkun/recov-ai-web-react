import {
  DownloadOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  ReloadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  StarOutlined,
  StopOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import {
  Button,
  Empty,
  Input,
  Modal,
  message,
  Space,
  Tag,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import {
  RecovListPage,
  RecovListStack,
} from '@/pages/recov/components/RecovListLayout';
import type {
  LawyerCourtTab,
  MatchedLawyerRowVO,
  UnmatchedCaseRowVO,
} from '@/services/ruoyi/lawyer-court';
import { DEFAULT_PAGE_SIZE, formatDisplayMoney, PAGE_TITLE } from './_shared';
import OverviewCards from './components/OverviewCards';
import { fetchLawyerCourtReviewPage, MOCK_OVERVIEW } from './service';
import './index.css';

const { Text } = Typography;

const strategyItems = [
  {
    key: 'cost',
    icon: <SafetyCertificateOutlined />,
    label: '代开庭费用最低',
    color: '#4f46e5',
  },
  {
    key: 'region',
    icon: <EnvironmentOutlined />,
    label: '地域匹配',
    color: '#3b82f6',
  },
  {
    key: 'multi',
    icon: <StarOutlined />,
    label: '多维度匹配',
    color: '#f59e0b',
  },
];

const renderCaseMeta = (
  label: string,
  value: React.ReactNode,
  className?: string,
) => (
  <span className="lawyer-court-case-meta">
    <Text strong>{label}：</Text>
    <span className={className}>{value}</span>
  </span>
);

const getPageCount = (total: number) =>
  Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));

const renderFooterRange = (pageNum: number, total: number) => {
  if (total <= 0) return '当前显示0-0条';

  const start = (pageNum - 1) * DEFAULT_PAGE_SIZE + 1;
  const end = Math.min(pageNum * DEFAULT_PAGE_SIZE, total);
  return `当前显示${start}-${end}条`;
};

type MatchedCaseRowProps = {
  row: MatchedLawyerRowVO;
};

const MatchedCaseRow = ({ row }: MatchedCaseRowProps) => (
  <div className="lawyer-court-case-row">
    <div className="lawyer-court-avatar lawyer-court-avatar-matched">
      {row.lawyerName.slice(0, 1)}
    </div>
    <div className="lawyer-court-case-body">
      <div className="lawyer-court-case-line">
        {renderCaseMeta('匹配资产', row.assetNo)}
        {renderCaseMeta('匹配城市', row.city)}
        {renderCaseMeta('匹配项目', row.project)}
      </div>
      <div className="lawyer-court-case-line">
        {renderCaseMeta('匹配案件案号', row.caseNo)}
        {renderCaseMeta('案涉业主', row.ownerName)}
        {renderCaseMeta(
          '涉案金额',
          formatDisplayMoney(row.amount),
          'lawyer-court-amount-blue',
        )}
      </div>
      <div className="lawyer-court-lawyer-line">
        <Text strong>{row.lawyerName}</Text>
        <Tag color="gold">{row.rating} 评分</Tag>
        <Text className="lawyer-court-firm">{row.firm}</Text>
      </div>
    </div>
    <div className="lawyer-court-row-status">
      <Tag color="success">已匹配</Tag>
    </div>
  </div>
);

type UnmatchedCaseRowProps = {
  row: UnmatchedCaseRowVO;
  onWithdraw: (row: UnmatchedCaseRowVO) => void;
};

const UnmatchedCaseRow = ({ row, onWithdraw }: UnmatchedCaseRowProps) => (
  <div className="lawyer-court-case-row">
    <div className="lawyer-court-avatar lawyer-court-avatar-unmatched">
      <InfoCircleOutlined />
    </div>
    <div className="lawyer-court-case-body">
      <div className="lawyer-court-case-line">
        {renderCaseMeta('匹配资产', row.assetNo)}
        {renderCaseMeta('匹配城市', row.city)}
        {renderCaseMeta('匹配项目', row.project)}
      </div>
      <div className="lawyer-court-case-line">
        {renderCaseMeta('匹配案件案号', row.caseNo)}
        {renderCaseMeta('案涉业主', row.ownerName)}
        {renderCaseMeta(
          '涉案金额',
          formatDisplayMoney(row.amount),
          'lawyer-court-amount-red',
        )}
        <Tag color="error">未匹配</Tag>
      </div>
      <div className="lawyer-court-unmatched-reason">
        未匹配原因：{row.unmatchReason}
      </div>
    </div>
    <Button
      type="primary"
      size="small"
      icon={<StopOutlined />}
      className="lawyer-court-row-action-button"
      onClick={() => onWithdraw(row)}
    >
      一键撤诉
    </Button>
  </div>
);

const LawyerCourtPage = () => {
  const [activeTab, setActiveTab] = useState<LawyerCourtTab>('matched');
  const [pageByTab, setPageByTab] = useState<Record<LawyerCourtTab, number>>({
    matched: 1,
    unmatched: 1,
  });
  const [jumpPage, setJumpPage] = useState('');
  const [matchedRows, setMatchedRows] = useState<MatchedLawyerRowVO[]>([]);
  const [unmatchedRows, setUnmatchedRows] = useState<UnmatchedCaseRowVO[]>([]);
  const [totalByTab, setTotalByTab] = useState<Record<LawyerCourtTab, number>>({
    matched: 0,
    unmatched: 0,
  });
  const [listLoading, setListLoading] = useState(false);

  const activeRows = activeTab === 'matched' ? matchedRows : unmatchedRows;
  const activeTotal = totalByTab[activeTab];
  const activePageCount = getPageCount(activeTotal);
  const activePage = pageByTab[activeTab];
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  useEffect(() => {
    let ignore = false;
    setListLoading(true);

    fetchLawyerCourtReviewPage({
      tab: activeTab,
      pageNum: activePage,
      pageSize: DEFAULT_PAGE_SIZE,
    })
      .then((result) => {
        if (ignore) return;
        if (activeTab === 'matched') {
          setMatchedRows(result.rows as MatchedLawyerRowVO[]);
        } else {
          setUnmatchedRows(result.rows as UnmatchedCaseRowVO[]);
        }
        setTotalByTab((prev) => ({
          ...prev,
          [activeTab]: result.total,
        }));
      })
      .catch(() => {
        if (ignore) return;
        if (activeTab === 'matched') {
          setMatchedRows([]);
        } else {
          setUnmatchedRows([]);
        }
        setTotalByTab((prev) => ({
          ...prev,
          [activeTab]: 0,
        }));
        messageApi.error('律师列表加载失败');
      })
      .finally(() => {
        if (!ignore) {
          setListLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activePage, activeTab, messageApi]);

  const handleAutoMatch = useCallback(() => {
    modalApi.confirm({
      title: '确认发起一键匹配律师？',
      content: '当前阶段仅模拟创建匹配任务，不会调用真实匹配接口。',
      okText: '确认发起',
      cancelText: '取消',
      onOk: () => {
        messageApi.success('匹配任务已模拟发起');
      },
    });
  }, [messageApi, modalApi]);

  const handleExport = useCallback(() => {
    messageApi.info('导出功能待接入');
  }, [messageApi]);

  const handleWithdraw = useCallback(
    (row: UnmatchedCaseRowVO) => {
      modalApi.confirm({
        title: '确认撤诉该案件？',
        content: `案件 ${row.caseNo} 当前仅模拟发起撤诉任务，不会调用真实撤诉接口。`,
        okText: '确认撤诉',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: () => {
          messageApi.success('撤诉任务已模拟发起');
        },
      });
    },
    [messageApi, modalApi],
  );

  const handleTabChange = useCallback((tab: LawyerCourtTab) => {
    setActiveTab(tab);
    setJumpPage('');
  }, []);

  const updatePage = useCallback(
    (pageNum: number) => {
      const nextPage = Math.min(Math.max(pageNum, 1), activePageCount);
      setPageByTab((prev) => ({ ...prev, [activeTab]: nextPage }));
      setJumpPage('');
    },
    [activePageCount, activeTab],
  );

  const handleJumpPage = useCallback(() => {
    const nextPage = Number(jumpPage);
    if (!Number.isInteger(nextPage) || nextPage < 1) {
      messageApi.warning('请输入有效页码');
      return;
    }
    updatePage(nextPage);
  }, [jumpPage, messageApi, updatePage]);

  return (
    <RecovListPage title={PAGE_TITLE}>
      <RecovListStack className="lawyer-court-page">
        {messageContextHolder}
        {modalContextHolder}
        <OverviewCards overview={MOCK_OVERVIEW} />

        <section className="lawyer-court-main-card">
          <div className="lawyer-court-toolbar">
            <Button
              type="primary"
              size="large"
              icon={<ReloadOutlined />}
              className="lawyer-court-match-button"
              onClick={handleAutoMatch}
            >
              一键匹配律师
            </Button>

            <div className="lawyer-court-strategy">
              <span className="lawyer-court-strategy-title">
                <span className="lawyer-court-strategy-icon">
                  <ToolOutlined />
                </span>
                智能匹配策略
              </span>
              <Space size={20} wrap>
                {strategyItems.map((item) => (
                  <span key={item.key} className="lawyer-court-strategy-item">
                    {React.cloneElement(item.icon, {
                      style: { color: item.color },
                    })}
                    {item.label}
                  </span>
                ))}
              </Space>
            </div>
          </div>

          <div className="lawyer-court-list-header">
            <div className="lawyer-court-tabs" role="tablist">
              <button
                type="button"
                className={`lawyer-court-tab${
                  activeTab === 'matched' ? ' active' : ''
                }`}
                onClick={() => handleTabChange('matched')}
              >
                已匹配律师
              </button>
              <button
                type="button"
                className={`lawyer-court-tab${
                  activeTab === 'unmatched' ? ' active' : ''
                }`}
                onClick={() => handleTabChange('unmatched')}
              >
                未匹配律师
              </button>
            </div>

            {activeTab === 'unmatched' ? (
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出未匹配案件
              </Button>
            ) : null}
          </div>

          <div className="lawyer-court-list">
            {listLoading ? (
              <div className="lawyer-court-list-loading">律师列表加载中...</div>
            ) : activeRows.length > 0 ? (
              activeTab === 'matched' ? (
                (activeRows as MatchedLawyerRowVO[]).map((row) => (
                  <MatchedCaseRow key={row.id} row={row} />
                ))
              ) : (
                (activeRows as UnmatchedCaseRowVO[]).map((row) => (
                  <UnmatchedCaseRow
                    key={row.id}
                    row={row}
                    onWithdraw={handleWithdraw}
                  />
                ))
              )
            ) : (
              <Empty
                className="lawyer-court-list-empty"
                description="暂无数据"
              />
            )}
          </div>

          <div className="lawyer-court-pagination">
            <Space className="lawyer-court-pagination-left" size={32}>
              <Text type="secondary">每页显示{DEFAULT_PAGE_SIZE}条</Text>
              <Text type="secondary">
                {renderFooterRange(activePage, activeTotal)}
              </Text>
            </Space>
            <Space className="lawyer-court-pagination-right" size={16}>
              <Text type="secondary">共{activePageCount}页</Text>
              <Text type="secondary">跳转至第</Text>
              <Input
                aria-label="跳转页码"
                size="small"
                className="lawyer-court-page-input"
                value={jumpPage}
                onChange={(event) =>
                  setJumpPage(event.target.value.replace(/\D/g, ''))
                }
                onPressEnter={handleJumpPage}
              />
              <Text type="secondary">页</Text>
              <Button aria-label="跳转" size="small" onClick={handleJumpPage}>
                跳转
              </Button>
              <Button
                aria-label="上一页"
                size="small"
                disabled={activePage <= 1}
                onClick={() => updatePage(activePage - 1)}
              >
                <LeftOutlined />
                上一页
              </Button>
              <Button
                aria-label="下一页"
                size="small"
                disabled={activePage >= activePageCount}
                onClick={() => updatePage(activePage + 1)}
              >
                下一页
                <RightOutlined />
              </Button>
            </Space>
          </div>
        </section>
      </RecovListStack>
    </RecovListPage>
  );
};

export default LawyerCourtPage;
