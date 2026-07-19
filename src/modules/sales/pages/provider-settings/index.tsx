import {
  ApiOutlined,
  CheckCircleOutlined,
  KeyOutlined,
  ReloadOutlined,
  SafetyOutlined,
  SettingOutlined,
  StopOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Empty,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FC, ReactNode } from 'react';
import {
  getSalesProviderConfigStatus,
  type SalesProviderConfigKeyStatus,
  type SalesProviderConfigStatusItem,
  type SalesProviderConfigStatusSection,
} from '@/modules/sales/services/sales';

const { Text } = Typography;

const statusMeta: Record<
  string,
  { label: string; color: string; icon: ReactNode }
> = {
  active: {
    label: '已启用',
    color: 'success',
    icon: <CheckCircleOutlined />,
  },
  missing_key: {
    label: '缺少 Key',
    color: 'error',
    icon: <WarningOutlined />,
  },
  disabled: {
    label: '未启用',
    color: 'default',
    icon: <StopOutlined />,
  },
};

const formatValue = (value: unknown): string => {
  if (value === true) return '是';
  if (value === false) return '否';
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.join('、') || '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatKey = (key: string) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase());

const toEntries = (data?: Record<string, unknown>) =>
  Object.entries(data || {}).filter(([, value]) => value !== undefined);

const renderEntries = (data?: Record<string, unknown>) => {
  const entries = toEntries(data);
  if (entries.length === 0) return <Text type="secondary">-</Text>;
  return (
    <Space size={[4, 4]} wrap>
      {entries.map(([key, value]) => (
        <Tooltip key={key} title={formatKey(key)}>
          <Tag className="m-0 max-w-[260px] truncate">
            {formatKey(key)}: {formatValue(value)}
          </Tag>
        </Tooltip>
      ))}
    </Space>
  );
};

const renderKeyStatus = (items?: SalesProviderConfigKeyStatus[]) => {
  const keyItems = items || [];
  if (keyItems.length === 0) {
    return <Tag color="default">不涉及 Key</Tag>;
  }
  return (
    <Space size={[4, 4]} wrap>
      {keyItems.map((item) => (
        <Tooltip key={item.name} title={item.name}>
          <Tag
            className="m-0"
            color={item.configured ? 'success' : 'error'}
            icon={<KeyOutlined />}
          >
            {item.configured ? '已配置' : '未配置'}
          </Tag>
        </Tooltip>
      ))}
    </Space>
  );
};

const columns: ColumnsType<SalesProviderConfigStatusItem> = [
  {
    title: '能力',
    dataIndex: 'name',
    width: 220,
    fixed: 'left',
    render: (_value, record) => (
      <div className="min-w-[180px]">
        <div className="font-medium text-[var(--ant-color-text)]">
          {record.name || '-'}
        </div>
        <div className="mt-1 text-xs text-[var(--ant-color-text-secondary)]">
          {record.category || '-'}
        </div>
      </div>
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 120,
    render: (value: string) => {
      const meta = statusMeta[value] || {
        label: value || '-',
        color: 'default',
        icon: null,
      };
      return (
        <Tag color={meta.color} icon={meta.icon}>
          {meta.label}
        </Tag>
      );
    },
  },
  {
    title: 'Key',
    dataIndex: 'keyStatus',
    width: 160,
    render: renderKeyStatus,
  },
  {
    title: '限制',
    dataIndex: 'limits',
    width: 360,
    render: renderEntries,
  },
  {
    title: '细节',
    dataIndex: 'details',
    width: 360,
    render: renderEntries,
  },
  {
    title: '说明',
    dataIndex: 'description',
    width: 360,
    render: (value: string) => (
      <span className="text-sm leading-6 text-[var(--ant-color-text-secondary)]">
        {value || '-'}
      </span>
    ),
  },
];

const SummaryItem: FC<{
  label: string;
  value: ReactNode;
  icon: ReactNode;
}> = ({ label, value, icon }) => (
  <div className="min-h-[86px] rounded-md border border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] px-4 py-3">
    <Space size={12}>
      <span className="text-xl text-[var(--ant-color-primary)]">{icon}</span>
      <div>
        <div className="text-xs text-[var(--ant-color-text-secondary)]">
          {label}
        </div>
        <div className="mt-1 text-xl font-semibold text-[var(--ant-color-text)]">
          {value}
        </div>
      </div>
    </Space>
  </div>
);

const SalesProviderSettingsPage: FC = () => {
  const query = useQuery({
    queryKey: ['sales-provider-config-status'],
    queryFn: () => getSalesProviderConfigStatus().then((res) => res.data),
  });

  const status = query.data;
  const sections: SalesProviderConfigStatusSection[] = status?.sections || [];

  return (
    <PageContainer
      breadcrumbRender={false}
      title="服务商配置"
      extra={
        <Button
          icon={<ReloadOutlined />}
          loading={query.isFetching}
          onClick={() => query.refetch()}
        >
          刷新
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Alert
          showIcon
          type="info"
          icon={<SafetyOutlined />}
          title="这里只展示当前生效配置状态，不展示也不编辑明文 Key。"
          description="Key 和核心限制仍由服务端环境或配置中心管理；页面用于确认能力是否启用、Key 是否已配置、额度限制是否符合预期。"
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <SummaryItem
            icon={<ApiOutlined />}
            label="能力项"
            value={status?.summary?.itemCount ?? '-'}
          />
          <SummaryItem
            icon={<CheckCircleOutlined />}
            label="已启用"
            value={status?.summary?.enabledCount ?? '-'}
          />
          <SummaryItem
            icon={<WarningOutlined />}
            label="缺少 Key"
            value={status?.summary?.missingKeyCount ?? '-'}
          />
          <SummaryItem
            icon={<SettingOutlined />}
            label="密钥返回"
            value={status?.secretValueReturned ? '是' : '否'}
          />
        </div>

        {sections.length === 0 && !query.isLoading ? (
          <div className="rounded-md border border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] py-10">
            <Empty description="暂无服务商配置状态" />
          </div>
        ) : null}

        {sections.map((section) => (
          <section
            key={section.key || section.title}
            className="rounded-lg border border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-4"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-[var(--ant-color-text)]">
                  {section.title || '-'}
                </div>
                <div className="mt-1 text-sm text-[var(--ant-color-text-secondary)]">
                  {section.description || '-'}
                </div>
              </div>
              <Tag color="blue">{section.items?.length || 0} 项</Tag>
            </div>
            <Table<SalesProviderConfigStatusItem>
              rowKey={(record) => record.key || record.name || ''}
              columns={columns}
              dataSource={section.items || []}
              loading={query.isLoading}
              pagination={false}
              size="middle"
              scroll={{ x: 1220 }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无配置项"
                  />
                ),
              }}
            />
          </section>
        ))}
      </div>
    </PageContainer>
  );
};

export default SalesProviderSettingsPage;
