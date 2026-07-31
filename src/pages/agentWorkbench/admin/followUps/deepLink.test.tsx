import { act, render, screen, waitFor, within } from '@testing-library/react';
import * as React from 'react';
import {
  getAdminFollowUp,
  listAdminFollowUps,
} from '@/services/ruoyi/agent-console';
import FollowUpAdminPage from '.';

let mockDeepLinkFollowUpId = 'follow-up-1';
let mockStatisticsSearch = '';

jest.mock('@umijs/max', () => ({
  useSearchParams: () => [
    new URLSearchParams(
      mockStatisticsSearch ||
        (mockDeepLinkFollowUpId
          ? `followUpId=${encodeURIComponent(mockDeepLinkFollowUpId)}`
          : ''),
    ),
  ],
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');
  return {
    PageContainer: ({ children, title }: Record<string, unknown>) =>
      React.createElement(
        'main',
        null,
        React.createElement('h1', null, title),
        children,
      ),
    ProTable: (props: Record<string, unknown>) => {
      const request = props.request as CallableFunction;
      React.useEffect(() => {
        void request({ current: 1, pageSize: 10 });
      }, []);
      return React.createElement('div');
    },
  };
});

jest.mock('@/services/ruoyi/agent-console', () => ({
  getAdminFollowUp: jest.fn(),
  listAdminFollowUps: jest.fn(),
}));

jest.mock('../_shared', () => ({
  AdminMetricRow: () => null,
  formatDateTime: (value: string) => value,
  sceneLabels: { intro_geo: 'GEO 获客' },
  sceneValueEnum: {},
  statusColors: { pending: 'warning' },
  statusLabels: { pending: '待处理' },
  unwrapPage: (value: unknown) => value,
}));

const task = {
  id: 'follow-up-1',
  source_type: 'ai_post_call',
  source_call_id: 'call-1',
  source_handoff_id: null,
  scene_code: 'intro_geo',
  masked_contact: '199****1001',
  follow_up_reason: '客户明确要求稍后联系',
  summary: '客户希望了解价格方案',
  owner_agent_identity: null,
  customer_callback_at: null,
  status: 'pending',
  attempts: [],
  created_at: '2026-07-30T10:00:00+08:00',
};

describe('跟进任务管理深链', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeepLinkFollowUpId = 'follow-up-1';
    mockStatisticsSearch = '';
    (listAdminFollowUps as jest.Mock).mockResolvedValue({
      rows: [],
      total: 0,
    });
    (getAdminFollowUp as jest.Mock).mockResolvedValue(task);
  });

  it('根据 followUpId 自动打开 AI 话后跟进详情', async () => {
    render(<FollowUpAdminPage />);

    expect(getAdminFollowUp).toHaveBeenCalledWith('follow-up-1');
    const drawer = await screen.findByRole('dialog', {
      name: '跟进任务详情',
    });
    expect(within(drawer).getByText('AI 话后跟进')).toBeTruthy();
    expect(within(drawer).getByText('call-1')).toBeTruthy();
    expect(within(drawer).getByText('handoff_id')).toBeTruthy();
    expect(within(drawer).getAllByText('-').length).toBeGreaterThan(0);
  });

  it('继承外呼统计下钻的待跟进状态和来源通话时间', async () => {
    mockDeepLinkFollowUpId = '';
    mockStatisticsSearch = new URLSearchParams({
      status: 'pending',
      sourceStartedAtBegin: '2026-07-25T00:00:00+08:00',
      sourceStartedAtEnd: '2026-07-31T16:20:00+08:00',
    }).toString();

    render(<FollowUpAdminPage />);

    await waitFor(() =>
      expect(listAdminFollowUps).toHaveBeenCalledWith({
        pageNum: 1,
        pageSize: 10,
        status: 'pending',
        sourceStartedAtBegin: '2026-07-25T00:00:00+08:00',
        sourceStartedAtEnd: '2026-07-31T16:20:00+08:00',
      }),
    );
  });

  it('展示详情接口返回的关联回拨通话', async () => {
    (getAdminFollowUp as jest.Mock).mockResolvedValue({
      data: {
        task,
        attempts: [],
        callback_records: [
          {
            id: 'record-1',
            call_id: 'callback-call-1',
            status: 'completed',
            end_reason: 'customer_hangup',
          },
        ],
      },
    });

    render(<FollowUpAdminPage />);

    const drawer = await screen.findByRole('dialog', {
      name: '跟进任务详情',
    });
    expect(within(drawer).getByText('callback-call-1')).toBeTruthy();
    expect(within(drawer).getByText('completed')).toBeTruthy();
    expect(within(drawer).getByText('customer_hangup')).toBeTruthy();
  });

  it('深链任务不存在时在详情抽屉展示明确错误', async () => {
    (getAdminFollowUp as jest.Mock).mockRejectedValue(new Error('not found'));

    render(<FollowUpAdminPage />);

    expect(
      await screen.findByText('跟进任务详情加载失败，请确认任务是否存在或重试'),
    ).toBeTruthy();
  });

  it('快速切换深链时只展示最后一次请求的详情', async () => {
    let resolveFirst: (value: unknown) => void = () => undefined;
    let resolveSecond: (value: unknown) => void = () => undefined;
    (getAdminFollowUp as jest.Mock)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const view = render(<FollowUpAdminPage />);
    mockDeepLinkFollowUpId = 'follow-up-2';
    view.rerender(<FollowUpAdminPage />);

    await act(async () => {
      resolveSecond({
        ...task,
        id: 'follow-up-2',
        source_call_id: 'call-2',
      });
    });
    expect(await screen.findByText('call-2')).toBeTruthy();

    await act(async () => {
      resolveFirst(task);
    });
    expect(screen.getByText('call-2')).toBeTruthy();
    expect(screen.queryByText('call-1')).toBeNull();
  });
});
