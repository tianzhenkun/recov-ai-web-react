import { cleanup, render, screen } from '@testing-library/react';
import * as React from 'react';
import CurrentCallPanel from './CurrentCallPanel';

describe('CurrentCallPanel', () => {
  afterEach(cleanup);

  it('shows the concrete media connection stage while claiming', () => {
    render(
      <CurrentCallPanel
        phase="connecting"
        connectionStage="microphone_publishing"
        microphoneEnabled
        remoteAudioReady={false}
        networkQuality="unknown"
        onToggleMicrophone={jest.fn()}
        onSwitchAudioInput={jest.fn()}
        onEndCall={jest.fn()}
      />,
    );

    expect(screen.getByText('正在发布麦克风')).toBeTruthy();
  });
});
