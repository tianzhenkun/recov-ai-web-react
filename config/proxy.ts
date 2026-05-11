/**
 * @name 代理的配置
 * @see 在生产环境代理无法生效，所以这里只配置开发、测试和预发环境。
 *
 * @doc https://umijs.org/docs/guides/proxy
 */

const baseApi = process.env.UMI_APP_BASE_API || '/dev-api';
const adminApi = process.env.UMI_APP_ADMIN_API || '/admin-api';
const apiTarget = process.env.UMI_APP_API_TARGET || 'http://127.0.0.1:8080';
const adminTarget = process.env.UMI_APP_ADMIN_TARGET || apiTarget;

const createProxy = () => ({
  [baseApi]: {
    target: apiTarget,
    changeOrigin: true,
    ws: true,
    pathRewrite: { [`^${baseApi}`]: '' },
  },
  [adminApi]: {
    target: adminTarget,
    changeOrigin: true,
    ws: true,
    pathRewrite: { [`^${adminApi}`]: '' },
  },
});

export default {
  dev: createProxy(),
  test: createProxy(),
  pre: createProxy(),
};
