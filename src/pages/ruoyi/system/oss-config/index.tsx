import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormDependency,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Modal, message, Switch, Tag } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { type RuoyiDictOption, useRuoyiDict } from '@/hooks/useRuoyiDict';
import {
  addOssConfig,
  changeOssConfigStatus,
  deleteOssConfigs,
  getOssConfig,
  listOssConfigs,
  type OssConfigForm,
  type OssConfigItem,
  type OssConfigQuery,
  updateOssConfig,
} from '@/services/ruoyi/oss-config';

type OssConfigSearchParams = {
  current?: number;
  pageSize?: number;
  configKey?: string;
  bucketName?: string;
  status?: string;
};

const yesNoFallback: RuoyiDictOption[] = [
  { label: '是', value: 'Y', raw: { dictLabel: '是', dictValue: 'Y' } },
  { label: '否', value: 'N', raw: { dictLabel: '否', dictValue: 'N' } },
];

const statusOptions = [
  { label: '是', value: '0' },
  { label: '否', value: '1' },
];

const accessPolicyOptions = [
  { label: 'private', value: '0' },
  { label: 'public', value: '1' },
  { label: 'custom', value: '2' },
];

const accessPolicyColor: Record<string, string> = {
  '0': 'warning',
  '1': 'success',
  '2': 'processing',
};

const toOssConfigQuery = (params: OssConfigSearchParams): OssConfigQuery => ({
  pageNum: params.current || 1,
  pageSize: params.pageSize || 10,
  configKey: params.configKey,
  bucketName: params.bucketName,
  status: params.status,
});

const toOssConfigPayload = (
  record: OssConfigForm | undefined,
  values: OssConfigForm,
): OssConfigForm => {
  const merged = { ...(record || {}), ...values };
  return {
    ossConfigId: merged.ossConfigId,
    configKey: merged.configKey,
    accessKey: merged.accessKey,
    secretKey: merged.secretKey,
    bucketName: merged.bucketName,
    prefix: merged.prefix,
    endpoint: merged.endpoint,
    domain: merged.domain,
    isHttps: merged.isHttps,
    accessPolicy: merged.accessPolicy,
    region: merged.region,
    status: merged.status,
    remark: merged.remark,
  };
};

const OssConfigPage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [selectedRows, setSelectedRows] = useState<OssConfigItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OssConfigForm>();
  const [formLoading, setFormLoading] = useState(false);
  const { options: yesNoOptions } = useRuoyiDict('sys_yes_no', yesNoFallback);
  const openDeleteConfirm = useDeleteConfirm({
    modal: modalApi,
    messageApi,
  });
  const selectedIds = selectedRows
    .map((item) => item.ossConfigId)
    .filter(Boolean) as (number | string)[];
  const accessPolicyLabelMap = useMemo(
    () =>
      new Map(
        accessPolicyOptions.map((option) => [option.value, option.label]),
      ),
    [],
  );

  const reloadTable = () => {
    setSelectedRows([]);
    actionRef.current?.reloadAndRest?.();
  };

  const openCreateForm = () => {
    setEditingRecord({
      isHttps: 'N',
      accessPolicy: '1',
      status: '1',
    });
    setFormOpen(true);
  };

  const openUpdateForm = async (record: OssConfigItem) => {
    if (!record.ossConfigId) return;
    setFormLoading(true);
    try {
      const response = await getOssConfig(record.ossConfigId);
      setEditingRecord({
        ...record,
        ...response.data,
      });
      setFormOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (records: OssConfigItem[]) => {
    const ids = records.map((item) => item.ossConfigId).filter(Boolean) as (
      | number
      | string
    )[];
    if (ids.length === 0) return;

    openDeleteConfirm({
      records,
      entityName: 'OSS配置',
      unit: '条',
      getName: (record) =>
        record.configKey || record.bucketName || record.ossConfigId,
      description: '删除后，该对象存储配置将不可用。',
      batchDescription: '删除后，这些对象存储配置将不可用。',
      onConfirm: async () => {
        await deleteOssConfigs(ids);
      },
      onSuccess: reloadTable,
    });
  };

  const confirmStatusChange = (record: OssConfigItem, checked: boolean) => {
    if (!record.ossConfigId || !record.configKey) return;

    const nextStatus = checked ? '0' : '1';
    const actionText = checked ? '启用' : '停用';

    modalApi.confirm({
      title: `${actionText}OSS配置`,
      content: `确认要${actionText}“${record.configKey}”配置吗？`,
      okText: `确认${actionText}`,
      cancelText: '取消',
      autoFocusButton: 'cancel',
      onOk: async () => {
        await changeOssConfigStatus(
          record.ossConfigId as number | string,
          nextStatus,
          record.configKey as string,
        );
        messageApi.success(`${actionText}成功`);
        actionRef.current?.reload?.();
      },
    });
  };

  const columns: ProColumns<OssConfigItem>[] = [
    {
      title: '配置key',
      dataIndex: 'configKey',
      ellipsis: true,
    },
    {
      title: '访问站点',
      dataIndex: 'endpoint',
      search: false,
      ellipsis: true,
      width: 200,
    },
    {
      title: '自定义域名',
      dataIndex: 'domain',
      search: false,
      ellipsis: true,
      width: 200,
    },
    {
      title: '桶名称',
      dataIndex: 'bucketName',
      ellipsis: true,
    },
    {
      title: '前缀',
      dataIndex: 'prefix',
      search: false,
      ellipsis: true,
    },
    {
      title: '域',
      dataIndex: 'region',
      search: false,
      ellipsis: true,
    },
    {
      title: '桶权限类型',
      dataIndex: 'accessPolicy',
      search: false,
      width: 120,
      render: (_, record) => (
        <Tag color={accessPolicyColor[String(record.accessPolicy)]}>
          {accessPolicyLabelMap.get(String(record.accessPolicy)) ||
            record.accessPolicy ||
            '-'}
        </Tag>
      ),
    },
    {
      title: '是否默认',
      dataIndex: 'status',
      valueType: 'select',
      fieldProps: { options: statusOptions },
      width: 112,
      render: (_, record) => (
        <Switch
          checked={record.status === '0'}
          checkedChildren="是"
          unCheckedChildren="否"
          onChange={(checked) => confirmStatusChange(record, checked)}
        />
      ),
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
              permissions: 'system:ossConfig:edit',
              onClick: () => openUpdateForm(record),
            },
            {
              key: 'delete',
              label: '删除',
              danger: true,
              icon: <DeleteOutlined />,
              permissions: 'system:ossConfig:remove',
              onClick: () => confirmDelete([record]),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title="对象存储配置"
      onBack={() => history.push('/sys-conf/oss')}
    >
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<OssConfigItem, OssConfigSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.ossConfigId)}
        search={{ labelWidth: 96 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total: number) => `共 ${total} 条`,
        }}
        columns={columns}
        request={async (params) => {
          const query = toOssConfigQuery(params);
          const response = await listOssConfigs(query);
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
            permissions="system:ossConfig:add"
            onClick={openCreateForm}
          >
            新增
          </PermissionButton>,
          <PermissionButton
            key="edit"
            icon={<EditOutlined />}
            permissions="system:ossConfig:edit"
            disabled={selectedRows.length !== 1}
            onClick={() => openUpdateForm(selectedRows[0])}
          >
            修改
          </PermissionButton>,
          <PermissionButton
            key="delete"
            danger
            icon={<DeleteOutlined />}
            permissions="system:ossConfig:remove"
            disabled={selectedRows.length === 0}
            onClick={() => confirmDelete(selectedRows)}
          >
            删除
          </PermissionButton>,
        ]}
      />
      <ModalForm<OssConfigForm>
        key={editingRecord?.ossConfigId || 'create'}
        title={
          editingRecord?.ossConfigId ? '修改对象存储配置' : '添加对象存储配置'
        }
        open={formOpen}
        loading={formLoading}
        modalProps={{
          destroyOnHidden: true,
          width: 800,
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
          const payload = toOssConfigPayload(editingRecord, values);
          if (editingRecord?.ossConfigId) {
            await updateOssConfig(payload);
          } else {
            await addOssConfig(payload);
          }
          messageApi.success('操作成功');
          reloadTable();
          return true;
        }}
      >
        <ProFormText
          name="configKey"
          label="配置key"
          placeholder="请输入配置key"
          rules={[{ required: true, message: 'configKey不能为空' }]}
        />
        <ProFormRadio.Group
          name="isHttps"
          label="是否HTTPS"
          options={yesNoOptions}
        />
        <ProFormDependency name={['isHttps']}>
          {({ isHttps }) => (
            <>
              <ProFormText
                name="endpoint"
                label="访问站点"
                placeholder="请输入访问站点"
                fieldProps={{
                  addonBefore: isHttps === 'Y' ? 'https://' : 'http://',
                }}
                rules={[
                  { required: true, message: 'endpoint不能为空' },
                  {
                    min: 2,
                    max: 100,
                    message: 'endpoint名称长度必须介于 2 和 100 之间',
                  },
                ]}
              />
              <ProFormText
                name="domain"
                label="自定义域名"
                placeholder="请输入自定义域名"
                fieldProps={{
                  addonBefore: isHttps === 'Y' ? 'https://' : 'http://',
                }}
              />
            </>
          )}
        </ProFormDependency>
        <ProFormText
          name="accessKey"
          label="accessKey"
          placeholder="请输入accessKey"
          rules={[
            { required: true, message: 'accessKey不能为空' },
            {
              min: 2,
              max: 200,
              message: 'accessKey长度必须介于 2 和 200 之间',
            },
          ]}
        />
        <ProFormText.Password
          name="secretKey"
          label="secretKey"
          placeholder="请输入秘钥"
          rules={[
            { required: true, message: 'secretKey不能为空' },
            {
              min: 2,
              max: 100,
              message: 'secretKey长度必须介于 2 和 100 之间',
            },
          ]}
        />
        <ProFormText
          name="bucketName"
          label="桶名称"
          placeholder="请输入桶名称"
          rules={[
            { required: true, message: 'bucketName不能为空' },
            {
              min: 2,
              max: 100,
              message: 'bucketName长度必须介于 2 和 100 之间',
            },
          ]}
        />
        <ProFormText name="prefix" label="前缀" placeholder="请输入前缀" />
        <ProFormRadio.Group
          name="accessPolicy"
          label="桶权限类型"
          options={accessPolicyOptions}
          rules={[{ required: true, message: 'accessPolicy不能为空' }]}
        />
        <ProFormText name="region" label="域" placeholder="请输入域" />
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

export default OssConfigPage;
