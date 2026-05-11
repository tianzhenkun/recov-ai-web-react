import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Modal,
  message,
  Switch,
  Tree,
  TreeSelect,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { addRuoyiDateRange } from '@/adapters/ruoyi/params';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { type RuoyiDictOption, useRuoyiDict } from '@/hooks/useRuoyiDict';
import { getConfigKey } from '@/services/ruoyi/config';
import { type DeptTreeItem, getUserDeptTree } from '@/services/ruoyi/dept';
import { type PostItem, selectPosts } from '@/services/ruoyi/post';
import { type RoleItem, selectRoles } from '@/services/ruoyi/role';
import {
  addUser,
  changeUserStatus,
  deleteUsers,
  downloadUserImportTemplate,
  exportUsers,
  getUser,
  importUsers,
  listUsers,
  type RuoyiUser,
  resetUserPassword,
  type UserForm,
  type UserQuery,
  updateUser,
} from '@/services/ruoyi/user';
import { toAntdTreeData } from '@/utils/ruoyiTree';

type UserSearchParams = {
  current?: number;
  pageSize?: number;
  userName?: string;
  nickName?: string;
  phonenumber?: string;
  status?: string;
  deptId?: number | string;
  createTimeRange?: unknown;
};

type PasswordForm = {
  password?: string;
};

const passwordIllegalPattern = /^[^<>"'|\\]+$/;
const phonePattern = /^1[3456789][0-9]\d{8}$/;
const htmlTagPattern = /<\/?[^>]+>/g;
const htmlBreakPattern = /<br\s*\/?>/gi;
const importFilePattern = /\.(xls|xlsx)$/i;

const statusFallback: RuoyiDictOption[] = [
  { label: '正常', value: '0', raw: { dictLabel: '正常', dictValue: '0' } },
  { label: '停用', value: '1', raw: { dictLabel: '停用', dictValue: '1' } },
];

const sexFallback: RuoyiDictOption[] = [
  { label: '男', value: '0', raw: { dictLabel: '男', dictValue: '0' } },
  { label: '女', value: '1', raw: { dictLabel: '女', dictValue: '1' } },
  { label: '未知', value: '2', raw: { dictLabel: '未知', dictValue: '2' } },
];

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

const toUserQuery = (params: UserSearchParams): UserQuery => {
  const [beginTime, endTime] = Array.isArray(params.createTimeRange)
    ? params.createTimeRange
    : [];

  return addRuoyiDateRange(
    {
      pageNum: params.current || 1,
      pageSize: params.pageSize || 10,
      userName: params.userName,
      nickName: params.nickName,
      phonenumber: params.phonenumber,
      status: params.status,
      deptId: params.deptId,
    },
    [formatRangeTime(beginTime, 'start'), formatRangeTime(endTime, 'end')],
  );
};

const toSelectOptions = <T extends Record<string, unknown>>(
  rows: T[],
  labelKey: keyof T,
  valueKey: keyof T,
) =>
  rows
    .filter((item) => item[valueKey] !== undefined && item[valueKey] !== null)
    .map((item) => ({
      label: String(item[labelKey] ?? item[valueKey] ?? ''),
      value: item[valueKey] as number | string,
      disabled: item.status === '1',
    }));

const isAdminUser = (record?: Pick<RuoyiUser, 'admin' | 'userId'>) =>
  Boolean(record?.admin) || String(record?.userId ?? '') === '1';

const normalizeImportResult = (message?: string | null) =>
  message?.replace(htmlBreakPattern, '\n').replace(htmlTagPattern, '') ||
  '用户导入完成';

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

const filterDisabledDeptTree = (nodes: DeptTreeItem[] = []): DeptTreeItem[] =>
  nodes
    .filter((node) => !node.disabled)
    .map((node) => ({
      ...node,
      children: filterDisabledDeptTree(node.children || []),
    }));

const toUserPayload = (
  record: UserForm | undefined,
  values: UserForm,
  currentUserId?: number | string,
) => {
  const merged = { ...(record || {}), ...values };
  const isEditingCurrentUser =
    merged.userId !== undefined &&
    currentUserId !== undefined &&
    String(merged.userId) === String(currentUserId);
  return {
    userId: merged.userId,
    deptId: merged.deptId,
    userName: merged.userName,
    nickName: merged.nickName,
    password: merged.password,
    phonenumber: merged.phonenumber,
    email: merged.email,
    sex: merged.sex,
    status: merged.status,
    remark: merged.remark,
    postIds: isEditingCurrentUser ? undefined : merged.postIds || [],
    roleIds: isEditingCurrentUser ? undefined : merged.roleIds || [],
  };
};

const UserPage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const latestQueryRef = useRef<UserQuery>({ pageNum: 1, pageSize: 10 });
  const { initialState } = useModel('@@initialState');
  const currentUserId = initialState?.currentUser?.userid;
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [selectedRows, setSelectedRows] = useState<RuoyiUser[]>([]);
  const [deptTree, setDeptTree] = useState<DeptTreeItem[]>([]);
  const [deptKeyword, setDeptKeyword] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<number | string>();
  const [roleOptions, setRoleOptions] = useState<RoleItem[]>([]);
  const [postOptions, setPostOptions] = useState<PostItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<UserForm>();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetRecord, setResetRecord] = useState<RuoyiUser>();
  const [importOpen, setImportOpen] = useState(false);
  const [importUploading, setImportUploading] = useState(false);
  const [importUpdateSupport, setImportUpdateSupport] = useState(false);
  const [importFile, setImportFile] = useState<File>();
  const { options: statusOptions } = useRuoyiDict(
    'sys_normal_disable',
    statusFallback,
  );
  const { options: sexOptions } = useRuoyiDict('sys_user_sex', sexFallback);
  const openDeleteConfirm = useDeleteConfirm({
    modal: modalApi,
    messageApi,
  });
  const deptTreeData = useMemo(
    () => toAntdTreeData(filterDeptTree(deptTree, deptKeyword)),
    [deptKeyword, deptTree],
  );
  const enabledDeptTreeData = useMemo(
    () => toAntdTreeData(filterDisabledDeptTree(deptTree)),
    [deptTree],
  );
  const selectedIds = selectedRows
    .map((item) => item.userId)
    .filter(Boolean) as (number | string)[];
  const editingCurrentUser =
    editingRecord?.userId !== undefined &&
    currentUserId !== undefined &&
    String(editingRecord.userId) === String(currentUserId);

  useEffect(() => {
    let mounted = true;

    getUserDeptTree().then((response) => {
      if (mounted) {
        setDeptTree(response.data || []);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const reloadTable = () => {
    setSelectedRows([]);
    actionRef.current?.reloadAndRest?.();
  };

  const resetImportModal = () => {
    setImportOpen(false);
    setImportUploading(false);
    setImportUpdateSupport(false);
    setImportFile(undefined);
    if (importInputRef.current) {
      importInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    await downloadUserImportTemplate();
    messageApi.success('模板下载已开始');
  };

  const submitImportUsers = async () => {
    if (!importFile) {
      messageApi.warning('请选择要导入的文件');
      return;
    }

    setImportUploading(true);
    try {
      const response = await importUsers(importFile, importUpdateSupport);
      const resultMessage = normalizeImportResult(
        response.msg || response.data,
      );
      resetImportModal();
      modalApi.info({
        title: '导入结果',
        content: <div style={{ whiteSpace: 'pre-wrap' }}>{resultMessage}</div>,
      });
      reloadTable();
    } finally {
      setImportUploading(false);
    }
  };

  const loadPostOptionsByDept = async (deptId?: number | string) => {
    const response = await selectPosts({ deptId });
    setPostOptions(response.data || []);
  };

  const openCreateForm = async () => {
    setFormLoading(true);
    try {
      const [rolesResult, postsResult, passwordResult] =
        await Promise.allSettled([
          selectRoles(),
          selectPosts(),
          getConfigKey('sys.user.initPassword'),
        ]);
      const roles =
        rolesResult.status === 'fulfilled' ? rolesResult.value.data || [] : [];
      const posts =
        postsResult.status === 'fulfilled' ? postsResult.value.data || [] : [];
      const initPassword =
        passwordResult.status === 'fulfilled'
          ? passwordResult.value.data
          : undefined;
      setRoleOptions(roles);
      setPostOptions(posts);
      setEditingRecord({
        status: '0',
        sex: '2',
        password: initPassword,
        roleIds: [],
        postIds: [],
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const openUpdateForm = async (record: RuoyiUser) => {
    if (!record.userId) return;
    if (isAdminUser(record)) {
      messageApi.warning('超级管理员不允许修改');
      return;
    }

    setFormLoading(true);
    try {
      const response = await getUser(record.userId);
      const detail = response.data;
      setRoleOptions(detail?.roles || []);
      setPostOptions(detail?.posts || []);
      setEditingRecord({
        ...record,
        ...detail?.user,
        roleIds: detail?.roleIds || detail?.user?.roleIds || [],
        postIds: detail?.postIds || detail?.user?.postIds || [],
        password: undefined,
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (records: RuoyiUser[]) => {
    if (records.some(isAdminUser)) {
      messageApi.warning('超级管理员不允许删除');
      return;
    }

    const ids = records.map((item) => item.userId).filter(Boolean) as (
      | number
      | string
    )[];
    if (ids.length === 0) return;

    openDeleteConfirm({
      records,
      entityName: '用户',
      unit: '个',
      getName: (record) => record.userName || record.nickName || record.userId,
      description: '删除后，该用户将无法登录系统。',
      batchDescription: '删除后，这些用户将无法登录系统。',
      onConfirm: async () => {
        await deleteUsers(ids);
      },
      onSuccess: reloadTable,
    });
  };

  const confirmStatusChange = (record: RuoyiUser, status: string) => {
    if (!record.userId) return;
    if (isAdminUser(record)) {
      messageApi.warning('超级管理员不允许变更状态');
      return;
    }

    const actionText = status === '0' ? '启用' : '停用';

    modalApi.confirm({
      title: `确认${actionText}用户`,
      content: `用户“${record.userName || record.nickName || record.userId}”将被${actionText}。`,
      okText: `确认${actionText}`,
      cancelText: '取消',
      autoFocusButton: 'cancel',
      okButtonProps: { danger: status === '1' },
      onOk: async () => {
        await changeUserStatus(record.userId as number | string, status);
        messageApi.success('操作成功');
        actionRef.current?.reload?.();
      },
    });
  };

  const columns: ProColumns<RuoyiUser>[] = [
    {
      title: '用户名称',
      dataIndex: 'userName',
      ellipsis: true,
    },
    {
      title: '用户昵称',
      dataIndex: 'nickName',
      ellipsis: true,
    },
    {
      title: '部门',
      dataIndex: 'deptName',
      search: false,
      ellipsis: true,
    },
    {
      title: '手机号码',
      dataIndex: 'phonenumber',
      ellipsis: true,
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
          disabled={isAdminUser(record)}
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
      render: (_, record) =>
        isAdminUser(record) ? null : (
          <TableActions
            actions={[
              {
                key: 'edit',
                label: '修改',
                icon: <EditOutlined />,
                permissions: 'system:user:edit',
                onClick: () => openUpdateForm(record),
              },
              {
                key: 'reset',
                label: '重置密码',
                icon: <KeyOutlined />,
                permissions: 'system:user:resetPwd',
                onClick: () => {
                  setResetRecord(record);
                  setResetOpen(true);
                },
              },
              {
                key: 'auth',
                label: '分配角色',
                icon: <SafetyCertificateOutlined />,
                permissions: 'system:user:edit',
                onClick: () =>
                  history.push(`/system/user-auth/role/${record.userId}`),
              },
              {
                key: 'delete',
                label: '删除',
                danger: true,
                icon: <DeleteOutlined />,
                permissions: 'system:user:remove',
                onClick: () => confirmDelete([record]),
              },
            ]}
          />
        ),
    },
  ];

  return (
    <PageContainer title="用户管理">
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
          <ProTable<RuoyiUser, UserSearchParams>
            actionRef={actionRef}
            rowKey={(record) => String(record.userId)}
            columns={columns}
            search={{ labelWidth: 96 }}
            pagination={{ defaultPageSize: 10 }}
            params={{ deptId: selectedDeptId }}
            request={async (params) => {
              const query = toUserQuery({ ...params, deptId: selectedDeptId });
              latestQueryRef.current = query;
              const response = await listUsers(query);
              return {
                data: response.rows || [],
                total: response.total || 0,
                success: true,
              };
            }}
            rowSelection={{
              selectedRowKeys: selectedIds.map(String),
              onChange: (_, rows) => setSelectedRows(rows),
              getCheckboxProps: (record) => ({ disabled: isAdminUser(record) }),
            }}
            toolBarRender={() => [
              <PermissionButton
                key="add"
                type="primary"
                icon={<PlusOutlined />}
                permissions="system:user:add"
                onClick={openCreateForm}
              >
                新增
              </PermissionButton>,
              <PermissionButton
                key="edit"
                icon={<EditOutlined />}
                permissions="system:user:edit"
                disabled={selectedRows.length !== 1}
                onClick={() => openUpdateForm(selectedRows[0])}
              >
                修改
              </PermissionButton>,
              <PermissionButton
                key="delete"
                danger
                icon={<DeleteOutlined />}
                permissions="system:user:remove"
                disabled={selectedRows.length === 0}
                onClick={() => confirmDelete(selectedRows)}
              >
                删除
              </PermissionButton>,
              <PermissionButton
                key="import"
                icon={<UploadOutlined />}
                permissions="system:user:import"
                onClick={() => setImportOpen(true)}
              >
                导入
              </PermissionButton>,
              <Button
                key="template"
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
              >
                下载模板
              </Button>,
              <PermissionButton
                key="export"
                icon={<DownloadOutlined />}
                permissions="system:user:export"
                onClick={async () => {
                  await exportUsers(latestQueryRef.current);
                  messageApi.success('导出任务已开始');
                }}
              >
                导出
              </PermissionButton>,
            ]}
          />
        </div>
      </div>
      <ModalForm<UserForm>
        key={editingRecord?.userId || 'create'}
        title={editingRecord?.userId ? '修改用户' : '新增用户'}
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
          const payload = toUserPayload(editingRecord, values, currentUserId);
          if (editingRecord?.userId) {
            await updateUser(payload);
          } else {
            await addUser(payload);
          }
          messageApi.success('操作成功');
          reloadTable();
          return true;
        }}
      >
        <ProForm.Item
          name="deptId"
          label="归属部门"
          rules={[{ required: true, message: '请选择归属部门' }]}
        >
          <TreeSelect
            treeData={enabledDeptTreeData}
            placeholder="请选择归属部门"
            treeDefaultExpandAll
            allowClear
            onChange={(value) => {
              loadPostOptionsByDept(value as number | string | undefined);
            }}
          />
        </ProForm.Item>
        <ProFormText
          name="nickName"
          label="用户昵称"
          placeholder="请输入用户昵称"
          rules={[{ required: true, message: '请输入用户昵称' }]}
        />
        <ProFormText
          name="phonenumber"
          label="手机号码"
          placeholder="请输入手机号码"
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
        <ProFormText
          name="userName"
          label="用户名称"
          placeholder="请输入用户名称"
          disabled={Boolean(editingRecord?.userId)}
          fieldProps={{ maxLength: 30 }}
          rules={[
            { required: true, message: '请输入用户名称' },
            {
              min: 2,
              max: 20,
              message: '用户名称长度必须介于 2 和 20 之间',
            },
          ]}
        />
        {!editingRecord?.userId && (
          <ProFormText.Password
            name="password"
            label="用户密码"
            placeholder="请输入用户密码"
            fieldProps={{ maxLength: 20 }}
            rules={[
              { required: true, message: '请输入用户密码' },
              {
                min: 5,
                max: 20,
                message: '用户密码长度必须介于 5 和 20 之间',
              },
              {
                pattern: passwordIllegalPattern,
                message: '不能包含非法字符：< > " \' \\ |',
              },
            ]}
          />
        )}
        <ProFormSelect
          name="sex"
          label="用户性别"
          options={sexOptions}
          placeholder="请选择用户性别"
        />
        <ProFormSelect
          name="status"
          label="状态"
          options={statusOptions}
          placeholder="请选择状态"
        />
        {!editingCurrentUser && (
          <>
            <ProFormSelect
              name="postIds"
              label="岗位"
              options={toSelectOptions(postOptions, 'postName', 'postId')}
              fieldProps={{ mode: 'multiple' }}
              placeholder="请选择岗位"
            />
            <ProFormSelect
              name="roleIds"
              label="角色"
              options={toSelectOptions(roleOptions, 'roleName', 'roleId')}
              fieldProps={{ mode: 'multiple' }}
              placeholder="请选择角色"
              rules={[{ required: true, message: '用户角色不能为空' }]}
            />
          </>
        )}
        <ProFormTextArea
          name="remark"
          label="备注"
          fieldProps={{ rows: 3, maxLength: 200, showCount: true }}
        />
      </ModalForm>
      <Modal
        title="用户导入"
        open={importOpen}
        confirmLoading={importUploading}
        okText="确定"
        cancelText="取消"
        destroyOnHidden
        onOk={submitImportUsers}
        onCancel={resetImportModal}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            border: '1px dashed #d9d9d9',
            borderRadius: 6,
            background: '#fafafa',
          }}
        >
          <input
            ref={importInputRef}
            accept=".xls,.xlsx"
            disabled={importUploading}
            style={{ display: 'none' }}
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                setImportFile(undefined);
                return;
              }
              if (!importFilePattern.test(file.name)) {
                messageApi.warning('仅允许导入 xls、xlsx 格式文件');
                event.target.value = '';
                setImportFile(undefined);
                return;
              }
              setImportFile(file);
            }}
          />
          <Button
            icon={<UploadOutlined />}
            onClick={() => importInputRef.current?.click()}
          >
            选择文件
          </Button>
          <span style={{ color: importFile ? undefined : '#999' }}>
            {importFile?.name || '未选择文件'}
          </span>
        </div>
        <div style={{ marginTop: 16 }}>
          <Checkbox
            checked={importUpdateSupport}
            onChange={(event) => setImportUpdateSupport(event.target.checked)}
          >
            是否更新已经存在的用户数据
          </Checkbox>
        </div>
        <Alert
          showIcon
          style={{ marginTop: 16 }}
          type="info"
          message={
            <>
              仅允许导入 xls、xlsx 格式文件。
              <Button type="link" size="small" onClick={handleDownloadTemplate}>
                下载模板
              </Button>
            </>
          }
        />
      </Modal>
      <ModalForm<PasswordForm>
        title="重置密码"
        open={resetOpen}
        modalProps={{
          destroyOnHidden: true,
          onCancel: () => {
            setResetOpen(false);
            setResetRecord(undefined);
          },
        }}
        onOpenChange={(open) => {
          setResetOpen(open);
          if (!open) {
            setResetRecord(undefined);
          }
        }}
        onFinish={async (values) => {
          if (!resetRecord?.userId || !values.password) return false;
          await resetUserPassword(resetRecord.userId, values.password);
          messageApi.success('操作成功');
          return true;
        }}
      >
        <ProFormText
          label="用户名称"
          fieldProps={{ value: resetRecord?.userName }}
          disabled
        />
        <ProFormText.Password
          name="password"
          label="新密码"
          placeholder="请输入新密码"
          fieldProps={{ maxLength: 20 }}
          rules={[
            { required: true, message: '请输入新密码' },
            {
              min: 5,
              max: 20,
              message: '用户密码长度必须介于 5 和 20 之间',
            },
            {
              pattern: passwordIllegalPattern,
              message: '不能包含非法字符：< > " \' \\ |',
            },
          ]}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default UserPage;
