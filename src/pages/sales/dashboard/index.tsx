import {
  DollarOutlined,
  LineChartOutlined,
  StarOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { DatePicker, Space } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import KpiCard from './components/KpiCard';
import TrendChart from './components/TrendChart';
import type { SalesOverview } from './data.d';
import { getSalesOverview, getSalesTrends } from './service';
import {
  formatLeads,
  formatPositiveRate,
  formatRevenue,
  formatRoi,
  formatScore,
} from './utils';

const currentYear = dayjs().year();

const SalesDashboard: FC = () => {
  const [yearValue, setYearValue] = useState<Dayjs>(() =>
    dayjs().startOf('year'),
  );
  const year = yearValue.year();

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['sales-dashboard-overview', year],
    queryFn: () => getSalesOverview({ year }).then((res) => res.data),
    enabled: Boolean(year),
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['sales-dashboard-trends', year],
    queryFn: () => getSalesTrends({ year }).then((res) => res.data),
    enabled: Boolean(year),
  });

  const months = trends?.months ?? [];

  const kpiItems = useMemo(() => {
    const data: SalesOverview | undefined = overview;

    return [
      {
        key: 'newLeads',
        label: '新增有效线索',
        value: data ? formatLeads(data.newLeads) : '-',
        icon: <TeamOutlined />,
      },
      {
        key: 'leadQualityScore',
        label: '线索质量评分',
        value: data ? formatScore(data.leadQualityScore) : '-',
        icon: <StarOutlined />,
      },
      {
        key: 'positiveReplyRate',
        label: '正向回复率',
        value: data ? formatPositiveRate(data.positiveReplyRate) : '-',
        icon: <LineChartOutlined />,
      },
      {
        key: 'estimatedRoi',
        label: '预计收入',
        value: data ? formatRoi(data.estimatedRoi) : '-',
        icon: <DollarOutlined />,
      },
    ];
  }, [overview]);

  return (
    <PageContainer
      breadcrumbRender={false}
      title="数据总览"
      extra={
        <Space>
          <span className="text-sm text-[var(--ant-color-text-secondary)]">
            统计年份
          </span>
          <DatePicker
            picker="year"
            allowClear={false}
            value={yearValue}
            onChange={(value) => {
              if (value) {
                setYearValue(value.startOf('year'));
              }
            }}
            disabledDate={(date) => date.year() > currentYear}
          />
        </Space>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {kpiItems.map((item) => (
            <KpiCard
              key={item.key}
              label={item.label}
              value={item.value}
              icon={item.icon}
              loading={overviewLoading}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <TrendChart
            title="新增有效线索"
            unit="个"
            data={months}
            yField="leads"
            color="#1677ff"
            valueFormatter={(v) => formatLeads(v)}
            loading={trendsLoading}
          />
          <TrendChart
            title="预计收入"
            unit="万元"
            data={months}
            yField="revenue"
            color="#faad14"
            valueFormatter={(v) => formatRevenue(v)}
            loading={trendsLoading}
          />
          <TrendChart
            title="预计 ROI"
            unit="倍"
            data={months}
            yField="roi"
            color="#52c41a"
            valueFormatter={(v) => formatRoi(v)}
            loading={trendsLoading}
          />
        </div>
      </div>
    </PageContainer>
  );
};

export default SalesDashboard;
