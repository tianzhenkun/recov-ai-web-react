import { render, screen } from '@testing-library/react';
import * as React from 'react';
import FeedbackAllDrawer from './FeedbackAllDrawer';
import { getAiCallDebtFeedbackPage } from './service';

jest.mock('./service', () => ({
  getAiCallDebtFeedbackPage: jest.fn(),
}));

const getAiCallDebtFeedbackPageMock = getAiCallDebtFeedbackPage as jest.Mock;

describe('FeedbackAllDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAiCallDebtFeedbackPageMock.mockResolvedValue({
      rows: [
        {
          debtId: 'debt-1',
          debtorName: '金阳',
          organization: '海珀澜庭',
          callSummary: '用户表示暂不方便沟通。',
          latestCallRecordId: 'call-1',
          latestFeedbackType: '负向',
          latestTags: ['隐藏标签A', '隐藏标签B'],
          latestStartedAt: '2026-05-27 14:17:47',
          latestFinishedAt: '2026-05-27 14:18:52',
          latestDurationSeconds: 65,
          feedbackRecordCount: 7,
        },
      ],
      total: 1,
    });
  });

  it('hides the semantic tag column in the full feedback drawer', async () => {
    render(
      <FeedbackAllDrawer open onClose={jest.fn()} onItemClick={jest.fn()} />,
    );

    expect(await screen.findByText('金阳')).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: '标签' })).toBeNull();
    expect(screen.queryByText('隐藏标签A')).toBeNull();
    expect(screen.queryByText('隐藏标签B')).toBeNull();
    expect(screen.getByText('负向')).toBeTruthy();
  });
});
