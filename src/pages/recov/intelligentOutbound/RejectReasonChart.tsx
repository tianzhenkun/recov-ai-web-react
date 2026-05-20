import { Column } from '@ant-design/plots';
import { Empty, Skeleton, Space, Typography, theme } from 'antd';
import { useMemo } from 'react';
import type { RejectReasonStat, RejectReasonTone } from './_shared';

const { Text } = Typography;

type RejectReasonChartProps = {
  data: RejectReasonStat[];
  loading?: boolean;
};

const RejectReasonChart = ({ data, loading }: RejectReasonChartProps) => {
  const { token } = theme.useToken();

  const toneColor: Record<RejectReasonTone, string> = useMemo(
    () => ({
      negative: token.colorError,
      caution: token.colorWarning,
      neutral: token.colorTextSecondary,
      positive: token.colorSuccess,
    }),
    [
      token.colorError,
      token.colorSuccess,
      token.colorTextSecondary,
      token.colorWarning,
    ],
  );

  const chartData = useMemo(
    () =>
      data.map((item) => ({
        label: item.label,
        value: item.value,
        color: toneColor[item.tone],
      })),
    [data, toneColor],
  );

  const toneLegend: {
    tone: RejectReasonTone;
    label: string;
  }[] = [
    { tone: 'negative', label: '高对抗' },
    { tone: 'caution', label: '需关注' },
    { tone: 'neutral', label: '中性' },
  ];

  if (loading && data.length === 0) {
    return <Skeleton.Node active style={{ width: '100%', height: 320 }} />;
  }

  if (data.length === 0) {
    return <Empty description="暂无拒缴原因数据" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <Space size={[16, 6]} wrap>
        {toneLegend.map((item) => (
          <Space key={item.tone} size={6}>
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: toneColor[item.tone] }}
              aria-hidden
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.label}
            </Text>
          </Space>
        ))}
      </Space>
      <Column
        height={320}
        data={chartData as any}
        xField="label"
        yField="value"
        axis={{
          x: { title: false, labelAutoWrap: true },
          y: {
            title: false,
            gridLineDash: null,
            labelFormatter: (value: number) => `${value}%`,
          },
        }}
        scale={{
          x: { paddingInner: 0.55, paddingOuter: 0.2 },
          y: { nice: true },
        }}
        tooltip={{
          title: 'label',
          items: [
            {
              channel: 'y',
              name: '占比',
              valueFormatter: (value: number) => `${value}%`,
            },
          ],
        }}
        label={{
          text: (datum: { value: number }) => `${datum.value}%`,
          position: 'top',
          style: {
            fill: token.colorTextSecondary,
            fontSize: 11,
            fontWeight: 600,
          },
        }}
        style={{
          fill: (datum: { color?: string }) =>
            datum.color || token.colorPrimary,
          radiusTopLeft: 4,
          radiusTopRight: 4,
        }}
      />
    </div>
  );
};

export default RejectReasonChart;
