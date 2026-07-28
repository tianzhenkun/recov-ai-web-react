import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Modal } from 'antd';
import * as React from 'react';
import {
  endAiCallTaskActiveCall,
  getAiCallTaskTestCapability,
  getAiCallTaskTestStatus,
  listAiCallTaskTargets,
  runAiCallTaskTest,
} from '../service';
import LinphoneTaskTest from './LinphoneTaskTest';

const mockPush = jest.fn();

jest.mock('@umijs/max', () => ({
  history: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('../service', () => ({
  endAiCallTaskActiveCall: jest.fn(),
  getAiCallTaskTestCapability: jest.fn(),
  getAiCallTaskTestStatus: jest.fn(),
  listAiCallTaskTargets: jest.fn(),
  runAiCallTaskTest: jest.fn(),
}));

const mockedEndActiveCall = endAiCallTaskActiveCall as jest.Mock;
const mockedGetCapability = getAiCallTaskTestCapability as jest.Mock;
const mockedGetStatus = getAiCallTaskTestStatus as jest.Mock;
const mockedListTargets = listAiCallTaskTargets as jest.Mock;
const mockedRunTest = runAiCallTaskTest as jest.Mock;

const scheduledTask = {
  taskId: 'task-1',
  taskName: '客户回访测试',
  taskMode: 'single',
  status: 'SCHEDULED',
  totalTargets: 1,
  completedTargets: 0,
  connectedTargets: 0,
  failedTargets: 0,
  executionMode: 'immediate',
  promptProfileId: 'prompt-1',
  promptName: '客户回访',
  sceneCode: 'intro_follow_up',
  voice: 'Cherry',
  voiceName: '芊悦',
  ruleId: 'rule-1',
  ruleName: '工作日规则',
  ruleSummary: '09:00–18:00，最多重试 1 次',
  createdAt: '2026-07-28 09:00:00',
  updatedAt: '2026-07-28 09:00:00',
} as const;

const runningTask = {
  ...scheduledTask,
  status: 'RUNNING',
} as const;

const eligibleCapability = {
  enabled: true,
  eligible: true,
  reasons: [],
  availableAgentCount: 1,
  activeCallId: null,
  canEndActiveCall: false,
} as const;

const singleTarget = {
  targetId: 'target-1',
  taskId: 'task-1',
  customerName: '张先生',
  phoneNumber: '19900001001',
  status: 'PENDING',
  attemptCount: 0,
  updatedAt: '2026-07-28 09:00:00',
} as const;

const activeCapability = {
  enabled: true,
  eligible: false,
  reasons: ['当前任务已有测试通话'],
  availableAgentCount: 1,
  activeCallId: 'call-1',
  canEndActiveCall: true,
} as const;

const activeStatus = {
  taskId: 'task-1',
  targetId: 'target-1',
  attemptId: 'attempt-1',
  callId: 'call-1',
  targetStatus: 'IN_CALL',
  attemptStatus: 'IN_CALL',
  callStatus: 'connected',
  handoffStatus: null,
  phase: 'ai_call',
  elapsedSeconds: 65,
  endReason: null,
  errorMessage: null,
  canEndActiveCall: true,
} as const;

describe('Linphone task test entry', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockedEndActiveCall.mockReset();
    mockedGetCapability.mockReset();
    mockedGetStatus.mockReset();
    mockedListTargets.mockReset();
    mockedRunTest.mockReset();
    mockedListTargets.mockResolvedValue({ rows: [singleTarget], total: 1 });
  });

  afterEach(() => {
    Modal.destroyAll();
    cleanup();
    jest.useRealTimers();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  it('hides the entry when the backend capability is disabled', async () => {
    mockedGetCapability.mockResolvedValue({
      enabled: false,
      eligible: false,
      reasons: ['本地测试能力未开启'],
      availableAgentCount: 0,
      activeCallId: null,
      canEndActiveCall: false,
    });

    render(<LinphoneTaskTest task={scheduledTask} onTaskChanged={jest.fn()} />);

    await waitFor(() => expect(mockedGetCapability).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: '测试拨打' })).toBeNull();
  });

  it('shows a disabled entry and backend reasons when task is ineligible', async () => {
    mockedGetCapability.mockResolvedValue({
      enabled: true,
      eligible: false,
      reasons: ['任务不是待执行状态'],
      availableAgentCount: 1,
      activeCallId: null,
      canEndActiveCall: false,
    });

    render(<LinphoneTaskTest task={runningTask} onTaskChanged={jest.fn()} />);

    const button = await screen.findByRole('button', { name: '测试拨打' });
    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.mouseOver(button.parentElement as HTMLElement);
    expect(await screen.findByText('任务不是待执行状态')).toBeTruthy();
  });

  it('loads and shows frozen task data before starting', async () => {
    mockedGetCapability.mockResolvedValue(eligibleCapability);
    render(<LinphoneTaskTest task={scheduledTask} onTaskChanged={jest.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: '测试拨打' }));

    await waitFor(() =>
      expect(mockedListTargets).toHaveBeenCalledWith('task-1', {
        pageNum: 1,
        pageSize: 1,
      }),
    );
    expect(await screen.findByText('张先生')).toBeTruthy();
    expect(screen.getByText('199****1001')).toBeTruthy();
    expect(screen.getByText('客户回访 / intro_follow_up')).toBeTruthy();
    expect(screen.getByText('芊悦 / Cherry')).toBeTruthy();
    expect(screen.getByText('工作日规则')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('AI 转人工通话'));
    expect(screen.getByText('保持坐席工作台在线')).toBeTruthy();
    expect(screen.getByText('在坐席工作台接单')).toBeTruthy();
  });

  it('disables handoff and explains how to make an agent available', async () => {
    mockedGetCapability.mockResolvedValue({
      ...eligibleCapability,
      availableAgentCount: 0,
    });
    render(<LinphoneTaskTest task={scheduledTask} onTaskChanged={jest.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: '测试拨打' }));

    const handoff = await screen.findByLabelText('AI 转人工通话');
    expect(handoff.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('暂无可用坐席，请先到坐席工作台上线')).toBeTruthy();
  });

  it('starts once with one idempotency key and loads status immediately', async () => {
    let resolveRun:
      | ((value: {
          accepted: true;
          taskId: string;
          attemptId: string;
          callId: string;
        }) => void)
      | undefined;
    mockedGetCapability.mockResolvedValue(eligibleCapability);
    mockedRunTest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRun = resolve;
        }),
    );
    mockedGetStatus.mockResolvedValue({
      ...activeStatus,
      phase: 'dialing',
    });

    render(<LinphoneTaskTest task={scheduledTask} onTaskChanged={jest.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: '测试拨打' }));
    await screen.findByText('张先生');
    const confirm = screen.getByRole('button', { name: '确认拨打' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(mockedRunTest).toHaveBeenCalledTimes(1));
    expect(mockedRunTest).toHaveBeenCalledWith(
      'task-1',
      'ai_only',
      expect.stringMatching(/^linphone-test-task-1-/),
    );

    await act(async () => {
      resolveRun?.({
        accepted: true,
        taskId: 'task-1',
        attemptId: 'attempt-1',
        callId: 'call-1',
      });
    });

    await waitFor(() => expect(mockedGetStatus).toHaveBeenCalledWith('task-1'));
  });

  it.each([
    ['dialing', '正在拨号'],
    ['ai_call', 'AI 通话中'],
    ['waiting_handoff', '等待坐席接单'],
    ['human_call', '人工通话中'],
    ['completed', '通话已完成'],
    ['failed', '测试失败'],
  ] as const)('renders %s as %s', async (phase, text) => {
    mockedGetCapability.mockResolvedValue(activeCapability);
    mockedGetStatus.mockResolvedValue({
      ...activeStatus,
      phase,
      errorMessage: phase === 'failed' ? 'Linphone 未注册' : null,
    });

    render(<LinphoneTaskTest task={runningTask} onTaskChanged={jest.fn()} />);

    expect(await screen.findByText(text)).toBeTruthy();
    if (phase === 'failed') {
      expect(screen.getByText('Linphone 未注册')).toBeTruthy();
    }
  });

  it('shows call details and opens the filtered record page', async () => {
    mockedGetCapability.mockResolvedValue(activeCapability);
    mockedGetStatus.mockResolvedValue(activeStatus);

    render(<LinphoneTaskTest task={runningTask} onTaskChanged={jest.fn()} />);

    expect(await screen.findByText('AI 通话中')).toBeTruthy();
    expect(screen.getByText('call-1')).toBeTruthy();
    expect(screen.getByText('01:05')).toBeTruthy();
    expect(screen.getByText('未触发')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '查看通话记录' }));
    expect(mockPush).toHaveBeenCalledWith(
      '/ai-call/records?taskId=task-1&targetId=target-1',
    );
  });

  it('shows the end action only when the current status allows it', async () => {
    mockedGetCapability.mockResolvedValue(activeCapability);
    mockedGetStatus.mockResolvedValue({
      ...activeStatus,
      canEndActiveCall: false,
    });

    render(<LinphoneTaskTest task={runningTask} onTaskChanged={jest.fn()} />);

    expect(await screen.findByText('AI 通话中')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '结束当前通话' })).toBeNull();
  });

  it('ends only the active call after explicit danger confirmation', async () => {
    mockedGetCapability.mockResolvedValue(activeCapability);
    mockedGetStatus.mockResolvedValue(activeStatus);
    mockedEndActiveCall.mockResolvedValue({ accepted: true });

    render(<LinphoneTaskTest task={runningTask} onTaskChanged={jest.fn()} />);

    fireEvent.click(
      await screen.findByRole('button', { name: '结束当前通话' }),
    );
    expect(
      await screen.findByText(
        '仅结束当前通话，不会停止整个外呼任务。通话结束后将按真实结果更新任务。',
      ),
    ).toBeTruthy();
    const confirm = screen.getByRole('button', { name: '确认结束通话' });
    expect(confirm.classList.contains('ant-btn-dangerous')).toBe(true);
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(mockedEndActiveCall).toHaveBeenCalledWith(
        'task-1',
        expect.stringMatching(/^linphone-end-call-1-/),
      ),
    );
    await waitFor(() => expect(mockedGetStatus).toHaveBeenCalledTimes(2));
  });

  it('keeps the status panel and shows the backend end error verbatim', async () => {
    mockedGetCapability.mockResolvedValue(activeCapability);
    mockedGetStatus.mockResolvedValue(activeStatus);
    mockedEndActiveCall.mockRejectedValue(new Error('当前通话已经结束'));

    render(<LinphoneTaskTest task={runningTask} onTaskChanged={jest.fn()} />);
    fireEvent.click(
      await screen.findByRole('button', { name: '结束当前通话' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: '确认结束通话' }),
    );

    expect(await screen.findByText('当前通话已经结束')).toBeTruthy();
    expect(screen.getByText('AI 通话中')).toBeTruthy();
    expect(screen.getByText('call-1')).toBeTruthy();
  });

  it('restores polling from activeCallId and pauses while hidden', async () => {
    jest.useFakeTimers();
    mockedGetCapability.mockResolvedValue(activeCapability);
    mockedGetStatus.mockResolvedValue(activeStatus);
    render(<LinphoneTaskTest task={runningTask} onTaskChanged={jest.fn()} />);

    await waitFor(() => expect(mockedGetStatus).toHaveBeenCalledTimes(1));
    act(() => {
      jest.advanceTimersByTime(999);
    });
    expect(mockedGetStatus).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    await waitFor(() => expect(mockedGetStatus).toHaveBeenCalledTimes(2));

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      jest.advanceTimersByTime(3_000);
    });
    expect(mockedGetStatus).toHaveBeenCalledTimes(2);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(mockedGetStatus).toHaveBeenCalledTimes(3));
  });

  it('refreshes task and capability only once for one terminal attempt', async () => {
    const onTaskChanged = jest.fn().mockResolvedValue(undefined);
    mockedGetCapability.mockResolvedValue(activeCapability);
    mockedGetStatus.mockResolvedValue({
      ...activeStatus,
      phase: 'completed',
      attemptStatus: 'COMPLETED',
      targetStatus: 'COMPLETED',
      canEndActiveCall: false,
    });

    const view = render(
      <LinphoneTaskTest task={runningTask} onTaskChanged={onTaskChanged} />,
    );

    await waitFor(() => expect(onTaskChanged).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedGetCapability).toHaveBeenCalledTimes(2));
    view.rerender(
      <LinphoneTaskTest task={runningTask} onTaskChanged={onTaskChanged} />,
    );
    await act(async () => Promise.resolve());

    expect(onTaskChanged).toHaveBeenCalledTimes(1);
    expect(mockedGetCapability).toHaveBeenCalledTimes(2);
  });
});
