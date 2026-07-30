import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import * as React from 'react';
import FollowUpPanel from './FollowUpPanel';

const unanswered = {
  id: '1',
  source_type: 'handoff_unanswered' as const,
  source_call_id: 'call-1',
  source_handoff_id: 'handoff-1',
  scene_code: 'intro_geo' as const,
  masked_contact: '138****0000',
  owner_agent_identity: null,
  status: 'pending' as const,
  follow_up_reason: '等待超时未接入人工',
  customer_callback_at: null,
  created_at: '2026-07-22T08:00:00Z',
};

const createServices = () => ({
  list: jest
    .fn()
    .mockResolvedValue({ code: 200, data: { rows: [unanswered], total: 1 } }),
  claim: jest.fn().mockResolvedValue({
    code: 200,
    data: { ...unanswered, owner_agent_identity: 'agent-1' },
  }),
  call: jest.fn().mockResolvedValue({
    code: 200,
    data: { call_id: 'callback-1', status: 'accepted' },
  }),
  complete: jest.fn().mockResolvedValue({ code: 200 }),
  attempt: jest.fn().mockResolvedValue({ code: 200 }),
  close: jest.fn().mockResolvedValue({ code: 200 }),
});

describe('FollowUpPanel', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('atomically claims an unanswered callback only once', async () => {
    const services = createServices();
    render(<FollowUpPanel services={services} />);
    expect(await screen.findByText('138****0000')).toBeTruthy();
    const claim = screen.getByRole('button', { name: '认领回访' });
    fireEvent.click(claim);
    fireEvent.click(claim);
    await waitFor(() => expect(services.claim).toHaveBeenCalledTimes(1));
  });

  it('shows accepted instead of connected after a callback request', async () => {
    const services = createServices();
    services.list.mockResolvedValue({
      code: 200,
      data: {
        rows: [{ ...unanswered, owner_agent_identity: 'agent-1' }],
        total: 1,
      },
    });
    render(<FollowUpPanel services={services} callbackEnabled />);
    fireEvent.click(screen.getByRole('tab', { name: '我的跟进' }));
    expect(await screen.findByText('138****0000')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /呼叫客户/ }));
    expect(
      await screen.findByText('回拨任务已受理，等待最终通话状态'),
    ).toBeTruthy();
  });

  it('keeps system callback hidden until the real callback capability is enabled', async () => {
    const services = createServices();
    services.list.mockResolvedValue({
      code: 200,
      data: {
        rows: [{ ...unanswered, owner_agent_identity: 'agent-1' }],
        total: 1,
      },
    });

    render(<FollowUpPanel services={services} />);
    fireEvent.click(screen.getByRole('tab', { name: '我的跟进' }));
    expect(await screen.findByText('138****0000')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /呼叫客户/ })).toBeNull();
  });

  it('separates unassigned work from tasks owned by the current agent', async () => {
    const services = createServices();
    services.list.mockResolvedValue({
      code: 200,
      data: {
        rows: [
          unanswered,
          {
            ...unanswered,
            id: '2',
            masked_contact: '139****0000',
            owner_agent_identity: 'agent-1',
            status: 'processing',
          },
        ],
        total: 2,
      },
    });

    render(<FollowUpPanel services={services} />);
    expect(await screen.findByText('138****0000')).toBeTruthy();
    expect(screen.queryByText('139****0000')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: '我的跟进' }));
    expect(await screen.findByText('139****0000')).toBeTruthy();
    expect(screen.queryByText('138****0000')).toBeNull();
  });

  it('allows completion only after an effective connected contact result exists', async () => {
    const services = createServices();
    services.list.mockResolvedValue({
      code: 200,
      data: {
        rows: [{ ...unanswered, owner_agent_identity: 'agent-1' }],
        total: 1,
      },
    });

    const view = render(<FollowUpPanel services={services} />);
    fireEvent.click(screen.getByRole('tab', { name: '我的跟进' }));
    expect(await screen.findByText('138****0000')).toBeTruthy();
    expect(
      (
        screen.getByRole('button', {
          name: '完成任务',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    services.list.mockResolvedValue({
      code: 200,
      data: {
        rows: [
          {
            ...unanswered,
            owner_agent_identity: 'agent-1',
            latest_attempt: {
              id: 'attempt-1',
              follow_up_id: unanswered.id,
              agent_identity: 'agent-1',
              contact_channel: 'wechat',
              attempt_result: 'connected',
              contacted_at: '2026-07-30T12:00:00Z',
            },
          },
        ],
        total: 1,
      },
    });
    fireEvent.click(screen.getByRole('tab', { name: '待认领回访' }));
    fireEvent.click(screen.getByRole('tab', { name: '我的跟进' }));

    await waitFor(() =>
      expect(
        (
          screen.getByRole('button', {
            name: '完成任务',
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    view.unmount();
  });

  it('requires and maps an error summary for a technical failure', async () => {
    const services = createServices();
    services.list.mockResolvedValue({
      code: 200,
      data: {
        rows: [{ ...unanswered, owner_agent_identity: 'agent-1' }],
        total: 1,
      },
    });

    render(<FollowUpPanel services={services} />);
    fireEvent.click(screen.getByRole('tab', { name: '我的跟进' }));
    await screen.findByText('138****0000');
    fireEvent.click(screen.getByRole('button', { name: '登记联系结果' }));
    fireEvent.mouseDown(screen.getByLabelText('联系结果'));
    fireEvent.click(await screen.findByText('技术失败'));
    fireEvent.click(screen.getByRole('button', { name: '保存联系记录' }));
    expect(await screen.findByText('请填写技术失败摘要')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('联系备注'), {
      target: { value: '本地网络中断' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存联系记录' }));

    await waitFor(() =>
      expect(services.attempt).toHaveBeenCalledWith(
        unanswered.id,
        expect.objectContaining({
          attemptResult: 'technical_failure',
          errorMessage: '本地网络中断',
        }),
      ),
    );
  });

  it('keeps ordinary no-answer tasks pending without a made-up deadline', async () => {
    const services = createServices();
    services.list.mockResolvedValue({
      code: 200,
      data: {
        rows: [{ ...unanswered, owner_agent_identity: 'agent-1' }],
        total: 1,
      },
    });
    render(<FollowUpPanel services={services} />);
    fireEvent.click(screen.getByRole('tab', { name: '我的跟进' }));
    expect(await screen.findByText('未约定回访时间')).toBeTruthy();
    expect(screen.queryByText('30 分钟后')).toBeNull();
    expect(screen.queryByText('2 小时后')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '登记联系结果' }));
    fireEvent.click(screen.getByRole('button', { name: '保存联系记录' }));
    await waitFor(() =>
      expect(services.attempt).toHaveBeenCalledWith(
        unanswered.id,
        expect.objectContaining({
          attemptResult: 'no_answer',
          customerCallbackAt: undefined,
        }),
      ),
    );
    expect(
      await screen.findByText('联系结果已记录，任务保持待处理'),
    ).toBeTruthy();
  });

  it('requires a remark only for configured close reasons and makes terminal tasks read-only', async () => {
    const services = createServices();
    services.list.mockResolvedValue({
      code: 200,
      data: {
        rows: [{ ...unanswered, owner_agent_identity: 'agent-1' }],
        total: 1,
      },
    });
    render(<FollowUpPanel services={services} />);
    fireEvent.click(screen.getByRole('tab', { name: '我的跟进' }));
    await screen.findByText('138****0000');
    fireEvent.click(screen.getByRole('button', { name: '关闭任务' }));
    fireEvent.mouseDown(screen.getByLabelText('关闭原因'));
    fireEvent.click(await screen.findByText('其他'));
    fireEvent.click(screen.getByRole('button', { name: '确认关闭' }));
    expect(await screen.findByText('请填写关闭说明')).toBeTruthy();

    cleanup();
    services.list.mockResolvedValue({
      code: 200,
      data: {
        rows: [
          {
            ...unanswered,
            status: 'completed',
            owner_agent_identity: 'agent-1',
          },
        ],
        total: 1,
      },
    });
    render(<FollowUpPanel services={services} />);
    fireEvent.click(screen.getByRole('tab', { name: '我的跟进' }));
    await screen.findByText('138****0000');
    expect(screen.getByText('已完成')).toBeTruthy();
    expect(screen.queryByText('completed')).toBeNull();
    expect(screen.queryByRole('button', { name: /呼叫客户/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '关闭任务' })).toBeNull();
  });
});
