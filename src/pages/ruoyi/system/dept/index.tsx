import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProForm,
  ProFormDigit,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Modal, message, Tag, TreeSelect } from 'antd';
import type { Key } from 'react';
import { useMemo, useRef, useState } from 'react';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { type RuoyiDictOption, useRuoyiDict } from '@/hooks/useRuoyiDict';
import {
  addDept,
  type DeptForm,
  type DeptItem,
  type DeptQuery,
  deleteDept,
  getDept,
  listDepts,
  listDeptsExcludeChild,
  updateDept,
} from '@/services/ruoyi/dept';
import { listUsersByDeptId, type RuoyiUser } from '@/services/ruoyi/user';

type DeptSearchParams = {
  deptName?: string;
  deptCategory?: string;
  status?: string;
};

type DeptTreeSelectNode = {
  title: string;
  value: number | string;
  key: number | string;
  children?: DeptTreeSelectNode[];
};

const statusFallback: RuoyiDictOption[] = [
  { label: '正常', value: '0', raw: { dictLabel: '正常', dictValue: '0' } },
  { label: '停用', value: '1', raw: { dictLabel: '停用', dictValue: '1' } },
];

const phonePattern = /^1[3456789][0-9]\d{8}$/;

const normalizeId = (value: unknown) => String(value ?? '');

const flattenDeptRows = (rows: DeptItem[] = []): DeptItem[] =>
  rows.flatMap((row) => [row, ...flattenDeptRows(row.children || [])]);

const buildDeptTree = (rows: DeptItem[] = []) => {
  const flatRows = flattenDeptRows(rows);
  const nodeMap = new Map<string, DeptItem & { children: DeptItem[] }>();
  const roots: (DeptItem & { children: DeptItem[] })[] = [];

  flatRows.forEach((row) => {
    if (row.deptId === undefined || row.deptId === null) return;
    nodeMap.set(normalizeId(row.deptId), { ...row, children: [] });
  });

  flatRows.forEach((row) => {
    if (row.deptId === undefined || row.deptId === null) return;
    const node = nodeMap.get(normalizeId(row.deptId));
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
    nodes: (DeptItem & { children: DeptItem[] })[],
  ): DeptItem[] =>
    nodes
      .sort((left, right) => (left.orderNum || 0) - (right.orderNum || 0))
      .map((node) => ({
        ...node,
        children:
          node.children.length > 0
            ? sortAndPrune(
                node.children as (DeptItem & {
                  children: DeptItem[];
                })[],
              )
            : undefined,
      }));

  return sortAndPrune(roots);
};

const getAllDeptKeys = (nodes: DeptItem[] = []): Key[] =>
  nodes.flatMap((node) =>
    node.deptId === undefined || node.deptId === null
      ? getAllDeptKeys(node.children || [])
      : [String(node.deptId), ...getAllDeptKeys(node.children || [])],
  );

const toDeptTreeSelectData = (nodes: DeptItem[] = []): DeptTreeSelectNode[] =>
  nodes
    .filter((node) => node.deptId !== undefined && node.deptId !== null)
    .map((node) => ({
      title: node.deptName || String(node.deptId),
      value: node.deptId as number | string,
      key: node.deptId as number | string,
      children: toDeptTreeSelectData(node.children || []),
    }));

const toDeptQuery = (params: DeptSearchParams): DeptQuery => ({
  deptName: params.deptName,
  deptCategory: params.deptCategory,
  status: params.status,
});

const toDeptPayload = (record: DeptForm | undefined, values: DeptForm) => {
  const merged = { ...(record || {}), ...values };
  return {
    deptId: merged.deptId,
    parentId: merged.parentId,
    deptName: merged.deptName,
    deptCategory: merged.deptCategory,
    orderNum: merged.orderNum,
    leader: merged.leader,
    phone: merged.phone,
    email: merged.email,
    status: merged.status,
    ancestors: merged.ancestors,
  };
};

const DeptPage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DeptForm>();
  const [deptOptions, setDeptOptions] = useState<DeptItem[]>([]);
  const [deptTableData, setDeptTableData] = useState<DeptItem[]>([]);
  const [expandedDeptKeys, setExpandedDeptKeys] = useState<Key[]>([]);
  const [expandAll, setExpandAll] = useState(true);
  const [deptUsers, setDeptUsers] = useState<RuoyiUser[]>([]);
  const { options: statusOptions } = useRuoyiDict(
    'sys_normal_disable',
    statusFallback,
  );
  const openDeleteConfirm = useDeleteConfirm({
    modal: modalApi,
    messageApi,
  });
  const deptTreeSelectData = useMemo(
    () => toDeptTreeSelectData(deptOptions),
    [deptOptions],
  );
  const userOptions = useMemo(
    () =>
      deptUsers
        .filter((user) => user.userId !== undefined && user.userId !== null)
        .map((user) => ({
          label: user.userName || user.nickName || String(user.userId),
          value: user.userId as number | string,
        })),
    [deptUsers],
  );
  const statusLabelMap = useMemo(
    () =>
      new Map(
        statusOptions.map((option) => [String(option.value), option.label]),
      ),
    [statusOptions],
  );
  const showParentSelect = normalizeId(editingRecord?.parentId) !== '0';

  const reloadTable = () => {
    actionRef.current?.reload?.();
  };

  const loadDeptOptions = async () => {
    const response = await listDepts();
    return buildDeptTree(response.data || []);
  };

  const openCreateForm = async (parent?: DeptItem) => {
    setFormLoading(true);
    try {
      const nextDeptOptions = await loadDeptOptions();
      setDeptOptions(nextDeptOptions);
      setDeptUsers([]);
      setEditingRecord({
        parentId: parent?.deptId,
        orderNum: 0,
        status: '0',
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const openUpdateForm = async (record: DeptItem) => {
    if (!record.deptId) return;
    setFormLoading(true);
    try {
      const [detailResponse, excludeResponse, usersResponse] =
        await Promise.all([
          getDept(record.deptId),
          listDeptsExcludeChild(record.deptId),
          listUsersByDeptId(record.deptId),
        ]);
      const detail = detailResponse.data || {};
      const nextDeptOptions = buildDeptTree(excludeResponse.data || []);
      setDeptOptions(
        nextDeptOptions.length > 0
          ? nextDeptOptions
          : [
              {
                deptId: detail.parentId,
                deptName: detail.parentName,
                children: [],
              },
            ].filter(
              (item) => item.deptId !== undefined && item.deptId !== null,
            ),
      );
      setDeptUsers(usersResponse.data || []);
      setEditingRecord({
        ...record,
        ...detail,
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (record: DeptItem) => {
    if (!record.deptId) return;

    openDeleteConfirm({
      records: [record],
      entityName: '部门',
      getName: (item) => item.deptName || item.deptId,
      description: '删除后，该部门及其关联组织结构将不可用。',
      onConfirm: async () => {
        await deleteDept(record.deptId as number | string);
      },
      onSuccess: reloadTable,
    });
  };

  const columns: ProColumns<DeptItem>[] = [
    {
      title: '部门名称',
      dataIndex: 'deptName',
      width: 260,
      ellipsis: true,
    },
    {
      title: '类别编码',
      dataIndex: 'deptCategory',
      width: 160,
      ellipsis: true,
    },
    {
      title: '排序',
      dataIndex: 'orderNum',
      search: false,
      width: 96,
      align: 'center',
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      fieldProps: { options: statusOptions },
      width: 96,
      render: (_, record) =>
        record.status === '1' ? (
          <Tag color="default">
            {statusLabelMap.get(String(record.status)) || '停用'}
          </Tag>
        ) : (
          <Tag color="success">
            {statusLabelMap.get(String(record.status)) || '正常'}
          </Tag>
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
      title: '操作',
      valueType: 'option',
      width: 128,
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'edit',
              label: '修改',
              icon: <EditOutlined />,
              permissions: 'system:dept:edit',
              onClick: () => openUpdateForm(record),
            },
            {
              key: 'add',
              label: '新增',
              icon: <PlusOutlined />,
              permissions: 'system:dept:add',
              onClick: () => openCreateForm(record),
            },
            {
              key: 'delete',
              label: '删除',
              danger: true,
              icon: <DeleteOutlined />,
              permissions: 'system:dept:remove',
              onClick: () => confirmDelete(record),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer title="部门管理">
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<DeptItem, DeptSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.deptId)}
        columns={columns}
        search={{ labelWidth: 96 }}
        pagination={false}
        expandable={{
          expandedRowKeys: expandedDeptKeys,
          onExpandedRowsChange: (keys) => setExpandedDeptKeys([...keys]),
        }}
        request={async (params) => {
          const response = await listDepts(toDeptQuery(params));
          const data = buildDeptTree(response.data || []);
          const allKeys = getAllDeptKeys(data);
          setDeptTableData(data);
          setExpandedDeptKeys(expandAll ? allKeys : []);
          return {
            data,
            total: data.length,
            success: true,
          };
        }}
        toolBarRender={() => [
          <PermissionButton
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            permissions="system:dept:add"
            onClick={() => openCreateForm()}
          >
            新增
          </PermissionButton>,
          <Button
            key="toggle"
            onClick={() => {
              const nextExpandAll = !expandAll;
              setExpandAll(nextExpandAll);
              setExpandedDeptKeys(
                nextExpandAll ? getAllDeptKeys(deptTableData) : [],
              );
            }}
          >
            展开/折叠
          </Button>,
        ]}
      />
      <ModalForm<DeptForm>
        key={editingRecord?.deptId || 'create'}
        title={editingRecord?.deptId ? '修改部门' : '添加部门'}
        open={formOpen}
        loading={formLoading}
        modalProps={{
          destroyOnHidden: true,
          width: 600,
          onCancel: () => {
            setFormOpen(false);
            setEditingRecord(undefined);
            setDeptUsers([]);
          },
        }}
        initialValues={editingRecord}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingRecord(undefined);
            setDeptUsers([]);
          }
        }}
        onFinish={async (values) => {
          const payload = toDeptPayload(editingRecord, values);
          if (editingRecord?.deptId) {
            await updateDept(payload);
          } else {
            await addDept(payload);
          }
          messageApi.success('操作成功');
          reloadTable();
          return true;
        }}
      >
        {showParentSelect && (
          <ProForm.Item
            name="parentId"
            label="上级部门"
            rules={[{ required: true, message: '上级部门不能为空' }]}
          >
            <TreeSelect
              treeData={deptTreeSelectData}
              placeholder="选择上级部门"
              treeDefaultExpandAll
              treeCheckStrictly={false}
              allowClear={false}
            />
          </ProForm.Item>
        )}
        <ProFormText
          name="deptName"
          label="部门名称"
          placeholder="请输入部门名称"
          rules={[{ required: true, message: '部门名称不能为空' }]}
        />
        <ProFormText
          name="deptCategory"
          label="类别编码"
          placeholder="请输入类别编码"
        />
        <ProFormDigit
          name="orderNum"
          label="显示排序"
          min={0}
          rules={[{ required: true, message: '显示排序不能为空' }]}
        />
        <ProFormSelect
          name="leader"
          label="负责人"
          options={userOptions}
          placeholder="请选择负责人"
        />
        <ProFormText
          name="phone"
          label="联系电话"
          placeholder="请输入联系电话"
          fieldProps={{ maxLength: 11 }}
          rules={[
            {
              pattern: phonePattern,
              message: '请输入正确的手机号码',
            },
          ]}
        />
        <ProFormText
          name="email"
          label="邮箱"
          placeholder="请输入邮箱"
          fieldProps={{ maxLength: 50 }}
          rules={[{ type: 'email', message: '请输入正确的邮箱地址' }]}
        />
        <ProFormRadio.Group
          name="status"
          label="部门状态"
          options={statusOptions}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default DeptPage;
