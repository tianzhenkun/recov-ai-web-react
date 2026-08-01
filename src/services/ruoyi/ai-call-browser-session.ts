import {
  type AiCallLabCreateSessionRequest,
  type AiCallLabSession,
  createAiCallLabSession,
  endAiCallLabSession,
} from './ai-call-lab';
import {
  type AiCallRuntimeStartAccepted,
  createAiCallRuntimeEndCall,
  createAiCallRuntimeStartCall,
} from './ai-call-runtime';
import {
  getAiCallRuntimeErrorCode,
  waitForAiCallRuntimeReadyToken,
} from './ai-call-runtime-session';

export type AiCallBrowserSessionStartRequest = AiCallLabCreateSessionRequest & {
  idempotencyKey: string;
};

export type AiCallBrowserSession = AiCallLabSession & {
  runtimeControlMode: 'owner_command_v1' | 'legacy_local';
};

export class AiCallBrowserRuntimeStartError extends Error {
  readonly callId: string;
  readonly cause: unknown;

  constructor(callId: string, cause: unknown) {
    super(`AI Call ${callId} runtime start did not reach readiness`);
    this.name = 'AiCallBrowserRuntimeStartError';
    this.callId = callId;
    this.cause = cause;
  }
}

export const createAiCallBrowserSession = async (
  request: AiCallBrowserSessionStartRequest,
): Promise<AiCallBrowserSession> => {
  const { idempotencyKey, ...legacyRequest } = request;
  let accepted: AiCallRuntimeStartAccepted;
  try {
    accepted = await createAiCallRuntimeStartCall({
      entryType: 'web',
      idempotencyKey,
      payload: {
        voice: request.voice || '',
        sceneCode: request.sceneCode || '',
        businessId: request.businessId || '',
        businessParams: request.businessParams || {},
      },
      businessId: request.businessId,
      sceneCode: request.sceneCode,
    });
  } catch (error) {
    if (getAiCallRuntimeErrorCode(error) !== 'LEGACY_ENTRY_ACTIVE') {
      throw error;
    }
    return {
      ...(await createAiCallLabSession(legacyRequest)),
      runtimeControlMode: 'legacy_local',
    };
  }

  try {
    const { token } = await waitForAiCallRuntimeReadyToken(accepted.callId);
    return {
      runtimeControlMode: 'owner_command_v1',
      callId: token.callId,
      roomName: token.roomName,
      livekitUrl: token.livekitUrl,
      participantToken: token.participantToken,
      status: 'ready',
    };
  } catch (error) {
    throw new AiCallBrowserRuntimeStartError(accepted.callId, error);
  }
};

export const endAiCallBrowserSession = async (
  session: Pick<AiCallBrowserSession, 'callId' | 'runtimeControlMode'>,
  dedupeKey: string,
) => {
  if (session.runtimeControlMode === 'owner_command_v1') {
    return createAiCallRuntimeEndCall(session.callId, {
      dedupeKey,
      endReason: 'user_requested',
    });
  }
  return endAiCallLabSession(session.callId);
};
