import {
  BoldOutlined,
  ClearOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Button, Space, Tooltip } from 'antd';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { sanitizeHtml } from '@/utils/sanitizeHtml';

export type RichTextEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  minHeight?: number;
};

const editorStyle = (minHeight: number): React.CSSProperties => ({
  minHeight,
  padding: '12px',
  border: '1px solid #d9d9d9',
  borderRadius: 6,
  outline: 'none',
  background: '#fff',
  overflow: 'auto',
});

const toolbarStyle: React.CSSProperties = {
  padding: '8px',
  border: '1px solid #d9d9d9',
  borderBottom: 0,
  borderRadius: '6px 6px 0 0',
  background: '#fafafa',
};

const contentStyle = (minHeight: number): React.CSSProperties => ({
  ...editorStyle(minHeight),
  borderRadius: '0 0 6px 6px',
});

const buttonStyle: React.CSSProperties = {
  width: 32,
  paddingInline: 0,
};

export const RichTextEditor = ({
  value,
  onChange,
  disabled = false,
  minHeight = 192,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastValueRef = useRef('');

  useEffect(() => {
    const nextValue = sanitizeHtml(value);
    if (editorRef.current && nextValue !== lastValueRef.current) {
      editorRef.current.innerHTML = nextValue;
      lastValueRef.current = nextValue;
    }
  }, [value]);

  const emitChange = () => {
    const html = sanitizeHtml(editorRef.current?.innerHTML || '');
    lastValueRef.current = html;
    onChange?.(html);
  };

  const runCommand = (command: string, commandValue?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const setLink = () => {
    const href = window.prompt('请输入链接地址');
    if (!href) return;
    runCommand('createLink', href);
  };

  const actions = [
    {
      key: 'bold',
      title: '加粗',
      icon: <BoldOutlined />,
      onClick: () => runCommand('bold'),
    },
    {
      key: 'italic',
      title: '斜体',
      icon: <ItalicOutlined />,
      onClick: () => runCommand('italic'),
    },
    {
      key: 'underline',
      title: '下划线',
      icon: <UnderlineOutlined />,
      onClick: () => runCommand('underline'),
    },
    {
      key: 'orderedList',
      title: '有序列表',
      icon: <OrderedListOutlined />,
      onClick: () => runCommand('insertOrderedList'),
    },
    {
      key: 'unorderedList',
      title: '无序列表',
      icon: <UnorderedListOutlined />,
      onClick: () => runCommand('insertUnorderedList'),
    },
    {
      key: 'link',
      title: '链接',
      icon: <LinkOutlined />,
      onClick: setLink,
    },
    {
      key: 'clear',
      title: '清除格式',
      icon: <ClearOutlined />,
      onClick: () => runCommand('removeFormat'),
    },
  ];

  return (
    <div>
      <div style={toolbarStyle}>
        <Space size={4} wrap>
          {actions.map((action) => (
            <Tooltip key={action.key} title={action.title}>
              <Button
                aria-label={action.title}
                disabled={disabled}
                icon={action.icon}
                size="small"
                style={buttonStyle}
                onMouseDown={(event) => event.preventDefault()}
                onClick={action.onClick}
              />
            </Tooltip>
          ))}
        </Space>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: contentEditable is required for rich HTML editing. */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        tabIndex={disabled ? -1 : 0}
        role="textbox"
        aria-label="富文本内容"
        aria-multiline
        style={contentStyle(minHeight)}
        suppressContentEditableWarning
        onBlur={emitChange}
        onInput={emitChange}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
          emitChange();
        }}
      />
    </div>
  );
};

export default RichTextEditor;
