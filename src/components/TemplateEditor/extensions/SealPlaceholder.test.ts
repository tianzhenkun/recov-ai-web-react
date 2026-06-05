import { buildSealPlaceholderStyle } from './SealPlaceholder';

describe('SealPlaceholder', () => {
  it('normalizes seal placeholder style for readable edit rendering', () => {
    const style = buildSealPlaceholderStyle(
      'display:inline-block;width:36mm;height:36mm;border:1px dashed #cbd5e1;',
      '36',
      '36',
    );

    expect(style).toContain('display:inline-flex');
    expect(style).toContain('align-items:center');
    expect(style).toContain('justify-content:center');
    expect(style).toContain('gap:6mm');
    expect(style).toContain('width:auto');
    expect(style).toContain('min-width:36mm');
    expect(style).toContain('height:36mm');
    expect(style).toContain('border:1px dashed #cbd5e1');
    expect(style).toContain('border-radius:4px');
  });
});
