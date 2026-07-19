const unsafePath = (name: string): never => {
  throw new Error(`${name} 必须是安全的同源绝对路径。`);
};

const hasForbiddenPathCharacters = (value: string) =>
  value.includes('?') ||
  value.includes('#') ||
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) || 0;
    return codePoint <= 31 || codePoint === 127;
  });

const assertSafeSegment = (segment: string, name: string) => {
  let decoded = segment;
  for (let index = 0; index < 4; index += 1) {
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      return unsafePath(name);
    }

    if (
      next === '.' ||
      next === '..' ||
      next.includes('/') ||
      next.includes('\\') ||
      hasForbiddenPathCharacters(next)
    ) {
      return unsafePath(name);
    }
    if (next === decoded) return;
    decoded = next;
  }

  if (/%(?:2e|2f|5c)/i.test(decoded)) unsafePath(name);
};

export const assertSafeSameOriginPath = (value: string, name: string) => {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    hasForbiddenPathCharacters(value)
  ) {
    return unsafePath(name);
  }

  const segments = value.split('/');
  segments.slice(1).forEach((segment, index) => {
    const isTrailingSlash = index === segments.length - 2 && segment === '';
    if (segment === '' && !isTrailingSlash) unsafePath(name);
    if (segment) assertSafeSegment(segment, name);
  });

  return value;
};
