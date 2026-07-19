import {
  findCallConfigByKey,
  getCallConfigKey,
  sortCallConfigsByIdentity,
} from './_shared';

describe('collection strategy call config ordering', () => {
  it('places project employee before other configured identities', () => {
    const sorted = sortCallConfigsByIdentity([
      { id: 1, personaId: 10, identityName: '企业客服' },
      { id: 2, personaId: 10, identityName: '企业法务' },
      { id: 3, personaId: 10, identityName: '律师' },
      { id: 4, personaId: 10, identityName: '项目员工' },
    ]);

    expect(sorted.map((item) => item.identityName)).toEqual([
      '项目员工',
      '企业客服',
      '企业法务',
      '律师',
    ]);
  });

  it('keeps unknown identities stable after known identities', () => {
    const sorted = sortCallConfigsByIdentity([
      { id: 1, personaId: 10, identityName: '临时角色 A' },
      { id: 2, personaId: 10, identityName: '项目员工' },
      { id: 3, personaId: 10, identityName: '临时角色 B' },
    ]);

    expect(sorted.map((item) => item.identityName)).toEqual([
      '项目员工',
      '临时角色 A',
      '临时角色 B',
    ]);
  });

  it('matches call config tab keys without coercing ids to numbers', () => {
    const list = [
      { id: '9007199254740993123', personaId: 10, identityName: '项目员工' },
      { id: '9007199254740993124', personaId: 10, identityName: '律师' },
    ];

    expect(getCallConfigKey(list[1].id)).toBe('9007199254740993124');
    expect(findCallConfigByKey(list, '9007199254740993124')?.identityName).toBe(
      '律师',
    );
  });
});
