import type { OssConfigItem } from '@/services/ruoyi/oss-config';
import {
  buildOssConfigPayload,
  isOssSecretRequired,
  toOssEditingRecord,
} from './model';

describe('OSS configuration secret contract', () => {
  it('only exposes whether a secret is configured on readable items', () => {
    type HasReadableSecret = 'secretKey' extends keyof OssConfigItem
      ? true
      : false;
    type HasConfiguredMarker = 'secretKeyConfigured' extends keyof OssConfigItem
      ? true
      : false;

    const hasReadableSecret: HasReadableSecret = false;
    const hasConfiguredMarker: HasConfiguredMarker = true;

    expect(hasReadableSecret).toBe(false);
    expect(hasConfiguredMarker).toBe(true);
  });

  it('discards a legacy readable secret before populating the edit form', () => {
    const editingRecord = toOssEditingRecord({
      ossConfigId: '12',
      configKey: 'minio',
      secretKeyConfigured: true,
      secretKey: 'must-not-be-rendered',
    } as OssConfigItem & { secretKey: string });

    expect(editingRecord).not.toHaveProperty('secretKey');
    expect(editingRecord.secretKeyConfigured).toBe(true);
  });

  it.each([
    undefined,
    '',
    '   ',
  ])('omits an unchanged edit secret represented by %p', (secretKey) => {
    const payload = buildOssConfigPayload(
      {
        ossConfigId: '12',
        configKey: 'minio',
        secretKeyConfigured: true,
      },
      {
        configKey: 'minio',
        accessKey: 'access-key',
        secretKey,
        bucketName: 'bucket',
      },
    );

    expect(payload).not.toHaveProperty('secretKey');
  });

  it('includes a newly supplied secret without changing its contents', () => {
    const payload = buildOssConfigPayload(
      {
        ossConfigId: '12',
        configKey: 'minio',
        secretKeyConfigured: true,
      },
      {
        configKey: 'minio',
        accessKey: 'access-key',
        secretKey: ' new-secret ',
        bucketName: 'bucket',
      },
    );

    expect(payload.secretKey).toBe(' new-secret ');
  });

  it('requires a secret only while creating a new configuration', () => {
    expect(isOssSecretRequired(undefined)).toBe(true);
    expect(isOssSecretRequired('')).toBe(true);
    expect(isOssSecretRequired('12')).toBe(false);
    expect(isOssSecretRequired(12)).toBe(false);
  });
});
