import {
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { message, Tag, Typography } from 'antd';
import { useRef, useState } from 'react';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import {
  createLicenseDeployment,
  downloadDeploymentIdFile,
  type LicenseDeployment,
  type LicenseDeploymentCreatePayload,
  type LicenseDeploymentUpdatePayload,
  type LicenseIssue,
  listLicenseDeployments,
  updateLicenseDeployment,
} from '@/modules/admin/services/license';
import IssueLicenseModal from './IssueLicenseModal';

type DeploymentManagementProps = {
  onIssued: (issue: LicenseIssue) => void;
};

type DeploymentSearchParams = {
  current?: number;
  pageSize?: number;
  keyword?: string;
  status?: '0' | '1';
};

type DeploymentFormValues = LicenseDeploymentCreatePayload & {
  status?: '0' | '1';
};

const statusOptions = [
  { label: '启用', value: '0' },
  { label: '停用', value: '1' },
];

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const DeploymentManagement = ({ onIssued }: DeploymentManagementProps) => {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, messageContextHolder] = message.useMessage();
  const [formOpen, setFormOpen] = useState(false);
  const [editingDeployment, setEditingDeployment] =
    useState<LicenseDeployment>();
  const [issuingDeployment, setIssuingDeployment] =
    useState<LicenseDeployment>();

  const reload = () => actionRef.current?.reload?.();

  const columns: ProColumns<LicenseDeployment>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '客户名称或deploymentId' },
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      search: false,
      ellipsis: true,
      width: 200,
    },
    {
      title: 'Deployment ID',
      dataIndex: 'deploymentId',
      search: false,
      width: 310,
      render: (_, record) => (
        <Typography.Text copyable code>
          {record.deploymentId || '-'}
        </Typography.Text>
      ),
    },
    {
      title: '最新Revision',
      dataIndex: 'lastIssuedRevision',
      search: false,
      align: 'center',
      width: 120,
      renderText: (value) => String(value || '0'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      fieldProps: { options: statusOptions },
      width: 96,
      render: (_, record) =>
        record.status === '1' ? (
          <Tag>停用</Tag>
        ) : (
          <Tag color="success">启用</Tag>
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
      width: 176,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'issue',
              label: '签发许可证',
              icon: <SafetyCertificateOutlined />,
              disabled: record.status === '1',
              permissions: [
                'system:license:issue',
                'system:license:issue:list',
                'system:license:product:list',
              ],
              mode: 'all',
              onClick: () => setIssuingDeployment(record),
            },
            {
              key: 'downloadDeploymentId',
              label: '下载deployment.id',
              icon: <DownloadOutlined />,
              permissions: 'system:license:deployment:list',
              disabled: !record.id,
              onClick: async () => {
                if (!record.id) return;
                try {
                  await downloadDeploymentIdFile(String(record.id));
                } catch (error) {
                  messageApi.error(
                    getErrorMessage(error, 'deployment.id下载失败'),
                  );
                }
              },
            },
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              permissions: 'system:license:deployment:edit',
              onClick: () => {
                setEditingDeployment(record);
                setFormOpen(true);
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      {messageContextHolder}
      <ProTable<LicenseDeployment, DeploymentSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.id)}
        columns={columns}
        search={{ labelWidth: 88 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 1240 }}
        request={async (params) => {
          const response = await listLicenseDeployments({
            pageNum: params.current || 1,
            pageSize: params.pageSize || 10,
            keyword: params.keyword,
            status: params.status,
          });
          return {
            data: response.rows || [],
            total: response.total || 0,
            success: true,
          };
        }}
        toolBarRender={() => [
          <PermissionButton
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            permissions="system:license:deployment:edit"
            onClick={() => {
              setEditingDeployment({ status: '0' });
              setFormOpen(true);
            }}
          >
            新增部署
          </PermissionButton>,
        ]}
      />

      <ModalForm<DeploymentFormValues>
        key={editingDeployment?.id || 'create-deployment'}
        title={editingDeployment?.id ? '编辑部署' : '新增部署'}
        open={formOpen}
        initialValues={editingDeployment}
        modalProps={{
          destroyOnHidden: true,
          width: 620,
          onCancel: () => setFormOpen(false),
        }}
        onOpenChange={setFormOpen}
        onFinish={async (values) => {
          if (editingDeployment?.id) {
            const payload: LicenseDeploymentUpdatePayload = {
              customerName: values.customerName.trim(),
              status: values.status || '0',
              remark: values.remark?.trim(),
            };
            await updateLicenseDeployment(
              String(editingDeployment.id),
              payload,
            );
          } else {
            await createLicenseDeployment({
              customerName: values.customerName.trim(),
              remark: values.remark?.trim(),
            });
          }
          messageApi.success('部署信息已保存');
          setEditingDeployment(undefined);
          reload();
          return true;
        }}
      >
        {editingDeployment?.deploymentId ? (
          <ProFormText name="deploymentId" label="Deployment ID" disabled />
        ) : null}
        <ProFormText
          name="customerName"
          label="客户名称"
          rules={[
            { required: true, whitespace: true, message: '请输入客户名称' },
            { max: 200, message: '客户名称不能超过200个字符' },
          ]}
        />
        {editingDeployment?.id ? (
          <ProFormRadio.Group
            name="status"
            label="状态"
            options={statusOptions}
            rules={[{ required: true }]}
          />
        ) : null}
        <ProFormTextArea
          name="remark"
          label="备注"
          fieldProps={{ rows: 3, maxLength: 500, showCount: true }}
        />
      </ModalForm>

      <IssueLicenseModal
        deployment={issuingDeployment}
        open={Boolean(issuingDeployment)}
        onOpenChange={(open) => {
          if (!open) setIssuingDeployment(undefined);
        }}
        onIssued={(issue) => {
          setIssuingDeployment(undefined);
          reload();
          onIssued(issue);
        }}
      />
    </>
  );
};

export default DeploymentManagement;
