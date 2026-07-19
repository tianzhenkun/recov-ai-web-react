import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('shared layer dependency direction', () => {
  it.each([
    'services/user.ts',
    'services/tenant.ts',
  ])('%s does not depend on a product or admin module', (relativePath) => {
    const source = readFileSync(
      join(process.cwd(), 'src/shared', relativePath),
      'utf8',
    );

    expect(source).not.toMatch(/from ['"]@\/modules\//);
  });
});
