import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('global branding boundaries', () => {
  it('does not load Ant Design template artwork from external CDNs', () => {
    const source = [
      read('src/app.tsx'),
      read('src/login-layouts/default/index.tsx'),
      read('src/global.less'),
      read('config/config.ts'),
    ].join('\n');

    expect(source).not.toMatch(/alipayobjects\.com/);
    expect(source).toContain('rightContentRender: false');
  });

  it('does not hardcode the Recov product as the global shell brand', () => {
    const source = [
      read('src/branding/base.ts'),
      read('src/components/Footer/index.tsx'),
      read('config/config.ts'),
    ].join('\n');

    expect(source).not.toContain('Recov Agent');
  });
});
