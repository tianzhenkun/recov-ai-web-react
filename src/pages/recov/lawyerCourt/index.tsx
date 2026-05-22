import { PageContainer } from '@ant-design/pro-components';
import { App } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import type {
  LawyerCourtOverviewVO,
  LawyerCourtTab,
  MatchedLawyerRowVO,
  UnmatchedCaseRowVO,
} from '@/services/ruoyi/lawyer-court';
import { DEFAULT_PAGE_SIZE, PAGE_TITLE } from './_shared';
import LawyerDetailDrawer from './components/LawyerDetailDrawer';
import MatchListSection from './components/MatchListSection';
import MatchToolbar from './components/MatchToolbar';
import OverviewCards from './components/OverviewCards';
import {
  blacklistMatchedLawyer,
  exportUnmatchedCases,
  fetchLawyerCourtOverview,
  fetchLawyerCourtPage,
  getCityOptions,
  getProjectOptions,
  manualMatchCase,
  replaceMatchedLawyer,
  runAutoMatch,
  withdrawUnmatchedCase,
} from './service';

const defaultOverview: LawyerCourtOverviewVO = {
  collaborationCaseCount: 0,
  coveredCityCount: 0,
  matchedCaseCount: 0,
  unmatchedCaseCount: 0,
  totalCaseAmount: '0',
  avgCaseAmount: '0',
};

const LawyerCourtPage = () => {
  const { message } = App.useApp();

  const [overview, setOverview] =
    useState<LawyerCourtOverviewVO>(defaultOverview);
  const [tab, setTab] = useState<LawyerCourtTab>('matched');
  const [matchedRows, setMatchedRows] = useState<MatchedLawyerRowVO[]>([]);
  const [unmatchedRows, setUnmatchedRows] = useState<UnmatchedCaseRowVO[]>([]);
  const [total, setTotal] = useState(0);

  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [cityFilter, setCityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const [overviewLoading, setOverviewLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [matching, setMatching] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<MatchedLawyerRowVO | null>(null);

  const cityOptions = getCityOptions();
  const projectOptions = getProjectOptions();

  const refreshOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      setOverview(await fetchLawyerCourtOverview());
    } catch {
      setOverview(defaultOverview);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const refreshList = useCallback(
    async (
      nextTab: LawyerCourtTab,
      nextPageNum: number,
      nextPageSize: number,
      nextCity: string,
      nextProject: string,
    ) => {
      setListLoading(true);
      try {
        const page = await fetchLawyerCourtPage({
          tab: nextTab,
          pageNum: nextPageNum,
          pageSize: nextPageSize,
          city: nextCity || undefined,
          project: nextProject || undefined,
        });
        if (nextTab === 'matched') {
          setMatchedRows(page.rows as MatchedLawyerRowVO[]);
        } else {
          setUnmatchedRows(page.rows as UnmatchedCaseRowVO[]);
        }
        setTotal(page.total);
      } catch {
        if (nextTab === 'matched') {
          setMatchedRows([]);
        } else {
          setUnmatchedRows([]);
        }
        setTotal(0);
      } finally {
        setListLoading(false);
      }
    },
    [],
  );

  const refreshAll = useCallback(
    async (
      nextTab = tab,
      nextPageNum = pageNum,
      nextPageSize = pageSize,
      nextCity = cityFilter,
      nextProject = projectFilter,
    ) => {
      await Promise.all([
        refreshOverview(),
        refreshList(nextTab, nextPageNum, nextPageSize, nextCity, nextProject),
      ]);
    },
    [
      tab,
      pageNum,
      pageSize,
      cityFilter,
      projectFilter,
      refreshOverview,
      refreshList,
    ],
  );

  useEffect(() => {
    void (async () => {
      await refreshAll('matched', 1, DEFAULT_PAGE_SIZE, '', '');
    })();
  }, []);

  const handleTabChange = async (nextTab: LawyerCourtTab) => {
    setTab(nextTab);
    setPageNum(1);
    await refreshList(nextTab, 1, pageSize, cityFilter, projectFilter);
  };

  const handleCityFilterChange = async (city: string) => {
    setCityFilter(city);
    setPageNum(1);
    await refreshList(tab, 1, pageSize, city, projectFilter);
  };

  const handleProjectFilterChange = async (project: string) => {
    setProjectFilter(project);
    setPageNum(1);
    await refreshList(tab, 1, pageSize, cityFilter, project);
  };

  const handlePageChange = async (nextPage: number, nextSize: number) => {
    setPageNum(nextPage);
    setPageSize(nextSize);
    await refreshList(tab, nextPage, nextSize, cityFilter, projectFilter);
  };

  const handleAutoMatch = async () => {
    setMatching(true);
    try {
      await runAutoMatch();
      message.success(
        'AI 智律引擎已完成自动匹配，已为您筛选合适的代开庭律师。',
      );
      setPageNum(1);
      await refreshAll(tab, 1, pageSize, cityFilter, projectFilter);
    } catch {
      message.error('自动匹配失败，请稍后重试');
    } finally {
      setMatching(false);
    }
  };

  const handleViewLawyer = (row: MatchedLawyerRowVO) => {
    setDetailRow(row);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setDetailRow(null);
  };

  const handleReplaceLawyer = async (row: MatchedLawyerRowVO) => {
    try {
      await replaceMatchedLawyer(row.id);
      message.success(`案件 ${row.caseNo} 已重新匹配律师`);
      await refreshAll();
    } catch {
      message.error('重新匹配失败，请稍后重试');
    }
  };

  const handleBlacklistLawyer = async (row: MatchedLawyerRowVO) => {
    try {
      await blacklistMatchedLawyer(row.id);
      message.success(`律师「${row.lawyerName}」已加入黑名单`);
      await refreshAll();
    } catch {
      message.error('拉黑失败，请稍后重试');
    }
  };

  const handleManualMatch = async (row: UnmatchedCaseRowVO) => {
    try {
      await manualMatchCase(row.id);
      message.success(`案件 ${row.caseNo} 已手动匹配律师`);
      await refreshAll();
    } catch {
      message.error('手动匹配失败，请稍后重试');
    }
  };

  const handleWithdrawCase = async (row: UnmatchedCaseRowVO) => {
    try {
      await withdrawUnmatchedCase(row.id);
      message.success(`案件 ${row.caseNo} 撤诉流程已提交`);
      await refreshAll();
    } catch {
      message.error('撤诉失败，请稍后重试');
    }
  };

  const handleExportUnmatched = () => {
    if (unmatchedRows.length === 0) {
      message.warning('当前页暂无可导出的未匹配案件');
      return;
    }
    exportUnmatchedCases(unmatchedRows);
    message.success('未匹配案件导出已开始下载');
  };

  return (
    <PageContainer title={PAGE_TITLE}>
      <div className="flex flex-col gap-4">
        <OverviewCards overview={overview} loading={overviewLoading} />

        <MatchToolbar matching={matching} onAutoMatch={handleAutoMatch} />

        <MatchListSection
          tab={tab}
          matchedRows={matchedRows}
          unmatchedRows={unmatchedRows}
          total={total}
          pageNum={pageNum}
          pageSize={pageSize}
          loading={listLoading || overviewLoading}
          cityFilter={cityFilter}
          projectFilter={projectFilter}
          cityOptions={cityOptions}
          projectOptions={projectOptions}
          onTabChange={handleTabChange}
          onCityFilterChange={handleCityFilterChange}
          onProjectFilterChange={handleProjectFilterChange}
          onPageChange={handlePageChange}
          onViewLawyer={handleViewLawyer}
          onReplaceLawyer={handleReplaceLawyer}
          onBlacklistLawyer={handleBlacklistLawyer}
          onManualMatch={handleManualMatch}
          onWithdrawCase={handleWithdrawCase}
          onExportUnmatched={handleExportUnmatched}
        />
      </div>

      <LawyerDetailDrawer
        open={detailOpen}
        row={detailRow}
        onClose={handleCloseDetail}
      />
    </PageContainer>
  );
};

export default LawyerCourtPage;
