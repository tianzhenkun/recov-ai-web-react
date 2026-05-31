import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { Modal, message, Switch, Tag, Tooltip, Typography } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { type RuoyiDictOption, useRuoyiDict } from '@/hooks/useRuoyiDict';
import {
  addClient,
  type ClientForm,
  type ClientItem,
  type ClientQuery,
  changeClientStatus,
  deleteClients,
  exportClients,
  getClient,
  listClients,
  updateClient,
} from '@/services/ruoyi/client';

type ClientSearchParams = {
  current?: number;
  pageSize?: number;
  clientKey?: string;
  clientSecret?: string;
  status?: string;
};

const statusFallback: RuoyiDictOption[] = [
  { label: '正常', value: '0', raw: { dictLabel: '正常', dictValue: '0' } },
  { label: '停用', value: '1', raw: { dictLabel: '停用', dictValue: '1' } },
];

const grantTypeFallback: RuoyiDictOption[] = [
  {
    label: '授权码',
    value: 'authorization_code',
    raw: { dictLabel: '授权码', dictValue: 'authorization_code' },
  },
  {
    label: '密码模式',
    value: 'password',
    raw: { dictLabel: '密码模式', dictValue: 'password' },
  },
  {
    label: '客户端模式',
    value: 'client_credentials',
    raw: { dictLabel: '客户端模式', dictValue: 'client_credentials' },
  },
  {
    label: '刷新令牌',
    value: 'refresh_token',
    raw: { dictLabel: '刷新令牌', dictValue: 'refresh_token' },
  },
];

const deviceTypeFallback: RuoyiDictOption[] = [
  { label: '电脑', value: 'pc', raw: { dictLabel: '电脑', dictValue: 'pc' } },
  {
    label: '手机',
    value: 'mobile',
    raw: { dictLabel: '手机', dictValue: 'mobile' },
  },
];

const toClientQuery = (params: ClientSearchParams): ClientQuery => ({
  pageNum: params.current || 1,
  pageSize: params.pageSize || 10,
  clientKey: params.clientKey,
  clientSecret: params.clientSecret,
  status: params.status,
});

const toClientPayload = (
  record: ClientForm | undefined,
  values: ClientForm,
): ClientForm => {
  const merged = { ...(record || {}), ...values };
  return {
    id: merged.id,
    clientId: merged.clientId,
    clientKey: merged.clientKey,
    clientSecret: merged.clientSecret,
    grantTypeList: merged.grantTypeList,
    deviceType: merged.deviceType,
    activeTimeout: merged.activeTimeout,
    timeout: merged.timeout,
    status: merged.status,
  };
};

const ClientPage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const latestQueryRef = useRef<ClientQuery>({ pageNum: 1, pageSize: 10 });
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [selectedRows, setSelectedRows] = useState<ClientItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ClientForm>();
  const [exporting, setExporting] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState<string>();
  const { options: statusOptions } = useRuoyiDict(
    'sys_normal_disable',
    statusFallback,
  );
  const { options: grantTypeOptions } = useRuoyiDict(
    'sys_grant_type',
    grantTypeFallback,
  );
  const { options: deviceTypeOptions } = useRuoyiDict(
    'sys_device_type',
    deviceTypeFallback,
  );
  const openDeleteConfirm = useDeleteConfirm({ modal: modalApi, messageApi });
  const selectedIds = selectedRows.map((item) => item.id).filter(Boolean) as (
    | number
    | string
  )[];
  const statusLabelMap = useMemo(
    () =>
      new Map(
        statusOptions.map((option) => [String(option.value), option.label]),
      ),
    [statusOptions],
  );
  const grantTypeLabelMap = useMemo(
    () =>
      new Map(
        grantTypeOptions.map((option) => [String(option.value), option.label]),
      ),
    [grantTypeOptions],
  );
  const deviceTypeLabelMap = useMemo(
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

  const openCreateForm = () => {
    setEditingRecord({
      status: '0',
      activeTimeout: 1800,
      timeout: 604800,
    });
    setFormOpen(true);
  };

  const openUpdateForm = async (record: ClientItem) => {
    if (!record.id) return;
    setFormLoading(true);
    try {
      const response = await getClient(record.id);
      setEditingRecord({
        ...record,
        ...response.data,
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (records: ClientItem[]) => {
    const ids = records.map((item) => item.id).filter(Boolean) as (
      | number
      | string
    )[];
    if (ids.length === 0) return;

    openDeleteConfirm({
      records,
      entityName: '客户端',
      unit: '个',
      getName: (record) => record.clientKey || record.clientId || record.id,
      description: '删除后，该客户端将无法继续用于认证授权。',
      batchDescription: '删除后，这些客户端将无法继续用于认证授权。',
      onConfirm: async () => {
        await deleteClients(ids);
      },
      onSuccess: reloadTable,
    });
  };

  const confirmStatusChange = (record: ClientItem, checked: boolean) => {
    if (!record.clientId) return;
    const clientId = record.clientId;
    const nextStatus = checked ? '0' : '1';
    const text = nextStatus === '0' ? '启用' : '停用';

    modalApi.confirm({
      title: `${text}客户端`,
      content: `确认要${text}客户端「${record.clientKey || clientId}」吗？`,
      okText: `确认${text}`,
      cancelText: '取消',
      autoFocusButton: 'cancel',
      onOk: async () => {
        setStatusChangingId(String(clientId));
        try {
          await changeClientStatus(clientId, nextStatus);
          messageApi.success(`${text}成功`);
          actionRef.current?.reload?.();
        } finally {
          setStatusChangingId(undefined);
        }
      },
    });
  };

  const renderStatusTag = (value: unknown) => {
    const status = String(value ?? '');
    return (
      <Tag color={status === '0' ? 'success' : 'default'}>
        {statusLabelMap.get(status) || (status === '0' ? '正常' : '停用')}
      </Tag>
    );
  };

  const columns: ProColumns<ClientItem>[] = [
    {
      title: '客户端Key',
      dataIndex: 'clientKey',
      ellipsis: true,
      width: 160,
    },
    {
      title: '客户端秘钥',
      dataIndex: 'clientSecret',
      ellipsis: true,
      width: 180,
      render: (_, record) =>
        record.clientSecret ? (
          <Typography.Text copyable ellipsis>
            {record.clientSecret}
          </Typography.Text>
        ) : (
          '-'
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      fieldProps: { options: statusOptions },
      width: 104,
      render: (_, record) => renderStatusTag(record.status),
    },
    {
      title: 'ID',
      dataIndex: 'id',
      search: false,
      width: 96,
      align: 'center',
    },
    {
      title: '客户端ID',
      dataIndex: 'clientId',
      search: false,
      ellipsis: true,
      width: 160,
    },
    {
      title: '授权类型',
      dataIndex: 'grantTypeList',
      search: false,
      width: 180,
      render: (_, record) => {
        const values = record.grantTypeList || [];
        return values.length > 0
          ? values.map((value) => (
              <Tag key={value}>
                {grantTypeLabelMap.get(String(value)) || value}
              </Tag>
            ))
          : '-';
      },
    },
    {
      title: '设备类型',
      dataIndex: 'deviceType',
      search: false,
      width: 112,
      render: (_, record) => {
        const value = String(record.deviceType ?? '');
        return <Tag>{deviceTypeLabelMap.get(value) || value || '-'}</Tag>;
      },
    },
    {
      title: 'Token活跃超时',
      dataIndex: 'activeTimeout',
      search: false,
      width: 136,
      renderText: (value) =>
        value === undefined || value === null ? '-' : `${value}秒`,
    },
    {
      title: 'Token固定超时',
      dataIndex: 'timeout',
      search: false,
      width: 136,
      renderText: (value) =>
        value === undefined || value === null ? '-' : `${value}秒`,
    },
    {
      title: '启用状态',
      dataIndex: 'statusSwitch',
      search: false,
      width: 104,
      render: (_, record) => (
        <Switch
          checked={record.status === '0'}
          checkedChildren="正常"
          unCheckedChildren="停用"
          loading={statusChangingId === String(record.clientId)}
          onChange={(checked) => confirmStatusChange(record, checked)}
        />
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 96,
      align: 'left',
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'edit',
              label: '修改',
              icon: <EditOutlined />,
              permissions: 'system:client:edit',
              onClick: () => openUpdateForm(record),
            },
            {
              key: 'delete',
              label: '删除',
              danger: true,
              icon: <DeleteOutlined />,
              permissions: 'system:client:remove',
              onClick: () => confirmDelete([record]),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer title="客户端管理">
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<ClientItem, ClientSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.id)}
        search={{ labelWidth: 96 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total: number) => `共 ${total} 条`,
        }}
        scroll={{ x: 1500 }}
        columns={columns}
        request={async (params) => {
          const query = toClientQuery(params);
          latestQueryRef.current = query;
          const response = await listClients(query);
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
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            permissions="system:client:add"
            onClick={openCreateForm}
          >
            新增
          </PermissionButton>,
          <PermissionButton
            key="edit"
            icon={<EditOutlined />}
            permissions="system:client:edit"
            disabled={selectedRows.length !== 1}
            onClick={() => openUpdateForm(selectedRows[0])}
          >
            修改
          </PermissionButton>,
          <PermissionButton
            key="delete"
            danger
            icon={<DeleteOutlined />}
            permissions="system:client:remove"
            disabled={selectedRows.length === 0}
            onClick={() => confirmDelete(selectedRows)}
          >
            删除
          </PermissionButton>,
          <PermissionButton
            key="export"
            icon={<DownloadOutlined />}
            permissions="system:client:export"
            loading={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await exportClients(latestQueryRef.current);
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
      <ModalForm<ClientForm>
        key={editingRecord?.id || 'create'}
        title={editingRecord?.id ? '修改客户端管理' : '添加客户端管理'}
        open={formOpen}
        loading={formLoading}
        initialValues={editingRecord}
        modalProps={{
          destroyOnHidden: true,
          width: 560,
          onCancel: () => {
            setFormOpen(false);
            setEditingRecord(undefined);
          },
        }}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingRecord(undefined);
          }
        }}
        onFinish={async (values) => {
          const payload = toClientPayload(editingRecord, values);
          if (editingRecord?.id) {
            await updateClient(payload);
          } else {
            await addClient(payload);
          }
          messageApi.success('操作成功');
          reloadTable();
          return true;
        }}
      >
        <ProFormText
          name="clientKey"
          label="客户端Key"
          placeholder="请输入客户端key"
          disabled={Boolean(editingRecord?.id)}
          rules={[{ required: true, message: '客户端key不能为空' }]}
        />
        <ProFormText
          name="clientSecret"
          label="客户端秘钥"
          placeholder="请输入客户端秘钥"
          disabled={Boolean(editingRecord?.id)}
          rules={[{ required: true, message: '客户端秘钥不能为空' }]}
        />
        <ProFormSelect
          name="grantTypeList"
          label="授权类型"
          placeholder="请选择授权类型"
          mode="multiple"
          options={grantTypeOptions}
          rules={[{ required: true, message: '授权类型不能为空' }]}
        />
        <ProFormSelect
          name="deviceType"
          label="设备类型"
          placeholder="请选择设备类型"
          options={deviceTypeOptions}
          rules={[{ required: true, message: '设备类型不能为空' }]}
        />
        <ProFormDigit
          name="activeTimeout"
          label={
            <span>
              <Tooltip title="指定时间无操作则过期（单位：秒），默认30分钟（1800秒）">
                <QuestionCircleOutlined />
              </Tooltip>{' '}
              Token活跃超时时间
            </span>
          }
          min={0}
          fieldProps={{ precision: 0 }}
          placeholder="请输入Token活跃超时时间"
        />
        <ProFormDigit
          name="timeout"
          label={
            <span>
              <Tooltip title="指定时间必定过期（单位：秒），默认七天（604800秒）">
                <QuestionCircleOutlined />
              </Tooltip>{' '}
              Token固定超时时间
            </span>
          }
          min={0}
          fieldProps={{ precision: 0 }}
          placeholder="请输入Token固定超时时间"
        />
        <ProFormRadio.Group
          name="status"
          label="状态"
          options={statusOptions}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default ClientPage;
