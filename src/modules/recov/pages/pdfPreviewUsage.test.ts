import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();

const readSource = (relativePath: string) =>
  readFileSync(join(projectRoot, relativePath), 'utf8');

describe('Recov PDF preview usage', () => {
  const files = [
    'src/modules/recov/pages/instrument/index.tsx',
    'src/modules/recov/pages/delivery/index.tsx',
    'src/modules/recov/pages/datelligence/index.tsx',
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
