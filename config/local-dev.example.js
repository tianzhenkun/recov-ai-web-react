/**
 * 灵宸前端本地开发配置模板。
 *
 * 首次使用时复制为 config/local-dev.local.js；local 文件不会提交 Git。
 * portalScope 表示站点入口范围：平台控制台使用 PLATFORM，产品站点使用 PRODUCT。
 * productCode 必须与后端 sys_product.product_code 完全一致，不做大小写映射。
 * displayName 只用于本地启动日志，正式产品名称来自后端 /auth/site/config。
 * clientId 是每个站点独立的公开 OAuth 客户端标识，请按后端真实配置维护。
 * port 是本地前端开发服务器端口，可以在端口被占用时直接修改。
 */
module.exports = {
  schemaVersion: 1,

  // npm run dev 默认启动的站点。
  defaultProfile: 'recov',

  // 所有产品共用唯一主 Gateway；浏览器不直连 Product、Admin 或 Voice API。
  gateway: {
    path: '/dev-api',
    target: 'http://127.0.0.1:8080',
  },

  // 仅做页面启动验证时可以关闭。登录联调时必须与后端 api-decrypt 配置一致。
  // 开启后，rsaPublicKey 必须填写后端解密私钥对应的 2048 位以上 RSA 公钥。
  encryption: {
    enabled: false,
    rsaPublicKey: '',
  },

  profiles: {
    admin: {
      displayName: '平台控制台',
      // 平台入口不绑定产品编码。
      portalScope: 'PLATFORM',
      productCode: '',
      loginVariant: 'AUTO',
      // 当前可与产品站点相同，后端拆分 OAuth Client 后只修改本 profile。
      clientId: 'e5cd7e4891bf95d1d19206ce24a7b32e',
      port: 8000,
    },
    recov: {
      displayName: '智能催收',
      // 产品入口必须绑定与后端一致的小写产品编码。
      portalScope: 'PRODUCT',
      productCode: 'recov',
      loginVariant: 'AUTO',
      // 当前可与其他站点相同，未来可独立维护。
      clientId: 'e5cd7e4891bf95d1d19206ce24a7b32e',
      port: 8001,
    },
    sales: {
      displayName: 'AI 获客',
      // 产品入口必须绑定与后端一致的小写产品编码。
      portalScope: 'PRODUCT',
      productCode: 'sales',
      loginVariant: 'AUTO',
      // 当前可与其他站点相同，未来可独立维护。
      clientId: 'e5cd7e4891bf95d1d19206ce24a7b32e',
      port: 8002,
    },
  },
};
