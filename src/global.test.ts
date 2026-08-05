import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const globalStyles = readFileSync(
  join(process.cwd(), 'src/global.less'),
  'utf8',
);
const normalizedGlobalStyles = globalStyles.replace(/\s+/g, ' ');

describe('layered dark navigation scrollbar', () => {
  it('uses a compact theme-scoped scrollbar for the desktop sider menu', () => {
    expect(normalizedGlobalStyles).toContain(
      '&.ant-pro-layout-side > .ant-pro-sider .ant-layout-sider-children > div { scrollbar-color: var(--recov-layered-nav-scrollbar-thumb) transparent; scrollbar-width: thin; }',
    );
    expect(normalizedGlobalStyles).toContain(
      '> div::-webkit-scrollbar { width: 6px; }',
    );
    expect(normalizedGlobalStyles).toContain(
      '> div::-webkit-scrollbar-track { background: transparent; }',
    );
    expect(normalizedGlobalStyles).toContain(
      '> div::-webkit-scrollbar-thumb { border-radius: 999px; background: var(--recov-layered-nav-scrollbar-thumb); }',
    );
    expect(normalizedGlobalStyles).toContain(
      '> div::-webkit-scrollbar-thumb:hover { background: var(--recov-layered-nav-scrollbar-thumb-hover); }',
    );
    expect(normalizedGlobalStyles).toContain(
      '> div::-webkit-scrollbar-button { display: none; }',
    );
  });
});
