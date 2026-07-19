import {
  ExclamationCircleOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons';
import React from 'react';

export const getFlowActionIcon = (isException: boolean) =>
  isException ? <ExclamationCircleOutlined /> : <FieldTimeOutlined />;
