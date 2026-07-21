import {
  EditOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
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
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PermissionButton } from '@/components/Permission';
import TableActions from '@/components/TableActions';
import {
  billingPermissions,
  couponReceiveModeText,
  couponTypeText,
  formatAmount,
  formatDate,
  getErrorMessage,
  ownerTypeText,
  renderCodeId,
  renderDictTag,
  toNumber,
} from '@/modules/billing/components/shared';
import {
  type CreditCouponTemplate,
  type CreditCouponType,
  type CreditEnableStatus,
  type CreditPackage,
  listCreditCouponTemplates,
  listCreditPackages,
  saveCreditCouponTemplate,
} from '@/modules/billing/services/credit-billing';
import OperationsGuard from '../components/OperationsGuard';

type TemplateFilterValues = {
  receiveMode?: 'all' | 'DIRECT_ISSUE' | 'SELF_CLAIM';
  status?: 'all' | CreditEnableStatus;
};

type TemplateFormValues = {
  id?: string;
  campaignCode: string;
  couponName: string;
  couponType: CreditCouponType;
  discountAmount?: number;
  discountRate?: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  ownerScope: 'TENANT' | 'USER' | 'ALL';
  packageScope: 'ALL' | 'SPECIFIED';
  packageId?: string;
  receiveMode: 'DIRECT_ISSUE' | 'SELF_CLAIM';
  totalQuota?: number;
  validityType: 'FIXED' | 'AFTER_RECEIVE';
  validFrom?: Dayjs;
  validTo?: Dayjs;
  validDays?: number;
  status: CreditEnableStatus;
  sortOrder?: number;
  remark?: string;
};

const receiveModeOptions = [
  { label: '全部方式', value: 'all' },
  { label: '系统发放 · DIRECT_ISSUE', value: 'DIRECT_ISSUE' },
  { label: '用户领取 · SELF_CLAIM', value: 'SELF_CLAIM' },
];

const templateStatusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '启用 · ENABLED', value: 'ENABLED' },
  { label: '停用 · DISABLED', value: 'DISABLED' },
];

const couponTypeOptions = [
  { label: '立减券 · AMOUNT_OFF', value: 'AMOUNT_OFF' },
  { label: '折扣券 · PERCENT_OFF', value: 'PERCENT_OFF' },
];

const ownerScopeOptions = [
  { label: '全部账户', value: 'ALL' },
  { label: '团队', value: 'TENANT' },
  { label: '个人', value: 'USER' },
];

const packageScopeOptions = [
  { label: '全部套餐 · ALL', value: 'ALL' },
  { label: '指定套餐 · SPECIFIED', value: 'SPECIFIED' },
];

const validityTypeOptions = [
  { label: '固定有效期 · FIXED', value: 'FIXED' },
  { label: '领取后有效 · AFTER_RECEIVE', value: 'AFTER_RECEIVE' },
];

const statusText = { ENABLED: '启用', DISABLED: '停用' };
const statusTone: Record<string, string> = {
  ENABLED: 'green',
  DISABLED: 'default',
};

const describeCoupon = (record: CreditCouponTemplate) => {
  if (record.couponType === 'AMOUNT_OFF') {
    return `减 ${formatAmount(record.discountAmount)}`;
  }
  if (record.couponType === 'PERCENT_OFF') {
    const cap = toNumber(record.maxDiscountAmount);
    return `${toNumber(record.discountRate) * 10} 折${cap > 0 ? `，最高减 ${formatAmount(cap)}` : ''}`;
  }
  return '-';
};

const CouponTemplateConfigPage = () => {
  const { token } = theme.useToken();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [filterForm] = Form.useForm<TemplateFilterValues>();
  const [templateForm] = Form.useForm<TemplateFormValues>();
  const couponType = Form.useWatch('couponType', templateForm);
  const packageScope = Form.useWatch('packageScope', templateForm);
  const validityType = Form.useWatch('validityType', templateForm);
  const [templates, setTemplates] = useState<CreditCouponTemplate[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<CreditCouponTemplate>();

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const values = filterForm.getFieldsValue();
      setTemplates(
        await listCreditCouponTemplates({
          receiveMode:
            values.receiveMode && values.receiveMode !== 'all'
              ? values.receiveMode
              : undefined,
          status:
            values.status && values.status !== 'all'
              ? values.status
              : undefined,
        }),
      );
    } catch (error) {
      messageApi.error(getErrorMessage(error, '加载优惠券模板失败'));
    } finally {
      setLoading(false);
    }
  }, [filterForm, messageApi]);

  const loadPackages = useCallback(async () => {
    try {
      setPackages(await listCreditPackages({ packageStatus: 'ON_SALE' }));
    } catch (error) {
      messageApi.error(getErrorMessage(error, '加载套餐失败'));
    }
  }, [messageApi]);

  useEffect(() => {
    void loadTemplates();
    void loadPackages();
  }, [loadPackages, loadTemplates]);

  const packageOptions = useMemo(
    () =>
      packages.map((item) => ({
        label: `${item.packageName || item.id} · ${item.id}`,
        value: String(item.id),
      })),
    [packages],
  );

  const packageLabelMap = useMemo(
    () =>
      new Map(
        packages.map((item) => [
          String(item.id),
          `${item.packageName || item.id} · ${item.id}`,
        ]),
      ),
    [packages],
  );

  const openModal = (record?: CreditCouponTemplate) => {
    setEditingTemplate(record);
    templateForm.setFieldsValue(
      record
        ? {
            id: record.id,
            campaignCode: record.campaignCode,
            couponName: record.couponName,
            couponType: record.couponType,
            discountAmount: toNumber(record.discountAmount) || undefined,
            discountRate: toNumber(record.discountRate) || undefined,
            maxDiscountAmount: toNumber(record.maxDiscountAmount) || undefined,
            minOrderAmount: toNumber(record.minOrderAmount) || undefined,
            ownerScope: record.ownerScope,
            packageScope: record.packageScope,
            packageId: record.packageId,
            receiveMode: record.receiveMode,
            totalQuota: toNumber(record.totalQuota) || undefined,
            validityType: record.validityType,
            validFrom: record.validFrom ? dayjs(record.validFrom) : undefined,
            validTo: record.validTo ? dayjs(record.validTo) : undefined,
            validDays: toNumber(record.validDays) || undefined,
            status: record.status,
            sortOrder: toNumber(record.sortOrder) || undefined,
            remark: record.remark,
          }
        : {
            campaignCode: `campaign-${Date.now()}`,
            couponType: 'AMOUNT_OFF',
            ownerScope: 'TENANT',
            packageScope: 'ALL',
            receiveMode: 'SELF_CLAIM',
            validityType: 'AFTER_RECEIVE',
            validDays: 7,
            status: 'ENABLED',
            sortOrder: 100,
          },
    );
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTemplate(undefined);
    templateForm.resetFields();
  };

  const saveTemplate = async () => {
    const values = await templateForm.validateFields();
    setSaving(true);
    try {
      await saveCreditCouponTemplate({
        id: values.id,
        campaignCode: values.campaignCode.trim(),
        couponName: values.couponName.trim(),
        couponType: values.couponType,
        discountAmount:
          values.couponType === 'AMOUNT_OFF'
            ? values.discountAmount
            : undefined,
        discountRate:
          values.couponType === 'PERCENT_OFF' ? values.discountRate : undefined,
        maxDiscountAmount:
          values.couponType === 'PERCENT_OFF'
            ? values.maxDiscountAmount
            : undefined,
        minOrderAmount: values.minOrderAmount,
        ownerScope: values.ownerScope,
        packageScope: values.packageScope,
        packageId:
          values.packageScope === 'SPECIFIED' ? values.packageId : undefined,
        receiveMode: values.receiveMode,
        totalQuota: values.totalQuota,
        validityType: values.validityType,
        validFrom:
          values.validityType === 'FIXED'
            ? values.validFrom?.toISOString()
            : undefined,
        validTo:
          values.validityType === 'FIXED'
            ? values.validTo?.toISOString()
            : undefined,
        validDays:
          values.validityType === 'AFTER_RECEIVE'
            ? values.validDays
            : undefined,
        status: values.status,
        sortOrder: values.sortOrder,
        remark: values.remark?.trim() || undefined,
      });
      messageApi.success('优惠券模板已保存');
      closeModal();
      await loadTemplates();
    } catch (error) {
      messageApi.error(getErrorMessage(error, '保存优惠券模板失败'));
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<CreditCouponTemplate> = [
    { title: '模板ID', dataIndex: 'id', width: 150, render: renderCodeId },
    {
      title: '优惠券名称',
      dataIndex: 'couponName',
      width: 180,
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'couponType',
      width: 140,
      render: (value) => renderDictTag(value, couponTypeText, 'purple'),
    },
    {
      title: '优惠内容',
      width: 130,
      render: (_, record) => describeCoupon(record),
    },
    {
      title: '领取方式',
      dataIndex: 'receiveMode',
      width: 150,
      render: (value) => renderDictTag(value, couponReceiveModeText, 'blue'),
    },
    {
      title: '适用对象',
      dataIndex: 'ownerScope',
      width: 130,
      render: (value) =>
        renderDictTag(value, { ALL: '全部', ...ownerTypeText }, 'cyan'),
    },
    {
      title: '适用套餐',
      width: 180,
      render: (_, record) =>
        record.packageScope === 'SPECIFIED'
          ? packageLabelMap.get(String(record.packageId)) ||
            renderCodeId(record.packageId)
          : '全部套餐',
    },
    {
      title: '库存',
      width: 130,
      render: (_, record) =>
        `${record.issuedCount || 0}/${record.totalQuota || '不限'}`,
    },
    {
      title: '有效期',
      width: 180,
      render: (_, record) =>
        record.validityType === 'AFTER_RECEIVE'
          ? `领取后 ${record.validDays || '-'} 天`
          : `${formatDate(record.validFrom)} ~ ${formatDate(record.validTo)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value) =>
        renderDictTag(value, statusText, statusTone[String(value || '')]),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 90,
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              permissions: billingPermissions.adminCouponEdit,
              onClick: () => openModal(record),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PageContainer breadcrumbRender={false} title="优惠券模板">
      {messageContextHolder}
      <ProCard>
        <Form<TemplateFilterValues>
          form={filterForm}
          initialValues={{ receiveMode: 'all', status: 'all' }}
          layout="inline"
          onFinish={() => loadTemplates()}
        >
          <Form.Item label="领取方式" name="receiveMode">
            <Select options={receiveModeOptions} style={{ width: 190 }} />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select options={templateStatusOptions} style={{ width: 150 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button htmlType="submit" type="primary">
                查询
              </Button>
              <Button
                onClick={() => {
                  filterForm.resetFields();
                  void loadTemplates();
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
          <Form.Item style={{ marginLeft: 'auto' }}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => loadTemplates()}>
                刷新
              </Button>
              <PermissionButton
                permissions={billingPermissions.adminCouponEdit}
                icon={<PlusCircleOutlined />}
                type="primary"
                onClick={() => openModal()}
              >
                新增模板
              </PermissionButton>
            </Space>
          </Form.Item>
        </Form>
        <Table
          columns={columns}
          dataSource={templates}
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          rowKey={(record) => String(record.id)}
          scroll={{ x: 1450 }}
          size="middle"
          style={{ marginTop: token.marginMD }}
        />
      </ProCard>

      <Modal
        confirmLoading={saving}
        destroyOnHidden
        forceRender
        okText="保存"
        open={modalOpen}
        title={editingTemplate ? '编辑优惠券模板' : '新增优惠券模板'}
        width={760}
        onCancel={closeModal}
        onOk={saveTemplate}
      >
        <Form<TemplateFormValues>
          form={templateForm}
          layout="vertical"
          preserve={false}
        >
          <Row gutter={12}>
            <Form.Item name="id" hidden>
              <Input />
            </Form.Item>
            <Col span={12}>
              <Form.Item
                label="活动编码"
                name="campaignCode"
                rules={[{ required: true, message: '请输入活动编码' }]}
              >
                <Input allowClear maxLength={64} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="优惠券名称"
                name="couponName"
                rules={[
                  { required: true, message: '请输入优惠券名称' },
                  { max: 64 },
                ]}
              >
                <Input allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="优惠券类型"
                name="couponType"
                rules={[{ required: true, message: '请选择优惠券类型' }]}
              >
                <Select options={couponTypeOptions} />
              </Form.Item>
            </Col>
            {couponType === 'AMOUNT_OFF' ? (
              <Col span={12}>
                <Form.Item
                  label="立减金额"
                  name="discountAmount"
                  rules={[{ required: true, message: '请输入立减金额' }]}
                >
                  <InputNumber className="w-full" min={0.01} precision={2} />
                </Form.Item>
              </Col>
            ) : (
              <>
                <Col span={12}>
                  <Form.Item
                    label="折扣率"
                    name="discountRate"
                    rules={[{ required: true, message: '请输入折扣率' }]}
                  >
                    <InputNumber
                      className="w-full"
                      max={0.99}
                      min={0.01}
                      precision={4}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="最高优惠金额" name="maxDiscountAmount">
                    <InputNumber className="w-full" min={0.01} precision={2} />
                  </Form.Item>
                </Col>
              </>
            )}
            <Col span={12}>
              <Form.Item label="使用门槛" name="minOrderAmount">
                <InputNumber className="w-full" min={0} precision={2} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="适用对象"
                name="ownerScope"
                rules={[{ required: true, message: '请选择适用对象' }]}
              >
                <Select options={ownerScopeOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="适用套餐"
                name="packageScope"
                rules={[{ required: true, message: '请选择适用套餐' }]}
              >
                <Select options={packageScopeOptions} />
              </Form.Item>
            </Col>
            {packageScope === 'SPECIFIED' ? (
              <Col span={12}>
                <Form.Item
                  label="指定套餐"
                  name="packageId"
                  rules={[{ required: true, message: '请选择指定套餐' }]}
                >
                  <Select options={packageOptions} showSearch />
                </Form.Item>
              </Col>
            ) : null}
            <Col span={12}>
              <Form.Item
                label="领取方式"
                name="receiveMode"
                rules={[{ required: true, message: '请选择领取方式' }]}
              >
                <Select options={receiveModeOptions.slice(1)} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="总库存" name="totalQuota">
                <InputNumber
                  className="w-full"
                  min={1}
                  precision={0}
                  placeholder="留空表示不限量"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="有效期类型"
                name="validityType"
                rules={[{ required: true, message: '请选择有效期类型' }]}
              >
                <Select options={validityTypeOptions} />
              </Form.Item>
            </Col>
            {validityType === 'AFTER_RECEIVE' ? (
              <Col span={12}>
                <Form.Item
                  label="领取后有效天数"
                  name="validDays"
                  rules={[{ required: true, message: '请输入有效天数' }]}
                >
                  <InputNumber className="w-full" min={1} precision={0} />
                </Form.Item>
              </Col>
            ) : (
              <>
                <Col span={12}>
                  <Form.Item
                    label="开始时间"
                    name="validFrom"
                    rules={[{ required: true, message: '请选择开始时间' }]}
                  >
                    <DatePicker className="w-full" showTime />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="结束时间"
                    name="validTo"
                    rules={[{ required: true, message: '请选择结束时间' }]}
                  >
                    <DatePicker className="w-full" showTime />
                  </Form.Item>
                </Col>
              </>
            )}
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select options={templateStatusOptions.slice(1)} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="展示排序" name="sortOrder">
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

const GuardedCouponTemplateConfigPage = () => (
  <OperationsGuard permissions={billingPermissions.adminCouponList}>
    <CouponTemplateConfigPage />
  </OperationsGuard>
);

export default GuardedCouponTemplateConfigPage;
