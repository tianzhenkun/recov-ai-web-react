import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Table } from 'antd';
import { RecovTableCard } from '@/modules/recov/components/RecovListLayout';
import type {
  ServiceFeeDetail,
  ServiceFeeDetailQuery,
} from '@/modules/recov/services/settle';
import DetailFilterBar from './DetailFilterBar';
import { serviceFeeDetailColumns } from './serviceFeeDetailColumns';
import TablePaginationFooter from './TablePaginationFooter';

export type CurrentWeekDetailViewProps = {
  loading: boolean;
  list: ServiceFeeDetail[];
  total: number;
  query: ServiceFeeDetailQuery;
  rangeText: string;
  periodLabel: string;
  onBack: () => void;
  onQueryChange: (next: ServiceFeeDetailQuery) => void;
  onSearch: () => void;
};

const CurrentWeekDetailView = ({
  loading,
  list,
  total,
  query,
  rangeText,
  periodLabel,
  onBack,
  onQueryChange,
  onSearch,
}: CurrentWeekDetailViewProps) => (
  <RecovTableCard
    title={
      <div>
        <div>本周已产生服务费明细</div>
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

      <Table<ServiceFeeDetail>
        className="recov-stable-pagination-table"
        rowKey="id"
        loading={loading}
        size="middle"
        scroll={{ x: 1200 }}
        pagination={false}
        dataSource={list}
        columns={serviceFeeDetailColumns}
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

export default CurrentWeekDetailView;
