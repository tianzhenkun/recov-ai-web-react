import { createLocalAudioTrack, Room } from 'livekit-client';
import {
  endVoicePreviewSession,
  markVoicePreviewReady,
} from '@/services/ruoyi/ai-call-voices';
import { connectVoicePreview } from './VoicePreview';

jest.mock('@/services/ruoyi/ai-call-voices', () => ({
  endVoicePreviewSession: jest.fn(),
  markVoicePreviewReady: jest.fn(),
}));

jest.mock('livekit-client', () => ({
  __mockLiveKit: {
    roomConnect: jest.fn(),
    roomDisconnect: jest.fn(),
    roomHandlers: new Map(),
  },
  RoomEvent: {
    TrackSubscribed: 'trackSubscribed',
  },
  Room: jest.fn().mockImplementation(() => {
    const { __mockLiveKit } = jest.requireMock('livekit-client');
    return {
      connect: __mockLiveKit.roomConnect,
      disconnect: __mockLiveKit.roomDisconnect,
      on: jest.fn((eventName, handler) => {
        __mockLiveKit.roomHandlers.set(eventName, handler);
      }),
    };
  }),
  createLocalAudioTrack: jest.fn(),
}));

const liveKitMock = jest.requireMock('livekit-client').__mockLiveKit;
const mockReady = markVoicePreviewReady as jest.Mock;
const mockEnd = endVoicePreviewSession as jest.Mock;

const session = {
  callId: 'call-preview-1',
  roomName: 'voice-preview-room',
  participantToken: 'participant-token-1',
  livekitUrl: 'ws://127.0.0.1:7880',
};

describe('connectVoicePreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    liveKitMock.roomHandlers.clear();
    mockReady.mockResolvedValue(undefined);
    mockEnd.mockResolvedValue(undefined);
  });

  afterEach(() => {
    document.body.querySelectorAll('audio').forEach((audio) => {
      audio.remove();
    });
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('connects, plays remote audio and never creates a microphone track', async () => {
    const preview = await connectVoicePreview(session);

    expect(Room).toHaveBeenCalledWith({
      adaptiveStream: true,
      dynacast: true,
    });
    expect(liveKitMock.roomConnect).toHaveBeenCalledWith(
      'ws://127.0.0.1:7880',
      'participant-token-1',
    );
    expect(createLocalAudioTrack).not.toHaveBeenCalled();
    expect(mockReady).toHaveBeenCalledWith('call-preview-1');

    const remoteAudio = document.createElement('audio');
    const play = jest.fn().mockResolvedValue(undefined);
    const pause = jest.fn();
    Object.defineProperties(remoteAudio, {
      pause: { value: pause },
      play: { value: play },
    });
    const remoteTrack = {
      attach: jest.fn(() => remoteAudio),
      kind: 'audio',
    };

    liveKitMock.roomHandlers.get('trackSubscribed')?.(remoteTrack);

    expect(remoteTrack.attach).toHaveBeenCalledTimes(1);
    expect(remoteAudio.autoplay).toBe(true);
    expect(remoteAudio.muted).toBe(false);
    expect(remoteAudio.hasAttribute('playsinline')).toBe(true);
    expect(document.body.contains(remoteAudio)).toBe(true);
    expect(play).toHaveBeenCalledTimes(1);

    await preview.disconnect();

    expect(pause).toHaveBeenCalledTimes(1);
    expect(document.body.contains(remoteAudio)).toBe(false);
    expect(liveKitMock.roomDisconnect).toHaveBeenCalledWith(true);
    expect(mockEnd).toHaveBeenCalledWith('call-preview-1');
  });

  it('cleans the room and server session when LiveKit connect fails', async () => {
    liveKitMock.roomConnect.mockRejectedValueOnce(
      new Error('LiveKit unavailable'),
    );

    await expect(connectVoicePreview(session)).rejects.toThrow(
      'LiveKit unavailable',
    );

    expect(createLocalAudioTrack).not.toHaveBeenCalled();
    expect(mockReady).not.toHaveBeenCalled();
    expect(liveKitMock.roomDisconnect).toHaveBeenCalledWith(true);
    expect(mockEnd).toHaveBeenCalledWith('call-preview-1');
    expect(document.body.querySelector('audio')).toBeNull();
  });

  it('cleans up when the ready signal fails', async () => {
    mockReady.mockRejectedValueOnce(new Error('ready rejected'));

    await expect(connectVoicePreview(session)).rejects.toThrow(
      'ready rejected',
    );

    expect(liveKitMock.roomDisconnect).toHaveBeenCalledWith(true);
    expect(mockEnd).toHaveBeenCalledWith('call-preview-1');
  });

  it('automatically disconnects after 30 seconds', async () => {
    jest.useFakeTimers();
    await connectVoicePreview(session);

    jest.advanceTimersByTime(29_999);
    await Promise.resolve();
    expect(mockEnd).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    await Promise.resolve();

    expect(liveKitMock.roomDisconnect).toHaveBeenCalledWith(true);
    expect(mockEnd).toHaveBeenCalledWith('call-preview-1');
  });

  it('disconnects when the page is being unloaded', async () => {
    await connectVoicePreview(session);

    window.dispatchEvent(new Event('pagehide'));
    await Promise.resolve();
    await Promise.resolve();

    expect(liveKitMock.roomDisconnect).toHaveBeenCalledWith(true);
    expect(mockEnd).toHaveBeenCalledWith('call-preview-1');
  });

  it('disconnects idempotently when cleanup is requested twice', async () => {
    const preview = await connectVoicePreview(session);

    await Promise.all([preview.disconnect(), preview.disconnect()]);

    expect(liveKitMock.roomDisconnect).toHaveBeenCalledTimes(1);
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });
});
