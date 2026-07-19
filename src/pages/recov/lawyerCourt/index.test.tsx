import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import LawyerCourtPage from './index';
import { fetchLawyerCourtReviewPage } from './service';

const styles = readFileSync(join(__dirname, 'index.css'), 'utf8');

jest.mock('./service', () => {
  const actual = jest.requireActual('./service');
  return {
    ...actual,
    fetchLawyerCourtReviewPage: jest.fn(),
  };
});

const fetchLawyerCourtReviewPageMock = fetchLawyerCourtReviewPage as jest.Mock;

const matchedRow = {
  id: 'matched-1',
  lawyerId: 'lawyer-1',
  lawyerName: '接口陈律师',
  firm: '晨曦律所',
  region: '朝阳区',
  rating: 4.8,
  caseCount: 32,
  status: '已匹配',
  bio: '熟悉物业代开庭。',
  phone: '-',
  email: '-',
  caseNo: '(2026)京0105民初1001号',
  ownerName: '周建国',
  assetNo: 'A1-10001',
  city: '北京市',
  project: '恒大名都',
  amount: '12500',
};

const unmatchedRow = {
  id: 'unmatched-1',
  caseNo: '(2026)京0105民初2001号',
  ownerName: '沈秀兰',
  amount: '8900',
  region: '朝阳区',
  unmatchReason: '律师审核中，暂未进入匹配队列',
  assetNo: 'A1-20001',
  city: '北京市',
  project: '万科翡翠',
};

describe('LawyerCourtPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchLawyerCourtReviewPageMock.mockResolvedValue({
      rows: [matchedRow],
      total: 1,
    });
  });

  it('starts empty and requests the matched lawyer page by default', async () => {
    let resolvePage!: (value: {
      rows: (typeof matchedRow)[];
      total: number;
    }) => void;
    fetchLawyerCourtReviewPageMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePage = resolve;
      }),
    );

    render(React.createElement(LawyerCourtPage));

    expect(screen.getByText('需协作案件')).toBeTruthy();
    expect(screen.getByText('378个')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '已匹配律师' }).className,
    ).toContain('active');
    expect(screen.getByText('律师列表加载中...')).toBeTruthy();
    expect(screen.queryByText('接口陈律师')).toBeFalsy();
    expect(fetchLawyerCourtReviewPageMock).toHaveBeenCalledWith({
      tab: 'matched',
      pageNum: 1,
      pageSize: 10,
    });

    resolvePage({ rows: [matchedRow], total: 1 });

    expect(await screen.findByText('接口陈律师')).toBeTruthy();
    expect(screen.getAllByText('已匹配').length).toBeGreaterThan(0);
  });

  it('keeps export unmatched cases as a placeholder action', async () => {
    render(React.createElement(LawyerCourtPage));

    fireEvent.click(screen.getByRole('button', { name: '未匹配律师' }));
    fireEvent.click(screen.getByRole('button', { name: /导出未匹配案件/ }));

    expect(await screen.findByText('导出功能待接入')).toBeTruthy();
  });

  it('shows a simulated auto match confirmation', async () => {
    render(React.createElement(LawyerCourtPage));

    fireEvent.click(screen.getByRole('button', { name: /一键匹配律师/ }));
    fireEvent.click(await screen.findByRole('button', { name: '确认发起' }));

    expect(await screen.findByText('匹配任务已模拟发起')).toBeTruthy();
  });

  it('requests pending review lawyers when switching to unmatched tab', async () => {
    fetchLawyerCourtReviewPageMock.mockImplementation(({ tab }) =>
      Promise.resolve(
        tab === 'matched'
          ? { rows: [matchedRow], total: 1 }
          : { rows: [unmatchedRow], total: 1 },
      ),
    );

    render(React.createElement(LawyerCourtPage));

    expect(await screen.findByText('接口陈律师')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '未匹配律师' }));

    await waitFor(() => {
      expect(fetchLawyerCourtReviewPageMock).toHaveBeenLastCalledWith({
        tab: 'unmatched',
        pageNum: 1,
        pageSize: 10,
      });
    });
    expect(
      await screen.findByText(/律师审核中，暂未进入匹配队列/),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /一键撤诉/ })).toBeTruthy();
  });

  it('shows a withdraw confirmation for unmatched rows', async () => {
    fetchLawyerCourtReviewPageMock.mockImplementation(({ tab }) =>
      Promise.resolve(
        tab === 'matched'
          ? { rows: [matchedRow], total: 1 }
          : { rows: [unmatchedRow], total: 1 },
      ),
    );

    render(React.createElement(LawyerCourtPage));

    fireEvent.click(screen.getByRole('button', { name: '未匹配律师' }));
    fireEvent.click(await screen.findByRole('button', { name: /一键撤诉/ }));

    expect(
      (await screen.findAllByText(/确认撤诉该案件/)).length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '确认撤诉' }));

    expect(await screen.findByText('撤诉任务已模拟发起')).toBeTruthy();
  });

  it('paginates matched cases by requesting the next review page', async () => {
    const secondPageRow = {
      ...matchedRow,
      id: 'matched-11',
      lawyerName: '接口赵律师',
      caseNo: '(2026)沪0106民初7788号',
    };
    fetchLawyerCourtReviewPageMock.mockImplementation(({ pageNum }) =>
      Promise.resolve({
        rows: pageNum === 2 ? [secondPageRow] : [matchedRow],
        total: 11,
      }),
    );

    render(React.createElement(LawyerCourtPage));

    expect(await screen.findByText('接口陈律师')).toBeTruthy();
    expect(screen.getByText('当前显示1-10条')).toBeTruthy();
    expect(screen.queryByText('接口赵律师')).toBeFalsy();

    fireEvent.click(screen.getByRole('button', { name: '下一页' }));

    expect(await screen.findByText('接口赵律师')).toBeTruthy();
    expect(screen.getByText('当前显示11-11条')).toBeTruthy();
    expect(fetchLawyerCourtReviewPageMock).toHaveBeenLastCalledWith({
      tab: 'matched',
      pageNum: 2,
      pageSize: 10,
    });
  });

  it('keeps the footer pagination visible while only the case list scrolls', () => {
    expect(styles).toMatch(
      /\.lawyer-court-main-card\s*{[^}]*display: flex[^}]*flex-direction: column[^}]*overflow: hidden/s,
    );
    expect(styles).toMatch(
      /\.lawyer-court-list\s*{[^}]*flex: 1 1 0[^}]*min-height: 0[^}]*overflow-y: auto/s,
    );
    expect(styles).toMatch(/\.lawyer-court-pagination\s*{[^}]*flex: 0 0 auto/s);
  });
});
