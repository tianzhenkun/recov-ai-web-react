import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, waitFor } from '@testing-library/react';
import React, { createRef } from 'react';
import TemplateEditor, { type TemplateEditorHandle } from './index';

const componentDir = __dirname;

const readSource = (relativePath: string) =>
  readFileSync(join(componentDir, relativePath), 'utf8');

describe('TemplateEditor HTML fidelity conventions', () => {
  it('keeps document headings editable instead of downgrading final document HTML', () => {
    const source = readSource('index.tsx');

    expect(source).toContain('heading: {');
    expect(source).toContain('levels: [1, 2, 3]');
    expect(source).not.toContain('heading: false');
  });

  it('keeps text alignment available on headings and paragraphs', () => {
    const source = readSource('index.tsx');

    expect(source).toContain("types: ['paragraph', 'heading']");
  });

  it('keeps backend paragraph indentation editable and serializable', () => {
    const source = readSource('index.tsx');

    expect(source).toContain(
      "import DocumentBlockStyle from './extensions/DocumentBlockStyle'",
    );
    expect(source).toContain('DocumentBlockStyle');
  });

  it('styles HTML headings in the editing surface like document headings', () => {
    const styles = readSource('templateEditor.css');

    expect(styles).toContain('.template-editor-body .ProseMirror h1');
    expect(styles).toContain('font-weight: 600');
  });

  it('renders seal placeholders as readable edit placeholders', () => {
    const styles = readSource('templateEditor.css');

    expect(styles).toContain('display: inline-flex');
    expect(styles).toContain('align-items: center');
    expect(styles).toContain('justify-content: center');
  });

  it('exposes the live editor DOM html for business actions that must preserve custom atom nodes', async () => {
    const editorRef = createRef<TemplateEditorHandle>();

    render(
      <TemplateEditor
        ref={editorRef}
        outputType="html"
        value='<p>正文</p><p><span data-seal-placeholder="seal_group" data-seal-codes="company_seal" data-width-mm="36" data-height-mm="36"></span></p>'
      />,
    );

    await waitFor(() => {
      expect(editorRef.current?.getDomHtml).toEqual(expect.any(Function));
    });
    expect(editorRef.current?.getDomHtml?.()).toContain(
      'data-seal-placeholder="seal_group"',
    );
  });

  it('guards TipTap view access because the editor view may not be mounted during early effects', () => {
    const source = readSource('index.tsx');

    expect(source).toContain('const isEditorViewAvailable = (');
    expect(source).toContain('const getEditorDomHtml = (');
    expect(source).toContain('return instance.view.dom.innerHTML');
    expect(source).toContain('catch');
    expect(source).toContain("return ''");
    expect(source).toContain('if (!isEditorViewAvailable(editor)) return;');
    expect(source).not.toContain(
      'const editorDomHtml = instance.view.dom.innerHTML',
    );
  });

  it('renders variables as compact inline markers without distorting document text', () => {
    const styles = readSource('templateEditor.css');
    const variableRuleStart = styles.indexOf(
      '.template-editor-body .tiptap-variable {',
    );
    const sealRuleStart = styles.indexOf(
      '.template-editor-body .instrument-seal-placeholder {',
    );
    const variableRule = styles.slice(variableRuleStart, sealRuleStart);

    expect(variableRule).toMatch(/\n\s*display: inline;\n/);
    expect(variableRule).not.toContain('display: inline-flex');
    expect(variableRule).toContain('margin: 0');
    expect(styles).toContain('padding: 0 4px');
    expect(styles).toContain('font-size: inherit');
    expect(styles).toContain('line-height: 1.4');
  });
});
