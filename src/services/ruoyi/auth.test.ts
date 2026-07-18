import { ruoyiRequest } from '@/adapters/ruoyi/request';
import { getSiteConfig } from './auth';

jest.mock('@/adapters/ruoyi/request', () => ({
  ruoyiRequest: jest.fn(),
}));

describe('auth site config', () => {
  it('loads the anonymous server-canonical site contract', async () => {
    await getSiteConfig();

    expect(ruoyiRequest).toHaveBeenCalledWith('/auth/site/config', {
      method: 'get',
      headers: {
        isToken: false,
      },
    });
  });
});
