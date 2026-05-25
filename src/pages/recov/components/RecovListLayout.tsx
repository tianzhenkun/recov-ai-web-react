import {
  PageContainer,
  type PageContainerProps,
  ProCard,
  type ProCardProps,
} from '@ant-design/pro-components';
import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

export const RecovListPage = ({ className, ...props }: PageContainerProps) => (
  <PageContainer className={clsx('recov-list-page', className)} {...props} />
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
