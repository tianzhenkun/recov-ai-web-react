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
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Row,
  Select,
  Space,
  Table,
  Tabs,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import {
  billingPermissions,
  formatDate,
  formatPoints,
  getErrorMessage,
  renderCodeId,
  renderDictTag,
} from '@/pages/billing/shared';
import {
  type CreditEnableStatus,
  type CreditMeterScenario,
  type CreditPricingRule,
  type CreditProduct,
  listCreditMeterScenarios,
  listCreditPricingRules,
  listCreditProducts,
  saveCreditMeterScenario,
  saveCreditPricingRule,
  saveCreditProduct,
} from '@/services/ruoyi/credit-billing';
import OperationsGuard from '../components/OperationsGuard';

type ProductFormValues = {
  id?: string;
  productCode: string;
  productName: string;
  status?: CreditEnableStatus;
  sortOrder?: number;
};

type ScenarioFormValues = {
  id?: string;
  productCode: string;
  scenarioCode: string;
  scenarioName: string;
  unitName?: string;
  status?: CreditEnableStatus;
};

type RuleFormValues = {
  id?: string;
  productCode: string;
  scenarioCode: string;
  pricingVersion: string;
  unitPoints: number;
  minPoints?: number;
  maxPoints?: number;
  effectiveFrom?: Dayjs;
  effectiveTo?: Dayjs;
  status?: CreditEnableStatus;
};

const contractCodePattern = /^[a-z][a-z0-9_]{0,63}$/;

const statusOptions = [
  { label: '启用 · ENABLED', value: 'ENABLED' },
  { label: '停用 · DISABLED', value: 'DISABLED' },
];

const unitOptions = [
  { label: '次', value: '次' },
  { label: '条', value: '条' },
  { label: '分钟', value: '分钟' },
  { label: '页', value: '页' },
  { label: '份', value: '份' },
  { label: '封', value: '封' },
  { label: 'token', value: 'token' },
  { label: '千 token', value: '千 token' },
];

const statusText: Record<string, string> = {
  ENABLED: '启用',
  DISABLED: '停用',
};

const statusTone: Record<string, string> = {
  ENABLED: 'green',
  DISABLED: 'default',
};

const toDayjs = (value?: string) => (value ? dayjs(value) : undefined);

const normalizeNumber = (value?: number | string | null) => {
  if (value === undefined || value === null || value === '') return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const normalizeCode = (value?: string) => (value || '').trim().toLowerCase();

const buildStatusActionLabel = (status?: string) =>
  status === 'ENABLED' ? '停用' : '启用';

const buildStatusActionIcon = (status?: string) =>
  status === 'ENABLED' ? <StopOutlined /> : <CheckCircleOutlined />;

const buildNextStatus = (status?: string): CreditEnableStatus =>
  status === 'ENABLED' ? 'DISABLED' : 'ENABLED';

const CreditRulePage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [productForm] = Form.useForm<ProductFormValues>();
  const [scenarioForm] = Form.useForm<ScenarioFormValues>();
  const [ruleForm] = Form.useForm<RuleFormValues>();
  const selectedRuleProductCode = Form.useWatch('productCode', ruleForm);

  const [products, setProducts] = useState<CreditProduct[]>([]);
  const [scenarios, setScenarios] = useState<CreditMeterScenario[]>([]);
  const [rules, setRules] = useState<CreditPricingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CreditProduct>();
  const [editingScenario, setEditingScenario] = useState<CreditMeterScenario>();
  const [editingRule, setEditingRule] = useState<CreditPricingRule>();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [nextProducts, nextScenarios, nextRules] = await Promise.all([
        listCreditProducts(),
        listCreditMeterScenarios(),
        listCreditPricingRules(),
      ]);
      setProducts(nextProducts);
      setScenarios(nextScenarios);
      setRules(nextRules);
    } catch (error) {
      messageApi.error(getErrorMessage(error, '加载计量配置失败'));
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const productNameMap = useMemo(
    () =>
      new Map(
        products.map((item) => [String(item.productCode), item.productName]),
      ),
    [products],
  );

  const scenarioNameMap = useMemo(
    () =>
      new Map(
        scenarios.map((item) => [
          `${item.productCode || ''}:${item.scenarioCode || ''}`,
          item.scenarioName,
        ]),
      ),
    [scenarios],
  );

  const productOptions = useMemo(
    () =>
      products.map((item) => ({
        label: `${item.productName || item.productCode} · ${item.productCode}`,
        value: String(item.productCode),
      })),
    [products],
  );

  const scenarioOptions = useMemo(
    () =>
      scenarios
        .filter(
          (item) =>
            !selectedRuleProductCode ||
            item.productCode === selectedRuleProductCode,
        )
        .map((item) => ({
          label: `${item.scenarioName || item.scenarioCode} · ${item.scenarioCode}`,
          value: String(item.scenarioCode),
        })),
    [scenarios, selectedRuleProductCode],
  );

  const renderProduct = (productCode?: string) => {
    if (!productCode) return '-';
    const productName = productNameMap.get(productCode);
    return productName ? `${productName} · ${productCode}` : productCode;
  };

  const renderScenario = (productCode?: string, scenarioCode?: string) => {
    if (!scenarioCode) return '-';
    const scenarioName = scenarioNameMap.get(
      `${productCode || ''}:${scenarioCode}`,
    );
    return scenarioName ? `${scenarioName} · ${scenarioCode}` : scenarioCode;
  };

  const openProductModal = (record?: CreditProduct) => {
    setEditingProduct(record);
    productForm.setFieldsValue(
      record
        ? {
            id: record.id,
            productCode: record.productCode,
            productName: record.productName,
            status: record.status,
            sortOrder: normalizeNumber(record.sortOrder),
          }
        : { status: 'ENABLED', sortOrder: 100 },
    );
    setProductOpen(true);
  };

  const closeProductModal = () => {
    setProductOpen(false);
    setEditingProduct(undefined);
    productForm.resetFields();
  };

  const openScenarioModal = (record?: CreditMeterScenario) => {
    setEditingScenario(record);
    scenarioForm.setFieldsValue(
      record
        ? {
            id: record.id,
            productCode: record.productCode,
            scenarioCode: record.scenarioCode,
            scenarioName: record.scenarioName,
            unitName: record.unitName,
            status: record.status,
          }
        : { status: 'ENABLED', unitName: '次' },
    );
    setScenarioOpen(true);
  };

  const closeScenarioModal = () => {
    setScenarioOpen(false);
    setEditingScenario(undefined);
    scenarioForm.resetFields();
  };

  const openRuleModal = (record?: CreditPricingRule) => {
    setEditingRule(record);
    ruleForm.setFieldsValue(
      record
        ? {
            id: record.id,
            productCode: record.productCode,
            scenarioCode: record.scenarioCode,
            pricingVersion: record.pricingVersion,
            unitPoints: normalizeNumber(record.unitPoints),
            minPoints: normalizeNumber(record.minPoints),
            maxPoints: normalizeNumber(record.maxPoints),
            effectiveFrom: toDayjs(record.effectiveFrom),
            effectiveTo: toDayjs(record.effectiveTo),
            status: record.status as CreditEnableStatus,
          }
        : {
            status: 'ENABLED',
            pricingVersion: `v${dayjs().format('YYYYMMDDHHmmss')}`,
          },
    );
    setRuleOpen(true);
  };

  const closeRuleModal = () => {
    setRuleOpen(false);
    setEditingRule(undefined);
    ruleForm.resetFields();
  };

  const saveProduct = async () => {
    const values = await productForm.validateFields();
    setSaving(true);
    try {
      await saveCreditProduct({
        id: values.id,
        productCode: normalizeCode(values.productCode),
        productName: values.productName.trim(),
        status: values.status || 'ENABLED',
        sortOrder: values.sortOrder,
      });
      messageApi.success('产品已保存');
      closeProductModal();
      await loadAll();
    } catch (error) {
      messageApi.error(getErrorMessage(error, '保存产品失败'));
    } finally {
      setSaving(false);
    }
  };

  const saveScenario = async () => {
    const values = await scenarioForm.validateFields();
    setSaving(true);
    try {
      await saveCreditMeterScenario({
        id: values.id,
        productCode: values.productCode,
        scenarioCode: normalizeCode(values.scenarioCode),
        scenarioName: values.scenarioName.trim(),
        unitName: values.unitName?.trim(),
        status: values.status || 'ENABLED',
      });
      messageApi.success('计量场景已保存');
      closeScenarioModal();
      await loadAll();
    } catch (error) {
      messageApi.error(getErrorMessage(error, '保存计量场景失败'));
    } finally {
      setSaving(false);
    }
  };

  const saveRule = async () => {
    const values = await ruleForm.validateFields();
    setSaving(true);
    try {
      await saveCreditPricingRule({
        id: values.id,
        productCode: values.productCode,
        scenarioCode: values.scenarioCode,
        pricingVersion: values.pricingVersion.trim(),
        unitPoints: values.unitPoints,
        minPoints: normalizeNumber(values.minPoints),
        maxPoints: normalizeNumber(values.maxPoints),
        effectiveFrom: values.effectiveFrom?.format('YYYY-MM-DD HH:mm:ss'),
        effectiveTo: values.effectiveTo?.format('YYYY-MM-DD HH:mm:ss'),
        status: values.status || 'ENABLED',
      });
      messageApi.success('扣点规则已保存');
      closeRuleModal();
      await loadAll();
    } catch (error) {
      messageApi.error(getErrorMessage(error, '保存扣点规则失败'));
    } finally {
      setSaving(false);
    }
  };

  const toggleProductStatus = async (record: CreditProduct) => {
    if (!record.productCode || !record.productName) return;
    await saveCreditProduct({
      id: record.id,
      productCode: record.productCode,
      productName: record.productName,
      status: buildNextStatus(record.status),
      sortOrder: normalizeNumber(record.sortOrder),
    });
    messageApi.success('产品状态已更新');
    await loadAll();
  };

  const toggleScenarioStatus = async (record: CreditMeterScenario) => {
    if (!record.productCode || !record.scenarioCode || !record.scenarioName) {
      return;
    }
    await saveCreditMeterScenario({
      id: record.id,
      productCode: record.productCode,
      scenarioCode: record.scenarioCode,
      scenarioName: record.scenarioName,
      unitName: record.unitName,
      status: buildNextStatus(record.status),
    });
    messageApi.success('计量场景状态已更新');
    await loadAll();
  };

  const toggleRuleStatus = async (record: CreditPricingRule) => {
    if (!record.productCode || !record.scenarioCode || !record.pricingVersion) {
      return;
    }
    await saveCreditPricingRule({
      id: record.id,
      productCode: record.productCode,
      scenarioCode: record.scenarioCode,
      pricingVersion: record.pricingVersion,
      unitPoints: normalizeNumber(record.unitPoints),
      minPoints: normalizeNumber(record.minPoints),
      maxPoints: normalizeNumber(record.maxPoints),
      effectiveFrom: record.effectiveFrom,
      effectiveTo: record.effectiveTo,
      status: buildNextStatus(record.status),
    });
    messageApi.success('扣点规则状态已更新');
    await loadAll();
  };

  const validateRuleRange = async () => {
    const minPoints = normalizeNumber(ruleForm.getFieldValue('minPoints'));
    const maxPoints = normalizeNumber(ruleForm.getFieldValue('maxPoints'));
    if (
      minPoints !== undefined &&
      maxPoints !== undefined &&
      maxPoints < minPoints
    ) {
      throw new Error('单次最高扣点不能小于单次最低扣点');
    }
  };

  const productColumns: ColumnsType<CreditProduct> = [
    { title: '产品ID', dataIndex: 'id', width: 150, render: renderCodeId },
    { title: '产品编码', dataIndex: 'productCode', width: 180 },
    { title: '产品名称', dataIndex: 'productName', width: 220 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 130,
      render: (value) =>
        renderDictTag(value, statusText, statusTone[String(value || '')]),
    },
    { title: '排序', dataIndex: 'sortOrder', width: 100, align: 'right' },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      width: 180,
      render: formatDate,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              permissions: billingPermissions.adminCatalogEdit,
              onClick: () => openProductModal(record),
            },
            {
              key: 'status',
              label: buildStatusActionLabel(record.status),
              icon: buildStatusActionIcon(record.status),
              danger: record.status === 'ENABLED',
              permissions: billingPermissions.adminCatalogEdit,
              onClick: () => void toggleProductStatus(record),
            },
          ]}
        />
      ),
    },
  ];

  const scenarioColumns: ColumnsType<CreditMeterScenario> = [
    { title: '场景ID', dataIndex: 'id', width: 150, render: renderCodeId },
    {
      title: '产品',
      dataIndex: 'productCode',
      width: 220,
      render: renderProduct,
    },
    { title: '场景编码', dataIndex: 'scenarioCode', width: 180 },
    { title: '场景名称', dataIndex: 'scenarioName', width: 220 },
    { title: '计量单位', dataIndex: 'unitName', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 130,
      render: (value) =>
        renderDictTag(value, statusText, statusTone[String(value || '')]),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              permissions: billingPermissions.adminCatalogEdit,
              onClick: () => openScenarioModal(record),
            },
            {
              key: 'status',
              label: buildStatusActionLabel(record.status),
              icon: buildStatusActionIcon(record.status),
              danger: record.status === 'ENABLED',
              permissions: billingPermissions.adminCatalogEdit,
              onClick: () => void toggleScenarioStatus(record),
            },
          ]}
        />
      ),
    },
  ];

  const ruleColumns: ColumnsType<CreditPricingRule> = [
    { title: '规则ID', dataIndex: 'id', width: 150, render: renderCodeId },
    {
      title: '产品',
      dataIndex: 'productCode',
      width: 220,
      render: renderProduct,
    },
    {
      title: '计量场景',
      dataIndex: 'scenarioCode',
      width: 220,
      render: (value, record) => renderScenario(record.productCode, value),
    },
    { title: '规则版本', dataIndex: 'pricingVersion', width: 150 },
    {
      title: '每单位扣点',
      dataIndex: 'unitPoints',
      width: 140,
      align: 'right',
      render: formatPoints,
    },
    {
      title: '单次最低',
      dataIndex: 'minPoints',
      width: 120,
      align: 'right',
      render: formatPoints,
    },
    {
      title: '单次最高',
      dataIndex: 'maxPoints',
      width: 120,
      align: 'right',
      render: formatPoints,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 130,
      render: (value) =>
        renderDictTag(value, statusText, statusTone[String(value || '')]),
    },
    {
      title: '生效时间',
      dataIndex: 'effectiveFrom',
      width: 180,
      render: formatDate,
    },
    {
      title: '失效时间',
      dataIndex: 'effectiveTo',
      width: 180,
      render: formatDate,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              permissions: billingPermissions.adminCatalogEdit,
              onClick: () => openRuleModal(record),
            },
            {
              key: 'status',
              label: buildStatusActionLabel(record.status),
              icon: buildStatusActionIcon(record.status),
              danger: record.status === 'ENABLED',
              permissions: billingPermissions.adminCatalogEdit,
              onClick: () => void toggleRuleStatus(record),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer breadcrumbRender={false} title="产品与计价">
      {messageContextHolder}
      <ProCard>
        <Space>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={loadAll}>
            刷新
          </Button>
          <PermissionButton
            permissions={billingPermissions.adminCatalogEdit}
            icon={<PlusCircleOutlined />}
            type="primary"
            onClick={() => openProductModal()}
          >
            产品登记
          </PermissionButton>
          <PermissionButton
            permissions={billingPermissions.adminCatalogEdit}
            icon={<PlusCircleOutlined />}
            onClick={() => openScenarioModal()}
          >
            计量场景
          </PermissionButton>
          <PermissionButton
            permissions={billingPermissions.adminCatalogEdit}
            icon={<PlusCircleOutlined />}
            onClick={() => openRuleModal()}
          >
            扣点规则
          </PermissionButton>
        </Space>
      </ProCard>

      <ProCard className="mt-4">
        <Tabs
          items={[
            {
              key: 'products',
              label: '产品登记',
              children: (
                <Table<CreditProduct>
                  columns={productColumns}
                  dataSource={products}
                  loading={loading}
                  pagination={{
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                  rowKey={(record) => String(record.id)}
                  scroll={{ x: 1100 }}
                />
              ),
            },
            {
              key: 'scenarios',
              label: '计量场景',
              children: (
                <Table<CreditMeterScenario>
                  columns={scenarioColumns}
                  dataSource={scenarios}
                  loading={loading}
                  pagination={{
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                  rowKey={(record) => String(record.id)}
                  scroll={{ x: 1180 }}
                />
              ),
            },
            {
              key: 'rules',
              label: '扣点规则',
              children: (
                <Table<CreditPricingRule>
                  columns={ruleColumns}
                  dataSource={rules}
                  loading={loading}
                  pagination={{
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                  rowKey={(record) => String(record.id)}
                  scroll={{ x: 1660 }}
                />
              ),
            },
          ]}
        />
      </ProCard>

      <Modal
        confirmLoading={saving}
        destroyOnHidden
        forceRender
        okText="保存"
        open={productOpen}
        title={editingProduct ? '编辑产品' : '新增产品'}
        onCancel={closeProductModal}
        onOk={saveProduct}
      >
        <Form<ProductFormValues> form={productForm} layout="vertical">
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            label="产品编码"
            name="productCode"
            rules={[
              { required: true, message: '请输入产品编码' },
              { max: 64, message: '产品编码不能超过64个字符' },
              {
                pattern: contractCodePattern,
                message: '产品编码只能使用小写英文、数字、下划线，并以英文开头',
              },
            ]}
            normalize={normalizeCode}
          >
            <Input disabled={!!editingProduct} />
          </Form.Item>
          <Form.Item
            label="产品名称"
            name="productName"
            rules={[
              { required: true, message: '请输入产品名称' },
              { max: 50, message: '产品名称不能超过50个字符' },
            ]}
          >
            <Input allowClear />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="状态" name="status">
                <Select options={statusOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="排序" name="sortOrder">
                <InputNumber className="w-full" min={0} precision={0} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        confirmLoading={saving}
        destroyOnHidden
        forceRender
        okText="保存"
        open={scenarioOpen}
        title={editingScenario ? '编辑计量场景' : '新增计量场景'}
        onCancel={closeScenarioModal}
        onOk={saveScenario}
      >
        <Form<ScenarioFormValues> form={scenarioForm} layout="vertical">
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            label="产品"
            name="productCode"
            rules={[{ required: true, message: '请选择产品' }]}
          >
            <Select
              disabled={!!editingScenario}
              options={productOptions}
              showSearch
            />
          </Form.Item>
          <Form.Item
            label="场景编码"
            name="scenarioCode"
            rules={[
              { required: true, message: '请输入场景编码' },
              { max: 64, message: '场景编码不能超过64个字符' },
              {
                pattern: contractCodePattern,
                message: '场景编码只能使用小写英文、数字、下划线，并以英文开头',
              },
            ]}
            normalize={normalizeCode}
          >
            <Input disabled={!!editingScenario} />
          </Form.Item>
          <Form.Item
            label="场景名称"
            name="scenarioName"
            rules={[
              { required: true, message: '请输入场景名称' },
              { max: 50, message: '场景名称不能超过50个字符' },
            ]}
          >
            <Input allowClear />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="计量单位"
                name="unitName"
                rules={[{ required: true, message: '请选择计量单位' }]}
              >
                <Select options={unitOptions} showSearch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="状态" name="status">
                <Select options={statusOptions} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        confirmLoading={saving}
        destroyOnHidden
        forceRender
        okText="保存"
        open={ruleOpen}
        title={editingRule ? '编辑扣点规则' : '新增扣点规则'}
        width={760}
        onCancel={closeRuleModal}
        onOk={saveRule}
      >
        <Form<RuleFormValues> form={ruleForm} layout="vertical">
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="产品"
                name="productCode"
                rules={[{ required: true, message: '请选择产品' }]}
              >
                <Select
                  disabled={!!editingRule}
                  options={productOptions}
                  showSearch
                  onChange={() =>
                    ruleForm.setFieldValue('scenarioCode', undefined)
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="计量场景"
                name="scenarioCode"
                rules={[{ required: true, message: '请选择计量场景' }]}
              >
                <Select
                  disabled={!!editingRule || !selectedRuleProductCode}
                  options={scenarioOptions}
                  showSearch
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="规则版本"
                name="pricingVersion"
                rules={[
                  { required: true, message: '请输入版本' },
                  { max: 64, message: '版本不能超过64个字符' },
                ]}
              >
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="状态" name="status">
                <Select options={statusOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="每单位扣点"
                name="unitPoints"
                tooltip="按 1 个计量单位扣多少点"
                rules={[{ required: true, message: '请输入每单位扣点' }]}
              >
                <InputNumber className="w-full" min={0.0001} precision={4} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="单次最低扣点"
                name="minPoints"
                tooltip="可选；一次用量事件的最低扣点"
                rules={[{ validator: validateRuleRange }]}
              >
                <InputNumber className="w-full" min={0.0001} precision={4} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="单次最高扣点"
                name="maxPoints"
                tooltip="可选；一次用量事件的扣点封顶"
                rules={[{ validator: validateRuleRange }]}
              >
                <InputNumber className="w-full" min={0.0001} precision={4} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="生效时间" name="effectiveFrom">
                <DatePicker className="w-full" showTime />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="失效时间" name="effectiveTo">
                <DatePicker className="w-full" showTime />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </PageContainer>
  );
};

const GuardedCreditRulePage = () => (
  <OperationsGuard permissions={billingPermissions.adminCatalogList}>
    <CreditRulePage />
  </OperationsGuard>
);

export default GuardedCreditRulePage;
