import { request as umiRequest } from '@umijs/max';
import { showRuoyiError } from './message';
import { ruoyiRequest } from './request';

jest.mock('@umijs/max', () => ({
  history: {
    location: { hash: '', pathname: '/system/user', search: '' },
    replace: jest.fn(),
  },
  request: jest.fn(),
}));

jest.mock('./message', () => ({
  showRuoyiError: jest.fn(),
}));

const mockUmiRequest = umiRequest as jest.Mock;
const mockShowRuoyiError = showRuoyiError as jest.Mock;

describe('ruoyiRequest', () => {
  beforeEach(() => {
    mockUmiRequest.mockReset();
    mockShowRuoyiError.mockReset();
  });

  it('surfaces the RuoYi message from non-2xx response envelopes', async () => {
    mockUmiRequest.mockRejectedValueOnce({
      response: {
        status: 503,
        data: {
          code: -1,
          msg: '服务暂时不可用',
          data: null,
        },
      },
    });

    await expect(
      ruoyiRequest('/system/user/list', {
        baseApi: '/dev-api',
        method: 'get',
      }),
    ).rejects.toMatchObject({
      message: '服务暂时不可用',
    });

    expect(mockUmiRequest.mock.calls[0][1]).toMatchObject({
      skipErrorHandler: true,
    });
    expect(mockShowRuoyiError).toHaveBeenCalledWith('服务暂时不可用');
  });
});
