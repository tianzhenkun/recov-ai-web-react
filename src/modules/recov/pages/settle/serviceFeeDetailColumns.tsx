import type { ColumnsType } from 'antd/es/table';
import { RECOV_LIST_COLUMN_WIDTH } from '@/modules/recov/components/RecovFilterControls';
import type { ServiceFeeDetail } from '@/modules/recov/services/settle';
import { formatAmount } from './_shared';

export const serviceFeeDetailColumns: ColumnsType<ServiceFeeDetail> = [
  {
    title: '资产编号',
    dataIndex: 'debtNumber',
    minWidth: RECOV_LIST_COLUMN_WIDTH.debtNumber,
    render: (value: string) => value,
  },
  {
    title: '所属城市',
    dataIndex: 'city',
    minWidth: RECOV_LIST_COLUMN_WIDTH.city,
    render: (value: string) => (
      <span className="text-xs font-medium text-gray-700">{value}</span>
    ),
  },
  {
    title: '所属项目',
    dataIndex: 'organization',
    minWidth: RECOV_LIST_COLUMN_WIDTH.organization,
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
    title: '回款金额(元)',
    dataIndex: 'repaymentAmount',
    minWidth: 120,
    align: 'right',
    render: (value: number) => (
      <span className="text-xs font-bold text-gray-900">
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
