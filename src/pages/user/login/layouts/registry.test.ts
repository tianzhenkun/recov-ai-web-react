import {
  getLoginLayoutComponent,
  listLoginLayoutOptions,
  resolveLoginLayoutVariant,
  validateLoginLayoutCode,
} from './registry';

describe('login layout registry', () => {
  it('registers only the migrated default layout', () => {
    expect(listLoginLayoutOptions()).toEqual([
      {
        label: '默认登录页',
        value: 'default',
      },
    ]);
    expect(getLoginLayoutComponent('default')).toHaveProperty(
      '$$typeof',
      Symbol.for('react.lazy'),
    );
  });

  it('uses the site variant when local override is AUTO', () => {
    expect(
      resolveLoginLayoutVariant({
        isProduction: false,
        localOverride: 'AUTO',
        siteVariant: 'default',
      }),
    ).toEqual({ ok: true, variant: 'default' });
  });

  it('allows an explicit layout override only during local development', () => {
    expect(
      resolveLoginLayoutVariant({
        isProduction: false,
        localOverride: 'default',
        siteVariant: 'unsupported-site-layout',
      }),
    ).toEqual({ ok: true, variant: 'default' });

    expect(
      resolveLoginLayoutVariant({
        isProduction: true,
        localOverride: 'default',
        siteVariant: 'unsupported-site-layout',
      }),
    ).toMatchObject({
      ok: false,
      requestedVariant: 'unsupported-site-layout',
    });
  });

  it('returns a friendly error for an unknown layout', () => {
    const result = resolveLoginLayoutVariant({
      isProduction: false,
      localOverride: 'missing-layout',
      siteVariant: 'default',
    });

    expect(result).toMatchObject({
      ok: false,
      requestedVariant: 'missing-layout',
      supportedVariants: ['default'],
    });
    if (!result.ok) {
      expect(result.message).toContain('不支持的登录布局');
      expect(result.message).toContain('default');
    }
  });

  it('keeps layout codes compatible with the shared site contract', () => {
    expect(validateLoginLayoutCode('sales-agent')).toBe('sales-agent');
    expect(() => validateLoginLayoutCode('AUTO')).toThrow('保留字');
    expect(() => validateLoginLayoutCode('Sales_Agent')).toThrow(
      '[a-z][a-z0-9-]{0,63}',
    );
  });
});
