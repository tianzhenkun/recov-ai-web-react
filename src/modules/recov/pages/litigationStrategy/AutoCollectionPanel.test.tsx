import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, 'AutoCollectionPanel.tsx'), 'utf8');

describe('auto collection strategy labels', () => {
  it('uses precise business labels for auto recall conditions', () => {
    expect(source).toContain('label="单笔金额≤"');
    expect(source).not.toContain('label="催收金额 ≤"');
    expect(source).toContain('label="距开庭剩余天数仍未匹配到开庭律师"');
    expect(source).not.toContain('label="距开庭剩余天数 ≤"');
  });
});
