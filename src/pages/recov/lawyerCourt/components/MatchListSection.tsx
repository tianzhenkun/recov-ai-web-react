import {
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  Button,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useMemo } from 'react';
import TableActions from '@/components/TableActions';
import {
  RECOV_FILTER_CONTROL_STYLE,
  RECOV_LIST_COLUMN_WIDTH,
  RECOV_ORGANIZATION_POPUP_WIDTH,
  renderRecovSelectOptionLabel,
  renderRecovSingleLineText,
} from '@/pages/recov/components/RecovFilterControls';
import { RecovTableCard } from '@/pages/recov/components/RecovListLayout';
import {
  formatCompactCurrencyDisplay,
  formatCurrencyDisplay,
} from '@/pages/recov/settle/_shared';
import type {
  LawyerCourtTab,
  MatchedLawyerRowVO,
  UnmatchedCaseRowVO,
} from '@/services/ruoyi/lawyer-court';
import { TAB_OPTIONS } from '../_shared';

const { Text } = Typography;

type MatchListSectionProps = {
  tab: LawyerCourtTab;
  matchedRows: MatchedLawyerRowVO[];
  unmatchedRows: UnmatchedCaseRowVO[];
  total: number;
  pageNum: number;
  pageSize: number;
  loading?: boolean;
  cityFilter: string;
  projectFilter: string;
  cityOptions: { label: string; value: string }[];
  projectOptions: { label: string; value: string }[];
  onTabChange: (tab: LawyerCourtTab) => void;
  onCityFilterChange: (city: string) => void;
  onProjectFilterChange: (project: string) => void;
  onPageChange: (pageNum: number, pageSize: number) => void;
  onViewLawyer: (row: MatchedLawyerRowVO) => void;
  onReplaceLawyer: (row: MatchedLawyerRowVO) => void;
  onWithdrawCase: (row: UnmatchedCaseRowVO) => void;
  onExportUnmatched: () => void;
};

const renderMoney = (value: unknown) => {
  const primary = formatCompactCurrencyDisplay(value);
  const full = formatCurrencyDisplay(value);
  const hasTooltip = full !== primary;
  const node = (
    <Text strong style={{ fontSize: 12 }}>
      {primary}
    </Text>
  );
  return hasTooltip ? <Tooltip title={full}>{node}</Tooltip> : node;
};

const MatchListSection = ({
  tab,
  matchedRows,
  unmatchedRows,
  total,
  pageNum,
  pageSize,
  loading,
  cityFilter,
  projectFilter,
  cityOptions,
  projectOptions,
  onTabChange,
  onCityFilterChange,
  onProjectFilterChange,
  onPageChange,
  onViewLawyer,
  onReplaceLawyer,
  onWithdrawCase,
  onExportUnmatched,
}: MatchListSectionProps) => {
  const matchedColumns: ColumnsType<MatchedLawyerRowVO> = useMemo(
    () => [
      {
        title: '资产编号',
        dataIndex: 'assetNo',
        width: RECOV_LIST_COLUMN_WIDTH.debtNumber,
        ellipsis: { showTitle: false },
        render: renderRecovSingleLineText,
      },
      {
        title: '城市',
        dataIndex: 'city',
        width: RECOV_LIST_COLUMN_WIDTH.city,
      },
      {
        title: '项目',
        dataIndex: 'project',
        width: RECOV_LIST_COLUMN_WIDTH.organization,
        ellipsis: { showTitle: false },
        render: renderRecovSingleLineText,
      },
      {
        title: '案号',
        dataIndex: 'caseNo',
        width: 200,
        ellipsis: true,
      },
      {
        title: '业主姓名',
        dataIndex: 'ownerName',
        width: 88,
      },
      {
        title: '涉案金额',
        dataIndex: 'amount',
        width: 120,
        align: 'right',
        render: (value) => renderMoney(value),
      },
      {
        title: '律师',
        dataIndex: 'lawyerName',
        width: 96,
        render: (_, row) => (
          <Space size={4}>
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: '#1677ff14', color: '#1677ff' }}
            >
              {row.lawyerName.slice(0, 1)}
            </span>
            <Text strong style={{ fontSize: 12 }}>
              {row.lawyerName}
            </Text>
          </Space>
        ),
      },
      {
        title: '律所',
        dataIndex: 'firm',
        width: 140,
        ellipsis: true,
      },
      {
        title: '评分',
        dataIndex: 'rating',
        width: 72,
        render: (value) => <Tag color="gold">{value}</Tag>,
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 88,
        render: (value) => <Tag color="success">{value}</Tag>,
      },
      {
        title: '操作',
        key: 'actions',
        fixed: 'right',
        width: 140,
        align: 'left',
        render: (_, row) => (
          <TableActions
            actions={[
              {
                key: 'view',
                label: '查看律师',
                icon: <EyeOutlined />,
                onClick: () => onViewLawyer(row),
              },
              {
                key: 'replace',
                label: '重新匹配',
                icon: <ReloadOutlined />,
                onClick: () => onReplaceLawyer(row),
              },
            ]}
          />
        ),
      },
    ],
    [onViewLawyer, onReplaceLawyer],
  );

  const unmatchedColumns: ColumnsType<UnmatchedCaseRowVO> = useMemo(
    () => [
      {
        title: '资产编号',
        dataIndex: 'assetNo',
        width: RECOV_LIST_COLUMN_WIDTH.debtNumber,
        ellipsis: { showTitle: false },
        render: renderRecovSingleLineText,
      },
      {
        title: '城市',
        dataIndex: 'city',
        width: RECOV_LIST_COLUMN_WIDTH.city,
      },
      {
        title: '项目',
        dataIndex: 'project',
        width: RECOV_LIST_COLUMN_WIDTH.organization,
        ellipsis: { showTitle: false },
        render: renderRecovSingleLineText,
      },
      {
        title: '案号',
        dataIndex: 'caseNo',
        width: 200,
        ellipsis: true,
      },
      {
        title: '业主姓名',
        dataIndex: 'ownerName',
        width: 88,
      },
      {
        title: '涉案金额',
        dataIndex: 'amount',
        width: 120,
        align: 'right',
        render: (value) => renderMoney(value),
      },
      {
        title: '区域',
        dataIndex: 'region',
        width: 96,
      },
      {
        title: '未匹配原因',
        dataIndex: 'unmatchReason',
        width: 180,
        ellipsis: true,
        render: (value) => <Tag color="error">{value}</Tag>,
      },
      {
        title: '操作',
        key: 'actions',
        fixed: 'right',
        width: 100,
        align: 'left',
        render: (_, row) => (
          <Popconfirm
            title="确认一键撤诉？"
            description={`案件 ${row.caseNo}（业主 ${row.ownerName}）将发起撤诉流程，撤诉后该案件将不再进入代开庭匹配队列，且不可自动恢复。`}
            okText="确认撤诉"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => onWithdrawCase(row)}
          >
            <Button type="link" size="small" danger icon={<StopOutlined />}>
              一键撤诉
            </Button>
          </Popconfirm>
        ),
      },
    ],
    [onWithdrawCase],
  );

  const pagination: TablePaginationConfig = {
    current: pageNum,
    pageSize,
    total,
    showSizeChanger: true,
    showTotal: (count) => `共 ${count} 条`,
    onChange: onPageChange,
  };

  const listCardStyles = {
    body: {
      padding: 0,
    },
  };

  return (
    <RecovTableCard size="small" styles={listCardStyles}>
      <div className="flex flex-col gap-3 border-b border-[#f0f0f0] px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            options={TAB_OPTIONS}
            value={tab}
            onChange={(value) => onTabChange(value as LawyerCourtTab)}
          />
          <Space wrap>
            <Select
              allowClear
              placeholder="城市"
              showSearch
              optionFilterProp="label"
              style={RECOV_FILTER_CONTROL_STYLE}
              options={cityOptions}
              value={cityFilter || undefined}
              onChange={(value) => onCityFilterChange(value || '')}
            />
            <Select
              allowClear
              placeholder="项目"
              showSearch
              optionFilterProp="label"
              optionRender={(option) =>
                renderRecovSelectOptionLabel(option.label)
              }
              popupMatchSelectWidth={RECOV_ORGANIZATION_POPUP_WIDTH}
              style={RECOV_FILTER_CONTROL_STYLE}
              options={projectOptions}
              value={projectFilter || undefined}
              onChange={(value) => onProjectFilterChange(value || '')}
            />
            {tab === 'unmatched' ? (
              <Button icon={<DownloadOutlined />} onClick={onExportUnmatched}>
                导出未匹配案件
              </Button>
            ) : null}
          </Space>
        </div>
      </div>

      {tab === 'matched' ? (
        <Table<MatchedLawyerRowVO>
          className="recov-stable-pagination-table"
          rowKey="id"
          size="small"
          loading={loading}
          columns={matchedColumns}
          dataSource={matchedRows}
          scroll={{ x: 1280 }}
          pagination={pagination}
        />
      ) : (
        <Table<UnmatchedCaseRowVO>
          className="recov-stable-pagination-table"
          rowKey="id"
          size="small"
          loading={loading}
          columns={unmatchedColumns}
          dataSource={unmatchedRows}
          scroll={{ x: 1180 }}
          pagination={pagination}
        />
      )}
    </RecovTableCard>
  );
};

export default MatchListSection;
