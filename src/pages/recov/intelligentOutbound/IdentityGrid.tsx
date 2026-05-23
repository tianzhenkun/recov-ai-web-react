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
        {[0, 1, 2, 3].map((idx) => (
          <Skeleton key={idx} active paragraph={{ rows: 2 }} />
        ))}
      </div>
    );
  }

  if (identities.length === 0) {
    return <Empty description="暂无身份配置" />;
  }

  const gridClassName = fillHeight
    ? 'grid h-full min-h-[240px] grid-cols-1 gap-4'
    : 'grid grid-cols-1 gap-4';

  return (
    <div className={gridClassName}>
      {identities.map((identity) => {
        const meta = getIdentityMeta(identity.key);
        return (
          <div
            key={identity.key}
            className={`flex items-center gap-4 rounded-lg border border-solid ${fillHeight ? 'h-full min-h-[108px] p-5' : 'p-5'}`}
            style={{
              borderColor: token.colorBorderSecondary,
              backgroundColor: token.colorBgContainer,
            }}
          >
            <span
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-xl"
              style={{
                color: meta.color,
                backgroundColor: token.colorFillQuaternary,
              }}
              aria-hidden
            >
              {meta.icon}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Text strong style={{ fontSize: 17, lineHeight: 1.2 }}>
                {identity.label}
              </Text>
              <Text
                type="secondary"
                style={{
                  fontSize: 13,
                  lineHeight: 1.7,
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
