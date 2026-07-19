import { normalizeInstrumentMetricTitle } from './_shared';

describe('normalizeInstrumentMetricTitle', () => {
  it('maps the legacy litigation metric label to the current wording', () => {
    expect(
      normalizeInstrumentMetricTitle('已经入法诉程序被告数', '已进入法诉程序'),
    ).toBe('已进入法诉程序');
  });

  it('falls back when the backend metric label is empty', () => {
    expect(normalizeInstrumentMetricTitle('', '已进入法诉程序')).toBe(
      '已进入法诉程序',
    );
  });

  it('keeps unrelated backend metric labels unchanged', () => {
    expect(
      normalizeInstrumentMetricTitle('已发送催收函件', '已发送催收函件'),
    ).toBe('已发送催收函件');
  });
});
