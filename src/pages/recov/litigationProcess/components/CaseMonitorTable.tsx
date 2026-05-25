import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Form, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useEffect, useMemo } from 'react';
import TableActions from '@/components/TableActions';
import { RecovTableCard } from '@/pages/recov/components/RecovListLayout';
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
  onFilterSearch: (filters: {
    city: string;
    organization: string;
    status: LitigationStatus | '';
  }) => void;
  onFilterReset: () => void;
  onPageChange: (pageNum: number, pageSize: number) => void;
  onViewDetail: (row: DisplayRow) => void;
};

type FilterFormValues = {
  city?: string;
  organization?: string;
  status?: LitigationStatus;
};

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
  onFilterSearch,
  onFilterReset,
  onPageChange,
  onViewDetail,
}: CaseMonitorTableProps) => {
  const [form] = Form.useForm<FilterFormValues>();

  useEffect(() => {
    form.setFieldsValue({
      city: cityFilter || undefined,
      organization: organizationFilter || undefined,
      status: statusFilter || undefined,
    });
  }, [cityFilter, form, organizationFilter, statusFilter]);

  const handleSearch = (values: FilterFormValues) => {
    onFilterSearch({
      city: values.city || '',
      organization: values.organization || '',
      status: values.status || '',
    });
  };

  const handleReset = () => {
    form.resetFields();
    onFilterReset();
  };

  const columns = useMemo(() => {
    const schema = getVisibleColumns(nodeType);
    const dataColumns: ColumnsType<DisplayRow> = schema.map((column) => ({
      key: column.prop,
      dataIndex: column.prop,
      title: column.label,
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
  }, [nodeType, onViewDetail]);

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
    <RecovTableCard title="案件进展监控">
      <Form
        form={form}
        initialValues={{
          city: cityFilter || undefined,
          organization: organizationFilter || undefined,
          status: statusFilter || undefined,
        }}
        onFinish={handleSearch}
        className="recov-table-toolbar"
      >
        <Space wrap size={12}>
          <Form.Item name="city" noStyle>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="所属城市"
              style={{ width: 160 }}
              options={CITY_OPTIONS.map((city) => ({
                label: city,
                value: city,
              }))}
            />
          </Form.Item>
          <Form.Item name="organization" noStyle>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="所属项目"
              style={{ width: 200 }}
              options={ORGANIZATION_OPTIONS.map((organization) => ({
                label: organization,
                value: organization,
              }))}
            />
          </Form.Item>
          <Form.Item name="status" noStyle>
            <Select
              allowClear
              placeholder="节点状态"
              style={{ width: 140 }}
              options={LITIGATION_STATUS_FILTER_OPTIONS}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Form>
      <Table<DisplayRow>
        className="recov-stable-pagination-table"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        pagination={pagination}
        size="middle"
      />
    </RecovTableCard>
  );
};

export default CaseMonitorTable;
