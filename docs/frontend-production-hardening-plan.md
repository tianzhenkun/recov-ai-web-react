# 前端生产安全收敛实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 在当前 dirty worktree 中逐任务实现。步骤使用复选框（`- [ ]`）语法跟踪；行为修改严格执行红灯、绿灯、重构。

**目标：** 删除未使用的 Voice 独立直连和生产示例，修复已确认的安全、路由授权、模块隔离、品牌、依赖与质量问题，同时保留主 API 智能外呼能力和当前 Modules 重构现场。

**架构：** 普通业务请求只走 `src/api/main.ts`；业务页面默认由后端完整授权路由树准入，少数敏感页面叠加 Umi `access`；站点配置驱动全局品牌；不可信文档和跨源资源在浏览器边界 fail-closed。所有修改直接基于当前工作区，禁止 reset、clean、覆盖和启动服务。

**技术栈：** React 19、Umi Max 4、TypeScript 6、Ant Design 6、Jest 30、Biome、DOMPurify、CodeGraph、npm。

---

## 文件职责

- `src/api/runtimeConfig.ts`：正式运行时主 API/SSE 契约，不再包含 Voice。
- `src/adapters/ruoyi/request.ts`：主 API 同源路径构建、Token 注入与请求边界。
- `src/api/pathSafety.ts`：浏览器运行时可复用的安全路径段判断。
- `scripts/local-dev-profile.js`：本地配置路径校验和输出，不再包含 Voice。
- `src/app/authorization/routeAuthorization.ts`：纯函数形式的授权路由匹配。
- `src/app/authorization/AuthorizedRouteBoundary.tsx`：加载、允许、拒绝、失败、重试 UI 状态。
- `src/adapters/ruoyi/menu.tsx`：保留完整后端授权树并提供能力查询。
- `src/app/extensions/index.tsx`：按授权能力激活 Recov 扩展。
- `src/components/PdfPreview/security.ts`：PDF 是否允许附带认证信息的纯函数。
- `src/modules/recov/pages/instrument/previewSecurity.ts`：文书 HTML 净化策略。
- `src/site-profiles/index.ts`、`src/branding/*`：站点配置和中性品牌解析。
- `src/shared/types/*`：跨模块稳定 DTO，不依赖任何业务模块。
- `docs/部署说明.md`、`docs/前端模块规范.md`：同步已实现事实和新增注册规则。

## 任务 1：删除 Voice 独立直连、凭据和生产示例

**文件：**

- 修改：`config/routes/public.ts`
- 修改：`config/routes/recov.ts`
- 修改：`config/routes.test.ts`
- 修改：`src/api/runtimeConfig.test.ts`
- 修改：`scripts/local-dev-profile.test.js`
- 修改：`config/proxy.test.ts`
- 修改：`src/modules/recov/pages/intelligentOutbound/service.test.ts`
- 修改：`src/modules/recov/pages/intelligentOutbound/index.test.tsx`
- 删除：`src/api/direct.ts`
- 删除：`src/api/direct.test.ts`
- 删除：`src/modules/recov/pages/intelligentOutbound/AgentWebRtcStatusBar.tsx`
- 删除：`src/modules/recov/pages/intelligentOutbound/AgentWebRtcStatusBar.test.tsx`
- 删除：`src/modules/recov/pages/intelligentOutbound/useWebRtcAgent.ts`
- 删除：`src/modules/recov/pages/intelligentOutbound/useWebRtcAgent.test.tsx`
- 修改：`src/modules/recov/pages/intelligentOutbound/LiveMonitorDetailView.tsx`
- 修改：`src/modules/recov/pages/intelligentOutbound/service.ts`
- 删除：`src/pages/chatbot/`
- 删除：`src/modules/recov/pages/lawyerCourt/`
- 删除：`src/pages/recov/lawyerCourt/index.tsx`
- 修改：`src/locales/en-US/menu.ts`
- 修改：`src/locales/zh-CN/menu.ts`

- [ ] **步骤 1：先写生产边界失败测试**

在现有路由、Runtime config、本地配置、Proxy 和智能外呼测试中加入断言：

```ts
expect(routePaths).not.toContain('/chatbot');
expect(routePaths).not.toContain('/test11');
expect(() => parseRuntimeConfig({ ...validConfig, voiceApi: '/voice-api' }))
  .toThrow('unsupported field');
expect(source).not.toContain('mockHandoff');
expect(source).not.toMatch(/sipUri|useWebRtcAgent|createDirectApi/);
```

- [ ] **步骤 2：运行定向测试并确认红灯**

运行：

```bash
npm test -- --runInBand config/routes.test.ts src/api/runtimeConfig.test.ts scripts/local-dev-profile.test.js config/proxy.test.ts src/modules/recov/pages/intelligentOutbound/service.test.ts src/modules/recov/pages/intelligentOutbound/index.test.tsx
```

预期：因现有 Voice 字段、示例路由和 WebRTC 代码仍存在而失败，不接受模块解析错误代替目标失败。

- [ ] **步骤 3：删除最小生产实现**

删除上述 Voice/Chatbot/Lawyer Court 文件和引用；智能外呼服务只保留 `ruoyiRequest` 主 API 调用；详情页移除人工接管、SIP 注册、直连挂断及 Mock 分支，但保留统计、记录和分析展示。

- [ ] **步骤 4：运行相同测试确认绿灯**

预期：全部通过，源码搜索不再出现 `voiceApi`、`UMI_APP_VOICE_API`、`mockHandoff`、硬编码 SIP 凭据和 Ant Chatbot 第三方地址。

## 任务 2：统一主 API 与配置路径安全

**文件：**

- 创建：`src/api/pathSafety.ts`
- 创建：`src/api/pathSafety.test.ts`
- 修改：`src/api/runtimeConfig.ts`
- 修改：`src/api/runtimeConfig.test.ts`
- 修改：`src/adapters/ruoyi/request.ts`
- 创建：`src/adapters/ruoyi/request.test.ts`
- 修改：`scripts/local-dev-profile.js`
- 修改：`scripts/local-dev-profile.test.js`
- 修改：`config/proxy.ts`
- 修改：`config/proxy.test.ts`

- [ ] **步骤 1：编写危险路径测试**

```ts
test.each([
  'https://evil.invalid/data',
  '//evil.invalid/data',
  '/api/../auth',
  '/api/%2e%2e/auth',
  '/api/a%2fb',
  '/api\\auth',
])('rejects unsafe main API input %s', async (value) => {
  await expect(callMainApi(value)).rejects.toThrow();
  expect(baseRequest).not.toHaveBeenCalled();
});
```

Runtime config 和本地配置对 `.`、`..`、反斜杠、编码分隔符加入等价断言。

- [ ] **步骤 2：运行测试确认红灯**

运行：

```bash
npm test -- --runInBand src/api/pathSafety.test.ts src/api/runtimeConfig.test.ts src/adapters/ruoyi/request.test.ts scripts/local-dev-profile.test.js config/proxy.test.ts
```

- [ ] **步骤 3：实现共享安全判断**

`pathSafety.ts` 导出纯函数：

```ts
export const assertSafeSameOriginPath = (value: string, name: string) => {
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    throw new Error(`${name} 必须是同源绝对路径。`);
  }
  // 对每个 segment 解码并拒绝 .、..、解码后的分隔符和解码异常。
  return value;
};
```

主 API 在 Token 注入前拒绝绝对和危险路径；运行时与本地脚本执行等价校验。

- [ ] **步骤 4：运行测试确认绿灯并重构重复逻辑**

浏览器 TypeScript 与 Node 脚本不能直接共享模块时，保留同一测试向量，确保规则等价。

## 任务 3：修复 PDF Token 和文书 HTML 预览

**文件：**

- 创建：`src/components/PdfPreview/security.ts`
- 创建：`src/components/PdfPreview/security.test.ts`
- 修改：`src/components/PdfPreview/index.tsx`
- 修改：`src/components/PdfPreview/index.test.tsx`
- 创建：`src/modules/recov/pages/instrument/previewSecurity.ts`
- 创建：`src/modules/recov/pages/instrument/previewSecurity.test.ts`
- 修改：`src/modules/recov/pages/instrument/components/DocumentPreviewWorkspace.tsx`
- 修改：`src/modules/recov/pages/instrument/index.test.tsx`
- 修改：`package.json`
- 修改：`package-lock.json`

- [ ] **步骤 1：编写严格同源 PDF 测试**

```ts
expect(shouldAttachPdfAuthorization('/resource/oss/1', origin)).toBe(true);
expect(shouldAttachPdfAuthorization('https://evil.invalid/resource/oss/1', origin)).toBe(false);
expect(shouldAttachPdfAuthorization('http://app.test/resource/oss/1', 'https://app.test')).toBe(false);
expect(shouldAttachPdfAuthorization('https://app.test:8443/a.pdf', 'https://app.test')).toBe(false);
```

- [ ] **步骤 2：编写 HTML 净化与 sandbox 测试**

```ts
expect(sanitizeInstrumentPreviewHtml('<img src=x onerror=alert(1)>')).not.toContain('onerror');
expect(sanitizeInstrumentPreviewHtml('<a href="jav&#x61;script:alert(1)">x</a>')).not.toMatch(/javascript|&#x61;/i);
expect(sanitizeInstrumentPreviewHtml('<p style="text-align:center" data-seal-placeholder="seal_group">正文</p>'))
  .toContain('data-seal-placeholder');
expect(renderedIframe).toHaveAttribute('sandbox', '');
```

- [ ] **步骤 3：运行定向测试确认红灯**

- [ ] **步骤 4：安装并锁定修复版本的 DOMPurify**

运行官方 Registry 的 npm 安装命令，直接依赖使用已修复当前公告的兼容版本；不得手工编辑 lockfile。

- [ ] **步骤 5：实现净化和严格同源判断**

PDF 只有 `new URL(url, origin).origin === origin` 时返回请求头；文书 iframe 使用净化结果和空 sandbox，不允许脚本与同源权限。

- [ ] **步骤 6：运行定向测试确认绿灯**

## 任务 4：建立后端授权路由白名单

**文件：**

- 创建：`src/app/authorization/routeAuthorization.ts`
- 创建：`src/app/authorization/routeAuthorization.test.ts`
- 创建：`src/app/authorization/AuthorizedRouteBoundary.tsx`
- 创建：`src/app/authorization/AuthorizedRouteBoundary.test.tsx`
- 创建：`src/app/authorization/index.ts`
- 修改：`src/adapters/ruoyi/menu.tsx`
- 修改：`src/adapters/ruoyi/menu.test.tsx`
- 修改：`src/app.tsx`
- 修改：`src/app.test.tsx`
- 修改：`src/components/TenantSwitch/navigation.ts`
- 创建：`src/components/TenantSwitch/navigation.test.ts`

- [ ] **步骤 1：编写纯路由授权红灯测试**

覆盖：公开路由、账户路由、普通授权、未授权、动态 `:id`、尾斜杠、`activeMenu`/父路径、外链和目录路径。

```ts
expect(resolveRouteAuthorization('/sales/leads', salesMenu)).toBe('allowed');
expect(resolveRouteAuthorization('/billing/orders', salesMenu)).toBe('denied');
expect(resolveRouteAuthorization('/system/user-auth/role/42', userMenu)).toBe('allowed');
expect(resolveRouteAuthorization('/account/center', [])).toBe('allowed');
```

- [ ] **步骤 2：编写边界组件状态红灯测试**

覆盖 `loading` 不渲染 children、`error` 提供重试、`denied` 展示 403、`allowed` 渲染 children。

- [ ] **步骤 3：运行测试确认红灯**

- [ ] **步骤 4：实现纯授权函数和边界组件**

边界使用完整 `getRouters` 缓存，不使用视觉过滤后的菜单。错误 fail-closed，但与 403 区分；重试清缓存后重新加载。

- [ ] **步骤 5：集成 ProLayout childrenRender 和租户切换**

租户切换后重新加载授权树；当前路径无权访问时使用新授权树首个页面，不保留旧租户页面。

- [ ] **步骤 6：运行路由、App、租户测试确认绿灯**

## 任务 5：按授权能力激活 Recov 扩展

**文件：**

- 修改：`src/app/extensions/index.tsx`
- 创建：`src/app/extensions/index.test.tsx`
- 修改：`src/app.tsx`

- [ ] **步骤 1：编写失败测试**

```ts
expect(renderExtension({ signedIn: true, authorizedPaths: ['/sales/dashboard'] }))
  .not.toRenderFlowEventExtension();
expect(renderExtension({ signedIn: true, authorizedPaths: ['/flow-events'] }))
  .toRenderFlowEventExtension();
```

- [ ] **步骤 2：运行测试确认红灯**

- [ ] **步骤 3：将 `enabled` 改为登录状态与授权能力的合取**

不使用 `productCode` 判断；未授权时不挂载组件，从而不发起 Recov 请求。

- [ ] **步骤 4：运行测试确认绿灯**

## 任务 6：统一全局品牌并移除外部布局资源

**文件：**

- 修改：`src/branding/base.ts`
- 修改：`src/branding/registry.ts`
- 创建：`src/branding/registry.test.ts`
- 修改：`src/site-profiles/index.ts`
- 修改：`src/site-profiles/index.test.ts`
- 修改：`src/app.tsx`
- 修改：`src/app.test.tsx`
- 修改：`src/login-layouts/controller.ts`
- 修改：`src/login-layouts/types.ts`
- 修改：`src/login-layouts/default/index.tsx`
- 修改：`src/components/Footer/index.tsx`
- 创建：`src/components/Footer/index.test.tsx`
- 修改：`config/config.ts`

- [ ] **步骤 1：编写品牌红灯测试**

```ts
expect(resolveSiteBranding(undefined).title).toBe('LingChen AI');
expect(resolveSiteBranding({ ...site, productName: 'Sales Agent' }).title).toBe('Sales Agent');
expect(appSource).not.toContain('mdn.alipayobjects.com');
expect(footer).toHaveTextContent('Sales Agent');
```

- [ ] **步骤 2：运行测试确认红灯**

- [ ] **步骤 3：把 SiteProfile 放入 initialState**

登录页加载站点配置时更新 initialState；页面刷新时 `getInitialState` 重新请求站点配置。失败使用中性品牌，不阻断已登录业务。

- [ ] **步骤 4：统一 Layout、Helmet、Logo 和 Footer**

删除外部背景图片，使用 CSS/Token；Footer 接收全局品牌标题。

- [ ] **步骤 5：运行测试确认绿灯**

## 任务 7：收敛下载、模块依赖和兼容导入

**文件：**

- 修改：`src/adapters/ruoyi/download.ts`
- 创建：`src/adapters/ruoyi/download.test.ts`
- 创建：`src/shared/types/admin.ts`
- 修改：`src/shared/types/index.ts`
- 修改：`src/shared/services/user.ts`
- 修改：`src/shared/services/tenant.ts`
- 修改：`src/modules/admin/services/role.ts`
- 修改：`src/login-layouts/controller.ts`
- 修改：`src/login-layouts/types.ts`
- 修改：`src/site-profiles/index.ts`
- 修改：`src/modules/admin/pages/system/integration-center/index.tsx`

- [ ] **步骤 1：编写带 charset 的 JSON 下载红灯测试**

```ts
expect(isJsonContentType('application/json;charset=UTF-8')).toBe(true);
expect(saveAs).not.toHaveBeenCalled();
```

- [ ] **步骤 2：运行测试确认红灯并实现 MIME 主类型判断**

- [ ] **步骤 3：移动稳定 DTO 并修正依赖方向**

`shared` 只能从 `shared/types` 导入 `RoleItem`、`PostItem`、`MenuTreeItem`；Admin 服务消费相同类型，不再形成 shared → admin 反向依赖。

- [ ] **步骤 4：把本次修改的新代码改为真实所有者导入**

Auth 使用 `@/app/auth`，Menu 使用 `@/app/menu`；保留旧兼容导出供未迁移薄入口使用。

- [ ] **步骤 5：运行相关测试、CodeGraph callers 和 TypeScript 检查**

## 任务 8：依赖、Ant Design 与真实 Doctor 问题

**文件：**

- 修改：`package.json`
- 修改：`package-lock.json`
- 修改：Ant lint 报告涉及的 `src/**/*.tsx`
- 修改：已确认 React Doctor 正确性/无障碍问题文件
- 修改：`react-doctor.config.json`（仅用于明确的 Umi 约定误报）

- [ ] **步骤 1：删除无调用者依赖**

删除 `@ant-design/x`、`@ant-design/x-sdk`、`jssip`、`swagger-ui-dist`。`@ant-design/x-markdown` 仍由 Persona 和 Datelligence 使用，因此保留并升级，不做错误删除。

- [ ] **步骤 2：用官方 Registry 更新安全版本并审计**

```bash
npm uninstall @ant-design/x @ant-design/x-sdk jssip swagger-ui-dist
npm install dompurify@^3.4.12 markdown-it@^14.3.0 @ant-design/x-markdown@^2.8.0 --save --registry=https://registry.npmjs.org
npm audit --omit=dev --registry=https://registry.npmjs.org
```

不得使用 `npm audit fix --force`。生产审计必须无已知漏洞；若上游无兼容修复，移除或替换对应依赖。

- [ ] **步骤 3：修正项目包元数据**

把 `package.json` 的包名改为 `recov-ai-web-react`，描述改为 LingChen 多产品前端，仓库地址改为当前 origin `git@github.com:tianzhenkun/recov-ai-web-react.git`，删除 Ant Design Pro 模板身份残留。

- [ ] **步骤 4：逐类修复 Ant Design 废弃 API**

每种组件先运行 `npx antd info <Component>`，再进行机械替换并运行相关测试；最终 `npx antd lint ./src` 零问题。

- [ ] **步骤 5：修复已确认的真实 Doctor 问题**

修复无效锚点、非交互元素点击、数组索引 key 和 hydration 随机值；不因 dead-code 误报删除 Umi 路由入口。

## 任务 9：文档、全量验证与构建产物扫描

**文件：**

- 修改：`CLAUDE.md`
- 修改：`docs/部署说明.md`
- 修改：`docs/前端模块规范.md`
- 修改：`README.md`
- 修改：`README.zh-CN.md`

- [ ] **步骤 1：更新实现事实**

删除 Voice 直连契约描述，说明只有主 API；补充授权路由白名单、敏感 `access`、按钮权限和后端接口四层边界；新增产品/模块不依赖 `productCode` 推断。

- [ ] **步骤 2：运行格式和静态检查**

```bash
git diff --check
npm run lint
npx antd lint ./src
```

- [ ] **步骤 3：运行全量测试和构建**

```bash
npm test -- --runInBand
npm run build
```

- [ ] **步骤 4：扫描源码和 dist**

确认源码与 dist 不包含已删除的 Voice 键、SIP 凭据、`mockHandoff`、Ant Chatbot 地址、`/chatbot`、`/test11` 和支付宝布局 CDN。

- [ ] **步骤 5：运行依赖和架构检查**

```bash
npm audit --omit=dev --registry=https://registry.npmjs.org
npm run doctor
codegraph sync
codegraph status
```

- [ ] **步骤 6：核对 Git 边界**

确认未暂存 `.superpowers/`、`captcha-login.png`、`captcha8002.png`、`docs/theme-previews/`；未经用户明确要求不提交或推送实现代码。

## 执行约束

- 使用 `apply_patch` 修改文件；依赖 lockfile 只允许 npm 更新。
- 删除文件只删除本计划明确确认的 Voice、Chatbot、Lawyer Court 目标。
- 每个行为修复必须先看到对应测试红灯。
- 任何现有测试失败先按 `systematic-debugging` 定位根因，不修改测试掩盖回归。
- 不启动本地开发服务器；生产构建允许生成被 Git 忽略的 `dist`。
- 当前工作区不是干净基线，不使用 worktree、reset、clean 或 checkout 覆盖。
