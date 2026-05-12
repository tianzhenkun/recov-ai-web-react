import {
  DeleteOutlined,
  DownloadOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Modal, message, Tag } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { addRuoyiDateRange } from '@/adapters/ruoyi/params';
import { PermissionButton } from '@/components/Permission';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { type RuoyiDictOption, useRuoyiDict } from '@/hooks/useRuoyiDict';
import {
  cleanLoginInfos,
  deleteLoginInfos,
  exportLoginInfos,
  type LoginInfoItem,
  type LoginInfoQuery,
  listLoginInfos,
  unlockLoginInfo,
} from '@/services/ruoyi/monitor-log';
import { toRuoyiDateRange } from '@/utils/ruoyiDate';

type LoginInfoSearchParams = {
  current?: number;
  pageSize?: number;
  ipaddr?: string;
  userName?: string;
  status?: string;
  loginTimeRange?: unknown;
};

type SortValue = 'ascend' | 'descend' | null | undefined;

const commonStatusFallback: RuoyiDictOption[] = [
  { label: '正常', value: '0', raw: { dictLabel: '正常', dictValue: '0' } },
  { label: '失败', value: '1', raw: { dictLabel: '失败', dictValue: '1' } },
];

const deviceTypeFallback: RuoyiDictOption[] = [
  { label: '电脑', value: 'pc', raw: { dictLabel: '电脑', dictValue: 'pc' } },
  {
    label: '手机',
    value: 'mobile',
    raw: { dictLabel: '手机', dictValue: 'mobile' },
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

const toLoginInfoQuery = (
  params: LoginInfoSearchParams,
  sorter?: Record<string, SortValue>,
): LoginInfoQuery =>
  addRuoyiDateRange(
    {
      pageNum: params.current || 1,
      pageSize: params.pageSize || 10,
      ipaddr: params.ipaddr,
      userName: params.userName,
      status: params.status,
      ...toSortParams(sorter, 'loginTime'),
    },
    toRuoyiDateRange(params.loginTimeRange),
  );

const LoginInfoPage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const latestQueryRef = useRef<LoginInfoQuery>({
    pageNum: 1,
    pageSize: 10,
    orderByColumn: 'loginTime',
    isAsc: 'descending',
  });
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [selectedRows, setSelectedRows] = useState<LoginInfoItem[]>([]);
  const [cleaning, setCleaning] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { options: statusOptions } = useRuoyiDict(
    'sys_common_status',
    commonStatusFallback,
  );
  const { options: deviceTypeOptions } = useRuoyiDict(
    'sys_device_type',
    deviceTypeFallback,
  );
  const openDeleteConfirm = useDeleteConfirm({ modal: modalApi, messageApi });
  const selectedIds = selectedRows
    .map((item) => item.infoId)
    .filter(Boolean) as (number | string)[];
  const statusLabelMap = useMemo(
    () =>
      new Map(
        statusOptions.map((option) => [String(option.value), option.label]),
      ),
    [statusOptions],
  );
  const deviceLabelMap = useMemo(
    () =>
      new Map(
        deviceTypeOptions.map((option) => [String(option.value), option.label]),
      ),
    [deviceTypeOptions],
  );

  const reloadTable = () => {
    setSelectedRows([]);
    actionRef.current?.reloadAndRest?.();
  };

  const confirmDelete = (records: LoginInfoItem[]) => {
    const ids = records.map((item) => item.infoId).filter(Boolean) as (
      | number
      | string
    )[];
    if (ids.length === 0) return;

    openDeleteConfirm({
      records,
      entityName: '登录日志',
      unit: '条',
      getName: (record) => record.infoId,
      description: '删除后，该登录日志将无法恢复。',
      batchDescription: '删除后，这些登录日志将无法恢复。',
      onConfirm: async () => {
        await deleteLoginInfos(ids);
      },
      onSuccess: reloadTable,
    });
  };

  const confirmClean = () => {
    modalApi.confirm({
      title: '清空登录日志',
      content: '确定清空所有登录日志吗？清空后数据将无法恢复。',
      okText: '确认清空',
      okButtonProps: { danger: true },
      cancelText: '取消',
      autoFocusButton: 'cancel',
      onOk: async () => {
        setCleaning(true);
        try {
          await cleanLoginInfos();
          messageApi.success('清空成功');
          reloadTable();
        } finally {
          setCleaning(false);
        }
      },
    });
  };

  const confirmUnlock = () => {
    const userName = selectedRows[0]?.userName;
    if (!userName) return;

    modalApi.confirm({
      title: '解锁用户',
      content: `确定解锁用户「${userName}」吗？`,
      okText: '确认解锁',
      cancelText: '取消',
      autoFocusButton: 'cancel',
      onOk: async () => {
        setUnlocking(true);
        try {
          await unlockLoginInfo(userName);
          messageApi.success(`用户 ${userName} 解锁成功`);
        } finally {
          setUnlocking(false);
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

  const columns: ProColumns<LoginInfoItem>[] = [
    {
      title: '登录地址',
      dataIndex: 'ipaddr',
      hideInTable: true,
    },
    {
      title: '用户名称',
      dataIndex: 'userName',
      ellipsis: true,
      sorter: true,
      width: 132,
    },
    {
      title: '客户端',
      dataIndex: 'clientKey',
      search: false,
      ellipsis: true,
      width: 120,
    },
    {
      title: '设备类型',
      dataIndex: 'deviceType',
      search: false,
      width: 112,
      render: (_, record) => {
        const value = String(record.deviceType ?? '');
        return <Tag>{deviceLabelMap.get(value) || value || '-'}</Tag>;
      },
    },
    {
      title: '地址',
      dataIndex: 'ipaddr',
      search: false,
      ellipsis: true,
      width: 136,
    },
    {
      title: '登录地点',
      dataIndex: 'loginLocation',
      search: false,
      ellipsis: true,
      width: 136,
    },
    {
      title: '操作系统',
      dataIndex: 'os',
      search: false,
      ellipsis: true,
      width: 136,
    },
    {
      title: '浏览器',
      dataIndex: 'browser',
      search: false,
      ellipsis: true,
      width: 132,
    },
    {
      title: '登录状态',
      dataIndex: 'status',
      valueType: 'select',
      fieldProps: { options: statusOptions },
      width: 112,
      render: (_, record) => renderStatusTag(record.status),
    },
    {
      title: '描述',
      dataIndex: 'msg',
      search: false,
      ellipsis: true,
      width: 180,
    },
    {
      title: '访问时间',
      dataIndex: 'loginTime',
      valueType: 'dateTime',
      search: false,
      sorter: true,
      defaultSortOrder: 'descend',
      width: 180,
    },
    {
      title: '登录时间',
      dataIndex: 'loginTimeRange',
      valueType: 'dateRange',
      hideInTable: true,
    },
  ];

  return (
    <PageContainer title="登录日志">
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<LoginInfoItem, LoginInfoSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.infoId)}
        search={{ labelWidth: 96 }}
        pagination={{ defaultPageSize: 10 }}
        columns={columns}
        request={async (params, sorter) => {
          const query = toLoginInfoQuery(
            params,
            sorter as Record<string, SortValue>,
          );
          latestQueryRef.current = query;
          const response = await listLoginInfos(query);
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
            permissions="monitor:logininfor:remove"
            disabled={selectedRows.length === 0}
            onClick={() => confirmDelete(selectedRows)}
          >
            删除
          </PermissionButton>,
          <PermissionButton
            key="clean"
            danger
            icon={<DeleteOutlined />}
            permissions="monitor:logininfor:remove"
            loading={cleaning}
            onClick={confirmClean}
          >
            清空
          </PermissionButton>,
          <PermissionButton
            key="unlock"
            icon={<UnlockOutlined />}
            permissions="monitor:logininfor:unlock"
            disabled={selectedRows.length !== 1}
            loading={unlocking}
            onClick={confirmUnlock}
          >
            解锁
          </PermissionButton>,
          <PermissionButton
            key="export"
            icon={<DownloadOutlined />}
            permissions="monitor:logininfor:export"
            loading={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await exportLoginInfos(latestQueryRef.current);
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
    </PageContainer>
  );
};

export default LoginInfoPage;
