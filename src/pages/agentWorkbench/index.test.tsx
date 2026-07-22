import { cleanup, render, screen } from '@testing-library/react';
import * as React from 'react';
import AgentWorkbenchPage from './index';

const mockUseAgentPresence = jest.fn();

jest.mock('./hooks/useAgentPresence', () => ({
  useAgentPresence: () => mockUseAgentPresence(),
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
});
