export default [
  {
    path: '/sales',
    name: 'sales',
    icon: 'team',
    hideInMenu: true,
    routes: [
      {
        path: '/sales',
        redirect: '/sales/dashboard',
      },
      {
        name: 'overview',
        icon: 'barChart',
        path: '/sales/dashboard',
        component: './sales/dashboard',
        hideInMenu: true,
      },
      {
        name: 'source-coverage',
        icon: 'global',
        path: '/sales/source-coverage',
        component: './sales/source-coverage',
      },
      {
        name: 'provider-settings',
        icon: 'api',
        path: '/sales/provider-settings',
        component: './sales/provider-settings',
      },
      {
        name: 'icp-modeling',
        icon: 'experiment',
        path: '/sales/icp-modeling',
        component: './sales/icp-modeling',
      },
      {
        name: 'icp-attrs',
        icon: 'setting',
        path: '/sales/icp-attrs',
        component: './sales/icp-attrs',
      },
      {
        name: 'leads',
        icon: 'profile',
        path: '/sales/leads',
        component: './sales/leads',
      },
      {
        name: 'email-outreach',
        icon: 'mail',
        path: '/sales/email-outreach',
        component: './sales/email-outreach',
      },
    ],
  },
];
