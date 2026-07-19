export default [
  { path: '/index', component: './recov/dashboard', hideInMenu: true },
  {
    path: '/datelligence',
    component: './recov/datelligence',
    hideInMenu: true,
  },
  { path: '/flow-events', component: './recov/flowEvents', hideInMenu: true },
  { path: '/flow-manager', component: './recov/flow', hideInMenu: true },
  { path: '/delivery', component: './recov/delivery', hideInMenu: true },
  {
    path: '/instrument-list',
    component: './recov/instrument',
    hideInMenu: true,
  },
  {
    path: '/reconciliation',
    component: './recov/reconciliation',
    hideInMenu: true,
  },
  { path: '/sys/persona', component: './recov/persona', hideInMenu: true },
  {
    path: '/sys/collection-strategy',
    component: './recov/collectionStrategy',
    hideInMenu: true,
  },
  {
    path: '/recov/collectionStrategy/flow',
    component: './recov/collectionStrategy/flow',
    hideInMenu: true,
  },
  { path: '/sys/voice', component: './recov/voice', hideInMenu: true },
  { path: '/sys/instrument-seal', component: './recov/seal', hideInMenu: true },
  {
    path: '/sys/instrument-standing',
    component: './recov/standing',
    hideInMenu: true,
  },
  {
    path: '/sys/instrument-template',
    component: './recov/instrumentTemplate',
    hideInMenu: true,
  },
  { path: '/sys/standing', component: './recov/standing', hideInMenu: true },
  {
    path: '/sys/delivery-strategy',
    component: './recov/deliveryStrategy',
    hideInMenu: true,
  },
  {
    path: '/sys/litigation',
    component: './recov/litigationStrategy',
    hideInMenu: true,
  },
  {
    path: '/litigation-process',
    component: './recov/litigationProcess',
    hideInMenu: true,
  },
  { path: '/sys/runtime', component: './recov/runtime', hideInMenu: true },
  { path: '/sys/fee', component: './recov/fee', hideInMenu: true },
  { path: '/sys/project', component: './recov/project', hideInMenu: true },
  { path: '/sys/settle', component: './recov/settle', hideInMenu: true },
  {
    path: '/sys/recov-runtime-control',
    component: './ruoyi/system/recov-runtime-control',
    hideInMenu: true,
  },
  {
    path: '/intelligent-outbound',
    component: './recov/intelligentOutbound',
    hideInMenu: true,
  },
];
