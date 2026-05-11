# Ant Design Pro 迁移分析与当前状态校准

更新时间：2026-05-11

适用范围：`recov-ai-antd-pro-poc`

参考来源：

- Ant Design React LLM 文档：https://ant.design/docs/react/llms-cn
- Ant Design MCP 文档：https://ant.design/docs/react/mcp-cn
- 旧 Vue 项目：`G:\rweb\recov-ai-web`

## 1. 当前结论

当前迁移方向可继续推进。登录链路已经从 Ant Design Pro 模板接口切换到现有 RuoYi 后端接口，并完成本地验证：

- 本地前端地址：`http://localhost:8000`
- 后端网关：`http://111.229.146.182:19090`
- 前端代理前缀：`/dev-api`
- 登录接口链路：租户列表、验证码、登录、当前用户信息、退出登录已接入 RuoYi 风格接口
- 用户已确认登录成功
- Demo 页面暂时保留，便于本地访问和对比

从第一性原理看，本次迁移的核心不是“把 Vue 代码翻译成 React”，而是把以下契约稳定下来：

1. 浏览器请求路径必须和后端网关契约一致。
2. 鉴权、租户、验证码、加密、语言头、响应码处理必须和旧系统一致。
3. React 项目内部可以重构，但不能破坏既有后端协议。
4. 商用项目需要把兼容性改造和长期安全最佳实践区分开。

因此当前做法属于“先兼容现有后端、再逐步优化后端安全模型”的合理路线，不应直接上来改后端。

## 2. 当前已落地状态

### 2.1 运行环境

- Node.js 已切换到 `22.22.2`
- 本地开发服务运行在 `http://localhost:8000`
- 当前阶段按用户要求不做非必要 build

### 2.2 环境变量

当前采用本地环境文件承载后端地址和加密配置：

- `.env.local`
- `.env.development.local`

这些文件已加入 `.gitignore`，不应提交真实私钥、真实网关地址或本地个人配置。

关键变量包括：

- `UMI_APP_BASE_API=/dev-api`
- `UMI_APP_API_TARGET=http://111.229.146.182:19090`
- `UMI_APP_ADMIN_API=/admin-api`
- `UMI_APP_ADMIN_TARGET=http://111.229.137.72:19010`
- `UMI_APP_ENCRYPT=true`
- `UMI_APP_CLIENT_ID`
- `UMI_APP_RSA_PUBLIC_KEY`
- `UMI_APP_RSA_PRIVATE_KEY`

注意：文档和代码不应公开 RSA 私钥内容。当前浏览器侧存在私钥只是为了兼容旧 RuoYi 前端加解密方案，不是长期安全最佳实践。

### 2.3 Ant Design 官方推荐能力

已采纳 Ant Design MCP 的本地配置，便于后续让模型读取 Ant Design 官方组件用法、Token、迁移建议和代码示例：

- `.codex/mcp.json`
- `AGENTS.md`
- `CLAUDE.md`

判断：值得采纳。原因是 Ant Design Pro 迁移过程中容易因为旧知识、组件版本差异、Token 用法差异导致误判。MCP 能降低这类风险。

边界：MCP 只能辅助查官方用法，不能替代项目内的接口契约分析，也不能自动保证业务逻辑正确。

## 3. 已查明根因与修复

| 现象 | 根因 | 当前修复 | 状态 |
| --- | --- | --- | --- |
| `/api/login/account` 返回 404 | Ant Design Pro 模板默认接口，和现有后端不一致 | 登录改为 RuoYi 接口 `/auth/login`，并通过 `/dev-api` 代理 | 已修复 |
| `/auth/code`、`/auth/tenant/list` 后端 500，日志 `Index 1 out of bounds for length 1` | 请求头 `Content-Language` 使用了 `zh-CN`，旧网关/后端解析期望 `zh_CN` | 请求适配层统一发送 `Content-Language: zh_CN` | 已修复 |
| 请求头 `clientid` 为空 | Umi 编译期环境变量注入方式不对，动态读取 `process.env[key]` 没有被正确替换 | `config/config.ts` 显式 define，`src/adapters/ruoyi/env.ts` 显式读取固定 key | 已修复 |
| 请求路径出现 `/%22/dev-api%22/auth/code` | 环境变量值被带引号注入，URL 拼接时没有规整 | 增加 env value normalize，去掉包裹引号 | 已修复 |
| 验证码接口 200 但页面无图 | 后端返回的是纯 base64 PNG，页面原先未稳定拼成 data URI；同时 `addonAfter` 布局在当前登录表单中表现不理想 | 识别 base64 MIME，使用独立验证码输入行和图片按钮 | 已修复 |
| 登录页默认填充密码 | 模板/开发便利行为，不适合真实登录页 | 移除默认账号密码，保留浏览器 autocomplete | 已修复 |

## 4. 当前实现清单

### 4.1 配置层

- `config/proxy.ts`
  - 使用 `UMI_APP_API_TARGET` 和 `UMI_APP_ADMIN_TARGET`
  - `/dev-api` 代理到 `111.229.146.182:19090`
  - `/admin-api` 代理到 `111.229.137.72:19010`
  - 代理时去掉前缀，保证后端收到 `/auth/code` 而不是 `/dev-api/auth/code`

- `config/config.ts`
  - 显式 define 前端可用的 `UMI_APP_*`
  - 对 `.env` 中带引号的值做 normalize

### 4.2 RuoYi 适配层

新增或调整的核心文件：

- `src/adapters/ruoyi/env.ts`
- `src/adapters/ruoyi/request.ts`
- `src/adapters/ruoyi/crypto.ts`
- `src/adapters/ruoyi/token.ts`
- `src/adapters/ruoyi/download.ts`
- `src/adapters/ruoyi/response.ts`

当前适配能力：

- 自动拼接 `/dev-api`
- 自动附带 `Authorization: Bearer <token>`
- 自动附带 `clientid`
- 自动附带 `Content-Language: zh_CN`
- 支持 RuoYi 响应码处理
- 支持 AES/RSA 加解密兼容逻辑
- 支持 401 清 token 并跳转登录
- 支持重复提交拦截
- 支持 blob/arraybuffer 原样返回

### 4.3 服务层

新增或调整：

- `src/services/ruoyi/auth.ts`
- `src/services/ruoyi/user.ts`
- `src/services/ruoyi/menu.ts`

已接入接口：

- `GET /auth/tenant/list`
- `GET /auth/code`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /system/user/getInfo`
- `GET /system/menu/getRouters`

### 4.4 登录页

已调整：

- 租户列表从后端加载
- 验证码从后端加载
- 登录提交使用 RuoYi 参数结构
- 登录成功保存 token
- 记住账号只保存租户、账号和 rememberMe，不保存密码
- 移除默认密码
- 验证码图片支持点击刷新

### 4.5 用户状态与权限

已调整：

- `src/app.tsx`
  - `fetchUserInfo` 改为读取 RuoYi 当前用户信息
  - 映射 roles、permissions、user 到 Ant Design Pro initialState

- `src/access.ts`
  - 支持角色和权限判断

- `AvatarDropdown`
  - 退出登录调用 `/auth/logout`
  - 本地清理 token

## 5. 接口契约

### 5.1 浏览器到后端的路径

浏览器应该请求：

```text
http://localhost:8000/dev-api/auth/code
```

开发代理转发给后端：

```text
http://111.229.146.182:19090/auth/code
```

后端不应该收到：

```text
/dev-api/auth/code
/%22/dev-api%22/auth/code
/api/login/account
```

### 5.2 必要请求头

当前旧后端兼容链路需要：

```text
clientid: <来自 UMI_APP_CLIENT_ID>
Content-Language: zh_CN
Authorization: Bearer <token，登录后请求才有>
```

其中 `Content-Language` 已从常见 Web 写法 `zh-CN` 修正为旧后端当前实际需要的 `zh_CN`。

### 5.3 验证码响应

后端验证码接口返回结构：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "captchaEnabled": true,
    "uuid": "...",
    "img": "iVBORw0KGgo..."
  }
}
```

前端需要把 `img` 转换为：

```text
data:image/png;base64,<img>
```

当前已支持纯 base64 和已带 data URI 的两种情况。

## 6. 最佳实践判断

### 6.1 当前属于最佳实践的部分

以下修改符合当前阶段最佳实践：

- 用适配层隔离 RuoYi 协议，而不是把接口细节散落到页面组件中
- 用代理解决本地跨域和环境切换，而不是在组件里硬编码后端 IP
- 把真实环境变量放进 `.env.local` / `.env.development.local` 并忽略提交
- 登录页不再默认填充密码
- 记住账号不保存密码
- 请求头、响应码、token、加密逻辑集中处理
- 保留 Demo 页面，先完成真实后端闭环，再逐步清理页面
- 采纳 Ant Design MCP，用官方能力辅助后续组件迁移

### 6.2 当前只是兼容方案，不是长期最佳实践

以下点要明确：它们是为了不改后端而做的兼容，不代表商用最终形态：

- 浏览器侧存在 RSA 私钥
- token 存在 localStorage
- 前端承担响应解密
- 前端依赖固定 `clientid`
- 请求重复提交逻辑主要在前端拦截

长期商用建议：

1. 后端逐步改为更清晰的认证协议。
2. 优先考虑 HttpOnly、Secure、SameSite Cookie 或 BFF Session。
3. 不在浏览器侧放私钥。
4. 安全边界应由后端兜底，前端只做体验优化。
5. 增加 CSP、XSS 防护、依赖漏洞扫描和审计日志。

### 6.3 性能判断

当前修改对性能影响可接受：

- 登录页多了租户和验证码请求，这是业务必要请求。
- 加解密库只在认证和接口请求阶段使用，当前体量下不会成为主要瓶颈。
- 环境变量 normalize 和请求头组装是常量级成本。
- 没有引入全局大规模状态管理或运行时路由重计算。

后续可优化：

- 把加密相关库拆成按需加载，减少首屏包体积。
- 对租户列表做短时缓存。
- 对菜单和权限做登录态缓存，但必须和 token 生命周期绑定。
- 接入生产构建分析，避免 Demo 依赖和无关页面进入正式包。

## 7. 非根因修改与清理建议

### 7.1 属于必要根因修复

这些修改是为解决当前登录闭环必须做的：

- `config/proxy.ts`
- `config/config.ts`
- `src/adapters/ruoyi/*`
- `src/services/ruoyi/*`
- `src/pages/user/login/index.tsx`
- `src/app.tsx`
- `src/access.ts`
- `src/components/RightContent/AvatarDropdown.tsx`
- `src/requestErrorConfig.ts`

其中 `src/requestErrorConfig.ts` 移除 Demo token 拼接逻辑是必要的，否则真实接口会被模板逻辑污染。

### 7.2 属于合理但非根因

这些修改不是造成 404、500、验证码缺失的根因，但方向合理：

- 移除默认密码
- 记住账号不保存密码
- Ant Design MCP 配置
- 文档更新
- 为登录页补行为测试方向

### 7.3 提交前建议清理或单独提交

以下内容需要在正式提交前再检查：

- `config/routes.ts`
  - 当前疑似只有换行或格式噪音，应避免无意义提交
- `src/pages/user/register/index.tsx`
  - 当前疑似只有换行或格式噪音，应避免无意义提交
- `src/components/OfflineBanner/index.tsx`
  - 删除未使用 import，属于 lint 清理，可保留但最好单独说明
- `src/pages/table-list/components/UpdateForm.tsx`
  - 删除 Demo 页未使用类型，属于 lint 清理，可保留但不是迁移主线
- `tsconfig.json`
  - 排除 `.umi` 生成目录是合理的，但提交前应确认不会影响 CI 类型检查策略
- `.codex/logs`
  - 本地日志不应提交

## 8. 已验证结果

已完成验证：

- `npm run tsc` 通过
- `npm run biome:lint` 通过
- 本地 `/dev-api/auth/code` 能拿到后端 `code: 200`
- 浏览器验证码图片已显示
- 用户已确认登录成功
- 当前登录页不再调用 `/api/login/account`；该路径仍存在于模板生成的 `src/services/ant-design-pro/api.ts` 和 `config/oneapi.json` 中，后续清理 Demo/OpenAPI 时再处理
- 未发现当前登录链路继续产生 `/%22/dev-api%22` 请求路径

尚未完全闭环：

- 原模板登录页测试和 snapshot 已不适配 RuoYi 登录流，本阶段先移除；后续需要补稳定的 service 层和表单行为测试
- 当前没有执行生产 build，因为本阶段用户明确要求本地验证时非必要不 build

## 9. 后续分阶段执行建议

### 阶段 0：当前登录闭环

状态：已基本完成。

目标：

- 接通真实后端
- 修复请求前缀
- 修复请求头
- 修复验证码
- 修复登录、当前用户、退出登录
- 保留 Demo 页面

### 阶段 0.5：提交前收敛

建议下一步做：

1. 清理换行噪音和本地日志。
2. 明确哪些 lint 清理和迁移主线一起提交，哪些单独提交。
3. 稳定登录页测试，至少覆盖验证码展示和登录参数结构。
4. 补一份本地启动说明，避免其他人复现时踩环境变量坑。

### 阶段 1：权限与菜单

状态：已开始，当前落地的是最小闭环版本。

已完成：

- 接入 `/system/menu/getRouters`
- 把 RuoYi 菜单结构转换为 Ant Design Pro `MenuDataItem`
- Demo 菜单统一归入“模板示例”分组
- 未迁移业务页面进入统一占位页，不跳回旧 Vue 系统
- `/` 进入后端返回的第一个可见业务菜单
- 菜单数据做登录态缓存，并在登录成功、退出登录时清理

待继续：

- 根据真实登录态在浏览器确认侧边栏展示和占位页效果
- 把按钮权限沉淀成 React 可复用组件或 Hook
- 后续业务页面迁移后，把占位路由逐步替换为真实页面

注意：这一阶段不要急着删除 Demo 页。可以先把真实业务路由并入，再逐步替换。

### 阶段 2：业务模块迁移

建议优先迁移低耦合、高价值页面：

1. 租户相关基础页面
2. 用户、角色、菜单、部门等系统管理页面
3. 套餐和权限相关页面
4. 业务主流程页面

每个模块迁移时都要先确认：

- 旧 Vue 页面调用了哪些接口
- 请求参数是否加密
- 响应是否加密
- 权限标识是什么
- 表格、表单、弹窗、导入导出是否有隐藏逻辑

### 阶段 3：商用质量加固

目标：

- 生产构建体积分析
- 权限边界测试
- 登录过期和并发请求处理
- 错误码和全局异常体验
- CSP、依赖安全扫描、敏感信息扫描
- 去 Demo、去模板痕迹、统一品牌与布局

## 10. 当前接手提示

如果后续继续开发，优先记住这些事实：

- 本地请求必须走 `/dev-api`
- 代理后端是 `111.229.146.182:19090`
- 后端实际期望语言头是 `zh_CN`
- `clientid` 不能为空
- 验证码 `img` 是纯 base64 PNG
- 当前登录成功不代表长期安全模型已经最佳，只代表兼容旧后端的登录闭环已经跑通
- Demo 页面暂时不要删
- 非必要不要 build，先按本地开发验证推进
