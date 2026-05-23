import type { Request, Response } from 'express';

const baseApi = process.env.UMI_APP_BASE_API || '/dev-api';

const ok = <T>(data: T, msg = '操作成功') => ({
  code: 200,
  msg,
  data,
});

export default {
  [`GET ${baseApi}/auth/code`]: (_req: Request, res: Response) => {
    res.send(
      ok({
        captchaEnabled: false,
      }),
    );
  },

  [`GET ${baseApi}/auth/tenant/list`]: (_req: Request, res: Response) => {
    res.send(
      ok({
        tenantEnabled: true,
        voList: [
          {
            companyName: '演示租户',
            domain: null,
            tenantId: '000000',
          },
        ],
      }),
    );
  },

  [`POST ${baseApi}/auth/login`]: (_req: Request, res: Response) => {
    res.send(
      ok({
        access_token: 'mock-access-token',
      }),
    );
  },

  [`POST ${baseApi}/auth/logout`]: (_req: Request, res: Response) => {
    res.send(ok({}));
  },

  [`GET ${baseApi}/system/user/getInfo`]: (_req: Request, res: Response) => {
    res.send(
      ok({
        user: {
          userId: 1,
          userName: 'admin',
          nickName: '管理员',
          avatar:
            'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
          email: 'admin@example.com',
          phonenumber: '18800000000',
        },
        roles: ['admin'],
        permissions: ['*:*:*'],
      }),
    );
  },

  [`GET ${baseApi}/system/menu/getRouters`]: (_req: Request, res: Response) => {
    res.send(
      ok([
        {
          name: 'Recov',
          path: '/',
          component: 'Layout',
          redirect: '/index',
          meta: {
            title: '业务工作台',
            icon: 'dashboard',
          },
          children: [
            {
              name: 'Dashboard',
              path: 'index',
              component: 'recov/dashboard/index',
              meta: {
                title: '首页',
                icon: 'dashboard',
              },
            },
            {
              name: 'Datelligence',
              path: 'datelligence',
              component: 'recov/datelligence/index',
              meta: {
                title: '智能数据',
                icon: 'database',
              },
            },
          ],
        },
      ]),
    );
  },
};
