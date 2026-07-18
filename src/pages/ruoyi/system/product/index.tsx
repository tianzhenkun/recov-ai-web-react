import {
  CheckCircleOutlined,
  EditOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormDependency,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { Modal, message, Tag, Typography } from 'antd';
import { useRef, useState } from 'react';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import { listLoginLayoutOptions } from '@/pages/user/login/layouts/registry';
import {
  createPlatformProduct,
  listPlatformProducts,
  type PlatformProduct,
  type PlatformProductCreatePayload,
  type PlatformProductStatus,
  updatePlatformProduct,
  updatePlatformProductStatus,
} from '@/services/ruoyi/product-catalog';
import { LOGIN_VARIANT_PATTERN, normalizeProductSiteContract } from './model';

type ProductSearchParams = {
  current?: number;
  pageSize?: number;
  keyword?: string;
  status?: PlatformProductStatus;
};

type ProductFormValues = PlatformProductCreatePayload;

const statusOptions = [
  { label: '启用', value: '0' },
  { label: '停用', value: '1' },
];

// 与后端保持一致：表单允许输入大小写，提交时统一规范为大写。
const productCodePattern = /^[A-Za-z][A-Za-z0-9_]{1,63}$/;
const registeredLoginLayoutHint = listLoginLayoutOptions()
  .map((layout) => `${layout.value}（${layout.label}）`)
  .join('、');

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const PlatformProductPage = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PlatformProduct>();

  const openCreate = () => {
    setEditingProduct({
      loginVariant: 'default',
      status: '0',
      tenantMode: 'SELECTABLE',
    });
    setFormOpen(true);
  };

  const openEdit = (record: PlatformProduct) => {
    setEditingProduct({
      ...record,
      loginVariant: record.loginVariant || 'default',
      tenantMode: record.tenantMode || 'SELECTABLE',
    });
    setFormOpen(true);
  };

  const changeStatus = (record: PlatformProduct) => {
    if (!record.id) return;
    const disabling = record.status === '0';
    const nextStatus: PlatformProductStatus = disabling ? '1' : '0';
    const actionText = disabling ? '停用' : '启用';
    modalApi.confirm({
      title: `确认${actionText}产品`,
      content: disabling
        ? `停用“${record.productName || record.productCode}”后，将阻止新套餐关联、新订单和新许可证签发；历史订单、已到账信用点和已签发许可证不受影响。`
        : `启用“${record.productName || record.productCode}”后，它将重新进入可选产品范围；套餐是否可售仍由套餐自身状态决定。`,
      okText: `确认${actionText}`,
      okButtonProps: { danger: disabling },
      cancelText: '取消',
      onOk: async () => {
        try {
          await updatePlatformProductStatus(String(record.id), {
            status: nextStatus,
          });
          messageApi.success(`产品已${actionText}`);
          actionRef.current?.reload?.();
        } catch (error) {
          messageApi.error(errorMessage(error, `${actionText}产品失败`));
          throw error;
        }
      },
    });
  };

  const columns: ProColumns<PlatformProduct>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '产品编码或名称' },
    },
    {
      title: '产品编码',
      dataIndex: 'productCode',
      search: false,
      width: 190,
      render: (_, record) => (
        <Typography.Text code>{record.productCode || '-'}</Typography.Text>
      ),
    },
    {
      title: '产品名称',
      dataIndex: 'productName',
      search: false,
      ellipsis: true,
    },
    {
      title: '登录布局',
      dataIndex: 'loginVariant',
      search: false,
      width: 140,
      render: (_, record) => (
        <Typography.Text code>{record.loginVariant || '-'}</Typography.Text>
      ),
    },
    {
      title: '租户模式',
      dataIndex: 'tenantMode',
      search: false,
      width: 160,
      render: (_, record) =>
        record.tenantMode === 'FIXED' ? (
          <Tag color="blue">固定：{record.fixedTenantId || '-'}</Tag>
        ) : (
          <Tag>可选择</Tag>
        ),
    },
    {
      title: 'Web客户端ID',
      dataIndex: 'webClientId',
      search: false,
      width: 160,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      fieldProps: { options: statusOptions },
      width: 100,
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
      title: '更新时间',
      dataIndex: 'updateTime',
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
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              permissions: 'system:product:edit',
              onClick: () => openEdit(record),
            },
            {
              key: 'status',
              label: record.status === '0' ? '停用' : '启用',
              icon:
                record.status === '0' ? (
                  <StopOutlined />
                ) : (
                  <CheckCircleOutlined />
                ),
              danger: record.status === '0',
              permissions: 'system:product:edit',
              onClick: () => changeStatus(record),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer breadcrumbRender={false} title="平台产品管理">
      {messageContextHolder}
      {modalContextHolder}
      <ProTable<PlatformProduct, ProductSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.id)}
        columns={columns}
        search={{ labelWidth: 88 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 1400 }}
        request={async (params) => {
          const response = await listPlatformProducts({
            pageNum: params.current || 1,
            pageSize: params.pageSize || 10,
            keyword: params.keyword,
            status: params.status,
          });
          return {
            data: response.rows || [],
            total: Number(response.total || 0),
            success: response.code === 200,
          };
        }}
        toolBarRender={() => [
          <PermissionButton
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            permissions="system:product:add"
            onClick={openCreate}
          >
            新增产品
          </PermissionButton>,
        ]}
      />

      <ModalForm<ProductFormValues>
        key={editingProduct?.id || 'create-product'}
        title={editingProduct?.id ? '编辑平台产品' : '新增平台产品'}
        open={formOpen}
        initialValues={editingProduct}
        modalProps={{
          destroyOnHidden: true,
          width: 620,
          onCancel: () => setFormOpen(false),
        }}
        onOpenChange={setFormOpen}
        onFinish={async (values) => {
          try {
            const siteContract = normalizeProductSiteContract(values);
            if (editingProduct?.id) {
              await updatePlatformProduct(String(editingProduct.id), {
                productName: values.productName.trim(),
                ...siteContract,
                remark: values.remark?.trim() || undefined,
              });
            } else {
              await createPlatformProduct({
                productCode: values.productCode.trim().toUpperCase(),
                productName: values.productName.trim(),
                ...siteContract,
                status: values.status || '0',
                remark: values.remark?.trim() || undefined,
              });
            }
            messageApi.success('产品已保存');
            setEditingProduct(undefined);
            actionRef.current?.reload?.();
            return true;
          } catch (error) {
            messageApi.error(errorMessage(error, '保存产品失败'));
            return false;
          }
        }}
      >
        <ProFormText
          name="productCode"
          label="产品编码"
          disabled={Boolean(editingProduct?.id)}
          fieldProps={{ style: { textTransform: 'uppercase' } }}
          rules={[
            { required: true, message: '请输入产品编码' },
            {
              pattern: productCodePattern,
              message: '编码需以英文字母开头，仅使用字母、数字和下划线',
            },
          ]}
          transform={(value) =>
            String(value || '')
              .trim()
              .toUpperCase()
          }
        />
        <ProFormText
          name="productName"
          label="产品名称"
          rules={[
            { required: true, whitespace: true, message: '请输入产品名称' },
            { max: 128, message: '产品名称不能超过128个字符' },
          ]}
        />
        <ProFormText
          name="loginVariant"
          label="登录布局编码"
          fieldProps={{ maxLength: 64 }}
          extra={`当前前端已注册：${registeredLoginLayoutHint}。这里只校验编码格式，保存时不把当前前端注册表作为数据库白名单。`}
          rules={[
            { required: true, whitespace: true, message: '请输入登录布局编码' },
            {
              pattern: LOGIN_VARIANT_PATTERN,
              message:
                '需以小写字母开头，只能包含小写字母、数字和连字符，最长64个字符',
            },
            {
              validator: async (_, value) => {
                if (
                  String(value || '')
                    .trim()
                    .toUpperCase() === 'AUTO'
                ) {
                  throw new Error('AUTO 是保留字，产品必须绑定具体登录布局');
                }
              },
            },
          ]}
        />
        <ProFormSelect
          name="tenantMode"
          label="租户模式"
          options={[
            { label: '登录时选择租户', value: 'SELECTABLE' },
            { label: '固定租户', value: 'FIXED' },
          ]}
          rules={[{ required: true, message: '请选择租户模式' }]}
        />
        <ProFormDependency name={['tenantMode']}>
          {({ tenantMode }) =>
            tenantMode === 'FIXED' ? (
              <ProFormText
                name="fixedTenantId"
                label="固定租户ID"
                fieldProps={{ maxLength: 20 }}
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: '请输入固定租户ID',
                  },
                  { max: 20, message: '固定租户ID不能超过20个字符' },
                ]}
              />
            ) : null
          }
        </ProFormDependency>
        <ProFormText
          name="webClientId"
          label="Web客户端ID"
          fieldProps={{ maxLength: 64 }}
          rules={[{ max: 64, message: 'Web客户端ID不能超过64个字符' }]}
        />
        {!editingProduct?.id && (
          <ProFormRadio.Group
            name="status"
            label="初始状态"
            options={statusOptions}
            rules={[{ required: true }]}
          />
        )}
        <ProFormTextArea
          name="remark"
          label="备注"
          fieldProps={{ rows: 3, maxLength: 500, showCount: true }}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default PlatformProductPage;
