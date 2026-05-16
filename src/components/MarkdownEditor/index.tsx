import {
  BoldOutlined,
  OrderedListOutlined,
  RedoOutlined,
  UndoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button, Tooltip } from 'antd';
import clsx from 'clsx';
import MarkdownIt from 'markdown-it';
import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import TurndownService from 'turndown';
import useStyles from './index.style';

export type MarkdownEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /**
   * Editor body minimum height in pixels. Defaults to 300, matching the Vue
   * `MarkdownEditor` default.
   */
  height?: number;
  disabled?: boolean;
};

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

const markdownToHtml = (markdown: string) =>
  markdown ? md.render(markdown) : '<p></p>';

const htmlToMarkdown = (html: string) => {
  if (!html || html === '<p></p>') return '';
  return turndownService.turndown(html);
};

type ToolbarItem = {
  key: string;
  title: string;
  icon?: React.ReactNode;
  text?: string;
  isActive: () => boolean;
  onClick: () => void;
};

const MarkdownEditor = ({
  value = '',
  onChange,
  placeholder,
  height = 300,
  disabled = false,
}: MarkdownEditorProps) => {
  const { styles } = useStyles();
  const lastEmittedRef = useRef(value);

  const editor = useEditor({
    content: markdownToHtml(value),
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        strike: false,
        italic: false,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap-prose',
        'data-placeholder': placeholder ?? '',
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      const markdown = htmlToMarkdown(html);
      if (markdown === lastEmittedRef.current) return;
      lastEmittedRef.current = markdown;
      onChange?.(markdown);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentMarkdown = htmlToMarkdown(editor.getHTML());
    if (value !== currentMarkdown && value !== lastEmittedRef.current) {
      editor.commands.setContent(markdownToHtml(value), { emitUpdate: false });
      lastEmittedRef.current = value;
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const toolbarItems = useMemo<ToolbarItem[]>(
    () => [
      {
        key: 'bold',
        title: '加粗',
        icon: <BoldOutlined />,
        isActive: () => Boolean(editor?.isActive('bold')),
        onClick: () => editor?.chain().focus().toggleBold().run(),
      },
      {
        key: 'h1',
        title: '标题 1',
        text: 'H1',
        isActive: () => Boolean(editor?.isActive('heading', { level: 1 })),
        onClick: () =>
          editor?.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        key: 'h2',
        title: '标题 2',
        text: 'H2',
        isActive: () => Boolean(editor?.isActive('heading', { level: 2 })),
        onClick: () =>
          editor?.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        key: 'h3',
        title: '标题 3',
        text: 'H3',
        isActive: () => Boolean(editor?.isActive('heading', { level: 3 })),
        onClick: () =>
          editor?.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        key: 'bulletList',
        title: '无序列表',
        icon: <UnorderedListOutlined />,
        isActive: () => Boolean(editor?.isActive('bulletList')),
        onClick: () => editor?.chain().focus().toggleBulletList().run(),
      },
      {
        key: 'orderedList',
        title: '有序列表',
        icon: <OrderedListOutlined />,
        isActive: () => Boolean(editor?.isActive('orderedList')),
        onClick: () => editor?.chain().focus().toggleOrderedList().run(),
      },
      {
        key: 'undo',
        title: '撤销',
        icon: <UndoOutlined />,
        isActive: () => false,
        onClick: () => editor?.chain().focus().undo().run(),
      },
      {
        key: 'redo',
        title: '重做',
        icon: <RedoOutlined />,
        isActive: () => false,
        onClick: () => editor?.chain().focus().redo().run(),
      },
    ],
    [editor],
  );

  const dividerBefore = useMemo(() => new Set([1, 4, 6]), []);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        {toolbarItems.map((item, index) => (
          <span key={item.key} className={styles.group}>
            {dividerBefore.has(index) ? (
              <span className={styles.divider} />
            ) : null}
            <Tooltip title={item.title} placement="top">
              <Button
                type="text"
                size="small"
                disabled={disabled}
                className={clsx(styles.btn, {
                  [styles.btnActive]: item.isActive(),
                })}
                aria-label={item.title}
                onMouseDown={(event) => event.preventDefault()}
                onClick={item.onClick}
              >
                {item.icon ?? (
                  <span className={styles.toolbarText}>{item.text}</span>
                )}
              </Button>
            </Tooltip>
          </span>
        ))}
      </div>
      <div
        className={styles.content}
        style={
          {
            '--editor-min-height': `${height}px`,
          } as React.CSSProperties
        }
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default MarkdownEditor;
