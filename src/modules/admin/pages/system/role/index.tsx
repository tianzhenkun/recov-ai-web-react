import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProForm,
  ProFormDigit,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Checkbox, Modal, message, Space, Switch, Tree } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { type Key, useMemo, useRef, useState } from 'react';
import { addRuoyiDateRange } from '@/adapters/ruoyi/params';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import type { DeptTreeItem } from '@/modules/admin/services/dept';
import {
  addRole,
  changeRoleStatus,
  deleteRoles,
  exportRoles,
  getRole,
  listRoles,
  type RoleForm,
  type RoleItem,
  type RoleQuery,
  roleDeptTreeSelect,
  updateRole,
  updateRoleDataScope,
} from '@/modules/admin/services/role';
import {
  type MenuTreeItem,
  menuTreeSelect,
  roleMenuTreeSelect,
} from '@/modules/admin/services/system-menu';
import {
  type AntdTreeNode,
  getTreeSubmitKeys,
  toAntdTreeData,
} from '@/utils/ruoyiTree';

type RoleSearchParams = {
  current?: number;
  pageSize?: number;
  roleName?: string;
  roleKey?: string;
  status?: string;
  createTimeRange?: unknown;
};

const statusOptions = [
  { label: '正常', value: '0' },
  { label: '停用', value: '1' },
];

const dataScopeOptions = [
  { label: '全部数据权限', value: '1' },
  { label: '自定数据权限', value: '2' },
  { label: '本部门数据权限', value: '3' },
  { label: '本部门及以下数据权限', value: '4' },
  { label: '仅本人数据权限', value: '5' },
  { label: '部门及以下或本人数据权限', value: '6' },
];

const toKeyList = (values?: (number | string)[]) =>
  (values || []).map((value) => String(value));

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

const formatRangeTime = (value: unknown, boundary: 'start' | 'end') => {
  if (!value) return undefined;
  const isSupportedValue =
    typeof value === 'string' ||
    typeof value === 'number' ||
    value instanceof Date ||
    dayjs.isDayjs(value);

  if (!isSupportedValue) return undefined;

  const date = dayjs(value as string | number | Date | Dayjs);
  if (!date.isValid()) return undefined;
  return (
    boundary === 'start' ? date.startOf('day') : date.endOf('day')
  ).format('YYYY-MM-DD HH:mm:ss');
};

const toRoleQuery = (params: RoleSearchParams): RoleQuery => {
  const [beginTime, endTime] = Array.isArray(params.createTimeRange)
    ? params.createTimeRange
    : [];

  return addRuoyiDateRange(
    {
      pageNum: params.current || 1,
      pageSize: params.pageSize || 10,
      roleName: params.roleName,
      roleKey: params.roleKey,
      status: params.status,
    },
    [formatRangeTime(beginTime, 'start'), formatRangeTime(endTime, 'end')],
  );
};

const toRolePayload = (record: RoleForm | undefined, values: RoleForm) => {
  const merged = { ...(record || {}), ...values };
  return {
    roleId: merged.roleId,
    roleName: merged.roleName,
    roleKey: merged.roleKey,
    roleSort: merged.roleSort,
    status: merged.status,
    menuCheckStrictly: merged.menuCheckStrictly,
    deptCheckStrictly: merged.deptCheckStrictly,
    remark: merged.remark,
    dataScope: merged.dataScope,
    menuIds: merged.menuIds || [],
    deptIds: merged.deptIds || [],
  };
};

const RolePage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const latestQueryRef = useRef<RoleQuery>({ pageNum: 1, pageSize: 10 });
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [selectedRows, setSelectedRows] = useState<RoleItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RoleForm>();
  const [menuOptions, setMenuOptions] = useState<MenuTreeItem[]>([]);
  const [menuCheckedKeys, setMenuCheckedKeys] = useState<Key[]>([]);
  const [menuHalfCheckedKeys, setMenuHalfCheckedKeys] = useState<Key[]>([]);
  const [menuExpandedKeys, setMenuExpandedKeys] = useState<Key[]>([]);
  const [menuExpand, setMenuExpand] = useState(false);
  const [menuNodeAll, setMenuNodeAll] = useState(false);
  const [dataScopeOpen, setDataScopeOpen] = useState(false);
  const [dataScopeRecord, setDataScopeRecord] = useState<RoleForm>();
  const [currentDataScope, setCurrentDataScope] = useState('1');
  const [deptOptions, setDeptOptions] = useState<DeptTreeItem[]>([]);
  const [deptCheckedKeys, setDeptCheckedKeys] = useState<Key[]>([]);
  const [deptHalfCheckedKeys, setDeptHalfCheckedKeys] = useState<Key[]>([]);
  const [deptExpandedKeys, setDeptExpandedKeys] = useState<Key[]>([]);
  const [deptExpand, setDeptExpand] = useState(true);
  const [deptNodeAll, setDeptNodeAll] = useState(false);
  const openDeleteConfirm = useDeleteConfirm({
    modal: modalApi,
    messageApi,
  });
  const menuTreeData = useMemo(
    () => toAntdTreeData(menuOptions),
    [menuOptions],
  );
  const deptTreeData = useMemo(
    () => toAntdTreeData(deptOptions),
    [deptOptions],
  );
  const allMenuKeys = useMemo(
    () => getAllTreeKeys(menuTreeData),
    [menuTreeData],
  );
  const allDeptKeys = useMemo(
    () => getAllTreeKeys(deptTreeData),
    [deptTreeData],
  );
  const selectedIds = selectedRows
    .map((item) => item.roleId)
    .filter(Boolean) as (number | string)[];
  const menuCheckStrictly = !editingRecord?.menuCheckStrictly;
  const deptCheckStrictly = !dataScopeRecord?.deptCheckStrictly;

  const resetMenuTreeState = () => {
    setMenuCheckedKeys([]);
    setMenuHalfCheckedKeys([]);
    setMenuExpandedKeys([]);
    setMenuExpand(false);
    setMenuNodeAll(false);
  };

  const resetDeptTreeState = () => {
    setDeptCheckedKeys([]);
    setDeptHalfCheckedKeys([]);
    setDeptExpandedKeys([]);
    setDeptExpand(true);
    setDeptNodeAll(false);
  };

  const reloadTable = () => {
    setSelectedRows([]);
    actionRef.current?.reloadAndRest?.();
  };

  const openCreateForm = async () => {
    setFormLoading(true);
    resetMenuTreeState();
    try {
      const response = await menuTreeSelect();
      setMenuOptions(response.data || []);
      setEditingRecord({
        roleSort: 0,
        status: '0',
        menuCheckStrictly: true,
        deptCheckStrictly: true,
        dataScope: '1',
        menuIds: [],
        deptIds: [],
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const openUpdateForm = async (record: RoleItem) => {
    if (!record.roleId) return;
    setFormLoading(true);
    resetMenuTreeState();
    try {
      const [detailResponse, treeResponse] = await Promise.all([
        getRole(record.roleId),
        roleMenuTreeSelect(record.roleId),
      ]);
      const checkedKeys = toKeyList(
        treeResponse.data?.checkedKeys ||
          detailResponse.data?.menuIds ||
          record.menuIds ||
          [],
      );
      setMenuOptions(treeResponse.data?.menus || []);
      setMenuCheckedKeys(checkedKeys);
      setEditingRecord({
        ...record,
        ...detailResponse.data,
        menuIds: checkedKeys,
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const openDataScopeForm = async (record: RoleItem) => {
    if (!record.roleId) return;
    setFormLoading(true);
    resetDeptTreeState();
    try {
      const [detailResponse, treeResponse] = await Promise.all([
        getRole(record.roleId),
        roleDeptTreeSelect(record.roleId),
      ]);
      const detail = {
        ...record,
        ...detailResponse.data,
      };
      const nextDeptTree = treeResponse.data?.depts || [];
      const nextDeptKeys = toKeyList(treeResponse.data?.checkedKeys || []);
      const nextDeptTreeData = toAntdTreeData(nextDeptTree);
      setDeptOptions(nextDeptTree);
      setDeptCheckedKeys(nextDeptKeys);
      setDeptExpandedKeys(getAllTreeKeys(nextDeptTreeData));
      setDataScopeRecord(detail);
      setCurrentDataScope(detail.dataScope || '1');
      setDataScopeOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (records: RoleItem[]) => {
    const ids = records.map((item) => item.roleId).filter(Boolean) as (
      | number
      | string
    )[];
    if (ids.length === 0) return;

    openDeleteConfirm({
      records,
      entityName: '角色',
      unit: '个',
      getName: (record) => record.roleName || record.roleKey || record.roleId,
      description: '删除后，该角色的用户授权和菜单权限将不可用。',
      batchDescription: '删除后，这些角色的用户授权和菜单权限将不可用。',
      onConfirm: async () => {
        await deleteRoles(ids);
      },
      onSuccess: reloadTable,
    });
  };

  const confirmStatusChange = (record: RoleItem, status: string) => {
    if (!record.roleId) return;
    const actionText = status === '0' ? '启用' : '停用';

    modalApi.confirm({
      title: `确认${actionText}角色`,
      content: `角色“${record.roleName || record.roleKey || record.roleId}”将被${actionText}。`,
      okText: `确认${actionText}`,
      cancelText: '取消',
      autoFocusButton: 'cancel',
      okButtonProps: { danger: status === '1' },
      onOk: async () => {
        await changeRoleStatus(record.roleId as number | string, status);
        messageApi.success('操作成功');
        actionRef.current?.reload?.();
      },
    });
  };

  const setMenuLinked = (checked: boolean) => {
    setEditingRecord((record) => ({
      ...(record || {}),
      menuCheckStrictly: checked,
    }));
  };

  const setDeptLinked = (checked: boolean) => {
    setDataScopeRecord((record) => ({
      ...(record || {}),
      deptCheckStrictly: checked,
    }));
  };

  const columns: ProColumns<RoleItem>[] = [
    {
      title: '角色名称',
      dataIndex: 'roleName',
      ellipsis: true,
    },
    {
      title: '权限字符',
      dataIndex: 'roleKey',
      ellipsis: true,
    },
    {
      title: '显示顺序',
      dataIndex: 'roleSort',
      search: false,
      width: 104,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      fieldProps: { options: statusOptions },
      width: 112,
      render: (_, record) => (
        <Switch
          checked={record.status === '0'}
          checkedChildren="正常"
          unCheckedChildren="停用"
          disabled={record.roleId === 1 || record.roleId === '1'}
          onChange={(checked) =>
            confirmStatusChange(record, checked ? '0' : '1')
          }
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      search: false,
      width: 176,
    },
    {
      title: '创建时间',
      dataIndex: 'createTimeRange',
      valueType: 'dateRange',
      hideInTable: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 128,
      align: 'left',
      render: (_, record) => {
        if (record.roleId === 1 || record.roleId === '1') return null;

        return (
          <TableActions
            actions={[
              {
                key: 'edit',
                label: '修改',
                icon: <EditOutlined />,
                permissions: 'system:role:edit',
                onClick: () => openUpdateForm(record),
              },
              {
                key: 'dataScope',
                label: '数据权限',
                icon: <CheckCircleOutlined />,
                permissions: 'system:role:edit',
                onClick: () => openDataScopeForm(record),
              },
              {
                key: 'assign',
                label: '分配用户',
                icon: <TeamOutlined />,
                permissions: 'system:role:edit',
                onClick: () =>
                  history.push(`/system/role-auth/user/${record.roleId}`),
              },
              {
                key: 'delete',
                label: '删除',
                danger: true,
                icon: <DeleteOutlined />,
                permissions: 'system:role:remove',
                onClick: () => confirmDelete([record]),
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <PageContainer title="角色管理">
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<RoleItem, RoleSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.roleId)}
        columns={columns}
        search={{ labelWidth: 96 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total: number) => `共 ${total} 条`,
        }}
        request={async (params) => {
          const query = toRoleQuery(params);
          latestQueryRef.current = query;
          const response = await listRoles(query);
          return {
            data: response.rows || [],
            total: response.total || 0,
            success: true,
          };
        }}
        rowSelection={{
          selectedRowKeys: selectedIds.map(String),
          onChange: (_, rows) => setSelectedRows(rows),
          getCheckboxProps: (record) => ({
            disabled: record.roleId === 1 || record.roleId === '1',
          }),
        }}
        toolBarRender={() => [
          <PermissionButton
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            permissions="system:role:add"
            onClick={openCreateForm}
          >
            新增
          </PermissionButton>,
          <PermissionButton
            key="edit"
            icon={<EditOutlined />}
            permissions="system:role:edit"
            disabled={selectedRows.length !== 1}
            onClick={() => openUpdateForm(selectedRows[0])}
          >
            修改
          </PermissionButton>,
          <PermissionButton
            key="delete"
            danger
            icon={<DeleteOutlined />}
            permissions="system:role:remove"
            disabled={selectedRows.length === 0}
            onClick={() => confirmDelete(selectedRows)}
          >
            删除
          </PermissionButton>,
          <PermissionButton
            key="export"
            icon={<DownloadOutlined />}
            permissions="system:role:export"
            onClick={async () => {
              await exportRoles(latestQueryRef.current);
              messageApi.success('导出任务已开始');
            }}
          >
            导出
          </PermissionButton>,
        ]}
      />
      <ModalForm<RoleForm>
        key={editingRecord?.roleId || 'create'}
        title={editingRecord?.roleId ? '修改角色' : '新增角色'}
        open={formOpen}
        loading={formLoading}
        modalProps={{
          destroyOnHidden: true,
          width: 760,
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
          const payload = toRolePayload(editingRecord, {
            ...values,
            menuIds: getTreeSubmitKeys(
              menuTreeData,
              menuCheckedKeys as (number | string)[],
              menuHalfCheckedKeys as (number | string)[],
              editingRecord?.menuCheckStrictly !== false,
            ),
          });
          if (editingRecord?.roleId) {
            await updateRole(payload);
          } else {
            await addRole(payload);
          }
          messageApi.success('操作成功');
          reloadTable();
          return true;
        }}
      >
        <ProFormText
          name="roleName"
          label="角色名称"
          placeholder="请输入角色名称"
          rules={[{ required: true, message: '请输入角色名称' }]}
        />
        <ProFormText
          name="roleKey"
          label="权限字符"
          placeholder="请输入权限字符"
          rules={[{ required: true, message: '请输入权限字符' }]}
        />
        <ProFormDigit
          name="roleSort"
          label="角色顺序"
          min={0}
          rules={[{ required: true, message: '请输入角色顺序' }]}
        />
        <ProFormRadio.Group
          name="status"
          label="角色状态"
          options={statusOptions}
        />
        <ProForm.Item label="菜单权限">
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
        <ProFormTextArea
          name="remark"
          label="备注"
          fieldProps={{ rows: 3, maxLength: 200, showCount: true }}
        />
      </ModalForm>
      <ModalForm<RoleForm>
        key={dataScopeRecord?.roleId || 'dataScope'}
        title="分配数据权限"
        open={dataScopeOpen}
        loading={formLoading}
        modalProps={{
          destroyOnHidden: true,
          width: 640,
          onCancel: () => {
            setDataScopeOpen(false);
            setDataScopeRecord(undefined);
            resetDeptTreeState();
          },
        }}
        initialValues={dataScopeRecord}
        onOpenChange={(open) => {
          setDataScopeOpen(open);
          if (!open) {
            setDataScopeRecord(undefined);
            resetDeptTreeState();
          }
        }}
        onFinish={async (values) => {
          const payload = toRolePayload(dataScopeRecord, {
            ...values,
            deptIds:
              values.dataScope === '2'
                ? getTreeSubmitKeys(
                    deptTreeData,
                    deptCheckedKeys as (number | string)[],
                    deptHalfCheckedKeys as (number | string)[],
                    dataScopeRecord?.deptCheckStrictly !== false,
                  )
                : [],
          });
          await updateRoleDataScope(payload);
          messageApi.success('修改成功');
          reloadTable();
          return true;
        }}
      >
        <ProFormText name="roleName" label="角色名称" disabled />
        <ProFormText name="roleKey" label="权限字符" disabled />
        <ProFormSelect
          name="dataScope"
          label="权限范围"
          options={dataScopeOptions}
          fieldProps={{
            onChange: (value) => {
              setCurrentDataScope(String(value));
              if (value !== '2') {
                setDeptCheckedKeys([]);
                setDeptHalfCheckedKeys([]);
              }
            },
          }}
        />
        {currentDataScope === '2' && (
          <ProForm.Item label="数据权限">
            <Space style={{ marginBottom: 8 }} wrap>
              <Checkbox
                checked={deptExpand}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setDeptExpand(checked);
                  setDeptExpandedKeys(checked ? allDeptKeys : []);
                }}
              >
                展开/折叠
              </Checkbox>
              <Checkbox
                checked={deptNodeAll}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setDeptNodeAll(checked);
                  setDeptCheckedKeys(checked ? allDeptKeys : []);
                  setDeptHalfCheckedKeys([]);
                }}
              >
                全选/全不选
              </Checkbox>
              <Checkbox
                checked={dataScopeRecord?.deptCheckStrictly !== false}
                onChange={(event) => setDeptLinked(event.target.checked)}
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
                checkStrictly={deptCheckStrictly}
                checkedKeys={
                  deptCheckStrictly
                    ? {
                        checked: deptCheckedKeys,
                        halfChecked: deptHalfCheckedKeys,
                      }
                    : deptCheckedKeys
                }
                expandedKeys={deptExpandedKeys}
                treeData={deptTreeData}
                onCheck={(checkedKeysValue, info) => {
                  const nextKeys = getCheckedKeys(
                    checkedKeysValue,
                    info.halfCheckedKeys as Key[],
                  );
                  setDeptCheckedKeys(nextKeys.checked);
                  setDeptHalfCheckedKeys(nextKeys.halfChecked);
                }}
                onExpand={(keys) => {
                  setDeptExpandedKeys(keys);
                  setDeptExpand(keys.length === allDeptKeys.length);
                }}
              />
            </div>
          </ProForm.Item>
        )}
      </ModalForm>
    </PageContainer>
  );
};

export default RolePage;
