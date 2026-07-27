import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import * as React from 'react';
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

jest.mock('@/components/TableActions', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      const actions = props.actions as Array<Record<string, unknown>>;
      return React.createElement(
        React.Fragment,
        null,
        ...actions.map((action) =>
          React.createElement('button', {
            'aria-label': String(action.label),
            key: String(action.key),
            onClick: action.onClick,
            type: 'button',
          }),
        ),
      );
    },
  };
});

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
      const optionColumn = columns.find(
        (column) => column.valueType === 'option',
      );
      return React.createElement(
        'section',
        null,
        React.createElement(
          'div',
          { 'data-testid': 'search-fields' },
          ...columns
            .filter((column) => column.search !== false)
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
            optionColumn?.render?.(undefined, row),
          ),
        ),
      );
    },
  };
});

const mockRecord = {
  id: '1',
  callId: 'call-1',
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
    (getAiCallRecordDetail as jest.Mock).mockResolvedValue({
      record: mockRecord,
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

  it('提供统一记录筛选、来源列和服务端分页', async () => {
    render(<AiCallRecordsPage />);

    for (const text of [
      '通话记录',
      '通话 ID',
      '业务类型',
      '业务 ID',
      '通话来源',
      '通话状态',
      '开始时间',
      '通话时长',
      '结束结果',
    ]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    await waitFor(() =>
      expect(listAiCallRecords).toHaveBeenCalledWith({
        pageNum: 1,
        pageSize: 10,
      }),
    );
    const detailButton = await screen.findByRole('button', {
      name: '查看详情',
    });
    expect(detailButton.textContent).toBe('查看详情');

    const searchFields = screen.getByTestId('search-fields');
    for (const text of [
      '开始时间',
      '业务场景',
      '业务标识',
      '通话时长',
      '结束结果',
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
    expect(screen.getByText(/技术事件/)).toBeTruthy();
  });
});
