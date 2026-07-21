# 灵辰多产品前端

本项目基于 React、Ant Design Pro 和 Umi Max，使用一套源码承载平台控制台、Recov、Sales 和 Billing 等前端能力，并生成一份可复用的 `dist/` 构建产物。

产品编码、登录布局、租户模式、页面模块、API、路由、菜单、权限、品牌主题和部署拓扑是相互独立的维度，不通过源码目录建立一一对应关系。Billing 等共享能力可以存在于同一份构建产物中，实际展示和可用性由后端菜单、权限、许可证和接口共同控制。

## 1. 本地启动

### 1.1 环境要求

- Node.js 20 或更高版本
- npm
- 可访问的主 Gateway；仅检查页面启动时可以暂不运行后端

安装依赖：

```bash
npm install
```

### 1.2 本地配置

首次运行时复制配置模板：

```bash
cp config/local-dev.example.js config/local-dev.local.js
```

`config/local-dev.local.js` 是本机配置文件，已被 Git 忽略。配置内容包括：

- 主 Gateway 的浏览器同源路径和本地目标 Origin；
- API 请求加密开关和 RSA 请求公钥；
- Admin、Recov、Sales 的入口范围、产品编码、登录布局覆盖、`clientId` 和开发端口；
- `npm run dev` 使用的默认 profile。

默认 profile 如下：

| Profile | 入口范围 | 产品编码 | 默认端口 | 用途 |
| --- | --- | --- | ---: | --- |
| `admin` | `PLATFORM` | 空字符串 | 8000 | 跨租户全局配置平台 |
| `recov` | `PRODUCT` | `recov` | 8001 | Recov 业务站点 |
| `sales` | `PRODUCT` | `sales` | 8002 | Sales 业务站点 |

`portalScope` 是每个 profile 的必填字段。profile 名称只是本地启动别名，不参与入口身份判断；`PLATFORM` 的 `productCode` 必须为空，`PRODUCT` 必须填写与后端 `sys_product.product_code` 完全一致的小写产品编码，不做前后端映射。端口被占用时直接修改对应 profile 的 `port`。

每个 profile 独立维护 `clientId`。当前配置允许多个站点使用相同值；后端为某个站点拆分 OAuth Client 时，只修改该 profile，不建立顶层默认值或继承关系。

仅检查页面启动时可以关闭请求加密。登录联调时，`encryption.enabled` 必须与后端 `api-decrypt` 配置一致；开启后，`rsaPublicKey` 必须填写与后端解密私钥配对、至少 2048 位的 Base64 DER SPKI RSA 公钥。前端配置不得保存 RSA 私钥。

### 1.3 启动命令

```bash
npm run dev          # 使用 defaultProfile
npm run dev:admin    # 平台控制台
npm run dev:recov    # Recov
npm run dev:sales    # Sales
```

启动脚本负责读取并校验本地配置、检查所选端口，再调用 Umi Max 开发服务器。Umi Max 提供路由、构建、开发服务器和应用运行时能力，不是独立业务服务。

本项目没有交互式配置向导、运行时 Mock 启动模式或 pre/test 多环境启动命令。Jest mock 只用于单元测试隔离，不参与开发和生产运行。

### 1.4 验证与构建

```bash
npm run lint
npm test -- --runInBand
npx antd lint ./src
npm run build
```

- `npm run lint` 执行 Biome 和 TypeScript 检查。
- `npm test -- --runInBand` 串行执行 Jest 测试。
- `npx antd lint ./src` 检查 Ant Design 组件使用。
- `npm run build` 生成生产 `dist/`，不启动部署服务。

## 2. 目录说明

```text
config/
  config.ts                 Umi 配置入口
  proxy.ts                  本地开发 Gateway 代理
  routes.ts                 路由聚合入口
  routes/
    public.ts               登录、异常、账户和全局承接路由
    admin.ts                公共平台管理路由
    recov.ts                Recov 路由
    sales.ts                Sales 路由
    billing.ts              Billing 租户侧与平台运营路由
  local-dev.example.js      本地开发配置模板

scripts/
  start-local.js            本地 profile 校验和开发服务器启动器

src/
  api/
    main.ts                 唯一主 API
    runtimeConfig.ts        浏览器运行时配置解析
  app/
    access/                 Umi 权限入口的真实实现
    auth/                   登录、站点配置和认证服务
    menu/                   后端菜单服务
    shell/                  全局壳层和承接页面
    extensions/             模块级全局扩展注册点
  branding/                 公共品牌基线和站点品牌解析
  login-layouts/            登录控制器、布局目录和注册表
  modules/
    admin/                  公共平台管理能力
    recov/                  Recov 页面、组件、服务和扩展
    sales/                  Sales 页面和服务
    billing/                Billing 租户侧与平台运营能力
  pages/                    Umi 路由薄入口及少量公共页面
  shared/                   跨模块稳定类型和共享平台服务
  site-profiles/            服务端站点配置解析边界
```

`src/modules/admin` 表示平台管理业务，不表示管理员角色。业务页面的真实实现放在所属模块中，`src/pages` 只提供 Umi 路由入口或承接公共页面。

`src/services/ruoyi` 是分阶段迁移期间的兼容导出层。业务实现不继续写入该目录，新代码直接引用所属模块服务、`src/app`、`src/shared` 或 `src/api/main.ts`。

## 3. 开发规范与约束

### 3.1 产品、模块与构建边界

- 一个产品可以复用已有登录布局，一个登录布局也可以服务多个产品。
- 产品编码不决定源码目录、API 通道、菜单、权限、品牌主题或构建产物。
- 复用现有页面能力的产品不需要独立前端目录，也不需要单独构建。
- 产品具有独立页面能力时，代码放入 `src/modules/<product>`，路由放入 `config/routes/<product>.ts`，Umi 薄入口放入 `src/pages`。
- 模块级全局扩展通过 `src/app/extensions` 注册，不在应用入口中散落产品判断。

### 3.2 路由、菜单与权限

- 静态路由由 `config/routes/*.ts` 分模块维护，并由 `config/routes.ts` 聚合。
- 菜单以 `GET /system/menu/getRouters` 返回结果为准，前端不补造业务菜单或子菜单。
- 普通业务页面必须存在于后端返回的原始完整授权路由树中，`hidden` 路由也必须显式返回。
- 授权路由加载失败时采用 fail-closed，页面不提前渲染；路径不在授权树中时显示 403。
- `hideInMenu` 和后端 `activeMenu` 只控制菜单展示与高亮，不授予页面权限。
- Umi `access` 只能进一步收紧敏感页面，不能绕过后端授权路由树。
- 按钮权限码和后端接口鉴权分别执行，后端是最终安全边界。

### 3.3 API

浏览器业务请求统一使用 `src/api/main.ts`，经主 Gateway 转发。页面和模块只传后端业务路径，不保存后端机器地址，也不按产品、管理员或业务类型预建 API 通道。

正式运行时可能包含遗留兼容字段 `adminApi`，前端只解析该字段，不将其作为业务请求通道。Recov 智能外呼的数据查询和 `/sys/voice` 业务配置同样通过主 API，不依赖 Voice 直连服务。

只有主 Gateway 被证明无法承接某个 upstream 时，才由明确的所有者模块设计直连 API，并同时落实：

1. 同源反向代理路径和运行时配置校验；
2. 认证、401、审计、错误和敏感信息契约；
3. 本地 Proxy、Web/Nginx upstream 和 release manifest；
4. 安装前检查、测试和部署验证。

仅在浏览器配置中增加一个地址不构成可交付的直连能力。

### 3.4 登录布局

登录布局只负责展示差异，验证码、站点配置、租户选择、登录、Token、重定向和错误处理统一复用 `src/login-layouts/controller.ts`。

布局扩展遵循以下注册流程：

1. 在 `src/login-layouts/<variant>` 实现 `LoginLayoutProps`；
2. 在 `src/login-layouts/catalog.json` 声明布局编码和名称；
3. 在 `src/login-layouts/registry.ts` 注册懒加载组件；
4. 运行 catalog 与 registry 一致性测试；
5. 由服务端站点配置返回对应 `loginVariant`。

布局编码必须符合 `^[a-z][a-z0-9-]{0,63}$`。`AUTO` 和 `auto` 是本地选择逻辑的保留值，不能作为布局编码。

### 3.5 质量要求

- 使用 Biome，不引入 ESLint 或 Prettier。
- TypeScript 保持严格类型检查。
- Ant Design 组件用法以项目版本和官方接口为准。
- `bigint` 或业务 ID 按字符串处理，避免 JavaScript 数字精度损失。
- 页面中不保存私钥、Token、密码、后端 Secret 或可信产品编码。
- 每批结构调整后执行 Jest、TypeScript、Biome、Ant Design lint、生产构建和 CodeGraph 同步。

## 4. 部署说明

### 4.1 构建产物

前端源码只生成一份 `dist/`。正式发布将 `dist/` 固化进 Web Docker 镜像，同一镜像通过不同站点配置服务平台控制台、Recov、Sales 或其他产品站点，不因域名、Logo、登录布局、租户模式、端口或 TLS 证书不同而重新组织源码目录。

普通 `npm run build` 只生成待部署静态产物，不包含可直接使用的生产站点配置。生产运行所需的 `runtime-config.js` 和同源代理配置由受信部署流程生成。

### 4.2 站点配置

匿名站点接口 `GET /auth/site/config` 返回：

```ts
type SiteConfig = {
  portalScope: 'PLATFORM' | 'PRODUCT';
  productCode?: string;
  productName?: string;
  loginVariant: string;
  tenantMode: 'SELECTABLE' | 'FIXED';
};
```

- `PLATFORM` 站点不绑定产品编码，必须使用 `FIXED` 租户模式；登录页不加载租户列表，也不提交 `tenantId`。
- `PRODUCT` 站点必须返回规范的小写产品编码，可以使用 `SELECTABLE` 或 `FIXED` 租户模式。
- `SELECTABLE` 站点加载并显示租户列表。
- `FIXED` 站点不由浏览器提交 `tenantId`，Auth 使用服务端解析的标准租户；服务端固定租户不暴露给浏览器。
- 未注册的 `loginVariant` 会显示站点配置错误，不静默回退到其他产品布局。
- `clientId` 来自浏览器公开运行时配置，Auth 校验它与当前入口站点的匹配关系。

### 4.3 runtime-config.js

生产页面在应用脚本执行前同步加载 `runtime-config.js`。运行时公开字段包括：

| 字段 | 作用 |
| --- | --- |
| `schemaVersion` | 配置契约版本 |
| `baseApi` | 主 Gateway 同源路径 |
| `adminApi` | 遗留兼容字段，业务请求忽略 |
| `ssePath` | SSE 同源路径 |
| `clientId` | Web OAuth 客户端标识 |
| `encrypt` | 请求加密开关 |
| `requestRsaPublicKey` | 请求加密使用的 RSA 公钥 |

`baseApi`、`adminApi` 和 `ssePath` 必须是安全的同源绝对路径，不能使用站点根路径或后端绝对地址。路径冲突、字段未知、配置缺失或加密契约不完整时，前端拒绝建立生产请求链路。

以下内容不得写入 `runtime-config.js`：

- `tenantId` 或可信产品编码；
- RSA 私钥、密码、Token 和后端 Secret；
- 内网后端绝对地址；
- 本地登录布局覆盖。

### 4.4 产品上下文与安全边界

- `X-Lingchen-Portal-Scope`、`X-Lingchen-Product-Code` 和 `clientid` 由受信 Web 代理覆盖，浏览器参数不能作为可信站点身份。
- 产品、租户套餐、权限和许可证由后端校验。
- 浏览器只访问同源 API 路径，真实 upstream 保存在 Web/Nginx 服务端配置中。
- 生产构建不继承本机 API、`clientId`、RSA、登录布局或菜单分组配置。

### 4.5 域名、IP、端口与 HTTPS

- 有域名时，域名绑定到对应站点；TLS 可以由 release 管理的 Web/Nginx 终止，也可以由客户已有的外部网关终止后转发到 Web。
- 没有域名时，可以通过服务器 IP 和站点外部端口访问。IP 入口仍必须明确归属某个平台或产品站点；无法确定入口归属或缺少受信 `portalScope` 时必须拒绝访问，绝不能默认按 `PLATFORM` 处理。
- 站点外部端口属于部署配置，默认值可以在端口冲突时调整，不进入前端构建产物。
- HTTP 与 HTTPS 都使用同源 API 路径，切换 TLS 终止方式不需要重新构建前端。
- DNS、证书 SAN、防火墙、安全组和客户端信任链由部署工具与运维负责。

### 4.6 release 边界

前端仓库定义页面、运行时配置和站点契约；正式镜像、容器数量、站点数量、端口分配、Nginx 渲染、TLS Secret、健康检查和安装流程由 `lingchen-release` 管理。

同一份 Web 镜像可以按站点配置运行一个或多个实例。`single-host` 和 `split-web` 表示部署角色的放置方式，不决定前端源码目录，也不改变产品、登录布局、路由、菜单和权限之间的关系。具体编排能力以 `lingchen-release` 的发布清单、校验器和安装器为准，不能仅根据前端具备多站点配置能力推断正式安装器支持某种拓扑。

### 4.7 更新边界

| 变更 | 是否需要修改前端源码 |
| --- | --- |
| 后端版本变化，API 契约保持兼容 | 否 |
| 域名、外部端口、TLS 证书或 upstream 变化 | 否 |
| 同源 API 路径变化 | 否，但必须原子更新运行时配置和 Nginx |
| 产品改用已有登录布局 | 否，由服务端站点配置控制 |
| 页面、登录布局或静态品牌资源变化 | 是 |
| 前后端 API 契约不兼容 | 是，并协调发布顺序 |

“不需要修改前端源码”不表示可以跳过正式 Web 制品构建。release 仍需锁定前端版本、构建 Web 镜像并按发布清单交付。

### 4.8 Nginx 历史配置

`docs/archive/nginx/` 保存历史 Nginx 配置，仅用于回溯，不是正式部署配置源。归档内容包含真实域名、公网 IP、服务器路径、upstream 和证书路径，不能直接复制到其他环境，也不得加入证书、私钥、Token 或密码。
