import {
  BarChartOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  LineChartOutlined,
  ProjectOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Column, Line } from '@ant-design/plots';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Col, Empty, Row, Skeleton, Space, Tooltip, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type DashboardIndicator,
  type DashboardOverview,
  getDashboardOverview,
  getRepaymentTrend,
  type RepaymentTrend,
} from '@/services/ruoyi/dashboard';

const { Text, Title } = Typography;

const ageColors = [
  '#3B82F6',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#6B7280',
];
const regionColors = [
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
];

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
});

const compactNumberFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
});

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: unknown) =>
  currencyFormatter.format(toNumber(value));

const formatCompactCurrency = (value: unknown) => {
  const amount = toNumber(value);
  const absAmount = Math.abs(amount);

  if (absAmount >= 100000000) {
    return `¥${compactNumberFormatter.format(amount / 100000000)}亿`;
  }

  if (absAmount >= 10000) {
    return `¥${compactNumberFormatter.format(amount / 10000)}万`;
  }

  return formatCurrency(amount);
};

type StatMeta = {
  key: keyof DashboardIndicator;
  label: string;
  format: 'currency' | 'count' | 'duration';
  unit?: string;
  icon: React.ReactNode;
  color: string;
};

const statMetas: StatMeta[] = [
  {
    key: 'totalOverdueAmount',
    label: '逾期总金额',
    format: 'currency',
    icon: <WalletOutlined />,
    color: '#1677ff',
  },
  {
    key: 'totalDebtorCount',
    label: '逾期总户数',
    format: 'count',
    unit: '户',
    icon: <TeamOutlined />,
    color: '#13c2c2',
  },
  {
    key: 'avgBillAmount',
    label: '平均单笔金额',
    format: 'currency',
    icon: <BarChartOutlined />,
    color: '#faad14',
  },
  {
    key: 'avgOverdueDays',
    label: '加权平均账期',
    format: 'duration',
    unit: '天',
    icon: <FieldTimeOutlined />,
    color: '#fa8c16',
  },
  {
    key: 'collectionCycle',
    label: '累计催收时间',
    format: 'duration',
    unit: '天',
    icon: <ClockCircleOutlined />,
    color: '#52c41a',
  },
  {
    key: 'totalRecoveredAmount',
    label: '累计回款',
    format: 'currency',
    icon: <LineChartOutlined />,
    color: '#722ed1',
  },
];

type StatDisplayValue = {
  primary: string;
  unit?: string;
  tooltip?: string;
};

const formatStatValue = (
  value: unknown,
  format: StatMeta['format'],
  unit?: string,
) => {
  if (format === 'currency') {
    return {
      primary: formatCompactCurrency(value),
      tooltip: formatCurrency(value),
    };
  }

  return {
    primary: numberFormatter.format(toNumber(value)),
    unit,
  };
};

type DashboardStatCardProps = {
  meta: StatMeta;
  value: StatDisplayValue;
};

const statCardStyles = {
  body: {
    padding: 12,
  },
};

const DashboardStatCard = ({ meta, value }: DashboardStatCardProps) => {
  const hasTooltip = Boolean(value.tooltip && value.tooltip !== value.primary);
  const valueNode = (
    <span
      style={{
        display: 'inline-flex',
        cursor: hasTooltip ? 'pointer' : 'default',
      }}
    >
      <Space align="baseline" size={4} wrap={false}>
        <Text
          strong
          style={{
            cursor: 'inherit',
            fontSize: 22,
            lineHeight: 1.2,
            wordBreak: 'keep-all',
            whiteSpace: 'nowrap',
          }}
        >
          {value.primary}
        </Text>
        {value.unit ? (
          <Text
            type="secondary"
            style={{ cursor: 'inherit', fontSize: 12, whiteSpace: 'nowrap' }}
          >
            {value.unit}
          </Text>
        ) : null}
      </Space>
    </span>
  );

  return (
    <ProCard size="small" style={{ minWidth: 0 }} styles={statCardStyles}>
      <div
        style={{
          minHeight: 62,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 8,
          minWidth: 0,
        }}
      >
        <Space align="center" size={8}>
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm"
            style={{
              color: meta.color,
              backgroundColor: `${meta.color}14`,
            }}
            aria-hidden
          >
            {meta.icon}
          </span>
          <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.3 }}>
            {meta.label}
          </Text>
        </Space>
        {hasTooltip ? (
          <Tooltip title={value.tooltip}>{valueNode}</Tooltip>
        ) : (
          valueNode
        )}
      </div>
    </ProCard>
  );
};

const DashboardPage = () => {
  const [overview, setOverview] = useState<DashboardOverview>({});
  const [trend, setTrend] = useState<RepaymentTrend>({});
  const [loading, setLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, trendRes] = await Promise.all([
        getDashboardOverview(),
        getRepaymentTrend(),
      ]);
      setOverview(overviewRes.data || {});
      setTrend(trendRes.data || {});
    } catch {
      setOverview({});
      setTrend({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const indicators = overview.indicators || {};

  const statCards = useMemo(
    () =>
      statMetas.map((meta) => ({
        meta,
        value: formatStatValue(indicators[meta.key], meta.format, meta.unit),
      })),
    [indicators],
  );

  const ageData = useMemo(
    () =>
      (overview.ageDistribution || []).map((item, index) => ({
        range: item.range || '-',
        count: toNumber(item.count),
        percentage: toNumber(item.percentage),
        color: ageColors[index] || '#6B7280',
      })),
    [overview.ageDistribution],
  );

  const regionData = useMemo(
    () =>
      (overview.regionDistribution || []).map((item, index) => ({
        province: item.province || '-',
        value: toNumber(item.provincePercentage),
        color: regionColors[index % regionColors.length],
        cities: (item.cities || []).map((city) => ({
          name: city.city || '-',
          value: toNumber(city.percentage),
        })),
      })),
    [overview.regionDistribution],
  );

  const trendData = useMemo(
    () =>
      (trend.trend || []).map((item) => ({
        day: item.label || String(item.day || '-'),
        amount: Number.parseFloat(toNumber(item.dailyAmount).toFixed(2)),
      })),
    [trend.trend],
  );

  return (
    <PageContainer title="首页">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 10,
          }}
        >
          {statCards.map((card) => (
            <DashboardStatCard
              key={card.meta.key}
              meta={card.meta}
              value={card.value}
            />
          ))}
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <ProCard
              title={
                <Space>
                  <BarChartOutlined />
                  资产包账龄分析
                </Space>
              }
            >
              {loading && ageData.length === 0 ? (
                <Skeleton.Node active style={{ width: '100%', height: 300 }} />
              ) : ageData.length > 0 ? (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Column
                    height={300}
                    data={ageData as any}
                    xField="range"
                    yField="count"
                    axis={{
                      x: { title: false },
                      y: { title: false, gridLineDash: null },
                    }}
                    scale={{ x: { paddingInner: 0.8, paddingOuter: 0.32 } }}
                    tooltip={{
                      title: 'range',
                      items: [
                        { channel: 'y', name: '数量' },
                        {
                          field: 'percentage',
                          name: '占比',
                          valueFormatter: (value: number) => `${value}%`,
                        },
                      ],
                    }}
                    style={{
                      columnWidthRatio: 0.2,
                      fill: (datum: { color?: string }) =>
                        datum.color || '#1677ff',
                      radiusTopLeft: 4,
                      radiusTopRight: 4,
                    }}
                  />
                  <Space wrap size={[18, 10]}>
                    {ageData.map((item) => (
                      <Space key={item.range} size={6}>
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <Text type="secondary">
                          {item.range} {item.percentage}%
                        </Text>
                      </Space>
                    ))}
                  </Space>
                </Space>
              ) : (
                <Empty description="暂无账龄数据" />
              )}
            </ProCard>
          </Col>

          <Col xs={24}>
            <ProCard
              title={
                <Space>
                  <ProjectOutlined />
                  逾期用户区域分布
                </Space>
              }
            >
              {loading && regionData.length === 0 ? (
                <Skeleton active paragraph={{ rows: 6 }} />
              ) : regionData.length > 0 ? (
                <Row gutter={[32, 24]}>
                  {regionData.map((item) => (
                    <Col key={item.province} xs={24} md={12} lg={8}>
                      <Space
                        direction="vertical"
                        size={10}
                        style={{ width: '100%' }}
                      >
                        <Space
                          align="end"
                          style={{
                            justifyContent: 'space-between',
                            width: '100%',
                          }}
                        >
                          <Text strong>{item.province}</Text>
                          <Text type="secondary">{item.value}%</Text>
                        </Space>
                        <div className="h-2 overflow-hidden rounded-full bg-black/5">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, item.value))}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                        <Space
                          direction="vertical"
                          size={6}
                          style={{ width: '100%' }}
                        >
                          {item.cities.map((city) => (
                            <Space
                              key={city.name}
                              style={{
                                justifyContent: 'space-between',
                                width: '100%',
                              }}
                            >
                              <Text type="secondary">{city.name}</Text>
                              <Text type="secondary">{city.value}%</Text>
                            </Space>
                          ))}
                        </Space>
                      </Space>
                    </Col>
                  ))}
                </Row>
              ) : (
                <Empty description="暂无区域数据" />
              )}
            </ProCard>
          </Col>
        </Row>

        <ProCard
          title={
            <Space direction="vertical" size={0}>
              <Title level={5} style={{ margin: 0 }}>
                {trend.title || '回款数据分析'}
              </Title>
              <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.4 }}>
                {trend.subtitle || '催收启动至今清收趋势'}
              </Text>
            </Space>
          }
        >
          {loading && trendData.length === 0 ? (
            <Skeleton.Node active style={{ width: '100%', height: 300 }} />
          ) : trendData.length > 0 ? (
            <Line
              height={300}
              data={trendData as any}
              xField="day"
              yField="amount"
              shapeField="smooth"
              axis={{
                x: { title: false },
                y: { title: false, gridLineDash: null },
              }}
              scale={{ y: { nice: true } }}
              tooltip={{
                title: 'day',
                items: [
                  {
                    channel: 'y',
                    name: '回款金额',
                    valueFormatter: (value: number) => formatCurrency(value),
                  },
                ],
              }}
              slider={{
                x: trendData.length > 10,
              }}
              style={{
                lineWidth: 3,
              }}
            />
          ) : (
            <Empty description="暂无回款趋势数据" />
          )}
        </ProCard>
      </Space>
    </PageContainer>
  );
};

export default DashboardPage;
