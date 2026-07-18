import { ruoyiRequest } from '@/adapters/ruoyi/request';
import {
  getCurrentProfile,
  updateCurrentPassword,
  updateCurrentProfile,
  uploadCurrentAvatar,
} from './profile';

jest.mock('@/adapters/ruoyi/request', () => ({
  ruoyiRequest: jest.fn(),
}));

const mockedRequest = ruoyiRequest as jest.Mock;

describe('current user profile service', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({ code: 200, data: {} });
  });

  it('loads the current authenticated profile', async () => {
    await getCurrentProfile();

    expect(mockedRequest).toHaveBeenCalledWith('/system/user/profile', {
      method: 'get',
    });
  });

  it('updates only editable profile fields', async () => {
    await updateCurrentProfile({
      nickName: '测试用户',
      email: 'user@example.com',
      phonenumber: '13800138000',
      sex: '2',
    });

    expect(mockedRequest).toHaveBeenCalledWith('/system/user/profile', {
      method: 'put',
      data: {
        nickName: '测试用户',
        email: 'user@example.com',
        phonenumber: '13800138000',
        sex: '2',
      },
    });
  });

  it('encrypts the password update payload', async () => {
    await updateCurrentPassword({
      oldPassword: 'old-password',
      newPassword: 'new-password',
    });

    expect(mockedRequest).toHaveBeenCalledWith(
      '/system/user/profile/updatePwd',
      expect.objectContaining({
        method: 'put',
        headers: expect.objectContaining({
          isEncrypt: true,
          repeatSubmit: false,
        }),
      }),
    );
  });

  it('uploads an avatar with the backend field name', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    await uploadCurrentAvatar(file);

    const [url, options] = mockedRequest.mock.calls[0];
    expect(url).toBe('/system/user/profile/avatar');
    expect(options.method).toBe('post');
    expect(options.headers.repeatSubmit).toBe(false);
    expect(options.data).toBeInstanceOf(FormData);
    expect(options.data.get('avatarfile')).toBe(file);
  });
});
