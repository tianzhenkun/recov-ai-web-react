import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, 'index.tsx'), 'utf8');

describe('/sys/collection-strategy call config tabs', () => {
  it('uses string-safe call config keys when switching identity tabs', () => {
    const tabChangeStart = source.indexOf('const handleCallConfigTabChange =');
    const tabChangeEnd = source.indexOf(
      'const handlePersonaTabClick =',
      tabChangeStart,
    );
    const tabChangeSource = source.slice(tabChangeStart, tabChangeEnd);

    expect(source).toContain('getCallConfigKey');
    expect(source).toContain('findCallConfigByKey');
    expect(tabChangeSource).not.toContain('Number(key)');
  });
});
