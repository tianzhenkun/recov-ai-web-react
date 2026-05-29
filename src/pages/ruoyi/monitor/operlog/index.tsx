import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Descriptions, Modal, message, Tag, Typography } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { addRuoyiDateRange } from '@/adapters/ruoyi/params';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { type RuoyiDictOption, useRuoyiDict } from '@/hooks/useRuoyiDict';
import {
  cleanOperLogs,
  deleteOperLogs,
  exportOperLogs,
  listOperLogs,
  type OperLogItem,
  type OperLogQuery,
} from '@/services/ruoyi/monitor-log';
import { toRuoyiDateRange } from '@/utils/ruoyiDate';

type OperLogSearchParams = {
  current?: number;
  pageSize?: number;
  operIp?: string;
  title?: string;
  operName?: string;
  businessType?: string;
  status?: string;
  operTimeRange?: unknown;
};

type SortValue = 'ascend' | 'descend' | null | undefined;

const commonStatusFallback: RuoyiDictOption[] = [
  { label: '正常', value: '0', raw: { dictLabel: '正常', dictValue: '0' } },
  { label: '失败', value: '1', raw: { dictLabel: '失败', dictValue: '1' } },
];

const operTypeFallback: RuoyiDictOption[] = [
  { label: '其它', value: '0', raw: { dictLabel: '其它', dictValue: '0' } },
  { label: '新增', value: '1', raw: { dictLabel: '新增', dictValue: '1' } },
  { label: '修改', value: '2', raw: { dictLabel: '修改', dictValue: '2' } },
  { label: '删除', value: '3', raw: { dictLabel: '删除', dictValue: '3' } },
  { label: '授权', value: '4', raw: { dictLabel: '授权', dictValue: '4' } },
  { label: '导出', value: '5', raw: { dictLabel: '导出', dictValue: '5' } },
  { label: '导入', value: '6', raw: { dictLabel: '导入', dictValue: '6' } },
  { label: '强退', value: '7', raw: { dictLabel: '强退', dictValue: '7' } },
  {
    label: '生成代码',
    value: '8',
    raw: { dictLabel: '生成代码', dictValue: '8' },
  },
  {
    label: '清空数据',
    value: '9',
    raw: { dictLabel: '清空数据', dictValue: '9' },
  },
];

const toSortParams = (
  sorter: Record<string, SortValue> | undefined,
  defaultColumn: string,
) => {
  const activeSort = Object.entries(sorter || {}).find(([, order]) => order);
  const orderByColumn = activeSort?.[0] || defaultColumn;
  const isAsc = activeSort?.[1] === 'ascend' ? 'ascending' : 'descending';

  return { orderByColumn, isAsc };
};

const toOperLogQuery = (
  params: OperLogSearchParams,
  sorter?: Record<string, SortValue>,
): OperLogQuery => {
  const dateRange = toRuoyiDateRange(params.operTimeRange);
  return addRuoyiDateRange(
    {
      pageNum: params.current || 1,
      pageSize: params.pageSize || 10,
      operIp: params.operIp,
      title: params.title,
      operName: params.operName,
      businessType: params.businessType,
      status: params.status,
      ...toSortParams(sorter, 'operTime'),
    },
    dateRange,
  );
};

const formatJsonLikeText = (value?: string) => {
  if (!value) return '-';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

const OperLogPage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const latestQueryRef = useRef<OperLogQuery>({
    pageNum: 1,
    pageSize: 10,
    orderByColumn: 'operTime',
    isAsc: 'descending',
  });
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [selectedRows, setSelectedRows] = useState<OperLogItem[]>([]);
  const [detailRecord, setDetailRecord] = useState<OperLogItem>();
  const [cleaning, setCleaning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { options: operTypeOptions } = useRuoyiDict(
    'sys_oper_type',
    operTypeFallback,
  );
  const { options: statusOptions } = useRuoyiDict(
    'sys_common_status',
    commonStatusFallback,
  );
  const openDeleteConfirm = useDeleteConfirm({ modal: modalApi, messageApi });
  const selectedIds = selectedRows
    .map((item) => item.operId)
    .filter(Boolean) as (number | string)[];
  const operTypeLabelMap = useMemo(
    () =>
      new Map(
        operTypeOptions.map((option) => [String(option.value), option.label]),
      ),
    [operTypeOptions],
  );
  const statusLabelMap = useMemo(
    () =>
      new Map(
        statusOptions.map((option) => [String(option.value), option.label]),
      ),
    [statusOptions],
  );

  const reloadTable = () => {
    setSelectedRows([]);
    actionRef.current?.reloadAndRest?.();
  };

  const confirmDelete = (records: OperLogItem[]) => {
    const ids = records.map((item) => item.operId).filter(Boolean) as (
      | number
      | string
    )[];
    if (ids.length === 0) return;

    openDeleteConfirm({
      records,
      entityName: '操作日志',
      unit: '条',
      getName: (record) => record.operId,
      description: '删除后，该操作日志将无法恢复。',
      batchDescription: '删除后，这些操作日志将无法恢复。',
      onConfirm: async () => {
        await deleteOperLogs(ids);
      },
      onSuccess: reloadTable,
    });
  };

  const confirmClean = () => {
    modalApi.confirm({
      title: '清空操作日志',
      content: '确定清空所有操作日志吗？清空后数据将无法恢复。',
      okText: '确认清空',
      okButtonProps: { danger: true },
      cancelText: '取消',
      autoFocusButton: 'cancel',
      onOk: async () => {
        setCleaning(true);
        try {
          await cleanOperLogs();
          messageApi.success('清空成功');
          reloadTable();
        } finally {
          setCleaning(false);
        }
      },
    });
  };

  const renderStatusTag = (value: unknown) => {
    const status = String(value ?? '');
    return (
      <Tag color={status === '0' ? 'success' : 'error'}>
        {statusLabelMap.get(status) || (status === '0' ? '正常' : '失败')}
      </Tag>
    );
  };

  const columns: ProColumns<OperLogItem>[] = [
    {
      title: '操作地址',
      dataIndex: 'operIp',
      hideInTable: true,
    },
    {
      title: '系统模块',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '操作人员',
      dataIndex: 'operName',
      ellipsis: true,
      sorter: true,
      width: 120,
    },
    {
      title: '操作类型',
      dataIndex: 'businessType',
      valueType: 'select',
      fieldProps: { options: operTypeOptions },
      width: 120,
      render: (_, record) => {
        const value = String(record.businessType ?? '');
        return <Tag>{operTypeLabelMap.get(value) || value || '-'}</Tag>;
      },
    },
    {
      title: '部门',
      dataIndex: 'deptName',
      search: false,
      ellipsis: true,
      width: 140,
    },
    {
      title: '操作地址',
      dataIndex: 'operIp',
      search: false,
      ellipsis: true,
      width: 140,
    },
    {
      title: '操作状态',
      dataIndex: 'status',
      valueType: 'select',
      fieldProps: { options: statusOptions },
      width: 112,
      render: (_, record) => renderStatusTag(record.status),
    },
    {
      title: '操作日期',
      dataIndex: 'operTime',
      valueType: 'dateTime',
      search: false,
      sorter: true,
      defaultSortOrder: 'descend',
      width: 180,
    },
    {
      title: '操作时间',
      dataIndex: 'operTimeRange',
      valueType: 'dateRange',
      hideInTable: true,
    },
    {
      title: '消耗时间',
      dataIndex: 'costTime',
      search: false,
      sorter: true,
      width: 112,
      renderText: (value) =>
        value === undefined || value === null ? '-' : `${value}毫秒`,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 72,
      render: (_, record) => (
        <TableActions
          maxVisible={1}
          actions={[
            {
              key: 'view',
              label: '详细',
              icon: <EyeOutlined />,
              permissions: 'monitor:operlog:query',
              onClick: () => setDetailRecord(record),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer title="操作日志">
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<OperLogItem, OperLogSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.operId)}
        search={{ labelWidth: 96 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total: number) => `共 ${total} 条`,
        }}
        columns={columns}
        request={async (params, sorter) => {
          const query = toOperLogQuery(
            params,
            sorter as Record<string, SortValue>,
          );
          latestQueryRef.current = query;
          const response = await listOperLogs(query);
          return {
            data: response.rows || [],
            total: response.total || 0,
            success: true,
          };
        }}
        rowSelection={{
          selectedRowKeys: selectedIds.map(String),
          onChange: (_, rows) => setSelectedRows(rows),
        }}
        toolBarRender={() => [
          <PermissionButton
            key="delete"
            danger
            icon={<DeleteOutlined />}
            permissions="monitor:operlog:remove"
            disabled={selectedRows.length === 0}
            onClick={() => confirmDelete(selectedRows)}
          >
            删除
          </PermissionButton>,
          <PermissionButton
            key="clean"
            danger
            icon={<DeleteOutlined />}
            permissions="monitor:operlog:remove"
            loading={cleaning}
            onClick={confirmClean}
          >
            清空
          </PermissionButton>,
          <PermissionButton
            key="export"
            icon={<DownloadOutlined />}
            permissions="monitor:operlog:export"
            loading={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await exportOperLogs(latestQueryRef.current);
                messageApi.success('导出任务已开始');
              } finally {
                setExporting(false);
              }
            }}
          >
            导出
          </PermissionButton>,
        ]}
      />
      <Modal
        title="操作日志详细"
        open={!!detailRecord}
        width={760}
        destroyOnHidden
        footer={null}
        onCancel={() => setDetailRecord(undefined)}
      >
        {detailRecord && (
          <Descriptions
            bordered
            column={1}
            size="small"
            labelStyle={{ width: 112 }}
          >
            <Descriptions.Item label="操作状态">
              {renderStatusTag(detailRecord.status)}
            </Descriptions.Item>
            <Descriptions.Item label="登录信息">
              {[
                detailRecord.operName,
                detailRecord.deptName,
                detailRecord.operIp,
                detailRecord.operLocation,
              ]
                .filter(Boolean)
                .join(' / ') || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="请求信息">
              {[detailRecord.requestMethod, detailRecord.operUrl]
                .filter(Boolean)
                .join(' ') || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="操作模块">
              {detailRecord.title || '-'} /{' '}
              {operTypeLabelMap.get(String(detailRecord.businessType ?? '')) ||
                detailRecord.businessType ||
                '-'}
            </Descriptions.Item>
            <Descriptions.Item label="操作方法">
              <Typography.Text code>
                {detailRecord.method || '-'}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="请求参数">
              <pre style={{ margin: 0, maxHeight: 240, overflow: 'auto' }}>
                {formatJsonLikeText(detailRecord.operParam)}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="返回参数">
              <pre style={{ margin: 0, maxHeight: 240, overflow: 'auto' }}>
                {formatJsonLikeText(detailRecord.jsonResult)}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="消耗时间">
              {detailRecord.costTime ?? '-'}ms
            </Descriptions.Item>
            <Descriptions.Item label="操作时间">
              {detailRecord.operTime || '-'}
            </Descriptions.Item>
            {String(detailRecord.status) === '1' && (
              <Descriptions.Item label="异常信息">
                <Typography.Text type="danger">
                  {detailRecord.errorMsg || '-'}
                </Typography.Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
};

export default OperLogPage;
