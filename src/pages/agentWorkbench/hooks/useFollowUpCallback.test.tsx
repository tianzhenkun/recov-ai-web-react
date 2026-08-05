import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import * as React from 'react';
import { useFollowUpCallback } from './useFollowUpCallback';

jest.mock('livekit-client', () => ({
  ConnectionQuality: {},
  DisconnectReason: {},
  RoomEvent: {},
  Track: { Kind: { Audio: 'audio' } },
  Room: jest.fn(),
  createLocalAudioTrack: jest.fn(),
}));

const credential = {
  call_id: 'call-callback-1',
  status: 'accepted' as const,
  livekit_url: 'wss://livekit.example.com',
  participant_token: 'callback-token',
  participant_identity: 'human-callback-call-callback-1',
  expires_in_seconds: 60,
};

const createRoom = () => {
  let disconnected: (() => void) | undefined;
  let remoteAudio: (() => void) | undefined;
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    publishMicrophone: jest.fn().mockResolvedValue(undefined),
    setMicrophoneEnabled: jest.fn().mockResolvedValue(undefined),
    switchAudioInput: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    onDisconnected: jest.fn((handler) => {
      disconnected = handler;
    }),
    onRemoteAudio: jest.fn((handler) => {
      remoteAudio = handler;
    }),
    onNetworkQuality: jest.fn(),
    emitDisconnected: () => disconnected?.(),
    emitRemoteAudio: () => remoteAudio?.(),
  };
};

const Harness = ({ options }: { options: any }) => {
  const call = useFollowUpCallback(options);
  const [endResult, setEndResult] = React.useState('');
  return (
    <div>
      <span data-testid="phase">{call.phase}</span>
      <span data-testid="remote-audio">
        {call.remoteAudioReady ? 'yes' : 'no'}
      </span>
      <span data-testid="end-result">{endResult}</span>
      <button
        type="button"
        onClick={() =>
          void call.endCall().then((result) => setEndResult(String(result)))
        }
      >
        结束
      </button>
    </div>
  );
};

describe('useFollowUpCallback', () => {
  afterEach(cleanup);

  it('joins the callback room, publishes the microphone, and ends the SIP call', async () => {
    const room = createRoom();
    const end = jest.fn().mockResolvedValue({ code: 200 });
    render(
      <Harness
        options={{
          credential,
          followUpId: 'follow-up-1',
          consoleSessionId: 'session-1',
          roomFactory: () => room,
          services: { end },
        }}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('phase').textContent).toBe('connected'),
    );
    expect(room.connect).toHaveBeenCalledWith(
      credential.livekit_url,
      credential.participant_token,
    );
    expect(room.publishMicrophone).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '结束' }));

    await waitFor(() =>
      expect(screen.getByTestId('phase').textContent).toBe('ended'),
    );
    expect(screen.getByTestId('end-result').textContent).toBe('true');
    expect(end).toHaveBeenCalledWith(
      'follow-up-1',
      credential.call_id,
      expect.objectContaining({ consoleSessionId: 'session-1' }),
    );
    expect(room.disconnect).toHaveBeenCalledTimes(1);
  });
});
