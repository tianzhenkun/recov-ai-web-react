import { DeleteOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Modal, message, Tag } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useRef, useState } from 'react';
import TableActions from '@/components/TableActions';
import { type RuoyiDictOption, useRuoyiDict } from '@/hooks/useRuoyiDict';
import {
  forceLogoutOnlineUser,
  listOnlineUsers,
  type OnlineItem,
  type OnlineQuery,
} from '@/modules/admin/services/monitor-online';

type OnlineSearchParams = {
  current?: number;
  pageSize?: number;
  ipaddr?: string;
  userName?: string;
};

const deviceTypeFallback: RuoyiDictOption[] = [
  { label: '电脑', value: 'pc', raw: { dictLabel: '电脑', dictValue: 'pc' } },
  {
    label: '手机',
    value: 'mobile',
    raw: { dictLabel: '手机', dictValue: 'mobile' },
  },
];

const toOnlineQuery = (params: OnlineSearchParams): OnlineQuery => ({
  pageNum: params.current || 1,
  pageSize: params.pageSize || 10,
  ipaddr: params.ipaddr,
  userName: params.userName,
});

const formatLoginTime = (value?: number | string) => {
  if (!value) return '-';
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : String(value);
};

const OnlinePage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [logoutTokenId, setLogoutTokenId] = useState<string>();
  const { options: deviceTypeOptions } = useRuoyiDict(
    'sys_device_type',
    deviceTypeFallback,
  );
  const deviceLabelMap = useMemo(
    () =>
      new Map(
        deviceTypeOptions.map((option) => [String(option.value), option.label]),
      ),
    [deviceTypeOptions],
  );

  const forceLogout = (record: OnlineItem) => {
    if (!record.tokenId) return;

    modalApi.confirm({
      title: '强退在线用户',
      content: `确定强退用户「${record.userName || record.tokenId}」吗？`,
      okText: '确认强退',
      okButtonProps: { danger: true },
      cancelText: '取消',
      autoFocusButton: 'cancel',
      onOk: async () => {
        setLogoutTokenId(record.tokenId);
        try {
          await forceLogoutOnlineUser(record.tokenId as string);
          messageApi.success('强退成功');
          actionRef.current?.reload?.();
        } finally {
          setLogoutTokenId(undefined);
        }
      },
    });
  };

  const columns: ProColumns<OnlineItem>[] = [
    {
      title: '登录地址',
      dataIndex: 'ipaddr',
      hideInTable: true,
    },
    {
      title: '会话编号',
      dataIndex: 'tokenId',
      search: false,
      ellipsis: true,
      width: 180,
    },
    {
      title: '用户名称',
      dataIndex: 'userName',
      ellipsis: true,
      width: 128,
    },
    {
      title: '客户端',
      dataIndex: 'clientKey',
      search: false,
      ellipsis: true,
      width: 120,
    },
    {
      title: '设备类型',
      dataIndex: 'deviceType',
      search: false,
      width: 112,
      render: (_, record) => {
        const value = String(record.deviceType ?? '');
        return <Tag>{deviceLabelMap.get(value) || value || '-'}</Tag>;
      },
    },
    {
      title: '所属部门',
      dataIndex: 'deptName',
      search: false,
      ellipsis: true,
      width: 144,
    },
    {
      title: '主机',
      dataIndex: 'ipaddr',
      search: false,
      ellipsis: true,
      width: 136,
    },
    {
      title: '登录地点',
      dataIndex: 'loginLocation',
      search: false,
      ellipsis: true,
      width: 136,
    },
    {
      title: '操作系统',
      dataIndex: 'os',
      search: false,
      ellipsis: true,
      width: 136,
    },
    {
      title: '浏览器',
      dataIndex: 'browser',
      search: false,
      ellipsis: true,
      width: 136,
    },
    {
      title: '登录时间',
      dataIndex: 'loginTime',
      search: false,
      width: 180,
      renderText: (value) => formatLoginTime(value as number | string),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 72,
      align: 'left',
      render: (_, record) => (
        <TableActions
          maxVisible={1}
          actions={[
            {
              key: 'forceLogout',
              label: '强退',
              danger: true,
              icon: <DeleteOutlined />,
              loading: logoutTokenId === record.tokenId,
              permissions: 'monitor:online:forceLogout',
              onClick: () => forceLogout(record),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer title="在线用户">
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<OnlineItem, OnlineSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.tokenId)}
        search={{ labelWidth: 96 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total: number) => `共 ${total} 条`,
        }}
        columns={columns}
        request={async (params) => {
          const response = await listOnlineUsers(toOnlineQuery(params));
          return {
            data: response.rows || [],
            total: response.total || 0,
            success: true,
          };
        }}
      />
    </PageContainer>
  );
};

export default OnlinePage;
