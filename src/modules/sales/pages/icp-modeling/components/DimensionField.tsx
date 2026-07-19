import { Switch, Typography } from 'antd';
import type { FC, ReactNode } from 'react';

const { Text } = Typography;

export type DimensionFieldProps = {
  label: string;
  fieldKey: string;
  enabled: boolean;
  onToggle: () => void;
  isNegative?: boolean;
  children: ReactNode;
};

const DimensionField: FC<DimensionFieldProps> = ({
  label,
  enabled,
  onToggle,
  isNegative = false,
  children,
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between gap-2">
      <Text
        className="text-xs"
        type={enabled ? undefined : 'secondary'}
        style={{
          color: enabled
            ? isNegative
              ? 'var(--ant-color-error)'
              : undefined
            : undefined,
        }}
      >
        {label}
      </Text>
      <Switch size="small" checked={enabled} onChange={onToggle} />
    </div>
    <div
      className={enabled ? '' : 'pointer-events-none opacity-40'}
      aria-disabled={!enabled}
    >
      {children}
    </div>
  </div>
);

export default DimensionField;
