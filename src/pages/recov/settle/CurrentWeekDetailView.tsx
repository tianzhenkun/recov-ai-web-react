import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Table } from 'antd';
import type {
  ServiceFeeDetail,
  ServiceFeeDetailQuery,
} from '@/services/ruoyi/settle';
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
  onReset: () => void;
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
  onReset,
}: CurrentWeekDetailViewProps) => (
  <>
    <div className="border-b border-gray-100 px-6 py-4">
      <div className="mb-4 flex items-center gap-3">
        <Button
          type="link"
          className="!p-0 !text-gray-500 hover:!text-indigo-600"
          icon={<ArrowLeftOutlined className="text-lg" />}
          onClick={onBack}
        />
        <div>
          <h3 className="text-base font-bold tracking-tight text-gray-800">
            本周已产生服务费明细
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            统计周期：{periodLabel}
          </p>
        </div>
      </div>
      <DetailFilterBar
        query={query}
        onQueryChange={onQueryChange}
        onSearch={onSearch}
        onReset={onReset}
      />
    </div>

    <Table<ServiceFeeDetail>
      rowKey="id"
      loading={loading}
      bordered
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
  </>
);

export default CurrentWeekDetailView;
