import { DownOutlined, EyeOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { Dropdown, Table, Tag, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { type ReactNode, useMemo } from 'react';
import TableActions from '@/components/TableActions';
import type {
  LitigationNodeType,
  LitigationStatus,
} from '@/services/ruoyi/litigation-process';
import {
  CITY_OPTIONS,
  type ColumnSchema,
  type DisplayRow,
  formatDebtNumber,
  formatDisplayMoney,
  formatText,
  getFeeStatusColor,
  getFeeStatusLabel,
  getLitigationStatusColor,
  getLitigationStatusLabel,
  getOverdueDaysColor,
  getRemainDaysColor,
  getVisibleColumns,
  LITIGATION_STATUS_FILTER_OPTIONS,
  ORGANIZATION_OPTIONS,
} from '../_shared';

const { Text } = Typography;

type CaseMonitorTableProps = {
  nodeType: LitigationNodeType;
  rows: DisplayRow[];
  total: number;
  pageNum: number;
  pageSize: number;
  loading?: boolean;
  cityFilter: string;
  organizationFilter: string;
  statusFilter: LitigationStatus | '';
  onCityFilterChange: (city: string) => void;
  onOrganizationFilterChange: (organization: string) => void;
  onStatusFilterChange: (status: LitigationStatus | '') => void;
  onPageChange: (pageNum: number, pageSize: number) => void;
  onViewDetail: (row: DisplayRow) => void;
};

const renderFilterTitle = (
  label: string,
  activeValue: string,
  options: { key: string; label: ReactNode }[],
  onSelect: (value: string) => void,
  placement: 'bottomLeft' | 'bottom' = 'bottomLeft',
) => (
  <Dropdown
    placement={placement}
    autoAdjustOverflow={false}
    getPopupContainer={() => document.body}
    menu={{
      items: options,
      onClick: ({ key }) => onSelect(key),
    }}
    trigger={['click']}
  >
    <button
      type="button"
      className={`inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs font-bold ${
        activeValue ? 'text-[#4f46e5]' : 'text-[#64748b]'
      }`}
    >
      <span>{label}</span>
      <DownOutlined style={{ fontSize: 10 }} />
    </button>
  </Dropdown>
);

const renderCell = (row: DisplayRow, column: ColumnSchema) => {
  if (column.feeOnly) {
    const fee = row._fee;
    if (column.type === 'money') {
      const value =
        column.prop === 'paymentAmount' ? fee?.paymentAmount : undefined;
      return (
        <Text strong style={{ fontSize: 12 }}>
          {formatDisplayMoney(value)}
        </Text>
      );
    }
    if (column.type === 'remainDays') {
      const days = fee?.remainingDays;
      const remainColor = getRemainDaysColor(days, fee?.paid);
      return (
        <Text
          strong
          style={{
            fontSize: 12,
            color:
              remainColor === 'success'
                ? '#059669'
                : remainColor === 'error'
                  ? '#dc2626'
                  : '#334155',
          }}
        >
          {days ?? '-'}
          {days !== undefined ? ' 天' : ''}
        </Text>
      );
    }
    if (column.type === 'warning') {
      return (
        <Tag color={fee?.warningMessage ? 'error' : 'default'}>
          {fee?.warningMessage || '-'}
        </Tag>
      );
    }
    if (column.type === 'feeStatus') {
      return (
        <Tag color={getFeeStatusColor(fee?.paid)}>
          {getFeeStatusLabel(fee?.paid)}
        </Tag>
      );
    }
    if (column.type === 'mono') {
      return <Text code>{formatText(fee?.paymentDeadline)}</Text>;
    }
    return formatText(undefined);
  }

  const value = row[column.prop as keyof DisplayRow];

  switch (column.type) {
    case 'asset':
      return (
        <Tag style={{ fontFamily: 'Consolas, monospace', fontSize: 11 }}>
          {formatDebtNumber(row.debtNumber)}
        </Tag>
      );
    case 'money':
      return (
        <Text strong style={{ fontSize: 12 }}>
          {formatDisplayMoney(value)}
        </Text>
      );
    case 'days':
      return (
        <Tag color={getOverdueDaysColor(Number(value))}>{`${value} 天`}</Tag>
      );
    case 'status':
      return (
        <Tag color={getLitigationStatusColor(row.status)}>
          {getLitigationStatusLabel(row.status)}
        </Tag>
      );
    case 'party':
      return (
        <Text strong style={{ fontSize: 12 }}>
          {row.debtorName}
        </Text>
      );
    case 'mono':
      return <Text code>{formatText(value)}</Text>;
    default:
      return <Text style={{ fontSize: 12 }}>{formatText(value)}</Text>;
  }
};

const CaseMonitorTable = ({
  nodeType,
  rows,
  total,
  pageNum,
  pageSize,
  loading,
  cityFilter,
  organizationFilter,
  statusFilter,
  onCityFilterChange,
  onOrganizationFilterChange,
  onStatusFilterChange,
  onPageChange,
  onViewDetail,
}: CaseMonitorTableProps) => {
  const statusFilterItems = useMemo(
    () => [
      {
        key: '',
        label: (
          <span className={!statusFilter ? 'font-semibold text-[#4f46e5]' : ''}>
            全部
          </span>
        ),
      },
      ...LITIGATION_STATUS_FILTER_OPTIONS.map((item) => ({
        key: item.value,
        label: (
          <span
            className={
              statusFilter === item.value ? 'font-semibold text-[#4f46e5]' : ''
            }
          >
            {item.label}
          </span>
        ),
      })),
    ],
    [statusFilter],
  );

  const columns = useMemo(() => {
    const schema = getVisibleColumns(nodeType);
    const dataColumns: ColumnsType<DisplayRow> = schema.map((column) => ({
      key: column.prop,
      dataIndex: column.prop,
      title:
        column.prop === 'city'
          ? renderFilterTitle(
              '所属城市',
              cityFilter,
              [
                {
                  key: '',
                  label: (
                    <span
                      className={
                        !cityFilter ? 'font-semibold text-[#4f46e5]' : ''
                      }
                    >
                      全部
                    </span>
                  ),
                },
                ...CITY_OPTIONS.map((item) => ({
                  key: item,
                  label: (
                    <span
                      className={
                        cityFilter === item
                          ? 'font-semibold text-[#4f46e5]'
                          : ''
                      }
                    >
                      {item}
                    </span>
                  ),
                })),
              ],
              onCityFilterChange,
            )
          : column.prop === 'organization'
            ? renderFilterTitle(
                '所属项目',
                organizationFilter,
                [
                  {
                    key: '',
                    label: (
                      <span
                        className={
                          !organizationFilter
                            ? 'font-semibold text-[#4f46e5]'
                            : ''
                        }
                      >
                        全部
                      </span>
                    ),
                  },
                  ...ORGANIZATION_OPTIONS.map((item) => ({
                    key: item,
                    label: (
                      <span
                        className={
                          organizationFilter === item
                            ? 'font-semibold text-[#4f46e5]'
                            : ''
                        }
                      >
                        {item}
                      </span>
                    ),
                  })),
                ],
                onOrganizationFilterChange,
              )
            : column.prop === 'status'
              ? renderFilterTitle(
                  '节点状态',
                  statusFilter,
                  statusFilterItems,
                  (key) => onStatusFilterChange(key as LitigationStatus | ''),
                  'bottom',
                )
              : column.label,
      minWidth: column.minWidth,
      align: column.align,
      ellipsis: true,
      render: (_, record) => renderCell(record, column),
    }));

    dataColumns.push({
      key: 'actions',
      title: '操作',
      width: 120,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <TableActions
          maxVisible={1}
          actions={[
            {
              key: 'detail',
              label: '查看详情',
              icon: <EyeOutlined />,
              onClick: () => onViewDetail(record),
            },
          ]}
        />
      ),
    });

    return dataColumns;
  }, [
    nodeType,
    cityFilter,
    organizationFilter,
    statusFilter,
    statusFilterItems,
    onCityFilterChange,
    onOrganizationFilterChange,
    onStatusFilterChange,
    onViewDetail,
  ]);

  const pagination: TablePaginationConfig = {
    current: pageNum,
    pageSize,
    total,
    showSizeChanger: true,
    showTotal: (value, range) =>
      total
        ? `当前显示 ${range[0]}-${range[1]} 条，共 ${value} 条`
        : '暂无数据',
    onChange: onPageChange,
  };

  return (
    <ProCard title="案件进展监控">
      <Table<DisplayRow>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        pagination={pagination}
        size="middle"
      />
    </ProCard>
  );
};

export default CaseMonitorTable;
