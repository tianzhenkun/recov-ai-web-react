import {
  sanitizeInstrumentPreviewDocument,
  sanitizeInstrumentPreviewHtml,
} from './previewSecurity';

describe('instrument HTML preview security', () => {
  it('removes scripts, event handlers and active URLs', () => {
    const sanitized = sanitizeInstrumentPreviewHtml(
      '<script>alert(1)</script><img src=x onerror=alert(1)><a href="jav&#x61;script:alert(1)">x</a>',
    );

    expect(sanitized).not.toMatch(/script|onerror|javascript|&#x61;/i);
  });

  it('preserves supported document formatting and seal placeholders', () => {
    const sanitized = sanitizeInstrumentPreviewHtml(
      '<p style="text-align:center" data-seal-placeholder="seal_group">正文</p>',
    );

    expect(sanitized).toContain('style="text-align:center"');
    expect(sanitized).toContain('data-seal-placeholder="seal_group"');
    expect(sanitized).toContain('正文');
  });

  it('removes nested browsing and form contexts', () => {
    const sanitized = sanitizeInstrumentPreviewHtml(
      '<iframe src="https://evil.invalid"></iframe><form><input name="secret"></form>',
    );

    expect(sanitized).not.toMatch(/iframe|form|input|evil\.invalid/i);
  });

  it('sanitizes a complete preview document with the same forbidden tags', () => {
    const sanitized = sanitizeInstrumentPreviewDocument(
      '<!doctype html><html><head><script>alert(1)</script></head><body><form><input></form><p>正文</p></body></html>',
    );

    expect(sanitized).toContain('正文');
    expect(sanitized).not.toMatch(/script|form|input/i);
  });
});
