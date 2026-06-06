import { render, screen } from '@testing-library/react';
import * as React from 'react';
import type { OwnerCommunicationDetail } from './_shared';
import { CommunicationLogContent } from './CommunicationLogModal';

const buildDetail = (): OwnerCommunicationDetail => ({
  ownerName: '金阳',
  organization: '海珀澜庭',
  semanticSummary: '用户表示暂不方便处理费用。',
  logs: [
    {
      id: 'log-1',
      date: '2026-05-27 14:18:52',
      channel: 'AI外呼',
      status: '4',
      statusLabel: '已完成',
      analysisStatus: '2',
      analysisStatusLabel: '已分析',
      hasSemanticAnalysis: true,
      sentiment: '负向',
      summary: '用户质疑催收方式，暂不愿处理相关费用。',
      keywords: ['隐藏标签A', '隐藏标签B'],
      durationSeconds: 65,
      transcript: {
        turns: [
          {
            speaker: 'assistant',
            content: '您好，请问是金女士本人吗？',
          },
          {
            speaker: 'user',
            content: '后面。',
          },
        ],
      },
    },
  ],
});

describe('CommunicationLogContent', () => {
  it('hides semantic keyword tags in communication records', () => {
    render(<CommunicationLogContent detail={buildDetail()} />);

    expect(screen.getByText('语义摘要：')).toBeTruthy();
    expect(screen.getByText('对话内容：')).toBeTruthy();
    expect(screen.queryByText('语义标签：')).toBeNull();
    expect(screen.queryByText('隐藏标签A')).toBeNull();
    expect(screen.queryByText('隐藏标签B')).toBeNull();
  });
});
