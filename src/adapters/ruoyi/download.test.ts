import { isJsonContentType } from './download';

describe('download content type', () => {
  it.each([
    'application/json',
    'application/json;charset=UTF-8',
    'application/json; charset=utf-8',
    'application/problem+json;charset=UTF-8',
  ])('recognizes JSON response %s', (contentType) => {
    expect(isJsonContentType(contentType)).toBe(true);
  });

  it.each([
    '',
    'application/pdf',
    'application/octet-stream',
    'text/plain;charset=UTF-8',
  ])('does not treat %s as JSON', (contentType) => {
    expect(isJsonContentType(contentType)).toBe(false);
  });
});
