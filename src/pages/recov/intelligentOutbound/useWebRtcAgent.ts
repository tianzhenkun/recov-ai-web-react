import { UA, WebSocketInterface } from 'jssip';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AiCallAgentWebRtcConfig } from './service';

type JsSipUa = {
  start: () => void;
  stop: () => void;
  call?: (...args: unknown[]) => unknown;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
};

type JsSipSession = {
  answer: (options?: Record<string, unknown>) => void;
  terminate: () => void;
  connection?: RTCPeerConnection;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
};

type PeerConnectionEvent = {
  peerconnection?: RTCPeerConnection;
};

type LegacyStreamEvent = {
  stream?: MediaStream;
};

type JsSipStatic = {
  UA: new (config: Record<string, unknown>) => JsSipUa;
  WebSocketInterface: new (url: string) => unknown;
};

type JsSipSocket = {
  via_transport?: string;
};

declare global {
  interface Window {
    JsSIP?: JsSipStatic;
  }
}

const bundledJsSIP: JsSipStatic = {
  UA: UA as unknown as JsSipStatic['UA'],
  WebSocketInterface:
    WebSocketInterface as unknown as JsSipStatic['WebSocketInterface'],
};

const getJsSIP = () => {
  if (window.JsSIP?.UA && window.JsSIP.WebSocketInterface) {
    return window.JsSIP;
  }
  return bundledJsSIP;
};

const REGISTER_TIMEOUT_MS = 15_000;
const REGISTER_TIMEOUT_MESSAGE =
  '坐席注册超时，请检查 SIP WebSocket 地址、账号密码或网络连接';
const MICROPHONE_UNSUPPORTED_MESSAGE =
  '当前浏览器或页面环境不支持麦克风，请使用 Chrome/Edge 并通过 HTTPS 或 localhost 访问';
const INSECURE_ORIGIN_MESSAGE =
  '当前页面不是安全环境，浏览器会阻止麦克风，请通过 HTTPS 或 localhost 访问';
const HTTPS_WS_MESSAGE =
  '当前 HTTPS 页面不能连接 ws:// 坐席地址，请改用 wss://';

type WebRtcRuntimeSnapshot = {
  pageProtocol?: string;
  hostname?: string;
  isSecureContext?: boolean;
  hasMediaDevices?: boolean;
};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isLocalHostname = (hostname?: string) =>
  ['localhost', '127.0.0.1', '::1', '[::1]'].includes(
    String(hostname || '').toLowerCase(),
  );

const getRuntimeSnapshot = (): WebRtcRuntimeSnapshot => ({
  pageProtocol:
    typeof window === 'undefined' ? undefined : window.location.protocol,
  hostname:
    typeof window === 'undefined' ? undefined : window.location.hostname,
  isSecureContext:
    typeof window === 'undefined' ? undefined : window.isSecureContext,
  hasMediaDevices:
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia),
});

export const getWebRtcPreflightError = (
  config?: AiCallAgentWebRtcConfig | null,
  runtime: WebRtcRuntimeSnapshot = getRuntimeSnapshot(),
) => {
  if (!runtime.hasMediaDevices) return MICROPHONE_UNSUPPORTED_MESSAGE;
  if (runtime.isSecureContext === false && !isLocalHostname(runtime.hostname)) {
    return INSECURE_ORIGIN_MESSAGE;
  }
  if (
    runtime.pageProtocol === 'https:' &&
    firstText(config?.wsUrl).toLowerCase().startsWith('ws://')
  ) {
    return HTTPS_WS_MESSAGE;
  }
  return '';
};

const formatMediaErrorMessage = (error: unknown) => {
  const name = isRecord(error) ? firstText(error.name) : '';
  const message = error instanceof Error ? error.message : '';

  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return '麦克风权限被拒绝，请在浏览器地址栏允许麦克风后重新上线';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return '未检测到可用麦克风，请连接或启用麦克风后重新上线';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return '麦克风被其他应用占用或被系统阻止，请释放后重新上线';
  }
  if (
    name === 'OverconstrainedError' ||
    name === 'ConstraintNotSatisfiedError'
  ) {
    return '当前麦克风不满足 WebRTC 采集要求，请切换设备后重试';
  }

  return message ? `麦克风授权失败：${message}` : '麦克风授权或坐席注册失败';
};

const getResponseLike = (event: unknown) =>
  isRecord(event) && isRecord(event.response) ? event.response : undefined;

const formatRegistrationFailedMessage = (event: unknown) => {
  const response = getResponseLike(event);
  const statusCode = firstText(response?.status_code, response?.statusCode);
  const reason = firstText(response?.reason_phrase, response?.reasonPhrase);
  const cause = isRecord(event) ? firstText(event.cause) : '';
  const detail = firstText(
    [statusCode, reason].filter(Boolean).join(' '),
    cause,
  );
  return detail ? `坐席注册失败：${detail}` : '坐席注册失败';
};

const formatDisconnectedMessage = (event: unknown) => {
  const code = isRecord(event) ? firstText(event.code) : '';
  const reason = isRecord(event) ? firstText(event.reason) : '';
  const detail = [code, reason].filter(Boolean).join(' ');
  return detail ? `坐席连接已断开：${detail}` : '坐席连接已断开';
};

const formatSessionFailedMessage = (event: unknown) => {
  const response = getResponseLike(event);
  const statusCode = firstText(response?.status_code, response?.statusCode);
  const reason = firstText(response?.reason_phrase, response?.reasonPhrase);
  const cause = isRecord(event) ? firstText(event.cause) : '';
  const detail = firstText(
    [statusCode, reason].filter(Boolean).join(' '),
    cause,
  );
  return detail ? `坐席通话失败：${detail}` : '坐席通话失败';
};

const formatAnswerErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : firstText(error);
  return message ? `坐席接听失败：${message}` : '坐席接听失败';
};

export type WebRtcAgentStatus =
  | 'unregistered'
  | 'registering'
  | 'available'
  | 'incoming'
  | 'talking'
  | 'error';

export type UseWebRtcAgentResult = {
  status: WebRtcAgentStatus;
  registered: boolean;
  incoming: boolean;
  busy: boolean;
  remoteStream: MediaStream | null;
  errorMessage: string;
  diagnosticMessage: string;
  agentExtension: string;
  registerAgent: () => Promise<void>;
  unregisterAgent: () => void;
  answerIncoming: () => void;
  rejectIncoming: () => void;
  hangup: () => void;
};

const getMediaConstraints = () => ({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
  },
  video: false,
});

const getStreamFromTrackEvent = (event: RTCTrackEvent) => {
  const [stream] = event.streams || [];
  if (stream) return stream;
  if (event.track && typeof MediaStream !== 'undefined') {
    return new MediaStream([event.track]);
  }
  return null;
};

export const useWebRtcAgent = (
  config?: AiCallAgentWebRtcConfig | null,
): UseWebRtcAgentResult => {
  const uaRef = useRef<JsSipUa | null>(null);
  const incomingSessionRef = useRef<JsSipSession | null>(null);
  const activeSessionRef = useRef<JsSipSession | null>(null);
  const registrationTimerRef = useRef<number | null>(null);
  const [status, setStatus] = useState<WebRtcAgentStatus>('unregistered');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [diagnosticMessage, setDiagnosticMessage] = useState('');

  const agentExtension = String(config?.agentExtension || '');

  const clearRegistrationTimer = useCallback(() => {
    if (registrationTimerRef.current === null) return;
    window.clearTimeout(registrationTimerRef.current);
    registrationTimerRef.current = null;
  }, []);

  const cleanupSession = useCallback(() => {
    incomingSessionRef.current = null;
    activeSessionRef.current = null;
    setRemoteStream(null);
  }, []);

  const bindSession = useCallback(
    (session: JsSipSession) => {
      const boundConnections = new WeakSet<RTCPeerConnection>();
      const bindRemoteAudio = (connection?: RTCPeerConnection | null) => {
        if (!connection || boundConnections.has(connection)) return;
        boundConnections.add(connection);
        const updateConnectionDiagnostic = () => {
          const detail = [
            connection.iceConnectionState
              ? `ICE ${connection.iceConnectionState}`
              : '',
            connection.connectionState
              ? `连接 ${connection.connectionState}`
              : '',
          ]
            .filter(Boolean)
            .join('，');
          if (detail) setDiagnosticMessage(`WebRTC ${detail}`);
          if (
            connection.iceConnectionState === 'failed' ||
            connection.connectionState === 'failed'
          ) {
            setErrorMessage(
              'WebRTC 媒体协商失败，请检查浏览器网络、STUN/TURN 或麦克风权限',
            );
          }
        };
        connection.addEventListener(
          'iceconnectionstatechange',
          updateConnectionDiagnostic,
        );
        connection.addEventListener(
          'connectionstatechange',
          updateConnectionDiagnostic,
        );
        connection.addEventListener('track', (event) => {
          const stream = getStreamFromTrackEvent(event);
          if (stream) setRemoteStream(stream);
        });
        (
          connection as unknown as {
            addEventListener?: (
              event: 'addstream',
              handler: (event: LegacyStreamEvent) => void,
            ) => void;
          }
        ).addEventListener?.('addstream', (event) => {
          if (event.stream) setRemoteStream(event.stream);
        });
      };

      incomingSessionRef.current = session;
      setErrorMessage('');
      setDiagnosticMessage('收到坐席来电');
      setStatus('incoming');

      session.on('accepted', () => {
        setErrorMessage('');
        setDiagnosticMessage('坐席接听已应答');
        setStatus('talking');
      });
      session.on('confirmed', () => {
        setErrorMessage('');
        setDiagnosticMessage('WebRTC 通话已确认');
        setStatus('talking');
      });
      session.on('ended', () => {
        cleanupSession();
        setDiagnosticMessage('坐席通话已结束');
        setStatus(uaRef.current ? 'available' : 'unregistered');
      });
      session.on('failed', (event: unknown) => {
        setErrorMessage(formatSessionFailedMessage(event));
        setDiagnosticMessage('坐席通话失败');
        cleanupSession();
        setStatus(uaRef.current ? 'available' : 'unregistered');
      });
      session.on('peerconnection', (event: unknown) => {
        bindRemoteAudio((event as PeerConnectionEvent)?.peerconnection);
      });
      bindRemoteAudio(session.connection);
    },
    [cleanupSession],
  );

  const registerAgent = useCallback(async () => {
    if (!config?.wsUrl || !config.sipUri || !config.password) {
      setStatus('error');
      setErrorMessage('缺少坐席 WebRTC 配置');
      return;
    }
    const preflightError = getWebRtcPreflightError(config);
    if (preflightError) {
      setStatus('error');
      setErrorMessage(preflightError);
      return;
    }
    const jsSIP = getJsSIP();
    if (!jsSIP?.UA || !jsSIP.WebSocketInterface) {
      setStatus('error');
      setErrorMessage('未加载 JsSIP');
      return;
    }

    clearRegistrationTimer();
    cleanupSession();
    const previousUa = uaRef.current;
    uaRef.current = null;
    previousUa?.stop();
    setStatus('registering');
    setErrorMessage('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        getMediaConstraints(),
      );
      stream.getTracks?.().forEach((track) => {
        track.stop();
      });
      const socket = new jsSIP.WebSocketInterface(config.wsUrl) as JsSipSocket;
      const viaTransport = firstText(config.viaTransport);
      if (viaTransport) {
        socket.via_transport = viaTransport;
      }
      const ua = new jsSIP.UA({
        sockets: [socket],
        uri: config.sipUri,
        password: config.password,
        display_name: config.displayName || agentExtension || 'WebRTC Agent',
        register: true,
        session_timers: false,
      });

      ua.on('registered', () => {
        if (uaRef.current !== ua) return;
        clearRegistrationTimer();
        setErrorMessage('');
        setDiagnosticMessage('坐席已注册');
        setStatus('available');
      });
      ua.on('registrationFailed', (event: unknown) => {
        if (uaRef.current !== ua) return;
        clearRegistrationTimer();
        uaRef.current = null;
        ua.stop();
        setStatus('error');
        setErrorMessage(formatRegistrationFailedMessage(event));
        setDiagnosticMessage('');
      });
      ua.on('disconnected', (event: unknown) => {
        if (uaRef.current !== ua) return;
        clearRegistrationTimer();
        uaRef.current = null;
        setStatus('error');
        setErrorMessage(formatDisconnectedMessage(event));
        setDiagnosticMessage('');
      });
      ua.on('newRTCSession', (event: unknown) => {
        const session = (event as { session?: JsSipSession }).session;
        if (session) bindSession(session);
      });

      uaRef.current = ua;
      registrationTimerRef.current = window.setTimeout(() => {
        if (uaRef.current !== ua) return;
        uaRef.current = null;
        ua.stop();
        setStatus('error');
        setErrorMessage(REGISTER_TIMEOUT_MESSAGE);
      }, REGISTER_TIMEOUT_MS);
      ua.start();
    } catch (error) {
      clearRegistrationTimer();
      const ua = uaRef.current;
      uaRef.current = null;
      ua?.stop();
      setStatus('error');
      setErrorMessage(formatMediaErrorMessage(error));
      setDiagnosticMessage('');
    }
  }, [
    agentExtension,
    bindSession,
    cleanupSession,
    clearRegistrationTimer,
    config,
  ]);

  const unregisterAgent = useCallback(() => {
    clearRegistrationTimer();
    cleanupSession();
    const ua = uaRef.current;
    uaRef.current = null;
    ua?.stop();
    setErrorMessage('');
    setDiagnosticMessage('');
    setStatus('unregistered');
  }, [cleanupSession, clearRegistrationTimer]);

  const answerIncoming = useCallback(() => {
    const session = incomingSessionRef.current;
    if (!session) return;
    setErrorMessage('');
    setDiagnosticMessage('已点击接听，正在建立 WebRTC');
    try {
      session.answer({
        mediaConstraints: getMediaConstraints(),
        pcConfig: {
          iceServers: config?.iceServers || [],
        },
      });
      activeSessionRef.current = session;
      incomingSessionRef.current = null;
      setStatus('talking');
    } catch (error) {
      setErrorMessage(formatAnswerErrorMessage(error));
      setDiagnosticMessage('坐席接听失败');
      try {
        session.terminate();
      } catch {
        // Ignore terminate failures after a failed local answer attempt.
      }
      cleanupSession();
      setStatus(uaRef.current ? 'available' : 'unregistered');
    }
  }, [cleanupSession, config?.iceServers]);

  const rejectIncoming = useCallback(() => {
    incomingSessionRef.current?.terminate();
    cleanupSession();
    setDiagnosticMessage('已拒接坐席来电');
    setStatus(uaRef.current ? 'available' : 'unregistered');
  }, [cleanupSession]);

  const hangup = useCallback(() => {
    activeSessionRef.current?.terminate();
    incomingSessionRef.current?.terminate();
    cleanupSession();
    setDiagnosticMessage('已挂断坐席通话');
    setStatus(uaRef.current ? 'available' : 'unregistered');
  }, [cleanupSession]);

  useEffect(() => unregisterAgent, [unregisterAgent]);

  return useMemo(
    () => ({
      status,
      registered:
        status === 'available' || status === 'incoming' || status === 'talking',
      incoming: status === 'incoming',
      busy: status === 'talking',
      remoteStream,
      errorMessage,
      diagnosticMessage,
      agentExtension,
      registerAgent,
      unregisterAgent,
      answerIncoming,
      rejectIncoming,
      hangup,
    }),
    [
      agentExtension,
      answerIncoming,
      diagnosticMessage,
      errorMessage,
      hangup,
      registerAgent,
      rejectIncoming,
      remoteStream,
      status,
      unregisterAgent,
    ],
  );
};
