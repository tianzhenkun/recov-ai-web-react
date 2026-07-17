import {
  CheckCircleOutlined,
  SearchOutlined,
  TeamOutlined,
  WarningOutlined,
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
import { formatCount } from './utils';

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
        key: 'totalTasks',
        label: '获客任务',
        value: data ? formatCount(data.totalTasks) : '-',
        icon: <TeamOutlined />,
      },
      {
        key: 'readyTasks',
        label: '可搜索任务',
        value: data ? formatCount(data.readyTasks) : '-',
        icon: <CheckCircleOutlined />,
      },
      {
        key: 'pendingTasks',
        label: '待补充任务',
        value: data ? formatCount(data.pendingTasks) : '-',
        icon: <WarningOutlined />,
      },
      {
        key: 'searchRuns',
        label: '搜索运行记录',
        value: data ? formatCount(data.searchRuns) : '-',
        icon: <SearchOutlined />,
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
            title="获客任务"
            unit="个"
            data={months}
            yField="tasks"
            color="#1677ff"
            valueFormatter={(v) => formatCount(v)}
            loading={trendsLoading}
          />
          <TrendChart
            title="可搜索任务"
            unit="个"
            data={months}
            yField="readyTasks"
            color="#52c41a"
            valueFormatter={(v) => formatCount(v)}
            loading={trendsLoading}
          />
          <TrendChart
            title="搜索运行记录"
            unit="次"
            data={months}
            yField="runs"
            color="#faad14"
            valueFormatter={(v) => formatCount(v)}
            loading={trendsLoading}
          />
        </div>
      </div>
    </PageContainer>
  );
};

export default SalesDashboard;
