import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  SettlementQuery,
  SettlementRecord,
} from '@/services/ruoyi/settle';
import {
  formatAmount,
  getSettlementStatusTag,
  SETTLEMENT_STATUS_OPTIONS,
} from './_shared';
import TablePaginationFooter from './TablePaginationFooter';

export type SettlementTableViewProps = {
  loading: boolean;
  list: SettlementRecord[];
  total: number;
  query: SettlementQuery;
  rangeText: string;
  onQueryChange: (next: SettlementQuery) => void;
  onSearch: () => void;
  onReset: () => void;
  onViewDetail: (row: SettlementRecord) => void;
  onPay: (row: SettlementRecord) => void;
};

const SettlementTableView = ({
  loading,
  list,
  total,
  query,
  rangeText,
  onQueryChange,
  onSearch,
  onReset,
  onViewDetail,
  onPay,
}: SettlementTableViewProps) => {
  const columns: ColumnsType<SettlementRecord> = [
    {
      title: '结算周期',
      dataIndex: 'period',
      minWidth: 180,
      render: (value: string) => (
        <span className="text-xs font-medium text-gray-700">{value}</span>
      ),
    },
    {
      title: '结算日',
      dataIndex: 'settlementDate',
      minWidth: 120,
      render: (value: string) => (
        <span className="font-mono text-xs text-gray-500">{value}</span>
      ),
    },
    {
      title: '本期回款金额(元)',
      dataIndex: 'repaymentAmount',
      minWidth: 140,
      align: 'right',
      render: (value: number) => (
        <span className="text-xs font-bold text-gray-900">
          {formatAmount(value)}
        </span>
      ),
    },
    {
      title: '对应服务费(元)',
      dataIndex: 'serviceFee',
      minWidth: 130,
      align: 'right',
      render: (value: number) => (
        <span className="text-xs font-bold text-indigo-600">
          {formatAmount(value)}
        </span>
      ),
    },
    {
      title: '已付服务费(元)',
      dataIndex: 'paidServiceFee',
      minWidth: 130,
      align: 'right',
      render: (value: number) => (
        <span className="text-xs font-bold text-emerald-600">
          {formatAmount(value)}
        </span>
      ),
    },
    {
      title: '未付服务费(元)',
      dataIndex: 'unpaidServiceFee',
      minWidth: 130,
      align: 'right',
      render: (value: number) => (
        <span
          className={`text-xs font-bold ${value > 0 ? 'text-red-600' : 'text-gray-400'}`}
        >
          {formatAmount(value)}
        </span>
      ),
    },
    {
      title: '结算状态',
      dataIndex: 'statusDesc',
      minWidth: 100,
      align: 'center',
      render: (_: string, row) => {
        const tag = getSettlementStatusTag(row.status);
        return (
          <Tag color={tag.color} variant="filled">
            {row.statusDesc}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      align: 'center',
      render: (_: unknown, row) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            className="!font-bold !text-indigo-600"
            icon={<EyeOutlined />}
            onClick={() => onViewDetail(row)}
          >
            明细查看
          </Button>
          {row.status !== '2' ? (
            <Button
              type="link"
              size="small"
              className="!font-bold !text-emerald-600"
              onClick={() => onPay(row)}
            >
              录入缴费
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
        <div className="flex shrink-0 items-center gap-3">
          <span className="h-4 w-1.5 rounded-full bg-indigo-500" />
          <h3 className="text-base font-bold tracking-tight text-gray-800">
            催收启动后服务费结算记录
          </h3>
          <Tag className="font-mono">共 {total} 条</Tag>
        </div>
        <Space wrap className="ml-auto">
          <Select
            allowClear
            placeholder="结算状态"
            className="!w-36"
            value={query.status}
            options={[...SETTLEMENT_STATUS_OPTIONS]}
            onChange={(status) =>
              onQueryChange({
                ...query,
                status: status ?? undefined,
                pageNum: 1,
              })
            }
          />
          <Button type="primary" className="!rounded-xl" onClick={onSearch}>
            查询
          </Button>
          <Button
            className="!rounded-xl"
            icon={<ReloadOutlined />}
            title="重置筛选"
            onClick={onReset}
          />
        </Space>
      </div>

      <Table<SettlementRecord>
        rowKey="id"
        loading={loading}
        bordered
        scroll={{ x: 1100 }}
        pagination={false}
        dataSource={list}
        columns={columns}
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
};

export default SettlementTableView;
