import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import {
  createAiCallLabSession,
  endAiCallLabSession,
  getAiCallLabDialoguePreview,
  getAiCallLabEvents,
  getAiCallLabHandoff,
  getAiCallLabPromptProfiles,
  getAiCallLabRecording,
  getAiCallLabSession,
  getAiCallLabVoiceProfiles,
  reportAiCallLabBrowserEvent,
} from '@/services/ruoyi/ai-call-lab';
import AiCallLabCustomerPage from './index';
import { connectAiCallLabRoom } from './livekitClient';

jest.mock('@/services/ruoyi/ai-call-lab', () => ({
  createAiCallLabSession: jest.fn(),
  endAiCallLabSession: jest.fn(),
  getAiCallLabDialoguePreview: jest.fn(),
  getAiCallLabEvents: jest.fn(),
  getAiCallLabHandoff: jest.fn(),
  getAiCallLabPromptProfiles: jest.fn(),
  getAiCallLabRecording: jest.fn(),
  getAiCallLabSession: jest.fn(),
  getAiCallLabVoiceProfiles: jest.fn(),
  reportAiCallLabBrowserEvent: jest.fn(),
}));

jest.mock(
  './livekitClient',
  () => ({
    connectAiCallLabRoom: jest.fn(),
  }),
  { virtual: true },
);

const createSessionMock = createAiCallLabSession as jest.Mock;
const endSessionMock = endAiCallLabSession as jest.Mock;
const getDialogueMock = getAiCallLabDialoguePreview as jest.Mock;
const getEventsMock = getAiCallLabEvents as jest.Mock;
const getHandoffMock = getAiCallLabHandoff as jest.Mock;
const getPromptProfilesMock = getAiCallLabPromptProfiles as jest.Mock;
const getRecordingMock = getAiCallLabRecording as jest.Mock;
const getSessionMock = getAiCallLabSession as jest.Mock;
const getVoiceProfilesMock = getAiCallLabVoiceProfiles as jest.Mock;
const reportBrowserEventMock = reportAiCallLabBrowserEvent as jest.Mock;
const connectRoomMock = connectAiCallLabRoom as jest.Mock;

describe('AiCallLabCustomerPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getVoiceProfilesMock.mockResolvedValue({
      rows: [{ voice: 'Tina', displayName: '甜甜 Tina', gender: '女声' }],
      total: 1,
    });
    getPromptProfilesMock.mockResolvedValue({
      rows: [
        {
          id: 'profile-geo',
          name: 'GEO 产品介绍',
          sceneCode: 'intro_geo',
        },
      ],
      total: 1,
    });
    createSessionMock.mockResolvedValue({
      callId: 'call-1',
      roomName: 'ai-call-call-1',
      model: 'qwen3.5-omni-plus-realtime',
      status: 'created',
      participantToken: 'token-1',
      livekitUrl: 'ws://127.0.0.1:7880',
    });
    endSessionMock.mockResolvedValue({
      code: 200,
      data: { callId: 'call-1', status: 'completed' },
    });
    getSessionMock.mockResolvedValue({
      callId: 'call-1',
      status: 'connected',
      metrics: { lastModelFirstAudioMs: 320 },
    });
    getRecordingMock.mockResolvedValue({
      status: 'recording',
      egressId: 'egress-1',
    });
    getHandoffMock.mockResolvedValue(null);
    getDialogueMock.mockResolvedValue({
      rows: [
        { speakerType: 'ai', text: '张总您好', segmentNo: 1 },
        { speakerType: 'customer', text: '你好', segmentNo: 2 },
      ],
    });
    getEventsMock.mockResolvedValue({
      rows: [
        { eventId: 'event-1', eventType: 'session_created' },
        { eventId: 'event-2', eventType: 'ai_audio_published' },
      ],
    });
    reportBrowserEventMock.mockResolvedValue({});
    connectRoomMock.mockResolvedValue({
      disconnect: jest.fn(),
      setMicrophoneEnabled: jest.fn(),
    });
  });

  it('loads selectable voice and business scene options', async () => {
    render(React.createElement(AiCallLabCustomerPage));

    expect(screen.getByText('AI Call 浏览器通话测试台')).toBeTruthy();
    expect(await screen.findByText(/甜甜 Tina/)).toBeTruthy();
    expect(screen.getByText(/GEO 产品介绍/)).toBeTruthy();
  });

  it('shows an unavailable state instead of an endless loading button when configuration fails', async () => {
    getVoiceProfilesMock.mockRejectedValue(new Error('request timeout'));

    render(React.createElement(AiCallLabCustomerPage));

    const unavailableButton = await screen.findByRole('button', {
      name: '暂无可用配置',
    });
    expect((unavailableButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText('加载配置')).toBeNull();
  });

  it('creates a browser session, refreshes observability and connects microphone', async () => {
    render(React.createElement(AiCallLabCustomerPage));

    fireEvent.click(await screen.findByRole('button', { name: /创建会话/ }));

    await waitFor(() => {
      expect(createSessionMock).toHaveBeenCalledWith({
        voice: 'Tina',
        sceneCode: 'intro_geo',
        businessId: '',
        businessParams: { customerName: '张总' },
      });
    });
    expect(screen.getByText('AI 音频')).toBeTruthy();
    expect(screen.getByText('已发布')).toBeTruthy();
    expect(screen.getByText('首包')).toBeTruthy();
    expect(screen.getByText('张总您好')).toBeTruthy();
    expect(screen.queryByText('Call ID')).toBeNull();
    expect(screen.queryByText('诊断日志')).toBeNull();
    expect(screen.queryByText('session_created')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /调试信息/ }));

    expect(await screen.findByText('call-1')).toBeTruthy();
    expect(screen.getByText('ai-call-call-1')).toBeTruthy();
    expect(screen.getByText('qwen3.5-omni-plus-realtime')).toBeTruthy();
    expect(screen.getByText('egress-1')).toBeTruthy();
    expect(screen.getByText('session_created')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /连接麦克风/ }));

    await waitFor(() => {
      expect(connectRoomMock).toHaveBeenCalledWith(
        expect.objectContaining({
          callId: 'call-1',
          participantToken: 'token-1',
          livekitUrl: 'ws://127.0.0.1:7880',
        }),
      );
      expect(reportBrowserEventMock).toHaveBeenCalledWith('call-1', {
        type: 'browser_ready',
      });
    });
    expect(screen.getByText('麦克风：开')).toBeTruthy();
  });

  it('polls observability after creating a session', async () => {
    const pollingCallbacks: Array<() => void> = [];
    const setIntervalSpy = jest
      .spyOn(window, 'setInterval')
      .mockImplementation((handler: () => void, timeout?: number) => {
        if (timeout === 1500 && typeof handler === 'function') {
          pollingCallbacks.push(handler);
        }
        return {} as ReturnType<typeof window.setInterval>;
      });
    const clearIntervalSpy = jest
      .spyOn(window, 'clearInterval')
      .mockImplementation(() => undefined);

    try {
      render(React.createElement(AiCallLabCustomerPage));

      fireEvent.click(await screen.findByRole('button', { name: /创建会话/ }));

      await waitFor(() => {
        expect(getSessionMock).toHaveBeenCalledWith('call-1');
      });
      expect(pollingCallbacks).toHaveLength(1);
      expect(screen.queryByRole('button', { name: /刷新观测/ })).toBeNull();

      getSessionMock.mockClear();
      await act(async () => {
        pollingCallbacks[0]();
      });

      await waitFor(() => {
        expect(getSessionMock).toHaveBeenCalledWith('call-1');
      });
    } finally {
      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    }
  });

  it('prevents creating another session while the current session is active', async () => {
    render(React.createElement(AiCallLabCustomerPage));

    await screen.findByRole('button', {
      name: /创建会话/,
    });
    await screen.findByText(/甜甜 Tina/);
    fireEvent.click(screen.getByRole('button', { name: /创建会话/ }));

    await waitFor(() => {
      expect(createSessionMock).toHaveBeenCalledTimes(1);
    });
    const activeCreateButton = screen.getByRole('button', {
      name: /创建会话/,
    });
    expect(activeCreateButton.hasAttribute('disabled')).toBe(true);

    fireEvent.click(activeCreateButton);
    expect(createSessionMock).toHaveBeenCalledTimes(1);
  });

  it('stops automatic polling and offers a manual refresh for a terminal session', async () => {
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    createSessionMock.mockResolvedValueOnce({
      callId: 'call-1',
      roomName: 'ai-call-call-1',
      status: 'completed',
      participantToken: 'token-1',
      livekitUrl: 'ws://127.0.0.1:7880',
    });
    getSessionMock.mockResolvedValueOnce({
      callId: 'call-1',
      status: 'completed',
    });

    try {
      render(React.createElement(AiCallLabCustomerPage));

      await screen.findByText(/甜甜 Tina/);
      expect(screen.queryByRole('button', { name: /刷新结果/ })).toBeNull();
      fireEvent.click(await screen.findByRole('button', { name: /创建会话/ }));

      expect(
        await screen.findByRole('button', { name: /刷新结果/ }),
      ).toBeTruthy();
      expect(
        setIntervalSpy.mock.calls.some(([, timeout]) => timeout === 1500),
      ).toBe(false);
    } finally {
      setIntervalSpy.mockRestore();
    }
  });

  it('shows the recording failure reason', async () => {
    getRecordingMock.mockResolvedValueOnce({
      status: 'failed',
      failureMessage: '未找到可用的OSS配置',
    });

    render(React.createElement(AiCallLabCustomerPage));

    await screen.findByText(/甜甜 Tina/);
    fireEvent.click(await screen.findByRole('button', { name: /创建会话/ }));

    expect(await screen.findByText('录音失败原因')).toBeTruthy();
    expect(screen.getByText('未找到可用的OSS配置')).toBeTruthy();
  });

  it('shows an inline player when the recording is ready', async () => {
    getRecordingMock.mockResolvedValueOnce({
      status: 'completed',
      durationMs: 12_300,
      playUrl: 'https://files.test/call-1.mp3?signature=ready',
    });

    render(React.createElement(AiCallLabCustomerPage));

    await screen.findByText(/甜甜 Tina/);
    fireEvent.click(await screen.findByRole('button', { name: /创建会话/ }));

    const player = await screen.findByLabelText('播放通话录音');
    expect(player.getAttribute('src')).toBe(
      'https://files.test/call-1.mp3?signature=ready',
    );
  });

  it('disconnects locally and ends the backend session', async () => {
    const disconnectMock = jest.fn();
    connectRoomMock.mockResolvedValueOnce({
      disconnect: disconnectMock,
      setMicrophoneEnabled: jest.fn(),
    });
    getSessionMock
      .mockResolvedValueOnce({
        callId: 'call-1',
        status: 'connected',
      })
      .mockResolvedValueOnce({
        callId: 'call-1',
        status: 'completed',
      });

    render(React.createElement(AiCallLabCustomerPage));

    fireEvent.click(await screen.findByRole('button', { name: /创建会话/ }));
    await screen.findByText('connected');
    fireEvent.click(screen.getByRole('button', { name: /连接麦克风/ }));
    await screen.findByText('麦克风：开');

    fireEvent.click(screen.getByRole('button', { name: /结束会话/ }));

    await waitFor(() => {
      expect(disconnectMock).toHaveBeenCalledTimes(1);
      expect(endSessionMock).toHaveBeenCalledWith('call-1');
      expect(screen.getByText('completed')).toBeTruthy();
    });
    expect(
      screen.getByRole('button', { name: /结束会话/ }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('keeps backend ending retryable when the end request fails', async () => {
    const disconnectMock = jest.fn();
    connectRoomMock.mockResolvedValueOnce({
      disconnect: disconnectMock,
      setMicrophoneEnabled: jest.fn(),
    });
    endSessionMock.mockRejectedValueOnce(new Error('network error'));

    render(React.createElement(AiCallLabCustomerPage));

    fireEvent.click(await screen.findByRole('button', { name: /创建会话/ }));
    await screen.findByText('connected');
    fireEvent.click(screen.getByRole('button', { name: /连接麦克风/ }));
    await screen.findByText('麦克风：开');

    fireEvent.click(screen.getByRole('button', { name: /结束会话/ }));

    await waitFor(() => {
      expect(disconnectMock).toHaveBeenCalledTimes(1);
      expect(endSessionMock).toHaveBeenCalledWith('call-1');
    });
    expect(screen.getByText('麦克风：未连接')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /结束会话/ }).hasAttribute('disabled'),
    ).toBe(false);
    expect(
      await screen.findByText('本地已断开，但后端会话结束失败，请重试'),
    ).toBeTruthy();
  });

  it('ends the backend session when LiveKit joining fails', async () => {
    connectRoomMock.mockRejectedValueOnce(new Error('LiveKit unavailable'));
    getSessionMock
      .mockResolvedValueOnce({
        callId: 'call-1',
        status: 'ready',
      })
      .mockResolvedValueOnce({
        callId: 'call-1',
        status: 'completed',
      });

    render(React.createElement(AiCallLabCustomerPage));

    await screen.findByText(/甜甜 Tina/);
    await waitFor(() => {
      expect(document.querySelector('.ant-spin-spinning')).toBeNull();
    });
    const createButton = screen.getByRole('button', { name: /创建会话/ });
    expect(createButton.hasAttribute('disabled')).toBe(false);
    fireEvent.click(createButton);
    await waitFor(() => expect(createSessionMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getSessionMock).toHaveBeenCalledWith('call-1'));
    fireEvent.click(screen.getByRole('button', { name: /连接麦克风/ }));

    await waitFor(() => {
      expect(endSessionMock).toHaveBeenCalledWith('call-1');
      expect(screen.getByText('completed')).toBeTruthy();
    });
    expect(screen.getByText('麦克风：未连接')).toBeTruthy();
  });

  it('keeps manual ending available when join rollback cannot end the backend session', async () => {
    connectRoomMock.mockRejectedValueOnce(new Error('LiveKit unavailable'));
    endSessionMock.mockRejectedValueOnce(new Error('end failed'));
    getSessionMock.mockResolvedValueOnce({
      callId: 'call-1',
      status: 'ready',
    });

    render(React.createElement(AiCallLabCustomerPage));

    await screen.findByText(/甜甜 Tina/);
    await waitFor(() => {
      expect(document.querySelector('.ant-spin-spinning')).toBeNull();
    });
    const createButton = screen.getByRole('button', { name: /创建会话/ });
    expect(createButton.hasAttribute('disabled')).toBe(false);
    fireEvent.click(createButton);
    await waitFor(() => expect(createSessionMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getSessionMock).toHaveBeenCalledWith('call-1'));
    fireEvent.click(screen.getByRole('button', { name: /连接麦克风/ }));

    await waitFor(() => {
      expect(endSessionMock).toHaveBeenCalledWith('call-1');
    });
    expect(
      screen.getByRole('button', { name: /结束会话/ }).hasAttribute('disabled'),
    ).toBe(false);
    expect(
      await screen.findByText(/后端会话回收失败，请点击“结束会话”重试/),
    ).toBeTruthy();
  });
});
