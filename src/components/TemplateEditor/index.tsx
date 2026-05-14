import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  ItalicOutlined,
  TagOutlined,
  UnderlineOutlined,
} from '@ant-design/icons';
import { Color } from '@tiptap/extension-color';
import { TextAlign } from '@tiptap/extension-text-align';
import { FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Button, ColorPicker, Popover, Select, Tooltip } from 'antd';
import clsx from 'clsx';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Variable, { buildVariableAttrs } from './extensions/Variable';
import './templateEditor.css';
import type {
  TemplateEditorFeatures,
  TemplateOutputType,
  TemplateVariable,
} from './types';
import {
  editorJsonToText,
  htmlToEditorHtml,
  serializeHtmlWithVariableTokens,
  textToEditorHtml,
} from './utils/templateVariable';

export type TemplateEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  outputType?: TemplateOutputType;
  placeholder?: string;
  variables?: TemplateVariable[];
  features?: TemplateEditorFeatures;
  height?: number;
  disabled?: boolean;
  className?: string;
};

const DEFAULT_FEATURES: TemplateEditorFeatures = {
  textStyle: false,
  color: false,
  align: false,
  variable: true,
  fontFamily: false,
  fontSize: false,
};

const FONT_SELECT_OPTIONS: { label: string; value: string }[] = [
  { label: '默认', value: '' },
  { label: '宋体', value: 'SimSun, "Songti SC", STSong, serif' },
  { label: '黑体', value: 'SimHei, "Heiti SC", STHeiti, sans-serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
];

const SIZE_SELECT_OPTIONS: { label: string; value: string }[] = [
  { label: '默认', value: '' },
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
];

const TemplateEditor = ({
  value,
  onChange,
  outputType = 'text',
  placeholder,
  variables = [],
  features,
  height = 200,
  disabled = false,
  className,
}: TemplateEditorProps) => {
  const resolved: TemplateEditorFeatures = useMemo(
    () => ({ ...DEFAULT_FEATURES, ...(features ?? {}) }),
    [features],
  );

  const variablesRef = useRef(variables);
  variablesRef.current = variables;
  const outputTypeRef = useRef(outputType);
  outputTypeRef.current = outputType;
  const lastEmittedRef = useRef<string | null>(null);

  const [, bumpToolbar] = useReducer((n: number) => n + 1, 0);

  const toEditorContent = (raw: string | undefined) => {
    if (outputTypeRef.current === 'text') {
      return textToEditorHtml(raw ?? '', variablesRef.current);
    }
    return htmlToEditorHtml(raw ?? '<p></p>');
  };

  const serialize = (instance: ReturnType<typeof useEditor>): string => {
    if (!instance) return '';
    if (outputTypeRef.current === 'text') {
      return editorJsonToText(instance.getJSON());
    }
    return serializeHtmlWithVariableTokens(instance.getHTML());
  };

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          blockquote: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
        }),
        Underline,
        TextStyle,
        FontFamily.configure({ types: ['textStyle'] }),
        FontSize.configure({ types: ['textStyle'] }),
        Color.configure({ types: ['textStyle'] }),
        TextAlign.configure({ types: ['paragraph'] }),
        Variable,
      ],
      editable: !disabled,
      content: toEditorContent(value),
      editorProps: {
        attributes: {
          'data-placeholder': placeholder ?? '',
        },
      },
      onUpdate: ({ editor: instance }) => {
        const next = serialize(instance);
        lastEmittedRef.current = next;
        onChange?.(next);
      },
      onSelectionUpdate: () => {
        bumpToolbar();
      },
      onTransaction: () => {
        bumpToolbar();
      },
    },
    [],
  );

  const [currentColor, setCurrentColor] = useState<string>('#303133');

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedRef.current) return;
    const incomingContent = toEditorContent(value);
    const currentSerialized = serialize(editor);
    if (currentSerialized === value) return;
    editor.commands.setContent(incomingContent, { emitUpdate: false });
    lastEmittedRef.current = value ?? '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  const insertVariable = (variable: TemplateVariable) => {
    if (!editor) return;
    const attrs = buildVariableAttrs(variable.value, variable.label);
    editor
      .chain()
      .focus()
      .insertContent([
        { type: 'variable', attrs },
        { type: 'text', text: ' ' },
      ])
      .run();
  };

  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor?.chain().focus().toggleUnderline().run();
  const setAlign = (align: 'left' | 'center' | 'right') =>
    editor?.chain().focus().setTextAlign(align).run();
  const applyColor = (hex: string) => {
    if (!editor) return;
    setCurrentColor(hex);
    editor.chain().focus().setColor(hex).run();
  };

  const textStyleAttrs = editor?.getAttributes('textStyle') ?? {};
  const currentFontFamily = (textStyleAttrs.fontFamily as string | null) ?? '';
  const currentFontSize = (textStyleAttrs.fontSize as string | null) ?? '';

  const fontOptions = useMemo(() => {
    if (
      currentFontFamily &&
      !FONT_SELECT_OPTIONS.some((o) => o.value === currentFontFamily)
    ) {
      return [
        ...FONT_SELECT_OPTIONS,
        { label: currentFontFamily, value: currentFontFamily },
      ];
    }
    return FONT_SELECT_OPTIONS;
  }, [currentFontFamily]);

  const sizeOptions = useMemo(() => {
    if (
      currentFontSize &&
      !SIZE_SELECT_OPTIONS.some((o) => o.value === currentFontSize)
    ) {
      return [
        ...SIZE_SELECT_OPTIONS,
        { label: currentFontSize, value: currentFontSize },
      ];
    }
    return SIZE_SELECT_OPTIONS;
  }, [currentFontSize]);

  const isBold = editor?.isActive('bold') ?? false;
  const isItalic = editor?.isActive('italic') ?? false;
  const isUnderline = editor?.isActive('underline') ?? false;
  const isAlignLeft = editor?.isActive({ textAlign: 'left' }) ?? true;
  const isAlignCenter = editor?.isActive({ textAlign: 'center' }) ?? false;
  const isAlignRight = editor?.isActive({ textAlign: 'right' }) ?? false;

  const showToolbar =
    resolved.textStyle ||
    resolved.color ||
    resolved.align ||
    resolved.variable ||
    resolved.fontFamily ||
    resolved.fontSize;

  const variablePopover = (
    <div className="flex max-w-[280px] flex-wrap gap-2">
      {variables.length === 0 ? (
        <span className="text-xs text-gray-500">暂无可用变量</span>
      ) : (
        variables.map((item) => (
          <Button
            key={`${item.value}-${item.label}`}
            size="small"
            type="default"
            onClick={() => insertVariable(item)}
          >
            {item.label}
          </Button>
        ))
      )}
    </div>
  );

  const richEmailClass =
    outputType === 'html' &&
    (resolved.fontFamily || resolved.fontSize || resolved.textStyle)
      ? 'template-editor-rich'
      : '';

  return (
    <div
      className={clsx('template-editor', richEmailClass, className, {
        'template-editor-disabled': disabled,
      })}
      style={{ ['--editor-min-height' as string]: `${height}px` }}
    >
      {showToolbar ? (
        <div className="template-editor-toolbar">
          {resolved.fontFamily ? (
            <Select
              size="small"
              className="template-editor-font-select"
              disabled={disabled}
              value={currentFontFamily}
              options={fontOptions}
              onChange={(v) => {
                if (!editor) return;
                if (!v) {
                  editor.chain().focus().unsetFontFamily().run();
                } else {
                  editor.chain().focus().setFontFamily(v).run();
                }
              }}
            />
          ) : null}

          {resolved.fontSize ? (
            <Select
              size="small"
              className="template-editor-size-select"
              disabled={disabled}
              value={currentFontSize}
              options={sizeOptions}
              onChange={(v) => {
                if (!editor) return;
                if (!v) {
                  editor.chain().focus().unsetFontSize().run();
                } else {
                  editor.chain().focus().setFontSize(v).run();
                }
              }}
            />
          ) : null}

          {resolved.fontFamily || resolved.fontSize ? (
            <span className="template-editor-toolbar-divider" />
          ) : null}

          {resolved.textStyle ? (
            <>
              <Tooltip title="加粗">
                <Button
                  size="small"
                  type={isBold ? 'primary' : 'text'}
                  icon={<BoldOutlined />}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={toggleBold}
                  disabled={disabled}
                />
              </Tooltip>
              <Tooltip title="斜体">
                <Button
                  size="small"
                  type={isItalic ? 'primary' : 'text'}
                  icon={<ItalicOutlined />}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={toggleItalic}
                  disabled={disabled}
                />
              </Tooltip>
              <Tooltip title="下划线">
                <Button
                  size="small"
                  type={isUnderline ? 'primary' : 'text'}
                  icon={<UnderlineOutlined />}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={toggleUnderline}
                  disabled={disabled}
                />
              </Tooltip>
            </>
          ) : null}

          {resolved.color ? (
            <>
              {resolved.textStyle ||
              resolved.fontFamily ||
              resolved.fontSize ? (
                <span className="template-editor-toolbar-divider" />
              ) : null}
              <Tooltip title="字体颜色">
                <ColorPicker
                  size="small"
                  value={currentColor}
                  disabled={disabled}
                  onChange={(c) => applyColor(c.toHexString())}
                  presets={[
                    {
                      label: '推荐',
                      colors: [
                        '#303133',
                        '#606266',
                        '#909399',
                        '#f56c6c',
                        '#e6a23c',
                        '#67c23a',
                        '#409eff',
                        '#9b59b6',
                      ],
                    },
                  ]}
                />
              </Tooltip>
            </>
          ) : null}

          {resolved.align ? (
            <>
              {resolved.textStyle ||
              resolved.color ||
              resolved.fontFamily ||
              resolved.fontSize ? (
                <span className="template-editor-toolbar-divider" />
              ) : null}
              <Tooltip title="左对齐">
                <Button
                  size="small"
                  type={isAlignLeft ? 'primary' : 'text'}
                  icon={<AlignLeftOutlined />}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setAlign('left')}
                  disabled={disabled}
                />
              </Tooltip>
              <Tooltip title="居中">
                <Button
                  size="small"
                  type={isAlignCenter ? 'primary' : 'text'}
                  icon={<AlignCenterOutlined />}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setAlign('center')}
                  disabled={disabled}
                />
              </Tooltip>
              <Tooltip title="右对齐">
                <Button
                  size="small"
                  type={isAlignRight ? 'primary' : 'text'}
                  icon={<AlignRightOutlined />}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setAlign('right')}
                  disabled={disabled}
                />
              </Tooltip>
            </>
          ) : null}

          {resolved.variable ? (
            <>
              {resolved.textStyle ||
              resolved.color ||
              resolved.align ||
              resolved.fontFamily ||
              resolved.fontSize ? (
                <span className="template-editor-toolbar-divider" />
              ) : null}
              <Popover
                trigger="click"
                placement="bottomLeft"
                content={variablePopover}
              >
                <Button
                  size="small"
                  type="dashed"
                  icon={<TagOutlined />}
                  disabled={disabled}
                >
                  插入变量
                </Button>
              </Popover>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="template-editor-body">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default TemplateEditor;
