import type { FeeTier } from '@/services/ruoyi/project';

const FEE_TIER_DISPLAY_MAP: Record<string, string> = {
  TIER_1: '一线城市',
  TIER_2: '二线城市',
  TIER_3: '三线及以下城市',
  TIER_OTHER: '其他城市',
  OTHER: '其他城市',
  一级: '一线城市',
  二级: '二线城市',
  三级: '三线及以下城市',
  其他: '其他城市',
};

export const FEE_TIER_OPTIONS: { label: string; value: FeeTier }[] = [
  { label: FEE_TIER_DISPLAY_MAP.TIER_1, value: 'TIER_1' },
  { label: FEE_TIER_DISPLAY_MAP.TIER_2, value: 'TIER_2' },
  { label: FEE_TIER_DISPLAY_MAP.TIER_3, value: 'TIER_3' },
  { label: FEE_TIER_DISPLAY_MAP.TIER_OTHER, value: 'TIER_OTHER' },
];

export const formatFeeTierDisplay = (
  feeTier?: string,
  feeTierName?: string,
): string => {
  const tierKey = String(feeTier || '').toUpperCase();
  if (FEE_TIER_DISPLAY_MAP[tierKey]) {
    return FEE_TIER_DISPLAY_MAP[tierKey];
  }

  const name = feeTierName || feeTier || '-';
  return FEE_TIER_DISPLAY_MAP[name] ?? name;
};
