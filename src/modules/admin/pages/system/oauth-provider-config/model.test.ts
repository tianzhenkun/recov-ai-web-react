import type {
  OAuthProviderConfig,
  OAuthProviderDefinition,
} from '@/modules/admin/services/oauth-config';
import {
  isOAuthRevisionConflict,
  mergeOAuthProviderRows,
  OAUTH_SCOPE_MAX_COUNT,
  OAUTH_SCOPE_MAX_LENGTH,
  toOAuthProviderFormValues,
  toOAuthProviderSavePayload,
  validateOAuthScopes,
} from './model';

const definitions: OAuthProviderDefinition[] = [
  { providerCode: 'github', displayName: 'GitHub' },
  { providerCode: 'gitee', displayName: 'Gitee' },
];

const giteeConfig: OAuthProviderConfig = {
  providerCode: 'gitee',
  displayName: 'Gitee',
  configName: 'Gitee 登录',
  status: 'DRAFT',
  schemaVersion: 1,
  revision: 3,
  clientId: 'client-id',
  redirectUri: 'https://example.com/social-callback?source=gitee',
  clientSecretConfigured: true,
  stackOverflowKeyConfigured: false,
  checkStatus: 'PASSED',
};

describe('OAuth provider config model', () => {
  it('keeps the provider catalog complete while overlaying persisted configs', () => {
    expect(mergeOAuthProviderRows(definitions, [giteeConfig])).toEqual([
      expect.objectContaining({
        providerCode: 'github',
        displayName: 'GitHub',
        configured: false,
      }),
      expect.objectContaining({
        providerCode: 'gitee',
        displayName: 'Gitee',
        configured: true,
        revision: 3,
      }),
    ]);
  });

  it('never hydrates secret values into an edit form', () => {
    expect(toOAuthProviderFormValues(giteeConfig)).toEqual(
      expect.objectContaining({
        clientId: 'client-id',
        redirectUri: 'https://example.com/social-callback?source=gitee',
      }),
    );
    expect(toOAuthProviderFormValues(giteeConfig)).not.toHaveProperty(
      'clientSecret',
    );
    expect(toOAuthProviderFormValues(giteeConfig)).not.toHaveProperty(
      'stackOverflowKey',
    );
  });

  it('recognizes stale revision failures that require a refresh', () => {
    expect(
      isOAuthRevisionConflict(new Error('配置已被其他操作更新，请刷新后重试')),
    ).toBe(true);
    expect(isOAuthRevisionConflict(new Error('第三方服务不可用'))).toBe(false);
  });

  it('only carries revision for updates', () => {
    const values = {
      clientId: 'client-id',
      clientSecret: 'client-secret',
    };

    expect(toOAuthProviderSavePayload(values)).not.toHaveProperty('revision');
    expect(toOAuthProviderSavePayload(values, 3)).toEqual(
      expect.objectContaining({ revision: 3 }),
    );
  });

  it('matches the backend scope count and item length limits', () => {
    expect(
      validateOAuthScopes(
        Array.from({ length: OAUTH_SCOPE_MAX_COUNT }, (_, i) => `scope-${i}`),
      ),
    ).toBeUndefined();
    expect(
      validateOAuthScopes(
        Array.from(
          { length: OAUTH_SCOPE_MAX_COUNT + 1 },
          (_, i) => `scope-${i}`,
        ),
      ),
    ).toBe('授权范围最多配置50项');
    expect(
      validateOAuthScopes(['s'.repeat(OAUTH_SCOPE_MAX_LENGTH)]),
    ).toBeUndefined();
    expect(validateOAuthScopes(['s'.repeat(OAUTH_SCOPE_MAX_LENGTH + 1)])).toBe(
      '单个授权范围不能超过128个字符',
    );
  });
});
