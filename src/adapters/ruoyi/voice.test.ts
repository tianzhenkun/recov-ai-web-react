describe('voice api channel', () => {
  const originalVoiceApi = process.env.UMI_APP_VOICE_API;

  afterEach(() => {
    if (originalVoiceApi === undefined) {
      delete process.env.UMI_APP_VOICE_API;
    } else {
      process.env.UMI_APP_VOICE_API = originalVoiceApi;
    }
    jest.resetModules();
  });

  it('builds a same-origin url from the configured logical channel', () => {
    process.env.UMI_APP_VOICE_API = '/local-voice';

    jest.isolateModules(() => {
      const { getVoiceApiUrl } = require('./voice');
      expect(getVoiceApiUrl('/calls/100')).toBe('/local-voice/calls/100');
    });
  });

  it('fails clearly when the optional voice channel is disabled', () => {
    process.env.UMI_APP_VOICE_API = '';

    jest.isolateModules(() => {
      const { getVoiceApiUrl } = require('./voice');
      expect(() => getVoiceApiUrl('/calls')).toThrow(
        '当前站点未配置 Voice API 通道',
      );
    });
  });
});
