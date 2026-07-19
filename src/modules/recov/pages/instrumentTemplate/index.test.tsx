import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();

const readSource = (relativePath: string) =>
  readFileSync(join(projectRoot, relativePath), 'utf8');

describe('Instrument type template page wiring', () => {
  it('uses the TipTap template editor for html editing without exposing templateJson as an input', () => {
    const source = readSource(
      'src/modules/recov/pages/instrumentTemplate/index.tsx',
    );

    expect(source).toContain('import TemplateEditor, {');
    expect(source).toContain('outputType="html"');
    expect(source).toContain('saveInstrumentTypeTemplate');
    expect(source).not.toContain('name="templateJson"');
  });

  it('uses a left-right template workbench with a single edit surface', () => {
    const source = readSource(
      'src/modules/recov/pages/instrumentTemplate/index.tsx',
    );

    expect(source).toContain('Splitter');
    expect(source).toContain('instrument-template-workbench');
    expect(source).toContain('instrument-template-sidebar');
    expect(source).toContain('instrument-template-editor-panel');
    expect(source).toContain('instrument-template-editor-body');
    expect(source).toContain('SafetyCertificateOutlined');
    expect(source).not.toContain('Tabs');
    expect(source).not.toContain('previewInstrumentTypeTemplate');
    expect(source).not.toContain('instrument-template-preview-stage');
    expect(source).not.toContain('srcDoc={renderTemplatePreviewHtml(');
    expect(source).not.toContain('previewHtml');
    expect(source).not.toContain("key: 'preview'");
    expect(source).not.toContain('<iframe');
    expect(source).not.toContain('TableActions');
    expect(source).toContain('title="插入签章位"');
  });

  it('keeps template list and editor header visually minimal', () => {
    const source = readSource(
      'src/modules/recov/pages/instrumentTemplate/index.tsx',
    );
    const styles = readSource(
      'src/modules/recov/pages/instrumentTemplate/index.css',
    );

    expect(source).not.toContain('getStatusTag');
    expect(source).not.toContain('getConfiguredTag');
    expect(source).not.toContain('selectedMetaItems');
    expect(source).not.toContain('instrument-template-meta');
    expect(source).not.toContain('instrument-template-list-meta');
    expect(source).toContain('instrument-template-list-item-active');
    expect(styles).toContain('border: 1px solid transparent');
    expect(styles).toContain('border-radius: 8px');
    expect(styles).toContain('background: #f7f8fb');
    expect(styles).toContain('background: #eef2ff');
    expect(styles).not.toContain('background: #e6f4ff');
    expect(styles).not.toContain('border-color: #91caff');
    expect(styles).not.toContain('box-shadow: inset 3px 0 0 #1677ff');
  });

  it('uses a wide modal instead of a side drawer for AI draft editing', () => {
    const source = readSource(
      'src/modules/recov/pages/instrumentTemplate/index.tsx',
    );
    const styles = readSource(
      'src/modules/recov/pages/instrumentTemplate/index.css',
    );

    expect(source).toContain('aiModalOpen');
    expect(source).toContain('<Modal');
    expect(source).toContain(
      'wrapClassName="instrument-template-ai-modal-wrap"',
    );
    expect(source).toContain("width={isNarrow ? '96vw' : 1120}");
    expect(source).not.toContain('<Drawer');
    expect(source).not.toContain('aiDrawerOpen');
    expect(styles).toContain('instrument-template-ai-modal-wrap');
    expect(styles).toContain('instrument-template-ai-layout');
    expect(styles).not.toContain('instrument-template-ai-drawer');
  });

  it('uses a single modify requirement panel above the editable AI draft preview', () => {
    const styles = readSource(
      'src/modules/recov/pages/instrumentTemplate/index.css',
    );
    const source = readSource(
      'src/modules/recov/pages/instrumentTemplate/index.tsx',
    );

    expect(styles).toContain('.instrument-template-ai-layout');
    expect(styles).toContain('flex-direction: column');
    expect(styles).toContain('.instrument-template-ai-form');
    expect(styles).toContain('.instrument-template-ai-field');
    expect(styles).toContain('grid-template-columns: 1fr');
    expect(styles).not.toContain('.instrument-template-ai-template-name');
    expect(source).not.toContain('<Text type="secondary">当前模板</Text>');
    expect(styles).not.toContain('grid-template-columns: 320px minmax(0, 1fr)');
    expect(styles).not.toContain('.instrument-template-ai-chat-panel');
    expect(styles).not.toContain('.instrument-template-ai-message-list');
    expect(styles).not.toContain('.instrument-template-ai-chat-input');
  });

  it('keeps AI modifications single-shot while editing drafts before applying them to the editor', () => {
    const source = readSource(
      'src/modules/recov/pages/instrumentTemplate/index.tsx',
    );
    const styles = readSource(
      'src/modules/recov/pages/instrumentTemplate/index.css',
    );

    expect(source).toContain('modifyInstrumentTypeTemplate');
    expect(source).toContain('aiModalOpen');
    expect(source).toContain('aiModifyRequirement');
    expect(source).toContain('aiModifiedTemplateHtml');
    expect(source).toContain('handleModifyTemplate');
    expect(source).toContain('handleApplyModifiedTemplate');
    expect(source).toContain('normalizeAiModifiedTemplateHtml');
    expect(source).toContain('ensureSealPlaceholderHtml');
    expect(source).toContain(
      'setAiModifiedTemplateHtml(normalizedModifiedHtml)',
    );
    expect(source).toContain('AI 修改结果未返回签章位，已保留原签章位');
    expect(source).toContain('syncEditorBeforeSave: false');
    expect(source).toContain('mainEditorRef');
    expect(source).toContain('getCurrentTemplateHtml');
    expect(source).toContain('currentTemplateHtml,');
    expect(source).toContain('onChange={setAiModifiedTemplateHtml}');
    expect(source).toContain('instrument-template-ai-preview-loading');
    expect(source).toContain('AI 正在根据修改要求修改模板');
    expect(source).toContain('AI 修改');
    expect(source).toContain('AI 修改模板');
    expect(source).toContain('修改要求');
    expect(source).toContain('修改草稿');
    expect(source).toContain('开始修改');
    expect(source).toContain('重新修改');
    expect(source).toContain('应用并保存');
    expect(source).toContain('尚未保存的编辑内容不会保留');
    expect(source).toContain('persistTemplateHtml(aiModifiedTemplateHtml');
    expect(source).not.toContain('AI 生成');
    expect(source).not.toContain('AI 生成模板');
    expect(source).not.toContain('生成要求');
    expect(source).not.toContain('生成草稿');
    expect(source).not.toContain('重新生成');
    expect(source).not.toContain('mockModifyInstrumentTemplate');
    expect(source).not.toContain('MockModifyInstrumentTemplateParams');
    expect(source).not.toContain('aiModifyPrompt');
    expect(source).not.toContain('aiModifyMessages');
    expect(source).not.toContain('AiModifyMessage');
    expect(source).not.toContain('handleSubmitModifyMessage');
    expect(source).not.toContain('SendOutlined');
    expect(source).not.toContain('发送修改');
    expect(source).not.toContain('继续修改');
    expect(source).not.toContain('修改对话');
    expect(source).not.toContain('aiOptimizeCurrent');
    expect(source).not.toContain('Switch');
    expect(styles).toContain('instrument-template-ai-modal-wrap');
    expect(styles).toContain('instrument-template-ai-preview-editor');
    expect(styles).not.toContain('instrument-template-ai-chat-panel');
    expect(styles).not.toContain('instrument-template-ai-switch-row');
    expect(styles).not.toContain(
      '.instrument-template-ai-preview-editor > .template-editor-toolbar',
    );
  });

  it('keeps the AI modify requirement empty by default and moves guidance outside the input', () => {
    const source = readSource(
      'src/modules/recov/pages/instrumentTemplate/index.tsx',
    );
    const styles = readSource(
      'src/modules/recov/pages/instrumentTemplate/index.css',
    );

    expect(source).toContain('QuestionCircleOutlined');
    expect(source).toContain('instrument-template-ai-label-row');
    expect(source).toContain('输入修改建议，AI 会基于当前模板进行二次修改');
    expect(source).not.toContain('描述需要调整的语气、结构或重点');
    expect(source).toContain("setAiModifyRequirement('')");
    expect(source).not.toContain(
      '请基于当前${' + 'selectedRecord.name}模板进行修改',
    );
    expect(source).not.toContain(
      'placeholder="例如：语气更正式，强化还款提醒和法律后果，保留全部变量和签章位"',
    );
    expect(styles).toContain('.instrument-template-ai-label-row');
  });

  it('opens templates in review mode and only exposes save while editing', () => {
    const source = readSource(
      'src/modules/recov/pages/instrumentTemplate/index.tsx',
    );

    expect(source).toContain('isEditing');
    expect(source).toContain('setIsEditing(false)');
    expect(source).toContain('EditOutlined');
    expect(source).toContain('CloseOutlined');
    expect(source).toContain('编辑');
    expect(source).toContain('取消');
    expect(source).toContain('hasTemplateChange');
    expect(source).toContain('disabled={!isEditing}');
    expect(source).toContain('isEditing ? (');
    expect(source).toContain('onClick={() => setIsEditing(true)}');
    expect(source).toContain('onClick={() => void saveTemplate()}');
  });

  it('guards unsaved manual edits when cancelling or switching templates', () => {
    const source = readSource(
      'src/modules/recov/pages/instrumentTemplate/index.tsx',
    );

    expect(source).toContain('hasUnsavedTemplateChange');
    expect(source).toContain('handleCancelEditing');
    expect(source).toContain('handleSelectTemplate');
    expect(source).toContain('放弃修改');
    expect(source).toContain('切换模板');
    expect(source).toContain('当前模板存在未保存修改');
    expect(source).toContain('onClick={() => handleSelectTemplate(item)}');
  });

  it('reads the latest serialized html from the editor before save or AI modify', () => {
    const source = readSource(
      'src/modules/recov/pages/instrumentTemplate/index.tsx',
    );
    const editorSource = readSource('src/components/TemplateEditor/index.tsx');

    expect(source).toContain('type TemplateEditorHandle');
    expect(source).toContain('useRef<TemplateEditorHandle>(null)');
    expect(source).toContain('mainEditorRef.current?.getValue()');
    expect(source).toContain('mainEditorRef.current?.getDomHtml()');
    expect(source).toContain(
      'const sealSourceHtml = editorDomHtml || templateHtml',
    );
    expect(source).toContain(
      'ensureSealPlaceholderHtml(editorHtml, sealSourceHtml)',
    );
    expect(source).toContain('ref={mainEditorRef}');
    expect(editorSource).toContain('export type TemplateEditorHandle');
    expect(editorSource).toContain('useImperativeHandle');
    expect(editorSource).toContain('getValue: () => serialize(editor)');
    expect(editorSource).toContain(
      'getDomHtml: () => getEditorDomHtml(editor)',
    );
  });

  it('uses React 19 ref-as-prop instead of forwardRef for editor handles', () => {
    const editorSource = readSource('src/components/TemplateEditor/index.tsx');

    expect(editorSource).toContain('type Ref');
    expect(editorSource).toContain('ref?: Ref<TemplateEditorHandle>');
    expect(editorSource).not.toContain('forwardRef');
  });

  it('keeps visible seal placeholders when the editor serializes current html', () => {
    const editorSource = readSource('src/components/TemplateEditor/index.tsx');

    expect(editorSource).toContain('ensureSealPlaceholderHtml');
    expect(editorSource).toContain('getEditorHtml');
    expect(editorSource).toContain('catch');
    expect(editorSource).toContain('return fallbackHtml');
    expect(editorSource).toContain(
      'const serialized = serializeHtmlWithVariableTokens',
    );
    expect(editorSource).toContain(
      'const editorDomHtml = getEditorDomHtml(instance)',
    );
    expect(editorSource).toContain(
      'return ensureSealPlaceholderHtml(serialized, editorDomHtml)',
    );
  });

  it('registers the system template route', () => {
    expect(readSource('config/routes/recov.ts')).toContain(
      "path: '/sys/instrument-template'",
    );
    expect(readSource('config/routes/recov.ts')).toContain(
      "component: './recov/instrumentTemplate'",
    );
    expect(readSource('src/app.tsx')).toContain("'/sys/instrument-template'");
  });
});
