import {
  AuditOutlined,
  CustomerServiceOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Empty, Skeleton, Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import type { DigitalIdentity } from './_shared';

const { Text } = Typography;

type IdentityGridProps = {
  identities: DigitalIdentity[];
  loading?: boolean;
  fillHeight?: boolean;
};

type IdentityMeta = {
  icon: ReactNode;
  color: string;
};

const IdentityGrid = ({
  identities,
  loading,
  fillHeight,
}: IdentityGridProps) => {
  const { token } = theme.useToken();

  const getIdentityMeta = (key: DigitalIdentity['key']): IdentityMeta => {
    const color = token.colorTextSecondary;
    switch (key) {
      case 'customerService':
        return { icon: <CustomerServiceOutlined />, color };
      case 'legal':
        return { icon: <SafetyCertificateOutlined />, color };
      case 'lawyer':
        return { icon: <AuditOutlined />, color };
      default:
        return { icon: <UserOutlined />, color };
    }
  };

  if (loading && identities.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {['customer-service', 'legal', 'lawyer', 'assistant'].map((key) => (
          <Skeleton key={key} active paragraph={{ rows: 2 }} />
        ))}
      </div>
    );
  }

  if (identities.length === 0) {
    return <Empty description="暂无身份配置" />;
  }

  const gridClassName = fillHeight
    ? 'grid h-full min-h-[220px] grid-cols-1 gap-2'
    : 'grid grid-cols-1 gap-2';

  return (
    <div className={gridClassName}>
      {identities.map((identity) => {
        const meta = getIdentityMeta(identity.key);
        return (
          <div
            key={identity.key}
            className={`flex items-center gap-3 rounded-lg border border-solid ${fillHeight ? 'h-full min-h-[96px] p-3' : 'p-3'}`}
            style={{
              borderColor: token.colorBorderSecondary,
              backgroundColor: token.colorBgContainer,
            }}
          >
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
              style={{
                color: meta.color,
                backgroundColor: token.colorFillQuaternary,
              }}
              aria-hidden
            >
              {meta.icon}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Text strong style={{ fontSize: 15, lineHeight: 1.2 }}>
                {identity.label}
              </Text>
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: token.colorTextSecondary,
                }}
              >
                {identity.description}
              </Text>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default IdentityGrid;
