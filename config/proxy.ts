/**
 * @name 代理的配置
 * @see 在生产环境代理无法生效，所以这里只配置开发、测试和预发环境。
 *
 * @doc https://umijs.org/docs/guides/proxy
 */

import type { ProxyOptions } from '@umijs/bundler-utils/dist/types';

const baseApi = process.env.UMI_APP_BASE_API || '/dev-api';
const adminApi = process.env.UMI_APP_ADMIN_API || '/admin-api';
const voiceApi = process.env.UMI_APP_VOICE_API || '/voice-api';
const agentConsoleApi = '/ai-call-agent-api';
const aiCallLabApi = '/ai-call-lab-api';
const apiTarget = process.env.UMI_APP_API_TARGET || 'http://localhost:8080';
const adminTarget = process.env.UMI_APP_ADMIN_TARGET || apiTarget;
const voiceApiTarget =
  process.env.UMI_APP_VOICE_API_TARGET || 'http://111.229.146.182:9100';
const agentConsoleTarget =
  process.env.UMI_APP_AI_CALL_API_TARGET || 'http://127.0.0.1:19011';
const trimTrailingSlash = (value: string) => value.replace(/\/+$/g, '');

const normalizedBaseApi = trimTrailingSlash(baseApi);
const normalizedVoiceApi = trimTrailingSlash(voiceApi);
const sseProxyPath = `${normalizedBaseApi}/resource/sse`;

type ProxyConfig = Record<string, ProxyOptions>;

const createProxy = (): ProxyConfig => ({
  [sseProxyPath]: {
    target: apiTarget,
    changeOrigin: true,
    pathRewrite: { [`^${sseProxyPath}`]: '/resource/sse' },
    proxyTimeout: 0,
    timeout: 0,
    headers: {
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  },
  [baseApi]: {
    target: apiTarget,
    changeOrigin: true,
    ws: true,
    pathRewrite: { [`^${baseApi}`]: '' },
  },
  [adminApi]: {
    target: adminTarget,
    changeOrigin: true,
    ws: true,
    pathRewrite: { [`^${adminApi}`]: '' },
  },
  [normalizedVoiceApi]: {
    target: voiceApiTarget,
    changeOrigin: true,
    ws: true,
    pathRewrite: { [`^${normalizedVoiceApi}`]: '' },
  },
  [aiCallLabApi]: {
    target: agentConsoleTarget,
    changeOrigin: true,
    ws: true,
    pathRewrite: { [`^${aiCallLabApi}`]: '' },
  },
  [agentConsoleApi]: {
    target: agentConsoleTarget,
    changeOrigin: true,
    ws: true,
    proxyTimeout: 0,
    timeout: 0,
    pathRewrite: { [`^${agentConsoleApi}`]: '' },
    headers: {
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  },
});

export default {
  dev: createProxy(),
  test: createProxy(),
  pre: createProxy(),
};
