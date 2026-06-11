import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import * as React from 'react';
import { getWebRtcPreflightError, useWebRtcAgent } from './useWebRtcAgent';

let mockJsSipEventHandlers: Record<string, (...args: unknown[]) => void> = {};
let mockJsSipAutoRegister = true;
const mockJsSipStart = jest.fn(() => {
  if (mockJsSipAutoRegister) {
    mockJsSipEventHandlers.registered?.();
  }
});
const mockJsSipStop = jest.fn();
const mockJsSipOn = jest.fn(
  (event: string, handler: (...args: unknown[]) => void) => {
    mockJsSipEventHandlers[event] = handler;
  },
);
const mockWindowWebSocketInterface = jest.fn(function WebSocketInterface(this: {
  via_transport?: string;
}) {});

jest.mock('jssip', () => ({
  UA: jest.fn(() => ({
    on: mockJsSipOn,
    start: mockJsSipStart,
    stop: mockJsSipStop,
  })),
  WebSocketInterface: jest.fn(),
}));

const defaultConfig = {
  agentExtension: '1001',
  wsUrl: 'wss://recov.lingchen-ai.com/sip-ws',
  sipUri: 'sip:1001@111.229.146.182',
  password: 'test',
  viaTransport: 'WS',
};

const AgentHarness = ({
  config = defaultConfig,
}: {
  config?: typeof defaultConfig | null;
}) => {
  const agent = useWebRtcAgent(config);

  return (
    <div>
      <div>{agent.status}</div>
      <div>{agent.errorMessage}</div>
      <div>{agent.diagnosticMessage}</div>
      <div>
        {agent.remoteStream ? 'remote-audio-ready' : 'remote-audio-empty'}
      </div>
      <button type="button" onClick={() => void agent.registerAgent()}>
        上线
      </button>
      <button type="button" onClick={agent.answerIncoming}>
        接听
      </button>
    </div>
  );
};

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('useWebRtcAgent', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockJsSipAutoRegister = true;
    mockJsSipEventHandlers = {};
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [],
        }),
      },
    });
    Object.defineProperty(window, 'JsSIP', {
      configurable: true,
      value: {
        UA: jest.fn(() => ({
          on: mockJsSipOn,
          start: mockJsSipStart,
          stop: mockJsSipStop,
        })),
        WebSocketInterface: mockWindowWebSocketInterface,
      },
    });
  });

  it('shows microphone permission guidance when permission is denied', async () => {
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('Permission denied'), {
        name: 'NotAllowedError',
      }),
    );

    render(<AgentHarness />);

    fireEvent.click(screen.getByRole('button', { name: '上线' }));

    expect(
      await screen.findByText(
        '麦克风权限被拒绝，请在浏览器地址栏允许麦克风后重新上线',
      ),
    ).toBeTruthy();
    expect(mockJsSipStart).not.toHaveBeenCalled();
  });

  it('uses configured Via transport for WSS proxy registration', async () => {
    render(<AgentHarness />);

    fireEvent.click(screen.getByRole('button', { name: '上线' }));

    expect(await screen.findByText('available')).toBeTruthy();
    expect(mockWindowWebSocketInterface).toHaveBeenCalledWith(
      'wss://recov.lingchen-ai.com/sip-ws',
    );
    expect(
      (
        mockWindowWebSocketInterface.mock.instances[0] as unknown as {
          via_transport?: string;
        }
      ).via_transport,
    ).toBe('WS');
  });

  it('shows browser support guidance when mediaDevices is unavailable', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });

    render(<AgentHarness />);

    fireEvent.click(screen.getByRole('button', { name: '上线' }));

    expect(
      await screen.findByText(
        '当前浏览器或页面环境不支持麦克风，请使用 Chrome/Edge 并通过 HTTPS 或 localhost 访问',
      ),
    ).toBeTruthy();
    expect(mockJsSipStart).not.toHaveBeenCalled();
  });

  it('blocks insecure websocket config on https pages before asking for microphone', () => {
    expect(
      getWebRtcPreflightError(
        {
          ...defaultConfig,
          wsUrl: 'ws://111.229.146.182:5066',
        },
        {
          hasMediaDevices: true,
          hostname: 'agent.example.com',
          isSecureContext: true,
          pageProtocol: 'https:',
        },
      ),
    ).toBe('当前 HTTPS 页面不能连接 ws:// 坐席地址，请改用 wss://');
  });

  it('shows SIP registration failure detail', async () => {
    mockJsSipAutoRegister = false;
    render(<AgentHarness />);

    fireEvent.click(screen.getByRole('button', { name: '上线' }));
    await flushPromises();
    await screen.findByText('registering');
    await waitFor(() => {
      expect(mockJsSipStart).toHaveBeenCalledTimes(1);
    });

    act(() => {
      mockJsSipEventHandlers.registrationFailed?.({
        response: {
          status_code: 403,
          reason_phrase: 'Forbidden',
        },
      });
    });

    expect(await screen.findByText('坐席注册失败：403 Forbidden')).toBeTruthy();
  });

  it('binds remote audio when JsSIP creates peer connection after incoming session', async () => {
    const sessionEventHandlers: Record<string, (...args: unknown[]) => void> =
      {};
    let trackHandler: ((event: RTCTrackEvent) => void) | undefined;
    const remoteStream = { id: 'remote-stream' } as unknown as MediaStream;

    render(<AgentHarness />);

    fireEvent.click(screen.getByRole('button', { name: '上线' }));
    expect(await screen.findByText('available')).toBeTruthy();

    act(() => {
      mockJsSipEventHandlers.newRTCSession?.({
        session: {
          answer: jest.fn(),
          terminate: jest.fn(),
          on: jest.fn(
            (event: string, handler: (...args: unknown[]) => void) => {
              sessionEventHandlers[event] = handler;
            },
          ),
        },
      });
    });

    expect(screen.getByText('incoming')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '接听' }));

    act(() => {
      sessionEventHandlers.peerconnection?.({
        peerconnection: {
          addEventListener: jest.fn((event: string, handler: unknown) => {
            if (event === 'track') {
              trackHandler = handler as (event: RTCTrackEvent) => void;
            }
          }),
        },
      });
      trackHandler?.({ streams: [remoteStream] } as unknown as RTCTrackEvent);
    });

    expect(screen.getByText('remote-audio-ready')).toBeTruthy();
  });

  it('shows answer failure detail when the browser cannot answer incoming WebRTC call', async () => {
    render(<AgentHarness />);

    fireEvent.click(screen.getByRole('button', { name: '上线' }));
    expect(await screen.findByText('available')).toBeTruthy();

    act(() => {
      mockJsSipEventHandlers.newRTCSession?.({
        session: {
          answer: jest.fn(() => {
            throw new Error('Failed to set local description');
          }),
          terminate: jest.fn(),
          on: jest.fn(),
        },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: '接听' }));

    expect(
      await screen.findByText('坐席接听失败：Failed to set local description'),
    ).toBeTruthy();
    expect(screen.getByText('available')).toBeTruthy();
  });

  it('shows JsSIP failure detail after an incoming WebRTC session fails', async () => {
    const sessionEventHandlers: Record<string, (...args: unknown[]) => void> =
      {};

    render(<AgentHarness />);

    fireEvent.click(screen.getByRole('button', { name: '上线' }));
    expect(await screen.findByText('available')).toBeTruthy();

    act(() => {
      mockJsSipEventHandlers.newRTCSession?.({
        session: {
          answer: jest.fn(),
          terminate: jest.fn(),
          on: jest.fn(
            (event: string, handler: (...args: unknown[]) => void) => {
              sessionEventHandlers[event] = handler;
            },
          ),
        },
      });
    });

    act(() => {
      sessionEventHandlers.failed?.({ cause: 'NO_ANSWER' });
    });

    expect(await screen.findByText('坐席通话失败：NO_ANSWER')).toBeTruthy();
    expect(screen.getByText('available')).toBeTruthy();
  });

  it('times out when SIP registration does not complete', async () => {
    jest.useFakeTimers();
    mockJsSipAutoRegister = false;
    render(<AgentHarness />);

    fireEvent.click(screen.getByRole('button', { name: '上线' }));
    await flushPromises();

    await waitFor(() => {
      expect(mockJsSipStart).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('registering')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(15_000);
    });

    expect(
      screen.getByText(
        '坐席注册超时，请检查 SIP WebSocket 地址、账号密码或网络连接',
      ),
    ).toBeTruthy();
    expect(mockJsSipStop).toHaveBeenCalledTimes(1);
  });
});
