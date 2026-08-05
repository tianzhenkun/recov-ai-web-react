/**
 * @name umi 的路由配置
 * @description 只支持 path,component,routes,redirect,wrappers,name,icon 的配置
 * @param path  path 只支持两种占位符配置，第一种是动态参数 :id 的形式，第二种是 * 通配符，通配符只能出现路由字符串的最后。
 * @param component 配置 location 和 path 匹配后用于渲染的 React 组件路径。可以是绝对路径，也可以是相对路径，如果是相对路径，会从 src/pages 开始找起。
 * @param routes 配置子路由，通常在需要为多个路径增加 layout 组件时使用。
 * @param redirect 配置路由跳转
 * @param wrappers 配置路由组件的包装组件，通过包装组件可以为当前的路由组件组合进更多的功能。 比如，可以用于路由级别的权限校验
 * @param name 配置路由的标题，默认读取国际化文件 menu.ts 中 menu.xxxx 的值，如配置 name 为 login，则读取 menu.ts 中 menu.login 的取值作为标题
 * @param icon 配置路由的图标，取值参考 https://ant.design/components/icon-cn， 注意去除风格后缀和大小写，如想要配置图标为 <StepBackwardOutlined /> 则取值应为 stepBackward 或 StepBackward，如想要配置图标为 <UserOutlined /> 则取值应为 user 或者 User
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        path: '/user/login',
        name: 'login',
        component: './user/login',
      },
      {
        path: '/user',
        redirect: '/user/login',
      },
      {
        name: 'register-result',
        icon: 'checkCircle',
        path: '/user/register-result',
        component: './user/register-result',
      },
      {
        name: 'register',
        icon: 'userAdd',
        path: '/user/register',
        component: './user/register',
      },
      {
        name: '404',
        component: './exception/404',
        path: '/user/*',
      },
    ],
  },
  {
    path: '/welcome',
    name: 'welcome',
    icon: 'home',
    component: './Welcome',
  },
  {
    path: '/admin',
    name: 'admin',
    icon: 'crown',
    access: 'canAdmin',
    routes: [
      {
        path: '/admin',
        redirect: '/admin/sub-page',
      },
      {
        path: '/admin/sub-page',
        name: 'sub-page',
        component: './Admin',
      },
    ],
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    icon: 'dashboard',
    routes: [
      {
        path: '/dashboard',
        redirect: '/dashboard/analysis',
      },
      {
        name: 'analysis',
        icon: 'barChart',
        path: '/dashboard/analysis',
        component: './dashboard/analysis',
      },
      {
        name: 'monitor',
        icon: 'monitor',
        path: '/dashboard/monitor',
        component: './dashboard/monitor',
      },
      {
        name: 'workplace',
        icon: 'desktop',
        path: '/dashboard/workplace',
        component: './dashboard/workplace',
      },
    ],
  },
  {
    path: '/form',
    icon: 'form',
    name: 'form',
    routes: [
      {
        path: '/form',
        redirect: '/form/basic-form',
      },
      {
        name: 'basic-form',
        icon: 'form',
        path: '/form/basic-form',
        component: './form/basic-form',
      },
      {
        name: 'step-form',
        icon: 'orderedList',
        path: '/form/step-form',
        component: './form/step-form',
      },
      {
        name: 'advanced-form',
        icon: 'profile',
        path: '/form/advanced-form',
        component: './form/advanced-form',
      },
    ],
  },
  {
    path: '/list',
    icon: 'table',
    name: 'list',
    routes: [
      {
        path: '/list/search',
        name: 'search-list',
        component: './list/search',
        routes: [
          {
            path: '/list/search',
            redirect: '/list/search/articles',
          },
          {
            name: 'articles',
            icon: 'read',
            path: '/list/search/articles',
            component: './list/search/articles',
          },
          {
            name: 'projects',
            icon: 'project',
            path: '/list/search/projects',
            component: './list/search/projects',
          },
          {
            name: 'applications',
            icon: 'appstore',
            path: '/list/search/applications',
            component: './list/search/applications',
          },
        ],
      },
      {
        path: '/list',
        redirect: '/list/table-list',
      },
      {
        name: 'table-list',
        icon: 'table',
        path: '/list/table-list',
        component: './table-list',
      },
      {
        name: 'basic-list',
        icon: 'unorderedList',
        path: '/list/basic-list',
        component: './list/basic-list',
      },
      {
        name: 'card-list',
        icon: 'creditCard',
        path: '/list/card-list',
        component: './list/card-list',
      },
    ],
  },
  {
    path: '/profile',
    name: 'profile',
    icon: 'profile',
    routes: [
      {
        path: '/profile',
        redirect: '/profile/basic',
      },
      {
        name: 'basic',
        icon: 'idcard',
        path: '/profile/basic',
        component: './profile/basic',
      },
      {
        name: 'advanced',
        icon: 'crown',
        path: '/profile/advanced',
        component: './profile/advanced',
      },
    ],
  },
  {
    name: 'result',
    icon: 'checkCircle',
    path: '/result',
    routes: [
      {
        path: '/result',
        redirect: '/result/success',
      },
      {
        name: 'success',
        icon: 'checkCircle',
        path: '/result/success',
        component: './result/success',
      },
      {
        name: 'fail',
        icon: 'closeCircle',
        path: '/result/fail',
        component: './result/fail',
      },
    ],
  },
  {
    name: 'exception',
    icon: 'warning',
    path: '/exception',
    routes: [
      {
        path: '/exception',
        redirect: '/exception/403',
      },
      {
        name: '403',
        icon: 'stop',
        path: '/exception/403',
        component: './exception/403',
      },
      {
        name: '404',
        icon: 'warning',
        path: '/exception/404',
        component: './exception/404',
      },
      {
        name: '500',
        icon: 'bug',
        path: '/exception/500',
        component: './exception/500',
      },
    ],
  },
  {
    name: 'account',
    icon: 'user',
    path: '/account',
    routes: [
      {
        path: '/account',
        redirect: '/account/center',
      },
      {
        name: 'center',
        icon: 'user',
        path: '/account/center',
        component: './account/center',
      },
      {
        name: 'settings',
        icon: 'setting',
        path: '/account/settings',
        component: './account/settings',
      },
    ],
  },
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
        name: 'icp-modeling',
        icon: 'experiment',
        path: '/sales/icp-modeling',
        component: './sales/icp-modeling',
      },
    ],
  },
  {
    path: '/chatbot',
    name: 'chatbot',
    icon: 'robot',
    component: './chatbot',
  },
  {
    path: '/system/user',
    component: './ruoyi/system/user',
    hideInMenu: true,
  },
  {
    path: '/system/dept',
    component: './ruoyi/system/dept',
    hideInMenu: true,
  },
  {
    path: '/system/post',
    component: './ruoyi/system/post',
    hideInMenu: true,
  },
  {
    path: '/system/user-auth/role/:userId',
    component: './ruoyi/system/user-auth-role',
    hideInMenu: true,
  },
  {
    path: '/system/role',
    component: './ruoyi/system/role',
    hideInMenu: true,
  },
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
  {
    path: '/sys-conf/oss',
    component: './ruoyi/system/oss',
    hideInMenu: true,
  },
  {
    path: '/sys-conf/oss-config/index',
    component: './ruoyi/system/oss-config',
    hideInMenu: true,
  },
  {
    path: '/sys-conf/client',
    component: './ruoyi/system/client',
    hideInMenu: true,
  },
  {
    path: '/sys/recov-runtime-control',
    component: './ruoyi/system/recov-runtime-control',
    hideInMenu: true,
  },
  {
    path: '/index',
    component: './recov/dashboard',
    hideInMenu: true,
  },
  {
    path: '/datelligence',
    component: './recov/datelligence',
    hideInMenu: true,
  },
  {
    path: '/flow-events',
    component: './recov/flowEvents',
    hideInMenu: true,
  },
  {
    path: '/flow-manager',
    component: './recov/flow',
    hideInMenu: true,
  },
  {
    path: '/delivery',
    component: './recov/delivery',
    hideInMenu: true,
  },
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
  {
    path: '/sys/persona',
    component: './recov/persona',
    hideInMenu: true,
  },
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
  {
    path: '/sys/voice',
    component: './recov/voice',
    hideInMenu: true,
  },
  {
    path: '/sys/instrument-seal',
    component: './recov/seal',
    hideInMenu: true,
  },
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
  {
    path: '/sys/standing',
    component: './recov/standing',
    hideInMenu: true,
  },
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
  {
    path: '/sys/runtime',
    component: './recov/runtime',
    hideInMenu: true,
  },
  {
    path: '/sys/fee',
    component: './recov/fee',
    hideInMenu: true,
  },
  {
    path: '/sys/project',
    component: './recov/project',
    hideInMenu: true,
  },
  {
    path: '/sys/settle',
    component: './recov/settle',
    hideInMenu: true,
  },
  {
    path: '/sys/billing-sandbox',
    component: './recov/billingSandbox',
    hideInMenu: true,
  },
  {
    path: '/intelligent-outbound',
    component: './recov/intelligentOutbound',
    hideInMenu: true,
  },
  {
    path: '/agent-workbench',
    component: './agentWorkbench',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:agent:console',
  },
  {
    path: '/ai-call/agent-workbench',
    component: './agentWorkbench',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:agent:console',
  },
  {
    path: '/ai-call/agents',
    component: './agentWorkbench/admin/agents',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:agent:manage',
  },
  {
    path: '/ai-call/handoffs',
    component: './agentWorkbench/admin/handoffs',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:agent:manage',
  },
  {
    path: '/ai-call/follow-ups',
    component: './agentWorkbench/admin/followUps/processing',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:agent:console',
  },
  {
    path: '/ai-call/follow-up-overview',
    component: './agentWorkbench/admin/followUps/overview',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:agent:manage',
  },
  {
    path: '/ai-call-lab/customer',
    component: './aiCallLab/customer',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:lab:use',
  },
  {
    path: '/ai-call-lab/prompt-config',
    component: './aiCallLab/promptConfig',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:prompt:manage',
  },
  {
    path: '/ai-call/tasks',
    component: './aiCallTasks',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:agent:manage',
  },
  {
    path: '/ai-call/tasks/create',
    component: './aiCallTasks/create',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:agent:manage',
  },
  {
    path: '/ai-call/tasks/:taskId',
    component: './aiCallTasks/detail',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:agent:manage',
  },
  {
    path: '/ai-call/voices',
    component: './aiCallVoices',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:voice:manage',
  },
  {
    path: '/ai-call/records',
    component: './aiCallRecords',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:agent:manage',
  },
  {
    path: '/ai-call/statistics',
    component: './aiCallStatistics',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:agent:manage',
  },
  {
    path: '/ai-call/lines',
    component: './aiCallLines',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:agent:manage',
  },
  {
    path: '/ai-call/rules',
    component: './aiCallRules',
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:agent:manage',
  },
  {
    path: '/test11',
    component: './recov/lawyerCourt',
    hideInMenu: true,
  },
  {
    path: '/',
    component: './ruoyi/landing',
  },
  {
    component: './ruoyi/placeholder',
    path: '/*',
  },
];
