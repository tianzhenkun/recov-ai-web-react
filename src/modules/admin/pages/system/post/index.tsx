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
  ProFormDigit,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Input, Modal, message, Tag, Tree, TreeSelect } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { type RuoyiDictOption, useRuoyiDict } from '@/hooks/useRuoyiDict';
import type { DeptTreeItem } from '@/modules/admin/services/dept';
import {
  addPost,
  deletePosts,
  exportPosts,
  getPost,
  getPostDeptTree,
  listPosts,
  type PostForm,
  type PostItem,
  type PostQuery,
  updatePost,
} from '@/modules/admin/services/post';
import { toAntdTreeData } from '@/utils/ruoyiTree';

type PostSearchParams = {
  current?: number;
  pageSize?: number;
  deptId?: number | string;
  belongDeptId?: number | string;
  postCode?: string;
  postName?: string;
  postCategory?: string;
  status?: string;
};

const statusFallback: RuoyiDictOption[] = [
  { label: '正常', value: '0', raw: { dictLabel: '正常', dictValue: '0' } },
  { label: '停用', value: '1', raw: { dictLabel: '停用', dictValue: '1' } },
];

const getDeptLabel = (node: DeptTreeItem) =>
  node.label || String(node.id ?? '');

const filterDeptTree = (
  nodes: DeptTreeItem[] = [],
  keyword = '',
): DeptTreeItem[] => {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) return nodes;

  return nodes.reduce<DeptTreeItem[]>((result, node) => {
    const children = filterDeptTree(node.children || [], normalizedKeyword);
    if (getDeptLabel(node).includes(normalizedKeyword) || children.length > 0) {
      result.push({
        ...node,
        children,
      });
    }
    return result;
  }, []);
};

const toPostQuery = (
  params: PostSearchParams,
  selectedDeptId?: number | string,
): PostQuery => ({
  pageNum: params.current || 1,
  pageSize: params.pageSize || 10,
  deptId: params.deptId,
  belongDeptId: params.deptId ? undefined : selectedDeptId,
  postCode: params.postCode,
  postName: params.postName,
  postCategory: params.postCategory,
  status: params.status,
});

const toPostPayload = (record: PostForm | undefined, values: PostForm) => {
  const merged = { ...(record || {}), ...values };
  return {
    postId: merged.postId,
    deptId: merged.deptId,
    postCode: merged.postCode,
    postName: merged.postName,
    postCategory: merged.postCategory,
    postSort: merged.postSort,
    status: merged.status,
    remark: merged.remark,
  };
};

const PostPage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const latestQueryRef = useRef<PostQuery>({ pageNum: 1, pageSize: 10 });
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [selectedRows, setSelectedRows] = useState<PostItem[]>([]);
  const [deptTree, setDeptTree] = useState<DeptTreeItem[]>([]);
  const [deptKeyword, setDeptKeyword] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<number | string>();
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PostForm>();
  const { options: statusOptions } = useRuoyiDict(
    'sys_normal_disable',
    statusFallback,
  );
  const openDeleteConfirm = useDeleteConfirm({
    modal: modalApi,
    messageApi,
  });
  const deptTreeData = useMemo(
    () => toAntdTreeData(filterDeptTree(deptTree, deptKeyword)),
    [deptKeyword, deptTree],
  );
  const allDeptTreeData = useMemo(() => toAntdTreeData(deptTree), [deptTree]);
  const selectedIds = selectedRows
    .map((item) => item.postId)
    .filter(Boolean) as (number | string)[];
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

  const loadDeptTree = async () => {
    const response = await getPostDeptTree();
    setDeptTree(response.data || []);
  };

  const ensureDeptTree = async () => {
    if (deptTree.length > 0) return;
    await loadDeptTree();
  };

  const openCreateForm = async () => {
    setFormLoading(true);
    try {
      await ensureDeptTree();
      setEditingRecord({
        status: '0',
        postSort: 0,
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const openUpdateForm = async (record: PostItem) => {
    if (!record.postId) return;
    setFormLoading(true);
    try {
      const [detailResponse] = await Promise.all([
        getPost(record.postId),
        ensureDeptTree(),
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

  const confirmDelete = (records: PostItem[]) => {
    const ids = records.map((item) => item.postId).filter(Boolean) as (
      | number
      | string
    )[];
    if (ids.length === 0) return;

    openDeleteConfirm({
      records,
      entityName: '岗位',
      unit: '个',
      getName: (record) => record.postName || record.postCode || record.postId,
      description: '删除后，该岗位将不能再被用户关联。',
      batchDescription: '删除后，这些岗位将不能再被用户关联。',
      onConfirm: async () => {
        await deletePosts(ids);
      },
      onSuccess: reloadTable,
    });
  };

  const columns: ProColumns<PostItem>[] = [
    {
      title: '岗位编码',
      dataIndex: 'postCode',
      ellipsis: true,
    },
    {
      title: '类别编码',
      dataIndex: 'postCategory',
      ellipsis: true,
    },
    {
      title: '岗位名称',
      dataIndex: 'postName',
      ellipsis: true,
    },
    {
      title: '部门',
      dataIndex: 'deptName',
      search: false,
      ellipsis: true,
    },
    {
      title: '部门',
      dataIndex: 'deptId',
      valueType: 'treeSelect',
      hideInTable: true,
      fieldProps: {
        treeData: allDeptTreeData,
        treeDefaultExpandAll: true,
        placeholder: '请选择部门',
        allowClear: true,
      },
    },
    {
      title: '排序',
      dataIndex: 'postSort',
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
      width: 96,
      align: 'left',
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'edit',
              label: '修改',
              icon: <EditOutlined />,
              permissions: 'system:post:edit',
              onClick: () => openUpdateForm(record),
            },
            {
              key: 'delete',
              label: '删除',
              danger: true,
              icon: <DeleteOutlined />,
              permissions: 'system:post:remove',
              onClick: () => confirmDelete([record]),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer title="岗位管理">
      {messageContextHolder}
      {modalContextHolder}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 240,
            flex: '0 0 240px',
            padding: 16,
            background: '#fff',
            borderRadius: 6,
            border: '1px solid #f0f0f0',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <span style={{ fontWeight: 600 }}>部门</span>
            <Button
              size="small"
              type="link"
              onClick={() => {
                setSelectedDeptId(undefined);
                actionRef.current?.reloadAndRest?.();
              }}
            >
              全部
            </Button>
          </div>
          <Input
            allowClear
            placeholder="请输入部门名称"
            style={{ marginBottom: 12 }}
            value={deptKeyword}
            onChange={(event) => setDeptKeyword(event.target.value)}
          />
          <Tree
            treeData={deptTreeData}
            selectedKeys={selectedDeptId ? [selectedDeptId] : []}
            defaultExpandAll
            onSelect={(keys) => {
              const nextDeptId = keys[0] as number | string | undefined;
              setSelectedDeptId(nextDeptId);
              actionRef.current?.reloadAndRest?.();
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ProTable<PostItem, PostSearchParams>
            actionRef={actionRef}
            rowKey={(record) => String(record.postId)}
            columns={columns}
            search={{ labelWidth: 96 }}
            pagination={{
              defaultPageSize: 10,
              showTotal: (total: number) => `共 ${total} 条`,
            }}
            params={{ belongDeptId: selectedDeptId }}
            request={async (params) => {
              if (deptTree.length === 0) {
                await loadDeptTree();
              }
              const query = toPostQuery(params, selectedDeptId);
              latestQueryRef.current = query;
              const response = await listPosts(query);
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
                permissions="system:post:add"
                onClick={openCreateForm}
              >
                新增
              </PermissionButton>,
              <PermissionButton
                key="edit"
                icon={<EditOutlined />}
                permissions="system:post:edit"
                disabled={selectedRows.length !== 1}
                onClick={() => openUpdateForm(selectedRows[0])}
              >
                修改
              </PermissionButton>,
              <PermissionButton
                key="delete"
                danger
                icon={<DeleteOutlined />}
                permissions="system:post:remove"
                disabled={selectedRows.length === 0}
                onClick={() => confirmDelete(selectedRows)}
              >
                删除
              </PermissionButton>,
              <PermissionButton
                key="export"
                icon={<DownloadOutlined />}
                permissions="system:post:export"
                onClick={async () => {
                  await exportPosts(latestQueryRef.current);
                  messageApi.success('导出任务已开始');
                }}
              >
                导出
              </PermissionButton>,
            ]}
          />
        </div>
      </div>
      <ModalForm<PostForm>
        key={editingRecord?.postId || 'create'}
        title={editingRecord?.postId ? '修改岗位' : '添加岗位'}
        open={formOpen}
        loading={formLoading}
        modalProps={{
          destroyOnHidden: true,
          width: 520,
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
          const payload = toPostPayload(editingRecord, values);
          if (editingRecord?.postId) {
            await updatePost(payload);
          } else {
            await addPost(payload);
          }
          messageApi.success('操作成功');
          reloadTable();
          return true;
        }}
      >
        <ProFormText
          name="postName"
          label="岗位名称"
          placeholder="请输入岗位名称"
          rules={[{ required: true, message: '岗位名称不能为空' }]}
        />
        <ProForm.Item
          name="deptId"
          label="部门"
          rules={[{ required: true, message: '部门不能为空' }]}
        >
          <TreeSelect
            treeData={allDeptTreeData}
            placeholder="请选择部门"
            treeDefaultExpandAll
            allowClear
          />
        </ProForm.Item>
        <ProFormText
          name="postCode"
          label="岗位编码"
          placeholder="请输入编码名称"
          rules={[{ required: true, message: '岗位编码不能为空' }]}
        />
        <ProFormText
          name="postCategory"
          label="类别编码"
          placeholder="请输入类别编码"
        />
        <ProFormDigit
          name="postSort"
          label="岗位顺序"
          min={0}
          rules={[{ required: true, message: '岗位顺序不能为空' }]}
        />
        <ProFormRadio.Group
          name="status"
          label="岗位状态"
          options={statusOptions}
        />
        <ProFormTextArea
          name="remark"
          label="备注"
          placeholder="请输入内容"
          fieldProps={{ rows: 3, maxLength: 200, showCount: true }}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default PostPage;
