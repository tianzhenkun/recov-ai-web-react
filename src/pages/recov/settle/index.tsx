import { message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RecovListPage,
  RecovListStack,
} from '@/pages/recov/components/RecovListLayout';
import {
  type DifferenceDetailQuery,
  type DifferenceServiceFeeDetail,
  getDifferenceDetails,
  getServiceFeeDetails,
  getServiceFeeStatistics,
  getSettlementPage,
  paySettlement,
  type ServiceFeeDetail,
  type ServiceFeeDetailQuery,
  type ServiceFeeStatistics,
  type SettlementQuery,
  type SettlementRecord,
} from '@/services/ruoyi/settle';
import {
  buildRangeText,
  DEFAULT_PAGE_SIZE,
  PAGE_TITLE,
  parsePeriodRange,
  type SettleActiveView,
  toNumber,
} from './_shared';
import CurrentWeekDetailView from './CurrentWeekDetailView';
import DifferenceDetailView from './DifferenceDetailView';
import PaySettlementModal, {
  type PaySettlementForm,
} from './PaySettlementModal';
import SettlementDetailModal from './SettlementDetailModal';
import SettlementTableView from './SettlementTableView';
import StatisticsCards, { type StatisticsCardType } from './StatisticsCards';

const defaultStatistics: ServiceFeeStatistics = {
  unpaidServiceFeeTotal: 0,
  currentWeekServiceFee: 0,
  currentWeekRepayment: 0,
  processedDifferenceAmount: 0,
  processedDifferenceServiceFee: 0,
};

const ServiceFeeSettlePage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();

  const [statistics, setStatistics] =
    useState<ServiceFeeStatistics>(defaultStatistics);
  const [activeView, setActiveView] = useState<SettleActiveView>('settlement');

  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [settlementList, setSettlementList] = useState<SettlementRecord[]>([]);
  const [settlementTotal, setSettlementTotal] = useState(0);
  const [settlementQuery, setSettlementQuery] = useState<SettlementQuery>({
    pageNum: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const [loadingCurrentWeek, setLoadingCurrentWeek] = useState(false);
  const [currentWeekList, setCurrentWeekList] = useState<ServiceFeeDetail[]>(
    [],
  );
  const [currentWeekTotal, setCurrentWeekTotal] = useState(0);
  const [currentWeekQuery, setCurrentWeekQuery] =
    useState<ServiceFeeDetailQuery>({
      pageNum: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });

  const [loadingDifference, setLoadingDifference] = useState(false);
  const [differenceList, setDifferenceList] = useState<
    DifferenceServiceFeeDetail[]
  >([]);
  const [differenceTotal, setDifferenceTotal] = useState(0);
  const [differenceQuery, setDifferenceQuery] = useState<DifferenceDetailQuery>(
    {
      pageNum: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    },
  );

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailList, setDetailList] = useState<ServiceFeeDetail[]>([]);
  const [detailTotal, setDetailTotal] = useState(0);
  const [detailPageNum, setDetailPageNum] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [detailTimeRange, setDetailTimeRange] = useState({
    startTime: '',
    endTime: '',
  });

  const [payOpen, setPayOpen] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payForm, setPayForm] = useState<PaySettlementForm | null>(null);

  const fetchStatistics = useCallback(async () => {
    try {
      const res = await getServiceFeeStatistics();
      if (res.data) {
        setStatistics({
          unpaidServiceFeeTotal: toNumber(res.data.unpaidServiceFeeTotal),
          currentWeekServiceFee: toNumber(res.data.currentWeekServiceFee),
          currentWeekRepayment: toNumber(res.data.currentWeekRepayment),
          processedDifferenceAmount: toNumber(
            res.data.processedDifferenceAmount,
          ),
          processedDifferenceServiceFee: toNumber(
            res.data.processedDifferenceServiceFee,
          ),
        });
      }
    } catch {
      setStatistics(defaultStatistics);
    }
  }, []);

  const loadSettlements = useCallback(async (query: SettlementQuery) => {
    setLoadingSettlements(true);
    try {
      const res = await getSettlementPage(query);
      setSettlementList(Array.isArray(res.rows) ? res.rows : []);
      setSettlementTotal(Number(res.total) || 0);
    } finally {
      setLoadingSettlements(false);
    }
  }, []);

  const fetchCurrentWeekDetails = useCallback(async () => {
    setLoadingCurrentWeek(true);
    try {
      const res = await getServiceFeeDetails(currentWeekQuery);
      setCurrentWeekList(Array.isArray(res.rows) ? res.rows : []);
      setCurrentWeekTotal(Number(res.total) || 0);
    } finally {
      setLoadingCurrentWeek(false);
    }
  }, [currentWeekQuery]);

  const fetchDifferenceDetails = useCallback(async () => {
    setLoadingDifference(true);
    try {
      const res = await getDifferenceDetails(differenceQuery);
      setDifferenceList(Array.isArray(res.rows) ? res.rows : []);
      setDifferenceTotal(Number(res.total) || 0);
    } finally {
      setLoadingDifference(false);
    }
  }, [differenceQuery]);

  const fetchDetailList = useCallback(
    async (pageNum: number, pageSize: number, range = detailTimeRange) => {
      setDetailLoading(true);
      try {
        const res = await getServiceFeeDetails({
          pageNum,
          pageSize,
          startTime: range.startTime,
          endTime: range.endTime,
        });
        setDetailList(Array.isArray(res.rows) ? res.rows : []);
        setDetailTotal(Number(res.total) || 0);
      } finally {
        setDetailLoading(false);
      }
    },
    [detailTimeRange],
  );

  useEffect(() => {
    void fetchStatistics();
  }, [fetchStatistics]);

  useEffect(() => {
    if (activeView === 'settlement') {
      void loadSettlements({
        pageNum: settlementQuery.pageNum,
        pageSize: settlementQuery.pageSize,
        status: settlementQuery.status,
      });
    }
  }, [
    activeView,
    loadSettlements,
    settlementQuery.pageNum,
    settlementQuery.pageSize,
    settlementQuery.status,
  ]);

  useEffect(() => {
    if (activeView === 'currentWeek') {
      void fetchCurrentWeekDetails();
    }
  }, [activeView, fetchCurrentWeekDetails]);

  useEffect(() => {
    if (activeView === 'difference') {
      void fetchDifferenceDetails();
    }
  }, [activeView, fetchDifferenceDetails]);

  const currentWeekRangeText = useMemo(
    () =>
      buildRangeText(
        currentWeekQuery.pageNum ?? 1,
        currentWeekQuery.pageSize ?? DEFAULT_PAGE_SIZE,
        currentWeekTotal,
      ),
    [currentWeekQuery, currentWeekTotal],
  );

  const differenceRangeText = useMemo(
    () =>
      buildRangeText(
        differenceQuery.pageNum ?? 1,
        differenceQuery.pageSize ?? DEFAULT_PAGE_SIZE,
        differenceTotal,
      ),
    [differenceQuery, differenceTotal],
  );

  const detailRangeText = useMemo(
    () => buildRangeText(detailPageNum, detailPageSize, detailTotal),
    [detailPageNum, detailPageSize, detailTotal],
  );

  const querySettlements = useCallback(() => {
    const next = { ...settlementQuery, pageNum: 1 };
    setSettlementQuery(next);
    void loadSettlements(next);
    void fetchStatistics();
  }, [settlementQuery, loadSettlements, fetchStatistics]);

  const resetSettlementQuery = useCallback(() => {
    const next = { pageNum: 1, pageSize: DEFAULT_PAGE_SIZE };
    setSettlementQuery(next);
    void loadSettlements(next);
    void fetchStatistics();
  }, [loadSettlements, fetchStatistics]);

  const refreshCurrentWeek = useCallback(() => {
    void fetchCurrentWeekDetails();
    void fetchStatistics();
  }, [fetchCurrentWeekDetails, fetchStatistics]);

  const queryCurrentWeekDetails = useCallback(() => {
    setCurrentWeekQuery((prev) => ({ ...prev, pageNum: 1 }));
    refreshCurrentWeek();
  }, [refreshCurrentWeek]);

  const resetCurrentWeekQuery = useCallback(() => {
    setCurrentWeekQuery({
      pageNum: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
    refreshCurrentWeek();
  }, [refreshCurrentWeek]);

  const refreshDifference = useCallback(() => {
    void fetchDifferenceDetails();
    void fetchStatistics();
  }, [fetchDifferenceDetails, fetchStatistics]);

  const queryDifferenceDetails = useCallback(() => {
    setDifferenceQuery((prev) => ({ ...prev, pageNum: 1 }));
    refreshDifference();
  }, [refreshDifference]);

  const resetDifferenceQuery = useCallback(() => {
    setDifferenceQuery({
      pageNum: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
    refreshDifference();
  }, [refreshDifference]);

  const handleCardClick = (type: StatisticsCardType) => {
    switch (type) {
      case 'unpaid':
        setActiveView('settlement');
        setSettlementQuery({
          pageNum: 1,
          pageSize: DEFAULT_PAGE_SIZE,
          status: '0',
        });
        break;
      case 'currentWeek':
        setActiveView('currentWeek');
        setCurrentWeekQuery({
          pageNum: 1,
          pageSize: DEFAULT_PAGE_SIZE,
        });
        break;
      case 'difference':
        setActiveView('difference');
        setDifferenceQuery({
          pageNum: 1,
          pageSize: DEFAULT_PAGE_SIZE,
        });
        break;
      default:
        break;
    }
  };

  const handleViewDetail = (row: SettlementRecord) => {
    const range = parsePeriodRange(row.period);
    setDetailTitle(`结算明细 - ${row.period}`);
    setDetailPageNum(1);
    setDetailTimeRange(range);
    setDetailOpen(true);
    void fetchDetailList(1, detailPageSize, range);
  };

  const handleDetailPageChange = (page: number, pageSize: number) => {
    setDetailPageNum(page);
    setDetailPageSize(pageSize);
    void fetchDetailList(page, pageSize);
  };

  const handleOpenPay = (row: SettlementRecord) => {
    setPayForm({
      id: row.id,
      period: row.period,
      serviceFee: row.serviceFee,
      paidServiceFee: row.paidServiceFee,
      unpaidServiceFee: row.unpaidServiceFee,
      paidAmount: row.unpaidServiceFee,
    });
    setPayOpen(true);
  };

  const handleSubmitPay = async (paidAmount: number) => {
    if (!payForm) return;
    if (!paidAmount || paidAmount <= 0) {
      messageApi.warning('请输入有效的缴费金额');
      return;
    }
    if (paidAmount > payForm.unpaidServiceFee) {
      messageApi.warning('缴费金额不能超过未付服务费');
      return;
    }

    setPayLoading(true);
    try {
      await paySettlement(payForm.id, { paidAmount });
      messageApi.success('缴费录入成功');
      setPayOpen(false);
      setPayForm(null);
      const next = { ...settlementQuery };
      void loadSettlements(next);
      void fetchStatistics();
    } catch {
      messageApi.error('缴费录入失败');
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <RecovListPage breadcrumbRender={false} title={PAGE_TITLE}>
      {messageContextHolder}

      <RecovListStack>
        <StatisticsCards
          statistics={statistics}
          onCardClick={handleCardClick}
        />

        <div className="recov-list-fill">
          {activeView === 'settlement' ? (
            <SettlementTableView
              loading={loadingSettlements}
              list={settlementList}
              total={settlementTotal}
              query={settlementQuery}
              onQueryChange={setSettlementQuery}
              onSearch={querySettlements}
              onReset={resetSettlementQuery}
              onViewDetail={handleViewDetail}
              onPay={handleOpenPay}
            />
          ) : null}

          {activeView === 'currentWeek' ? (
            <CurrentWeekDetailView
              loading={loadingCurrentWeek}
              list={currentWeekList}
              total={currentWeekTotal}
              query={currentWeekQuery}
              rangeText={currentWeekRangeText}
              periodLabel=""
              onBack={() => setActiveView('settlement')}
              onQueryChange={setCurrentWeekQuery}
              onSearch={queryCurrentWeekDetails}
              onReset={resetCurrentWeekQuery}
            />
          ) : null}

          {activeView === 'difference' ? (
            <DifferenceDetailView
              loading={loadingDifference}
              list={differenceList}
              total={differenceTotal}
              query={differenceQuery}
              rangeText={differenceRangeText}
              periodLabel=""
              onBack={() => setActiveView('settlement')}
              onQueryChange={setDifferenceQuery}
              onSearch={queryDifferenceDetails}
              onReset={resetDifferenceQuery}
            />
          ) : null}
        </div>
      </RecovListStack>

      <SettlementDetailModal
        open={detailOpen}
        title={detailTitle}
        loading={detailLoading}
        list={detailList}
        total={detailTotal}
        pageNum={detailPageNum}
        pageSize={detailPageSize}
        rangeText={detailRangeText}
        onClose={() => setDetailOpen(false)}
        onPageChange={handleDetailPageChange}
      />

      <PaySettlementModal
        open={payOpen}
        loading={payLoading}
        initial={payForm}
        onCancel={() => {
          setPayOpen(false);
          setPayForm(null);
        }}
        onSubmit={handleSubmitPay}
      />
    </RecovListPage>
  );
};

export default ServiceFeeSettlePage;
