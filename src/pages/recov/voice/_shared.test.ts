import { getVoiceGenderTagStyle } from './_shared';

describe('voice shared helpers', () => {
  it('builds gender tag style from theme tokens', () => {
    expect(
      getVoiceGenderTagStyle({
        colorPrimary: '#f5222d',
        colorPrimaryBg: '#fff1f0',
        colorPrimaryBorder: '#ffa39e',
      }),
    ).toEqual({
      backgroundColor: '#fff1f0',
      borderColor: '#ffa39e',
      color: '#f5222d',
    });
  });
});
