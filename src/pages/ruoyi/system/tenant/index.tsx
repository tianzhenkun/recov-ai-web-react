import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormDateTimePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Modal, message, Switch } from 'antd';
import { useRef, useState } from 'react';
import { PermissionButton, usePermission } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import {
  addTenant,
  changeTenantStatus,
  clearRecovTenantInit,
  deleteTenants,
  exportTenants,
  getTenant,
  initRecovTenant,
  listTenants,
  selectTenantPackages,
  syncTenantConfig,
  syncTenantDict,
  syncTenantPackage,
  type TenantForm,
  type TenantItem,
  type TenantPackageItem,
  type TenantQuery,
  updateTenant,
} from '@/services/ruoyi/tenant';

type TenantSearchParams = {
  current?: number;
  pageSize?: number;
  tenantId?: number | string;
  contactUserName?: string;
  contactPhone?: string;
  companyName?: string;
};

const isTemplateTenant = (tenantId?: number | string) =>
  String(tenantId) === '000000';

const toTenantQuery = (params: TenantSearchParams): TenantQuery => ({
  pageNum: params.current || 1,
  pageSize: params.pageSize || 10,
  tenantId: params.tenantId,
  contactUserName: params.contactUserName,
  contactPhone: params.contactPhone,
  companyName: params.companyName,
});

const toTenantPayload = (
  record: TenantForm | undefined,
  values: TenantForm,
): TenantForm => {
  const merged = { ...(record || {}), ...values };
  return {
    id: merged.id,
    tenantId: merged.tenantId,
    username: merged.username,
    password: merged.password,
    contactUserName: merged.contactUserName,
    contactPhone: merged.contactPhone,
    companyName: merged.companyName,
    licenseNumber: merged.licenseNumber,
    domain: merged.domain,
    address: merged.address,
    intro: merged.intro,
    remark: merged.remark,
    packageId: merged.packageId,
    expireTime: merged.expireTime,
    accountCount: merged.accountCount,
    status: merged.status,
  };
};

const TenantPage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const latestQueryRef = useRef<TenantQuery>({ pageNum: 1, pageSize: 10 });
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const { initialState } = useModel('@@initialState');
  const { hasPermission } = usePermission();
  const [selectedRows, setSelectedRows] = useState<TenantItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TenantForm>();
  const [formLoading, setFormLoading] = useState(false);
  const [packageList, setPackageList] = useState<TenantPackageItem[]>([]);
  const [syncPackageLoadingId, setSyncPackageLoadingId] = useState<
    number | string
  >();
  const [initRecovTenantLoadingId, setInitRecovTenantLoadingId] = useState<
    number | string
  >();
  const [clearRecovTenantInitLoadingId, setClearRecovTenantInitLoadingId] =
    useState<number | string>();
  const openDeleteConfirm = useDeleteConfirm({
    modal: modalApi,
    messageApi,
  });
  const canEditTenant = hasPermission('system:tenant:edit');
  const selectedIds = selectedRows.map((item) => item.id).filter(Boolean) as (
    | number
    | string
  )[];
  const currentUserId =
    initialState?.currentUser?.rawUser?.userId ||
    initialState?.currentUser?.userid;
  const isSuperAdmin = Number(currentUserId) === 1;

  const reloadTable = () => {
    setSelectedRows([]);
    actionRef.current?.reloadAndRest?.();
  };

  const loadTenantPackages = async () => {
    const response = await selectTenantPackages();
    setPackageList(response.data || []);
  };

  const openCreateForm = async () => {
    setFormLoading(true);
    try {
      await loadTenantPackages();
      setEditingRecord({
        accountCount: 0,
        status: '0',
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const openUpdateForm = async (record: TenantItem) => {
    if (!record.id) return;
    setFormLoading(true);
    try {
      const [detailResponse] = await Promise.all([
        getTenant(record.id),
        loadTenantPackages(),
      ]);
      setEditingRecord({
        ...record,
        ...detailResponse.data,
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (records: TenantItem[]) => {
    const ids = records.map((item) => item.id).filter(Boolean) as (
      | number
      | string
    )[];
    if (ids.length === 0) return;

    openDeleteConfirm({
      records,
      entityName: '租户',
      unit: '个',
      getName: (record) => record.companyName || record.tenantId || record.id,
      description: '删除后，该租户及其关联数据将不可用。',
      batchDescription: '删除后，这些租户及其关联数据将不可用。',
      onConfirm: async () => {
        await deleteTenants(ids);
      },
      onSuccess: reloadTable,
    });
  };

  const confirmStatusChange = (record: TenantItem, checked: boolean) => {
    if (!record.id || !record.tenantId) return;

    const id = record.id;
    const tenantId = record.tenantId;
    const nextStatus = checked ? '0' : '1';
    const actionText = checked ? '启用' : '停用';

    modalApi.confirm({
      title: `${actionText}租户`,
      content: `确认要${actionText}“${record.companyName || record.tenantId}”租户吗？`,
      okText: `确认${actionText}`,
      cancelText: '取消',
      autoFocusButton: 'cancel',
      onOk: async () => {
        await changeTenantStatus(id, tenantId, nextStatus);
        messageApi.success(`${actionText}成功`);
        actionRef.current?.reload?.();
      },
    });
  };

  const handleSyncTenantPackage = async (record: TenantItem) => {
    if (!record.tenantId || !record.packageId) return;
    setSyncPackageLoadingId(record.tenantId);
    try {
      await syncTenantPackage(record.tenantId, record.packageId);
      messageApi.success('同步成功');
      actionRef.current?.reload?.();
    } finally {
      setSyncPackageLoadingId(undefined);
    }
  };

  const handleInitRecovTenant = async (record: TenantItem) => {
    if (!record.tenantId || isTemplateTenant(record.tenantId)) return;

    setInitRecovTenantLoadingId(record.tenantId);
    try {
      const response = await initRecovTenant(record.tenantId);
      const result = response.data;
      if (result?.initialized === false) {
        messageApi.warning(result.message || '初始化未执行');
        return;
      }
      messageApi.success(result?.message || '初始化成功');
    } finally {
      setInitRecovTenantLoadingId(undefined);
    }
  };

  const handleClearRecovTenantInit = async (record: TenantItem) => {
    if (!record.tenantId || isTemplateTenant(record.tenantId)) return;

    setClearRecovTenantInitLoadingId(record.tenantId);
    try {
      const response = await clearRecovTenantInit(record.tenantId);
      messageApi.success(response.data?.message || '清除成功');
    } finally {
      setClearRecovTenantInitLoadingId(undefined);
    }
  };

  const confirmDangerAction = ({
    title,
    content,
    onOk,
  }: {
    title: string;
    content: string;
    onOk: () => Promise<void>;
  }) => {
    modalApi.confirm({
      title,
      content,
      okText: '确认',
      cancelText: '取消',
      autoFocusButton: 'cancel',
      onOk,
    });
  };

  const columns: ProColumns<TenantItem>[] = [
    {
      title: '租户编号',
      dataIndex: 'tenantId',
      ellipsis: true,
      width: 132,
    },
    {
      title: '联系人',
      dataIndex: 'contactUserName',
      ellipsis: true,
      width: 120,
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      ellipsis: true,
      width: 132,
    },
    {
      title: '企业名称',
      dataIndex: 'companyName',
      ellipsis: true,
    },
    {
      title: '社会信用代码',
      dataIndex: 'licenseNumber',
      search: false,
      ellipsis: true,
      width: 172,
    },
    {
      title: '过期时间',
      dataIndex: 'expireTime',
      valueType: 'date',
      search: false,
      width: 128,
    },
    {
      title: '租户状态',
      dataIndex: 'status',
      search: false,
      width: 112,
      render: (_, record) => (
        <Switch
          checked={record.status === '0'}
          checkedChildren="启用"
          disabled={!canEditTenant}
          unCheckedChildren="停用"
          onChange={(checked) => confirmStatusChange(record, checked)}
        />
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 176,
      align: 'left',
      render: (_, record) => (
        <TableActions
          maxVisible={5}
          actions={[
            {
              key: 'edit',
              label: '修改',
              icon: <EditOutlined />,
              permissions: 'system:tenant:edit',
              onClick: () => openUpdateForm(record),
            },
            {
              key: 'syncPackage',
              label: '同步套餐',
              icon: <ReloadOutlined />,
              loading: syncPackageLoadingId === record.tenantId,
              permissions: 'system:tenant:edit',
              onClick: () =>
                confirmDangerAction({
                  title: '同步租户套餐',
                  content: `确认同步租户编号为“${record.tenantId}”的套餐数据吗？`,
                  onOk: () => handleSyncTenantPackage(record),
                }),
            },
            {
              key: 'initRecovTenant',
              label: '初始化催收业务信息',
              icon: <CheckCircleOutlined />,
              disabled: isTemplateTenant(record.tenantId),
              loading: initRecovTenantLoadingId === record.tenantId,
              permissions: 'system:tenant:edit',
              onClick: () =>
                confirmDangerAction({
                  title: '初始化催收业务信息',
                  content: `确认从模板租户重新初始化租户编号为“${record.tenantId}”的催收业务配置？该操作会先清除该租户已有的催收初始化配置。`,
                  onOk: () => handleInitRecovTenant(record),
                }),
            },
            {
              key: 'clearRecovTenantInit',
              label: '清除催收初始化数据',
              danger: true,
              icon: <CloseCircleOutlined />,
              disabled: isTemplateTenant(record.tenantId),
              loading: clearRecovTenantInitLoadingId === record.tenantId,
              permissions: 'system:tenant:remove',
              onClick: () =>
                confirmDangerAction({
                  title: '清除催收初始化数据',
                  content: `确认清除租户编号为“${record.tenantId}”的催收初始化数据？该操作会直接删除催收配置，且不会检查租户是否已有真实业务数据。`,
                  onOk: () => handleClearRecovTenantInit(record),
                }),
            },
            {
              key: 'delete',
              label: '删除',
              danger: true,
              icon: <DeleteOutlined />,
              permissions: 'system:tenant:remove',
              onClick: () => confirmDelete([record]),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer title="租户管理">
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<TenantItem, TenantSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.id)}
        search={{ labelWidth: 96 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total: number) => `共 ${total} 条`,
        }}
        columns={columns}
        scroll={{ x: 1320 }}
        request={async (params) => {
          const query = toTenantQuery(params);
          latestQueryRef.current = query;
          const response = await listTenants(query);
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
            permissions="system:tenant:add"
            onClick={openCreateForm}
          >
            新增
          </PermissionButton>,
          <PermissionButton
            key="edit"
            icon={<EditOutlined />}
            permissions="system:tenant:edit"
            disabled={selectedRows.length !== 1}
            onClick={() => openUpdateForm(selectedRows[0])}
          >
            修改
          </PermissionButton>,
          <PermissionButton
            key="delete"
            danger
            icon={<DeleteOutlined />}
            permissions="system:tenant:remove"
            disabled={selectedRows.length === 0}
            onClick={() => confirmDelete(selectedRows)}
          >
            删除
          </PermissionButton>,
          <PermissionButton
            key="export"
            icon={<DownloadOutlined />}
            permissions="system:tenant:export"
            onClick={async () => {
              await exportTenants(latestQueryRef.current);
              messageApi.success('导出任务已开始');
            }}
          >
            导出
          </PermissionButton>,
          isSuperAdmin ? (
            <PermissionButton
              key="syncDict"
              icon={<ReloadOutlined />}
              onClick={() =>
                confirmDangerAction({
                  title: '同步租户字典',
                  content: '确认要同步所有租户字典吗？',
                  onOk: async () => {
                    const response = await syncTenantDict();
                    messageApi.success(response.msg || '同步成功');
                  },
                })
              }
            >
              同步租户字典
            </PermissionButton>
          ) : null,
          isSuperAdmin ? (
            <PermissionButton
              key="syncConfig"
              icon={<ReloadOutlined />}
              onClick={() =>
                confirmDangerAction({
                  title: '同步租户参数配置',
                  content: '确认要同步所有租户参数配置吗？',
                  onOk: async () => {
                    const response = await syncTenantConfig();
                    messageApi.success(response.msg || '同步成功');
                  },
                })
              }
            >
              同步租户参数配置
            </PermissionButton>
          ) : null,
        ]}
      />
      <ModalForm<TenantForm>
        key={editingRecord?.id || 'create'}
        title={editingRecord?.id ? '修改租户' : '添加租户'}
        open={formOpen}
        loading={formLoading}
        modalProps={{
          destroyOnHidden: true,
          width: 560,
          onCancel: () => {
            setFormOpen(false);
            setEditingRecord(undefined);
          },
        }}
        initialValues={editingRecord}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingRecord(undefined);
          }
        }}
        onFinish={async (values) => {
          const payload = toTenantPayload(editingRecord, values);
          if (editingRecord?.id) {
            await updateTenant(payload);
          } else {
            await addTenant(payload);
          }
          messageApi.success('操作成功');
          reloadTable();
          return true;
        }}
      >
        <ProFormText
          name="companyName"
          label="企业名称"
          placeholder="请输入企业名称"
          rules={[{ required: true, message: '企业名称不能为空' }]}
        />
        <ProFormText
          name="contactUserName"
          label="联系人"
          placeholder="请输入联系人"
          rules={[{ required: true, message: '联系人不能为空' }]}
        />
        <ProFormText
          name="contactPhone"
          label="联系电话"
          placeholder="请输入联系电话"
          rules={[{ required: true, message: '联系电话不能为空' }]}
        />
        {!editingRecord?.id && (
          <>
            <ProFormText
              name="username"
              label="用户名"
              placeholder="请输入系统用户名"
              fieldProps={{ maxLength: 30 }}
              rules={[
                { required: true, message: '用户名不能为空' },
                {
                  min: 2,
                  max: 20,
                  message: '用户名称长度必须介于 2 和 20 之间',
                },
              ]}
            />
            <ProFormText
              name="password"
              label="用户密码"
              placeholder="请输入系统用户密码"
              fieldProps={{ maxLength: 20, type: 'password' }}
              rules={[
                { required: true, message: '密码不能为空' },
                {
                  min: 5,
                  max: 20,
                  message: '用户密码长度必须介于 5 和 20 之间',
                },
              ]}
            />
          </>
        )}
        <ProFormSelect
          name="packageId"
          label="租户套餐"
          disabled={Boolean(editingRecord?.tenantId)}
          options={packageList.map((item) => ({
            label: item.packageName || item.packageId,
            value: item.packageId,
          }))}
          placeholder="请选择租户套餐"
        />
        <ProFormDateTimePicker
          name="expireTime"
          label="过期时间"
          placeholder="请选择过期时间"
          fieldProps={{ format: 'YYYY-MM-DD HH:mm:ss' }}
        />
        <ProFormDigit
          name="accountCount"
          label="用户数量"
          min={0}
          placeholder="请输入用户数量"
        />
        <ProFormText
          name="domain"
          label="绑定域名"
          placeholder="请输入绑定域名"
        />
        <ProFormText
          name="address"
          label="企业地址"
          placeholder="请输入企业地址"
        />
        <ProFormText
          name="licenseNumber"
          label="企业代码"
          placeholder="请输入统一社会信用代码"
        />
        <ProFormTextArea
          name="intro"
          label="企业简介"
          placeholder="请输入企业简介"
          fieldProps={{ rows: 3, maxLength: 500, showCount: true }}
        />
        <ProFormText name="remark" label="备注" placeholder="请输入备注" />
      </ModalForm>
    </PageContainer>
  );
};

export default TenantPage;
