import {
  EyeOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import React, { useEffect, useMemo } from 'react';
import TableActions from '@/components/TableActions';
import { getFlowActionIcon } from '@/pages/recov/components/FlowActionIcon';
import {
  RECOV_FILTER_CONTROL_STYLE,
  RECOV_ORGANIZATION_POPUP_WIDTH,
  renderRecovSelectOptionLabel,
} from '@/pages/recov/components/RecovFilterControls';
import { RecovTableCard } from '@/pages/recov/components/RecovListLayout';
import type { LitigationNodeType } from '@/services/ruoyi/litigation-process';
import {
  CITY_OPTIONS,
  type ColumnSchema,
  type DisplayRow,
  formatDebtNumber,
  formatDisplayMoney,
  formatText,
  getCourtStatusColor,
  getFeeStatusColor,
  getFeeStatusLabel,
  getLitigationStatusColor,
  getLitigationStatusLabel,
  getOverdueDaysColor,
  getRemainDaysColor,
  getVisibleColumns,
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
  debtNumberFilter: string;
  cityFilter: string;
  organizationFilter: string;
  onFilterSearch: (filters: {
    debtNumber: string;
    city: string;
    organization: string;
  }) => void;
  onFilterReset: () => void;
  onPageChange: (pageNum: number, pageSize: number) => void;
  onViewDetail: (row: DisplayRow) => void;
  onViewMaterials: (row: DisplayRow) => void;
  onViewFlow: (row: DisplayRow) => void;
};

type FilterFormValues = {
  debtNumber?: string;
  city?: string;
  organization?: string;
};

const formatFailureSummary = (value: unknown) => {
  const text = formatText(value, '');
  if (!text) return '';
  if (/账号|用户名|密码|lawyer/i.test(text)) return '立案账号配置异常';
  if (/印章|seal/i.test(text)) return '印章配置异常';
  if (/未找到|缺少|不存在|未配置/.test(text)) return '必要配置缺失';
  return '节点执行失败';
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
  const fallback = column.blankWhenEmpty ? '' : '-';

  switch (column.type) {
    case 'asset':
      return formatDebtNumber(row.debtNumber);
    case 'money':
      return (
        <Text strong style={{ fontSize: 12 }}>
          {formatDisplayMoney(value)}
        </Text>
      );
    case 'days':
      return Number(value) > 0 ? (
        <Tag color={getOverdueDaysColor(Number(value))}>{`${value} 天`}</Tag>
      ) : (
        '-'
      );
    case 'status':
      return (
        <Tag color={getLitigationStatusColor(row.status)}>
          {getLitigationStatusLabel(row.status)}
        </Tag>
      );
    case 'courtStatus': {
      const statusText = row._result?.courtStatusRaw;
      const statusCode = row._result?.courtStatusCode;
      const text = formatText(statusText || statusCode, fallback);
      if (!text) return null;
      return <Tag color={getCourtStatusColor(statusCode)}>{text}</Tag>;
    }
    case 'failure': {
      const summary = formatFailureSummary(value);
      return summary ? <Tag color="error">{summary}</Tag> : null;
    }
    case 'party':
      return (
        <Text strong style={{ fontSize: 12 }}>
          {row.debtorName}
        </Text>
      );
    case 'mono':
      return formatText(value, fallback) ? (
        <Text code>{formatText(value, fallback)}</Text>
      ) : null;
    default: {
      const text = formatText(value, fallback);
      return text ? <Text style={{ fontSize: 12 }}>{text}</Text> : null;
    }
  }
};

const normalizeFlowId = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const canShowFlowDetail = (row: DisplayRow) =>
  Boolean(normalizeFlowId(row.flowId)) && row.status !== '2';

const CaseMonitorTable = ({
  nodeType,
  rows,
  total,
  pageNum,
  pageSize,
  loading,
  debtNumberFilter,
  cityFilter,
  organizationFilter,
  onFilterSearch,
  onFilterReset,
  onPageChange,
  onViewDetail,
  onViewMaterials,
  onViewFlow,
}: CaseMonitorTableProps) => {
  const [form] = Form.useForm<FilterFormValues>();

  useEffect(() => {
    form.setFieldsValue({
      debtNumber: debtNumberFilter || undefined,
      city: cityFilter || undefined,
      organization: organizationFilter || undefined,
    });
  }, [cityFilter, debtNumberFilter, form, organizationFilter]);

  const handleSearch = (values: FilterFormValues) => {
    onFilterSearch({
      debtNumber: values.debtNumber?.trim() || '',
      city: values.city || '',
      organization: values.organization || '',
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
      width: 128,
      fixed: 'right',
      align: 'left',
      render: (_, record) => (
        <TableActions
          maxVisible={2}
          actions={[
            {
              key: 'detail',
              label: '查看详情',
              icon: <EyeOutlined />,
              onClick: () => onViewDetail(record),
            },
            {
              key: 'materials',
              label: '立案材料',
              icon: <FileSearchOutlined />,
              onClick: () => onViewMaterials(record),
            },
            ...(canShowFlowDetail(record)
              ? [
                  {
                    key: 'flow',
                    label: record.status === '3' ? '处理异常' : '查看进度',
                    icon: getFlowActionIcon(record.status === '3'),
                    onClick: () => onViewFlow(record),
                  },
                ]
              : []),
          ]}
        />
      ),
    });

    return dataColumns;
  }, [nodeType, onViewDetail, onViewFlow, onViewMaterials]);

  const pagination: TablePaginationConfig = {
    current: pageNum,
    pageSize,
    total,
    showSizeChanger: true,
    showTotal: (value) => `共 ${value} 条`,
    onChange: onPageChange,
  };

  return (
    <RecovTableCard title="案件进展监控">
      <Form
        form={form}
        initialValues={{
          city: cityFilter || undefined,
          debtNumber: debtNumberFilter || undefined,
          organization: organizationFilter || undefined,
        }}
        onFinish={handleSearch}
        className="recov-table-toolbar"
      >
        <Space wrap size={12}>
          <Form.Item name="debtNumber" noStyle>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="资产编号"
              style={RECOV_FILTER_CONTROL_STYLE}
            />
          </Form.Item>
          <Form.Item name="city" noStyle>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="所属城市"
              style={RECOV_FILTER_CONTROL_STYLE}
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
              options={ORGANIZATION_OPTIONS.map((organization) => ({
                label: organization,
                value: organization,
              }))}
              optionRender={(option) =>
                renderRecovSelectOptionLabel(option.label)
              }
              popupMatchSelectWidth={RECOV_ORGANIZATION_POPUP_WIDTH}
              style={RECOV_FILTER_CONTROL_STYLE}
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
