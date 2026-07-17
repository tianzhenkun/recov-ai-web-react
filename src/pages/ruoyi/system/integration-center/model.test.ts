import type { RuoyiRoute } from '@/services/ruoyi/menu';
import { hasInstalledRoute } from './model';

const paymentPath = '/sys-conf/payment-channel-config';

describe('hasInstalledRoute', () => {
  it.each([
    ['absolute route', [{ path: paymentPath }]],
    [
      'relative child route',
      [
        {
          path: '/sys-conf',
          children: [{ path: 'payment-channel-config' }],
        },
      ],
    ],
    [
      'fully relative nested route',
      [
        {
          path: 'sys-conf',
          children: [{ path: 'payment-channel-config/' }],
        },
      ],
    ],
  ] as [
    string,
    RuoyiRoute[],
  ][])('recognizes an installed payment page from an %s', (_label, routes) => {
    expect(hasInstalledRoute(routes, paymentPath)).toBe(true);
  });

  it('does not infer payment availability from unrelated routes', () => {
    expect(
      hasInstalledRoute(
        [
          {
            path: '/sys-conf',
            children: [{ path: 'oss-config/index' }],
          },
        ],
        paymentPath,
      ),
    ).toBe(false);
  });
});
