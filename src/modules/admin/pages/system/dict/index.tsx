import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Modal, message } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';
import { addRuoyiDateRange } from '@/adapters/ruoyi/params';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import {
  addDictType,
  type DictTypeForm,
  type DictTypeItem,
  type DictTypeQuery,
  deleteDictTypes,
  exportDictTypes,
  getDictType,
  listDictTypes,
  refreshDictCache,
  updateDictType,
} from '@/shared/services/dict';

type DictTypeSearchParams = {
  current?: number;
  pageSize?: number;
  dictName?: string;
  dictType?: string;
  createTimeRange?: unknown;
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

const toDictTypeQuery = (params: DictTypeSearchParams): DictTypeQuery => {
  const [beginTime, endTime] = Array.isArray(params.createTimeRange)
    ? params.createTimeRange
    : [];

  return addRuoyiDateRange(
    {
      pageNum: params.current || 1,
      pageSize: params.pageSize || 10,
      dictName: params.dictName,
      dictType: params.dictType,
    },
    [formatRangeTime(beginTime, 'start'), formatRangeTime(endTime, 'end')],
  );
};

const DictTypePage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const latestQueryRef = useRef<DictTypeQuery>({ pageNum: 1, pageSize: 10 });
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [selectedRows, setSelectedRows] = useState<DictTypeItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<
    DictTypeForm | undefined
  >();
  const [formLoading, setFormLoading] = useState(false);
  const openDeleteConfirm = useDeleteConfirm({
    modal: modalApi,
    messageApi,
  });
  const selectedIds = selectedRows
    .map((item) => item.dictId)
    .filter(Boolean) as (number | string)[];

  const reloadTable = () => {
    setSelectedRows([]);
    actionRef.current?.reloadAndRest?.();
  };

  const openCreateForm = () => {
    setEditingRecord(undefined);
    setFormOpen(true);
  };

  const openUpdateForm = async (record: DictTypeItem) => {
    if (!record.dictId) return;
    setFormLoading(true);
    try {
      const response = await getDictType(record.dictId);
      setEditingRecord(response.data || record);
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (records: DictTypeItem[]) => {
    const ids = records.map((item) => item.dictId).filter(Boolean) as (
      | number
      | string
    )[];
    if (ids.length === 0) return;

    openDeleteConfirm({
      records,
      entityName: '字典类型',
      unit: '个',
      getName: (record) => record.dictName || record.dictType || record.dictId,
      description: '删除后，该字典类型及关联字典数据将不可用。',
      batchDescription: '删除后，这些字典类型及关联字典数据将不可用。',
      onConfirm: async () => {
        await deleteDictTypes(ids);
      },
      onSuccess: reloadTable,
    });
  };

  const columns: ProColumns<DictTypeItem>[] = [
    {
      title: '字典名称',
      dataIndex: 'dictName',
      ellipsis: true,
    },
    {
      title: '字典类型',
      dataIndex: 'dictType',
      ellipsis: true,
      render: (_, record) =>
        record.dictId ? (
          <Button
            type="link"
            size="small"
            onClick={() => {
              history.push(`/sys-conf/dict-data/index/${record.dictId}`);
            }}
          >
            {record.dictType}
          </Button>
        ) : (
          record.dictType
        ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      search: false,
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      search: false,
      width: 180,
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
      width: 96,
      align: 'left',
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'edit',
              label: '修改',
              icon: <EditOutlined />,
              permissions: 'system:dict:edit',
              onClick: () => openUpdateForm(record),
            },
            {
              key: 'delete',
              label: '删除',
              danger: true,
              icon: <DeleteOutlined />,
              permissions: 'system:dict:remove',
              onClick: () => confirmDelete([record]),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer title="字典管理">
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<DictTypeItem, DictTypeSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.dictId)}
        search={{ labelWidth: 96 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total: number) => `共 ${total} 条`,
        }}
        columns={columns}
        request={async (params) => {
          const query = toDictTypeQuery(params);
          latestQueryRef.current = query;
          const response = await listDictTypes(query);
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
            permissions="system:dict:add"
            onClick={openCreateForm}
          >
            新增
          </PermissionButton>,
          <PermissionButton
            key="edit"
            icon={<EditOutlined />}
            permissions="system:dict:edit"
            disabled={selectedRows.length !== 1}
            onClick={() => openUpdateForm(selectedRows[0])}
          >
            修改
          </PermissionButton>,
          <PermissionButton
            key="delete"
            danger
            icon={<DeleteOutlined />}
            permissions="system:dict:remove"
            disabled={selectedRows.length === 0}
            onClick={() => confirmDelete(selectedRows)}
          >
            删除
          </PermissionButton>,
          <PermissionButton
            key="export"
            icon={<DownloadOutlined />}
            permissions="system:dict:export"
            onClick={async () => {
              await exportDictTypes(latestQueryRef.current);
              messageApi.success('导出任务已开始');
            }}
          >
            导出
          </PermissionButton>,
          <PermissionButton
            key="refresh"
            danger
            icon={<ReloadOutlined />}
            permissions="system:dict:remove"
            onClick={async () => {
              await refreshDictCache();
              messageApi.success('刷新缓存成功');
            }}
          >
            刷新缓存
          </PermissionButton>,
        ]}
      />
      <ModalForm<DictTypeForm>
        title={editingRecord?.dictId ? '修改字典类型' : '添加字典类型'}
        open={formOpen}
        loading={formLoading}
        modalProps={{
          destroyOnHidden: true,
          onCancel: () => {
            setFormOpen(false);
            setEditingRecord(undefined);
          },
        }}
        initialValues={editingRecord}
        onOpenChange={setFormOpen}
        onFinish={async (values) => {
          const payload = { ...editingRecord, ...values };
          if (editingRecord?.dictId) {
            await updateDictType(payload);
          } else {
            await addDictType(payload);
          }
          messageApi.success('操作成功');
          setEditingRecord(undefined);
          reloadTable();
          return true;
        }}
      >
        <ProFormText
          name="dictName"
          label="字典名称"
          placeholder="请输入字典名称"
          rules={[{ required: true, message: '请输入字典名称' }]}
        />
        <ProFormText
          name="dictType"
          label="字典类型"
          placeholder="请输入字典类型"
          rules={[{ required: true, message: '请输入字典类型' }]}
        />
        <ProFormTextArea
          name="remark"
          label="备注"
          placeholder="请输入备注"
          fieldProps={{ rows: 3, maxLength: 200, showCount: true }}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default DictTypePage;
