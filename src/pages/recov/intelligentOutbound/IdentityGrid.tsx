import {
  AuditOutlined,
  CustomerServiceOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Empty, Skeleton, Space, Tag, Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
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

  const metaByKey = useMemo<Record<DigitalIdentity['key'], IdentityMeta>>(
    () => ({
      staff: { icon: <UserOutlined />, color: token.colorPrimary },
      cs: { icon: <CustomerServiceOutlined />, color: token.colorSuccess },
      legal: {
        icon: <SafetyCertificateOutlined />,
        color: token.colorWarning,
      },
      lawyer: { icon: <AuditOutlined />, color: token.colorError },
    }),
    [
      token.colorPrimary,
      token.colorSuccess,
      token.colorWarning,
      token.colorError,
    ],
  );

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
    ? 'grid h-full min-h-[240px] grid-cols-1 gap-3 sm:grid-cols-2 sm:grid-rows-2'
    : 'grid grid-cols-1 gap-3 sm:grid-cols-2';

  return (
    <div className={gridClassName}>
      {identities.map((identity) => {
        const meta = metaByKey[identity.key];
        return (
          <div
            key={identity.key}
            className={`flex gap-3 rounded-lg border border-solid transition-all hover:-translate-y-0.5 hover:shadow-md ${fillHeight ? 'h-full min-h-[108px] p-4' : 'p-3'}`}
            style={{
              borderColor: token.colorBorderSecondary,
              backgroundColor: token.colorBgContainer,
            }}
          >
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base"
              style={{
                color: meta.color,
                backgroundColor: `${meta.color}14`,
              }}
              aria-hidden
            >
              {meta.icon}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Space size={6} align="center" wrap>
                <Text strong style={{ fontSize: 14 }}>
                  {identity.label}
                </Text>
                <Tag
                  color={meta.color}
                  style={{ marginInlineEnd: 0, fontSize: 11 }}
                >
                  {identity.tone}
                </Tag>
              </Space>
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: token.colorTextTertiary,
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
