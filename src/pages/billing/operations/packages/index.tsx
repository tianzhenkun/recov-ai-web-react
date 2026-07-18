import {
  CheckCircleOutlined,
  EditOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import {
  billingPermissions,
  describePackageTerm,
  formatAmount,
  formatDate,
  formatPoints,
  getErrorMessage,
  packageKindText,
  packageOwnerScopeText,
  packageStatusText,
  packageStatusTone,
  renderCodeId,
  renderDictTag,
} from '@/pages/billing/shared';
import {
  type CreditPackage,
  createCreditPackage,
  listCreditPackages,
  updateCreditPackage,
  updateCreditPackageStatus,
} from '@/services/ruoyi/credit-billing';
import {
  listEnabledPlatformProducts,
  type PlatformProduct,
} from '@/services/ruoyi/product-catalog';
import OperationsGuard from '../components/OperationsGuard';

type PackageFilterValues = {
  ownerScope?: 'all' | 'TENANT' | 'USER';
  status?: 'all' | 'ON_SALE' | 'OFF_SALE';
};

type PackageFormValues = {
  packageName: string;
  ownerScope: 'TENANT' | 'USER';
  packageKind: 'FIXED_POINTS' | 'TERM_POINTS';
  points: number;
  price: number;
  productCodes: string[];
  termMonths?: 1 | 3;
  sortOrder?: number;
  remark?: string;
};

const packageTypeOptions = [
  { label: '全部套餐', value: 'all' },
  { label: '个人套餐', value: 'USER' },
  { label: '团队套餐', value: 'TENANT' },
];

const packageStatusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '在售 · ON_SALE', value: 'ON_SALE' },
  { label: '停售 · OFF_SALE', value: 'OFF_SALE' },
];

const packageKindOptions = [
  { label: '固定点数包', value: 'FIXED_POINTS' },
  { label: '周期点数包', value: 'TERM_POINTS' },
];

const validatePackageName = async (_: unknown, value?: string) => {
  const packageName = value?.trim() ?? '';
  if (!packageName) {
    throw new Error('请输入套餐名称');
  }
  if (packageName.length > 25) {
    throw new Error('套餐名称不能超过25个字符');
  }
};

const CreditPackagePage = () => {
  const { token } = theme.useToken();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [filterForm] = Form.useForm<PackageFilterValues>();
  const [packageForm] = Form.useForm<PackageFormValues>();
  const currentPackageKind = Form.useWatch('packageKind', packageForm);

  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [platformProducts, setPlatformProducts] = useState<PlatformProduct[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage>();

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const values = filterForm.getFieldsValue();
      const rows = await listCreditPackages({
        ownerScope:
          values.ownerScope && values.ownerScope !== 'all'
            ? values.ownerScope
            : undefined,
        packageStatus:
          values.status && values.status !== 'all' ? values.status : undefined,
      });
      setPackages(rows);
    } catch (error) {
      messageApi.error(getErrorMessage(error, '加载套餐失败'));
    } finally {
      setLoading(false);
    }
  }, [filterForm, messageApi]);

  const loadPlatformProducts = useCallback(async () => {
    try {
      const response = await listEnabledPlatformProducts();
      setPlatformProducts(response.data || []);
    } catch (error) {
      messageApi.error(getErrorMessage(error, '加载平台产品失败'));
    }
  }, [messageApi]);

  useEffect(() => {
    void Promise.all([loadPackages(), loadPlatformProducts()]);
  }, [loadPackages, loadPlatformProducts]);

  const productOptions = useMemo(() => {
    const enabled = platformProducts
      .filter((product) => product.productCode)
      .map((product) => ({
        label: `${product.productName || product.productCode} · ${product.productCode}`,
        value: String(product.productCode),
      }));
    const enabledCodes = new Set(enabled.map((option) => option.value));
    const disabledExisting = (editingPackage?.products || [])
      .filter(
        (product) =>
          product.productCode && !enabledCodes.has(String(product.productCode)),
      )
      .map((product) => ({
        label: `${product.productName || product.productCode} · ${product.productCode}（已停用，请移除）`,
        value: String(product.productCode),
      }));
    return [...enabled, ...disabledExisting];
  }, [editingPackage?.products, platformProducts]);

  const summary = useMemo(
    () =>
      packages.reduce(
        (acc, item) => ({
          total: acc.total + 1,
          onSale: acc.onSale + (item.status === 'ON_SALE' ? 1 : 0),
          personal: acc.personal + (item.ownerScope === 'USER' ? 1 : 0),
          team: acc.team + (item.ownerScope === 'TENANT' ? 1 : 0),
        }),
        { total: 0, onSale: 0, personal: 0, team: 0 },
      ),
    [packages],
  );

  const openCreateModal = () => {
    setEditingPackage(undefined);
    packageForm.setFieldsValue({
      ownerScope: 'USER',
      packageKind: 'FIXED_POINTS',
      points: 100,
      price: 99,
      productCodes: [],
      sortOrder: 100,
    });
    setModalOpen(true);
  };

  const openEditModal = (record: CreditPackage) => {
    setEditingPackage(record);
    packageForm.setFieldsValue({
      packageName: record.packageName || '',
      ownerScope: record.ownerScope || 'USER',
      packageKind: record.packageKind || 'FIXED_POINTS',
      points: Number(record.points || 0),
      price: Number(record.price || 0),
      productCodes: (record.products || [])
        .map((product) => product.productCode)
        .filter((code): code is string => Boolean(code)),
      termMonths:
        record.packageKind === 'TERM_POINTS'
          ? (Number(record.termMonths) as 1 | 3)
          : undefined,
      sortOrder: Number(record.sortOrder ?? 100),
      remark: record.remark,
    });
    setModalOpen(true);
  };

  const closeCreateModal = () => {
    setModalOpen(false);
    setEditingPackage(undefined);
    packageForm.resetFields();
  };

  const validateTermMonths = async (_: unknown, value?: number | null) => {
    const packageKind = packageForm.getFieldValue('packageKind');
    if (packageKind === 'TERM_POINTS' && ![1, 3].includes(Number(value))) {
      throw new Error('周期点数包必须选择 1 或 3 个自然月');
    }
  };

  const handleSave = async () => {
    const values = await packageForm.validateFields();
    setSaving(true);
    try {
      const payload = {
        packageName: values.packageName.trim(),
        ownerScope: values.ownerScope,
        packageKind: values.packageKind,
        termMonths:
          values.packageKind === 'TERM_POINTS' ? values.termMonths : undefined,
        points: values.points,
        price: values.price,
        productCodes: values.productCodes,
        sortOrder: values.sortOrder ?? undefined,
        remark: values.remark?.trim() || undefined,
      };
      if (editingPackage?.id) {
        await updateCreditPackage(String(editingPackage.id), payload);
      } else {
        await createCreditPackage(payload);
      }
      messageApi.success(editingPackage?.id ? '套餐已更新' : '套餐已创建');
      closeCreateModal();
      await loadPackages();
    } catch (error) {
      messageApi.error(getErrorMessage(error, '保存套餐失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (record: CreditPackage) => {
    const currentStatus = record.status;
    const nextStatus = currentStatus === 'ON_SALE' ? 'OFF_SALE' : 'ON_SALE';
    const actionText = nextStatus === 'OFF_SALE' ? '停售' : '上架';
    modalApi.confirm({
      title: `确认${actionText}套餐`,
      content:
        nextStatus === 'OFF_SALE'
          ? `确认停售“${record.packageName || record.id}”吗？停售后不影响历史订单和已到账信用点。`
          : `确认重新上架“${record.packageName || record.id}”吗？上架后符合范围的用户可立即购买。`,
      okText: `确认${actionText}`,
      okButtonProps: { danger: nextStatus === 'OFF_SALE' },
      cancelText: '取消',
      onOk: async () => {
        if (!record.id) return;
        await updateCreditPackageStatus(record.id, {
          packageStatus: nextStatus,
        });
        messageApi.success(`套餐已${actionText}`);
        await loadPackages();
      },
    });
  };

  const columns: ColumnsType<CreditPackage> = [
    {
      title: '套餐ID',
      dataIndex: 'id',
      width: 150,
      render: renderCodeId,
    },
    {
      title: '套餐名称',
      dataIndex: 'packageName',
      width: 180,
      ellipsis: true,
    },
    {
      title: '适用对象',
      dataIndex: 'ownerScope',
      width: 140,
      render: (value) => renderDictTag(value, packageOwnerScopeText, 'blue'),
    },
    {
      title: '适用产品',
      dataIndex: 'products',
      width: 260,
      render: (_, record) =>
        record.products?.length
          ? record.products
              .map(
                (product) => product.productName || product.productCode || '-',
              )
              .join('、')
          : '未配置（不可售）',
    },
    {
      title: '套餐类型',
      dataIndex: 'packageKind',
      width: 160,
      render: (value) => renderDictTag(value, packageKindText, 'purple'),
    },
    {
      title: '点数',
      dataIndex: 'points',
      align: 'right',
      width: 120,
      render: formatPoints,
    },
    {
      title: '价格',
      dataIndex: 'price',
      align: 'right',
      width: 120,
      render: formatAmount,
    },
    {
      title: '有效期',
      key: 'term',
      width: 110,
      render: (_, record) =>
        describePackageTerm(record.packageKind, record.termMonths),
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const value = String(record.status || '');
        return renderDictTag(
          value,
          packageStatusText,
          packageStatusTone[value],
        );
      },
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      align: 'right',
      width: 90,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      render: formatDate,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              permissions: billingPermissions.adminPackageEdit,
              onClick: () => openEditModal(record),
            },
            {
              key: 'stop',
              label: record.status === 'ON_SALE' ? '停售' : '上架',
              icon:
                record.status === 'ON_SALE' ? (
                  <StopOutlined />
                ) : (
                  <CheckCircleOutlined />
                ),
              danger: record.status === 'ON_SALE',
              permissions: billingPermissions.adminPackageEdit,
              onClick: () => handleStatusChange(record),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer breadcrumbRender={false} title="套餐管理">
      {messageContextHolder}
      {modalContextHolder}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <ProCard>
            <Statistic title="套餐总数" value={summary.total} />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <ProCard>
            <Statistic title="在售套餐" value={summary.onSale} />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <ProCard>
            <Statistic title="个人套餐" value={summary.personal} />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <ProCard>
            <Statistic title="团队套餐" value={summary.team} />
          </ProCard>
        </Col>
      </Row>

      <ProCard style={{ marginTop: token.marginLG }} title="套餐列表">
        <Form<PackageFilterValues>
          form={filterForm}
          initialValues={{ ownerScope: 'all', status: 'all' }}
          layout="inline"
          onFinish={() => loadPackages()}
        >
          <Form.Item label="适用对象" name="ownerScope">
            <Select options={packageTypeOptions} style={{ width: 180 }} />
          </Form.Item>
          <Form.Item label="套餐状态" name="status">
            <Select options={packageStatusOptions} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                查询
              </Button>
              <Button
                onClick={() => {
                  filterForm.resetFields();
                  void loadPackages();
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
          <Form.Item style={{ marginLeft: 'auto' }}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => loadPackages()}>
                刷新
              </Button>
              <PermissionButton
                permissions={billingPermissions.adminPackageEdit}
                icon={<PlusCircleOutlined />}
                type="primary"
                onClick={openCreateModal}
              >
                新增套餐
              </PermissionButton>
            </Space>
          </Form.Item>
        </Form>
        <Table
          columns={columns}
          dataSource={packages}
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          rowKey={(record) => String(record.id)}
          scroll={{ x: 1960 }}
          size="middle"
          style={{ marginTop: token.marginMD }}
        />
      </ProCard>

      <Modal
        confirmLoading={saving}
        destroyOnHidden
        forceRender
        okText={editingPackage ? '保存修改' : '确认创建'}
        open={modalOpen}
        title={editingPackage ? '编辑套餐' : '新增套餐'}
        width={760}
        onCancel={closeCreateModal}
        onOk={handleSave}
      >
        <Form<PackageFormValues>
          form={packageForm}
          layout="vertical"
          preserve={false}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="套餐名称"
                name="packageName"
                rules={[{ validator: validatePackageName }]}
              >
                <Input allowClear maxLength={25} showCount />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="适用对象"
                name="ownerScope"
                rules={[{ required: true, message: '请选择适用对象' }]}
              >
                <Select options={packageTypeOptions.slice(1)} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="适用产品"
                name="productCodes"
                rules={[
                  { required: true, message: '请至少选择一个适用产品' },
                  {
                    type: 'array',
                    min: 1,
                    max: 50,
                    message: '请选择 1 到 50 个适用产品',
                  },
                  {
                    validator: async (_, values?: string[]) => {
                      const enabledCodes = new Set(
                        platformProducts
                          .map((product) => product.productCode)
                          .filter((code): code is string => Boolean(code)),
                      );
                      const disabledCodes = (values || []).filter(
                        (code) => !enabledCodes.has(code),
                      );
                      if (disabledCodes.length) {
                        throw new Error(
                          `已停用产品必须移除：${disabledCodes.join('、')}`,
                        );
                      }
                    },
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  optionFilterProp="label"
                  options={productOptions}
                  placeholder="选择套餐允许展示和购买的产品"
                  showSearch
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="套餐类型"
                name="packageKind"
                rules={[{ required: true, message: '请选择套餐类型' }]}
              >
                <Select options={packageKindOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="套餐点数"
                name="points"
                rules={[{ required: true, message: '请输入套餐点数' }]}
              >
                <InputNumber className="w-full" min={0.0001} precision={4} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="套餐价格"
                name="price"
                rules={[{ required: true, message: '请输入套餐价格' }]}
              >
                <InputNumber className="w-full" min={0.01} precision={2} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="周期时长"
                name="termMonths"
                rules={[{ validator: validateTermMonths }]}
              >
                <Select
                  disabled={currentPackageKind !== 'TERM_POINTS'}
                  placeholder={
                    currentPackageKind === 'TERM_POINTS'
                      ? '选择自然月周期'
                      : '固定包永久有效'
                  }
                  options={[
                    { label: '1 个自然月', value: 1 },
                    { label: '3 个自然月', value: 3 },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="排序" name="sortOrder">
                <InputNumber className="w-full" min={0} precision={0} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="备注" name="remark">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </PageContainer>
  );
};

const GuardedCreditPackagePage = () => (
  <OperationsGuard permissions={billingPermissions.adminPackageList}>
    <CreditPackagePage />
  </OperationsGuard>
);

export default GuardedCreditPackagePage;
