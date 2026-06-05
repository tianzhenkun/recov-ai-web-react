import { convertHtmlVariableTokensToEditorNodes } from './htmlVariableTokens';

const renderVariable = (raw: string) =>
  `<span data-type="variable" data-name="${raw.trim()}">${raw.trim()}</span>`;

describe('html variable token conversion', () => {
  it('converts raw variable tokens in html text nodes', () => {
    const html = convertHtmlVariableTokensToEditorNodes(
      '<h1 style="text-align:center;">起诉状</h1><p>被告：{{ debtorName }}</p>',
      renderVariable,
    );

    expect(html).toContain('<h1 style="text-align:center;">起诉状</h1>');
    expect(html).toContain('被告：<span data-type="variable"');
    expect(html).toContain('data-name="debtorName"');
    expect(html).not.toContain('被告：{{ debtorName }}');
  });

  it('does not rewrite variable-like text inside element attributes', () => {
    const html = convertHtmlVariableTokensToEditorNodes(
      '<p data-token="{{debtorName}}">被告：{{debtorName}}</p>',
      renderVariable,
    );

    expect(html).toContain('data-token="{{debtorName}}"');
    expect(html).toContain('被告：<span data-type="variable"');
  });

  it('can keep raw tokens when conversion is disabled', () => {
    const html = convertHtmlVariableTokensToEditorNodes(
      '<p>被告：{{debtorName}}</p>',
      renderVariable,
      { enabled: false },
    );

    expect(html).toBe('<p>被告：{{debtorName}}</p>');
  });
});
