import {
  DashboardOutlined,
  PieChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Gauge, Pie } from '@ant-design/plots';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Button,
  Col,
  Descriptions,
  Empty,
  Row,
  Skeleton,
  Space,
  Statistic,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { type CacheDetail, getCache } from '@/services/ruoyi/monitor-cache';

const toNumber = (value?: string | number) => {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getInfoValue = (
  info: CacheDetail['info'] | undefined,
  key: string,
  fallback = '-',
) => info?.[key] || fallback;

const CachePage = () => {
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState<CacheDetail>();

  const loadCache = async () => {
    setLoading(true);
    try {
      const response = await getCache();
      setCache(response.data || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCache();
  }, []);

  const info = cache?.info || {};
  const commandStats = useMemo(
    () =>
      (cache?.commandStats || []).map((item) => ({
        name: item.name || '-',
        value: toNumber(item.value),
      })),
    [cache?.commandStats],
  );
  const usedMemory = getInfoValue(info, 'used_memory_human', '0');
  const usedMemoryValue = toNumber(usedMemory);
  const maxMemoryValue =
    toNumber(getInfoValue(info, 'maxmemory_human', '1000')) || 1000;

  return (
    <PageContainer
      title="缓存监控"
      extra={
        <Button icon={<ReloadOutlined />} loading={loading} onClick={loadCache}>
          刷新
        </Button>
      }
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <ProCard
          title={
            <Space>
              <DashboardOutlined />
              基本信息
            </Space>
          }
          loading={loading && !cache}
        >
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 4 }}>
            <Descriptions.Item label="Redis版本">
              {getInfoValue(info, 'redis_version')}
            </Descriptions.Item>
            <Descriptions.Item label="运行模式">
              {getInfoValue(info, 'redis_mode') === 'standalone'
                ? '单机'
                : '集群'}
            </Descriptions.Item>
            <Descriptions.Item label="端口">
              {getInfoValue(info, 'tcp_port')}
            </Descriptions.Item>
            <Descriptions.Item label="客户端数">
              {getInfoValue(info, 'connected_clients')}
            </Descriptions.Item>
            <Descriptions.Item label="运行时间(天)">
              {getInfoValue(info, 'uptime_in_days')}
            </Descriptions.Item>
            <Descriptions.Item label="使用内存">{usedMemory}</Descriptions.Item>
            <Descriptions.Item label="使用CPU">
              {toNumber(getInfoValue(info, 'used_cpu_user_children')).toFixed(
                2,
              )}
            </Descriptions.Item>
            <Descriptions.Item label="内存配置">
              {getInfoValue(info, 'maxmemory_human')}
            </Descriptions.Item>
            <Descriptions.Item label="AOF是否开启">
              {getInfoValue(info, 'aof_enabled') === '0' ? '否' : '是'}
            </Descriptions.Item>
            <Descriptions.Item label="RDB是否成功">
              {getInfoValue(info, 'rdb_last_bgsave_status')}
            </Descriptions.Item>
            <Descriptions.Item label="Key数量">
              {cache?.dbSize ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="网络入口/出口">
              {getInfoValue(info, 'instantaneous_input_kbps', '0')}kps /{' '}
              {getInfoValue(info, 'instantaneous_output_kbps', '0')}kps
            </Descriptions.Item>
          </Descriptions>
        </ProCard>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <ProCard
              title={
                <Space>
                  <PieChartOutlined />
                  命令统计
                </Space>
              }
            >
              {loading && !cache ? (
                <Skeleton.Node active style={{ width: '100%', height: 360 }} />
              ) : commandStats.length > 0 ? (
                <Pie
                  height={360}
                  data={commandStats as any}
                  angleField="value"
                  colorField="name"
                  radius={0.8}
                  label={{
                    text: (item: { name: string; value: number }) =>
                      `${item.name}: ${item.value}`,
                  }}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </ProCard>
          </Col>
          <Col xs={24} lg={12}>
            <ProCard
              title={
                <Space>
                  <DashboardOutlined />
                  内存信息
                </Space>
              }
            >
              {loading && !cache ? (
                <Skeleton.Node active style={{ width: '100%', height: 360 }} />
              ) : (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Statistic title="当前使用内存" value={usedMemory} />
                  <Gauge
                    height={300}
                    data={
                      {
                        target: usedMemoryValue,
                        total: Math.max(maxMemoryValue, usedMemoryValue, 1),
                        name: 'memory',
                        thresholds: [200, 400, 600, 800, 1000],
                      } as any
                    }
                    style={{
                      textContent: () => usedMemory,
                    }}
                  />
                </Space>
              )}
            </ProCard>
          </Col>
        </Row>
      </Space>
    </PageContainer>
  );
};

export default CachePage;
