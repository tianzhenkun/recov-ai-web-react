import { FEE_TIER_OPTIONS, formatFeeTierDisplay } from './FeeTierOptions';

describe('recov fee tier display options', () => {
  it('uses city-tier labels for project billing tier selects', () => {
    expect(FEE_TIER_OPTIONS).toEqual([
      { label: '一线城市', value: 'TIER_1' },
      { label: '二线城市', value: 'TIER_2' },
      { label: '三线及以下城市', value: 'TIER_3' },
      { label: '其他城市', value: 'TIER_OTHER' },
    ]);
  });

  it('normalizes legacy and backend tier names to service-fee labels', () => {
    expect(formatFeeTierDisplay('TIER_1', '一级')).toBe('一线城市');
    expect(formatFeeTierDisplay('TIER_2', '二级')).toBe('二线城市');
    expect(formatFeeTierDisplay('TIER_3', '三级')).toBe('三线及以下城市');
    expect(formatFeeTierDisplay('TIER_OTHER', '其他')).toBe('其他城市');
    expect(formatFeeTierDisplay('OTHER')).toBe('其他城市');
  });
});
