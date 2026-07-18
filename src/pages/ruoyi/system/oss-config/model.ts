import type { OssConfigForm, OssConfigItem } from '@/services/ruoyi/oss-config';

export type OssConfigEditingRecord = OssConfigForm & {
  secretKeyConfigured?: boolean;
};

export const toOssEditingRecord = (
  item: OssConfigItem,
): OssConfigEditingRecord => ({
  ossConfigId: item.ossConfigId,
  configKey: item.configKey,
  accessKey: item.accessKey,
  bucketName: item.bucketName,
  prefix: item.prefix,
  endpoint: item.endpoint,
  domain: item.domain,
  isHttps: item.isHttps,
  accessPolicy: item.accessPolicy,
  region: item.region,
  status: item.status,
  remark: item.remark,
  secretKeyConfigured: item.secretKeyConfigured,
});

export const buildOssConfigPayload = (
  record: OssConfigEditingRecord | undefined,
  values: OssConfigForm,
): OssConfigForm => {
  const merged = { ...(record || {}), ...values };
  const secretKey =
    typeof values.secretKey === 'string' && values.secretKey.trim()
      ? values.secretKey
      : undefined;

  return {
    ossConfigId: merged.ossConfigId,
    configKey: merged.configKey,
    accessKey: merged.accessKey,
    bucketName: merged.bucketName,
    prefix: merged.prefix,
    endpoint: merged.endpoint,
    domain: merged.domain,
    isHttps: merged.isHttps,
    accessPolicy: merged.accessPolicy,
    region: merged.region,
    status: merged.status,
    remark: merged.remark,
    ...(secretKey === undefined ? {} : { secretKey }),
  };
};

export const isOssSecretRequired = (ossConfigId?: number | string) =>
  ossConfigId === undefined ||
  ossConfigId === null ||
  String(ossConfigId).trim() === '';
