import { ruoyiRequest } from '@/api/main';
import { getSiteConfig } from './service';

jest.mock('@/api/main', () => ({
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
