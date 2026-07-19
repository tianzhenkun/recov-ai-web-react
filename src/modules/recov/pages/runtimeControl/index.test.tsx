import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, 'index.tsx'), 'utf8');

describe('/sys/recov-runtime-control presentation conventions', () => {
  it('links the notice and clean version tags to the active theme color', () => {
    expect(source).toContain('theme.useToken()');
    expect(source).toContain('themeLinkedAlertStyle');
    expect(source).toContain('background: token.colorPrimaryBg');
    expect(source).toContain('borderColor: token.colorPrimaryBorder');
    expect(source).toContain('color: token.colorPrimary');
    expect(source).toContain('style={themeLinkedAlertStyle}');
    expect(source).toContain('primaryTagStyle={themeLinkedTagStyle}');
  });

  it('explains config version instead of showing a bare v-prefix number', () => {
    expect(source).toContain('配置版本号');
    expect(source).toContain("配置版本 {meta.version ?? '-'}");
    expect(source).not.toContain('v{meta.version ??');
    expect(source).not.toContain(
      '<Tag color="blue" icon={<CheckCircleOutlined />}>',
    );
  });
});
