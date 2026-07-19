import {
  ApartmentOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { Modal, message, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useRef, useState } from 'react';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import {
  createLicenseProduct,
  createLicenseProductRoute,
  type LicenseProduct,
  type LicenseProductCreatePayload,
  type LicenseProductRoute,
  type LicenseProductRouteCreatePayload,
  type LicenseProductRouteUpdatePayload,
  type LicenseProductUpdatePayload,
  listLicenseProductRoutes,
  listLicenseProducts,
  updateLicenseProduct,
  updateLicenseProductRoute,
} from '@/modules/admin/services/license';

type ProductSearchParams = {
  current?: number;
  pageSize?: number;
  keyword?: string;
  status?: '0' | '1';
};

type ProductFormValues = LicenseProductCreatePayload;
type ProductRouteFormValues = LicenseProductRouteCreatePayload;

const statusOptions = [
  { label: '启用', value: '0' },
  { label: '停用', value: '1' },
];

const productCodePattern = /^[a-z][a-z0-9_]{1,63}$/;
const trimProductCode = (value: unknown) => String(value || '').trim();
const routeIdPattern = /^lingchen-[a-z0-9-]+-app$/;

const ProductManagement = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, messageContextHolder] = message.useMessage();
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LicenseProduct>();
  const [selectedProduct, setSelectedProduct] = useState<LicenseProduct>();
  const [routes, setRoutes] = useState<LicenseProductRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routeFormOpen, setRouteFormOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<LicenseProductRoute>();

  const reloadProducts = () => actionRef.current?.reload?.();

  const openCreateProduct = () => {
    setEditingProduct({ status: '0' });
    setProductFormOpen(true);
  };

  const openEditProduct = (product: LicenseProduct) => {
    setEditingProduct(product);
    setProductFormOpen(true);
  };

  const loadRoutes = async (product: LicenseProduct) => {
    if (!product.productCode) return;
    setRoutesLoading(true);
    try {
      const response = await listLicenseProductRoutes(product.productCode);
      setRoutes(response.data || []);
    } finally {
      setRoutesLoading(false);
    }
  };

  const openRouteManager = async (product: LicenseProduct) => {
    setSelectedProduct(product);
    setRoutes([]);
    await loadRoutes(product);
  };

  const closeRouteManager = () => {
    setSelectedProduct(undefined);
    setRoutes([]);
    setEditingRoute(undefined);
    setRouteFormOpen(false);
  };

  const openCreateRoute = () => {
    setEditingRoute({ status: '0' });
    setRouteFormOpen(true);
  };

  const openEditRoute = (route: LicenseProductRoute) => {
    setEditingRoute(route);
    setRouteFormOpen(true);
  };

  const productColumns: ProColumns<LicenseProduct>[] = [
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
      width: 180,
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
      width: 104,
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'routes',
              label: '路由绑定',
              icon: <ApartmentOutlined />,
              permissions: 'system:license:product:list',
              onClick: () => void openRouteManager(record),
            },
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              permissions: 'system:license:product:edit',
              onClick: () => openEditProduct(record),
            },
          ]}
        />
      ),
    },
  ];

  const routeColumns: ColumnsType<LicenseProductRoute> = [
    {
      title: 'Gateway Route ID',
      dataIndex: 'routeId',
      width: 210,
      render: (value) => <Typography.Text code>{value || '-'}</Typography.Text>,
    },
    {
      title: '目标服务',
      dataIndex: 'serviceId',
      width: 210,
      render: (value) => <Typography.Text code>{value || '-'}</Typography.Text>,
    },
    {
      title: '路径核对',
      dataIndex: 'pathPatterns',
      render: (value) => (
        <Typography.Text style={{ whiteSpace: 'normal' }}>
          {value || '-'}
        </Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 88,
      render: (value) =>
        value === '1' ? <Tag>停用</Tag> : <Tag color="success">启用</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 72,
      fixed: 'right',
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              permissions: 'system:license:product:edit',
              onClick: () => openEditRoute(record),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      {messageContextHolder}
      <ProTable<LicenseProduct, ProductSearchParams>
        actionRef={actionRef}
        rowKey={(record) => String(record.id)}
        columns={productColumns}
        search={{ labelWidth: 88 }}
        pagination={{
          defaultPageSize: 10,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 980 }}
        request={async (params) => {
          const response = await listLicenseProducts({
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
            permissions="system:license:product:edit"
            onClick={openCreateProduct}
          >
            新增产品
          </PermissionButton>,
        ]}
      />

      <ModalForm<ProductFormValues>
        key={editingProduct?.id || 'create-product'}
        title={editingProduct?.id ? '编辑许可证产品' : '新增许可证产品'}
        open={productFormOpen}
        initialValues={editingProduct}
        modalProps={{
          destroyOnHidden: true,
          width: 620,
          onCancel: () => setProductFormOpen(false),
        }}
        onOpenChange={setProductFormOpen}
        onFinish={async (values) => {
          if (editingProduct?.id) {
            const payload: LicenseProductUpdatePayload = {
              productName: values.productName.trim(),
              status: values.status || '0',
              remark: values.remark?.trim(),
            };
            await updateLicenseProduct(String(editingProduct.id), payload);
          } else {
            await createLicenseProduct({
              productCode: values.productCode.trim(),
              productName: values.productName.trim(),
              status: values.status || '0',
              remark: values.remark?.trim(),
            });
          }
          messageApi.success('产品已保存');
          setEditingProduct(undefined);
          reloadProducts();
          return true;
        }}
      >
        <ProFormText
          name="productCode"
          label="产品编码"
          disabled={Boolean(editingProduct?.id)}
          rules={[
            {
              required: true,
              message: '请输入产品编码',
              transform: trimProductCode,
            },
            {
              pattern: productCodePattern,
              message: '编码需以小写英文字母开头，仅使用小写字母、数字和下划线',
              transform: trimProductCode,
            },
          ]}
        />
        <ProFormText
          name="productName"
          label="产品名称"
          rules={[
            { required: true, whitespace: true, message: '请输入产品名称' },
            { max: 128, message: '产品名称不能超过128个字符' },
          ]}
        />
        <ProFormRadio.Group
          name="status"
          label="状态"
          options={statusOptions}
          rules={[{ required: true }]}
        />
        <ProFormTextArea
          name="remark"
          label="备注"
          fieldProps={{ rows: 3, maxLength: 500, showCount: true }}
        />
      </ModalForm>

      <Modal
        title={`产品路由绑定 · ${selectedProduct?.productName || selectedProduct?.productCode || '-'}`}
        open={Boolean(selectedProduct)}
        width={1060}
        footer={null}
        destroyOnHidden
        onCancel={closeRouteManager}
      >
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <PermissionButton
              type="primary"
              icon={<PlusOutlined />}
              permissions="system:license:product:edit"
              onClick={openCreateRoute}
            >
              新增路由绑定
            </PermissionButton>
          </Space>
          <Table<LicenseProductRoute>
            rowKey={(record) => String(record.id)}
            columns={routeColumns}
            dataSource={routes}
            loading={routesLoading}
            pagination={false}
            scroll={{ x: 940 }}
            size="small"
          />
        </Space>
      </Modal>

      <ModalForm<ProductRouteFormValues>
        key={editingRoute?.id || 'create-route'}
        title={editingRoute?.id ? '编辑产品路由绑定' : '新增产品路由绑定'}
        open={routeFormOpen}
        initialValues={editingRoute}
        modalProps={{
          destroyOnHidden: true,
          width: 680,
          onCancel: () => setRouteFormOpen(false),
        }}
        onOpenChange={setRouteFormOpen}
        onFinish={async (values) => {
          if (editingRoute?.id) {
            const payload: LicenseProductRouteUpdatePayload = {
              pathPatterns: values.pathPatterns.trim(),
              status: values.status || '0',
              remark: values.remark?.trim(),
            };
            await updateLicenseProductRoute(String(editingRoute.id), payload);
          } else if (selectedProduct?.id) {
            await createLicenseProductRoute(String(selectedProduct.id), {
              routeId: values.routeId.trim(),
              serviceId: values.serviceId.trim(),
              pathPatterns: values.pathPatterns.trim(),
              status: values.status || '0',
              remark: values.remark?.trim(),
            });
          }
          messageApi.success('路由绑定已保存');
          setEditingRoute(undefined);
          if (selectedProduct) await loadRoutes(selectedProduct);
          return true;
        }}
      >
        <ProFormText
          name="routeId"
          label="Gateway Route ID"
          disabled={Boolean(editingRoute?.id)}
          rules={[
            { required: true, message: '请输入Gateway Route ID' },
            {
              pattern: routeIdPattern,
              message: '格式必须为 lingchen-xxx-app',
            },
          ]}
        />
        <ProFormText
          name="serviceId"
          label="目标服务ID"
          disabled={Boolean(editingRoute?.id)}
          rules={[
            { required: true, message: '请输入目标服务ID' },
            {
              pattern: routeIdPattern,
              message: '格式必须为 lingchen-xxx-app',
            },
          ]}
        />
        <ProFormTextArea
          name="pathPatterns"
          label="路径核对"
          tooltip="逗号分隔，仅用于维护和部署核对；最终安全绑定会进入签名许可证"
          rules={[
            { required: true, whitespace: true, message: '请输入路径表达式' },
            { max: 2000, message: '路径表达式不能超过2000个字符' },
          ]}
          fieldProps={{ rows: 4, maxLength: 2000, showCount: true }}
        />
        <ProFormRadio.Group
          name="status"
          label="状态"
          options={statusOptions}
          rules={[{ required: true }]}
        />
        <ProFormTextArea
          name="remark"
          label="备注"
          fieldProps={{ rows: 3, maxLength: 500, showCount: true }}
        />
      </ModalForm>
    </>
  );
};

export default ProductManagement;
