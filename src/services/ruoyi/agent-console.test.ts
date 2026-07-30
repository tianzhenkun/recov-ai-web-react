import { ruoyiRequest } from '@/adapters/ruoyi/request';
import * as agentConsole from './agent-console';

jest.mock('@/adapters/ruoyi/request', () => ({
  ruoyiRequest: jest.fn(),
}));

const mockedRequest = ruoyiRequest as jest.Mock;
const service = agentConsole as unknown as Record<
  string,
  ((...args: unknown[]) => Promise<unknown>) | string
>;

const call = (name: string, ...args: unknown[]) => {
  const operation = service[name];
  if (typeof operation !== 'function') {
    throw new Error(`Missing agent console service operation: ${name}`);
  }
  return operation(...args);
};

describe('agent console service contract', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({ code: 200, data: {} });
  });

  it('freezes the backend contract and isolated proxy prefixes', () => {
    expect(service.AGENT_CONSOLE_BACKEND_COMMIT).toBe(
      'f6957be1307a6286473ab1b97824e9b253e0525c',
    );
    expect(service.AGENT_CONSOLE_PROXY_PREFIX).toBe('/ai-call-agent-api');
    expect(service.AGENT_CONSOLE_API_PREFIX).toBe('/ai-call/agent-console');
    expect(service.AGENT_CONSOLE_ADMIN_API_PREFIX).toBe('/ai-call/admin');
  });

  it('maps the workbench lifecycle to the frozen endpoints', async () => {
    await call('getAgentConsoleBootstrap');
    await call('setAgentOnline', {
      consoleSessionId: 'session-1',
      devicePreflightPassed: true,
    });
    await call('pauseAgent', { consoleSessionId: 'session-1' });
    await call('setAgentOffline', { consoleSessionId: 'session-1' });
    await call('heartbeatAgent', { consoleSessionId: 'session-1' });
    await call('getPendingHandoffs', {
      consoleSessionId: 'session-1',
      limit: 100,
    });
    await call('claimHandoff', 'handoff-1', {
      consoleSessionId: 'session-1',
      idempotencyKey: 'claim-1',
    });
    await call('confirmHandoffMediaReady', 'handoff-1', {
      consoleSessionId: 'session-1',
      idempotencyKey: 'media-1',
    });
    await call('getHandoffReconnectToken', 'handoff-1', {
      consoleSessionId: 'session-1',
      idempotencyKey: 'reconnect-1',
    });
    await call('completeHandoff', 'handoff-1', {
      consoleSessionId: 'session-1',
      idempotencyKey: 'complete-1',
    });
    await call('submitAfterCallWork', 'call-1', {
      handoffId: 'handoff-1',
      dispositionCode: 'resolved',
      needsFollowUp: false,
      idempotencyKey: 'acw-1',
    });

    expect(mockedRequest.mock.calls.map(([url]) => url)).toEqual([
      '/ai-call/agent-console/bootstrap',
      '/ai-call/agent-console/presence/online',
      '/ai-call/agent-console/presence/pause',
      '/ai-call/agent-console/presence/offline',
      '/ai-call/agent-console/presence/heartbeat',
      '/ai-call/agent-console/handoffs/pending',
      '/ai-call/agent-console/handoffs/handoff-1/claim',
      '/ai-call/agent-console/handoffs/handoff-1/media-ready',
      '/ai-call/agent-console/handoffs/handoff-1/reconnect-token',
      '/ai-call/agent-console/handoffs/handoff-1/complete',
      '/ai-call/agent-console/calls/call-1/after-call-work',
    ]);
    expect(mockedRequest.mock.calls.every(([, options]) =>
      options.baseApi === '/ai-call-agent-api',
    )).toBe(true);
    expect(mockedRequest.mock.calls[1][1]).toMatchObject({
      method: 'post',
      data: {
        console_session_id: 'session-1',
        device_preflight_passed: true,
      },
    });
    expect(mockedRequest.mock.calls[5][1]).toMatchObject({
      method: 'get',
      params: {
        console_session_id: 'session-1',
        limit: 100,
      },
    });
    expect(mockedRequest.mock.calls[6][1]).toMatchObject({
      method: 'post',
      headers: { 'Idempotency-Key': 'claim-1' },
      data: { console_session_id: 'session-1' },
    });
    expect(mockedRequest.mock.calls[10][1]).toMatchObject({
      method: 'put',
      headers: { 'Idempotency-Key': 'acw-1' },
      data: {
        handoff_id: 'handoff-1',
        disposition_code: 'resolved',
        needs_follow_up: false,
      },
    });
  });

  it('maps follow-up ownership and contact actions to their endpoints', async () => {
    await call('listAgentFollowUps', { status: 'pending' });
    await call('getAgentFollowUp', 'follow-up-1');
    await call('createFollowUpAttempt', 'follow-up-1', {
      contactChannel: 'wechat',
      attemptResult: 'connected',
      idempotencyKey: 'attempt-1',
    });
    await call('claimFollowUp', 'follow-up-1', 'follow-up-claim-1');
    await call('startFollowUpCall', 'follow-up-1', 'follow-up-call-1');
    await call('completeFollowUp', 'follow-up-1', 'follow-up-complete-1');
    await call('closeFollowUp', 'follow-up-1', {
      closedReason: 'customer_refused',
      idempotencyKey: 'follow-up-close-1',
    });

    expect(mockedRequest.mock.calls.map(([url]) => url)).toEqual([
      '/ai-call/agent-console/follow-ups',
      '/ai-call/agent-console/follow-ups/follow-up-1',
      '/ai-call/agent-console/follow-ups/follow-up-1/attempts',
      '/ai-call/agent-console/follow-ups/follow-up-1/claim',
      '/ai-call/agent-console/follow-ups/follow-up-1/call',
      '/ai-call/agent-console/follow-ups/follow-up-1/complete',
      '/ai-call/agent-console/follow-ups/follow-up-1/close',
    ]);
    expect(mockedRequest.mock.calls[2][1]).toMatchObject({
      headers: { 'Idempotency-Key': 'attempt-1' },
      data: { contact_channel: 'wechat', attempt_result: 'connected' },
    });
  });

  it('maps administration queries and safe recovery actions', async () => {
    await call('listAdminAgents', { status: 'available' });
    await call('createAdminAgent', {
      userId: '100',
      agentIdentity: 'agent-100',
      enabled: false,
    });
    await call('updateAdminAgent', 'agent-100', { enabled: false });
    await call('updateAdminAgentSceneScopes', 'agent-100', {
      sceneCodes: ['intro_geo'],
    });
    await call('getAdminAgentStatus', 'agent-100');
    await call('releaseStaleAgent', 'agent-100', 'release-1');
    await call('listAdminHandoffs', { status: 'failed' });
    await call('getAdminHandoff', 'handoff-1');
    await call('reconcileAdminHandoff', 'handoff-1', 'reconcile-1');
    await call('listAdminFollowUps', { status: 'pending' });
    await call('getAdminFollowUp', 'follow-up-1');

    expect(mockedRequest.mock.calls.map(([url]) => url)).toEqual([
      '/ai-call/admin/agents',
      '/ai-call/admin/agents',
      '/ai-call/admin/agents/agent-100',
      '/ai-call/admin/agents/agent-100/scene-scopes',
      '/ai-call/admin/agents/agent-100/status',
      '/ai-call/admin/agents/agent-100/release-stale',
      '/ai-call/admin/handoffs',
      '/ai-call/admin/handoffs/handoff-1',
      '/ai-call/admin/handoffs/handoff-1/reconcile',
      '/ai-call/admin/follow-ups',
      '/ai-call/admin/follow-ups/follow-up-1',
    ]);
    expect(mockedRequest.mock.calls[5][1]).toMatchObject({
      method: 'post',
      headers: { 'Idempotency-Key': 'release-1' },
    });
    expect(mockedRequest.mock.calls[1][1]).toMatchObject({
      method: 'post',
      data: {
        user_id: '100',
        agent_identity: 'agent-100',
        enabled: false,
      },
    });
    expect(mockedRequest.mock.calls[3][1]).toMatchObject({
      method: 'put',
      data: { scene_codes: ['intro_geo'] },
    });
    expect(mockedRequest.mock.calls[6][1]).toMatchObject({
      method: 'get',
      timeout: 10_000,
    });
    expect(mockedRequest.mock.calls[9][1]).toMatchObject({
      method: 'get',
      timeout: 10_000,
    });
  });
});
