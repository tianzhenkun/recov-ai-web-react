import {
  ClockCircleOutlined,
  CrownOutlined,
  GiftOutlined,
  HistoryOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  QRCode,
  Result,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PermissionButton, usePermission } from '@/components/Permission';
import {
  type CreditAccount,
  type CreditCoupon,
  type CreditCouponTemplate,
  type CreditEntitlements,
  type CreditGrant,
  type CreditLedger,
  type CreditPackage,
  type CreditPackageOrder,
  claimScopedCreditCoupon,
  createScopedCreditPackageOrder,
  getScopedCreditAccount,
  getScopedCreditEntitlements,
  getScopedCreditPackageOrder,
  listScopedClaimableCouponTemplates,
  listScopedCreditCoupons,
  listScopedCreditGrants,
  listScopedCreditPackages,
  pageScopedCreditCoupons,
  pageScopedCreditLedgers,
  pageScopedCreditPackageOrders,
  retryScopedCreditPackagePayment,
} from '@/services/ruoyi/credit-billing';
import {
  canRetryPackagePayment,
  getExpiryRefreshDelay,
  PACKAGE_ORDER_POLL_INTERVAL_MS,
  shouldPollPackageOrder,
} from '../polling';
import {
  accountStatusText,
  accountStatusTone,
  billingPermissions,
  couponStatusText,
  couponStatusTone,
  describePackageTerm,
  directionText,
  formatAmount,
  formatDate,
  formatPoints,
  getErrorMessage,
  grantStatusText,
  ledgerTone,
  ledgerTypeText,
  packageKindText,
  payStatusText,
  payStatusTone,
  renderCodeId,
  renderDictTag,
  shortId,
  toNumber,
} from '../shared';
import {
  type CreditWorkspaceScope,
  type CreditWorkspaceTab,
  getCreditWorkspaceTabLabels,
  getCreditWorkspaceTitle,
} from './creditWorkspaceCopy';
import { usePurchaseIntentIdempotency } from './usePurchaseIntentIdempotency';

const { Text } = Typography;

const creditGrantField = <K extends keyof CreditGrant>(field: K): K => field;

type CreditWorkspaceProps = {
  scope: CreditWorkspaceScope;
  initialTab?: CreditWorkspaceTab;
  title?: string;
};

type PurchaseFormValues = {
  productCode: string;
  couponId?: string;
  remark?: string;
};

const scopePermissions = {
  tenant: {
    account: billingPermissions.tenantAccountView,
    packages: billingPermissions.tenantPackageList,
    purchase: billingPermissions.tenantPackagePurchase,
    orders: billingPermissions.tenantOrderList,
    coupons: billingPermissions.tenantCouponList,
    claim: billingPermissions.tenantCouponClaim,
    ledgers: billingPermissions.tenantLedgerList,
  },
  me: {
    account: billingPermissions.meAccountView,
    packages: billingPermissions.mePackageList,
    purchase: billingPermissions.mePackagePurchase,
    orders: billingPermissions.meOrderList,
    coupons: billingPermissions.meCouponList,
    claim: billingPermissions.meCouponClaim,
    ledgers: billingPermissions.meLedgerList,
  },
} as const;

const metricIconStyle = (color: string, background: string) => ({
  alignItems: 'center',
  background,
  borderRadius: 10,
  color,
  display: 'inline-flex',
  fontSize: 18,
  height: 36,
  justifyContent: 'center',
  marginRight: 10,
  width: 36,
});

const packageOwnerMatchesScope = (
  scope: CreditWorkspaceScope,
  record: CreditPackage,
) =>
  scope === 'tenant'
    ? record.ownerScope === 'TENANT'
    : record.ownerScope === 'USER';

const packageStatus = (record: CreditPackage) => String(record.status || '');

const orderStatus = (record?: CreditPackageOrder) =>
  String(record?.payStatus || '');

const orderPaymentCodeUrl = (record?: CreditPackageOrder) =>
  record?.paymentCodeUrl;

const orderPackageName = (record?: CreditPackageOrder) =>
  record?.packageNameSnapshot || `套餐 ${shortId(record?.packageId)}`;

const orderPackageKind = (record?: CreditPackageOrder) =>
  record?.packageKindSnapshot;

const isPaymentBusinessCallbackPending = (record?: CreditPackageOrder) =>
  orderStatus(record) === 'PENDING_PAYMENT' &&
  record?.paymentStatus === 'SUCCESS';

const couponDescription = (coupon: CreditCoupon | CreditCouponTemplate) => {
  if (coupon.couponType === 'PERCENT_OFF') {
    return `${toNumber(coupon.discountRate)} 折`;
  }
  return `立减 ${formatAmount(coupon.discountAmount)}`;
};

const isCouponUsable = (coupon: CreditCoupon) => coupon.status === 'UNUSED';

export const CreditWorkspace = ({
  scope,
  initialTab = 'overview',
  title,
}: CreditWorkspaceProps) => {
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const { token } = theme.useToken();
  const { canAccess } = usePermission();
  const [purchaseForm] = Form.useForm<PurchaseFormValues>();
  const purchaseIntentIdempotency = usePurchaseIntentIdempotency();
  const permissions = scopePermissions[scope];

  const [activeTab, setActiveTab] = useState<CreditWorkspaceTab>(initialTab);
  const [account, setAccount] = useState<CreditAccount>();
  const [entitlements, setEntitlements] = useState<CreditEntitlements>();
  const [grants, setGrants] = useState<CreditGrant[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [orders, setOrders] = useState<CreditPackageOrder[]>([]);
  const [coupons, setCoupons] = useState<CreditCoupon[]>([]);
  const [purchaseCoupons, setPurchaseCoupons] = useState<CreditCoupon[]>([]);
  const [claimableTemplates, setClaimableTemplates] = useState<
    CreditCouponTemplate[]
  >([]);
  const [ledgers, setLedgers] = useState<CreditLedger[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage>();
  const [selectedOrder, setSelectedOrder] = useState<CreditPackageOrder>();
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [claimingId, setClaimingId] = useState<string>();
  const [orderPage, setOrderPage] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [couponPage, setCouponPage] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [ledgerPage, setLedgerPage] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const rawTenantId = (
    initialState?.currentUser?.rawUser as { tenantId?: string } | undefined
  )?.tenantId;
  const tenantContextKey = `${initialState?.dynamicTenantId || rawTenantId || 'default'}:${initialState?.tenantSwitchVersion || 0}`;

  useEffect(() => setActiveTab(initialTab), [initialTab]);

  const loadAccount = useCallback(async () => {
    if (!canAccess({ permissions: permissions.account })) return;
    const [nextAccount, nextGrants, nextEntitlements] = await Promise.all([
      getScopedCreditAccount(scope),
      listScopedCreditGrants(scope),
      getScopedCreditEntitlements(scope),
    ]);
    setAccount(nextAccount);
    setGrants(nextGrants);
    setEntitlements(nextEntitlements);
  }, [canAccess, permissions.account, scope]);

  const loadPackages = useCallback(async () => {
    if (!canAccess({ permissions: permissions.packages })) return;
    const rows = await listScopedCreditPackages(scope);
    setPackages(rows.filter((item) => packageOwnerMatchesScope(scope, item)));
  }, [canAccess, permissions.packages, scope]);

  const loadOrders = useCallback(
    async (pageNum = 1, pageSize = 10) => {
      if (!canAccess({ permissions: permissions.orders })) return;
      const result = await pageScopedCreditPackageOrders(scope, {
        pageNum,
        pageSize,
      });
      setOrders(result.rows);
      setOrderPage({ current: pageNum, pageSize, total: result.total });
    },
    [canAccess, permissions.orders, scope],
  );

  const loadCoupons = useCallback(
    async (pageNum = 1, pageSize = 10) => {
      if (!canAccess({ permissions: permissions.coupons })) return;
      const [owned, claimable] = await Promise.all([
        pageScopedCreditCoupons(scope, { pageNum, pageSize }),
        listScopedClaimableCouponTemplates(scope),
      ]);
      setCoupons(owned.rows);
      setCouponPage({ current: pageNum, pageSize, total: owned.total });
      setClaimableTemplates(claimable);
    },
    [canAccess, permissions.coupons, scope],
  );

  const loadLedgers = useCallback(
    async (pageNum = 1, pageSize = 10) => {
      if (!canAccess({ permissions: permissions.ledgers })) return;
      const result = await pageScopedCreditLedgers(scope, {
        pageNum,
        pageSize,
      });
      setLedgers(result.rows);
      setLedgerPage({ current: pageNum, pageSize, total: result.total });
    },
    [canAccess, permissions.ledgers, scope],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAccount(),
        loadPackages(),
        loadOrders(1, 10),
        loadCoupons(1, 10),
        loadLedgers(1, 10),
      ]);
    } catch (error) {
      message.error(getErrorMessage(error, '加载信用点数据失败'));
    } finally {
      setLoading(false);
    }
  }, [
    loadAccount,
    loadCoupons,
    loadLedgers,
    loadOrders,
    loadPackages,
    message,
  ]);

  useEffect(() => {
    setAccount(undefined);
    setEntitlements(undefined);
    setGrants([]);
    setPackages([]);
    setOrders([]);
    setCoupons([]);
    setPurchaseCoupons([]);
    setClaimableTemplates([]);
    setLedgers([]);
    setOrderPage({ current: 1, pageSize: 10, total: 0 });
    setCouponPage({ current: 1, pageSize: 10, total: 0 });
    setLedgerPage({ current: 1, pageSize: 10, total: 0 });
    void refresh();
  }, [refresh, tenantContextKey]);

  const pollSelectedOrder = useCallback(async () => {
    if (!selectedOrder?.id) return;
    try {
      const next = await getScopedCreditPackageOrder(scope, selectedOrder.id);
      setSelectedOrder(next);
      setOrders((current) =>
        current.map((item) => (item.id === next.id ? next : item)),
      );
      if (!shouldPollPackageOrder(next)) {
        await Promise.all([
          loadAccount(),
          loadCoupons(couponPage.current, couponPage.pageSize),
          loadLedgers(ledgerPage.current, ledgerPage.pageSize),
        ]);
      }
    } catch (error) {
      message.error(getErrorMessage(error, '刷新支付状态失败'));
    }
  }, [
    loadAccount,
    loadCoupons,
    loadLedgers,
    message,
    scope,
    selectedOrder?.id,
    couponPage.current,
    couponPage.pageSize,
    ledgerPage.current,
    ledgerPage.pageSize,
  ]);

  useEffect(() => {
    if (!orderOpen || !shouldPollPackageOrder(selectedOrder)) return undefined;
    const timer = window.setInterval(
      () => void pollSelectedOrder(),
      PACKAGE_ORDER_POLL_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [orderOpen, pollSelectedOrder, selectedOrder]);

  const openPurchase = async (record: CreditPackage) => {
    purchaseIntentIdempotency.start();
    setSelectedPackage(record);
    purchaseForm.resetFields();
    if (record.products?.length === 1 && record.products[0]?.productCode) {
      purchaseForm.setFieldValue('productCode', record.products[0].productCode);
    }
    setPurchaseOpen(true);
    if (!canAccess({ permissions: permissions.coupons })) {
      setPurchaseCoupons([]);
      return;
    }
    try {
      setPurchaseCoupons(
        await listScopedCreditCoupons(scope, {
          packageId: record.id,
          status: 'UNUSED',
          pageNum: 1,
          pageSize: 100,
        }),
      );
    } catch (error) {
      message.error(getErrorMessage(error, '加载可用优惠券失败'));
    }
  };

  const submitPurchase = async () => {
    if (!selectedPackage?.id) return;
    const values = await purchaseForm.validateFields();
    setSubmitting(true);
    try {
      const order = await createScopedCreditPackageOrder(scope, {
        packageId: selectedPackage.id,
        productCode: values.productCode,
        idempotencyKey: purchaseIntentIdempotency.current(),
        couponId:
          values.couponId && values.couponId !== 'none'
            ? values.couponId
            : undefined,
        remark: values.remark,
      });
      purchaseIntentIdempotency.finish();
      setPurchaseOpen(false);
      setSelectedOrder(order);
      setOrderOpen(true);
      await loadOrders(orderPage.current, orderPage.pageSize);
      message.success('订单已创建');
    } catch (error) {
      purchaseIntentIdempotency.markFailed();
      message.error(getErrorMessage(error, '创建套餐订单失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const claimCoupon = async (template: CreditCouponTemplate) => {
    if (!template.id) return;
    setClaimingId(template.id);
    try {
      await claimScopedCreditCoupon(scope, template.id);
      await loadCoupons(couponPage.current, couponPage.pageSize);
      message.success('优惠券领取成功');
    } catch (error) {
      message.error(getErrorMessage(error, '优惠券领取失败'));
    } finally {
      setClaimingId(undefined);
    }
  };

  const openOrder = async (record: CreditPackageOrder) => {
    setSelectedOrder(record);
    setOrderOpen(true);
    if (!record.id) return;
    try {
      setSelectedOrder(await getScopedCreditPackageOrder(scope, record.id));
    } catch (error) {
      message.error(getErrorMessage(error, '加载订单详情失败'));
    }
  };

  const retryPayment = async () => {
    if (!selectedOrder?.id) return;
    setSubmitting(true);
    try {
      const next = await retryScopedCreditPackagePayment(
        scope,
        selectedOrder.id,
      );
      setSelectedOrder(next);
      setOrders((current) =>
        current.map((item) => (item.id === next.id ? next : item)),
      );
      message.success('支付二维码已刷新');
    } catch (error) {
      message.error(getErrorMessage(error, '重新发起支付失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const outstandingPoints = toNumber(account?.outstandingPoints);
  const accountDisabled = account?.status === 'DISABLED';
  const purchaseBlocked =
    outstandingPoints > 0 ||
    account?.status === 'ARREARS_BLOCKED' ||
    accountDisabled;
  const activeGrants = useMemo(() => {
    const now = Date.now();
    return grants.filter((grant) => {
      if (
        grant.status !== 'AVAILABLE' ||
        toNumber(grant.remainingPoints) <= 0
      ) {
        return false;
      }
      if (!grant.expiresAt) return true;
      const expiresAt = new Date(grant.expiresAt).getTime();
      return Number.isFinite(expiresAt) && expiresAt > now;
    });
  }, [grants]);
  const expiringGrants = useMemo(() => {
    const now = Date.now();
    const deadline = now + 30 * 24 * 60 * 60 * 1000;
    return activeGrants.filter((grant) => {
      if (!grant.expiresAt) return false;
      const expiresAt = new Date(grant.expiresAt).getTime();
      return (
        Number.isFinite(expiresAt) && expiresAt >= now && expiresAt <= deadline
      );
    });
  }, [activeGrants]);
  const expiringPoints = expiringGrants.reduce(
    (sum, grant) => sum + toNumber(grant.remainingPoints),
    0,
  );
  const nextAvailableGrantExpiry = activeGrants
    .map((grant) => grant.expiresAt)
    .filter((value): value is string => Boolean(value))
    .sort(
      (left, right) => new Date(left).getTime() - new Date(right).getTime(),
    )[0];
  const activeTermEntitlementGroups = useMemo(() => {
    const now = Date.now();
    return (entitlements?.products || [])
      .map((product) => ({
        ...product,
        termPackages: (product.termPackages || []).filter((item) => {
          if (
            !['AVAILABLE', 'EXHAUSTED'].includes(String(item.status)) ||
            !item.expiresAt
          ) {
            return false;
          }
          const expiresAt = new Date(item.expiresAt).getTime();
          return Number.isFinite(expiresAt) && expiresAt > now;
        }),
      }))
      .filter((product) => product.termPackages.length > 0);
  }, [entitlements]);
  const effectiveEntitlementCount =
    activeGrants.filter((grant) => grant.packageKind === 'FIXED_POINTS')
      .length +
    activeTermEntitlementGroups.reduce(
      (count, product) => count + product.termPackages.length,
      0,
    );
  const nearestEntitlementExpiry = activeTermEntitlementGroups
    .flatMap((product) => product.termPackages)
    .map((item) => item.expiresAt)
    .filter((value): value is string => Boolean(value))
    .sort(
      (left, right) => new Date(left).getTime() - new Date(right).getTime(),
    )[0];
  const nextExpiry = [nextAvailableGrantExpiry, nearestEntitlementExpiry]
    .filter((value): value is string => Boolean(value))
    .sort(
      (left, right) => new Date(left).getTime() - new Date(right).getTime(),
    )[0];

  useEffect(() => {
    if (!nearestEntitlementExpiry) return undefined;
    let timer: number | undefined;
    let cancelled = false;
    const refreshExpiredEntitlements = () => {
      void loadAccount().catch((error) => {
        message.error(getErrorMessage(error, '刷新到期权益失败'));
      });
    };

    const scheduleRefresh = () => {
      const delay = getExpiryRefreshDelay(nearestEntitlementExpiry);
      if (delay === undefined || cancelled) return;
      if (delay === 0) {
        refreshExpiredEntitlements();
        return;
      }
      timer = window.setTimeout(() => {
        if (cancelled) return;
        const nextDelay = getExpiryRefreshDelay(nearestEntitlementExpiry);
        if (nextDelay === 0) {
          refreshExpiredEntitlements();
          return;
        }
        scheduleRefresh();
      }, delay);
    };

    scheduleRefresh();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [loadAccount, message, nearestEntitlementExpiry]);
  const tabLabels = getCreditWorkspaceTabLabels(scope);

  const visibleTabKeys = useMemo(() => {
    const keys = new Set<CreditWorkspaceTab>();
    if (canAccess({ permissions: permissions.account })) {
      keys.add('overview');
      keys.add('grants');
    }
    if (canAccess({ permissions: permissions.packages })) keys.add('packages');
    if (canAccess({ permissions: permissions.orders })) keys.add('orders');
    if (canAccess({ permissions: permissions.coupons })) keys.add('coupons');
    if (canAccess({ permissions: permissions.ledgers })) keys.add('ledgers');
    return keys;
  }, [canAccess, permissions]);

  useEffect(() => {
    if (!visibleTabKeys.has(activeTab)) {
      setActiveTab(visibleTabKeys.values().next().value || 'overview');
    }
  }, [activeTab, visibleTabKeys]);

  const grantColumns: ColumnsType<CreditGrant> = [
    {
      title: '批次',
      dataIndex: creditGrantField('id'),
      width: 150,
      render: renderCodeId,
    },
    {
      title: '权益类型',
      dataIndex: creditGrantField('packageKind'),
      width: 160,
      render: (value) => renderDictTag(value, packageKindText),
    },
    {
      title: '总点数',
      dataIndex: creditGrantField('totalPoints'),
      align: 'right',
      render: formatPoints,
    },
    {
      title: '剩余',
      dataIndex: creditGrantField('remainingPoints'),
      align: 'right',
      render: formatPoints,
    },
    {
      title: '已使用',
      dataIndex: creditGrantField('chargedPoints'),
      align: 'right',
      render: formatPoints,
    },
    {
      title: '已过期',
      dataIndex: creditGrantField('expiredPoints'),
      align: 'right',
      render: formatPoints,
    },
    {
      title: '已作废',
      dataIndex: creditGrantField('voidedPoints'),
      align: 'right',
      render: formatPoints,
    },
    {
      title: '到期时间',
      dataIndex: creditGrantField('expiresAt'),
      width: 180,
      render: (value) => value || '永久',
    },
    {
      title: '状态',
      dataIndex: creditGrantField('status'),
      width: 120,
      render: (value) => renderDictTag(value, grantStatusText),
    },
  ];

  const orderColumns: ColumnsType<CreditPackageOrder> = [
    { title: '订单号', dataIndex: 'orderNo', width: 210, ellipsis: true },
    {
      title: '套餐',
      key: 'packageName',
      width: 180,
      ellipsis: true,
      render: (_, record) => orderPackageName(record),
    },
    {
      title: '购买产品',
      key: 'productName',
      width: 180,
      ellipsis: true,
      render: (_, record) =>
        record.productNameSnapshot || record.productCode || '-',
    },
    {
      title: '点数',
      key: 'points',
      align: 'right',
      render: (_, record) => formatPoints(record.points),
    },
    {
      title: '实付',
      dataIndex: 'payAmount',
      align: 'right',
      render: formatAmount,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 140,
      render: (_, record) => {
        const status = orderStatus(record);
        return renderDictTag(status, payStatusText, payStatusTone[status]);
      },
    },
    {
      title: '权益到期',
      dataIndex: 'grantExpiresAt',
      width: 180,
      render: (value, record) =>
        value || (orderPackageKind(record) === 'FIXED_POINTS' ? '永久' : '-'),
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
      width: 90,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => void openOrder(record)}>
          详情
        </Button>
      ),
    },
  ];

  const couponColumns: ColumnsType<CreditCoupon> = [
    { title: '券号', dataIndex: 'couponNo', width: 190, ellipsis: true },
    { title: '优惠券', dataIndex: 'couponName', width: 180, ellipsis: true },
    {
      title: '优惠',
      key: 'discount',
      width: 130,
      render: (_, record) => couponDescription(record),
    },
    {
      title: '有效期',
      key: 'validity',
      width: 260,
      render: (_, record) =>
        `${formatDate(record.validFrom)} 至 ${formatDate(record.expiresAt)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value) =>
        renderDictTag(value, couponStatusText, couponStatusTone[String(value)]),
    },
  ];

  const ledgerColumns: ColumnsType<CreditLedger> = [
    { title: '流水', dataIndex: 'id', width: 150, render: renderCodeId },
    {
      title: '类型',
      dataIndex: 'ledgerType',
      width: 130,
      render: (value) =>
        renderDictTag(value, ledgerTypeText, ledgerTone[String(value)]),
    },
    {
      title: '方向',
      dataIndex: 'direction',
      width: 100,
      render: (value) => renderDictTag(value, directionText),
    },
    {
      title: '点数',
      dataIndex: 'points',
      align: 'right',
      render: formatPoints,
    },
    {
      title: '可用余额',
      dataIndex: 'balanceAfter',
      align: 'right',
      render: formatPoints,
    },
    {
      title: '欠费变动',
      dataIndex: 'outstandingDelta',
      align: 'right',
      render: formatPoints,
    },
    {
      title: '欠费余额',
      dataIndex: 'outstandingAfter',
      align: 'right',
      render: formatPoints,
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '时间',
      dataIndex: 'createTime',
      width: 180,
      render: formatDate,
    },
  ];

  const overviewContent = (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      {purchaseBlocked && (
        <Alert
          showIcon
          type="error"
          title={
            accountDisabled
              ? '当前信用点账户已停用，无法购买套餐'
              : `当前欠费 ${formatPoints(outstandingPoints)} 点，已暂停购买和新收费业务`
          }
        />
      )}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <ProCard>
            <Statistic
              title="可用点数"
              value={toNumber(account?.availablePoints)}
              prefix={
                <span style={metricIconStyle('#1677ff', '#e6f4ff')}>
                  <WalletOutlined />
                </span>
              }
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <ProCard>
            <Statistic
              title="欠费点数"
              value={outstandingPoints}
              styles={{
                content: {
                  color: outstandingPoints > 0 ? token.colorError : undefined,
                },
              }}
              prefix={
                <span style={metricIconStyle('#cf1322', '#fff1f0')}>
                  <WarningOutlined />
                </span>
              }
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <ProCard>
            <Statistic
              title="有效权益"
              value={effectiveEntitlementCount}
              suffix="批"
              prefix={
                <span style={metricIconStyle('#389e0d', '#f6ffed')}>
                  <CrownOutlined />
                </span>
              }
            />
          </ProCard>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <ProCard>
            <Statistic
              title="30天内到期"
              value={expiringPoints}
              suffix="点"
              prefix={
                <span style={metricIconStyle('#722ed1', '#f9f0ff')}>
                  <ClockCircleOutlined />
                </span>
              }
            />
          </ProCard>
        </Col>
      </Row>
      <ProCard
        title="权益状态"
        extra={
          account?.status ? (
            <Tag color={accountStatusTone[String(account.status)]}>
              {accountStatusText[String(account.status)] || account.status}
            </Tag>
          ) : null
        }
      >
        <Descriptions
          column={{ xs: 1, sm: 2, lg: 3 }}
          items={[
            {
              key: 'scope',
              label: '权益归属',
              children: scope === 'tenant' ? '当前团队' : '当前账号',
            },
            {
              key: 'granted',
              label: '累计获得',
              children: `${formatPoints(account?.totalGrantedPoints)} 点`,
            },
            {
              key: 'fixedPoints',
              label: '固定点数',
              children: `${formatPoints(entitlements?.fixedPoints?.remainingPoints)} 点`,
            },
            {
              key: 'charged',
              label: '累计使用',
              children: `${formatPoints(account?.totalChargedPoints)} 点`,
            },
            {
              key: 'refunded',
              label: '累计退回',
              children: `${formatPoints(account?.totalRefundedPoints)} 点`,
            },
            {
              key: 'settled',
              label: '累计偿还欠费',
              children: `${formatPoints(account?.totalSettledPoints)} 点`,
            },
            {
              key: 'nextExpiry',
              label: '最近到期',
              children: nextExpiry ? formatDate(nextExpiry) : '暂无到期权益',
            },
          ]}
          size="small"
        />
      </ProCard>
      <ProCard title={scope === 'tenant' ? '团队有效期套餐' : '个人有效期套餐'}>
        {activeTermEntitlementGroups.length ? (
          <Row gutter={[12, 12]}>
            {activeTermEntitlementGroups.flatMap((product) =>
              product.termPackages.map((item) => (
                <Col key={item.grantId || item.packageOrderId} xs={24} lg={12}>
                  <ProCard
                    title={item.packageName || '有效期点数套餐'}
                    style={{
                      border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                    extra={
                      <Tag color="blue">
                        {product.productName ||
                          product.productCode ||
                          '历史套餐'}
                      </Tag>
                    }
                  >
                    <Descriptions
                      column={2}
                      items={[
                        {
                          key: 'remaining',
                          label: '剩余点数',
                          children: `${formatPoints(item.remainingPoints)} 点`,
                        },
                        {
                          key: 'total',
                          label: '套餐点数',
                          children: `${formatPoints(item.totalPoints)} 点`,
                        },
                        {
                          key: 'status',
                          label: '权益状态',
                          children:
                            toNumber(item.remainingPoints) > 0 ? (
                              <Tag color="success">有效</Tag>
                            ) : (
                              <Tag>有效期内，点数已用完</Tag>
                            ),
                        },
                        {
                          key: 'expiresAt',
                          label: '到期时间',
                          children: formatDate(item.expiresAt),
                        },
                      ]}
                      size="small"
                    />
                  </ProCard>
                </Col>
              )),
            )}
          </Row>
        ) : (
          <Empty description="暂无有效期套餐" />
        )}
      </ProCard>
    </Space>
  );

  const grantsContent = (
    <Table
      rowKey={(record) => String(record.id)}
      columns={grantColumns}
      dataSource={grants}
      pagination={{ showTotal: (total) => `共 ${total} 条` }}
      scroll={{ x: 1120 }}
      size="middle"
    />
  );

  const packagesContent = packages.length ? (
    <Row gutter={[16, 16]}>
      {packages.map((record) => {
        const status = packageStatus(record);
        const disabled = purchaseBlocked || status !== 'ON_SALE';
        return (
          <Col key={record.id} xs={24} md={12} xl={8}>
            <ProCard
              title={record.packageName}
              extra={
                <Tag
                  color={
                    String(record.packageKind).includes('TERM')
                      ? 'blue'
                      : 'green'
                  }
                >
                  {packageKindText[String(record.packageKind)] ||
                    record.packageKind}
                </Tag>
              }
            >
              <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                <Space size={[4, 4]} wrap>
                  {(record.products || []).map((product) => (
                    <Tag key={product.productCode || product.productName}>
                      {product.productName || product.productCode}
                    </Tag>
                  ))}
                </Space>
                <Statistic title="点数" value={toNumber(record.points)} />
                <Row justify="space-between">
                  <Text type="secondary">有效期</Text>
                  <Text strong>
                    {describePackageTerm(record.packageKind, record.termMonths)}
                  </Text>
                </Row>
                <Row align="bottom" justify="space-between">
                  <Text
                    strong
                    style={{ color: token.colorError, fontSize: 24 }}
                  >
                    {formatAmount(record.price)}
                  </Text>
                  <Tooltip
                    title={
                      purchaseBlocked
                        ? accountDisabled
                          ? '账户恢复启用后可继续购买'
                          : '欠费结清后可继续购买'
                        : undefined
                    }
                  >
                    <PermissionButton
                      permissions={permissions.purchase}
                      disabled={disabled}
                      icon={<ShoppingCartOutlined />}
                      type="primary"
                      onClick={() => void openPurchase(record)}
                    >
                      购买
                    </PermissionButton>
                  </Tooltip>
                </Row>
              </Space>
            </ProCard>
          </Col>
        );
      })}
    </Row>
  ) : (
    <Empty description="暂无可购买套餐" />
  );

  const couponContent = (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      {claimableTemplates.length > 0 && (
        <ProCard title="可领取优惠券">
          <Space size={[12, 12]} wrap>
            {claimableTemplates.map((template) => (
              <ProCard
                key={template.id}
                style={{ width: 280 }}
                title={template.couponName}
                extra={<Tag color="red">{couponDescription(template)}</Tag>}
              >
                <Row align="middle" justify="space-between">
                  <Text type="secondary">
                    {template.validDays
                      ? `领取后 ${template.validDays} 天有效`
                      : '按活动有效期'}
                  </Text>
                  <PermissionButton
                    permissions={permissions.claim}
                    loading={claimingId === template.id}
                    size="small"
                    onClick={() => void claimCoupon(template)}
                  >
                    领取
                  </PermissionButton>
                </Row>
              </ProCard>
            ))}
          </Space>
        </ProCard>
      )}
      <ProCard title="我的优惠券">
        <Table
          rowKey={(record) => String(record.id)}
          columns={couponColumns}
          dataSource={coupons}
          pagination={{
            current: couponPage.current,
            pageSize: couponPage.pageSize,
            total: couponPage.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 张`,
            onChange: (pageNum, pageSize) =>
              void loadCoupons(pageNum, pageSize),
          }}
          scroll={{ x: 900 }}
        />
      </ProCard>
    </Space>
  );

  const tabItems = [
    {
      key: 'overview',
      label: tabLabels.overview,
      icon: <WalletOutlined />,
      children: overviewContent,
    },
    {
      key: 'packages',
      label: tabLabels.packages,
      icon: <ShoppingCartOutlined />,
      children: packagesContent,
    },
    {
      key: 'grants',
      label: tabLabels.grants,
      icon: <CrownOutlined />,
      children: grantsContent,
    },
    {
      key: 'orders',
      label: tabLabels.orders,
      icon: <ClockCircleOutlined />,
      children: (
        <Table
          rowKey={(record) => String(record.id)}
          columns={orderColumns}
          dataSource={orders}
          pagination={{
            current: orderPage.current,
            pageSize: orderPage.pageSize,
            total: orderPage.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (pageNum, pageSize) => void loadOrders(pageNum, pageSize),
          }}
          scroll={{ x: 1220 }}
        />
      ),
    },
    {
      key: 'coupons',
      label: tabLabels.coupons,
      icon: <GiftOutlined />,
      children: couponContent,
    },
    {
      key: 'ledgers',
      label: tabLabels.ledgers,
      icon: <HistoryOutlined />,
      children: (
        <Table
          rowKey={(record) => String(record.id)}
          columns={ledgerColumns}
          dataSource={ledgers}
          pagination={{
            current: ledgerPage.current,
            pageSize: ledgerPage.pageSize,
            total: ledgerPage.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (pageNum, pageSize) =>
              void loadLedgers(pageNum, pageSize),
          }}
          scroll={{ x: 920 }}
        />
      ),
    },
  ].filter((item) => visibleTabKeys.has(item.key as CreditWorkspaceTab));

  if (visibleTabKeys.size === 0) {
    return (
      <Result
        status="403"
        title="无信用点访问权限"
        subTitle="当前账号未获得该计费范围的查看权限。"
      />
    );
  }

  return (
    <PageContainer
      breadcrumbRender={false}
      title={title || getCreditWorkspaceTitle(scope)}
      extra={
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => void refresh()}
        >
          刷新
        </Button>
      }
    >
      <ProCard>
        <Tabs
          activeKey={activeTab}
          items={tabItems}
          onChange={(key) => setActiveTab(key as CreditWorkspaceTab)}
        />
      </ProCard>

      <Modal
        destroyOnHidden
        forceRender
        open={purchaseOpen}
        title={`购买${selectedPackage?.packageName || '套餐'}`}
        confirmLoading={submitting}
        okText="创建订单"
        onCancel={() => {
          purchaseIntentIdempotency.finish();
          setPurchaseOpen(false);
        }}
        onOk={() => void submitPurchase()}
      >
        <Descriptions
          bordered
          column={1}
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Descriptions.Item label="点数">
            {formatPoints(selectedPackage?.points)}
          </Descriptions.Item>
          <Descriptions.Item label="有效期">
            {describePackageTerm(
              selectedPackage?.packageKind,
              selectedPackage?.termMonths,
            )}
          </Descriptions.Item>
          <Descriptions.Item label="套餐价">
            {formatAmount(selectedPackage?.price)}
          </Descriptions.Item>
        </Descriptions>
        <Form
          form={purchaseForm}
          layout="vertical"
          onValuesChange={purchaseIntentIdempotency.handleValuesChange}
        >
          <Form.Item
            label="购买产品"
            name="productCode"
            rules={[{ required: true, message: '请选择购买产品' }]}
          >
            <Select
              optionFilterProp="label"
              options={(selectedPackage?.products || [])
                .filter((product) => product.productCode)
                .map((product) => ({
                  label: `${product.productName || product.productCode} · ${product.productCode}`,
                  value: String(product.productCode),
                }))}
              placeholder="选择本次订单归属产品"
              showSearch
            />
          </Form.Item>
          <Form.Item label="优惠券" name="couponId" initialValue="none">
            <Select
              options={[
                { label: '不使用优惠券', value: 'none' },
                ...purchaseCoupons.filter(isCouponUsable).map((coupon) => ({
                  label: `${coupon.couponName || coupon.couponNo} · ${couponDescription(coupon)}`,
                  value: coupon.id,
                })),
              ]}
            />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea maxLength={200} rows={3} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        destroyOnHidden
        footer={
          canRetryPackagePayment(selectedOrder) ? (
            <PermissionButton
              permissions={permissions.purchase}
              loading={submitting}
              type="primary"
              onClick={() => void retryPayment()}
            >
              重新获取支付二维码
            </PermissionButton>
          ) : null
        }
        open={orderOpen}
        title="套餐订单"
        width={680}
        onCancel={() => setOrderOpen(false)}
      >
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="订单号" span={2}>
            {selectedOrder?.orderNo || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="套餐">
            {orderPackageName(selectedOrder)}
          </Descriptions.Item>
          <Descriptions.Item label="购买产品">
            {selectedOrder?.productNameSnapshot ||
              selectedOrder?.productCode ||
              '-'}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {renderDictTag(
              orderStatus(selectedOrder),
              payStatusText,
              payStatusTone[orderStatus(selectedOrder)],
            )}
          </Descriptions.Item>
          <Descriptions.Item label="套餐价">
            {formatAmount(selectedOrder?.packagePrice)}
          </Descriptions.Item>
          <Descriptions.Item label="优惠">
            {formatAmount(selectedOrder?.discountAmount)}
          </Descriptions.Item>
          <Descriptions.Item label="实付">
            {formatAmount(selectedOrder?.payAmount)}
          </Descriptions.Item>
          <Descriptions.Item label="退款状态">
            {selectedOrder?.refundStatus || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="权益到期" span={2}>
            {selectedOrder?.grantExpiresAt ||
              (orderPackageKind(selectedOrder) === 'FIXED_POINTS'
                ? '永久'
                : '-')}
          </Descriptions.Item>
        </Descriptions>
        {orderPaymentCodeUrl(selectedOrder) &&
          shouldPollPackageOrder(selectedOrder) &&
          !isPaymentBusinessCallbackPending(selectedOrder) && (
            <Space
              align="center"
              orientation="vertical"
              size={8}
              style={{ marginTop: 20, width: '100%' }}
            >
              <QRCode value={String(orderPaymentCodeUrl(selectedOrder))} />
              <Text strong>
                {String(orderPaymentCodeUrl(selectedOrder)).startsWith('mock')
                  ? 'Mock 支付二维码'
                  : '支付二维码'}
              </Text>
              <Text type="secondary">
                {selectedOrder?.paymentExpiresAt
                  ? `有效期至 ${selectedOrder.paymentExpiresAt}`
                  : '支付完成后页面会自动更新'}
              </Text>
            </Space>
          )}
        {shouldPollPackageOrder(selectedOrder) && (
          <Alert
            showIcon
            type="info"
            title={
              isPaymentBusinessCallbackPending(selectedOrder)
                ? '支付已成功，正在等待信用点入账，每 3 秒自动刷新'
                : '订单处理中，每 3 秒自动刷新'
            }
            style={{ marginTop: 16 }}
          />
        )}
      </Modal>
    </PageContainer>
  );
};

export default CreditWorkspace;
