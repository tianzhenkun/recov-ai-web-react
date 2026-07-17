import { ProCard } from '@ant-design/pro-components';
import { Typography } from 'antd';
import type { FC, ReactNode } from 'react';

const { Text, Title } = Typography;

type KpiCardProps = {
  label: string;
  value: string;
  icon?: ReactNode;
  loading?: boolean;
};

const KpiCard: FC<KpiCardProps> = ({ label, value, icon, loading }) => (
  <ProCard
    loading={loading}
    style={{ borderRadius: 8, minHeight: 84 }}
    styles={{ body: { padding: 16 } }}
  >
    <div className="flex flex-col justify-center gap-2">
      <div className="flex items-center justify-between gap-2">
        <Text type="secondary" className="text-sm">
          {label}
        </Text>
        {icon ? (
          <span className="text-base text-[var(--ant-color-primary)]">
            {icon}
          </span>
        ) : null}
      </div>
      <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
        {value}
      </Title>
    </div>
  </ProCard>
);

export default KpiCard;
