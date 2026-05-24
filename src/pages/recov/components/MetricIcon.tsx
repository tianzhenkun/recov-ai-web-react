import { theme } from 'antd';
import type { CSSProperties, ReactNode } from 'react';

export type MetricTone =
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral';

export type MetricToneColors = {
  color: string;
  backgroundColor: string;
};

export const useMetricToneColors = (
  _tone: MetricTone = 'primary',
): MetricToneColors => {
  const { token } = theme.useToken();
  const color = token.colorPrimary;
  const backgroundColor = token.colorPrimaryBg;

  return {
    color,
    backgroundColor,
  };
};

type MetricIconProps = {
  icon: ReactNode;
  tone?: MetricTone;
  className?: string;
  style?: CSSProperties;
  ariaHidden?: boolean;
};

const MetricIcon = ({
  icon,
  tone = 'primary',
  className = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm',
  style,
  ariaHidden = true,
}: MetricIconProps) => {
  const colors = useMetricToneColors(tone);

  return (
    <span
      className={className}
      style={{
        color: colors.color,
        backgroundColor: colors.backgroundColor,
        ...style,
      }}
      aria-hidden={ariaHidden}
    >
      {icon}
    </span>
  );
};

export default MetricIcon;
