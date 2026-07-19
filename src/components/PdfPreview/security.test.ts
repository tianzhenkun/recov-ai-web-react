import { normalizeSafePdfUrl, shouldAttachPdfAuthorization } from './security';

describe('PDF authorization boundary', () => {
  const origin = 'https://app.test';

  it.each([
    '/resource/oss/1',
    'https://app.test/resource/oss/1',
    './documents/file.pdf',
  ])('allows the current origin: %s', (url) => {
    expect(shouldAttachPdfAuthorization(url, origin)).toBe(true);
  });

  it.each([
    'https://evil.invalid/resource/oss/1',
    'http://app.test/resource/oss/1',
    'https://app.test:8443/a.pdf',
    '//evil.invalid/a.pdf',
    'not a valid url%',
  ])('does not attach credentials outside the current origin: %s', (url) => {
    expect(shouldAttachPdfAuthorization(url, origin)).toBe(false);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///tmp/document.pdf',
    'not a valid url%',
  ])('rejects active or malformed PDF URLs: %s', (url) => {
    expect(normalizeSafePdfUrl(url, origin)).toBeUndefined();
  });

  it('keeps valid relative and HTTP(S) PDF URLs', () => {
    expect(normalizeSafePdfUrl('/documents/1.pdf', origin)).toBe(
      '/documents/1.pdf',
    );
    expect(normalizeSafePdfUrl('https://cdn.test/1.pdf', origin)).toBe(
      'https://cdn.test/1.pdf',
    );
  });
});
