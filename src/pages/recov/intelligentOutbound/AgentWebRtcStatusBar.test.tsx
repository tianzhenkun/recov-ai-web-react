import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import { AgentWebRtcStatusBar } from './AgentWebRtcStatusBar';
import type { UseWebRtcAgentResult } from './useWebRtcAgent';

const buildAgent = (
  overrides: Partial<UseWebRtcAgentResult> = {},
): UseWebRtcAgentResult => ({
  status: 'available',
  registered: true,
  incoming: false,
  busy: false,
  remoteStream: null,
  errorMessage: '',
  diagnosticMessage: '坐席已注册',
  diagnosticEvents: [
    {
      id: 2,
      at: '2026-06-11T02:18:43.000Z',
      event: 'incoming_session',
      detail: '收到坐席来电',
      data: {
        callId: 'browser-call-id-001',
        originator: 'remote',
      },
    },
    {
      id: 1,
      at: '2026-06-11T02:18:38.000Z',
      event: 'registered',
      detail: '坐席已注册',
    },
  ],
  agentExtension: '1001',
  registerAgent: jest.fn(),
  unregisterAgent: jest.fn(),
  answerIncoming: jest.fn(),
  rejectIncoming: jest.fn(),
  hangup: jest.fn(),
  recordDiagnosticEvent: jest.fn(),
  ...overrides,
});

describe('AgentWebRtcStatusBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows recent WebRTC diagnostics in a popover', () => {
    render(<AgentWebRtcStatusBar agent={buildAgent()} />);

    fireEvent.click(screen.getByRole('button', { name: /诊断/ }));

    expect(screen.getByText('incoming_session')).toBeTruthy();
    expect(screen.getByText('收到坐席来电')).toBeTruthy();
    expect(screen.getByText(/callId=browser-call-id-001/)).toBeTruthy();
    expect(screen.getByText(/originator=remote/)).toBeTruthy();
  });
});
