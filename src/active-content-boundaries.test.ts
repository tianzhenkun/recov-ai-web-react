import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('active content preview boundaries', () => {
  it.each([
    'src/modules/recov/pages/datelligence/index.tsx',
    'src/modules/recov/pages/delivery/index.tsx',
  ])('does not embed untrusted text-like attachments with object: %s', (path) => {
    expect(read(path)).not.toContain('<object');
    expect(read(path)).toContain('normalizeSafeResourceUrl');
  });

  it.each([
    'src/modules/recov/pages/standing/index.tsx',
    'src/modules/recov/pages/flow/components/FlowTraceDrawer.tsx',
    'src/modules/recov/pages/litigationProcess/components/LitigationDetailModal.tsx',
    'src/modules/recov/pages/litigationProcess/components/LitigationFilingMaterialsDrawer.tsx',
  ])('validates backend resource URLs before navigation: %s', (path) => {
    expect(read(path)).toContain('normalizeSafeResourceUrl');
  });

  it.each([
    'src/modules/sales/pages/leads/index.tsx',
    'src/modules/sales/pages/icp-modeling/index.tsx',
    'src/adapters/ruoyi/menu.tsx',
    'src/app.tsx',
  ])('validates data-driven external links before rendering: %s', (path) => {
    expect(read(path)).toContain('normalizeSafeExternalUrl');
  });
});
