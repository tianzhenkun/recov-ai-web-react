import { cleanup, render, screen } from '@testing-library/react';
import * as React from 'react';
import AgentWorkbenchPage from './index';

const mockUseAgentPresence = jest.fn();
const mockUseAgentEvents = jest.fn();
const mockUseAgentCall = jest.fn();
const mockGetPendingHandoffs = jest.fn();

jest.mock('./hooks/useAgentPresence', () => ({
  useAgentPresence: () => mockUseAgentPresence(),
}));

jest.mock('./hooks/useAgentEvents', () => ({
  useAgentEvents: () => mockUseAgentEvents(),
}));

jest.mock('./hooks/useAgentCall', () => ({
  useAgentCall: () => mockUseAgentCall(),
}));

jest.mock('./components/FollowUpPanel', () => () => (
  <div>人工跟进测试替身</div>
));

jest.mock('@/services/ruoyi/agent-console', () => ({
  getPendingHandoffs: (...args: unknown[]) => mockGetPendingHandoffs(...args),
}));

const basePresence = {
  phase: 'ready',
  status: 'offline',
  profile: {
    scene_codes: ['intro_geo'],
  },
  blockReason: '',
  errorMessage: '',
  deviceResult: {
    checks: {
      microphone: 'idle',
      inputLevel: 'idle',
      audioPlayback: 'idle',
      browser: 'idle',
      network: 'idle',
    },
  },
  goOnline: jest.fn(),
  pause: jest.fn(),
  goOffline: jest.fn(),
};

describe('AgentWorkbenchPage presence shell', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockUseAgentCall.mockReturnValue({
      phase: 'idle',
      microphoneEnabled: true,
      remoteAudioReady: false,
      networkQuality: 'unknown',
      errorMessage: '',
      toggleMicrophone: jest.fn(),
      switchAudioInput: jest.fn(),
      endCall: jest.fn(),
    });
    mockUseAgentEvents.mockReturnValue({
      transport: 'sse',
      unreadCount: 0,
      clearUnread: jest.fn(),
      requestNotificationPermission: jest.fn(),
    });
    mockGetPendingHandoffs.mockResolvedValue({
      code: 200,
      data: { rows: [], total: 0 },
    });
  });

  it('shows actionable guidance when the account has no profile', () => {
    mockUseAgentPresence.mockReturnValue({
      ...basePresence,
      phase: 'blocked',
      blockReason: 'unregistered',
      profile: undefined,
    });

    render(<AgentWorkbenchPage />);

    expect(screen.getByText('坐席工作台')).toBeTruthy();
    expect(
      screen.getByText(
        '当前账号尚未开通坐席功能，请联系管理员创建坐席档案并配置业务场景。',
      ),
    ).toBeTruthy();
  });

  it('offers pause and offline actions only for an available agent', () => {
    mockUseAgentPresence.mockReturnValue({
      ...basePresence,
      status: 'available',
    });

    render(<AgentWorkbenchPage />);

    expect(screen.getByRole('button', { name: '暂停接听' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '下线' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '上线接听' })).toBeNull();
  });

  it('loads the public waiting pool from the agent console service', async () => {
    mockUseAgentPresence.mockReturnValue({
      ...basePresence,
      status: 'available',
      consoleSessionId: 'session-1',
    });
    mockGetPendingHandoffs.mockResolvedValueOnce({
      code: 200,
      data: {
        rows: [
          {
            handoff_id: 'handoff-1',
            call_id: 'call-1',
            scene_code: 'intro_geo',
            status: 'requested',
            masked_customer_name: '张**',
            masked_contact: '138****0000',
            request_message: '请帮我转人工',
            requested_at: new Date().toISOString(),
          },
        ],
        total: 1,
      },
    });

    render(<AgentWorkbenchPage />);

    expect(await screen.findByText('张** · 138****0000')).toBeTruthy();
    expect(mockGetPendingHandoffs).toHaveBeenCalledTimes(1);
  });
});
