import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import * as React from 'react';
import {
  createVoiceEnrollment,
  listVoiceProfiles,
} from '@/services/ruoyi/ai-call-voices';
import AiCallVoicesPage from './index';

jest.mock('@/services/ruoyi/ai-call-voices', () => ({
  createVoiceEnrollment: jest.fn(),
  listVoiceProfiles: jest.fn(),
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = (props: Record<string, unknown>) => {
    const propsRef = React.useRef(props);
    propsRef.current = props;
    const [rows, setRows] = React.useState([]);
    const [total, setTotal] = React.useState(0);
    const pageRef = React.useRef(1);

    const load = React.useCallback(async (page?: number) => {
      const currentPage = page ?? pageRef.current;
      pageRef.current = currentPage;
      const currentProps = propsRef.current;
      const request = currentProps.request as CallableFunction;
      const result = await request({ current: currentPage, pageSize: 20 });
      setRows(Array.isArray(result.data) ? result.data : []);
      setTotal(typeof result.total === 'number' ? result.total : 0);
    }, []);

    React.useEffect(() => {
      const actionRef = propsRef.current.actionRef as {
        current?: Record<string, CallableFunction>;
      };
      actionRef.current = {
        reload: () => load(),
        reloadAndRest: () => load(1),
      };
      void load(1);
      return () => {
        actionRef.current = undefined;
      };
    }, [load]);

    const currentProps = propsRef.current;
    const columns = currentProps.columns as Array<{
      dataIndex?: string;
      key?: string;
      render?: (value: unknown, row: Record<string, unknown>) => unknown;
      title?: unknown;
    }>;
    const pagination = currentProps.pagination as {
      showTotal?: (count: number) => string;
    };
    const rowKey = String(currentProps.rowKey);

    return React.createElement(
      'section',
      null,
      React.createElement(
        'table',
        null,
        React.createElement(
          'thead',
          null,
          React.createElement(
            'tr',
            null,
            ...columns.map((column, index) =>
              React.createElement(
                'th',
                { key: String(column.key || column.dataIndex || index) },
                column.title,
              ),
            ),
          ),
        ),
        React.createElement(
          'tbody',
          null,
          ...rows.map((row: Record<string, unknown>, rowIndex: number) =>
            React.createElement(
              'tr',
              {
                'data-testid': 'voice-row',
                key: String(row[rowKey] || rowIndex),
              },
              ...columns.map((column, columnIndex) =>
                React.createElement(
                  'td',
                  {
                    key: String(column.key || column.dataIndex || columnIndex),
                  },
                  column.render
                    ? column.render(
                        column.dataIndex ? row[column.dataIndex] : undefined,
                        row,
                      )
                    : column.dataIndex
                      ? String(row[column.dataIndex] ?? '')
                      : null,
                ),
              ),
            ),
          ),
        ),
      ),
      React.createElement(
        'span',
        { 'data-testid': 'pagination-total' },
        pagination.showTotal?.(total),
      ),
      React.createElement(
        'button',
        {
          onClick: () => load(pageRef.current + 1),
          type: 'button',
        },
        '下一页',
      ),
    );
  };

  return {
    PageContainer: ({
      children,
      title,
    }: {
      children: unknown;
      title?: unknown;
    }) =>
      React.createElement(
        'main',
        null,
        React.createElement('h1', null, title),
        children,
      ),
    ProCard: ({ children }: { children: unknown }) =>
      React.createElement('section', null, children),
    ProTable,
  };
});

const mockList = listVoiceProfiles as jest.Mock;
const mockCreate = createVoiceEnrollment as jest.Mock;

const voice = (overrides: Record<string, unknown> = {}) => ({
  id: '1',
  scope: 'TENANT',
  voice: 'qwen-voice-1',
  displayName: '客服小林',
  voiceType: '自定义复刻',
  gender: '女声',
  language: 'zh',
  targetModel: 'qwen3.5-omni-plus-realtime',
  status: 'ENABLED',
  errorMessage: null,
  canPreview: true,
  canDelete: true,
  createdAt: '2026-07-30T10:00:00Z',
  updatedAt: '2026-07-30T10:00:00Z',
  ...overrides,
});

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const openCreateModal = async () => {
  fireEvent.click(screen.getByRole('button', { name: /创建自定义音色/ }));
  return screen.findByRole('dialog', { name: '创建自定义音色' });
};

const fillEnrollment = async (displayName: string, file: File) => {
  fireEvent.change(screen.getByLabelText('音色展示名'), {
    target: { value: displayName },
  });
  const fileInput = document.querySelector('input[type="file"]');
  if (!(fileInput instanceof HTMLInputElement)) {
    throw new Error('未找到声音样本文件选择框');
  }
  fireEvent.change(fileInput, { target: { files: [file] } });
  fireEvent.click(screen.getByRole('checkbox'));
  const submitButton = screen.getByRole('button', {
    name: '提交复刻',
  }) as HTMLButtonElement;
  await waitFor(() => expect(submitButton.disabled).toBe(false));
  return submitButton;
};

describe('AI Call voice management page', () => {
  beforeEach(() => {
    mockList.mockReset();
    mockCreate.mockReset();
    mockList.mockResolvedValue({ rows: [voice()], total: 1 });
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders one table and polls only while active rows exist', async () => {
    jest.useFakeTimers();
    mockList
      .mockResolvedValueOnce({
        rows: [voice({ status: 'CREATING' })],
        total: 1,
      })
      .mockResolvedValue({
        rows: [voice({ status: 'ENABLED' })],
        total: 1,
      });

    render(<AiCallVoicesPage />);
    await flushPromises();

    expect(screen.getByText('创建中')).toBeTruthy();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(mockList).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(mockList).toHaveBeenCalledTimes(2);
    expect(screen.getByText('可用')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(4_000);
    });
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('stops polling while document is hidden and resumes when visible', async () => {
    jest.useFakeTimers();
    mockList.mockResolvedValue({
      rows: [voice({ status: 'DELETING' })],
      total: 1,
    });
    render(<AiCallVoicesPage />);
    await flushPromises();
    expect(mockList).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => {
      jest.advanceTimersByTime(4_000);
    });
    expect(mockList).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => {
      jest.advanceTimersByTime(2_000);
    });
    await flushPromises();
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('applies filters, supports pagination, and shows the total in pagination', async () => {
    mockList.mockResolvedValue({ rows: [], total: 56 });
    render(<AiCallVoicesPage />);

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('pagination-total').textContent).toBe(
        '共 56 条',
      ),
    );
    expect(mockList).toHaveBeenLastCalledWith({
      pageNum: 1,
      pageSize: 20,
      includeDeleted: false,
    });
    expect(screen.getByRole('combobox', { name: '类型' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: '性别' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: '状态' })).toBeTruthy();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '类型' }));
    fireEvent.click(await screen.findByTitle('自定义复刻'));
    fireEvent.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith({
        pageNum: 1,
        pageSize: 20,
        includeDeleted: false,
        voiceType: '自定义复刻',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: '下一页' }));
    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageNum: 2,
          pageSize: 20,
          voiceType: '自定义复刻',
        }),
      ),
    );
  });

  it('puts an accepted voice first and deduplicates it when the server returns it', async () => {
    const builtin = voice({
      id: '2',
      scope: 'GLOBAL',
      voice: 'Cherry',
      displayName: '芊悦',
      voiceType: '内置',
    });
    const serverVoice = voice({
      id: '9007199254740993',
      status: 'CREATING',
    });
    let serverRows = [builtin];
    mockList.mockImplementation(async () => ({
      rows: serverRows,
      total: serverRows.length,
    }));
    mockCreate.mockResolvedValue({
      voiceProfileId: '9007199254740993',
      enrollmentId: '9007199254740995',
      status: 'CREATING',
      displayName: '客服小林',
    });
    render(<AiCallVoicesPage />);
    expect(await screen.findByText('芊悦')).toBeTruthy();

    await openCreateModal();
    const submitButton = await fillEnrollment(
      '客服小林',
      new File(['voice'], 'voice.mp3', { type: 'audio/mpeg' }),
    );
    fireEvent.click(submitButton);

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const rows = screen.getAllByTestId('voice-row');
      expect(within(rows[0]).getByText('客服小林')).toBeTruthy();
    });

    serverRows = [serverVoice, builtin];
    const callsBeforeRefresh = mockList.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /刷\s*新/ }));
    await waitFor(() =>
      expect(mockList.mock.calls.length).toBeGreaterThan(callsBeforeRefresh),
    );
    await waitFor(() =>
      expect(screen.getAllByText('客服小林')).toHaveLength(1),
    );
    expect(screen.queryByRole('button', { name: '试听' })).toBeNull();
    expect(screen.queryByRole('button', { name: '删除' })).toBeNull();
  });

  it('does not show or poll an accepted custom voice excluded by the active filters', async () => {
    jest.useFakeTimers();
    mockList.mockResolvedValue({
      rows: [
        voice({
          id: '2',
          scope: 'GLOBAL',
          voice: 'Cherry',
          displayName: '芊悦',
          voiceType: '内置',
        }),
      ],
      total: 1,
    });
    mockCreate.mockResolvedValue({
      voiceProfileId: '10',
      enrollmentId: '11',
      status: 'CREATING',
      displayName: '客服小林',
    });
    render(<AiCallVoicesPage />);
    await flushPromises();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '类型' }));
    fireEvent.click(await screen.findByTitle('内置'));
    fireEvent.click(screen.getByRole('button', { name: /查\s*询/ }));
    await flushPromises();

    await openCreateModal();
    const submitButton = await fillEnrollment(
      '客服小林',
      new File(['voice'], 'voice.mp3', { type: 'audio/mpeg' }),
    );
    fireEvent.click(submitButton);
    await flushPromises();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('客服小林')).toBeNull();
    const callsAfterAcceptance = mockList.mock.calls.length;

    act(() => {
      jest.advanceTimersByTime(4_000);
    });
    await flushPromises();
    expect(mockList).toHaveBeenCalledTimes(callsAfterAcceptance);
  });

  it('retains an idempotency key for an unknown result and clears it after acceptance', async () => {
    mockList.mockResolvedValue({ rows: [], total: 0 });
    mockCreate
      .mockRejectedValueOnce(new Error('网络结果未知'))
      .mockResolvedValueOnce({
        voiceProfileId: '10',
        enrollmentId: '11',
        status: 'CREATING',
        displayName: '客服小林',
      })
      .mockResolvedValueOnce({
        voiceProfileId: '20',
        enrollmentId: '21',
        status: 'CREATING',
        displayName: '客服小周',
      });
    render(<AiCallVoicesPage />);
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));

    await openCreateModal();
    const originalFile = new File(['voice'], 'voice.mp3', {
      type: 'audio/mpeg',
    });
    let submitButton = await fillEnrollment('客服小林', originalFile);
    fireEvent.click(submitButton);
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(submitButton.disabled).toBe(false));

    fireEvent.click(submitButton);
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));
    expect(mockCreate.mock.calls[1][1]).toBe(mockCreate.mock.calls[0][1]);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await openCreateModal();
    submitButton = await fillEnrollment(
      '客服小周',
      new File(['new-voice'], 'new-voice.m4a', { type: 'audio/mp4' }),
    );
    fireEvent.click(submitButton);
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(3));
    expect(mockCreate.mock.calls[2][1]).not.toBe(mockCreate.mock.calls[1][1]);
  });
});
