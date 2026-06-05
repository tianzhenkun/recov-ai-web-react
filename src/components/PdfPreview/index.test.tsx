import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, 'index.tsx'), 'utf8');
const styles = readFileSync(join(__dirname, 'index.css'), 'utf8');

describe('PdfPreview component conventions', () => {
  it('wraps react-pdf behind a shared project component', () => {
    expect(source).toContain("from 'react-pdf'");
    expect(source).toContain('pdfjs.GlobalWorkerOptions.workerSrc');
    expect(source).toContain('pdf.worker');
    expect(source).toContain(
      "import { getToken } from '@/adapters/ruoyi/token'",
    );
    expect(source).toContain(
      "import { getOssBlob } from '@/services/ruoyi/oss'",
    );
    expect(source).toContain('httpHeaders');
    expect(source).toContain('<Document');
    expect(source).toContain('<Page');
  });

  it('loads OSS files through the same-origin download API before rendering', () => {
    expect(source).toContain('ossId?: number | string;');
    expect(source).toContain('getOssBlob(normalizedOssId)');
    expect(source).toContain('setFileBlob(blob)');
    expect(source).toContain('const file = useMemo(');
    expect(source).toContain('fileBlob ||');
    expect(source).toContain('!normalizedOssId && url');
  });

  it('provides the shared controls expected by Recov PDF previews', () => {
    expect(source).toContain('上一页');
    expect(source).toContain('下一页');
    expect(source).toContain('放大');
    expect(source).toContain('缩小');
    expect(source).toContain('新窗口打开');
    expect(source).toContain('renderMode="canvas"');
  });

  it('keeps the preview canvas inside a stable scrollable stage', () => {
    expect(styles).toContain('.pdf-preview {');
    expect(styles).toContain('.pdf-preview-stage {');
    expect(styles).toContain('overflow: auto;');
    expect(styles).toContain('.react-pdf__Page__canvas');
  });
});
