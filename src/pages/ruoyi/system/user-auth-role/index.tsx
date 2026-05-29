import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import { Button, Card, Descriptions, message, Space, Tag } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { RoleItem } from '@/services/ruoyi/role';
import {
  getAuthRole,
  type RuoyiUser,
  updateAuthRole,
} from '@/services/ruoyi/user';

type AuthRolePageProps = {
  userId?: string;
};

const AuthRolePage = ({ userId: propUserId }: AuthRolePageProps) => {
  const params = useParams<{ userId?: string }>();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<RuoyiUser>();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRoleKeys, setSelectedRoleKeys] = useState<string[]>([]);

  const userId = propUserId || params.userId;

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    setLoading(true);
    getAuthRole(userId)
      .then((response) => {
        if (!mounted) return;
        const nextRoles = response.data?.roles || [];
        setUser(response.data?.user);
        setRoles(nextRoles);
        setSelectedRoleKeys(
          nextRoles
            .filter((role) => role.flag)
            .map((role) => String(role.roleId)),
        );
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [userId]);

  const selectedRowKeys = useMemo(
    () => selectedRoleKeys.map(String),
    [selectedRoleKeys],
  );

  const backToUserList = () => {
    history.push('/system/user');
  };

  const submit = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateAuthRole({
        userId,
        roleIds: selectedRoleKeys.join(','),
      });
      messageApi.success('授权成功');
      backToUserList();
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (record: RoleItem) => {
    if (record.status !== '0' || !record.roleId) return;
    const key = String(record.roleId);
    setSelectedRoleKeys((keys) =>
      keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key],
    );
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
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        '0': { text: '正常' },
        '1': { text: '停用' },
      },
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
  ];

  return (
    <PageContainer
      title="分配角色"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={backToUserList}>
          返回
        </Button>
      }
    >
      {messageContextHolder}
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="用户昵称">
            {user?.nickName || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="登录账号">
            {user?.userName || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <ProTable<RoleItem>
        rowKey={(record) => String(record.roleId)}
        loading={loading}
        columns={columns}
        dataSource={roles}
        search={false}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total: number) => `共 ${total} 条`,
        }}
        rowSelection={{
          selectedRowKeys,
          preserveSelectedRowKeys: true,
          getCheckboxProps: (record) => ({
            disabled: record.status !== '0',
          }),
          onChange: (keys) => {
            setSelectedRoleKeys(keys.map(String));
          },
        }}
        onRow={(record) => ({
          onClick: () => toggleRole(record),
        })}
        toolBarRender={() => [
          <Space key="actions">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={submit}
            >
              提交
            </Button>
            <Button onClick={backToUserList}>返回</Button>
          </Space>,
        ]}
      />
    </PageContainer>
  );
};

export default AuthRolePage;
