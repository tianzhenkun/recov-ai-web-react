import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import * as React from 'react';
import { getAiCallTaskTestCapability, listAiCallTaskTargets } from '../service';
import LinphoneTaskTest from './LinphoneTaskTest';

jest.mock('../service', () => ({
  getAiCallTaskTestCapability: jest.fn(),
  listAiCallTaskTargets: jest.fn(),
}));

const mockedGetCapability = getAiCallTaskTestCapability as jest.Mock;
const mockedListTargets = listAiCallTaskTargets as jest.Mock;

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

describe('Linphone task test entry', () => {
  beforeEach(() => {
    mockedGetCapability.mockReset();
    mockedListTargets.mockReset();
    mockedListTargets.mockResolvedValue({ rows: [singleTarget], total: 1 });
  });

  afterEach(cleanup);

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
});
