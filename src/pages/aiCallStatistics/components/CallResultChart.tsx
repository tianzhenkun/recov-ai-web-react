import { Pie } from '@ant-design/plots';
import { Button, Empty, Flex, Space, Typography } from 'antd';
import React from 'react';
import type { CallResultGroup, OutboundStatistics } from '../domain';

const { Text } = Typography;

const RESULT_META: Record<
  CallResultGroup,
  { label: string; color: string; drillable: boolean }
> = {
  connected: { label: '已接通', color: '#52c41a', drillable: true },
  no_answer: { label: '无人接听', color: '#faad14', drillable: true },
  busy: { label: '占线', color: '#fa8c16', drillable: true },
  invalid_number: { label: '空号', color: '#8c8c8c', drillable: true },
  call_failed: { label: '呼叫失败', color: '#ff4d4f', drillable: true },
  processing: { label: '处理中', color: '#1677ff', drillable: false },
  other: { label: '其他', color: '#b37feb', drillable: false },
};

type ResultItem = OutboundStatistics['results'][number];

type CallResultChartProps = {
  data: ResultItem[];
  onResultClick: (result: CallResultGroup) => void;
};

const CallResultChart = ({ data, onResultClick }: CallResultChartProps) => {
  if (data.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const chartData = data.map((item) => ({
    ...item,
    label: RESULT_META[item.result].label,
  }));

  const handleResultClick = (result: CallResultGroup) => {
    if (RESULT_META[result].drillable) {
      onResultClick(result);
    }
  };

  return (
    <Flex vertical gap={12}>
      <Pie
        height={220}
        data={chartData}
        angleField="count"
        colorField="label"
        innerRadius={0.64}
        scale={{
          color: {
            range: chartData.map((item) => RESULT_META[item.result].color),
          },
        }}
        legend={false}
        label={{
          text: (datum: ResultItem) =>
            datum.rate >= 0.05 ? `${(datum.rate * 100).toFixed(1)}%` : '',
          position: 'outside',
        }}
        tooltip={{
          title: 'label',
          items: [
            { field: 'count', name: '数量' },
            {
              field: 'rate',
              name: '占比',
              valueFormatter: (value: number) => `${(value * 100).toFixed(1)}%`,
            },
          ],
        }}
        onEvent={(_, event) => {
          if (event.type !== 'element:click') {
            return;
          }
          const result = event.data?.data?.result as
            | CallResultGroup
            | undefined;
          if (result) {
            handleResultClick(result);
          }
        }}
      />
      <Flex vertical gap={4}>
        {data.map((item) => {
          const meta = RESULT_META[item.result];
          const content = (
            <Flex
              key={item.result}
              align="center"
              justify="space-between"
              gap={12}
            >
              <Space size={8}>
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: meta.color,
                  }}
                />
                <Text>{meta.label}</Text>
              </Space>
              <Text>
                {item.count.toLocaleString()}（{(item.rate * 100).toFixed(1)}%）
              </Text>
            </Flex>
          );

          return meta.drillable ? (
            <Button
              key={item.result}
              type="text"
              onClick={() => handleResultClick(item.result)}
              style={{ height: 'auto', padding: '4px 8px', textAlign: 'left' }}
            >
              {content}
            </Button>
          ) : (
            <div key={item.result} style={{ padding: '4px 8px' }}>
              {content}
            </div>
          );
        })}
      </Flex>
    </Flex>
  );
};

export default CallResultChart;
