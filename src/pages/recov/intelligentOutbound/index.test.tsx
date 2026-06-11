import {
  act,
  cleanup,
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
import { listOssByIds } from '@/services/ruoyi/oss';
import IntelligentOutboundPage from './index';
import {
  claimAiCallHandoff,
  getAiCallAgentWebRtcConfig,
  getAiCallDashboard,
  getAiCallDebtFeedbackPage,
  getAiCallDebtTimeline,
  getAiCallRecordPage,
  getGatewayCalls,
  hangupGatewayCall,
} from './service';

let mockJsSipEventHandlers: Record<string, (...args: unknown[]) => void> = {};
const mockJsSipStart = jest.fn(() => {});
const mockJsSipStop = jest.fn();
const mockJsSipOn = jest.fn(
  (event: string, handler: (...args: unknown[]) => void) => {
    mockJsSipEventHandlers[event] = handler;
  },
);
const mockJsSipWebSocketInterface = jest.fn();

jest.mock(
  'jssip',
  () => ({
    UA: jest.fn(() => ({
      on: mockJsSipOn,
      start: mockJsSipStart,
      stop: mockJsSipStop,
    })),
    WebSocketInterface: function WebSocketInterface(...args: unknown[]) {
      mockJsSipWebSocketInterface(...args);
    },
  }),
  { virtual: true },
);

jest.mock('@/services/ruoyi/datelligence', () => ({
  getCurrentAssetPackagePipelineProgress: jest.fn(),
  getDebtRecordPage: jest.fn(),
}));

jest.mock('@/services/ruoyi/flowBatchStart', () => ({
  getFlowBatchProgress: jest.fn(),
  startFlowBatch: jest.fn(),
}));

jest.mock('@/services/ruoyi/oss', () => ({
  listOssByIds: jest.fn(),
}));

jest.mock('./service', () => ({
  claimAiCallHandoff: jest.fn(),
  getAiCallAgentWebRtcConfig: jest.fn(),
  getAiCallDashboard: jest.fn(),
  getAiCallDebtFeedbackPage: jest.fn(),
  getAiCallRecordPage: jest.fn(),
  getAiCallDebtTimeline: jest.fn(),
  getGatewayCalls: jest.fn(),
  hangupGatewayCall: jest.fn(),
}));

jest.mock('@ant-design/plots', () => {
  const React = require('react');
  return {
    Column: (props: {
      height?: number;
      scale?: { x?: { paddingInner?: number; paddingOuter?: number } };
      axis?: {
        x?: {
          labelAutoEllipsis?: boolean;
          labelAutoHide?: boolean;
          labelAutoRotate?: boolean;
        };
        y?: {
          title?: boolean | string;
          labelFormatter?: (value: number | string) => string;
          tickFilter?: (value: number | string) => boolean;
        };
      };
      label?: {
        position?: string;
        text?: (datum: { percentage?: number }) => string;
      };
      slider?: { x?: boolean };
      style?: {
        columnWidthRatio?: number;
        maxWidth?: number;
        minWidth?: number;
      };
      xField?: string;
      yField?: string;
    }) =>
      React.createElement('div', {
        'data-testid': 'semantic-persona-distribution-chart',
        'data-height': String(props.height || ''),
        'data-x-field': props.xField || '',
        'data-y-field': props.yField || '',
        'data-x-padding-inner': String(props.scale?.x?.paddingInner || ''),
        'data-x-label-auto-ellipsis': String(
          props.axis?.x?.labelAutoEllipsis || '',
        ),
        'data-x-label-auto-hide': String(props.axis?.x?.labelAutoHide || ''),
        'data-x-label-auto-rotate': String(
          props.axis?.x?.labelAutoRotate || '',
        ),
        'data-y-axis-title': props.axis?.y?.title || '',
        'data-y-label-zero': props.axis?.y?.labelFormatter?.(0) || '',
        'data-y-label-one-hundred': props.axis?.y?.labelFormatter?.(100) || '',
        'data-y-tick-filter-negative': String(
          props.axis?.y?.tickFilter?.(-1) ?? '',
        ),
        'data-y-tick-filter-fifty': String(
          props.axis?.y?.tickFilter?.(50) ?? '',
        ),
        'data-label-position': props.label?.position || '',
        'data-label-text': props.label?.text?.({ percentage: 100 }) || '',
        'data-slider-x': String(props.slider?.x || ''),
        'data-column-width-ratio': String(props.style?.columnWidthRatio || ''),
        'data-column-min-width': String(props.style?.minWidth || ''),
        'data-column-max-width': String(props.style?.maxWidth || ''),
      }),
  };
});

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
const claimAiCallHandoffMock = claimAiCallHandoff as jest.Mock;
const getAiCallAgentWebRtcConfigMock = getAiCallAgentWebRtcConfig as jest.Mock;
const getAiCallDashboardMock = getAiCallDashboard as jest.Mock;
const getAiCallDebtFeedbackPageMock = getAiCallDebtFeedbackPage as jest.Mock;
const getAiCallRecordPageMock = getAiCallRecordPage as jest.Mock;
const getAiCallDebtTimelineMock = getAiCallDebtTimeline as jest.Mock;
const getGatewayCallsMock = getGatewayCalls as jest.Mock;
const hangupGatewayCallMock = hangupGatewayCall as jest.Mock;
const startFlowBatchMock = startFlowBatch as jest.Mock;
const listOssByIdsMock = listOssByIds as jest.Mock;

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('IntelligentOutboundPage', () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockJsSipEventHandlers = {};
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [],
        }),
      },
    });
    Reflect.deleteProperty(window, 'JsSIP');
    getAiCallDashboardMock.mockResolvedValue({ data: {} });
    getAiCallDebtFeedbackPageMock.mockResolvedValue({
      rows: [],
      total: 0,
    });
    getAiCallRecordPageMock.mockResolvedValue({
      rows: [],
      total: 0,
    });
    getGatewayCallsMock.mockResolvedValue({
      calls: [],
    });
    hangupGatewayCallMock.mockResolvedValue({
      status: 'accepted',
      call: {},
    });
    getAiCallAgentWebRtcConfigMock.mockResolvedValue({
      agentExtension: '1001',
      wsUrl: 'wss://recov.lingchen-ai.com/sip-ws',
      sipUri: 'sip:1001@111.229.146.182',
      password: 'test',
      viaTransport: 'WS',
    });
    listOssByIdsMock.mockResolvedValue({ data: [] });
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

  it('renders semantic persona distribution from dashboard data', async () => {
    getAiCallDashboardMock.mockResolvedValue({
      data: {
        semanticPersonaTotal: 3,
        semanticPersonaDistribution: [
          {
            personaId: 11,
            personaName: '投诉挂钩型',
            count: 2,
            percentage: 66.67,
          },
          {
            personaId: 12,
            personaName: '疏忽遗忘型',
            count: 1,
            percentage: 33.33,
          },
        ],
      },
    });

    render(<IntelligentOutboundPage />);

    expect(await screen.findByText('语义画像分布')).toBeTruthy();
    expect(
      await screen.findByTestId('semantic-persona-distribution-chart'),
    ).toBeTruthy();
    expect(screen.queryByText('共 3 个画像结果')).toBeNull();
  });

  it('places semantic persona distribution below monitor and feedback sections', async () => {
    getAiCallDashboardMock.mockResolvedValue({
      data: {
        semanticPersonaTotal: 1,
        semanticPersonaDistribution: [
          {
            personaId: 11,
            personaName: '恶意对抗型',
            count: 1,
            percentage: 100,
          },
        ],
      },
    });

    render(<IntelligentOutboundPage />);

    const liveMonitor = await screen.findByTestId('live-monitor-card');
    const feedbackFeed = await screen.findByTestId('feedback-feed');
    const chart = await screen.findByTestId(
      'semantic-persona-distribution-chart',
    );

    expect(
      liveMonitor.compareDocumentPosition(chart) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      feedbackFeed.compareDocumentPosition(chart) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('uses dashboard aging-analysis column style for a single semantic persona result', async () => {
    getAiCallDashboardMock.mockResolvedValue({
      data: {
        semanticPersonaTotal: 1,
        semanticPersonaDistribution: [
          {
            personaId: 11,
            personaName: '恶意对抗型',
            count: 1,
            percentage: 100,
          },
        ],
      },
    });

    render(<IntelligentOutboundPage />);

    const chart = await screen.findByTestId(
      'semantic-persona-distribution-chart',
    );

    expect(chart.getAttribute('data-height')).toBe('300');
    expect(chart.getAttribute('data-x-field')).toBe('personaName');
    expect(chart.getAttribute('data-y-field')).toBe('percentage');
    expect(chart.getAttribute('data-x-padding-inner')).toBe('0.8');
    expect(chart.getAttribute('data-column-width-ratio')).toBe('0.2');
    expect(chart.getAttribute('data-column-min-width')).toBe('18');
    expect(chart.getAttribute('data-column-max-width')).toBe('18');
    expect(chart.getAttribute('data-y-axis-title')).toBe('');
    expect(chart.getAttribute('data-y-label-zero')).toBe('0%');
    expect(chart.getAttribute('data-y-label-one-hundred')).toBe('100%');
    expect(chart.getAttribute('data-y-tick-filter-negative')).toBe('false');
    expect(chart.getAttribute('data-y-tick-filter-fifty')).toBe('true');
    expect(chart.getAttribute('data-label-position')).toBe('top');
    expect(chart.getAttribute('data-label-text')).toBe('100%');
    expect(screen.getByText('恶意对抗型 100%')).toBeTruthy();
  });

  it('protects horizontal axis readability when semantic persona categories are many', async () => {
    getAiCallDashboardMock.mockResolvedValue({
      data: {
        semanticPersonaTotal: 12,
        semanticPersonaDistribution: Array.from({ length: 12 }, (_, index) => ({
          personaId: index + 1,
          personaName: `画像${index + 1}`,
          count: 1,
          percentage: 8.33,
        })),
      },
    });

    render(<IntelligentOutboundPage />);

    const chart = await screen.findByTestId(
      'semantic-persona-distribution-chart',
    );

    expect(chart.getAttribute('data-slider-x')).toBe('true');
    expect(chart.getAttribute('data-x-label-auto-ellipsis')).toBe('true');
    expect(chart.getAttribute('data-x-label-auto-hide')).toBe('true');
    expect(chart.getAttribute('data-x-label-auto-rotate')).toBe('true');
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
    expect(screen.queryByRole('dialog', { name: '实时外呼明细' })).toBeNull();
    expect(screen.queryByTestId('metrics-row')).toBeNull();
    expect(screen.getByText('正在通话')).toBeTruthy();
    expect(screen.getByRole('tab', { name: '已完成' })).toBeTruthy();
    expect(screen.getByText('企业客服')).toBeTruthy();
    expect(screen.getByText('数字员工小林')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '返回' }));

    expect(await screen.findByTestId('metrics-row')).toBeTruthy();
    expect(screen.queryByText('实时外呼明细')).toBeNull();
  });

  it('opens live monitor details directly from the monitor query', async () => {
    window.history.pushState({}, '', '/intelligent-outbound?monitor=1');
    getAiCallRecordPageMock.mockResolvedValueOnce({
      rows: [],
      total: 0,
    });

    render(<IntelligentOutboundPage />);

    expect(await screen.findByText('实时外呼明细')).toBeTruthy();
    expect(screen.queryByTestId('metrics-row')).toBeNull();
    await waitFor(() => {
      expect(getAiCallRecordPageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNum: 1,
          pageSize: 10,
          status: '1',
        }),
      );
    });
  });

  it('shows customer phone, customer name and direct recording playback without call_record in live monitor rows', async () => {
    getAiCallRecordPageMock.mockResolvedValueOnce({
      rows: [
        {
          callRecordId: '320461068875341824',
          debtId: '2063868307578079190',
          debtNumber: 36,
          debtorName: '刘先生',
          debtorPhone: '18518968743',
          identityName: '企业客服',
          callerName: '数字员工小林',
          status: '1',
          startedAt: '2026-06-10 09:00:00',
          gatewayCallId: 'gateway-320461068875341824',
          recordingUrl: 'https://oss.example.com/call-320461068875341824.wav',
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

    expect(await screen.findByText('刘先生')).toBeTruthy();
    expect(screen.getByText('18518968743')).toBeTruthy();
    expect(screen.getByText('通话中')).toBeTruthy();
    expect(screen.queryByText('call_record')).toBeNull();
    expect(screen.queryByText('320461068875341824')).toBeNull();
    expect(screen.queryByText('gateway-320461068875341824')).toBeNull();

    const playButton = screen.getByRole('button', { name: '播放录音' });
    expect((playButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(
        (document.querySelector('audio[controls]') as HTMLAudioElement)?.src,
      ).toBe('https://oss.example.com/call-320461068875341824.wav');
    });
  });

  it('does not expose failed calls as a live monitor tab', async () => {
    render(<IntelligentOutboundPage />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: '查看详情',
      }),
    );

    expect(await screen.findByText('实时外呼明细')).toBeTruthy();
    expect(screen.getByText('正在通话')).toBeTruthy();
    expect(screen.getByRole('tab', { name: '已完成' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: '今日已完成' })).toBeNull();
    expect(screen.queryByText('今日失败')).toBeNull();
    expect(screen.queryByText('正在通话、今日完成与失败记录')).toBeNull();

    await waitFor(() => {
      expect(getAiCallRecordPageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNum: 1,
          pageSize: 10,
          status: '1',
        }),
      );
    });
    expect(getAiCallRecordPageMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        status: '2',
      }),
    );
  });

  it('shows claim button for waiting handoff calls', async () => {
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
          gatewayCallId: 'gateway-101',
          handoffState: 'waiting_agent',
          handoffCanClaim: true,
          handoffLastUtterance: '我要找人工客服',
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

    expect(await screen.findByText('等待人工')).toBeTruthy();
    expect(screen.getByText('我要找人工客服')).toBeTruthy();
    expect(screen.getByRole('button', { name: '接管' })).toBeTruthy();
  });

  it('overlays waiting handoff state from the realtime gateway when Java is stale', async () => {
    getAiCallRecordPageMock.mockResolvedValueOnce({
      rows: [
        {
          callRecordId: '2064565948121137154',
          debtNumber: 41,
          debtorName: '刘先生',
          debtorPhone: '17866726638',
          status: '1',
          startedAt: '2026-06-10 12:31:00',
          gatewayCallId: '8a85422295ab4e9f8b07562a096f5636',
          handoffState: 'none',
          handoffCanClaim: false,
        },
      ],
      total: 1,
    });
    getGatewayCallsMock.mockResolvedValueOnce({
      calls: [
        {
          call_id: '8a85422295ab4e9f8b07562a096f5636',
          external_call_id: '2064565948121137154',
          status: 'waiting_agent',
          handoff: {
            state: 'waiting_agent',
            can_claim: true,
            last_utterance: '转人工。',
          },
        },
      ],
    });

    render(<IntelligentOutboundPage />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: '查看详情',
      }),
    );

    expect(await screen.findByText('等待人工')).toBeTruthy();
    expect(screen.getByText('转人工。')).toBeTruthy();
    const claimButton = screen.getByRole('button', { name: '接管' });
    expect((claimButton as HTMLButtonElement).disabled).toBe(false);
  });

  it('polls ongoing calls every second and pauses after handoff is active', async () => {
    getAiCallRecordPageMock
      .mockResolvedValueOnce({
        rows: [
          {
            callRecordId: 101,
            status: '1',
            gatewayCallId: 'gateway-101',
            handoffState: 'none',
          },
        ],
        total: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            callRecordId: 101,
            status: '1',
            gatewayCallId: 'gateway-101',
            handoffState: 'human_active',
            handoffCanClaim: false,
          },
        ],
        total: 1,
      })
      .mockResolvedValue({
        rows: [
          {
            callRecordId: 101,
            status: '1',
            gatewayCallId: 'gateway-101',
            handoffState: 'human_active',
            handoffCanClaim: false,
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
      expect(getAiCallRecordPageMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(
      () => {
        expect(getAiCallRecordPageMock).toHaveBeenCalledTimes(2);
      },
      { timeout: 1800 },
    );
    expect((await screen.findAllByText('已接管')).length).toBeGreaterThan(0);

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 1400));
    });
    expect(getAiCallRecordPageMock).toHaveBeenCalledTimes(2);
  });

  it('uses bundled JsSIP with default WebRTC config when Java config is unavailable', async () => {
    getAiCallAgentWebRtcConfigMock.mockRejectedValueOnce(
      new Error('not ready'),
    );

    render(<IntelligentOutboundPage />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: '查看详情',
      }),
    );

    expect(await screen.findByText('分机 1001')).toBeTruthy();

    fireEvent.click(
      await screen.findByRole('button', { name: 'poweroff 上线' }),
    );
    await flushPromises();

    await waitFor(() => {
      expect(mockJsSipStart).toHaveBeenCalledTimes(1);
    });
    act(() => {
      mockJsSipEventHandlers.registered?.();
    });

    expect(await screen.findByText('可接听')).toBeTruthy();
    expect(screen.queryByText('未加载 JsSIP')).toBeNull();
    expect(screen.queryByText('缺少坐席 WebRTC 配置')).toBeNull();
  });

  it('normalizes legacy ws WebRTC config returned by Java on https pages', async () => {
    getAiCallAgentWebRtcConfigMock.mockResolvedValueOnce({
      agentExtension: '1001',
      wsUrl: 'ws://111.229.146.182:5066',
      sipUri: 'sip:1001@111.229.146.182',
      password: 'test',
    });

    render(<IntelligentOutboundPage />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: '查看详情',
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'poweroff 上线' }),
    );
    await flushPromises();

    await waitFor(() => {
      expect(mockJsSipStart).toHaveBeenCalledTimes(1);
    });
    expect(mockJsSipWebSocketInterface).toHaveBeenCalledWith(
      'wss://recov.lingchen-ai.com/sip-ws',
    );
    expect(
      screen.queryByText(
        '当前 HTTPS 页面不能连接 ws:// 坐席地址，请改用 wss://',
      ),
    ).toBeNull();
  });

  it('submits handoff claim through the service helper', async () => {
    getAiCallRecordPageMock.mockResolvedValue({
      rows: [
        {
          callRecordId: 101,
          status: '1',
          gatewayCallId: 'gateway-101',
          handoffState: 'waiting_agent',
          handoffCanClaim: true,
        },
      ],
      total: 1,
    });
    claimAiCallHandoffMock.mockImplementation(() => new Promise(() => {}));

    render(<IntelligentOutboundPage />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: '查看详情',
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: '接管' }));

    await waitFor(() => {
      expect(claimAiCallHandoffMock).toHaveBeenCalledWith({
        callRecordId: 101,
        gatewayCallId: 'gateway-101',
        agentExtension: '1001',
        timeoutSeconds: 20,
      });
    });
  });

  it('hangs up the active gateway call after terminating the WebRTC session', async () => {
    getAiCallRecordPageMock.mockResolvedValue({
      rows: [
        {
          callRecordId: 101,
          status: '1',
          gatewayCallId: 'gateway-101',
          handoffState: 'human_active',
          handoffCanClaim: false,
        },
      ],
      total: 1,
    });
    const sessionAnswer = jest.fn();
    const sessionTerminate = jest.fn();
    const sessionOn = jest.fn();

    render(<IntelligentOutboundPage />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: '查看详情',
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'poweroff 上线' }),
    );
    await flushPromises();
    await waitFor(() => {
      expect(mockJsSipStart).toHaveBeenCalledTimes(1);
    });
    act(() => {
      mockJsSipEventHandlers.registered?.();
    });
    act(() => {
      mockJsSipEventHandlers.newRTCSession?.({
        session: {
          answer: sessionAnswer,
          terminate: sessionTerminate,
          on: sessionOn,
          connection: {
            addEventListener: jest.fn(),
          },
        },
      });
    });

    fireEvent.click(
      await screen.findByRole('button', { name: 'phone 接听来电' }),
    );
    expect(sessionAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        pcConfig: {
          iceServers: [],
        },
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'audio 挂断' }));

    expect(sessionTerminate).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(hangupGatewayCallMock).toHaveBeenCalledWith({
        gatewayCallId: 'gateway-101',
        reason: 'agent_hangup',
      });
    });
  });

  it('disables claim button when handoff cannot be claimed', async () => {
    getAiCallRecordPageMock.mockResolvedValueOnce({
      rows: [
        {
          callRecordId: 101,
          status: '1',
          gatewayCallId: 'gateway-101',
          handoffState: 'waiting_agent',
          handoffCanClaim: false,
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

    const claimButton = await screen.findByRole('button', { name: '接管' });
    expect((claimButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('simulates a handoff call locally when mock handoff mode is enabled', async () => {
    window.history.pushState({}, '', '/intelligent-outbound?mockHandoff=1');
    claimAiCallHandoffMock.mockResolvedValue({});

    render(<IntelligentOutboundPage />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: '查看详情',
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: /模拟转人工/ }));

    expect(await screen.findByText('模拟业主')).toBeTruthy();
    expect(screen.getByText('等待人工')).toBeTruthy();
    expect(screen.getByText('我想转人工，帮我找一下客服')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '接管' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '已接管' })).toBeTruthy();
    });
    expect(screen.getAllByText('已接管').length).toBeGreaterThanOrEqual(1);
    expect(claimAiCallHandoffMock).not.toHaveBeenCalled();
  });

  it('loads status 4 calls from the completed tab and opens semantic analysis', async () => {
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
    fireEvent.click(await screen.findByRole('tab', { name: '已完成' }));

    await waitFor(() => {
      expect(getAiCallRecordPageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNum: 1,
          pageSize: 10,
          status: '4',
          dateStart: expect.any(String),
          dateEnd: expect.any(String),
        }),
      );
    });
    expect(getAiCallRecordPageMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        status: '2',
      }),
    );

    expect(await screen.findByText('企业法务')).toBeTruthy();
    expect(screen.queryByText('外呼失败')).toBeNull();
    fireEvent.click(
      await screen.findByRole('button', { name: /查看语义分析/ }),
    );

    await waitFor(() => {
      expect(getAiCallDebtTimelineMock).toHaveBeenCalledWith(202);
    });
  });
});
