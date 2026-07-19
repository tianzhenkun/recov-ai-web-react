import { ruoyiRequest } from '@/api/main';
import {
  getAiCallDashboard,
  getAiCallDebtFeedbackPage,
  getAiCallDebtTimeline,
  getAiCallRecordPage,
} from './service';

jest.mock('@/api/main', () => ({
  ruoyiRequest: jest.fn(),
}));

const mockedRequest = ruoyiRequest as jest.Mock;

describe('intelligent outbound service', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({ code: 200, data: null });
  });

  it('loads the dashboard through the main API', async () => {
    await getAiCallDashboard();

    expect(mockedRequest).toHaveBeenCalledWith(
      '/system/recov/ai-call/dashboard',
      { method: 'get' },
    );
  });

  it('loads call records through the main API', async () => {
    const params = { pageNum: 2, pageSize: 20, status: '4' };

    await getAiCallRecordPage(params);

    expect(mockedRequest).toHaveBeenCalledWith(
      '/system/recov/ai-call/records/page',
      { method: 'get', params },
    );
  });

  it('loads debt feedback through the main API', async () => {
    const params = { pageNum: 1, pageSize: 10, feedbackType: 'positive' };

    await getAiCallDebtFeedbackPage(params);

    expect(mockedRequest).toHaveBeenCalledWith(
      '/system/recov/ai-call/feedback/debts/page',
      { method: 'get', params },
    );
  });

  it('encodes debt ids in timeline paths', async () => {
    await getAiCallDebtTimeline('debt 100');

    expect(mockedRequest).toHaveBeenCalledWith(
      '/system/recov/ai-call/debts/debt%20100/timeline',
      { method: 'get' },
    );
  });
});
