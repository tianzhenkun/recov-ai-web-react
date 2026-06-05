import { Editor } from '@tiptap/core';
import { TextAlign } from '@tiptap/extension-text-align';
import { StarterKit } from '@tiptap/starter-kit';
import DocumentBlockStyle from './DocumentBlockStyle';

describe('DocumentBlockStyle', () => {
  it('keeps paragraph text indent while preserving text alignment', () => {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        TextAlign.configure({ types: ['paragraph', 'heading'] }),
        DocumentBlockStyle,
      ],
      content:
        '<h1 style="text-align: center;">标题</h1><p style="text-align: right; text-indent: 2em;">正文</p>',
    });

    const html = editor.getHTML();

    expect(html).toContain('text-align: center');
    expect(html).toContain('text-align: right');
    expect(html).toContain('text-indent: 2em');

    editor.destroy();
  });
});
