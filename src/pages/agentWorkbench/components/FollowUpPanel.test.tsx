import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import * as React from 'react';
import {
  getAiCallRecordDetail,
  getAiCallRecordDialogue,
  getAiCallRecordHandoffs,
  getAiCallRecordRecording,
  getAiCallRecordSemanticAnalysis,
} from '@/pages/aiCallRecords/service';
import FollowUpPanel from './FollowUpPanel';

jest.mock('@/pages/aiCallRecords/service', () => ({
  getAiCallRecordDetail: jest.fn(),
  getAiCallRecordDialogue: jest.fn(),
  getAiCallRecordHandoffs: jest.fn(),
  getAiCallRecordRecording: jest.fn(),
  getAiCallRecordSemanticAnalysis: jest.fn(),
}));

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
    data: {
      call_id: 'callback-1',
      status: 'accepted',
      livekit_url: 'wss://livekit.example.com',
      participant_token: 'callback-token',
      participant_identity: 'human-callback-callback-1',
      expires_in_seconds: 60,
    },
  }),
  detail: jest.fn().mockResolvedValue({ code: 200, data: unanswered }),
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

  it('uses a toast and shows filters plus identifying task context', async () => {
    const services = createServices();
    render(<FollowUpPanel services={services} />);

    expect(await screen.findByText('138****0000')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: '回访来源' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: '创建时间' })).toBeTruthy();
    expect(screen.getByText('人工未接回访')).toBeTruthy();
    expect(screen.getByLabelText('业务场景')).toBeTruthy();
    expect(screen.getByLabelText('回访状态')).toBeTruthy();
    expect(screen.getByLabelText('回访来源')).toBeTruthy();
    expect(screen.getByRole('button', { name: /查\s*询/ })).toBeTruthy();
    expect(services.list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ownership: 'unassigned',
        pageNum: 1,
        pageSize: 10,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /查\s*询/ }));
    await waitFor(() => expect(services.list).toHaveBeenCalledTimes(2));
    expect(services.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: ['pending', 'processing'] }),
    );

    fireEvent.click(screen.getByRole('button', { name: '认领回访' }));
    expect(
      await screen.findByText('回访任务认领成功，负责人已固定为当前坐席'),
    ).toBeTruthy();
    expect(
      document.querySelector('.agent-follow-up-panel > .ant-alert'),
    ).toBeNull();
  });

  it('claims a callback when HTTP does not provide randomUUID', async () => {
    const services = createServices();
    const originalRandomUUID = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: undefined,
    });

    try {
      render(<FollowUpPanel services={services} />);
      fireEvent.click(await screen.findByRole('button', { name: '认领回访' }));

      await waitFor(() =>
        expect(services.claim).toHaveBeenCalledWith(
          unanswered.id,
          expect.stringMatching(/^follow-up-/),
        ),
      );
    } finally {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        configurable: true,
        value: originalRandomUUID,
      });
    }
  });

  it('shows a clear message when claiming a callback fails', async () => {
    const services = createServices();
    services.claim.mockRejectedValue(new Error('claim failed'));
    render(<FollowUpPanel services={services} />);

    fireEvent.click(await screen.findByRole('button', { name: '认领回访' }));

    expect(
      await screen.findByText('回访任务认领失败，请刷新后重试'),
    ).toBeTruthy();
  });

  it('shows accepted instead of connected after a callback request', async () => {
    const services = createServices();
    const onCallAccepted = jest.fn();
    services.list.mockResolvedValue({
      code: 200,
      data: {
        rows: [{ ...unanswered, owner_agent_identity: 'agent-1' }],
        total: 1,
      },
    });
    render(
      <FollowUpPanel
        services={services}
        callbackEnabled
        consoleSessionId="session-1"
        onCallAccepted={onCallAccepted}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: '我的跟进' }));
    expect(await screen.findByText('138****0000')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /呼叫客户/ }));
    expect(
      await screen.findByText('回拨任务已受理，等待最终通话状态'),
    ).toBeTruthy();
    expect(services.call).toHaveBeenCalledWith(
      unanswered.id,
      expect.objectContaining({ consoleSessionId: 'session-1' }),
    );
    expect(onCallAccepted).toHaveBeenCalledWith(
      expect.objectContaining({ call_id: 'callback-1' }),
      expect.objectContaining({ id: unanswered.id }),
    );
  });

  it('brings an offline agent online before calling the customer', async () => {
    const services = createServices();
    const onPrepareCallback = jest.fn().mockResolvedValue(true);
    services.list.mockResolvedValue({
      code: 200,
      data: {
        rows: [{ ...unanswered, owner_agent_identity: 'agent-1' }],
        total: 1,
      },
    });
    render(
      <FollowUpPanel
        agentStatus="offline"
        callbackEnabled
        consoleSessionId="session-1"
        onPrepareCallback={onPrepareCallback}
        services={services}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: '我的跟进' }));
    fireEvent.click(await screen.findByRole('button', { name: /上线并呼叫/ }));

    await waitFor(() => expect(onPrepareCallback).toHaveBeenCalledTimes(1));
    expect(services.call).toHaveBeenCalledWith(
      unanswered.id,
      expect.objectContaining({ consoleSessionId: 'session-1' }),
    );
  });

  it('renews an available agent lease before calling the customer', async () => {
    const services = createServices();
    const onPrepareCallback = jest.fn().mockResolvedValue(true);
    services.list.mockResolvedValue({
      code: 200,
      data: {
        rows: [{ ...unanswered, owner_agent_identity: 'agent-1' }],
        total: 1,
      },
    });
    render(
      <FollowUpPanel
        agentStatus="available"
        callbackEnabled
        consoleSessionId="session-1"
        onPrepareCallback={onPrepareCallback}
        services={services}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: '我的跟进' }));
    fireEvent.click(await screen.findByRole('button', { name: /呼叫客户/ }));

    await waitFor(() => expect(onPrepareCallback).toHaveBeenCalledTimes(1));
    expect(onPrepareCallback.mock.invocationCallOrder[0]).toBeLessThan(
      services.call.mock.invocationCallOrder[0],
    );
  });

  it('opens contact result registration after a callback ends', async () => {
    const services = createServices();
    const task = {
      ...unanswered,
      owner_agent_identity: 'agent-1',
      status: 'processing' as const,
    };
    const onAttemptTaskOpened = jest.fn();

    render(
      <FollowUpPanel
        attemptTaskToOpen={task}
        onAttemptTaskOpened={onAttemptTaskOpened}
        services={services}
      />,
    );

    expect(
      await screen.findByRole('dialog', { name: '登记联系结果' }),
    ).toBeTruthy();
    expect(onAttemptTaskOpened).toHaveBeenCalledTimes(1);
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
    const mine = {
      ...unanswered,
      id: '2',
      masked_contact: '139****0000',
      owner_agent_identity: 'agent-1',
      status: 'processing' as const,
    };
    services.list.mockImplementation(async (params) => ({
      code: 200,
      data: {
        rows: params?.ownership === 'mine' ? [mine] : [unanswered],
        total: 1,
      },
    }));

    render(<FollowUpPanel services={services} />);
    expect(await screen.findByText('138****0000')).toBeTruthy();
    expect(screen.queryByText('139****0000')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: '我的跟进' }));
    expect(await screen.findByText('139****0000')).toBeTruthy();
    expect(screen.queryByText('138****0000')).toBeNull();
  });

  it('uses a task table and opens the selected task details', async () => {
    const services = createServices();
    render(<FollowUpPanel services={services} />);

    expect(await screen.findByRole('table')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: '客户' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: '操作' })).toBeTruthy();

    expect(await screen.findByText('138****0000')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));
    const drawer = await screen.findByRole('dialog', {
      name: '跟进任务详情',
    });
    expect(within(drawer).getByText('等待超时未接入人工')).toBeTruthy();
    expect(within(drawer).getByText('未约定回访时间')).toBeTruthy();
  });

  it('drills into a related call in the same drawer and returns to the task', async () => {
    const services = createServices();
    services.list.mockResolvedValue({
      code: 200,
      data: {
        rows: [{ ...unanswered, owner_agent_identity: 'agent-1' }],
        total: 1,
      },
    });
    services.detail.mockResolvedValue({
      code: 200,
      data: {
        ...unanswered,
        owner_agent_identity: 'agent-1',
        source_record: {
          id: 'record-1',
          call_id: 'call-1',
          entry_type: 'owner_runtime',
          status: 'completed',
          started_at: '2026-07-22T08:00:00Z',
        },
        callback_records: [
          {
            id: 'record-2',
            call_id: 'callback-1',
            entry_type: 'sip_callback',
            status: 'completed',
            started_at: '2026-07-22T09:00:00Z',
            duration_ms: 65000,
          },
        ],
        attempts: [
          {
            id: 'attempt-1',
            follow_up_id: '1',
            agent_identity: 'agent-1',
            contact_channel: 'manual_phone',
            attempt_result: 'connected',
            related_call_id: 'callback-1',
            contacted_at: '2026-07-22T09:01:05Z',
          },
        ],
      },
    });
    (getAiCallRecordDetail as jest.Mock).mockResolvedValue({
      record: {
        id: 'record-1',
        callId: 'call-1',
        entryType: 'owner_runtime',
        status: 'completed',
        endReason: 'customer_end',
        startedAt: '2026-07-22T08:00:00Z',
        answeredAt: '2026-07-22T08:00:02Z',
        endedAt: '2026-07-22T08:01:05Z',
        durationMs: 65000,
      },
    });
    (getAiCallRecordRecording as jest.Mock).mockResolvedValue({
      id: 'recording-1',
      callId: 'call-1',
      status: 'completed',
      playUrl: 'https://example.com/call-1.mp3',
    });
    (getAiCallRecordDialogue as jest.Mock).mockResolvedValue({
      rows: [
        {
          callId: 'call-1',
          segmentNo: 1,
          speakerType: 'customer',
          text: '我想了解价格',
          segmentStatus: 'final',
        },
      ],
      total: 1,
    });
    (getAiCallRecordSemanticAnalysis as jest.Mock).mockResolvedValue({
      callId: 'call-1',
      analysisSceneCode: 'intro_geo',
      analysisStatus: '2',
      analysisResult: { summary: '客户关注价格' },
      analysisRetryCount: 0,
    });
    (getAiCallRecordHandoffs as jest.Mock).mockResolvedValue({
      rows: [
        {
          id: 'handoff-row-1',
          handoffId: 'handoff-1',
          callId: 'call-1',
          status: 'connected',
          requestReason: 'customer_request',
          requestedAt: '2026-07-22T08:00:30Z',
        },
      ],
      total: 1,
    });

    render(<FollowUpPanel services={services} />);
    fireEvent.click(screen.getByRole('tab', { name: '我的跟进' }));
    expect(await screen.findByText('138****0000')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));

    const drawer = await screen.findByRole('dialog', {
      name: '跟进任务详情',
    });
    expect(services.detail).toHaveBeenCalledWith('1');
    expect(await within(drawer).findByText('关联通话')).toBeTruthy();
    expect(within(drawer).getByText('原始通话')).toBeTruthy();
    expect(within(drawer).getByText('第1次人工回拨')).toBeTruthy();
    expect(within(drawer).getAllByText('已接通')).toHaveLength(2);
    fireEvent.click(
      within(drawer).getByRole('button', { name: '查看通话详情' }),
    );

    const callDrawer = await screen.findByRole('dialog', { name: '通话详情' });
    expect(getAiCallRecordDetail).toHaveBeenCalledWith('call-1');
    expect(await within(callDrawer).findByText('我想了解价格')).toBeTruthy();
    expect(within(callDrawer).getByText('客户关注价格')).toBeTruthy();
    expect(within(callDrawer).getByText('转人工记录')).toBeTruthy();
    expect(
      within(callDrawer)
        .getByRole('link', { name: '在通话记录中查看' })
        .getAttribute('href'),
    ).toBe('/ai-call/records?callId=call-1&view=list');

    fireEvent.click(
      within(callDrawer).getByRole('button', { name: '返回跟进任务详情' }),
    );
    expect(
      await screen.findByRole('dialog', { name: '跟进任务详情' }),
    ).toBeTruthy();
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
