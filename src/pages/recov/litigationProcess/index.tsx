import { useCallback, useEffect, useState } from 'react';
import {
  RecovListPage,
  RecovListStack,
} from '@/pages/recov/components/RecovListLayout';
import type {
  LitigationNodeStatVO,
  LitigationNodeType,
  LitigationOverviewVO,
} from '@/services/ruoyi/litigation-process';
import {
  DEFAULT_NODE_TYPE,
  DEFAULT_PAGE_SIZE,
  type DisplayRow,
  PAGE_TITLE,
} from './_shared';
import CaseMonitorTable from './components/CaseMonitorTable';
import LitigationDetailModal from './components/LitigationDetailModal';
import NodeRail from './components/NodeRail';
import OverviewCards from './components/OverviewCards';
import {
  fetchLitigationNodeStats,
  fetchLitigationOverview,
  fetchLitigationPage,
  type LitigationListQuery,
} from './service';

const defaultOverview: LitigationOverviewVO = {
  totalCount: 0,
  materialSubmittedCount: 0,
  courtAcceptedCount: 0,
  nodeDebtAmount: '0',
  nodeRepaymentAmount: '0',
};

const LitigationProcessPage = () => {
  const [nodes, setNodes] = useState<LitigationNodeStatVO[]>([]);
  const [overview, setOverview] =
    useState<LitigationOverviewVO>(defaultOverview);
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [total, setTotal] = useState(0);

  const [nodeType, setNodeType] =
    useState<LitigationNodeType>(DEFAULT_NODE_TYPE);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [debtNumberFilter, setDebtNumberFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');

  const [nodesLoading, setNodesLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<DisplayRow | null>(null);

  const buildListQuery = useCallback(
    (overrides: Partial<LitigationListQuery> = {}): LitigationListQuery => ({
      pageNum,
      pageSize,
      nodeType,
      debtNumber: debtNumberFilter || undefined,
      city: cityFilter || undefined,
      organization: organizationFilter || undefined,
      ...overrides,
    }),
    [
      pageNum,
      pageSize,
      nodeType,
      debtNumberFilter,
      cityFilter,
      organizationFilter,
    ],
  );

  const fetchOverview = useCallback(
    async (currentNodeType: LitigationNodeType) => {
      setOverviewLoading(true);
      try {
        setOverview(await fetchLitigationOverview(currentNodeType));
      } catch {
        setOverview(defaultOverview);
      } finally {
        setOverviewLoading(false);
      }
    },
    [],
  );

  const fetchNodes = useCallback(async () => {
    setNodesLoading(true);
    try {
      setNodes(await fetchLitigationNodeStats());
    } catch {
      setNodes([]);
    } finally {
      setNodesLoading(false);
    }
  }, []);

  const fetchList = useCallback(async (query: LitigationListQuery) => {
    setListLoading(true);
    try {
      const page = await fetchLitigationPage(query);
      setRows(page.rows);
      setTotal(page.total);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.all([
        fetchNodes(),
        fetchOverview(DEFAULT_NODE_TYPE),
        fetchList({
          pageNum: 1,
          pageSize: DEFAULT_PAGE_SIZE,
          nodeType: DEFAULT_NODE_TYPE,
        }),
      ]);
    })();
  }, [fetchNodes, fetchOverview, fetchList]);

  const handleNodeChange = async (nextNodeType: LitigationNodeType) => {
    if (nextNodeType === nodeType) return;
    setNodeType(nextNodeType);
    setPageNum(1);
    await Promise.all([
      fetchOverview(nextNodeType),
      fetchList({
        pageNum: 1,
        pageSize,
        nodeType: nextNodeType,
        debtNumber: debtNumberFilter || undefined,
        city: cityFilter || undefined,
        organization: organizationFilter || undefined,
      }),
    ]);
  };

  const handleFilterSearch = async (filters: {
    debtNumber: string;
    city: string;
    organization: string;
  }) => {
    setDebtNumberFilter(filters.debtNumber);
    setCityFilter(filters.city);
    setOrganizationFilter(filters.organization);
    setPageNum(1);
    await fetchList(
      buildListQuery({
        pageNum: 1,
        debtNumber: filters.debtNumber || undefined,
        city: filters.city || undefined,
        organization: filters.organization || undefined,
      }),
    );
  };

  const handleFilterReset = async () => {
    await handleFilterSearch({
      debtNumber: '',
      city: '',
      organization: '',
    });
  };

  const handlePageChange = async (nextPage: number, nextSize: number) => {
    setPageNum(nextPage);
    setPageSize(nextSize);
    await fetchList(buildListQuery({ pageNum: nextPage, pageSize: nextSize }));
  };

  const handleViewDetail = (row: DisplayRow) => {
    setDetailRow(row);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setDetailRow(null);
  };

  const tableLoading = listLoading || overviewLoading;

  return (
    <RecovListPage title={PAGE_TITLE}>
      <RecovListStack>
        <OverviewCards overview={overview} />

        <NodeRail
          nodes={nodes}
          activeNodeType={nodeType}
          loading={nodesLoading}
          onNodeChange={handleNodeChange}
        />

        <CaseMonitorTable
          nodeType={nodeType}
          rows={rows}
          total={total}
          pageNum={pageNum}
          pageSize={pageSize}
          loading={tableLoading}
          debtNumberFilter={debtNumberFilter}
          cityFilter={cityFilter}
          organizationFilter={organizationFilter}
          onFilterSearch={handleFilterSearch}
          onFilterReset={handleFilterReset}
          onPageChange={handlePageChange}
          onViewDetail={handleViewDetail}
        />
      </RecovListStack>

      <LitigationDetailModal
        open={detailOpen}
        row={detailRow}
        onClose={handleCloseDetail}
      />
    </RecovListPage>
  );
};

export default LitigationProcessPage;
