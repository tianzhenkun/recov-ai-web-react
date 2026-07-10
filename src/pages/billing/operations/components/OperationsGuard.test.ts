import { isPlatformOperationsTenant } from './OperationsGuard';

describe('billing operations tenant guard', () => {
  it('allows the platform tenant context', () => {
    const tenantId = '000000';
    expect(isPlatformOperationsTenant(tenantId)).toBe(true);
  });

  it.each([
    undefined,
    null,
    '',
    '720978',
    '622393',
  ])('blocks missing or non-platform tenant %s', (tenantId) => {
    expect(isPlatformOperationsTenant(tenantId)).toBe(false);
  });
});
