import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import { Button, Modal, message, Space, Tag } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import {
  addDictData,
  type DictDataForm,
  type DictDataItem,
  type DictDataQuery,
  type DictTypeItem,
  deleteDictData,
  exportDictData,
  getDictData,
  getDictType,
  listDictData,
  updateDictData,
} from '@/services/ruoyi/dict';

type DictDataSearchParams = {
  current?: number;
  pageSize?: number;
  dictType?: string;
  dictLabel?: string;
};

const listClassOptions = [
  { label: '默认', value: 'default' },
  { label: '主要', value: 'primary' },
  { label: '成功', value: 'success' },
  { label: '信息', value: 'info' },
  { label: '警告', value: 'warning' },
  { label: '危险', value: 'danger' },
];

const tagColorMap: Record<string, string | undefined> = {
  default: 'blue',
  primary: 'blue',
  success: 'success',
  info: 'default',
  warning: 'warning',
  danger: 'error',
};

const getTagColor = (listClass?: string) => {
  if (!listClass) return undefined;
  return tagColorMap[listClass];
};

const toDictDataQuery = (
  params: DictDataSearchParams,
  dictType?: string,
): DictDataQuery => ({
  pageNum: params.current || 1,
  pageSize: params.pageSize || 10,
  dictType,
  dictLabel: params.dictLabel,
});

const DictDataPage = () => {
  const params = useParams<{ dictId?: string }>();
  const actionRef = useRef<ActionType | null>(null);
  const latestQueryRef = useRef<DictDataQuery>({ pageNum: 1, pageSize: 10 });
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [dictTypeInfo, setDictTypeInfo] = useState<DictTypeItem>();
  const [selectedRows, setSelectedRows] = useState<DictDataItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DictDataForm>();
  const [loadingDetail, setLoadingDetail] = useState(false);
  const openDeleteConfirm = useDeleteConfirm({
    modal: modalApi,
    messageApi,
  });
  const dictType = dictTypeInfo?.dictType;
  const selectedIds = selectedRows
    .map((item) => item.dictCode)
    .filter(Boolean) as (number | string)[];

  useEffect(() => {
    if (!params.dictId) return;
    let mounted = true;

    setLoadingDetail(true);
    getDictType(params.dictId)
      .then((response) => {
        if (mounted) {
          setDictTypeInfo(response.data);
          setSelectedRows([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingDetail(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [params.dictId]);

  const reloadTable = () => {
    setSelectedRows([]);
    actionRef.current?.reloadAndRest?.();
  };

  const openCreateForm = () => {
    setEditingRecord({
      dictType,
      listClass: 'primary',
      dictSort: 0,
    });
    setFormOpen(true);
  };

  const openUpdateForm = async (record: DictDataItem) => {
    if (!record.dictCode) return;
    setLoadingDetail(true);
    try {
      const response = await getDictData(record.dictCode);
      const detail = response.data || record;
      setEditingRecord({
        ...detail,
        listClass: detail.listClass || 'default',
      });
      setFormOpen(true);
    } finally {
      setLoadingDetail(false);
    }
  };

  const confirmDelete = (records: DictDataItem[]) => {
    const ids = records.map((item) => item.dictCode).filter(Boolean) as (
      | number
      | string
    )[];
    if (ids.length === 0) return;

    openDeleteConfirm({
      records,
      entityName: '字典数据',
      unit: '条',
      getName: (record) =>
        record.dictLabel || record.dictValue || record.dictCode,
      description: '删除后，该字典项将不可用。',
      batchDescription: '删除后，这些字典项将不可用。',
      onConfirm: async () => {
        await deleteDictData(ids);
      },
      onSuccess: reloadTable,
    });
  };

  const columns: ProColumns<DictDataItem>[] = [
    {
      title: '字典标签',
      dataIndex: 'dictLabel',
      ellipsis: true,
      render: (_, record) => {
        if (
          (!record.listClass || record.listClass === 'default') &&
          !record.cssClass
        ) {
          return record.dictLabel;
        }

        return (
          <Tag
            className={record.cssClass || undefined}
            color={getTagColor(record.listClass)}
          >
            {record.dictLabel}
          </Tag>
        );
      },
    },
    {
      title: '字典键值',
      dataIndex: 'dictValue',
      search: false,
      ellipsis: true,
    },
    {
      title: '字典排序',
      dataIndex: 'dictSort',
      search: false,
      width: 96,
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
    <PageContainer
      title="字典数据"
      subTitle={dictTypeInfo?.dictName || dictType}
      loading={loadingDetail && !dictTypeInfo}
      extra={
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => history.push('/sys-conf/dict')}
        >
          返回
        </Button>
      }
    >
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<DictDataItem, DictDataSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.dictCode)}
        search={{ labelWidth: 96 }}
        pagination={{ defaultPageSize: 10 }}
        columns={columns}
        params={{ dictType }}
        request={async (tableParams) => {
          if (!dictType) {
            return { data: [], total: 0, success: true };
          }

          const query = toDictDataQuery(tableParams, dictType);
          latestQueryRef.current = query;
          const response = await listDictData(query);
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
            disabled={!dictType}
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
            disabled={!dictType}
            onClick={async () => {
              await exportDictData(latestQueryRef.current);
              messageApi.success('导出任务已开始');
            }}
          >
            导出
          </PermissionButton>,
        ]}
      />
      <ModalForm<DictDataForm>
        title={editingRecord?.dictCode ? '修改字典数据' : '添加字典数据'}
        open={formOpen}
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
          const payload = { ...editingRecord, ...values, dictType };
          if (editingRecord?.dictCode) {
            await updateDictData(payload);
          } else {
            await addDictData(payload);
          }
          messageApi.success('操作成功');
          setEditingRecord(undefined);
          reloadTable();
          return true;
        }}
      >
        <ProFormText name="dictType" label="字典类型" disabled />
        <ProFormText
          name="dictLabel"
          label="数据标签"
          placeholder="请输入数据标签"
          rules={[{ required: true, message: '请输入数据标签' }]}
        />
        <ProFormText
          name="dictValue"
          label="数据键值"
          placeholder="请输入数据键值"
          rules={[{ required: true, message: '请输入数据键值' }]}
        />
        <Space size="large" style={{ width: '100%' }}>
          <ProFormDigit
            name="dictSort"
            label="显示排序"
            min={0}
            width="sm"
            rules={[{ required: true, message: '请输入显示排序' }]}
          />
          <ProFormSelect
            name="listClass"
            label="回显样式"
            width="sm"
            options={listClassOptions}
          />
        </Space>
        <ProFormText
          name="cssClass"
          label="样式属性"
          placeholder="请输入样式属性"
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

export default DictDataPage;
