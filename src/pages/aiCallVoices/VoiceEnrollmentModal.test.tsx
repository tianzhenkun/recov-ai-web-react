import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import VoiceEnrollmentModal from './VoiceEnrollmentModal';

const getFileInput = () => {
  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('未找到声音样本文件选择框');
  }
  return input;
};

const fillNameAndSample = (
  file = new File(['voice'], 'voice.mp3', {
    type: 'audio/mpeg',
  }),
) => {
  fireEvent.change(screen.getByLabelText('音色展示名'), {
    target: { value: '客服小林' },
  });
  fireEvent.change(getFileInput(), { target: { files: [file] } });
};

describe('VoiceEnrollmentModal', () => {
  afterEach(cleanup);

  it('requires consent and ignores a synchronous second submit', async () => {
    let resolveSubmit: (() => void) | undefined;
    const submit = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    render(
      <VoiceEnrollmentModal onCancel={jest.fn()} onSubmit={submit} open />,
    );

    fillNameAndSample();
    const submitButton = screen.getByRole('button', {
      name: '提交复刻',
    }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    expect(submit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(submitButton.disabled).toBe(false));
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submitButton.disabled).toBe(true);
    await act(async () => {
      resolveSubmit?.();
    });
    await waitFor(() => expect(submitButton.disabled).toBe(false));
  });

  it.each([
    ['sample.wav', 'audio/wav'],
    ['sample.mp3', 'audio/mpeg'],
    ['sample.m4a', 'audio/mp4'],
  ])('accepts a valid %s sample', async (name, type) => {
    render(
      <VoiceEnrollmentModal
        onCancel={jest.fn()}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
        open
      />,
    );

    const input = getFileInput();
    expect(input.accept).toBe('.wav,.mp3,.m4a');
    fireEvent.change(input, {
      target: { files: [new File(['voice'], name, { type })] },
    });

    expect(await screen.findByText(name)).toBeTruthy();
    expect(screen.queryByText('声音样本仅支持 WAV、MP3 或 M4A')).toBeNull();
  });

  it('rejects a sample that is 10 MB or larger', async () => {
    render(
      <VoiceEnrollmentModal
        onCancel={jest.fn()}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
        open
      />,
    );
    const oversized = new File(['voice'], 'large.wav', { type: 'audio/wav' });
    Object.defineProperty(oversized, 'size', { value: 10 * 1024 * 1024 });

    fireEvent.change(getFileInput(), { target: { files: [oversized] } });

    expect(await screen.findByText('声音样本必须小于 10 MB')).toBeTruthy();
    expect(screen.queryByText('large.wav')).toBeNull();
  });

  it('clears form and selected sample when cancelled', async () => {
    const onCancel = jest.fn();
    render(
      <VoiceEnrollmentModal
        onCancel={onCancel}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
        open
      />,
    );
    fillNameAndSample();
    fireEvent.click(screen.getByRole('checkbox'));

    expect(await screen.findByText('voice.mp3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      const input = screen.getByLabelText('音色展示名') as HTMLInputElement;
      expect(input.value).toBe('');
    });
    expect(screen.queryByText('voice.mp3')).toBeNull();
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(
      false,
    );
  });

  it('keeps the display name when reenrolling a failed voice', async () => {
    const submit = jest.fn().mockResolvedValue(undefined);
    render(
      <VoiceEnrollmentModal
        initialDisplayName="客服小林"
        mode="reenroll"
        onCancel={jest.fn()}
        onSubmit={submit}
        open
      />,
    );

    const nameInput = screen.getByLabelText('音色展示名') as HTMLInputElement;
    expect(nameInput.value).toBe('客服小林');
    expect(nameInput.disabled).toBe(true);
    fireEvent.change(getFileInput(), {
      target: {
        files: [
          new File(['replacement'], 'replacement.m4a', { type: 'audio/mp4' }),
        ],
      },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    const submitButton = screen.getByRole('button', {
      name: '提交复刻',
    }) as HTMLButtonElement;
    await waitFor(() => expect(submitButton.disabled).toBe(false));
    fireEvent.click(submitButton);

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: '客服小林' }),
      expect.objectContaining({ name: 'replacement.m4a' }),
    );
  });
});
