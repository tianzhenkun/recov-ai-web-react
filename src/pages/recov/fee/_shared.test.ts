import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  flattenFeeMatrix,
  formatFeeTierDisplay,
  formatOverduePeriodDisplay,
  getRowKey,
} from './_shared';

const pageSource = readFileSync(join(__dirname, 'index.tsx'), 'utf8');

describe('fee matrix helpers', () => {
  it('flattens fee tier matrix rows without city tier fallback', () => {
    const rows = flattenFeeMatrix([
      {
        feeTier: 'TIER_1',
        feeTierName: '一级',
        rows: [
          {
            overduePeriod: 'M1',
            periodName: '1个月内',
            rates: {},
          },
        ],
      },
    ]);

    expect(rows).toEqual([
      {
        feeTier: 'TIER_1',
        feeTierName: '一级',
        overduePeriod: 'M1',
        periodName: '1个月内',
        rates: {},
      },
    ]);
    expect(getRowKey(rows[0])).toBe('TIER_1-M1');
  });

  it('formats fee tier labels as city tiers for display', () => {
    expect(formatFeeTierDisplay('TIER_1', '一级')).toBe('一线城市');
    expect(formatFeeTierDisplay('TIER_2', '二级')).toBe('二线城市');
    expect(formatFeeTierDisplay('TIER_3', '三级')).toBe('三线及以下城市');
    expect(formatFeeTierDisplay('三级')).toBe('三线及以下城市');
    expect(formatFeeTierDisplay('OTHER', '其他')).toBe('其他城市');
  });

  it('formats litigation period label for display', () => {
    expect(formatOverduePeriodDisplay('涉及诉讼未结')).toBe('涉及司法诉讼');
    expect(formatOverduePeriodDisplay('6个月内')).toBe('6个月内');
  });

  it('renders city tiers and litigation periods without decorative tag backgrounds', () => {
    expect(pageSource).not.toContain('getFeeTierTagMeta');
    expect(pageSource).not.toContain('FileProtectOutlined');
    expect(pageSource).not.toContain('color="warning"');
  });
});
