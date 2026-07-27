import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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
  useSearchParams: () => [
    new URLSearchParams('taskId=task-1&targetId=target-1'),
  ],
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
        ...columns.map((column) =>
          React.createElement(
            'span',
            { key: String(column.key || column.title) },
            column.title,
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
      '通话时间范围',
      '通话时间',
      '客户信息',
      '任务信息',
      '呼叫情况',
      'AI 分析',
      '录音',
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
    expect(screen.getByText('有兴趣')).toBeTruthy();
    expect(screen.getByText(/客户希望明天下午再次联系/)).toBeTruthy();
    const detailButton = await screen.findByRole('button', {
      name: '查看详情',
    });
    expect(detailButton.textContent).toBe('查看详情');

    const searchFields = screen.getByTestId('search-fields');
    for (const text of [
      '通话时间',
      '客户信息',
      '任务信息',
      '呼叫情况',
      'AI 分析',
      '录音',
    ]) {
      expect(
        within(searchFields).queryByText(text, { exact: true }),
      ).toBeNull();
    }
  });

  it('详情附属接口单项失败时仍展示其他内容', async () => {
    (getAiCallRecordRecording as jest.Mock).mockRejectedValue(
      new Error('recording unavailable'),
    );
    (getAiCallRecordDialogue as jest.Mock).mockResolvedValue({
      rows: [
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
      analysisStatus: '4',
      analysisResult: { intent: 'human_service' },
      analysisRetryCount: 0,
    });

    render(<AiCallRecordsPage />);
    fireEvent.click(await screen.findByRole('button', { name: '查看详情' }));

    expect(await screen.findByText('call-1')).toBeTruthy();
    expect(screen.getByText('录音信息加载失败')).toBeTruthy();
    expect(screen.getByText('我需要人工协助')).toBeTruthy();
    expect(screen.getByText(/无有效客户话术/)).toBeTruthy();
    expect(screen.getByText('human_service')).toBeTruthy();
    expect(screen.getByText('执行配置')).toBeTruthy();
    expect(screen.getByText('新品回访提示词')).toBeTruthy();
    expect(screen.getByText(/芊悦/)).toBeTruthy();
    expect(screen.getByText('工作日规则')).toBeTruthy();
    expect(screen.getByText(/技术事件/)).toBeTruthy();
  });
});
