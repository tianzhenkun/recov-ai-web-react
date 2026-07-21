import fs from 'node:fs';
import path from 'node:path';

const pagePath = path.join(__dirname, 'index.tsx');

describe('payment channel platform boundary', () => {
  it('uses the shared platform operations guard in addition to route access', () => {
    const source = fs.readFileSync(pagePath, 'utf8');
    expect(source).toContain("from '../components/OperationsGuard'");
    expect(source).toContain('<OperationsGuard');
    expect(source).toContain('payment:channel-config:list');
  });
});
