import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = join(__dirname, '..', '..', '..');

const readSource = (relativePath: string) =>
  readFileSync(join(projectRoot, relativePath), 'utf8');

describe('Instrument type template page wiring', () => {
  it('uses the TipTap template editor for html editing without exposing templateJson as an input', () => {
    const source = readSource('pages/recov/instrumentTemplate/index.tsx');

    expect(source).toContain(
      "import TemplateEditor from '@/components/TemplateEditor'",
    );
    expect(source).toContain('outputType="html"');
    expect(source).toContain('saveInstrumentTypeTemplate');
    expect(source).not.toContain('name="templateJson"');
  });

  it('uses a left-right template workbench with a single edit surface', () => {
    const source = readSource('pages/recov/instrumentTemplate/index.tsx');

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
    const source = readSource('pages/recov/instrumentTemplate/index.tsx');
    const styles = readSource('pages/recov/instrumentTemplate/index.css');

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

  it('registers the system template route', () => {
    expect(readSource('../config/routes.ts')).toContain(
      "path: '/sys/instrument-template'",
    );
    expect(readSource('../config/routes.ts')).toContain(
      "component: './recov/instrumentTemplate'",
    );
    expect(readSource('app.tsx')).toContain("'/sys/instrument-template'");
  });
});
