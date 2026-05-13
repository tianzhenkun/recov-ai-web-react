import MDEditor from '@uiw/react-md-editor';
import {
  getCommands,
  getExtraCommands,
} from '@uiw/react-md-editor/commands-cn';
import '@uiw/react-md-editor/markdown-editor.css';
import { useMemo } from 'react';

export type PersonaMdEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  height?: number;
};

const PersonaMdEditor = ({
  value,
  onChange,
  placeholder,
  height = 220,
}: PersonaMdEditorProps) => {
  const commands = useMemo(() => [...getCommands()], []);
  const extraCommands = useMemo(() => [...getExtraCommands()], []);

  return (
    <div
      className="persona-md-editor-root w-full min-w-0 [&_.w-md-editor]:shadow-none"
      data-color-mode="light"
    >
      <MDEditor
        value={value ?? ''}
        onChange={(next) => onChange?.(next ?? '')}
        height={height}
        preview="live"
        visibleDragbar
        commands={commands}
        extraCommands={extraCommands}
        textareaProps={{
          placeholder: placeholder ?? '请输入 Markdown 内容...',
        }}
      />
    </div>
  );
};

export default PersonaMdEditor;
