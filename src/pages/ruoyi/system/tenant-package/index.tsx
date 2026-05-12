import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProForm,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { Checkbox, Modal, message, Space, Switch, Tree } from 'antd';
import { type Key, useMemo, useRef, useState } from 'react';
import { PermissionButton, usePermission } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import type { MenuTreeItem } from '@/services/ruoyi/system-menu';
import {
  addTenantPackage,
  changeTenantPackageStatus,
  deleteTenantPackages,
  exportTenantPackages,
  getTenantPackage,
  listTenantPackages,
  type TenantPackageForm,
  type TenantPackageItem,
  type TenantPackageQuery,
  tenantPackageMenuTreeSelect,
  updateTenantPackage,
} from '@/services/ruoyi/tenant';
import {
  type AntdTreeNode,
  getTreeSubmitKeys,
  toAntdTreeData,
} from '@/utils/ruoyiTree';

type TenantPackageSearchParams = {
  current?: number;
  pageSize?: number;
  packageName?: string;
};

const toKeyList = (values?: (number | string)[] | string) => {
  if (!values) return [];
  if (Array.isArray(values)) return values.map((value) => String(value));
  return String(values)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

const getAllTreeKeys = (nodes: AntdTreeNode[] = []): Key[] =>
  nodes.flatMap((node) => [node.key, ...getAllTreeKeys(node.children || [])]);

const getCheckedKeys = (
  checkedKeysValue: Key[] | { checked?: Key[]; halfChecked?: Key[] },
  halfCheckedKeys?: Key[],
) => {
  if (Array.isArray(checkedKeysValue)) {
    return {
      checked: checkedKeysValue,
      halfChecked: halfCheckedKeys || [],
    };
  }

  return {
    checked: checkedKeysValue.checked || [],
    halfChecked: checkedKeysValue.halfChecked || [],
  };
};

const toTenantPackageQuery = (
  params: TenantPackageSearchParams,
): TenantPackageQuery => ({
  pageNum: params.current || 1,
  pageSize: params.pageSize || 10,
  packageName: params.packageName,
});

const toTenantPackagePayload = (
  record: TenantPackageForm | undefined,
  values: TenantPackageForm,
): TenantPackageForm => {
  const merged = { ...(record || {}), ...values };
  return {
    packageId: merged.packageId,
    packageName: merged.packageName,
    menuIds: merged.menuIds || [],
    remark: merged.remark,
    menuCheckStrictly: merged.menuCheckStrictly,
    status: merged.status,
  };
};

const TenantPackagePage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const latestQueryRef = useRef<TenantPackageQuery>({
    pageNum: 1,
    pageSize: 10,
  });
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const { hasPermission } = usePermission();
  const [selectedRows, setSelectedRows] = useState<TenantPackageItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TenantPackageForm>();
  const [menuOptions, setMenuOptions] = useState<MenuTreeItem[]>([]);
  const [menuCheckedKeys, setMenuCheckedKeys] = useState<Key[]>([]);
  const [menuHalfCheckedKeys, setMenuHalfCheckedKeys] = useState<Key[]>([]);
  const [menuExpandedKeys, setMenuExpandedKeys] = useState<Key[]>([]);
  const [menuExpand, setMenuExpand] = useState(false);
  const [menuNodeAll, setMenuNodeAll] = useState(false);
  const openDeleteConfirm = useDeleteConfirm({
    modal: modalApi,
    messageApi,
  });
  const canEditPackage = hasPermission('system:tenantPackage:edit');
  const menuTreeData = useMemo(
    () => toAntdTreeData(menuOptions),
    [menuOptions],
  );
  const allMenuKeys = useMemo(
    () => getAllTreeKeys(menuTreeData),
    [menuTreeData],
  );
  const selectedIds = selectedRows
    .map((item) => item.packageId)
    .filter(Boolean) as (number | string)[];
  const menuCheckStrictly = !editingRecord?.menuCheckStrictly;

  const resetMenuTreeState = () => {
    setMenuCheckedKeys([]);
    setMenuHalfCheckedKeys([]);
    setMenuExpandedKeys([]);
    setMenuExpand(false);
    setMenuNodeAll(false);
  };

  const reloadTable = () => {
    setSelectedRows([]);
    actionRef.current?.reloadAndRest?.();
  };

  const setMenuLinked = (checked: boolean) => {
    setEditingRecord((record) => ({
      ...(record || {}),
      menuCheckStrictly: checked,
    }));
  };

  const openCreateForm = async () => {
    setFormLoading(true);
    resetMenuTreeState();
    try {
      const response = await tenantPackageMenuTreeSelect(0);
      setMenuOptions(response.data?.menus || []);
      setEditingRecord({
        packageName: '',
        menuIds: [],
        menuCheckStrictly: true,
        status: '0',
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const openUpdateForm = async (record: TenantPackageItem) => {
    if (!record.packageId) return;
    setFormLoading(true);
    resetMenuTreeState();
    try {
      const [detailResponse, treeResponse] = await Promise.all([
        getTenantPackage(record.packageId),
        tenantPackageMenuTreeSelect(record.packageId),
      ]);
      const detail = detailResponse.data || record;
      const checkedKeys = toKeyList(
        treeResponse.data?.checkedKeys || detail.menuIds || [],
      );
      setMenuOptions(treeResponse.data?.menus || []);
      setMenuCheckedKeys(checkedKeys);
      setEditingRecord({
        ...record,
        ...detail,
        menuIds: checkedKeys,
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (records: TenantPackageItem[]) => {
    const ids = records.map((item) => item.packageId).filter(Boolean) as (
      | number
      | string
    )[];
    if (ids.length === 0) return;

    openDeleteConfirm({
      records,
      entityName: '租户套餐',
      unit: '个',
      getName: (record) => record.packageName || record.packageId,
      description: '删除后，该租户套餐将不可用。',
      batchDescription: '删除后，这些租户套餐将不可用。',
      onConfirm: async () => {
        await deleteTenantPackages(ids);
      },
      onSuccess: reloadTable,
    });
  };

  const confirmStatusChange = (record: TenantPackageItem, checked: boolean) => {
    if (!record.packageId) return;

    const packageId = record.packageId;
    const nextStatus = checked ? '0' : '1';
    const actionText = checked ? '启用' : '停用';

    modalApi.confirm({
      title: `${actionText}租户套餐`,
      content: `确认要${actionText}“${record.packageName || record.packageId}”套餐吗？`,
      okText: `确认${actionText}`,
      cancelText: '取消',
      autoFocusButton: 'cancel',
      onOk: async () => {
        await changeTenantPackageStatus(packageId, nextStatus);
        messageApi.success(`${actionText}成功`);
        actionRef.current?.reload?.();
      },
    });
  };

  const columns: ProColumns<TenantPackageItem>[] = [
    {
      title: '套餐名称',
      dataIndex: 'packageName',
      ellipsis: true,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      search: false,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      search: false,
      width: 112,
      render: (_, record) => (
        <Switch
          checked={record.status === '0'}
          checkedChildren="启用"
          disabled={!canEditPackage}
          unCheckedChildren="停用"
          onChange={(checked) => confirmStatusChange(record, checked)}
        />
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 96,
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'edit',
              label: '修改',
              icon: <EditOutlined />,
              permissions: 'system:tenantPackage:edit',
              onClick: () => openUpdateForm(record),
            },
            {
              key: 'delete',
              label: '删除',
              danger: true,
              icon: <DeleteOutlined />,
              permissions: 'system:tenantPackage:remove',
              onClick: () => confirmDelete([record]),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer title="租户套餐管理">
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<TenantPackageItem, TenantPackageSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.packageId)}
        search={{ labelWidth: 96 }}
        pagination={{ defaultPageSize: 10 }}
        columns={columns}
        scroll={{ x: 900 }}
        request={async (params) => {
          const query = toTenantPackageQuery(params);
          latestQueryRef.current = query;
          const response = await listTenantPackages(query);
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
            permissions="system:tenantPackage:add"
            onClick={openCreateForm}
          >
            新增
          </PermissionButton>,
          <PermissionButton
            key="edit"
            icon={<EditOutlined />}
            permissions="system:tenantPackage:edit"
            disabled={selectedRows.length !== 1}
            onClick={() => openUpdateForm(selectedRows[0])}
          >
            修改
          </PermissionButton>,
          <PermissionButton
            key="delete"
            danger
            icon={<DeleteOutlined />}
            permissions="system:tenantPackage:remove"
            disabled={selectedRows.length === 0}
            onClick={() => confirmDelete(selectedRows)}
          >
            删除
          </PermissionButton>,
          <PermissionButton
            key="export"
            icon={<DownloadOutlined />}
            permissions="system:tenantPackage:export"
            onClick={async () => {
              await exportTenantPackages(latestQueryRef.current);
              messageApi.success('导出任务已开始');
            }}
          >
            导出
          </PermissionButton>,
        ]}
      />
      <ModalForm<TenantPackageForm>
        key={editingRecord?.packageId || 'create'}
        title={editingRecord?.packageId ? '修改租户套餐' : '添加租户套餐'}
        open={formOpen}
        loading={formLoading}
        modalProps={{
          destroyOnHidden: true,
          width: 560,
          onCancel: () => {
            setFormOpen(false);
            setEditingRecord(undefined);
            resetMenuTreeState();
          },
        }}
        initialValues={editingRecord}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingRecord(undefined);
            resetMenuTreeState();
          }
        }}
        onFinish={async (values) => {
          const payload = toTenantPackagePayload(editingRecord, {
            ...values,
            menuIds: getTreeSubmitKeys(
              menuTreeData,
              menuCheckedKeys as (number | string)[],
              menuHalfCheckedKeys as (number | string)[],
              editingRecord?.menuCheckStrictly !== false,
            ),
          });
          if (editingRecord?.packageId) {
            await updateTenantPackage(payload);
          } else {
            await addTenantPackage(payload);
          }
          messageApi.success('操作成功');
          reloadTable();
          return true;
        }}
      >
        <ProFormText
          name="packageName"
          label="套餐名称"
          placeholder="请输入套餐名称"
          rules={[{ required: true, message: '套餐名称不能为空' }]}
        />
        <ProForm.Item label="关联菜单">
          <Space style={{ marginBottom: 8 }} wrap>
            <Checkbox
              checked={menuExpand}
              onChange={(event) => {
                const checked = event.target.checked;
                setMenuExpand(checked);
                setMenuExpandedKeys(checked ? allMenuKeys : []);
              }}
            >
              展开/折叠
            </Checkbox>
            <Checkbox
              checked={menuNodeAll}
              onChange={(event) => {
                const checked = event.target.checked;
                setMenuNodeAll(checked);
                setMenuCheckedKeys(checked ? allMenuKeys : []);
                setMenuHalfCheckedKeys([]);
              }}
            >
              全选/全不选
            </Checkbox>
            <Checkbox
              checked={editingRecord?.menuCheckStrictly !== false}
              onChange={(event) => setMenuLinked(event.target.checked)}
            >
              父子联动
            </Checkbox>
          </Space>
          <div
            style={{
              maxHeight: 320,
              overflow: 'auto',
              padding: 12,
              border: '1px solid #f0f0f0',
              borderRadius: 6,
            }}
          >
            <Tree
              checkable
              checkStrictly={menuCheckStrictly}
              checkedKeys={
                menuCheckStrictly
                  ? {
                      checked: menuCheckedKeys,
                      halfChecked: menuHalfCheckedKeys,
                    }
                  : menuCheckedKeys
              }
              expandedKeys={menuExpandedKeys}
              treeData={menuTreeData}
              onCheck={(checkedKeysValue, info) => {
                const nextKeys = getCheckedKeys(
                  checkedKeysValue,
                  info.halfCheckedKeys as Key[],
                );
                setMenuCheckedKeys(nextKeys.checked);
                setMenuHalfCheckedKeys(nextKeys.halfChecked);
              }}
              onExpand={(keys) => {
                setMenuExpandedKeys(keys);
                setMenuExpand(keys.length === allMenuKeys.length);
              }}
            />
          </div>
        </ProForm.Item>
        <ProFormText name="remark" label="备注" placeholder="请输入备注" />
      </ModalForm>
    </PageContainer>
  );
};

export default TenantPackagePage;
