import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { RecovTableCard } from '@/pages/recov/components/RecovListLayout';
import type {
  DifferenceDetailQuery,
  DifferenceServiceFeeDetail,
} from '@/services/ruoyi/settle';
import { formatAmount } from './_shared';
import DetailFilterBar from './DetailFilterBar';
import TablePaginationFooter from './TablePaginationFooter';

export type DifferenceDetailViewProps = {
  loading: boolean;
  list: DifferenceServiceFeeDetail[];
  total: number;
  query: DifferenceDetailQuery;
  rangeText: string;
  periodLabel: string;
  onBack: () => void;
  onQueryChange: (next: DifferenceDetailQuery) => void;
  onSearch: () => void;
};

const differenceColumns: ColumnsType<DifferenceServiceFeeDetail> = [
  {
    title: '资产编号',
    dataIndex: 'debtNumber',
    minWidth: 130,
    render: (value: string) => (
      <span className="rounded border border-gray-100 bg-gray-50 px-2 py-1 font-mono text-[11px] text-gray-500">
        {value}
      </span>
    ),
  },
  {
    title: '所属城市',
    dataIndex: 'city',
    minWidth: 100,
    render: (value: string) => (
      <span className="text-xs font-medium text-gray-700">{value}</span>
    ),
  },
  {
    title: '所属项目',
    dataIndex: 'organization',
    minWidth: 140,
    ellipsis: true,
    render: (value: string) => (
      <span className="text-xs font-medium text-gray-700">{value}</span>
    ),
  },
  {
    title: '业主姓名',
    dataIndex: 'debtorName',
    minWidth: 90,
    render: (value: string) => (
      <span className="text-xs font-bold text-gray-900">{value}</span>
    ),
  },
  {
    title: '逾期金额(元)',
    dataIndex: 'debtAmount',
    minWidth: 120,
    align: 'right',
    render: (value: number) => (
      <span className="text-xs font-bold text-gray-900">
        {formatAmount(value)}
      </span>
    ),
  },
  {
    title: '违约(滞纳)金(元)',
    dataIndex: 'overdueAmount',
    minWidth: 130,
    align: 'right',
    render: (value: number) => (
      <span className="text-[11px] font-medium text-gray-500">
        {formatAmount(value)}
      </span>
    ),
  },
  {
    title: 'RECOV系统显示回款金额(元)',
    dataIndex: 'systemAmount',
    minWidth: 180,
    align: 'right',
    render: (value: number) => (
      <span className="text-xs font-bold text-gray-900">
        {formatAmount(value)}
      </span>
    ),
  },
  {
    title: '物业公司显示回款金额(元)',
    dataIndex: 'recordedAmount',
    minWidth: 180,
    align: 'right',
    render: (value: number) => (
      <span className="text-xs font-bold text-gray-900">
        {formatAmount(value)}
      </span>
    ),
  },
  {
    title: '差异金额(元)',
    dataIndex: 'differenceAmount',
    minWidth: 120,
    align: 'right',
    render: (value: number) => (
      <span
        className={`text-xs font-bold ${value > 0 ? 'text-red-600' : 'text-emerald-600'}`}
      >
        {formatAmount(value)}
      </span>
    ),
  },
  {
    title: '适用费率',
    dataIndex: 'feeRate',
    minWidth: 90,
    align: 'center',
    render: (value: number) => (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
        {value}%
      </span>
    ),
  },
  {
    title: '对应服务费(元)',
    dataIndex: 'serviceFee',
    minWidth: 130,
    align: 'right',
    render: (value: number) => (
      <span className="text-xs font-bold text-gray-900">
        {formatAmount(value)}
      </span>
    ),
  },
];

const DifferenceDetailView = ({
  loading,
  list,
  total,
  query,
  rangeText,
  periodLabel,
  onBack,
  onQueryChange,
  onSearch,
}: DifferenceDetailViewProps) => (
  <RecovTableCard
    title={
      <div>
        <div>对账差异产生服务费明细</div>
        {periodLabel ? (
          <div className="mt-1 text-xs font-normal text-zinc-500">
            统计周期：{periodLabel}
          </div>
        ) : null}
      </div>
    }
    extra={
      <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
        返回
      </Button>
    }
  >
    <div className="recov-table-card-content">
      <DetailFilterBar
        query={query}
        onQueryChange={onQueryChange}
        onSearch={onSearch}
      />

      <Table<DifferenceServiceFeeDetail>
        className="recov-stable-pagination-table"
        rowKey="id"
        loading={loading}
        size="middle"
        scroll={{ x: 1400 }}
        pagination={false}
        dataSource={list}
        columns={differenceColumns}
      />

      <TablePaginationFooter
        rangeText={rangeText}
        pageNum={query.pageNum ?? 1}
        pageSize={query.pageSize ?? 10}
        total={total}
        onChange={(page, pageSize) =>
          onQueryChange({ ...query, pageNum: page, pageSize })
        }
      />
    </div>
  </RecovTableCard>
);

export default DifferenceDetailView;
