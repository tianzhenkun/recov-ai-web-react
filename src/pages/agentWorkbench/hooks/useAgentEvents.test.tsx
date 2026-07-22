import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import * as React from 'react';
import {
  type AgentEventHandlers,
  type UseAgentEventsOptions,
  useAgentEvents,
} from './useAgentEvents';

const EventsHarness = ({ options }: { options: UseAgentEventsOptions }) => {
  const events = useAgentEvents(options);
  return (
    <div>
      <span data-testid="transport">{events.transport}</span>
      <span data-testid="unread">{events.unreadCount}</span>
      <button type="button" onClick={events.clearUnread}>
        清除未读
      </button>
      <button
        type="button"
        onClick={() => void events.requestNotificationPermission()}
      >
        开启通知
      </button>
    </div>
  );
};

const createConnector = () => {
  let handlers: AgentEventHandlers | undefined;
  const disconnect = jest.fn();
  return {
    connect: jest.fn((nextHandlers: AgentEventHandlers) => {
      handlers = nextHandlers;
      return disconnect;
    }),
    disconnect,
    get handlers() {
      if (!handlers) throw new Error('connector was not started');
      return handlers;
    },
  };
};

describe('useAgentEvents', () => {
  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    jest.restoreAllMocks();
    document.title = '';
    sessionStorage.clear();
  });

  it('refreshes and reminds only an available agent for a new task', async () => {
    document.title = '坐席工作台';
    const connector = createConnector();
    const refresh = jest.fn();
    const sound = { play: jest.fn() };
    const notifications = {
      permission: jest.fn(() => 'granted' as NotificationPermission),
      requestPermission: jest.fn(),
      show: jest.fn(),
    };
    render(
      <EventsHarness
        options={{
          agentStatus: 'available',
          refresh,
          connector: connector.connect,
          sound,
          notifications,
        }}
      />,
    );

    act(() => connector.handlers.onOpen());
    act(() => connector.handlers.onEvent({ type: 'agent.handoff.requested' }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(sound.play).toHaveBeenCalledTimes(1);
    expect(notifications.show).toHaveBeenCalledWith('有新的待接来电', {
      body: '请返回坐席工作台查看并接听',
      tag: 'agent-handoff-requested',
    });
    expect(screen.getByTestId('unread').textContent).toBe('1');
    expect(document.title).toBe('(1) 坐席工作台');
  });

  it('refreshes without sound while the agent is paused', async () => {
    const connector = createConnector();
    const refresh = jest.fn();
    const sound = { play: jest.fn() };
    render(
      <EventsHarness
        options={{
          agentStatus: 'paused',
          refresh,
          connector: connector.connect,
          sound,
        }}
      />,
    );

    act(() => connector.handlers.onEvent({ type: 'agent.handoff.requested' }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(sound.play).not.toHaveBeenCalled();
  });

  it('uses a low-frequency poll when the event stream is unavailable', async () => {
    jest.useFakeTimers();
    const connector = createConnector();
    const refresh = jest.fn();
    render(
      <EventsHarness
        options={{
          agentStatus: 'available',
          refresh,
          connector: connector.connect,
          pollIntervalMs: 30_000,
        }}
      />,
    );

    act(() => connector.handlers.onError(new Error('stream failed')));
    expect(screen.getByTestId('transport').textContent).toBe('polling');
    act(() => jest.advanceTimersByTime(30_000));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('does not repeatedly request denied notification permission', async () => {
    const notifications = {
      permission: jest.fn(() => 'default' as NotificationPermission),
      requestPermission: jest
        .fn()
        .mockResolvedValue('denied' as NotificationPermission),
      show: jest.fn(),
    };
    const connector = createConnector();
    render(
      <EventsHarness
        options={{
          agentStatus: 'available',
          refresh: jest.fn(),
          connector: connector.connect,
          notifications,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '开启通知' }));
    fireEvent.click(screen.getByRole('button', { name: '开启通知' }));

    await waitFor(() => {
      expect(notifications.requestPermission).toHaveBeenCalledTimes(1);
    });
  });
});
