import { Modal, Table } from 'antd';
import type { ServiceFeeDetail } from '@/services/ruoyi/settle';
import { serviceFeeDetailColumns } from './serviceFeeDetailColumns';
import TablePaginationFooter from './TablePaginationFooter';

export type SettlementDetailModalProps = {
  open: boolean;
  title: string;
  loading: boolean;
  list: ServiceFeeDetail[];
  total: number;
  pageNum: number;
  pageSize: number;
  rangeText: string;
  onClose: () => void;
  onPageChange: (page: number, pageSize: number) => void;
};

const SettlementDetailModal = ({
  open,
  title,
  loading,
  list,
  total,
  pageNum,
  pageSize,
  rangeText,
  onClose,
  onPageChange,
}: SettlementDetailModalProps) => (
  <Modal
    title={title}
    open={open}
    width={1200}
    destroyOnHidden
    footer={null}
    onCancel={onClose}
  >
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
      pageNum={pageNum}
      pageSize={pageSize}
      total={total}
      onChange={onPageChange}
    />
  </Modal>
);

export default SettlementDetailModal;
