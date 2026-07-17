import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  message,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { usePermission } from '@/components/Permission';
import {
  downloadLicenseFile,
  issueLicense,
  type LicenseDeployment,
  type LicenseIssue,
  type LicenseIssueType,
  type LicenseProductGrant,
  listLicenseIssues,
} from '@/services/ruoyi/license';
import {
  listEnabledPlatformProducts,
  type PlatformProduct,
} from '@/services/ruoyi/product-catalog';
import {
  assertLatestIssueRevisionMatches,
  buildIssueRequestWithPreviousSnapshot,
  getNextRevision,
  getRemovedProductCodes,
  type LicenseIssueFormValues,
  toIssueProductFormValues,
} from './model';

type IssueLicenseModalProps = {
  deployment?: LicenseDeployment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssued: (issue: LicenseIssue) => void;
};

const issueTypeOptions: { label: string; value: LicenseIssueType }[] = [
  { label: '首次签发', value: 'INITIAL' },
  { label: '续期', value: 'RENEWAL' },
  { label: '增加或调整产品', value: 'PRODUCT_CHANGE' },
  { label: '替换许可证', value: 'REPLACEMENT' },
];

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const IssueLicenseModal = ({
  deployment,
  open,
  onOpenChange,
  onIssued,
}: IssueLicenseModalProps) => {
  const [form] = Form.useForm<LicenseIssueFormValues>();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [products, setProducts] = useState<PlatformProduct[]>([]);
  const [previousProducts, setPreviousProducts] = useState<
    LicenseProductGrant[]
  >([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [modalApi, modalContextHolder] = Modal.useModal();
  const { hasPermission } = usePermission();
  const productValues = Form.useWatch('products', form) || [];
  const issueType = Form.useWatch('issueType', form);
  const nextRevision = getNextRevision(deployment?.lastIssuedRevision);
  const hasPriorIssue = String(deployment?.lastIssuedRevision || '0') !== '0';
  const isRenewal = issueType === 'RENEWAL';
  const isReplacement = issueType === 'REPLACEMENT';
  const isProductChange = issueType === 'PRODUCT_CHANGE';
  const isProductSetReadOnly = isRenewal || isReplacement;
  const availableIssueTypeOptions = hasPriorIssue
    ? issueTypeOptions.filter((option) => option.value !== 'INITIAL')
    : issueTypeOptions.filter((option) => option.value === 'INITIAL');

  useEffect(() => {
    if (!open || !deployment) return;

    form.resetFields();
    let active = true;
    setProducts([]);
    setPreviousProducts([]);
    setInitializationError(undefined);
    setProductsLoading(true);
    setInitializing(true);

    const loadLatestIssue = async () => {
      if (!hasPriorIssue) return undefined;
      if (!deployment.deploymentId) {
        throw new Error('当前部署缺少deploymentId，无法加载上一版许可证');
      }
      const response = await listLicenseIssues({
        deploymentId: deployment.deploymentId,
        pageNum: 1,
        pageSize: 1,
      });
      const latestIssue = response.rows?.[0];
      if (!latestIssue) {
        throw new Error('未找到上一版许可证签发记录');
      }
      if (latestIssue.deploymentId !== deployment.deploymentId) {
        throw new Error('上一版许可证与当前deploymentId不匹配');
      }
      assertLatestIssueRevisionMatches(
        latestIssue.licenseRevision,
        deployment.lastIssuedRevision,
      );
      return latestIssue;
    };

    Promise.all([listEnabledPlatformProducts(), loadLatestIssue()])
      .then(([productResponse, latestIssue]) => {
        if (!active) return;
        setProducts(productResponse.data || []);

        if (latestIssue) {
          const snapshot = latestIssue.products || [];
          const restoredProducts = toIssueProductFormValues(snapshot);
          setPreviousProducts(snapshot);
          form.setFieldsValue({
            issueType: 'RENEWAL',
            issueReason: '',
            products: restoredProducts,
          });
          return;
        }

        form.setFieldsValue({
          issueType: 'INITIAL',
          issueReason: '',
          products: [
            {
              permanent: true,
              validFrom: dayjs(),
            },
          ],
        });
      })
      .catch((error) => {
        if (!active) return;
        setInitializationError(getErrorMessage(error, '许可证签发初始化失败'));
        form.setFieldsValue({ products: [] });
      })
      .finally(() => {
        if (active) {
          setProductsLoading(false);
          setInitializing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [deployment, form, hasPriorIssue, open]);

  const productOptions = useMemo(
    () =>
      products
        .filter((product) => product.productCode)
        .map((product) => ({
          label: `${product.productName || product.productCode} · ${product.productCode}`,
          value: String(product.productCode),
        })),
    [products],
  );

  const selectedProductCodes = productValues
    .map((product) => product?.productCode)
    .filter(Boolean);

  const confirmRemovedProducts = (productCodes: string[]) =>
    new Promise<boolean>((resolve) => {
      modalApi.confirm({
        title: '确认使以下产品授权失效？',
        content: (
          <Space orientation="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Text>
              新许可证是完整授权快照，未包含的既有产品将在客户替换文件后立即失效：
            </Typography.Text>
            <Space wrap>
              {productCodes.map((productCode) => (
                <Tag key={productCode} color="error">
                  {productCode}
                </Tag>
              ))}
            </Space>
          </Space>
        ),
        okText: '确认失效并继续签发',
        okType: 'danger',
        cancelText: '返回检查',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

  const submit = async (values: LicenseIssueFormValues) => {
    if (!deployment?.id) return;
    if (initializing || initializationError) {
      messageApi.error(
        initializationError || '许可证授权快照尚未加载完成，请稍后再试',
      );
      return;
    }

    try {
      const request = buildIssueRequestWithPreviousSnapshot(
        values,
        previousProducts,
      );
      const removedProductCodes = getRemovedProductCodes(
        previousProducts,
        request.products,
      );
      if (
        removedProductCodes.length > 0 &&
        !(await confirmRemovedProducts(removedProductCodes))
      ) {
        return;
      }

      setSubmitting(true);
      const response = await issueLicense(String(deployment.id), request);
      const issue = response.data;
      if (!issue?.id) {
        throw new Error('许可证已经签发，但响应中缺少签发记录ID');
      }

      onOpenChange(false);
      onIssued(issue);
      messageApi.success(
        `许可证已签发，revision ${issue.licenseRevision || nextRevision}`,
      );

      if (hasPermission('system:license:download')) {
        try {
          await downloadLicenseFile(String(issue.id));
        } catch {
          messageApi.warning(
            '许可证已签发，但文件自动下载失败，请到签发记录中重新下载',
          );
        }
      }
    } catch (error) {
      messageApi.error(getErrorMessage(error, '许可证签发失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {messageContextHolder}
      {modalContextHolder}
      <Modal
        title="签发离线许可证"
        open={open}
        width={960}
        destroyOnHidden
        confirmLoading={submitting}
        okButtonProps={{
          disabled: initializing || Boolean(initializationError),
        }}
        okText="确认签发"
        cancelText="取消"
        onCancel={() => onOpenChange(false)}
        onOk={() => {
          if (!initializing && !initializationError) form.submit();
        }}
      >
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            showIcon
            type="info"
            title={`部署：${deployment?.customerName || '-'} · ${deployment?.deploymentId || '-'}`}
            description={`预计 revision：${nextRevision}。该值仅用于签发前确认，最终 revision 由后端在事务中生成。`}
          />
          {initializing && hasPriorIssue ? (
            <Alert
              showIcon
              type="info"
              title="正在加载上一版完整授权快照"
              description="加载完成前不能签发，避免续期或替换时遗漏已有产品。"
            />
          ) : null}
          {initializationError ? (
            <Alert
              showIcon
              type="error"
              title="许可证签发初始化失败"
              description={`${initializationError}。当前已禁止提交，请关闭后重试。`}
            />
          ) : null}
          {isReplacement ? (
            <Alert
              showIcon
              type="warning"
              title="替换许可证必须保持原授权快照"
              description="产品、生效时间和结束时间均为只读；本次仅生成新的许可证标识和revision。"
            />
          ) : null}
          {isRenewal ? (
            <Alert
              showIcon
              type="info"
              title="续期只能调整已有产品的有效期"
              description="产品集合保持只读，不能增加、删除或替换产品；可分别调整各产品的永久或限时授权。"
            />
          ) : null}
          {isProductChange ? (
            <Alert
              showIcon
              type="info"
              title="产品调整必须变更产品集合"
              description="必须增加、删除或替换至少一个产品；提交内容仍是下一版许可证的完整授权快照。"
            />
          ) : null}

          <Form<LicenseIssueFormValues>
            form={form}
            layout="vertical"
            onFinish={submit}
          >
            <Form.Item
              name="issueType"
              label="签发类型"
              rules={[{ required: true, message: '请选择签发类型' }]}
            >
              <Select
                disabled={initializing}
                options={availableIssueTypeOptions}
                onChange={(value) => {
                  if (value === 'RENEWAL' || value === 'REPLACEMENT') {
                    form.setFieldValue(
                      'products',
                      toIssueProductFormValues(previousProducts),
                    );
                  }
                }}
              />
            </Form.Item>
            <Form.Item
              name="issueReason"
              label="签发原因"
              rules={[
                { required: true, whitespace: true, message: '请填写签发原因' },
                { max: 500, message: '签发原因不能超过500个字符' },
              ]}
            >
              <Input.TextArea
                disabled={initializing}
                rows={3}
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Form.List
              name="products"
              rules={[
                {
                  validator: async (_, value) => {
                    if (!value || value.length === 0) {
                      throw new Error('请至少选择一个授权产品');
                    }
                  },
                },
              ]}
            >
              {(fields, { add, remove }, { errors }) => (
                <Space
                  orientation="vertical"
                  size={12}
                  style={{ width: '100%' }}
                >
                  {fields.map((field, index) => {
                    const currentCode = productValues[index]?.productCode;
                    const permanent = productValues[index]?.permanent !== false;
                    const options = productOptions.map((option) => ({
                      ...option,
                      disabled:
                        option.value !== currentCode &&
                        selectedProductCodes.includes(option.value),
                    }));

                    return (
                      <Card
                        key={field.key}
                        size="small"
                        title={`授权产品 ${index + 1}`}
                        extra={
                          <Button
                            danger
                            type="text"
                            icon={<DeleteOutlined />}
                            disabled={
                              isProductSetReadOnly || fields.length === 1
                            }
                            onClick={() => remove(field.name)}
                          >
                            移除
                          </Button>
                        }
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: 16,
                            alignItems: 'start',
                          }}
                        >
                          <Form.Item
                            name={[field.name, 'productCode']}
                            label="产品"
                            rules={[
                              { required: true, message: '请选择授权产品' },
                              {
                                validator: async (_, value) => {
                                  const values =
                                    form.getFieldValue('products') || [];
                                  if (
                                    value &&
                                    values.filter(
                                      (item: { productCode?: string }) =>
                                        item?.productCode === value,
                                    ).length > 1
                                  ) {
                                    throw new Error('不能重复选择同一产品');
                                  }
                                },
                              },
                            ]}
                          >
                            <Select
                              showSearch={{ optionFilterProp: 'label' }}
                              disabled={initializing || isProductSetReadOnly}
                              loading={productsLoading}
                              options={options}
                              placeholder="请选择产品"
                            />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'validFrom']}
                            label="生效时间"
                            rules={[
                              { required: true, message: '请选择生效时间' },
                            ]}
                          >
                            <DatePicker
                              showTime
                              disabled={initializing || isReplacement}
                              format="YYYY-MM-DD HH:mm:ss"
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'permanent']}
                            label="授权期限"
                            valuePropName="checked"
                          >
                            <Switch
                              disabled={initializing || isReplacement}
                              checkedChildren="永久"
                              unCheckedChildren="限时"
                            />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'validUntil']}
                            label="结束时间"
                            dependencies={[
                              ['products', field.name, 'permanent'],
                              ['products', field.name, 'validFrom'],
                            ]}
                            rules={[
                              {
                                validator: async (_, value) => {
                                  const grant = form.getFieldValue([
                                    'products',
                                    field.name,
                                  ]);
                                  if (grant?.permanent !== false) return;
                                  if (!value) {
                                    throw new Error('限时授权必须填写结束时间');
                                  }
                                  if (
                                    grant.validFrom &&
                                    !value.isAfter(grant.validFrom)
                                  ) {
                                    throw new Error('结束时间必须晚于生效时间');
                                  }
                                },
                              },
                            ]}
                          >
                            <DatePicker
                              showTime
                              disabled={
                                initializing || isReplacement || permanent
                              }
                              format="YYYY-MM-DD HH:mm:ss"
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </div>
                      </Card>
                    );
                  })}

                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    disabled={
                      initializing ||
                      isProductSetReadOnly ||
                      fields.length >= productOptions.length
                    }
                    onClick={() =>
                      add({
                        permanent: true,
                        validFrom: dayjs(),
                      })
                    }
                  >
                    增加授权产品
                  </Button>
                  <Form.ErrorList errors={errors} />
                  <Typography.Text type="secondary">
                    每个产品独立设置永久或限时授权；签发后历史记录不可修改。
                  </Typography.Text>
                </Space>
              )}
            </Form.List>
          </Form>
        </Space>
      </Modal>
    </>
  );
};

export default IssueLicenseModal;
