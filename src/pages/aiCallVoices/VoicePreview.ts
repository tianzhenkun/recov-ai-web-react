import { Room, RoomEvent } from 'livekit-client';
import {
  endVoicePreviewSession,
  markVoicePreviewReady,
} from '@/services/ruoyi/ai-call-voices';
import type { VoicePreviewSession } from '@/services/ruoyi/ai-call-voices.types';

type VoicePreviewConnectionSession = Pick<
  VoicePreviewSession,
  'callId' | 'livekitUrl' | 'participantToken'
>;

export type VoicePreviewConnection = {
  disconnect: () => Promise<void>;
};

export const connectVoicePreview = async (
  session: VoicePreviewConnectionSession,
): Promise<VoicePreviewConnection> => {
  if (!session.livekitUrl || !session.participantToken) {
    throw new Error('缺少 LiveKit 连接信息');
  }

  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });
  const remoteAudioElements: HTMLMediaElement[] = [];
  let closed = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let disconnectPromise: Promise<void> | undefined;
  let pageHideListenerRegistered = false;

  room.on(RoomEvent.TrackSubscribed, (track) => {
    if (closed || track.kind !== 'audio') return;
    const media = track.attach() as HTMLMediaElement;
    media.autoplay = true;
    media.muted = false;
    media.setAttribute('playsinline', '');
    document.body.appendChild(media);
    remoteAudioElements.push(media);
    void media.play().catch(() => undefined);
  });

  const disconnect = () => {
    if (disconnectPromise) return disconnectPromise;
    closed = true;
    if (timeout !== undefined) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    if (pageHideListenerRegistered) {
      window.removeEventListener('pagehide', handlePageHide);
      pageHideListenerRegistered = false;
    }

    disconnectPromise = (async () => {
      remoteAudioElements.forEach((media) => {
        media.pause();
        media.remove();
      });
      remoteAudioElements.length = 0;

      let cleanupError: unknown;
      try {
        await room.disconnect(true);
      } catch (error) {
        cleanupError = error;
      }
      try {
        await endVoicePreviewSession(session.callId);
      } catch (error) {
        cleanupError ??= error;
      }
      if (cleanupError) {
        throw cleanupError;
      }
    })();
    return disconnectPromise;
  };

  const handlePageHide = () => {
    void disconnect().catch(() => undefined);
  };

  try {
    await room.connect(session.livekitUrl, session.participantToken);
    await markVoicePreviewReady(session.callId);
  } catch (error) {
    try {
      await disconnect();
    } catch {
      // 保留连接或 ready 的原始错误；清理失败不能覆盖根因。
    }
    throw error;
  }

  window.addEventListener('pagehide', handlePageHide);
  pageHideListenerRegistered = true;
  timeout = setTimeout(() => {
    void disconnect().catch(() => undefined);
  }, 30_000);

  return { disconnect };
};
