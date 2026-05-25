import type { CSSProperties } from 'react';
import { getRuoyiIconNode } from '@/utils/ruoyiIcons';

type RuoyiIconProps = {
  icon?: string;
  style?: CSSProperties;
};

const RuoyiIcon = ({ icon, style }: RuoyiIconProps) => {
  const iconNode = getRuoyiIconNode(icon);
  if (!iconNode) return null;
  return <span style={style}>{iconNode}</span>;
};

export default RuoyiIcon;
