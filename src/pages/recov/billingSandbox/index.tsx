import {
  CalculatorOutlined,
  CheckCircleOutlined,
  LockOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
  RollbackOutlined,
  UndoOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import {
  Button,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RuoyiError } from '@/adapters/ruoyi/response';
import { RecovPage } from '@/pages/recov/components/RecovListLayout';
import {
  type CreditAccount,
  type CreditGrant,
  type CreditLedger,
  type CreditOrder,
  type CreditQuote,
  ensureCreditAccount,
  listCreditGrants,
  listCreditLedgers,
  listCreditOrders,
  quoteCredit,
  rechargeCredit,
  refundCreditOrder,
  releaseCreditOrder,
  reserveCreditOrder,
  saveCreditPricingRule,
  settleCreditOrder,
} from '@/services/ruoyi/credit-billing';

const { Text } = Typography;

type SettlementMode =
  | 'SUCCEEDED'
  | 'PARTIAL_SUCCEEDED'
  | 'NO_RESULT'
  | 'FAILED_USER_INPUT';

type ScenarioCode =
  | 'mock_ai_task.basic'
  | 'contract_review.standard'
  | 'company_search.deep';

type TaskFormValues = {
  businessTaskId: string;
  scenarioCode: ScenarioCode;
  pageCount: number;
  ruleCount: number;
  resultCount: number;
  contactEnrichmentCount: number;
};

type LoadingState = {
  refresh: boolean;
  recharge: boolean;
  quote: boolean;
  reserve: boolean;
  settle: boolean;
  release: boolean;
  refund: boolean;
};

const sandboxBusinessType = 'billing_sandbox';
const pricingVersion = 'sandbox-live-v1';

const scenarioOptions: Array<{
  label: string;
  value: ScenarioCode;
}> = [
  {
    label: 'Mock AI 任务',
    value: 'mock_ai_task.basic',
  },
  {
    label: '合同审查',
    value: 'contract_review.standard',
  },
  {
    label: '海外公司查询',
    value: 'company_search.deep',
  },
];

const settlementModeOptions: Array<{
  label: string;
  value: SettlementMode;
}> = [
  { label: '成功', value: 'SUCCEEDED' },
  { label: '部分成功', value: 'PARTIAL_SUCCEEDED' },
  { label: '无结果', value: 'NO_RESULT' },
  { label: '用户输入失败', value: 'FAILED_USER_INPUT' },
];

const statusTone: Record<string, string> = {
  reserved: 'gold',
  settled: 'green',
  partial_released: 'cyan',
  partial_refunded: 'purple',
  released: 'default',
  refunded: 'purple',
  failed: 'red',
};

const statusText: Record<string, string> = {
  reserved: '已冻结',
  settled: '已结算',
  partial_released: '部分释放',
  partial_refunded: '部分退款',
  released: '已释放',
  refunded: '已退款',
  failed: '失败',
};

const grantTypeText: Record<string, string> = {
  purchase: '购买点',
  trial: '试用点',
  promotion: '活动赠送',
  compensation: '补偿点',
  manual: '手动充值/调整',
  migration: '迁移点',
  test_topup: '测试发放',
  gift: '赠送点',
  paid: '购买点',
};

const ledgerTone: Record<string, string> = {
  grant: 'green',
  reserve: 'gold',
  charge: 'red',
  release: 'cyan',
  expire: 'orange',
  refund: 'purple',
  adjustment: 'blue',
};

const ledgerTypeText: Record<string, string> = {
  grant: '发放',
  reserve: '冻结',
  charge: '扣减',
  release: '释放',
  expire: '过期',
  refund: '退款',
  adjustment: '调整',
};

const directionText: Record<string, string> = {
  in: '入账',
  out: '出账',
  freeze: '冻结',
  unfreeze: '解冻',
};

const accountStatusText: Record<string, string> = {
  active: '正常',
  disabled: '停用',
};

const grantStatusText: Record<string, string> = {
  active: '可用',
  exhausted: '已用尽',
  expired: '已过期',
  disabled: '停用',
};

const ownerTypeText: Record<string, string> = {
  tenant: '租户共享账户',
  user: '用户个人账户',
};

const loadingInitialState: LoadingState = {
  refresh: false,
  recharge: false,
  quote: false,
  reserve: false,
  settle: false,
  release: false,
  refund: false,
};

const createTaskId = () => `billing-sandbox-${Date.now()}`;

const createInitialTaskValues = (): TaskFormValues => ({
  businessTaskId: createTaskId(),
  scenarioCode: 'mock_ai_task.basic',
  pageCount: 12,
  ruleCount: 24,
  resultCount: 20,
  contactEnrichmentCount: 6,
});

const toNumber = (value: unknown) => {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatPoints = (value?: unknown) =>
  `${toNumber(value).toLocaleString('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;

const shortId = (value?: string) => {
  if (!value) return '-';
  return value.length > 10
    ? `${value.slice(0, 6)}...${value.slice(-4)}`
    : value;
};

const formatDate = (value?: string) => value || '-';

const formatDictLabel = (value: unknown, dict: Record<string, string>) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '-';
  const label = dict[raw] || '未知';
  return `${label}（${raw}）`;
};

const renderDictTag = (
  value: unknown,
  dict: Record<string, string>,
  color?: string,
) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '-';
  return <Tag color={color || 'default'}>{formatDictLabel(raw, dict)}</Tag>;
};

const prettyJson = (value?: string) => {
  if (!value) return '-';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

const isFormValidationError = (error: unknown) =>
  !!error && typeof error === 'object' && 'errorFields' in error;

const getScenarioLabel = (scenarioCode?: string) =>
  scenarioOptions.find((item) => item.value === scenarioCode)?.label ||
  scenarioCode ||
  '-';

const normalizeTaskValues = (values: TaskFormValues): TaskFormValues => ({
  businessTaskId: values.businessTaskId,
  scenarioCode: values.scenarioCode,
  pageCount: toNumber(values.pageCount),
  ruleCount: toNumber(values.ruleCount),
  resultCount: toNumber(values.resultCount),
  contactEnrichmentCount: toNumber(values.contactEnrichmentCount),
});

const createQuoteFingerprint = (values: TaskFormValues) =>
  JSON.stringify(normalizeTaskValues(values));

const calculateQuotePoints = (values: TaskFormValues) => {
  if (values.scenarioCode === 'contract_review.standard') {
    return (
      30 +
      Math.max(values.pageCount - 10, 0) * 2 +
      Math.max(values.ruleCount - 20, 0)
    );
  }

  if (values.scenarioCode === 'company_search.deep') {
    return (
      40 +
      Math.max(values.resultCount, 0) * 0.6 +
      Math.max(values.contactEnrichmentCount, 0) * 2
    );
  }

  return (
    20 +
    Math.max(values.pageCount, 0) * 1.5 +
    Math.max(values.ruleCount, 0) * 0.8
  );
};

const calculateFinalPoints = (
  reservedPoints: number,
  values: TaskFormValues,
  mode: SettlementMode,
) => {
  const base = Math.ceil(calculateQuotePoints(values));

  if (mode === 'PARTIAL_SUCCEEDED') {
    return Math.min(reservedPoints, Math.ceil(base * 0.6));
  }

  if (mode === 'NO_RESULT') {
    return Math.min(reservedPoints, 20);
  }

  if (mode === 'FAILED_USER_INPUT') {
    return Math.min(reservedPoints, 8);
  }

  return Math.min(reservedPoints, base);
};

const buildRuleConfig = (values: TaskFormValues, quotePoints: number) =>
  JSON.stringify(
    {
      source: 'billing_sandbox',
      formulaVersion: 'frontend-live-v1',
      estimateFacts: {
        pageCount: values.pageCount,
        ruleCount: values.ruleCount,
        resultCount: values.resultCount,
        contactEnrichmentCount: values.contactEnrichmentCount,
      },
      quotePoints,
    },
    null,
    2,
  );

const buildUsagePayload = (values: TaskFormValues, mode?: SettlementMode) =>
  JSON.stringify(
    {
      source: 'billing_sandbox',
      businessStatus: mode || 'QUOTE',
      usageFacts: {
        pageCount: values.pageCount,
        ruleCount: values.ruleCount,
        resultCount: values.resultCount,
        contactEnrichmentCount: values.contactEnrichmentCount,
      },
    },
    null,
    2,
  );

const BillingSandboxPage = () => {
  const { token } = theme.useToken();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [form] = Form.useForm<TaskFormValues>();
  const initialTaskValues = useMemo(() => createInitialTaskValues(), []);
  const [account, setAccount] = useState<CreditAccount>();
  const [grants, setGrants] = useState<CreditGrant[]>([]);
  const [orders, setOrders] = useState<CreditOrder[]>([]);
  const [ledgers, setLedgers] = useState<CreditLedger[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string>();
  const [lastQuote, setLastQuote] = useState<CreditQuote>();
  const [lastQuoteFingerprint, setLastQuoteFingerprint] = useState<string>();
  const [settlementMode, setSettlementMode] =
    useState<SettlementMode>('SUCCEEDED');
  const [loading, setLoading] = useState<LoadingState>(
    () => loadingInitialState,
  );

  const setLoadingFlag = useCallback(
    (key: keyof LoadingState, value: boolean) => {
      setLoading((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  const showFallbackError = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof RuoyiError || isFormValidationError(error)) return;
      messageApi.error(fallback);
    },
    [messageApi],
  );

  const refreshBillingData = useCallback(
    async (preferredOrderId?: string) => {
      setLoadingFlag('refresh', true);
      try {
        const ensuredAccount = await ensureCreditAccount({
          ownerType: 'tenant',
        });
        const accountId = ensuredAccount?.id;
        const [grantRows, orderRows, ledgerRows] = await Promise.all([
          listCreditGrants({ accountId }),
          listCreditOrders({
            accountId,
            businessType: sandboxBusinessType,
          }),
          listCreditLedgers({ accountId }),
        ]);

        setAccount(ensuredAccount);
        setGrants(grantRows || []);
        setOrders(orderRows || []);
        setLedgers(ledgerRows || []);
        setActiveOrderId((current) => {
          if (preferredOrderId) return preferredOrderId;
          if (current && orderRows?.some((item) => item.id === current)) {
            return current;
          }
          return orderRows?.[0]?.id;
        });
      } catch (error) {
        showFallbackError(error, '加载积分计费数据失败');
      } finally {
        setLoadingFlag('refresh', false);
      }
    },
    [setLoadingFlag, showFallbackError],
  );

  useEffect(() => {
    void refreshBillingData();
  }, [refreshBillingData]);

  const activeOrder = useMemo(
    () => orders.find((item) => item.id === activeOrderId) ?? orders[0],
    [activeOrderId, orders],
  );

  const watchedValues =
    (Form.useWatch([], form) as TaskFormValues | undefined) ??
    initialTaskValues;
  const normalizedWatchedValues = normalizeTaskValues(watchedValues);

  const quotePreview = useMemo(
    () => Math.ceil(calculateQuotePoints(normalizedWatchedValues)),
    [normalizedWatchedValues],
  );

  const maxPreview = useMemo(
    () => Math.ceil(quotePreview * 1.25),
    [quotePreview],
  );

  const currentQuoteFingerprint = useMemo(
    () => createQuoteFingerprint(normalizedWatchedValues),
    [normalizedWatchedValues],
  );

  const quoteStale =
    !!lastQuote && lastQuoteFingerprint !== currentQuoteFingerprint;

  const ensureSandboxPricingRule = async (values: TaskFormValues) => {
    const quotePoints = Math.ceil(calculateQuotePoints(values));
    await saveCreditPricingRule({
      businessType: sandboxBusinessType,
      scenarioCode: values.scenarioCode,
      pricingVersion,
      ruleName: `${getScenarioLabel(values.scenarioCode)}沙盘规则`,
      ruleType: 'fixed',
      fixedPoints: quotePoints,
      minPoints: 0,
      maxPoints: Math.ceil(quotePoints * 1.25),
      ruleConfig: buildRuleConfig(values, quotePoints),
      status: 'active',
    });
    return quotePoints;
  };

  const handleRecharge = async () => {
    setLoadingFlag('recharge', true);
    try {
      const sourceId = `billing-sandbox-recharge-${Date.now()}`;
      const grant = await rechargeCredit({
        ownerType: 'tenant',
        grantType: 'manual',
        sourceType: 'billing_sandbox_recharge',
        sourceId,
        points: 100,
        consumePriority: 20,
        remark: '沙盘手动充值',
      });
      await refreshBillingData();
      messageApi.success(`已充值 ${formatPoints(grant?.totalPoints)} 点`);
    } catch (error) {
      showFallbackError(error, '充值点数失败');
    } finally {
      setLoadingFlag('recharge', false);
    }
  };

  const handleQuote = async () => {
    setLoadingFlag('quote', true);
    try {
      const values = normalizeTaskValues(await form.validateFields());
      await ensureSandboxPricingRule(values);
      const quote = await quoteCredit({
        businessType: sandboxBusinessType,
        scenarioCode: values.scenarioCode,
        pricingVersion,
        usageAmount: 1,
        usagePayload: buildUsagePayload(values),
      });

      setLastQuote(quote);
      setLastQuoteFingerprint(createQuoteFingerprint(values));
      messageApi.success('报价已生成');
    } catch (error) {
      showFallbackError(error, '报价失败');
    } finally {
      setLoadingFlag('quote', false);
    }
  };

  const handleReserve = async () => {
    if (!lastQuote || quoteStale) return;
    setLoadingFlag('reserve', true);
    try {
      const values = normalizeTaskValues(await form.validateFields());
      await ensureSandboxPricingRule(values);
      const order = await reserveCreditOrder({
        ownerType: 'tenant',
        businessType: sandboxBusinessType,
        businessTaskId: values.businessTaskId,
        scenarioCode: values.scenarioCode,
        pricingVersion,
        usageAmount: 1,
        maxPoints: Math.ceil(toNumber(lastQuote.maxPoints || maxPreview)),
        idempotencyKey: `billing-sandbox:reserve:${values.businessTaskId}`,
        usagePayload: buildUsagePayload(values),
      });

      await refreshBillingData(order?.id);
      messageApi.success('冻结成功');
    } catch (error) {
      showFallbackError(error, '冻结失败');
    } finally {
      setLoadingFlag('reserve', false);
    }
  };

  const settleOrder = async (repeated = false) => {
    if (!activeOrder?.id) return;
    setLoadingFlag('settle', true);
    try {
      const values = normalizeTaskValues(await form.validateFields());
      const finalPoints = calculateFinalPoints(
        toNumber(activeOrder.reservedPoints),
        values,
        settlementMode,
      );
      const order = await settleCreditOrder({
        chargeOrderId: activeOrder.id,
        finalPoints,
        idempotencyKey: `billing-sandbox:settle:${activeOrder.id}`,
        usagePayload: buildUsagePayload(values, settlementMode),
      });

      await refreshBillingData(order?.id || activeOrder.id);
      messageApi.success(repeated ? '重复回调已返回' : '结算成功');
    } catch (error) {
      showFallbackError(error, repeated ? '重复回调失败' : '结算失败');
    } finally {
      setLoadingFlag('settle', false);
    }
  };

  const handleRelease = async () => {
    if (!activeOrder?.id) return;
    setLoadingFlag('release', true);
    try {
      const order = await releaseCreditOrder({
        chargeOrderId: activeOrder.id,
        idempotencyKey: `billing-sandbox:release:${activeOrder.id}`,
        reason: '沙盘释放冻结点数',
      });

      await refreshBillingData(order?.id || activeOrder.id);
      messageApi.success('释放成功');
    } catch (error) {
      showFallbackError(error, '释放失败');
    } finally {
      setLoadingFlag('release', false);
    }
  };

  const handleRefund = async () => {
    if (!activeOrder?.id) return;
    const refundPoints = Math.max(
      toNumber(activeOrder.finalPoints) - toNumber(activeOrder.refundedPoints),
      0,
    );
    if (refundPoints <= 0) return;

    setLoadingFlag('refund', true);
    try {
      const order = await refundCreditOrder({
        chargeOrderId: activeOrder.id,
        refundPoints,
        idempotencyKey: `billing-sandbox:refund:${
          activeOrder.id
        }:${toNumber(activeOrder.refundedPoints).toFixed(4)}`,
        reason: '沙盘任务退款',
        usagePayload: JSON.stringify(
          {
            source: 'billing_sandbox',
            businessStatus: 'REFUND',
            refundPoints,
          },
          null,
          2,
        ),
      });

      await refreshBillingData(order?.id || activeOrder.id);
      messageApi.success(`已退款 ${formatPoints(refundPoints)} 点`);
    } catch (error) {
      showFallbackError(error, '退款失败');
    } finally {
      setLoadingFlag('refund', false);
    }
  };

  const handleNewTask = () => {
    form.setFieldsValue({
      ...form.getFieldsValue(),
      businessTaskId: createTaskId(),
    });
    setLastQuote(undefined);
    setLastQuoteFingerprint(undefined);
  };

  const grantColumns: ColumnsType<CreditGrant> = [
    {
      title: '批次',
      dataIndex: 'id',
      width: 150,
      render: (value) => <Text code>{shortId(String(value || ''))}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'grantType',
      width: 170,
      render: (value) => renderDictTag(value, grantTypeText, 'green'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 150,
      render: (value) =>
        renderDictTag(
          value,
          grantStatusText,
          String(value || '') === 'active' ? 'green' : 'default',
        ),
    },
    {
      title: '剩余',
      dataIndex: 'remainingPoints',
      align: 'right',
      width: 100,
      render: formatPoints,
    },
    {
      title: '冻结',
      dataIndex: 'frozenPoints',
      align: 'right',
      width: 100,
      render: formatPoints,
    },
    {
      title: '已扣',
      dataIndex: 'chargedPoints',
      align: 'right',
      width: 100,
      render: formatPoints,
    },
    {
      title: '优先级',
      dataIndex: 'consumePriority',
      width: 90,
    },
    {
      title: '过期时间',
      dataIndex: 'expiresAt',
      width: 180,
      render: formatDate,
    },
  ];

  const orderColumns: ColumnsType<CreditOrder> = [
    {
      title: '计费单',
      dataIndex: 'id',
      width: 150,
      render: (value) => <Text code>{shortId(String(value || ''))}</Text>,
    },
    {
      title: '业务任务',
      dataIndex: 'businessTaskId',
      width: 210,
      ellipsis: true,
    },
    {
      title: '场景',
      dataIndex: 'scenarioCode',
      width: 150,
      render: (value) => getScenarioLabel(String(value || '')),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 150,
      render: (value) => {
        const status = String(value || '');
        return renderDictTag(status, statusText, statusTone[status]);
      },
    },
    {
      title: '报价',
      dataIndex: 'quotePoints',
      align: 'right',
      width: 90,
      render: formatPoints,
    },
    {
      title: '冻结',
      dataIndex: 'reservedPoints',
      align: 'right',
      width: 90,
      render: formatPoints,
    },
    {
      title: '实扣',
      dataIndex: 'finalPoints',
      align: 'right',
      width: 90,
      render: formatPoints,
    },
    {
      title: '释放',
      dataIndex: 'releasedPoints',
      align: 'right',
      width: 90,
      render: formatPoints,
    },
    {
      title: '已退',
      dataIndex: 'refundedPoints',
      align: 'right',
      width: 90,
      render: formatPoints,
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      width: 180,
      render: formatDate,
    },
  ];

  const ledgerColumns: ColumnsType<CreditLedger> = [
    {
      title: '流水',
      dataIndex: 'id',
      width: 150,
      render: (value) => <Text code>{shortId(String(value || ''))}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'ledgerType',
      width: 140,
      render: (value) => {
        const ledgerType = String(value || '');
        return renderDictTag(
          ledgerType,
          ledgerTypeText,
          ledgerTone[ledgerType],
        );
      },
    },
    {
      title: '方向',
      dataIndex: 'direction',
      width: 130,
      render: (value) => renderDictTag(value, directionText),
    },
    {
      title: '点数',
      dataIndex: 'points',
      align: 'right',
      width: 100,
      render: formatPoints,
    },
    {
      title: '可用后',
      dataIndex: 'availableAfter',
      align: 'right',
      width: 100,
      render: formatPoints,
    },
    {
      title: '冻结后',
      dataIndex: 'frozenAfter',
      align: 'right',
      width: 100,
      render: formatPoints,
    },
    {
      title: '计费单',
      dataIndex: 'chargeOrderId',
      width: 150,
      render: (value) => <Text code>{shortId(String(value || ''))}</Text>,
    },
    {
      title: '幂等键',
      dataIndex: 'idempotencyKey',
      width: 250,
      ellipsis: true,
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      width: 180,
      render: formatDate,
    },
  ];

  const currentStatus = String(activeOrder?.status || '');
  const canSettle = currentStatus === 'reserved';
  const canRelease = currentStatus === 'reserved';
  const refundablePoints = Math.max(
    toNumber(activeOrder?.finalPoints) - toNumber(activeOrder?.refundedPoints),
    0,
  );
  const canRefund =
    !!activeOrder?.id &&
    refundablePoints > 0 &&
    ['settled', 'partial_released', 'partial_refunded'].includes(currentStatus);
  const canReplayCallback =
    !!activeOrder?.id &&
    [
      'settled',
      'partial_released',
      'partial_refunded',
      'refunded',
      'released',
    ].includes(currentStatus);

  return (
    <RecovPage breadcrumbRender={false} title="积分计费沙盘">
      {messageContextHolder}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <ProCard>
            <Statistic
              title={`可用点数 · ${formatDictLabel(
                account?.ownerType || 'tenant',
                ownerTypeText,
              )}`}
              value={formatPoints(account?.availablePoints)}
              prefix={<WalletOutlined style={{ color: token.colorSuccess }} />}
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <ProCard>
            <Statistic
              title="冻结点数"
              value={formatPoints(account?.frozenPoints)}
              prefix={<LockOutlined style={{ color: token.colorWarning }} />}
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <ProCard>
            <Statistic
              title="累计发放"
              value={formatPoints(account?.totalGrantedPoints)}
              prefix={<PlusCircleOutlined style={{ color: token.colorInfo }} />}
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <ProCard>
            <Statistic
              title="累计扣减"
              value={formatPoints(account?.totalChargedPoints)}
              prefix={
                <CalculatorOutlined style={{ color: token.colorError }} />
              }
            />
          </ProCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} xl={10}>
          <ProCard
            title="任务参数"
            extra={
              <Space wrap>
                <Button
                  icon={<PlusCircleOutlined />}
                  loading={loading.recharge}
                  onClick={handleRecharge}
                >
                  充值100点
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  loading={loading.refresh}
                  onClick={() => refreshBillingData()}
                >
                  刷新
                </Button>
              </Space>
            }
          >
            <Form<TaskFormValues>
              form={form}
              layout="vertical"
              initialValues={initialTaskValues}
            >
              <Form.Item
                label="业务任务ID"
                name="businessTaskId"
                rules={[{ required: true, message: '请输入业务任务ID' }]}
              >
                <Input
                  addonAfter={
                    <Button type="link" size="small" onClick={handleNewTask}>
                      换一个
                    </Button>
                  }
                />
              </Form.Item>
              <Form.Item
                label="计费场景"
                name="scenarioCode"
                rules={[{ required: true, message: '请选择计费场景' }]}
              >
                <Segmented block options={scenarioOptions} />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="页数" name="pageCount">
                    <InputNumber min={0} precision={0} className="w-full" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="规则数" name="ruleCount">
                    <InputNumber min={0} precision={0} className="w-full" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="结果数" name="resultCount">
                    <InputNumber min={0} precision={0} className="w-full" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="联系人补全数" name="contactEnrichmentCount">
                    <InputNumber min={0} precision={0} className="w-full" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
            <ProCard split="vertical" className="mt-2">
              <ProCard>
                <Statistic
                  title="前端预估"
                  value={formatPoints(quotePreview)}
                />
              </ProCard>
              <ProCard>
                <Statistic title="冻结上限" value={formatPoints(maxPreview)} />
              </ProCard>
            </ProCard>
            <Space wrap className="mt-4">
              <Button
                type="primary"
                icon={<CalculatorOutlined />}
                loading={loading.quote}
                onClick={handleQuote}
              >
                报价
              </Button>
              <Button
                icon={<LockOutlined />}
                loading={loading.reserve}
                disabled={!lastQuote || quoteStale}
                onClick={handleReserve}
              >
                冻结
              </Button>
            </Space>
            {lastQuote ? (
              <Descriptions className="mt-4" size="small" bordered column={1}>
                <Descriptions.Item label="后端报价">
                  {formatPoints(lastQuote.quotePoints)}
                </Descriptions.Item>
                <Descriptions.Item label="定价规则">
                  <Text code>{shortId(lastQuote.pricingRuleId)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="规则版本">
                  {lastQuote.pricingVersion || pricingVersion}
                </Descriptions.Item>
              </Descriptions>
            ) : null}
          </ProCard>
        </Col>

        <Col xs={24} xl={14}>
          <ProCard title="订单回调">
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="当前计费单">
                    <Text code>{shortId(activeOrder?.id)}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="任务ID">
                    {activeOrder?.businessTaskId || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    {currentStatus
                      ? renderDictTag(
                          currentStatus,
                          statusText,
                          statusTone[currentStatus],
                        )
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="账户状态">
                    {renderDictTag(
                      account?.status || 'active',
                      accountStatusText,
                      account?.status === 'disabled' ? 'default' : 'green',
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="报价点数">
                    {formatPoints(activeOrder?.quotePoints)}
                  </Descriptions.Item>
                  <Descriptions.Item label="冻结点数">
                    {formatPoints(activeOrder?.reservedPoints)}
                  </Descriptions.Item>
                  <Descriptions.Item label="实扣点数">
                    {formatPoints(activeOrder?.finalPoints)}
                  </Descriptions.Item>
                  <Descriptions.Item label="释放点数">
                    {formatPoints(activeOrder?.releasedPoints)}
                  </Descriptions.Item>
                  <Descriptions.Item label="已退款点数">
                    {formatPoints(activeOrder?.refundedPoints)}
                  </Descriptions.Item>
                  <Descriptions.Item label="可退款点数">
                    {formatPoints(refundablePoints)}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
              <Col xs={24} lg={12}>
                <div className="mb-3">
                  <Text strong>业务结果</Text>
                </div>
                <Segmented
                  block
                  options={settlementModeOptions}
                  value={settlementMode}
                  onChange={(value) =>
                    setSettlementMode(value as SettlementMode)
                  }
                />
                <Space wrap className="mt-4">
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    loading={loading.settle}
                    disabled={!canSettle}
                    onClick={() => settleOrder(false)}
                  >
                    结算
                  </Button>
                  <Button
                    disabled={!canReplayCallback}
                    loading={loading.settle}
                    onClick={() => settleOrder(true)}
                  >
                    重复回调
                  </Button>
                  <Button
                    icon={<RollbackOutlined />}
                    loading={loading.release}
                    disabled={!canRelease}
                    onClick={handleRelease}
                  >
                    释放
                  </Button>
                  <Button
                    icon={<UndoOutlined />}
                    loading={loading.refund}
                    disabled={!canRefund}
                    onClick={handleRefund}
                  >
                    任务退款
                  </Button>
                </Space>
              </Col>
            </Row>
            <Row gutter={[16, 16]} className="mt-4">
              <Col xs={24} lg={12}>
                <Text strong>报价快照</Text>
                <pre
                  className="mt-2"
                  style={{
                    background: token.colorFillAlter,
                    borderRadius: token.borderRadius,
                    maxHeight: 220,
                    overflow: 'auto',
                    padding: token.paddingSM,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {prettyJson(
                    activeOrder?.quoteSnapshot || lastQuote?.quoteSnapshot,
                  )}
                </pre>
              </Col>
              <Col xs={24} lg={12}>
                <Text strong>用量快照</Text>
                <pre
                  className="mt-2"
                  style={{
                    background: token.colorFillAlter,
                    borderRadius: token.borderRadius,
                    maxHeight: 220,
                    overflow: 'auto',
                    padding: token.paddingSM,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {prettyJson(activeOrder?.usageSnapshot)}
                </pre>
              </Col>
            </Row>
          </ProCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} xl={10}>
          <ProCard title="授予批次">
            <Table<CreditGrant>
              rowKey={(record) => String(record.id)}
              size="middle"
              pagination={false}
              columns={grantColumns}
              dataSource={grants}
              loading={loading.refresh}
              scroll={{ x: 820 }}
            />
          </ProCard>
        </Col>
        <Col xs={24} xl={14}>
          <ProCard title="计费单">
            <Table<CreditOrder>
              rowKey={(record) => String(record.id)}
              size="middle"
              pagination={false}
              columns={orderColumns}
              dataSource={orders}
              loading={loading.refresh}
              rowClassName={(record) =>
                record.id === activeOrder?.id ? 'ant-table-row-selected' : ''
              }
              onRow={(record) => ({
                onClick: () => setActiveOrderId(record.id),
              })}
              scroll={{ x: 1160 }}
            />
          </ProCard>
        </Col>
      </Row>

      <ProCard title="积分流水" className="mt-4">
        <Table<CreditLedger>
          rowKey={(record) => String(record.id)}
          size="middle"
          pagination={{ pageSize: 6, showSizeChanger: false }}
          columns={ledgerColumns}
          dataSource={ledgers}
          loading={loading.refresh}
          scroll={{ x: 1320 }}
        />
      </ProCard>
    </RecovPage>
  );
};

export default BillingSandboxPage;
