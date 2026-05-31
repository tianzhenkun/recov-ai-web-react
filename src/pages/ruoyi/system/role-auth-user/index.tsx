import {
  ArrowLeftOutlined,
  CloseCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import { Button, Modal, message, Space, Tag } from 'antd';
import { useRef, useState } from 'react';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import { type RuoyiDictOption, useRuoyiDict } from '@/hooks/useRuoyiDict';
import {
  allocatedUserList,
  authUserCancel,
  authUserCancelAll,
  authUserSelectAll,
  unallocatedUserList,
} from '@/services/ruoyi/role';
import type { RuoyiUser, UserQuery } from '@/services/ruoyi/user';

type RoleAuthUserSearchParams = {
  current?: number;
  pageSize?: number;
  userName?: string;
  phonenumber?: string;
};

type RoleAuthUserPageProps = {
  roleId?: string;
};

const statusFallback: RuoyiDictOption[] = [
  { label: '正常', value: '0', raw: { dictLabel: '正常', dictValue: '0' } },
  { label: '停用', value: '1', raw: { dictLabel: '停用', dictValue: '1' } },
];

const toUserQuery = (
  params: RoleAuthUserSearchParams,
  roleId?: string,
): UserQuery => ({
  pageNum: params.current || 1,
  pageSize: params.pageSize || 10,
  roleId,
  userName: params.userName,
  phonenumber: params.phonenumber,
});

const RoleAuthUserPage = ({ roleId: propRoleId }: RoleAuthUserPageProps) => {
  const params = useParams<{ roleId?: string }>();
  const roleId = propRoleId || params.roleId;
  const actionRef = useRef<ActionType | null>(null);
  const selectActionRef = useRef<ActionType | null>(null);
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [selectedRows, setSelectedRows] = useState<RuoyiUser[]>([]);
  const [selectOpen, setSelectOpen] = useState(false);
  const [selectRows, setSelectRows] = useState<RuoyiUser[]>([]);
  const { options: statusOptions } = useRuoyiDict(
    'sys_normal_disable',
    statusFallback,
  );

  const selectedIds = selectedRows
    .map((item) => item.userId)
    .filter(Boolean) as (number | string)[];
  const selectIds = selectRows.map((item) => item.userId).filter(Boolean) as (
    | number
    | string
  )[];

  const backToRoleList = () => {
    history.push('/system/role');
  };

  const reloadTable = () => {
    setSelectedRows([]);
    actionRef.current?.reloadAndRest?.();
  };

  const confirmCancelAuth = (records: RuoyiUser[]) => {
    const userIds = records.map((item) => item.userId).filter(Boolean) as (
      | number
      | string
    )[];
    if (!roleId || userIds.length === 0) return;
    const isBatch = records.length > 1;

    modalApi.confirm({
      title: isBatch ? '确认批量取消授权' : '确认取消授权',
      content: isBatch
        ? `将取消 ${records.length} 个用户的当前角色授权。`
        : `将取消用户“${records[0].userName || records[0].nickName || records[0].userId}”的当前角色授权。`,
      okText: '确认取消',
      cancelText: '取消',
      autoFocusButton: 'cancel',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (isBatch) {
          await authUserCancelAll({
            roleId,
            userIds: userIds.join(','),
          });
        } else {
          await authUserCancel({
            roleId,
            userId: userIds[0],
          });
        }
        messageApi.success('取消授权成功');
        reloadTable();
      },
    });
  };

  const submitSelectUsers = async () => {
    if (!roleId) return;
    if (selectIds.length === 0) {
      messageApi.error('请选择要分配的用户');
      return;
    }

    await authUserSelectAll({
      roleId,
      userIds: selectIds.join(','),
    });
    messageApi.success('分配成功');
    setSelectOpen(false);
    setSelectRows([]);
    reloadTable();
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
      search: false,
      ellipsis: true,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
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
      width: 96,
      render: (_, record) =>
        record.status === '1' ? (
          <Tag color="default">停用</Tag>
        ) : (
          <Tag color="success">正常</Tag>
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
      width: 64,
      align: 'left',
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'cancel',
              label: '取消授权',
              danger: true,
              icon: <CloseCircleOutlined />,
              permissions: 'system:role:remove',
              onClick: () => confirmCancelAuth([record]),
            },
          ]}
        />
      ),
    },
  ];

  const selectColumns: ProColumns<RuoyiUser>[] = columns.filter(
    (column) => column.valueType !== 'option',
  );

  return (
    <PageContainer
      title="分配用户"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={backToRoleList}>
          返回
        </Button>
      }
    >
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<RuoyiUser, RoleAuthUserSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.userId)}
        columns={columns}
        search={{ labelWidth: 96 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total: number) => `共 ${total} 条`,
        }}
        request={async (tableParams) => {
          if (!roleId) {
            return { data: [], total: 0, success: true };
          }
          const response = await allocatedUserList(
            toUserQuery(tableParams, roleId),
          );
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
            permissions="system:role:add"
            onClick={() => {
              setSelectRows([]);
              setSelectOpen(true);
              selectActionRef.current?.reloadAndRest?.();
            }}
          >
            添加用户
          </PermissionButton>,
          <PermissionButton
            key="cancel"
            danger
            icon={<CloseCircleOutlined />}
            permissions="system:role:remove"
            disabled={selectedRows.length === 0}
            onClick={() => confirmCancelAuth(selectedRows)}
          >
            批量取消授权
          </PermissionButton>,
          <Button
            key="back"
            icon={<ArrowLeftOutlined />}
            onClick={backToRoleList}
          >
            关闭
          </Button>,
        ]}
      />
      <Modal
        title="选择用户"
        open={selectOpen}
        width={900}
        destroyOnHidden
        onCancel={() => {
          setSelectOpen(false);
          setSelectRows([]);
        }}
        footer={
          <Space>
            <Button type="primary" onClick={submitSelectUsers}>
              确定
            </Button>
            <Button
              onClick={() => {
                setSelectOpen(false);
                setSelectRows([]);
              }}
            >
              取消
            </Button>
          </Space>
        }
      >
        <ProTable<RuoyiUser, RoleAuthUserSearchParams>
          actionRef={selectActionRef}
          rowKey={(record) => String(record.userId)}
          columns={selectColumns}
          search={{ labelWidth: 96 }}
          pagination={{
            defaultPageSize: 10,
            showTotal: (total: number) => `共 ${total} 条`,
          }}
          request={async (tableParams) => {
            if (!selectOpen || !roleId) {
              return { data: [], total: 0, success: true };
            }
            const response = await unallocatedUserList(
              toUserQuery(tableParams, roleId),
            );
            return {
              data: response.rows || [],
              total: response.total || 0,
              success: true,
            };
          }}
          rowSelection={{
            selectedRowKeys: selectIds.map(String),
            onChange: (_, rows) => setSelectRows(rows),
          }}
          options={false}
          toolBarRender={false}
        />
      </Modal>
    </PageContainer>
  );
};

export default RoleAuthUserPage;
