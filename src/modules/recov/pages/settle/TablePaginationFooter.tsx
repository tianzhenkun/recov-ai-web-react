import { Pagination } from 'antd';

export type TablePaginationFooterProps = {
  rangeText: string;
  pageNum: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
};

const TablePaginationFooter = ({
  rangeText,
  pageNum,
  pageSize,
  total,
  onChange,
}: TablePaginationFooterProps) =>
  total > 0 ? (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
      <div className="whitespace-nowrap text-xs font-medium text-gray-500">
        {rangeText}
      </div>
      <Pagination
        size="small"
        current={pageNum}
        pageSize={pageSize}
        total={total}
        showSizeChanger
        onChange={onChange}
      />
    </div>
  ) : null;

export default TablePaginationFooter;
