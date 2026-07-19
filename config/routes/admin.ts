export default [
  { path: '/system/user', component: './ruoyi/system/user', hideInMenu: true },
  { path: '/system/dept', component: './ruoyi/system/dept', hideInMenu: true },
  { path: '/system/post', component: './ruoyi/system/post', hideInMenu: true },
  {
    path: '/system/user-auth/role/:userId',
    component: './ruoyi/system/user-auth-role',
    hideInMenu: true,
  },
  { path: '/system/role', component: './ruoyi/system/role', hideInMenu: true },
  {
    path: '/system/role-auth/user/:roleId',
    component: './ruoyi/system/role-auth-user',
    hideInMenu: true,
  },
  {
    path: '/system/log/operlog',
    component: './ruoyi/monitor/operlog',
    hideInMenu: true,
  },
  {
    path: '/system/log/logininfor',
    component: './ruoyi/monitor/logininfor',
    hideInMenu: true,
  },
  {
    path: '/monitor/online',
    component: './ruoyi/monitor/online',
    hideInMenu: true,
  },
  {
    path: '/monitor/cache',
    component: './ruoyi/monitor/cache',
    hideInMenu: true,
  },
  {
    path: '/system/notice',
    component: './ruoyi/system/notice',
    hideInMenu: true,
  },
  {
    path: '/sys-conf/menu',
    component: './ruoyi/system/menu',
    hideInMenu: true,
  },
  {
    path: '/sys-conf/dict',
    component: './ruoyi/system/dict',
    hideInMenu: true,
  },
  {
    path: '/sys-conf/tenant/tenant',
    component: './ruoyi/system/tenant',
    hideInMenu: true,
  },
  {
    path: '/sys-conf/tenant/tenantPackage',
    component: './ruoyi/system/tenant-package',
    hideInMenu: true,
  },
  {
    path: '/sys-conf/dict-data/index/:dictId',
    component: './ruoyi/system/dict-data',
    hideInMenu: true,
  },
  {
    path: '/sys-conf/config',
    component: './ruoyi/system/config',
    hideInMenu: true,
  },
  { path: '/sys-conf/oss', component: './ruoyi/system/oss', hideInMenu: true },
  {
    path: '/sys-conf/integrations',
    component: './ruoyi/system/integration-center',
    hideInMenu: true,
    access: 'isSuperAdmin',
  },
  {
    path: '/sys-conf/oss-config/index',
    component: './ruoyi/system/oss-config',
    hideInMenu: true,
    access: 'isSuperAdmin',
  },
  {
    path: '/sys-conf/oauth-providers',
    component: './ruoyi/system/oauth-provider-config',
    hideInMenu: true,
    access: 'canManageOAuthIntegration',
  },
  {
    path: '/sys-conf/products',
    component: './ruoyi/system/product',
    hideInMenu: true,
  },
  {
    path: '/sys-conf/license-management',
    component: './ruoyi/system/license-management',
    hideInMenu: true,
  },
  {
    path: '/sys-conf/client',
    component: './ruoyi/system/client',
    hideInMenu: true,
  },
];
