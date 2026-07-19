import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import dayjs from 'dayjs';
import routes from '../../../../../../config/routes';
import {
  assertLatestIssueRevisionMatches,
  buildIssueLicenseRequest,
  buildIssueRequestWithPreviousSnapshot,
  getRemovedProductCodes,
  toIssueProductFormValues,
} from './model';

type RouteLike = {
  path?: string;
  component?: string;
  hideInMenu?: boolean;
  routes?: RouteLike[];
};

const flattenRoutes = (items: RouteLike[]): RouteLike[] =>
  items.flatMap((item) => [
    item,
    ...(item.routes ? flattenRoutes(item.routes) : []),
  ]);

describe('license management route', () => {
  it('registers one hidden static route and leaves menu visibility to RuoYi', () => {
    const route = flattenRoutes(routes).find(
      (item) => item.path === '/sys-conf/license-management',
    );

    expect(route).toMatchObject({
      component: './ruoyi/system/license-management',
      hideInMenu: true,
    });
  });
});

describe('license issue form rules', () => {
  const validFrom = dayjs('2026-07-13T10:00:00+08:00');
  const validUntil = dayjs('2027-07-13T10:00:00+08:00');

  it('builds independent permanent and timed product grants', () => {
    const request = buildIssueLicenseRequest({
      issueType: 'PRODUCT_CHANGE',
      issueReason: ' 增加智能销售产品 ',
      products: [
        {
          productCode: 'recov',
          permanent: true,
          validFrom,
          validUntil,
        },
        {
          productCode: 'sales',
          permanent: false,
          validFrom,
          validUntil,
        },
      ],
    });

    expect(request).toEqual({
      issueType: 'PRODUCT_CHANGE',
      issueReason: '增加智能销售产品',
      products: [
        {
          productCode: 'recov',
          permanent: true,
          validFrom: validFrom.toISOString(),
          validUntil: undefined,
        },
        {
          productCode: 'sales',
          permanent: false,
          validFrom: validFrom.toISOString(),
          validUntil: validUntil.toISOString(),
        },
      ],
    });
    expect(request).not.toHaveProperty('licenseRevision');
    expect(JSON.stringify(request)).not.toMatch(/private.?key/i);
  });

  it('rejects timed grants without a valid end time', () => {
    expect(() =>
      buildIssueLicenseRequest({
        issueType: 'RENEWAL',
        issueReason: '续期',
        products: [
          {
            productCode: 'recov',
            permanent: false,
            validFrom,
          },
        ],
      }),
    ).toThrow('限时授权必须填写结束时间');

    expect(() =>
      buildIssueLicenseRequest({
        issueType: 'RENEWAL',
        issueReason: '续期',
        products: [
          {
            productCode: 'recov',
            permanent: false,
            validFrom,
            validUntil: validFrom,
          },
        ],
      }),
    ).toThrow('结束时间必须晚于生效时间');
  });

  it('rejects duplicated products instead of silently overwriting grants', () => {
    expect(() =>
      buildIssueLicenseRequest({
        issueType: 'INITIAL',
        issueReason: '首次签发',
        products: [
          { productCode: 'recov', permanent: true, validFrom },
          { productCode: 'recov', permanent: true, validFrom },
        ],
      }),
    ).toThrow('不能重复选择同一产品');
  });

  it('shows revision as server-generated information instead of an editable field', () => {
    const source = readFileSync(
      join(__dirname, 'IssueLicenseModal.tsx'),
      'utf8',
    );

    expect(source).toContain('最终 revision 由后端在事务中生成');
    expect(source).not.toMatch(/name=["']licenseRevision["']/);
    expect(source).not.toMatch(/private.?key/i);
  });

  it('restores the complete previous product snapshot for later issues', () => {
    const products = toIssueProductFormValues([
      {
        productCode: 'recov',
        validFrom: '2026-07-13T02:00:00.000Z',
        validUntil: null,
      },
      {
        productCode: 'sales',
        validFrom: '2026-07-13T02:00:00.000Z',
        validUntil: '2027-07-13T02:00:00.000Z',
      },
    ]);

    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      productCode: 'recov',
      permanent: true,
    });
    expect(products[0].validFrom?.toISOString()).toBe(
      '2026-07-13T02:00:00.000Z',
    );
    expect(products[0].validUntil).toBeUndefined();
    expect(products[1]).toMatchObject({
      productCode: 'sales',
      permanent: false,
    });
    expect(products[1].validUntil?.toISOString()).toBe(
      '2027-07-13T02:00:00.000Z',
    );
  });

  it('rejects a stale or damaged latest issue revision before restoring its snapshot', () => {
    expect(() => assertLatestIssueRevisionMatches('2', '2')).not.toThrow();
    expect(() => assertLatestIssueRevisionMatches(2, '2')).not.toThrow();

    expect(() => assertLatestIssueRevisionMatches('1', '2')).toThrow(
      '上一版许可证revision与当前部署不一致（部署revision 2，签发记录revision 1）',
    );
    expect(() => assertLatestIssueRevisionMatches(undefined, '2')).toThrow(
      '上一版许可证签发记录缺少有效revision',
    );
    expect(() => assertLatestIssueRevisionMatches('2', 'invalid')).toThrow(
      '当前部署的最新revision无效，无法加载上一版许可证',
    );
  });

  it('rejects an empty or damaged previous issue snapshot', () => {
    expect(() => toIssueProductFormValues([])).toThrow(
      '上一版许可证没有产品授权快照',
    );
    expect(() =>
      toIssueProductFormValues([
        {
          productCode: 'recov',
          validFrom: 'not-a-date',
          validUntil: null,
        },
      ]),
    ).toThrow('recov的上一版生效时间无效');
  });

  it('lists every previous product omitted by the next full snapshot', () => {
    expect(
      getRemovedProductCodes(
        [
          {
            productCode: 'recov',
            validFrom: '2026-07-13T02:00:00.000Z',
            validUntil: null,
          },
          {
            productCode: 'sales',
            validFrom: '2026-07-13T02:00:00.000Z',
            validUntil: null,
          },
        ],
        [{ productCode: 'sales' }],
      ),
    ).toEqual(['recov']);
  });

  it('forces replacement to submit the unchanged previous snapshot', () => {
    const request = buildIssueRequestWithPreviousSnapshot(
      {
        issueType: 'REPLACEMENT',
        issueReason: '许可证文件替换',
        products: [
          {
            productCode: 'sales',
            permanent: true,
            validFrom,
          },
        ],
      },
      [
        {
          productCode: 'recov',
          validFrom: '2026-07-13T02:00:00.000Z',
          validUntil: '2027-07-13T02:00:00.000Z',
        },
      ],
    );

    expect(request.products).toEqual([
      {
        productCode: 'recov',
        permanent: false,
        validFrom: '2026-07-13T02:00:00.000Z',
        validUntil: '2027-07-13T02:00:00.000Z',
      },
    ]);
  });

  it('requires renewal to preserve the previous product set', () => {
    expect(() =>
      buildIssueRequestWithPreviousSnapshot(
        {
          issueType: 'RENEWAL',
          issueReason: '仅续期智能销售',
          products: [
            {
              productCode: 'sales',
              permanent: false,
              validFrom,
              validUntil,
            },
          ],
        },
        [
          {
            productCode: 'recov',
            validFrom: validFrom.toISOString(),
            validUntil: null,
          },
          {
            productCode: 'sales',
            validFrom: validFrom.toISOString(),
            validUntil: validUntil.toISOString(),
          },
        ],
      ),
    ).toThrow('续期必须保留上一版全部产品，不能增加、删除或替换产品');
  });

  it('requires product change to actually change the product set', () => {
    expect(() =>
      buildIssueRequestWithPreviousSnapshot(
        {
          issueType: 'PRODUCT_CHANGE',
          issueReason: '误选产品调整',
          products: [
            {
              productCode: 'recov',
              permanent: false,
              validFrom,
              validUntil,
            },
          ],
        },
        [
          {
            productCode: 'recov',
            validFrom: validFrom.toISOString(),
            validUntil: null,
          },
        ],
      ),
    ).toThrow('产品调整必须增加、删除或替换至少一个产品');
  });
});
