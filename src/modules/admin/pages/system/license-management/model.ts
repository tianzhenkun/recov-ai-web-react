import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type {
  LicenseIssueCreatePayload,
  LicenseIssueProductPayload,
  LicenseIssueType,
  LicenseProductGrant,
} from '@/modules/admin/services/license';

export type LicenseIssueProductFormValue = {
  productCode?: string;
  permanent?: boolean;
  validFrom?: Dayjs;
  validUntil?: Dayjs;
};

export type LicenseIssueFormValues = {
  issueType?: LicenseIssueType;
  issueReason?: string;
  products?: LicenseIssueProductFormValue[];
};

const requireText = (value: string | undefined, message: string) => {
  const normalized = (value || '').trim();
  if (!normalized) throw new Error(message);
  return normalized;
};

export const buildIssueLicenseRequest = (
  values: LicenseIssueFormValues,
): LicenseIssueCreatePayload => {
  const issueType = requireText(values.issueType, '请选择签发类型');
  const issueReason = requireText(values.issueReason, '请填写签发原因');
  const products = values.products || [];

  if (products.length === 0) {
    throw new Error('请至少选择一个授权产品');
  }

  const selectedCodes = new Set<string>();
  const normalizedProducts = products.map((product) => {
    const productCode = requireText(product.productCode, '请选择授权产品');
    if (selectedCodes.has(productCode)) {
      throw new Error('不能重复选择同一产品');
    }
    selectedCodes.add(productCode);

    if (!product.validFrom) {
      throw new Error(`${productCode}必须填写生效时间`);
    }

    const permanent = product.permanent !== false;
    if (!permanent && !product.validUntil) {
      throw new Error(`${productCode}限时授权必须填写结束时间`);
    }
    if (
      !permanent &&
      product.validUntil &&
      !product.validUntil.isAfter(product.validFrom)
    ) {
      throw new Error(`${productCode}结束时间必须晚于生效时间`);
    }

    return {
      productCode,
      permanent,
      validFrom: product.validFrom.toISOString(),
      validUntil: permanent ? undefined : product.validUntil?.toISOString(),
    };
  });

  return {
    issueType: issueType as LicenseIssueType,
    issueReason,
    products: normalizedProducts,
  };
};

export const getNextRevision = (lastIssuedRevision?: string) => {
  try {
    return (BigInt(lastIssuedRevision || '0') + 1n).toString();
  } catch {
    return '1';
  }
};

const normalizePositiveRevision = (value: unknown) => {
  if (!['string', 'number', 'bigint'].includes(typeof value)) return undefined;
  const revision = String(value).trim();
  return /^[1-9]\d*$/.test(revision) ? revision : undefined;
};

export const assertLatestIssueRevisionMatches = (
  latestIssueRevision: unknown,
  deploymentRevision: unknown,
) => {
  const expected = normalizePositiveRevision(deploymentRevision);
  if (!expected) {
    throw new Error('当前部署的最新revision无效，无法加载上一版许可证');
  }

  const actual = normalizePositiveRevision(latestIssueRevision);
  if (!actual) {
    throw new Error('上一版许可证签发记录缺少有效revision');
  }
  if (actual !== expected) {
    throw new Error(
      `上一版许可证revision与当前部署不一致（部署revision ${expected}，签发记录revision ${actual}）`,
    );
  }
};

export const toIssueProductFormValues = (
  products: LicenseProductGrant[],
): LicenseIssueProductFormValue[] => {
  if (products.length === 0) {
    throw new Error('上一版许可证没有产品授权快照');
  }

  return products.map((product) => {
    const productCode = requireText(
      product.productCode,
      '上一版许可证包含无效产品编码',
    );
    const validFrom = dayjs(product.validFrom);
    if (!validFrom.isValid()) {
      throw new Error(`${productCode}的上一版生效时间无效`);
    }

    const validUntil = product.validUntil
      ? dayjs(product.validUntil)
      : undefined;
    if (validUntil && !validUntil.isValid()) {
      throw new Error(`${productCode}的上一版结束时间无效`);
    }
    if (validUntil && !validUntil.isAfter(validFrom)) {
      throw new Error(`${productCode}的上一版结束时间必须晚于生效时间`);
    }

    return {
      productCode,
      permanent: !validUntil,
      validFrom,
      validUntil,
    };
  });
};

export const getRemovedProductCodes = (
  previousProducts: LicenseProductGrant[],
  nextProducts: Pick<LicenseIssueProductPayload, 'productCode'>[],
) => {
  const nextCodes = new Set(nextProducts.map((product) => product.productCode));
  return previousProducts
    .map((product) => product.productCode)
    .filter((productCode) => !nextCodes.has(productCode))
    .sort();
};

const hasSameProductSet = (
  previousProducts: LicenseProductGrant[],
  nextProducts: LicenseIssueProductPayload[],
) => {
  const previousCodes = new Set(
    previousProducts.map((product) => product.productCode),
  );
  const nextCodes = new Set(nextProducts.map((product) => product.productCode));
  return (
    previousCodes.size === nextCodes.size &&
    [...previousCodes].every((productCode) => nextCodes.has(productCode))
  );
};

export const buildIssueRequestWithPreviousSnapshot = (
  values: LicenseIssueFormValues,
  previousProducts: LicenseProductGrant[],
) => {
  const request = buildIssueLicenseRequest(
    values.issueType === 'REPLACEMENT'
      ? {
          ...values,
          products: toIssueProductFormValues(previousProducts),
        }
      : values,
  );

  if (
    request.issueType === 'RENEWAL' &&
    !hasSameProductSet(previousProducts, request.products)
  ) {
    throw new Error('续期必须保留上一版全部产品，不能增加、删除或替换产品');
  }
  if (
    request.issueType === 'PRODUCT_CHANGE' &&
    hasSameProductSet(previousProducts, request.products)
  ) {
    throw new Error('产品调整必须增加、删除或替换至少一个产品');
  }
  return request;
};
