describe('menu workspace defaults', () => {
  const originalWorkspaceNames = process.env.UMI_APP_MENU_WORKSPACE_NAMES;

  afterEach(() => {
    if (originalWorkspaceNames === undefined) {
      delete process.env.UMI_APP_MENU_WORKSPACE_NAMES;
    } else {
      process.env.UMI_APP_MENU_WORKSPACE_NAMES = originalWorkspaceNames;
    }
    jest.resetModules();
  });

  it('uses entitlement, admin and system centers as peer workspaces', () => {
    delete process.env.UMI_APP_MENU_WORKSPACE_NAMES;

    jest.isolateModules(() => {
      const { getMenuWorkspaceNames } = require('./env');

      expect(getMenuWorkspaceNames()).toEqual([
        '权益中心',
        '后台管理',
        '系统管理',
      ]);
    });
  });
});

describe('optional product api channel', () => {
  const originalProductApi = process.env.UMI_APP_PRODUCT_API;
  const originalAdminApi = process.env.UMI_APP_ADMIN_API;

  afterEach(() => {
    if (originalProductApi === undefined) {
      delete process.env.UMI_APP_PRODUCT_API;
    } else {
      process.env.UMI_APP_PRODUCT_API = originalProductApi;
    }
    if (originalAdminApi === undefined) {
      delete process.env.UMI_APP_ADMIN_API;
    } else {
      process.env.UMI_APP_ADMIN_API = originalAdminApi;
    }
    jest.resetModules();
  });

  it('fails clearly instead of accidentally sending product calls to the site root', () => {
    process.env.UMI_APP_PRODUCT_API = '';
    process.env.UMI_APP_ADMIN_API = '';

    jest.isolateModules(() => {
      const { requireProductApi } = require('./env');
      expect(() => requireProductApi()).toThrow(
        '当前站点未配置 Product API 通道',
      );
    });
  });
});
