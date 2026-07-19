import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('production source boundaries', () => {
  it('does not expose a dedicated Voice browser channel', () => {
    const source = [
      read('config/config.ts'),
      read('config/proxy.ts'),
      read('src/adapters/ruoyi/env.ts'),
      read('src/api/runtimeConfig.ts'),
      read(
        'src/modules/recov/pages/intelligentOutbound/LiveMonitorDetailView.tsx',
      ),
      read('src/modules/recov/pages/intelligentOutbound/service.ts'),
    ].join('\n');

    expect(source).not.toMatch(
      /voiceApi|UMI_APP_VOICE_API|createDirectApi|getVoiceApi/,
    );
  });

  it('does not ship browser SIP, WebRTC handoff, or runtime handoff mocks', () => {
    const source = read(
      'src/modules/recov/pages/intelligentOutbound/LiveMonitorDetailView.tsx',
    );

    expect(source).not.toMatch(
      /mockHandoff|useWebRtcAgent|sipUri|agentWebRtcConfig|claimAiCallHandoff|hangupGatewayCall/,
    );
  });

  it('does not expose request-record or a deployable template mock server', () => {
    const source = [read('config/config.ts'), read('package.json')].join('\n');

    expect(source).not.toMatch(/requestRecord|@umijs\/request-record/);
    expect(
      existsSync(join(process.cwd(), 'cloudflare-worker/src/index.ts')),
    ).toBe(false);
  });

  it.each([
    'src/service-worker.js',
    'src/manifest.json',
    'types/index.d.ts',
    '.github/workflows/deploy.yml',
    '.github/workflows/preview-build.yml',
    '.github/workflows/preview-deploy.yml',
    '.github/workflows/preview-start.yml',
    'deploy/nginx/recov-ai-antd-pro-poc.conf',
    'deploy/nginx/recov-ai-antd-pro-poc.docker.conf',
  ])('does not ship obsolete template asset %s', (path) => {
    expect(existsSync(join(process.cwd(), path))).toBe(false);
  });
});
