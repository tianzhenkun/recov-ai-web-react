import { render, screen } from '@testing-library/react';
import React from 'react';
import type { FeedbackItem } from './_shared';
import FeedbackFeed from './FeedbackFeed';

const buildFeedbackItem = (index: number): FeedbackItem => ({
  id: `feedback-${index}`,
  callRecordId: `call-${index}`,
  debtId: `debt-${index}`,
  ownerName: `业主 ${index}`,
  project: '海珀澜庭',
  summary:
    '客户反馈需要再次确认还款计划，并希望客服在约定时间后再联系，当前摘要内容较长用于验证卡片高度上限。',
  sentiment: 'negative',
  feedbackType: '承诺还款',
  semanticTags: ['承诺还款', '需要回访', '情绪波动', '长标签内容'],
  startedAt: '2026-05-31 10:00:00',
  startTime: '2026-05-31 10:00:00',
  endTime: '2026-05-31 10:03:00',
  durationSeconds: 180,
  feedbackRecordCount: 7,
});

describe('FeedbackFeed', () => {
  it('uses the shared Ant Design empty state when there is no feedback', () => {
    render(<FeedbackFeed items={[]} onItemClick={jest.fn()} />);

    expect(screen.getByText('暂无用户反馈')).toBeTruthy();
    expect(document.querySelector('.ant-empty')).toBeTruthy();
  });

  it('keeps feedback cards equal height while filling the right feed area', () => {
    render(
      <FeedbackFeed
        items={Array.from({ length: 5 }, (_, index) =>
          buildFeedbackItem(index + 1),
        )}
        pageSize={5}
        onItemClick={jest.fn()}
      />,
    );

    const firstCard = screen.getByText('业主 1').closest('button');
    const feed = firstCard?.parentElement;
    const summary = screen
      .getAllByText(/客户反馈需要再次确认还款计划/)[0]
      .closest('.ant-typography') as HTMLElement | null;

    expect(feed?.className).toContain('grid');
    expect(feed?.className).toContain('overflow-hidden');
    expect(feed?.style.gridTemplateRows).toBe('repeat(5, minmax(0, 1fr))');
    expect(firstCard).toBeTruthy();
    expect(firstCard?.style.maxHeight).toBe('');
    expect(firstCard?.style.overflow).toBe('hidden');
    expect(firstCard?.className).toContain('h-full');
    expect(firstCard?.className).toContain('min-h-0');
    expect(summary?.className).toContain('feedback-summary-clamp');
    expect(summary?.style.getPropertyValue('--feedback-summary-lines')).toBe(
      '2',
    );
  });

  it('keeps a single feedback card at the normal page row height', () => {
    render(
      <FeedbackFeed
        items={[buildFeedbackItem(1)]}
        pageSize={5}
        onItemClick={jest.fn()}
      />,
    );

    const firstCard = screen.getByText('业主 1').closest('button');
    const feed = firstCard?.parentElement;

    expect(feed?.style.gridTemplateRows).toBe('repeat(5, minmax(0, 1fr))');
  });

  it('hides semantic tags while keeping the feedback tendency tag', () => {
    render(
      <FeedbackFeed items={[buildFeedbackItem(1)]} onItemClick={jest.fn()} />,
    );

    const hiddenSemanticTag = screen.getByText('需要回访');
    const hiddenSemanticTagRow = hiddenSemanticTag.closest(
      '[data-testid="feedback-semantic-tags-placeholder"]',
    ) as HTMLElement | null;

    expect(screen.getAllByText('承诺还款').length).toBeGreaterThan(0);
    expect(hiddenSemanticTagRow).toBeTruthy();
    expect(hiddenSemanticTagRow?.style.visibility).toBe('hidden');
    expect(hiddenSemanticTagRow?.style.pointerEvents).toBe('none');
  });

  it('hides feedback count in the card header', () => {
    render(
      <FeedbackFeed items={[buildFeedbackItem(1)]} onItemClick={jest.fn()} />,
    );

    expect(screen.queryByText('共 7 次反馈')).toBeNull();
  });

  it('shows the full feedback time without the narrow width clamp', () => {
    render(
      <FeedbackFeed items={[buildFeedbackItem(1)]} onItemClick={jest.fn()} />,
    );

    const feedbackTime = screen.getByText('2026-05-31 10:00:00');
    const timeContainer = feedbackTime.parentElement as HTMLElement | null;

    expect(feedbackTime).toBeTruthy();
    expect(timeContainer?.className).not.toContain('max-w-[136px]');
    expect(timeContainer?.className).toContain('min-w-max');
  });

  it('keeps the original tag row spacing when semantic tags are hidden', () => {
    render(
      <FeedbackFeed items={[buildFeedbackItem(1)]} onItemClick={jest.fn()} />,
    );

    const firstCard = screen.getByText('业主 1').closest('button');
    const placeholder = firstCard?.querySelector(
      '[data-testid="feedback-semantic-tags-placeholder"]',
    ) as HTMLElement | null;

    expect(placeholder).toBeTruthy();
    expect(placeholder?.className).toContain('mt-auto');
    expect(placeholder?.firstElementChild?.className).toContain('items-center');
    expect(placeholder?.style.visibility).toBe('hidden');
  });
});
