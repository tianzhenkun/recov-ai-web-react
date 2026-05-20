import { PageContainer } from '@ant-design/pro-components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getLitigationNodeStats,
  getLitigationOverview,
  getLitigationPage,
  type LitigationNodeStatVO,
  type LitigationNodeType,
  type LitigationOverviewVO,
  type LitigationPageQuery,
  unwrapLitigationNodeStats,
  unwrapLitigationOverview,
  unwrapLitigationPage,
} from '@/services/ruoyi/litigation-process';
import {
  DEFAULT_NODE_TYPE,
  DEFAULT_PAGE_SIZE,
  type DisplayRow,
  PAGE_TITLE,
  parseFeeResult,
} from './_shared';
import CaseMonitorTable from './components/CaseMonitorTable';
import LitigationDetailModal from './components/LitigationDetailModal';
import NodeRail from './components/NodeRail';
import OverviewCards from './components/OverviewCards';

const defaultOverview: LitigationOverviewVO = {
  totalCount: 0,
  materialSubmittedCount: 0,
  courtAcceptedCount: 0,
  nodeDebtAmount: 0,
  nodeRepaymentAmount: 0,
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
  const [cityFilter, setCityFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');

  const [nodesLoading, setNodesLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<DisplayRow | null>(null);

  const activeNode = useMemo(
    () => nodes.find((item) => item.nodeType === nodeType),
    [nodes, nodeType],
  );

  const fetchOverview = useCallback(
    async (currentNodeType: LitigationNodeType) => {
      setOverviewLoading(true);
      try {
        const response = await getLitigationOverview(currentNodeType);
        setOverview(unwrapLitigationOverview(response));
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
      const response = await getLitigationNodeStats();
      setNodes(unwrapLitigationNodeStats(response));
    } catch {
      setNodes([]);
    } finally {
      setNodesLoading(false);
    }
  }, []);

  const fetchList = useCallback(async (query: LitigationPageQuery) => {
    setListLoading(true);
    try {
      const response = await getLitigationPage(query);
      const page = unwrapLitigationPage(response);
      setRows(
        page.rows.map((row) => ({
          ...row,
          _fee:
            query.nodeType === 'FEE_MANAGEMENT'
              ? parseFeeResult(row.result)
              : undefined,
        })),
      );
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
        city: cityFilter || undefined,
        organization: organizationFilter || undefined,
      }),
    ]);
  };

  const handleCityFilterChange = async (city: string) => {
    setCityFilter(city);
    setPageNum(1);
    await fetchList({
      pageNum: 1,
      pageSize,
      nodeType,
      city: city || undefined,
      organization: organizationFilter || undefined,
    });
  };

  const handleOrganizationFilterChange = async (organization: string) => {
    setOrganizationFilter(organization);
    setPageNum(1);
    await fetchList({
      pageNum: 1,
      pageSize,
      nodeType,
      city: cityFilter || undefined,
      organization: organization || undefined,
    });
  };

  const handlePageChange = async (nextPage: number, nextSize: number) => {
    setPageNum(nextPage);
    setPageSize(nextSize);
    await fetchList({
      pageNum: nextPage,
      pageSize: nextSize,
      nodeType,
      city: cityFilter || undefined,
      organization: organizationFilter || undefined,
    });
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
    <PageContainer title={PAGE_TITLE}>
      <div className="flex flex-col gap-4">
        <OverviewCards overview={overview} />

        <NodeRail
          nodes={nodes}
          activeNodeType={nodeType}
          activeNodeDesc={activeNode?.nodeDesc}
          total={total}
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
          cityFilter={cityFilter}
          organizationFilter={organizationFilter}
          onCityFilterChange={handleCityFilterChange}
          onOrganizationFilterChange={handleOrganizationFilterChange}
          onPageChange={handlePageChange}
          onViewDetail={handleViewDetail}
        />
      </div>

      <LitigationDetailModal
        open={detailOpen}
        row={detailRow}
        nodeType={nodeType}
        onClose={handleCloseDetail}
      />
    </PageContainer>
  );
};

export default LitigationProcessPage;
