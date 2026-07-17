import { Line } from '@ant-design/plots';
import { ProCard } from '@ant-design/pro-components';
import { Empty, Skeleton, Typography } from 'antd';
import type { FC } from 'react';

const { Text, Title } = Typography;

type TrendChartProps = {
  title: string;
  unit: string;
  data: Record<string, string | number>[];
  xField?: string;
  yField: string;
  color?: string;
  valueFormatter?: (value: number) => string;
  loading?: boolean;
};

const TrendChart: FC<TrendChartProps> = ({
  title,
  unit,
  data,
  xField = 'month',
  yField,
  color = '#1677ff',
  valueFormatter,
  loading,
}) => (
  <ProCard style={{ borderRadius: 8 }} styles={{ body: { padding: 24 } }}>
    <div className="mb-6 flex items-center justify-between">
      <div>
        <Title level={5} style={{ margin: 0 }}>
          {title}
        </Title>
        <Text type="secondary" className="text-xs">
          单位：{unit}
        </Text>
      </div>
    </div>
    {loading ? (
      <Skeleton active paragraph={{ rows: 6 }} />
    ) : data.length === 0 ? (
      <Empty description="暂无数据" />
    ) : (
      <Line
        height={280}
        data={data}
        xField={xField}
        yField={yField}
        shapeField="smooth"
        axis={{
          x: { title: false },
          y: { title: false, gridLineDash: null },
        }}
        scale={{ y: { nice: true } }}
        tooltip={{
          title: xField,
          items: [
            {
              channel: 'y',
              name: title,
              valueFormatter: (value: number) =>
                valueFormatter ? valueFormatter(value) : String(value),
            },
          ],
        }}
        style={{
          lineWidth: 3,
          stroke: color,
        }}
      />
    )}
  </ProCard>
);

export default TrendChart;
