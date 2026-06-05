import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = join(__dirname, '..', '..');

const readSource = (relativePath: string) =>
  readFileSync(join(projectRoot, relativePath), 'utf8');

describe('Recov PDF preview usage', () => {
  const files = [
    'pages/recov/instrument/index.tsx',
    'pages/recov/delivery/index.tsx',
    'pages/recov/datelligence/index.tsx',
  ];

  it.each(files)('uses the shared PdfPreview in %s', (file) => {
    const source = readSource(file);

    expect(source).toContain(
      "import PdfPreview from '@/components/PdfPreview'",
    );
    expect(source).toContain('<PdfPreview');
    expect(source).toContain('ossId=');
    expect(source).not.toContain('type="application/pdf"');
  });
});
