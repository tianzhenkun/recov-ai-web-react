import { ArrowLeftOutlined } from '@ant-design/icons';
import {
  PageContainer,
  type PageContainerProps,
  ProCard,
  type ProCardProps,
} from '@ant-design/pro-components';
import { Button } from 'antd';
import clsx from 'clsx';
import type { HTMLAttributes } from 'react';
import React from 'react';

export const RecovPage = ({
  className,
  children,
  extra,
  onBack,
  ...props
}: PageContainerProps) => (
  <PageContainer
    className={clsx('recov-page', className)}
    {...props}
    pageHeaderRender={false}
  >
    {onBack || extra ? (
      <div className="recov-page-toolbar">
        <div>
          {onBack ? (
            <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
              返回
            </Button>
          ) : null}
        </div>
        {extra ? <div className="recov-page-toolbar-extra">{extra}</div> : null}
      </div>
    ) : null}
    {children}
  </PageContainer>
);

export const RecovListPage = ({ className, ...props }: PageContainerProps) => (
  <RecovPage className={clsx('recov-list-page', className)} {...props} />
);

export const RecovListStack = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('recov-list-stack', className)} {...props} />
);

export const RecovStatsStrip = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('recov-stats-strip', className)} {...props} />
);

export const RecovTableCard = ({ className, ...props }: ProCardProps) => (
  <ProCard className={clsx('recov-table-card', className)} {...props} />
);
