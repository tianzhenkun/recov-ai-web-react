import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import * as React from 'react';
import { getAiCallTask, listAiCallTaskTargets } from '../service';
import AiCallTaskDetailPage from './index';

const mockPush = jest.fn();
const mockLinphoneTaskTest = jest.fn();

jest.mock('@umijs/max', () => ({
  history: { push: (...args: unknown[]) => mockPush(...args) },
  useParams: () => ({ taskId: 'task-1' }),
}));

jest.mock('../service', () => ({
  getAiCallTask: jest.fn(),
  listAiCallTaskTargets: jest.fn(),
}));

jest.mock('../components/LinphoneTaskTest', () => ({
  __esModule: true,
  default: (props: {
    task: { taskId: string };
    onTaskChanged: () => Promise<void> | void;
  }) => {
    mockLinphoneTaskTest(props);
    return (
      <button type="button" onClick={() => void props.onTaskChanged()}>
        测试拨打入口
      </button>
    );
  },
}));

const mockedGetTask = getAiCallTask as jest.Mock;
const mockedListTargets = listAiCallTaskTargets as jest.Mock;

describe('AI Call task detail page', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockLinphoneTaskTest.mockReset();
    mockedGetTask.mockReset();
    mockedListTargets.mockReset();
    mockedGetTask.mockResolvedValue({
      taskId: 'task-1',
      taskName: '批量客户回访',
      taskMode: 'batch',
      status: 'RUNNING',
      totalTargets: 100,
      completedTargets: 30,
      connectedTargets: 18,
      failedTargets: 4,
      executionMode: 'immediate',
      startedAt: '2026-07-27 09:00:00',
      promptProfileId: 'prompt-1',
      promptName: '客户回访',
      sceneCode: 'intro_follow_up',
      voice: 'Cherry',
      voiceName: '芊悦',
      ruleId: 'rule-1',
      ruleName: '工作日规则',
      ruleSummary: '09:00–18:00，最多重试 1 次',
      createdByName: '管理员',
      createdAt: '2026-07-27 08:50:00',
      updatedAt: '2026-07-27 10:00:00',
    });
    mockedListTargets.mockResolvedValue({
      rows: [
        {
          targetId: 'target-1',
          taskId: 'task-1',
          customerName: '张先生',
          phoneNumber: '19900001001',
          status: 'COMPLETED',
          attemptCount: 2,
          latestResult: '已接通',
          updatedAt: '2026-07-27 09:30:00',
        },
      ],
      total: 1,
    });
  });

  afterEach(cleanup);

  it('shows summary, frozen configuration and a filtered target table without tabs', async () => {
    render(<AiCallTaskDetailPage />);

    expect(await screen.findByText('批量客户回访')).toBeTruthy();
    expect(screen.getByText('100')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('客户回访 / intro_follow_up')).toBeTruthy();
    expect(screen.getByText('芊悦 / Cherry')).toBeTruthy();
    expect(screen.getByText('工作日规则')).toBeTruthy();
    expect(screen.getAllByText('手机号').length).toBeGreaterThan(0);
    expect(screen.getAllByText('客户名称').length).toBeGreaterThan(0);
    expect(screen.getAllByText('处理状态').length).toBeGreaterThan(0);
    expect(screen.queryByText('执行概览')).toBeNull();
    expect(screen.queryByText('任务事件')).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
    await waitFor(() =>
      expect(mockedListTargets).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({ pageNum: 1, pageSize: 20 }),
      ),
    );
  });

  it('builds task-level and target-level record query strings', async () => {
    render(<AiCallTaskDetailPage />);
    await screen.findByText('张先生');

    fireEvent.click(screen.getByRole('button', { name: '查看全部通话记录' }));
    expect(mockPush).toHaveBeenCalledWith('/ai-call/records?taskId=task-1');

    fireEvent.click(screen.getByRole('button', { name: '查看通话记录' }));
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        '/ai-call/records?taskId=task-1&targetId=target-1',
      ),
    );
  });

  it('mounts the Linphone test entry and refreshes task and targets', async () => {
    render(<AiCallTaskDetailPage />);
    await screen.findByText('批量客户回访');

    expect(mockLinphoneTaskTest).toHaveBeenCalledWith(
      expect.objectContaining({
        task: expect.objectContaining({ taskId: 'task-1' }),
        onTaskChanged: expect.any(Function),
      }),
    );

    mockedGetTask.mockClear();
    mockedListTargets.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '测试拨打入口' }));

    await waitFor(() => expect(mockedGetTask).toHaveBeenCalledWith('task-1'));
    await waitFor(() =>
      expect(mockedListTargets).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({ pageNum: 1, pageSize: 20 }),
      ),
    );
  });
});
