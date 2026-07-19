import { Modal, Table, Typography } from 'antd';
import type { ServiceFeeDetail } from '@/modules/recov/services/settle';
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
    title={
      <div className="flex flex-col gap-1">
        <span>结算明细</span>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {title}
        </Typography.Text>
      </div>
    }
    open={open}
    width={1180}
    destroyOnHidden
    footer={null}
    onCancel={onClose}
  >
    <div className="overflow-hidden rounded-lg border border-solid border-zinc-100">
      <Table<ServiceFeeDetail>
        rowKey="id"
        loading={loading}
        size="middle"
        scroll={{ x: 1080, y: 420 }}
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
    </div>
  </Modal>
);

export default SettlementDetailModal;
