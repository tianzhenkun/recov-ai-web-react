import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  htmlToEditorHtml,
  serializeHtmlWithVariableTokens,
} from './templateVariable';

const readSource = (relativePath: string) =>
  readFileSync(join(__dirname, relativePath), 'utf8');

describe('template variable html conversion', () => {
  it('converts raw html variable tokens into editor variable nodes', () => {
    const html = htmlToEditorHtml(
      '<h1 style="text-align:center;">起诉状</h1><p>被告：{{debtorName}}</p>',
      [{ label: '债务人姓名', value: 'debtorName' }],
      { enableVariables: true },
    );

    expect(html).toContain('<h1 style="text-align:center;">起诉状</h1>');
    expect(html).toContain('data-type="variable"');
    expect(html).toContain('data-name="debtorName"');
    expect(html).toContain('data-label="债务人姓名"');
    expect(html).toContain('data-token="{{debtorName}}"');
    expect(html).toContain('债务人姓名');
    expect(html).not.toContain('被告：{{debtorName}}');
  });

  it('does not rewrite variable-like text inside element attributes', () => {
    const html = htmlToEditorHtml(
      '<p data-token="{{debtorName}}">被告：{{debtorName}}</p>',
      [{ label: '债务人姓名', value: 'debtorName' }],
      { enableVariables: true },
    );

    expect(html).toContain('data-token="{{debtorName}}"');
    expect(html).toContain('data-type="variable"');
  });

  it('normalizes legacy block alignment attributes before editor parsing', () => {
    const html = htmlToEditorHtml('<h1 align="center">企业催收函</h1>');

    expect(html).toContain('<h1 style="text-align: center;">企业催收函</h1>');
    expect(html).not.toContain('align="center"');
  });

  it('normalizes supported styles from backend full document html', () => {
    const html = htmlToEditorHtml(
      `<!doctype html>
<html>
<head>
  <meta charset='UTF-8'>
  <style>
    @page{size:A4;margin:20mm}
    body{font-family:Arial,'Microsoft YaHei',sans-serif;color:#111827;font-size:14px;line-height:1.9}
    h1{text-align:center;font-size:24px;margin:0 0 26px;font-weight:700}
    p{margin:8px 0}.indent{text-indent:2em}.sign{margin-top:34px;text-align:right}.seal{display:inline-block;width:36mm;height:36mm;vertical-align:middle}
  </style>
</head>
<body>
  <h1>企业催收函</h1>
  <p>{{name}}：</p>
  <p class='indent'>经核对，您在 {{organization}} 项目项下仍存在未结清款项。</p>
  <div class='sign'>
    <p>{{organization}}</p>
    <p><span class='seal' data-seal-placeholder='seal_group' data-seal-codes='company_seal' data-width-mm='36' data-height-mm='36'></span></p>
    <p>{{currentDate}}</p>
  </div>
</body>
</html>`,
      [
        { label: '客户称谓', value: 'name' },
        { label: '所属项目', value: 'organization' },
        { label: '当前日期', value: 'currentDate' },
      ],
      { enableVariables: true },
    );

    expect(html).not.toContain('<html');
    expect(html).not.toContain('<style');
    expect(html).toContain('<h1 style="text-align: center;">企业催收函</h1>');
    expect(html).toContain('class="indent" style="text-indent: 2em;"');
    expect(html).toContain('<p style="text-align: right;">');
    expect(html).toContain('data-type="variable"');
    expect(html).toContain('data-name="organization"');
    expect(html).toContain('data-seal-placeholder="seal_group"');
    expect(html).toContain('data-seal-codes="company_seal"');
  });

  it('removes visual spaces around variables in Chinese template text', () => {
    const html = htmlToEditorHtml(
      '<p>经核对，您在 {{organization}} 项目项下仍存在未结清款项。</p>',
      [{ label: '所属项目', value: 'organization' }],
      { enableVariables: true },
    );

    expect(html).toContain('经核对，您在<span data-type="variable"');
    expect(html).toContain('</span>项目项下仍存在未结清款项。');
    expect(html).not.toContain('您在 <span');
    expect(html).not.toContain('</span> 项目项下');
  });

  it('keeps English spaces around variables while serializing Chinese spacing tightly', () => {
    const html = serializeHtmlWithVariableTokens(
      '<p>您在 <span data-type="variable" data-name="organization" data-label="所属项目">所属项目</span> 项目项下</p><p>Hello <span data-type="variable" data-name="name" data-label="客户称谓">客户称谓</span> again</p>',
    );

    expect(html).toBe(
      '<p>您在{{organization}}项目项下</p><p>Hello {{name}} again</p>',
    );
  });

  it('keeps raw variable tokens when variables are disabled', () => {
    const html = htmlToEditorHtml('<p>被告：{{debtorName}}</p>', [], {
      enableVariables: false,
    });

    expect(html).toContain('{{debtorName}}');
    expect(html).not.toContain('data-type="variable"');
  });

  it('serializes editor variable nodes as backend template tokens only', () => {
    const html = serializeHtmlWithVariableTokens(
      '<p>客户：<span data-type="variable" data-name="name" data-label="客户称谓" data-token="{{name}}" class="tiptap-variable" contenteditable="false">客户称谓</span></p>',
    );

    expect(html).toBe('<p>客户：{{name}}</p>');
    expect(html).not.toContain('data-type="variable"');
    expect(html).not.toContain('tiptap-variable');
    expect(html).not.toContain('contenteditable');
  });

  it('delegates html token rewriting to a focused utility', () => {
    const source = readSource('templateVariable.ts');

    expect(source).toContain(
      "import { convertHtmlVariableTokensToEditorNodes } from './htmlVariableTokens'",
    );
    expect(source).not.toContain('createTreeWalker');
    expect(source).not.toContain('NodeFilter.SHOW_TEXT');
  });
});
