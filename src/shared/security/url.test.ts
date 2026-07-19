import {
  normalizeSafeExternalUrl,
  normalizeSafeResourceUrl,
  shouldAttachAuthorizationToResource,
} from './url';

describe('untrusted URL boundaries', () => {
  const origin = 'https://app.test';

  it.each([
    ['/resource/oss/1', '/resource/oss/1'],
    ['./documents/file.pdf', './documents/file.pdf'],
    ['https://cdn.test/file.pdf', 'https://cdn.test/file.pdf'],
    ['//cdn.test/file.pdf', '//cdn.test/file.pdf'],
  ])('allows safe resource URL %s', (value, expected) => {
    expect(normalizeSafeResourceUrl(value, origin)).toBe(expected);
  });

  it.each([
    'javascript:alert(1).txt',
    'javascript://example.test/alert.txt',
    'data:text/html,<script>alert(1)</script>',
    'file:///tmp/document.pdf',
    'blob:https://app.test/id',
    'not a valid url%',
  ])('rejects active or malformed resource URL %s', (value) => {
    expect(normalizeSafeResourceUrl(value, origin)).toBeUndefined();
  });

  it('requires business external links to be absolute HTTP(S) URLs', () => {
    expect(normalizeSafeExternalUrl('https://example.test/path')).toBe(
      'https://example.test/path',
    );
    expect(normalizeSafeExternalUrl('http://example.test/path')).toBe(
      'http://example.test/path',
    );
    expect(normalizeSafeExternalUrl('/relative')).toBeUndefined();
    expect(normalizeSafeExternalUrl('//example.test/path')).toBeUndefined();
    expect(
      normalizeSafeExternalUrl('javascript://example.test/x'),
    ).toBeUndefined();
  });

  it('attaches authorization only to same-origin safe resources', () => {
    expect(shouldAttachAuthorizationToResource('/files/1', origin)).toBe(true);
    expect(
      shouldAttachAuthorizationToResource('https://app.test/files/1', origin),
    ).toBe(true);
    expect(
      shouldAttachAuthorizationToResource('https://cdn.test/files/1', origin),
    ).toBe(false);
    expect(
      shouldAttachAuthorizationToResource('javascript:alert(1)', origin),
    ).toBe(false);
  });
});
