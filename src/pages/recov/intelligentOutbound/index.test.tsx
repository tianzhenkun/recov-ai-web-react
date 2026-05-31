import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Modal } from 'antd';
import * as React from 'react';
import {
  getCurrentAssetPackagePipelineProgress,
  getDebtRecordPage,
} from '@/services/ruoyi/datelligence';
import { startFlowBatch } from '@/services/ruoyi/flowBatchStart';
import IntelligentOutboundPage from './index';
import {
  getAiCallDashboard,
  getAiCallDebtFeedbackPage,
  getAiCallDebtTimeline,
  getAiCallRecordPage,
} from './service';

jest.mock('@/services/ruoyi/datelligence', () => ({
  getCurrentAssetPackagePipelineProgress: jest.fn(),
  getDebtRecordPage: jest.fn(),
}));

jest.mock('@/services/ruoyi/flowBatchStart', () => ({
  getFlowBatchProgress: jest.fn(),
  startFlowBatch: jest.fn(),
}));

jest.mock('./service', () => ({
  getAiCallDashboard: jest.fn(),
  getAiCallDebtFeedbackPage: jest.fn(),
  getAiCallRecordPage: jest.fn(),
  getAiCallDebtTimeline: jest.fn(),
}));

jest.mock('./MetricsRow', () => {
  const React = require('react');
  return () => React.createElement('div', { 'data-testid': 'metrics-row' });
});

jest.mock('./LiveMonitorCard', () => {
  const React = require('react');
  return ({ onDetailClick }: { onDetailClick?: () => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'live-monitor-card' },
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: onDetailClick,
        },
        '查看详情',
      ),
    );
});

jest.mock('./IdentityGrid', () => {
  const React = require('react');
  return () => React.createElement('div', { 'data-testid': 'identity-grid' });
});

jest.mock('./FeedbackFeed', () => {
  const React = require('react');
  return () => React.createElement('div', { 'data-testid': 'feedback-feed' });
});

jest.mock('./FeedbackAllDrawer', () => {
  const React = require('react');
  return () =>
    React.createElement('div', { 'data-testid': 'feedback-all-drawer' });
});

jest.mock('./CommunicationLogModal', () => {
  const React = require('react');
  return () =>
    React.createElement('div', { 'data-testid': 'communication-log-modal' });
});

const getDebtRecordPageMock = getDebtRecordPage as jest.Mock;
const getCurrentAssetPackagePipelineProgressMock =
  getCurrentAssetPackagePipelineProgress as jest.Mock;
const getAiCallDashboardMock = getAiCallDashboard as jest.Mock;
const getAiCallDebtFeedbackPageMock = getAiCallDebtFeedbackPage as jest.Mock;
const getAiCallRecordPageMock = getAiCallRecordPage as jest.Mock;
const getAiCallDebtTimelineMock = getAiCallDebtTimeline as jest.Mock;
const startFlowBatchMock = startFlowBatch as jest.Mock;

describe('IntelligentOutboundPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAiCallDashboardMock.mockResolvedValue({ data: {} });
    getAiCallDebtFeedbackPageMock.mockResolvedValue({
      rows: [],
      total: 0,
    });
    getAiCallRecordPageMock.mockResolvedValue({
      rows: [],
      total: 0,
    });
    getAiCallDebtTimelineMock.mockResolvedValue({
      data: {
        debtId: 202,
        debtorName: '张三',
        organization: '海珀澜庭',
        records: [],
      },
    });
    getCurrentAssetPackagePipelineProgressMock.mockResolvedValue({
      data: null,
    });
    getDebtRecordPageMock.mockResolvedValue({
      data: {
        page: {
          rows: [],
          total: 8,
        },
      },
    });
    startFlowBatchMock.mockResolvedValue({
      data: {
        acceptedCount: 8,
        matchedCount: 8,
        skippedCount: 0,
      },
    });
  });

  it('starts AI outbound with all-scope confirmation and an empty filter', async () => {
    const confirmSpy = jest.spyOn(Modal, 'confirm').mockReturnValue({
      destroy: jest.fn(),
      update: jest.fn(),
    });

    render(<IntelligentOutboundPage />);

    const startButton = await screen.findByRole('button', {
      name: /启动 AI 外呼/,
    });

    await waitFor(() => {
      expect((startButton as HTMLButtonElement).disabled).toBe(false);
      expect(startButton.className).not.toContain('ant-btn-loading');
    });

    fireEvent.click(startButton);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });
    const confirmOptions = confirmSpy.mock.calls[0][0];
    render(<div>{confirmOptions.content}</div>);

    expect(confirmOptions.title).toBe('确认启动 AI 外呼');
    expect(screen.queryByText('资产编号')).toBeNull();
    expect(screen.getByText('启动范围')).toBeTruthy();
    expect(screen.getByText('所属城市')).toBeTruthy();
    expect(screen.getByText('所属项目')).toBeTruthy();
    expect(screen.getAllByText('全部')).toHaveLength(2);
    expect(
      screen.getByText(
        '将按当前筛选范围，对未开始的债务启动 AI 外呼。已启动或正在处理的债务会自动跳过。',
      ),
    ).toBeTruthy();

    const onOk = confirmOptions.onOk;
    if (onOk) {
      await act(async () => {
        await onOk(jest.fn());
      });
    }

    await waitFor(() => {
      expect(startFlowBatchMock).toHaveBeenCalledWith({});
    });

    confirmSpy.mockRestore();
  });

  it('allows all-scope start when the latest import failed but existing debts are available', async () => {
    getCurrentAssetPackagePipelineProgressMock.mockResolvedValue({
      data: {
        status: 'failed',
        errorMessage: 'ZIP 导入失败',
      },
    });
    const confirmSpy = jest.spyOn(Modal, 'confirm').mockReturnValue({
      destroy: jest.fn(),
      update: jest.fn(),
    });

    render(<IntelligentOutboundPage />);

    const startButton = await screen.findByRole('button', {
      name: /启动 AI 外呼/,
    });

    await waitFor(() => {
      expect((startButton as HTMLButtonElement).disabled).toBe(false);
      expect(startButton.className).not.toContain('ant-btn-loading');
    });

    await act(async () => {
      fireEvent.click(startButton);
    });

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });
    const confirmOptions = confirmSpy.mock.calls[0][0];
    render(<div>{confirmOptions.content}</div>);

    expect(
      screen.getByText('最近一次导入失败，本次仅处理已入库且未开始的债务。'),
    ).toBeTruthy();

    confirmSpy.mockRestore();
  });

  it('opens live monitor details and loads ongoing calls by default', async () => {
    getAiCallRecordPageMock.mockResolvedValueOnce({
      rows: [
        {
          callRecordId: 101,
          debtId: 201,
          debtNumber: 4,
          identityName: '企业客服',
          callerName: '数字员工小林',
          status: '1',
          startedAt: '2026-05-31 09:00:00',
        },
      ],
      total: 1,
    });

    render(<IntelligentOutboundPage />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: '查看详情',
      }),
    );

    await waitFor(() => {
      expect(getAiCallRecordPageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNum: 1,
          pageSize: 10,
          status: '1',
        }),
      );
    });

    expect(await screen.findByText('实时外呼明细')).toBeTruthy();
    expect(screen.getByText('正在通话')).toBeTruthy();
    expect(screen.getByText('今日已完成')).toBeTruthy();
    expect(screen.getByText('企业客服')).toBeTruthy();
    expect(screen.getByText('数字员工小林')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('loads today completed calls and opens semantic analysis from the monitor detail', async () => {
    getAiCallRecordPageMock.mockImplementation((params) => {
      if (params?.status === '1') {
        return Promise.resolve({
          rows: [],
          total: 0,
        });
      }

      return Promise.resolve({
        rows: [
          {
            callRecordId: 102,
            debtId: 202,
            debtNumber: 5,
            identityName: '企业法务',
            callerName: '数字员工小周',
            status: '4',
            analysisStatus: '2',
            startedAt: '2026-05-31 09:00:00',
            finishedAt: '2026-05-31 09:05:00',
            durationSeconds: 300,
          },
        ],
        total: 1,
      });
    });

    render(<IntelligentOutboundPage />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: '查看详情',
      }),
    );
    fireEvent.click(await screen.findByText('今日已完成'));

    await waitFor(() => {
      expect(getAiCallRecordPageMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pageNum: 1,
          pageSize: 10,
          dateStart: expect.any(String),
          dateEnd: expect.any(String),
        }),
      );
    });

    expect(await screen.findByText('企业法务')).toBeTruthy();
    fireEvent.click(
      await screen.findByRole('button', { name: /查看语义分析/ }),
    );

    await waitFor(() => {
      expect(getAiCallDebtTimelineMock).toHaveBeenCalledWith(202);
    });
  });
});
