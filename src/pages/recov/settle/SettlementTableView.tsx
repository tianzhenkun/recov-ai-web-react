import { EyeOutlined, ReloadOutlined, WalletOutlined } from '@ant-design/icons';
import { Button, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import TableActions from '@/components/TableActions';
import { RecovTableCard } from '@/pages/recov/components/RecovListLayout';
import type {
  SettlementQuery,
  SettlementRecord,
} from '@/services/ruoyi/settle';
import { formatAmount, getSettlementStatusTag } from './_shared';

export type SettlementTableViewProps = {
  loading: boolean;
  list: SettlementRecord[];
  total: number;
  query: SettlementQuery;
  onQueryChange: (next: SettlementQuery) => void;
  onRefresh: () => void;
  onViewDetail: (row: SettlementRecord) => void;
  onPay: (row: SettlementRecord) => void;
};

const SettlementTableView = ({
  loading,
  list,
  total,
  query,
  onQueryChange,
  onRefresh,
  onViewDetail,
  onPay,
}: SettlementTableViewProps) => {
  const columns: ColumnsType<SettlementRecord> = [
    {
      title: '结算周期',
      dataIndex: 'period',
      width: 180,
      render: (value: string) => <Typography.Text>{value}</Typography.Text>,
    },
    {
      title: '结算日',
      dataIndex: 'settlementDate',
      width: 130,
      render: (value: string) => (
        <Typography.Text type="secondary">{value}</Typography.Text>
      ),
    },
    {
      title: '本期回款金额(元)',
      dataIndex: 'repaymentAmount',
      width: 150,
      align: 'right',
      render: (value: number) => (
        <Typography.Text strong>{formatAmount(value)}</Typography.Text>
      ),
    },
    {
      title: '对应服务费(元)',
      dataIndex: 'serviceFee',
      width: 140,
      align: 'right',
      render: (value: number) => (
        <Typography.Text strong>{formatAmount(value)}</Typography.Text>
      ),
    },
    {
      title: '已付服务费(元)',
      dataIndex: 'paidServiceFee',
      width: 140,
      align: 'right',
      render: (value: number) => (
        <Typography.Text strong>{formatAmount(value)}</Typography.Text>
      ),
    },
    {
      title: '未付服务费(元)',
      dataIndex: 'unpaidServiceFee',
      width: 140,
      align: 'right',
      render: (value: number) => (
        <Typography.Text
          strong={value > 0}
          type={value > 0 ? 'danger' : 'secondary'}
        >
          {formatAmount(value)}
        </Typography.Text>
      ),
    },
    {
      title: '结算状态',
      dataIndex: 'statusDesc',
      width: 110,
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
      width: 112,
      fixed: 'right',
      align: 'left',
      render: (_: unknown, row) => (
        <TableActions
          actions={[
            {
              key: 'detail',
              label: '查看详情',
              icon: <EyeOutlined />,
              onClick: () => onViewDetail(row),
            },
            ...(row.status !== '2'
              ? [
                  {
                    key: 'pay',
                    label: '录入缴费',
                    icon: <WalletOutlined />,
                    onClick: () => onPay(row),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ];

  return (
    <RecovTableCard
      title="服务费结算记录"
      extra={
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
        </Space>
      }
    >
      <Table<SettlementRecord>
        className="recov-stable-pagination-table"
        rowKey="id"
        loading={loading}
        size="middle"
        scroll={{ x: 1130 }}
        pagination={{
          current: query.pageNum ?? 1,
          pageSize: query.pageSize ?? 10,
          total,
          showSizeChanger: true,
          showTotal: (value) => `共 ${value} 条`,
          onChange: (page, pageSize) =>
            onQueryChange({ ...query, pageNum: page, pageSize }),
        }}
        dataSource={list}
        columns={columns}
      />
    </RecovTableCard>
  );
};

export default SettlementTableView;
