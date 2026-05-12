import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProForm,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { Modal, message, Tag } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useRef, useState } from 'react';
import { PermissionButton } from '@/components/Permission';
import RichTextEditor from '@/components/RichTextEditor';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { type RuoyiDictOption, useRuoyiDict } from '@/hooks/useRuoyiDict';
import {
  addNotice,
  deleteNotices,
  getNotice,
  listNotices,
  type NoticeForm,
  type NoticeItem,
  type NoticeQuery,
  updateNotice,
} from '@/services/ruoyi/notice';
import { sanitizeHtml } from '@/utils/sanitizeHtml';

type NoticeSearchParams = {
  current?: number;
  pageSize?: number;
  noticeTitle?: string;
  createByName?: string;
  noticeType?: string;
};

const noticeTypeFallback: RuoyiDictOption[] = [
  { label: '通知', value: '1', raw: { dictLabel: '通知', dictValue: '1' } },
  { label: '公告', value: '2', raw: { dictLabel: '公告', dictValue: '2' } },
];

const noticeStatusFallback: RuoyiDictOption[] = [
  { label: '正常', value: '0', raw: { dictLabel: '正常', dictValue: '0' } },
  { label: '关闭', value: '1', raw: { dictLabel: '关闭', dictValue: '1' } },
];

const toNoticeQuery = (params: NoticeSearchParams): NoticeQuery => ({
  pageNum: params.current || 1,
  pageSize: params.pageSize || 10,
  noticeTitle: params.noticeTitle,
  createByName: params.createByName,
  noticeType: params.noticeType,
  status: '',
});

const toNoticePayload = (
  record: NoticeForm | undefined,
  values: NoticeForm,
): NoticeForm => {
  const merged = { ...(record || {}), ...values };
  return {
    noticeId: merged.noticeId,
    noticeTitle: merged.noticeTitle,
    noticeType: merged.noticeType,
    noticeContent: sanitizeHtml(merged.noticeContent),
    status: merged.status,
    remark: merged.remark,
    createByName: merged.createByName,
  };
};

const NoticePage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [selectedRows, setSelectedRows] = useState<NoticeItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<NoticeForm>();
  const { options: noticeTypeOptions } = useRuoyiDict(
    'sys_notice_type',
    noticeTypeFallback,
  );
  const { options: noticeStatusOptions } = useRuoyiDict(
    'sys_notice_status',
    noticeStatusFallback,
  );
  const openDeleteConfirm = useDeleteConfirm({ modal: modalApi, messageApi });
  const selectedIds = selectedRows
    .map((item) => item.noticeId)
    .filter(Boolean) as (number | string)[];
  const noticeTypeLabelMap = useMemo(
    () =>
      new Map(
        noticeTypeOptions.map((option) => [String(option.value), option.label]),
      ),
    [noticeTypeOptions],
  );
  const noticeStatusLabelMap = useMemo(
    () =>
      new Map(
        noticeStatusOptions.map((option) => [
          String(option.value),
          option.label,
        ]),
      ),
    [noticeStatusOptions],
  );

  const reloadTable = () => {
    setSelectedRows([]);
    actionRef.current?.reloadAndRest?.();
  };

  const openCreateForm = () => {
    setEditingRecord({
      noticeTitle: '',
      noticeType: '',
      noticeContent: '',
      status: '0',
      remark: '',
      createByName: '',
    });
    setFormOpen(true);
  };

  const openUpdateForm = async (record: NoticeItem) => {
    if (!record.noticeId) return;
    setFormLoading(true);
    try {
      const response = await getNotice(record.noticeId);
      setEditingRecord({
        ...record,
        ...response.data,
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (records: NoticeItem[]) => {
    const ids = records.map((item) => item.noticeId).filter(Boolean) as (
      | number
      | string
    )[];
    if (ids.length === 0) return;

    openDeleteConfirm({
      records,
      entityName: '公告',
      unit: '条',
      getName: (record) => record.noticeTitle || record.noticeId,
      description: '删除后，该公告将无法恢复。',
      batchDescription: '删除后，这些公告将无法恢复。',
      onConfirm: async () => {
        await deleteNotices(ids);
      },
      onSuccess: reloadTable,
    });
  };

  const columns: ProColumns<NoticeItem>[] = [
    {
      title: '公告标题',
      dataIndex: 'noticeTitle',
      ellipsis: true,
    },
    {
      title: '操作人员',
      dataIndex: 'createByName',
      hideInTable: true,
    },
    {
      title: '公告类型',
      dataIndex: 'noticeType',
      valueType: 'select',
      fieldProps: { options: noticeTypeOptions },
      width: 112,
      render: (_, record) => {
        const value = String(record.noticeType ?? '');
        return <Tag>{noticeTypeLabelMap.get(value) || value || '-'}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      search: false,
      width: 96,
      render: (_, record) => {
        const value = String(record.status ?? '');
        return (
          <Tag color={value === '0' ? 'success' : 'default'}>
            {noticeStatusLabelMap.get(value) ||
              (value === '0' ? '正常' : '关闭')}
          </Tag>
        );
      },
    },
    {
      title: '创建者',
      dataIndex: 'createByName',
      search: false,
      ellipsis: true,
      width: 112,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      search: false,
      width: 120,
      renderText: (value) =>
        value && dayjs(String(value)).isValid()
          ? dayjs(String(value)).format('YYYY-MM-DD')
          : value || '-',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 96,
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'edit',
              label: '修改',
              icon: <EditOutlined />,
              permissions: 'system:notice:edit',
              onClick: () => openUpdateForm(record),
            },
            {
              key: 'delete',
              label: '删除',
              danger: true,
              icon: <DeleteOutlined />,
              permissions: 'system:notice:remove',
              onClick: () => confirmDelete([record]),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer title="通知公告">
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<NoticeItem, NoticeSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.noticeId)}
        search={{ labelWidth: 96 }}
        pagination={{ defaultPageSize: 10 }}
        columns={columns}
        request={async (params) => {
          const response = await listNotices(toNoticeQuery(params));
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
            permissions="system:notice:add"
            onClick={openCreateForm}
          >
            新增
          </PermissionButton>,
          <PermissionButton
            key="edit"
            icon={<EditOutlined />}
            permissions="system:notice:edit"
            disabled={selectedRows.length !== 1}
            onClick={() => openUpdateForm(selectedRows[0])}
          >
            修改
          </PermissionButton>,
          <PermissionButton
            key="delete"
            danger
            icon={<DeleteOutlined />}
            permissions="system:notice:remove"
            disabled={selectedRows.length === 0}
            onClick={() => confirmDelete(selectedRows)}
          >
            删除
          </PermissionButton>,
        ]}
      />
      <ModalForm<NoticeForm>
        key={editingRecord?.noticeId || 'create'}
        title={editingRecord?.noticeId ? '修改公告' : '添加公告'}
        open={formOpen}
        loading={formLoading}
        initialValues={editingRecord}
        modalProps={{
          destroyOnHidden: true,
          width: 780,
          onCancel: () => {
            setFormOpen(false);
            setEditingRecord(undefined);
          },
        }}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingRecord(undefined);
          }
        }}
        onFinish={async (values) => {
          const payload = toNoticePayload(editingRecord, values);
          if (editingRecord?.noticeId) {
            await updateNotice(payload);
          } else {
            await addNotice(payload);
          }
          messageApi.success('操作成功');
          reloadTable();
          return true;
        }}
      >
        <ProFormText
          name="noticeTitle"
          label="公告标题"
          placeholder="请输入公告标题"
          rules={[{ required: true, message: '公告标题不能为空' }]}
        />
        <ProFormSelect
          name="noticeType"
          label="公告类型"
          placeholder="请选择公告类型"
          options={noticeTypeOptions}
          rules={[{ required: true, message: '公告类型不能为空' }]}
        />
        <ProFormRadio.Group
          name="status"
          label="状态"
          options={noticeStatusOptions}
        />
        <ProForm.Item name="noticeContent" label="内容">
          <RichTextEditor minHeight={192} />
        </ProForm.Item>
        <ProFormTextArea
          name="remark"
          label="备注"
          placeholder="请输入备注"
          fieldProps={{ rows: 3, maxLength: 500, showCount: true }}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default NoticePage;
