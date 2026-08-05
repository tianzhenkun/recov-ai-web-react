import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { history } from '@umijs/max';
import * as React from 'react';
import { listAiCallTasks } from '@/pages/aiCallTasks/service';
import AiCallRecordsPage from '.';
import {
  getAiCallRecordDetail,
  getAiCallRecordDialogue,
  getAiCallRecordEvents,
  getAiCallRecordHandoffs,
  getAiCallRecordRecording,
  getAiCallRecordSemanticAnalysis,
  listAiCallRecords,
} from './service';

let mockSearchParams = 'taskId=task-1&targetId=target-1';

jest.mock('./service', () => ({
  getAiCallRecordDetail: jest.fn(),
  getAiCallRecordDialogue: jest.fn(),
  getAiCallRecordEvents: jest.fn(),
  getAiCallRecordHandoffs: jest.fn(),
  getAiCallRecordRecording: jest.fn(),
  getAiCallRecordSemanticAnalysis: jest.fn(),
  listAiCallRecords: jest.fn(),
}));

jest.mock('@/pages/aiCallTasks/service', () => ({
  listAiCallTasks: jest.fn(),
}));

jest.mock('@umijs/max', () => ({
  history: {
    push: jest.fn(),
  },
  useSearchParams: () => [new URLSearchParams(mockSearchParams)],
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');
  return {
    PageContainer: (props: Record<string, unknown>) => {
      const { children, title } = props;
      return React.createElement(
        'main',
        null,
        React.createElement('h1', null, title),
        children,
      );
    },
    ProTable: (props: Record<string, unknown>) => {
      const columns = props.columns as Array<{
        key?: string;
        search?: boolean;
        title?: unknown;
        valueType?: string;
        render?: (value: unknown, row: unknown) => unknown;
        renderText?: (value: unknown, row: unknown) => unknown;
        dataIndex?: string;
        hideInTable?: boolean;
      }>;
      const request = props.request as CallableFunction;
      const [rows, setRows] = React.useState([]);
      React.useEffect(() => {
        void request({ current: 1, pageSize: 10 }).then(
          (result: Record<string, unknown>) => {
            setRows(Array.isArray(result.data) ? result.data : []);
          },
        );
      }, [request]);
      return React.createElement(
        'section',
        null,
        React.createElement(
          'div',
          { 'data-testid': 'search-fields' },
          ...columns
            .filter(
              (column) =>
                column.search !== false && column.valueType !== 'option',
            )
            .map((column) =>
              React.createElement(
                'span',
                { key: String(column.key || column.title) },
                column.title,
              ),
            ),
        ),
        React.createElement(
          'div',
          { 'data-testid': 'table-columns' },
          ...columns
            .filter((column) => !column.hideInTable)
            .map((column) =>
              React.createElement(
                'span',
                { key: String(column.key || column.title) },
                column.title,
              ),
            ),
        ),
        ...rows.map((row: unknown, index: number) =>
          React.createElement(
            'div',
            { key: index },
            ...columns
              .filter(
                (column) =>
                  column.search === false || column.valueType === 'option',
              )
              .map((column) =>
                React.createElement(
                  'div',
                  { key: String(column.key || column.title) },
                  column.render
                    ? column.render(undefined, row)
                    : column.renderText
                      ? column.renderText(
                          column.dataIndex
                            ? (row as Record<string, unknown>)[column.dataIndex]
                            : undefined,
                          row,
                        )
                      : column.dataIndex
                        ? String(
                            (row as Record<string, unknown>)[
                              column.dataIndex
                            ] ?? '',
                          )
                        : null,
                ),
              ),
          ),
        ),
      );
    },
  };
});

const mockRecord = {
  id: '1',
  callId: 'call-1',
  taskId: 'task-1',
  targetId: 'target-1',
  taskName: '新品回访',
  customerName: '张三',
  phoneNumber: '13800138000',
  attemptNo: 2,
  callResult: 'connected',
  aiOutcome: '有兴趣',
  summary: '客户希望明天下午再次联系，并进一步了解产品价格。',
  recordingPlayUrl: 'https://example.com/call-1.mp3',
  businessType: 'outbound_task',
  businessId: 'task-1',
  entryType: 'web',
  sceneCode: 'intro_geo',
  status: 'completed',
  startedAt: '2026-07-27T03:13:09',
  endedAt: '2026-07-27T03:13:52',
  durationMs: 43000,
  endReason: 'agent_completed',
};

describe('AI Call 通话记录页面', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = 'taskId=task-1&targetId=target-1';
    (listAiCallRecords as jest.Mock).mockResolvedValue({
      rows: [mockRecord],
      total: 1,
    });
    (listAiCallTasks as jest.Mock).mockResolvedValue({
      rows: [
        {
          taskId: 'task-1',
          taskName: '新品回访',
        },
      ],
      total: 1,
    });
    (getAiCallRecordDetail as jest.Mock).mockResolvedValue({
      record: mockRecord,
      executionConfig: {
        promptProfileId: 'prompt-1',
        promptName: '新品回访提示词',
        sceneCode: 'intro_geo',
        voice: 'Cherry',
        voiceName: '芊悦',
        ruleName: '工作日规则',
      },
    });
    (getAiCallRecordRecording as jest.Mock).mockResolvedValue(null);
    (getAiCallRecordDialogue as jest.Mock).mockResolvedValue({
      rows: [],
      total: 0,
    });
    (getAiCallRecordSemanticAnalysis as jest.Mock).mockResolvedValue(null);
    (getAiCallRecordHandoffs as jest.Mock).mockResolvedValue({
      rows: [],
      total: 0,
    });
    (getAiCallRecordEvents as jest.Mock).mockResolvedValue({
      rows: [],
      total: 0,
    });
  });

  it('提供业务筛选、复合列，并继承任务与外呼对象上下文', async () => {
    render(<AiCallRecordsPage />);

    for (const text of [
      '通话记录',
      '所属任务',
      '手机号',
      '客户名称',
      '通话来源',
      '呼叫结果',
      '客户意向',
      '后续跟进',
      '通话时间范围',
      '通话时间',
      '客户信息',
      '任务信息',
      '呼叫情况',
      '通话摘要',
      '客户意向',
      '后续跟进',
    ]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    await waitFor(() =>
      expect(listAiCallRecords).toHaveBeenCalledWith({
        pageNum: 1,
        pageSize: 10,
        taskId: 'task-1',
        targetId: 'target-1',
      }),
    );
    expect(await screen.findByText('张三')).toBeTruthy();
    expect(screen.getAllByText('新品回访').length).toBeGreaterThan(0);
    expect(screen.getByText(/客户希望明天下午再次联系/)).toBeTruthy();
    const connectedResult = screen.getByText('已接通');
    expect(connectedResult.closest('.ant-tag')).toBeNull();
    expect(
      (connectedResult.closest('.ant-typography') as HTMLElement | null)?.style
        .color,
    ).toBe('rgb(56, 158, 13)');
    const detailButton = await screen.findByRole('button', {
      name: '查看详情',
    });
    expect(detailButton.textContent).toBe('查看详情');

    const searchFields = screen.getByTestId('search-fields');
    const tableColumns = screen.getByTestId('table-columns');
    expect(
      within(tableColumns).queryByText('所属任务', { exact: true }),
    ).toBeNull();
    for (const text of [
      '通话时间',
      '客户信息',
      '任务信息',
      '呼叫情况',
      '通话摘要',
    ]) {
      expect(
        within(searchFields).queryByText(text, { exact: true }),
      ).toBeNull();
    }
    expect(within(tableColumns).queryByText('录音')).toBeNull();
  });

  it('未明确同意时不把跟进线索展示为明确需求', async () => {
    (getAiCallRecordSemanticAnalysis as jest.Mock).mockResolvedValue({
      callId: 'call-1',
      analysisSceneCode: 'intro_geo',
      analysisStatus: '2',
      analysisResult: {
        follow_up: {
          required: true,
          consent: 'missing',
          reason: '客户询问试用，但未明确同意后续联系',
          confidence: 'low',
        },
      },
      analysisRetryCount: 0,
    });

    render(<AiCallRecordsPage />);
    fireEvent.click(await screen.findByRole('button', { name: '查看详情' }));

    const detailDrawer = await screen.findByRole('dialog', {
      name: '通话记录详情',
    });
    expect(
      within(detailDrawer).getByText('存在后续跟进线索，客户尚未明确同意'),
    ).toBeTruthy();
    expect(
      within(detailDrawer).queryByText('已识别到明确的后续联系需求'),
    ).toBeNull();
  });

  it('继承外呼统计下钻的正式来源、结果和右开时间范围', async () => {
    mockSearchParams = new URLSearchParams({
      entryType: 'sip_outbound',
      callResult: 'connected',
      startedAtBegin: '2026-07-25T00:00:00+08:00',
      startedAtEnd: '2026-07-31T16:20:00+08:00',
    }).toString();

    render(<AiCallRecordsPage />);

    await waitFor(() =>
      expect(listAiCallRecords).toHaveBeenCalledWith({
        pageNum: 1,
        pageSize: 10,
        entryType: 'sip_outbound',
        callResult: 'connected',
        startedAtBegin: '2026-07-25T00:00:00+08:00',
        startedAtEnd: '2026-07-31T16:20:00+08:00',
      }),
    );
  });

  it('分层展示客户意向、跟进建议和正式跟进任务入口', async () => {
    const suggestedRecord = {
      ...mockRecord,
      callId: 'call-suggested',
      entryType: 'sip_outbound',
      analysisStatus: '2',
      customerIntent: 'positive',
      followUpSuggested: true,
      followUpId: null,
      followUpStatus: null,
    };
    const taskedRecord = {
      ...mockRecord,
      callId: 'call-tasked',
      entryType: 'sip_outbound',
      analysisStatus: '2',
      customerIntent: 'neutral',
      followUpSuggested: true,
      followUpId: 'follow-up-1',
      followUpStatus: 'pending',
    };
    const mockPostCallRecord = {
      ...mockRecord,
      callId: 'call-mock',
      entryType: 'outbound_mock',
      analysisStatus: '2',
      customerIntent: 'positive',
      followUpSuggested: true,
    };
    (listAiCallRecords as jest.Mock).mockResolvedValue({
      rows: [suggestedRecord, taskedRecord, mockPostCallRecord],
      total: 3,
    });
    (getAiCallRecordDetail as jest.Mock).mockResolvedValue({
      record: suggestedRecord,
      executionConfig: null,
    });

    render(<AiCallRecordsPage />);

    expect(await screen.findByText('正向')).toBeTruthy();
    expect(screen.getByText('中性')).toBeTruthy();
    expect(screen.getByText('建议跟进')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /建议跟进/ }));
    await waitFor(() =>
      expect(getAiCallRecordDetail).toHaveBeenCalledWith('call-suggested'),
    );

    fireEvent.click(screen.getByRole('button', { name: /待跟进/ }));
    expect(history.push).toHaveBeenCalledWith(
      '/ai-call/follow-ups?followUpId=follow-up-1',
    );
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);
  });

  it('模拟执行记录不会展示成真实电话已接通', async () => {
    const outboundMockRecord = {
      ...mockRecord,
      entryType: 'outbound_mock',
      answeredAt: '2026-07-27T03:13:09',
      endReason: 'connected',
    };
    (listAiCallRecords as jest.Mock).mockResolvedValue({
      rows: [outboundMockRecord],
      total: 1,
    });
    (getAiCallRecordDetail as jest.Mock).mockResolvedValue({
      record: outboundMockRecord,
      executionConfig: null,
    });

    render(<AiCallRecordsPage />);

    expect(await screen.findByText('模拟执行完成')).toBeTruthy();
    expect(screen.queryByText('已接通')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));

    const drawer = await screen.findByRole('dialog', {
      name: '通话记录详情',
    });
    expect(within(drawer).getByText('模拟执行')).toBeTruthy();
    expect(within(drawer).getAllByText('模拟执行完成')).toHaveLength(2);
    expect(within(drawer).getByText('不适用（模拟执行）')).toBeTruthy();
    expect(within(drawer).queryByText('connected')).toBeNull();
  });

  it('模拟失败记录区分占线、无人接听和呼叫失败', async () => {
    const mockFailureRecords = [
      {
        ...mockRecord,
        id: 'mock-busy',
        callId: 'mock-busy',
        entryType: 'outbound_mock',
        status: 'failed',
        callResult: 'busy',
        endReason: 'busy',
        failureMessage: '模拟拨打结果：busy',
        answeredAt: null,
      },
      {
        ...mockRecord,
        id: 'mock-no-answer',
        callId: 'mock-no-answer',
        entryType: 'outbound_mock',
        status: 'failed',
        callResult: 'no_answer',
        endReason: 'no_answer',
        failureMessage: '模拟拨打结果：no_answer',
        answeredAt: null,
      },
      {
        ...mockRecord,
        id: 'mock-call-failed',
        callId: 'mock-call-failed',
        entryType: 'outbound_mock',
        status: 'failed',
        callResult: 'call_failed',
        endReason: 'call_failed',
        failureMessage: '模拟拨打结果：call_failed',
        answeredAt: null,
      },
    ];
    (listAiCallRecords as jest.Mock).mockResolvedValue({
      rows: mockFailureRecords,
      total: mockFailureRecords.length,
    });
    (getAiCallRecordDetail as jest.Mock).mockResolvedValue({
      record: mockFailureRecords[0],
      executionConfig: null,
    });

    render(<AiCallRecordsPage />);

    expect(await screen.findByText('模拟：占线')).toBeTruthy();
    expect(screen.getByText('模拟：无人接听')).toBeTruthy();
    expect(screen.getByText('模拟：呼叫失败')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: '查看详情' })[0]);
    const drawer = await screen.findByRole('dialog', {
      name: '通话记录详情',
    });
    expect(within(drawer).getByText('模拟执行失败')).toBeTruthy();
    expect(within(drawer).getByText('模拟：占线')).toBeTruthy();
  });

  it('详情使用业务化中文展示分析结果并限制对话区域高度', async () => {
    (getAiCallRecordRecording as jest.Mock).mockRejectedValue(
      new Error('recording unavailable'),
    );
    (getAiCallRecordDialogue as jest.Mock).mockResolvedValue({
      rows: [
        {
          id: 'segment-0',
          callId: 'call-1',
          segmentNo: 0,
          speakerType: 'ai',
          text: '您好，请问现在方便沟通吗？',
          segmentStatus: 'final',
        },
        {
          id: 'segment-1',
          callId: 'call-1',
          segmentNo: 1,
          speakerType: 'customer',
          text: '我需要人工协助',
          segmentStatus: 'final',
        },
      ],
      total: 1,
    });
    (getAiCallRecordSemanticAnalysis as jest.Mock).mockResolvedValue({
      callId: 'call-1',
      analysisSceneCode: 'intro_geo',
      analysisStatus: '2',
      analysisResult: {
        summary: '客户希望进一步了解产品价格。',
        feedback_type: '负向',
        key_points: ['客户要求转人工', '客户关注产品价格'],
        time_hint: {
          time_text: '明天下午',
          original_texts: ['明天下午再联系'],
        },
        tags: ['价格敏感', '需要跟进'],
        customer_intent: 'positive',
        follow_up: {
          required: true,
          consent: 'explicit',
          reason: '客户明确要求明天下午再次联系',
          preferred_time: '2026-07-31T14:00:00+08:00',
          confidence: 'high',
        },
      },
      analysisRetryCount: 0,
    });

    render(<AiCallRecordsPage />);
    fireEvent.click(await screen.findByRole('button', { name: '查看详情' }));

    expect(await screen.findByText('call-1')).toBeTruthy();
    expect(screen.getByText('正式外呼任务')).toBeTruthy();
    expect(screen.getByText('录音信息加载失败')).toBeTruthy();
    expect(screen.getByText('我需要人工协助')).toBeTruthy();
    const dialogueRegion = screen.getByTestId('dialogue-scroll-region');
    expect(dialogueRegion.style.maxHeight).toBe('420px');
    expect(dialogueRegion.style.overflowY).toBe('auto');
    expect(
      screen
        .getByText('您好，请问现在方便沟通吗？')
        .closest('.ai-call-dialogue-row')
        ?.classList.contains('ai-call-dialogue-row--left'),
    ).toBe(true);
    expect(
      screen
        .getByText('我需要人工协助')
        .closest('.ai-call-dialogue-row')
        ?.classList.contains('ai-call-dialogue-row--right'),
    ).toBe(true);
    expect(screen.getAllByText('通话摘要').length).toBeGreaterThan(0);
    expect(screen.getByText('客户反馈')).toBeTruthy();
    expect(screen.getByText('关键要点')).toBeTruthy();
    expect(screen.getByText('客户期望联系时间')).toBeTruthy();
    expect(screen.queryByText('联系时间', { exact: true })).toBeNull();
    expect(screen.getByText('分析标签')).toBeTruthy();
    const detailDrawer = screen.getByRole('dialog', {
      name: '通话记录详情',
    });
    expect(within(detailDrawer).getByText('客户意向')).toBeTruthy();
    expect(within(detailDrawer).getByText('后续跟进结论')).toBeTruthy();
    expect(within(detailDrawer).getByText('明确同意')).toBeTruthy();
    expect(within(detailDrawer).getByText('建议跟进')).toBeTruthy();
    expect(within(detailDrawer).getByText('2026-07-31 14:00:00')).toBeTruthy();
    expect(
      within(detailDrawer).getByText('客户明确要求明天下午再次联系'),
    ).toBeTruthy();
    expect(screen.getByText('负向').closest('.ant-tag')).toBeTruthy();
    expect(screen.getByText('客户要求转人工')).toBeTruthy();
    expect(screen.getByText('明天下午')).toBeTruthy();
    expect(screen.getByText('价格敏感').closest('.ant-tag')).toBeTruthy();
    expect(screen.getByText('执行配置')).toBeTruthy();
    expect(screen.getByText('新品回访提示词')).toBeTruthy();
    expect(screen.getByText(/芊悦/)).toBeTruthy();
    expect(screen.getByText('工作日规则')).toBeTruthy();
    expect(screen.queryByText(/技术事件/)).toBeNull();
    expect(getAiCallRecordEvents).not.toHaveBeenCalled();
  });

  it('详情字段标题使用正文黑色且客户未提供时间时显示明确文案', async () => {
    (getAiCallRecordSemanticAnalysis as jest.Mock).mockResolvedValue({
      callId: 'call-1',
      analysisSceneCode: 'intro_geo',
      analysisStatus: '2',
      analysisResult: {
        summary: '客户询问服务效果。',
        time_hint: {},
      },
      analysisRetryCount: 0,
    });

    render(<AiCallRecordsPage />);
    fireEvent.click(await screen.findByRole('button', { name: '查看详情' }));

    const resultLabel = await screen.findByText('结束结果');
    expect(resultLabel.style.color).toBe('rgb(31, 31, 31)');
    expect(screen.getByText('客户期望联系时间').style.color).toBe(
      'rgb(31, 31, 31)',
    );
    expect(screen.getByText('客户未提及')).toBeTruthy();
    expect(screen.getByTestId('recording-player').style.marginBottom).toBe(
      '16px',
    );
  });

  it('缺少执行快照时使用紧凑且准确的历史数据提示', async () => {
    (getAiCallRecordDetail as jest.Mock).mockResolvedValue({
      record: mockRecord,
      executionConfig: null,
    });

    render(<AiCallRecordsPage />);
    fireEvent.click(await screen.findByRole('button', { name: '查看详情' }));

    expect(await screen.findByText('未保存执行配置快照')).toBeTruthy();
    expect(screen.queryByText('暂无执行配置快照')).toBeNull();
  });

  it('坐席话后处置覆盖 AI 跟进建议', async () => {
    (getAiCallRecordDetail as jest.Mock).mockResolvedValue({
      record: mockRecord,
      executionConfig: null,
      afterCallWork: {
        agentIdentity: 'agent-admin',
        dispositionCode: 'follow_up_required',
        summary: '安排产品顾问继续跟进试用方案',
        needsFollowUp: true,
        submittedAt: '2026-08-04T08:06:15Z',
      },
      followUp: {
        id: '342941293734035456',
        status: 'pending',
        reason: '人工通话后续跟进',
      },
    });
    (getAiCallRecordSemanticAnalysis as jest.Mock).mockResolvedValue({
      callId: 'call-1',
      analysisSceneCode: 'intro_geo',
      analysisStatus: '2',
      analysisResult: {
        follow_up: { required: false, consent: 'missing' },
      },
      analysisRetryCount: 0,
    });

    render(<AiCallRecordsPage />);
    fireEvent.click(await screen.findByRole('button', { name: '查看详情' }));

    const detailDrawer = await screen.findByRole('dialog', {
      name: '通话记录详情',
    });
    expect(within(detailDrawer).getByText('坐席最终处置')).toBeTruthy();
    expect(within(detailDrawer).getByText('需要后续跟进')).toBeTruthy();
    expect(
      within(detailDrawer).getByText('安排产品顾问继续跟进试用方案'),
    ).toBeTruthy();
    expect(within(detailDrawer).getByText('待处理')).toBeTruthy();
    expect(within(detailDrawer).getByText('人工通话后续跟进')).toBeTruthy();
    expect(within(detailDrawer).queryByText('AI 分析与转人工')).toBeNull();
    expect(within(detailDrawer).queryByText('无需跟进')).toBeNull();

    fireEvent.click(within(detailDrawer).getByText('查看跟进任务'));
    expect(history.push).toHaveBeenCalledWith(
      '/ai-call/follow-ups?followUpId=342941293734035456',
    );
  });

  it('从关联链接打开通话详情并展示原始通话与历次回拨', async () => {
    mockSearchParams = 'callId=call-callback-1';
    (getAiCallRecordDetail as jest.Mock).mockResolvedValue({
      record: {
        ...mockRecord,
        callId: 'call-callback-1',
        entryType: 'sip_callback',
      },
      executionConfig: null,
      followUp: {
        id: 'follow-up-1',
        status: 'processing',
        reason: '客户要求人工进一步介绍',
        sourceCallId: 'call-original-1',
        sourceRecord: {
          ...mockRecord,
          callId: 'call-original-1',
          entryType: 'owner_runtime',
        },
        callbackRecords: [
          {
            ...mockRecord,
            id: '2',
            callId: 'call-callback-1',
            entryType: 'sip_callback',
          },
        ],
      },
    });

    render(<AiCallRecordsPage />);

    const detailDrawer = await screen.findByRole('dialog', {
      name: '通话记录详情',
    });
    expect(getAiCallRecordDetail).toHaveBeenCalledWith('call-callback-1');
    expect(within(detailDrawer).getByText('关联跟进')).toBeTruthy();
    expect(
      within(detailDrawer).getByText('客户要求人工进一步介绍'),
    ).toBeTruthy();
    expect(
      within(detailDrawer)
        .getByRole('link', { name: '查看原始通话' })
        .getAttribute('href'),
    ).toBe('/ai-call/records?callId=call-original-1');
    expect(within(detailDrawer).getByText('历次回拨')).toBeTruthy();
  });

  it('从跟进次要入口进入时只筛选单条记录且不自动展开详情', async () => {
    mockSearchParams = 'callId=call-1&view=list';

    render(<AiCallRecordsPage />);

    await waitFor(() =>
      expect(listAiCallRecords).toHaveBeenCalledWith(
        expect.objectContaining({ callId: 'call-1' }),
      ),
    );
    expect(getAiCallRecordDetail).not.toHaveBeenCalled();
  });
});
