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
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { Modal, message, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useMemo, useRef, useState } from 'react';
import { addRuoyiDateRange } from '@/adapters/ruoyi/params';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { type RuoyiDictOption, useRuoyiDict } from '@/hooks/useRuoyiDict';
import {
  addConfig,
  type ConfigForm,
  type ConfigItem,
  type ConfigQuery,
  deleteConfigs,
  exportConfigs,
  getConfig,
  listConfigs,
  refreshConfigCache,
  updateConfig,
} from '@/modules/admin/services/config';

type ConfigSearchParams = {
  current?: number;
  pageSize?: number;
  configName?: string;
  configKey?: string;
  configType?: string;
  createTimeRange?: unknown;
};

const yesNoFallback: RuoyiDictOption[] = [
  { label: '是', value: 'Y', raw: { dictLabel: '是', dictValue: 'Y' } },
  { label: '否', value: 'N', raw: { dictLabel: '否', dictValue: 'N' } },
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

const toConfigQuery = (params: ConfigSearchParams): ConfigQuery => {
  const [beginTime, endTime] = Array.isArray(params.createTimeRange)
    ? params.createTimeRange
    : [];

  return addRuoyiDateRange(
    {
      pageNum: params.current || 1,
      pageSize: params.pageSize || 10,
      configName: params.configName,
      configKey: params.configKey,
      configType: params.configType,
    },
    [formatRangeTime(beginTime, 'start'), formatRangeTime(endTime, 'end')],
  );
};

const toConfigPayload = (
  record: ConfigForm | undefined,
  values: ConfigForm,
): ConfigForm => {
  const merged = { ...(record || {}), ...values };
  return {
    configId: merged.configId,
    configName: merged.configName,
    configKey: merged.configKey,
    configValue: merged.configValue,
    configType: merged.configType,
    remark: merged.remark,
  };
};

const ConfigPage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const latestQueryRef = useRef<ConfigQuery>({ pageNum: 1, pageSize: 10 });
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [selectedRows, setSelectedRows] = useState<ConfigItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ConfigForm>();
  const [formLoading, setFormLoading] = useState(false);
  const { options: yesNoOptions } = useRuoyiDict('sys_yes_no', yesNoFallback);
  const openDeleteConfirm = useDeleteConfirm({
    modal: modalApi,
    messageApi,
  });
  const selectedIds = selectedRows
    .map((item) => item.configId)
    .filter(Boolean) as (number | string)[];
  const yesNoLabelMap = useMemo(
    () =>
      new Map(
        yesNoOptions.map((option) => [String(option.value), option.label]),
      ),
    [yesNoOptions],
  );

  const reloadTable = () => {
    setSelectedRows([]);
    actionRef.current?.reloadAndRest?.();
  };

  const openCreateForm = () => {
    setEditingRecord({ configType: 'Y' });
    setFormOpen(true);
  };

  const openUpdateForm = async (record: ConfigItem) => {
    if (!record.configId) return;
    setFormLoading(true);
    try {
      const response = await getConfig(record.configId);
      setEditingRecord({
        ...record,
        ...response.data,
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (records: ConfigItem[]) => {
    const ids = records.map((item) => item.configId).filter(Boolean) as (
      | number
      | string
    )[];
    if (ids.length === 0) return;

    openDeleteConfirm({
      records,
      entityName: '参数',
      unit: '个',
      getName: (record) =>
        record.configName || record.configKey || record.configId,
      description: '删除后，该参数配置将不可用。',
      batchDescription: '删除后，这些参数配置将不可用。',
      onConfirm: async () => {
        await deleteConfigs(ids);
      },
      onSuccess: reloadTable,
    });
  };

  const columns: ProColumns<ConfigItem>[] = [
    {
      title: '参数名称',
      dataIndex: 'configName',
      ellipsis: true,
    },
    {
      title: '参数键名',
      dataIndex: 'configKey',
      ellipsis: true,
    },
    {
      title: '参数键值',
      dataIndex: 'configValue',
      search: false,
      ellipsis: true,
    },
    {
      title: '系统内置',
      dataIndex: 'configType',
      valueType: 'select',
      fieldProps: { options: yesNoOptions },
      width: 112,
      render: (_, record) =>
        record.configType === 'Y' ? (
          <Tag color="success">
            {yesNoLabelMap.get(String(record.configType)) || '是'}
          </Tag>
        ) : (
          <Tag>{yesNoLabelMap.get(String(record.configType)) || '否'}</Tag>
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
              permissions: 'system:config:edit',
              onClick: () => openUpdateForm(record),
            },
            {
              key: 'delete',
              label: '删除',
              danger: true,
              icon: <DeleteOutlined />,
              permissions: 'system:config:remove',
              onClick: () => confirmDelete([record]),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer title="参数设置">
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<ConfigItem, ConfigSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.configId)}
        search={{ labelWidth: 96 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total: number) => `共 ${total} 条`,
        }}
        columns={columns}
        request={async (params) => {
          const query = toConfigQuery(params);
          latestQueryRef.current = query;
          const response = await listConfigs(query);
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
            permissions="system:config:add"
            onClick={openCreateForm}
          >
            新增
          </PermissionButton>,
          <PermissionButton
            key="edit"
            icon={<EditOutlined />}
            permissions="system:config:edit"
            disabled={selectedRows.length !== 1}
            onClick={() => openUpdateForm(selectedRows[0])}
          >
            修改
          </PermissionButton>,
          <PermissionButton
            key="delete"
            danger
            icon={<DeleteOutlined />}
            permissions="system:config:remove"
            disabled={selectedRows.length === 0}
            onClick={() => confirmDelete(selectedRows)}
          >
            删除
          </PermissionButton>,
          <PermissionButton
            key="export"
            icon={<DownloadOutlined />}
            permissions="system:config:export"
            onClick={async () => {
              await exportConfigs(latestQueryRef.current);
              messageApi.success('导出任务已开始');
            }}
          >
            导出
          </PermissionButton>,
          <PermissionButton
            key="refresh"
            danger
            icon={<ReloadOutlined />}
            permissions="system:config:remove"
            onClick={async () => {
              await refreshConfigCache();
              messageApi.success('刷新缓存成功');
            }}
          >
            刷新缓存
          </PermissionButton>,
        ]}
      />
      <ModalForm<ConfigForm>
        key={editingRecord?.configId || 'create'}
        title={editingRecord?.configId ? '修改参数' : '添加参数'}
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
          const payload = toConfigPayload(editingRecord, values);
          if (editingRecord?.configId) {
            await updateConfig(payload);
          } else {
            await addConfig(payload);
          }
          messageApi.success('操作成功');
          reloadTable();
          return true;
        }}
      >
        <ProFormText
          name="configName"
          label="参数名称"
          placeholder="请输入参数名称"
          rules={[{ required: true, message: '参数名称不能为空' }]}
        />
        <ProFormText
          name="configKey"
          label="参数键名"
          placeholder="请输入参数键名"
          rules={[{ required: true, message: '参数键名不能为空' }]}
        />
        <ProFormTextArea
          name="configValue"
          label="参数键值"
          placeholder="请输入参数键值"
          fieldProps={{ rows: 3, maxLength: 500, showCount: true }}
          rules={[{ required: true, message: '参数键值不能为空' }]}
        />
        <ProFormRadio.Group
          name="configType"
          label="系统内置"
          options={yesNoOptions}
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

export default ConfigPage;
