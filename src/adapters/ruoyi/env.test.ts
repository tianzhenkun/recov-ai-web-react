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
