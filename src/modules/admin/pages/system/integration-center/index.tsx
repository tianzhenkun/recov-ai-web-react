import {
  CloudServerOutlined,
  LoginOutlined,
  PayCircleOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useAccess } from '@umijs/max';
import { Button, Card, Flex, Tag, Typography } from 'antd';
import { createStyles } from 'antd-style';
import React, { type ReactNode } from 'react';

type IntegrationEntry = {
  code: string;
  name: string;
  provider: string;
  description: string;
  service: string;
  path: string;
  icon: ReactNode;
};

const paymentRoutePath = '/sys-conf/payment-channel-config';

const objectStorageEntry: IntegrationEntry = {
  code: 'object-storage',
  name: '对象存储',
  provider: 'OSS / MinIO',
  description: '维护文件上传与访问所使用的对象存储实例。',
  service: 'Resource',
  path: '/sys-conf/oss-config/index',
  icon: <CloudServerOutlined />,
};

const paymentEntry: IntegrationEntry = {
  code: 'payment',
  name: '支付渠道',
  provider: '微信支付',
  description: '维护SaaS充值使用的微信支付商户与回调配置。',
  service: 'Billing',
  path: paymentRoutePath,
  icon: <PayCircleOutlined />,
};

const oauthEntry: IntegrationEntry = {
  code: 'oauth',
  name: '第三方登录',
  provider: 'OAuth Provider',
  description: '维护平台第三方登录提供方的应用标识、回调地址与凭据。',
  service: 'System / Auth',
  path: '/sys-conf/oauth-providers',
  icon: <LoginOutlined />,
};

const useStyles = createStyles(({ token }) => ({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: token.marginLG,
  },
  card: {
    height: '100%',
  },
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: token.borderRadiusLG,
    color: token.colorPrimary,
    background: token.colorPrimaryBg,
    fontSize: 20,
  },
  provider: {
    marginBottom: token.marginXS,
  },
  description: {
    minHeight: 44,
    marginBottom: token.marginMD,
  },
}));

const IntegrationCenterPage = () => {
  const { styles } = useStyles();
  const access = useAccess();

  const integrationEntries = [
    objectStorageEntry,
    ...(access.canManageOAuthIntegration ? [oauthEntry] : []),
    paymentEntry,
  ];

  return (
    <PageContainer title="集成中心">
      <div className={styles.grid}>
        {integrationEntries.map((entry) => (
          <Card
            key={entry.code}
            className={styles.card}
            title={
              <Flex align="center" gap="small">
                <span className={styles.icon}>{entry.icon}</span>
                <span>{entry.name}</span>
              </Flex>
            }
            extra={
              <Button
                type="primary"
                aria-label={`配置${entry.name}`}
                onClick={() => history.push(entry.path)}
              >
                配置
              </Button>
            }
          >
            <Typography.Title level={5} className={styles.provider}>
              {entry.provider}
            </Typography.Title>
            <Typography.Paragraph
              type="secondary"
              className={styles.description}
            >
              {entry.description}
            </Typography.Paragraph>
            <Tag>{entry.service}</Tag>
            <Tag color="blue">平台全局</Tag>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
};

export default IntegrationCenterPage;
