import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { listOssByIds } from '@/services/ruoyi/oss';
import CommunicationLogModal, {
  CommunicationLogContent,
} from './CommunicationLogModal';

jest.mock('@/services/ruoyi/oss', () => ({
  listOssByIds: jest.fn(),
}));

const listOssByIdsMock = listOssByIds as jest.Mock;

const defaultTurns = [
  {
    speaker: 'assistant',
    content: '您好，请问是金女士本人吗？',
  },
  {
    speaker: 'user',
    content: '后面。',
  },
];

const buildDetail = (turns: Array<Record<string, string>> = defaultTurns) => ({
  ownerName: '金阳',
  organization: '海珀澜庭',
  semanticSummary: '用户表示暂不方便处理费用。',
  logs: [
    {
      id: 'log-1',
      recordingOssId: '123',
      date: '2026-05-27 14:18:52',
      channel: 'AI外呼',
      status: '4',
      statusLabel: '已完成',
      analysisStatus: '2',
      analysisStatusLabel: '已分析',
      hasSemanticAnalysis: true,
      sentiment: '负向' as const,
      summary: '用户质疑催收方式，暂不愿处理相关费用。',
      keywords: ['隐藏标签A', '隐藏标签B'],
      durationSeconds: 65,
      transcript: {
        turns,
      },
    },
  ],
});

describe('CommunicationLogContent', () => {
  beforeEach(() => {
    listOssByIdsMock.mockReset();
  });

  it('hides semantic keyword tags in communication records', () => {
    render(<CommunicationLogContent detail={buildDetail()} />);

    expect(screen.getByText('语义摘要：')).toBeTruthy();
    expect(screen.getByText('对话内容：')).toBeTruthy();
    expect(screen.queryByText('语义标签：')).toBeNull();
    expect(screen.queryByText('隐藏标签A')).toBeNull();
    expect(screen.queryByText('隐藏标签B')).toBeNull();
  });

  it('renders every transcript turn in long communication records', () => {
    render(
      <CommunicationLogContent
        detail={buildDetail([
          { speaker: 'assistant', content: '第 1 轮 AI 开场' },
          { speaker: 'user', content: '第 2 轮 用户回应' },
          { speaker: 'assistant', content: '第 3 轮 AI 追问' },
          { speaker: 'user', content: '第 4 轮 用户说明' },
          { speaker: 'assistant', content: '第 5 轮 AI 确认' },
          { speaker: 'user', content: '第 6 轮 用户补充' },
          { speaker: 'assistant', content: '第 7 轮 AI 结尾' },
        ])}
      />,
    );

    expect(screen.getByText('第 7 轮 AI 结尾')).toBeTruthy();
  });

  it('plays recording when a communication record has recording oss id', async () => {
    listOssByIdsMock.mockResolvedValue({
      data: [
        {
          ossId: '123',
          url: 'https://oss.lingchen-ai.com/recov/recordings/demo.wav',
        },
      ],
    });

    render(<CommunicationLogContent detail={buildDetail()} />);

    fireEvent.click(screen.getByLabelText('播放录音'));

    await waitFor(() => {
      expect(listOssByIdsMock).toHaveBeenCalledWith('123');
    });
    await waitFor(() => {
      expect(document.querySelector('audio')?.getAttribute('src')).toBe(
        'https://oss.lingchen-ai.com/recov/recordings/demo.wav',
      );
    });
  });

  it('keeps the modal body scrollable for long communication records', () => {
    render(
      <CommunicationLogModal open detail={buildDetail()} onClose={jest.fn()} />,
    );

    const modalBody = document.querySelector('.ant-modal-body') as HTMLElement;

    expect(modalBody.style.maxHeight).toBe('calc(90vh - 128px)');
    expect(modalBody.style.overflowY).toBe('auto');
  });
});
