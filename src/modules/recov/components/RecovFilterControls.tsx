import { Tooltip } from 'antd';
import type { CSSProperties, ReactNode } from 'react';

export const RECOV_FILTER_CONTROL_WIDTH = 160;
export const RECOV_ORGANIZATION_POPUP_WIDTH = 480;

export const RECOV_FILTER_CONTROL_STYLE: CSSProperties = {
  width: RECOV_FILTER_CONTROL_WIDTH,
};

export const RECOV_LIST_COLUMN_WIDTH = {
  debtNumber: 86,
  city: 88,
  organization: 150,
} as const;

const singleLineTextStyle: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const normalizeDisplayValue = (value: ReactNode) =>
  value === null || value === undefined || value === '' ? '-' : value;

export const renderRecovSingleLineText = (value: ReactNode) => {
  const content = normalizeDisplayValue(value);

  return (
    <Tooltip title={content}>
      <span style={singleLineTextStyle}>{content}</span>
    </Tooltip>
  );
};

export const renderRecovSelectOptionLabel = renderRecovSingleLineText;
