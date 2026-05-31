import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProForm,
  ProFormDependency,
  ProFormDigit,
  ProFormRadio,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { Modal, message, Tag, Tooltip, Tree, TreeSelect } from 'antd';
import { type Key, useMemo, useRef, useState } from 'react';
import { clearCachedRuoyiMenuData } from '@/adapters/ruoyi/menu';
import { PermissionButton } from '@/components/Permission';
import RuoyiIcon from '@/components/RuoyiIcon';
import RuoyiIconSelect from '@/components/RuoyiIconSelect';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import {
  addMenu,
  cascadeDeleteMenus,
  deleteMenu,
  getMenu,
  listMenus,
  type MenuForm,
  type MenuItem,
  type MenuQuery,
  type MenuTreeItem,
  type MenuType,
  menuTreeSelect,
  updateMenu,
} from '@/services/ruoyi/system-menu';
import { toAntdTreeData, withRootTreeNode } from '@/utils/ruoyiTree';

type MenuSearchParams = {
  menuName?: string;
  status?: string;
};

const menuTypeOptions = [
  { label: '目录', value: 'M' },
  { label: '菜单', value: 'C' },
  { label: '按钮', value: 'F' },
];

const statusOptions = [
  { label: '正常', value: '0' },
  { label: '停用', value: '1' },
];

const visibleOptions = [
  { label: '显示', value: '0' },
  { label: '隐藏', value: '1' },
];

const yesNoOptions = [
  { label: '是', value: '0' },
  { label: '否', value: '1' },
];

const cacheOptions = [
  { label: '缓存', value: '0' },
  { label: '不缓存', value: '1' },
];

const menuTypeLabel: Record<MenuType, string> = {
  M: '目录',
  C: '菜单',
  F: '按钮',
};

const menuTypeColor: Record<MenuType, string> = {
  M: 'blue',
  C: 'green',
  F: 'default',
};

const normalizeId = (value: unknown) => String(value ?? '');

const buildMenuTree = (rows: MenuItem[] = []) => {
  const nodeMap = new Map<string, MenuItem & { children: MenuItem[] }>();
  const roots: (MenuItem & { children: MenuItem[] })[] = [];

  rows.forEach((row) => {
    if (row.menuId === undefined || row.menuId === null) return;
    nodeMap.set(normalizeId(row.menuId), { ...row, children: [] });
  });

  rows.forEach((row) => {
    if (row.menuId === undefined || row.menuId === null) return;
    const node = nodeMap.get(normalizeId(row.menuId));
    if (!node) return;

    const parentId = normalizeId(row.parentId);
    const parent = nodeMap.get(parentId);
    if (parent && parentId !== '0') {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortAndPrune = (
    nodes: (MenuItem & { children: MenuItem[] })[],
  ): MenuItem[] =>
    nodes
      .sort((left, right) => (left.orderNum || 0) - (right.orderNum || 0))
      .map((node) => ({
        ...node,
        children:
          node.children.length > 0
            ? sortAndPrune(
                node.children as (MenuItem & {
                  children: MenuItem[];
                })[],
              )
            : undefined,
      }));

  return sortAndPrune(roots);
};

const toMenuTreeOptions = (items: MenuTreeItem[]) =>
  withRootTreeNode(toAntdTreeData(items), '主类目', 0);

const toMenuQuery = (params: MenuSearchParams): MenuQuery => ({
  menuName: params.menuName,
  status: params.status,
});

const toMenuPayload = (record: MenuForm | undefined, values: MenuForm) => {
  const merged = {
    ...(record || {}),
    ...values,
    queryParam: values.queryParam || values.query,
  };
  const menuType = merged.menuType || 'M';
  const isButton = menuType === 'F';
  const isMenu = menuType === 'C';

  return {
    parentId: merged.parentId,
    menuId: merged.menuId,
    menuName: merged.menuName,
    orderNum: merged.orderNum,
    path: isButton ? '' : merged.path,
    component: isMenu ? merged.component : '',
    queryParam: isMenu ? merged.queryParam : '',
    isFrame: isButton ? '1' : merged.isFrame,
    isCache: isMenu ? merged.isCache : '1',
    menuType,
    visible: isButton ? '0' : merged.visible,
    status: merged.status,
    icon: isButton ? '' : merged.icon,
    perms: menuType === 'M' ? '' : merged.perms,
    remark: !isButton && merged.visible !== '0' ? merged.remark : '',
  };
};

const MenuPage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MenuForm>();
  const [menuOptions, setMenuOptions] = useState<MenuTreeItem[]>([]);
  const [cascadeOpen, setCascadeOpen] = useState(false);
  const [cascadeLoading, setCascadeLoading] = useState(false);
  const [cascadeCheckedKeys, setCascadeCheckedKeys] = useState<Key[]>([]);
  const openDeleteConfirm = useDeleteConfirm({
    modal: modalApi,
    messageApi,
  });
  const treeSelectData = useMemo(
    () => toMenuTreeOptions(menuOptions),
    [menuOptions],
  );
  const cascadeTreeData = useMemo(
    () => [
      {
        title: '主类目',
        key: 0,
        value: 0,
        disabled: true,
        children: toAntdTreeData(menuOptions),
      },
    ],
    [menuOptions],
  );

  const reloadTable = () => {
    actionRef.current?.reload?.();
  };

  const afterMenuChanged = () => {
    clearCachedRuoyiMenuData();
    reloadTable();
  };

  const loadMenuTree = async () => {
    const response = await menuTreeSelect();
    setMenuOptions(response.data || []);
  };

  const openCreateForm = async (parent?: MenuItem) => {
    setFormLoading(true);
    try {
      await loadMenuTree();
      setEditingRecord({
        parentId: parent?.menuId ?? 0,
        menuType: parent?.menuType === 'C' ? 'F' : 'M',
        orderNum: 0,
        isFrame: '1',
        isCache: '0',
        visible: '0',
        status: '0',
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const openUpdateForm = async (record: MenuItem) => {
    if (!record.menuId) return;
    setFormLoading(true);
    try {
      const [treeResponse, detailResponse] = await Promise.all([
        menuTreeSelect(),
        getMenu(record.menuId),
      ]);
      setMenuOptions(treeResponse.data || []);
      setEditingRecord({
        ...record,
        ...detailResponse.data,
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (record: MenuItem) => {
    if (!record.menuId) return;

    openDeleteConfirm({
      records: [record],
      entityName: '菜单',
      getName: (item) => item.menuName || item.menuId,
      description: '删除后，该菜单及其按钮权限将不可用。',
      onConfirm: async () => {
        await deleteMenu(record.menuId as number | string);
      },
      onSuccess: afterMenuChanged,
    });
  };

  const openCascadeDelete = async () => {
    setCascadeLoading(true);
    try {
      await loadMenuTree();
      setCascadeCheckedKeys([]);
      setCascadeOpen(true);
    } finally {
      setCascadeLoading(false);
    }
  };

  const submitCascadeDelete = async () => {
    if (cascadeCheckedKeys.length === 0) {
      messageApi.warning('请选择要删除的菜单');
      return;
    }

    setCascadeLoading(true);
    try {
      await cascadeDeleteMenus(cascadeCheckedKeys.map(String));
      messageApi.success('删除成功');
      setCascadeOpen(false);
      setCascadeCheckedKeys([]);
      afterMenuChanged();
    } finally {
      setCascadeLoading(false);
    }
  };

  const columns: ProColumns<MenuItem>[] = [
    {
      title: '菜单名称',
      dataIndex: 'menuName',
      width: 240,
      ellipsis: true,
    },
    {
      title: '图标',
      dataIndex: 'icon',
      search: false,
      align: 'center',
      width: 80,
      render: (_, record) =>
        record.icon ? (
          <Tooltip title={record.icon}>
            <span>
              <RuoyiIcon icon={record.icon} />
            </span>
          </Tooltip>
        ) : (
          '-'
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      fieldProps: { options: statusOptions },
      width: 96,
      render: (_, record) =>
        record.status === '1' ? (
          <Tag color="default">停用</Tag>
        ) : (
          <Tag color="success">正常</Tag>
        ),
    },
    {
      title: '类型',
      dataIndex: 'menuType',
      search: false,
      width: 88,
      render: (_, record) => {
        const type = record.menuType || 'M';
        return (
          <Tag color={menuTypeColor[type]}>
            {menuTypeLabel[type] || record.menuType}
          </Tag>
        );
      },
    },
    {
      title: '排序',
      dataIndex: 'orderNum',
      search: false,
      width: 80,
    },
    {
      title: '权限标识',
      dataIndex: 'perms',
      search: false,
      ellipsis: true,
    },
    {
      title: '组件路径',
      dataIndex: 'component',
      search: false,
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      search: false,
      width: 176,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 128,
      align: 'left',
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'edit',
              label: '修改',
              icon: <EditOutlined />,
              permissions: 'system:menu:edit',
              onClick: () => openUpdateForm(record),
            },
            {
              key: 'add',
              label: '新增',
              icon: <PlusOutlined />,
              permissions: 'system:menu:add',
              onClick: () => openCreateForm(record),
            },
            {
              key: 'delete',
              label: '删除',
              danger: true,
              icon: <DeleteOutlined />,
              permissions: 'system:menu:remove',
              onClick: () => confirmDelete(record),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer title="菜单管理">
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<MenuItem, MenuSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.menuId)}
        columns={columns}
        search={{ labelWidth: 96 }}
        pagination={false}
        expandable={{ defaultExpandAllRows: false }}
        request={async (params) => {
          const response = await listMenus(toMenuQuery(params));
          return {
            data: buildMenuTree(response.data || []),
            total: response.data?.length || 0,
            success: true,
          };
        }}
        toolBarRender={() => [
          <PermissionButton
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            permissions="system:menu:add"
            onClick={() => openCreateForm()}
          >
            新增
          </PermissionButton>,
          <PermissionButton
            key="cascadeDelete"
            danger
            icon={<DeleteOutlined />}
            loading={cascadeLoading && !cascadeOpen}
            permissions="system:menu:remove"
            onClick={openCascadeDelete}
          >
            级联删除
          </PermissionButton>,
        ]}
      />
      <ModalForm<MenuForm>
        key={`${editingRecord?.menuId || 'create'}-${editingRecord?.parentId}`}
        title={editingRecord?.menuId ? '修改菜单' : '新增菜单'}
        open={formOpen}
        loading={formLoading}
        modalProps={{
          destroyOnHidden: true,
          width: 720,
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
          const payload = toMenuPayload(editingRecord, values);
          if (editingRecord?.menuId) {
            await updateMenu(payload);
          } else {
            await addMenu(payload);
          }
          messageApi.success('操作成功');
          afterMenuChanged();
          return true;
        }}
      >
        <ProForm.Item
          name="parentId"
          label="上级菜单"
          rules={[{ required: true, message: '请选择上级菜单' }]}
        >
          <TreeSelect
            treeData={treeSelectData}
            placeholder="请选择上级菜单"
            treeDefaultExpandAll
            allowClear={false}
          />
        </ProForm.Item>
        <ProFormRadio.Group
          name="menuType"
          label="菜单类型"
          options={menuTypeOptions}
          rules={[{ required: true, message: '请选择菜单类型' }]}
        />
        <ProFormDependency name={['menuType', 'visible']}>
          {({ menuType, visible }) => (
            <>
              {menuType !== 'F' && (
                <ProForm.Item name="icon" label="菜单图标">
                  <RuoyiIconSelect />
                </ProForm.Item>
              )}
              <ProFormText
                name="menuName"
                label="菜单名称"
                placeholder="请输入菜单名称"
                rules={[{ required: true, message: '请输入菜单名称' }]}
              />
              <ProFormDigit
                name="orderNum"
                label="显示排序"
                min={0}
                rules={[{ required: true, message: '请输入显示排序' }]}
              />
              {menuType !== 'F' && (
                <>
                  <ProFormRadio.Group
                    name="isFrame"
                    label="是否外链"
                    options={yesNoOptions}
                  />
                  <ProFormText
                    name="path"
                    label="路由地址"
                    placeholder="请输入路由地址"
                    rules={[{ required: true, message: '请输入路由地址' }]}
                  />
                  <ProFormRadio.Group
                    name="visible"
                    label="显示状态"
                    options={visibleOptions}
                  />
                </>
              )}
              {menuType === 'C' && (
                <>
                  <ProFormText
                    name="component"
                    label="组件路径"
                    placeholder="请输入组件路径"
                  />
                  <ProFormText
                    name="queryParam"
                    label="路由参数"
                    placeholder="请输入路由参数"
                  />
                  <ProFormRadio.Group
                    name="isCache"
                    label="是否缓存"
                    options={cacheOptions}
                  />
                </>
              )}
              {menuType !== 'M' && (
                <ProFormText
                  name="perms"
                  label="权限字符"
                  placeholder="请输入权限字符"
                  rules={
                    menuType === 'F'
                      ? [{ required: true, message: '请输入权限字符' }]
                      : undefined
                  }
                />
              )}
              <ProFormRadio.Group
                name="status"
                label="菜单状态"
                options={statusOptions}
              />
              {menuType !== 'F' && visible !== '0' && (
                <ProFormText
                  name="remark"
                  label="激活路由"
                  placeholder="请输入隐藏菜单默认激活的路由"
                />
              )}
            </>
          )}
        </ProFormDependency>
      </ModalForm>
      <Modal
        title="级联删除菜单"
        open={cascadeOpen}
        confirmLoading={cascadeLoading}
        okButtonProps={{ danger: true }}
        okText="删除"
        onOk={submitCascadeDelete}
        onCancel={() => {
          setCascadeOpen(false);
          setCascadeCheckedKeys([]);
        }}
      >
        <Tree
          checkable
          defaultExpandAll
          checkedKeys={cascadeCheckedKeys}
          treeData={cascadeTreeData}
          onCheck={(checked) => {
            const keys = Array.isArray(checked) ? checked : checked.checked;
            setCascadeCheckedKeys(keys);
          }}
        />
      </Modal>
    </PageContainer>
  );
};

export default MenuPage;
