# 前端生产安全收敛与 Voice 直连移除设计

- **状态：** 已实施并完成本仓验证；独立终审未发现剩余 P0–P2，`lingchen-release` 的 SSE 有效路径预检作为跨仓 P2 单独跟踪
- **日期：** 2026-07-18
- **适用仓库：** `/Users/tzk/Project/LingChen/recov-ai-web-react`
- **目标分支：** `codex/credit-billing-production`

> 下文的问题背景作为设计依据保留，不表示这些问题在当前工作区仍然存在。

## 1. 背景与目标

当前前端已经按 `src/modules/{admin,recov,sales,billing}` 形成一份源码、一份构建产物的多模块结构，但综合审查确认仍存在以下生产问题：

- Voice 独立直连、SIP/WebRTC 人工接管和明文凭据仍进入浏览器构建产物；
- `/chatbot`、`/test11` 和查询参数 Mock 仍可在正式路由中访问；
- PDF 预览可能向跨源地址发送登录令牌；
- 文书 HTML 预览缺少浏览器侧净化与 iframe 隔离；
- 静态业务路由未统一校验后端授权路由树；
- Recov 全局扩展会在其他产品站点登录后加载；
- 主 API、运行时配置和下载错误处理存在边界不一致；
- 登录页和主布局仍包含 Recov 默认品牌及外部 CDN 资源；
- Shared 与 Admin 的依赖方向、兼容导入和生产依赖仍需收敛。

本次工作的目标是：在保留当前多产品目录方案和一份正式构建产物的前提下，删除未使用的 Voice 独立直连能力，关闭已确认的生产安全缺口，并建立可测试的路由授权、模块激活、品牌和 API 边界。

## 2. 非目标

本次不做以下工作：

- 不删除智能外呼统计、通话记录、分析结果等通过主 API 提供的业务能力；
- 不删除 `/sys/voice` 业务配置页面；
- 不为 Voice 新增 Gateway 转发、正式 upstream 或独立部署角色；
- 不修改 `lingchen-release` 的正式部署拓扑；
- 不把 `productCode`、登录布局、模块、路由、菜单和权限重新绑定为一一对应关系；
- 不一次性删除全部 `src/services/ruoyi` 兼容导出，只阻止新代码继续依赖兼容层；
- 不因 React Doctor 对 Umi 约定文件的误报删除有效页面或薄入口；
- 不处理 `.superpowers/`、验证码截图、主题预览等用户未跟踪文件。

## 3. 总体方案

采用定向安全收敛方案：

1. 删除当前唯一的独立直连调用者 Voice，以及随之失去调用者的通用直连客户端；
2. 以后端 `/system/menu/getRouters` 返回的原始完整授权路由树作为业务页面默认准入边界；
3. 对平台级敏感页面继续使用显式 Umi `access`；
4. 按钮权限和后端接口权限保持独立，后端接口仍是最终安全边界；
5. 安全修复采用失败测试先行的 TDD 流程；
6. 删除无用依赖并只做必要的非破坏性依赖升级；
7. 保持现有 Modules 目录，不进行与问题无关的大规模文件移动。

## 4. Voice 独立直连移除

### 4.1 删除内容

删除以下前端契约和实现：

- `LingchenRuntimeConfig.voiceApi`；
- `UMI_APP_VOICE_API`、`UMI_APP_VOICE_API_TARGET`；
- 本地配置脚本中的 Voice 启用询问、地址验证和 Proxy 生成；
- `getVoiceApi()`；
- `src/api/direct.ts` 及其测试，因为当前没有其他直连调用者；
- 智能外呼服务中的 Voice `/calls`、接管、挂断等直连请求；
- SIP/WebRTC 配置类型、Hook、人工接管 UI 和相关状态；
- 浏览器包中的 SIP 地址、账号、密码及任何默认回退凭据；
- `mockHandoff` 查询参数和模拟成功分支；
- 部署文档中尚未落地的 `voiceApi` 前端扩展契约。

配置缺失时不再保留不可用入口，也不回退到任何默认凭据。

### 4.2 保留内容

保留以下业务能力：

- `/intelligent-outbound` 静态页面和后端授权路由；
- 经 `src/api/main.ts` 调用的统计、记录、详情和分析接口；
- `/sys/voice` 业务配置页面；
- 与通话结果展示有关、但不依赖浏览器直连 Voice 服务的数据结构。

智能外呼详情页不再展示人工接管、浏览器 SIP 注册或直连挂断按钮。用户仍可查看主 API 已经持久化的通话状态和分析结果。

### 4.3 将来重新引入直连 API 的规则

只有新 upstream 被证明无法通过主 Gateway 时，才重新增加 `src/api/direct.ts`。重新引入必须同时具备：

- 明确的服务所有者模块；
- 同源反向代理路径；
- 正式发布 upstream；
- 独立认证、401、审计和错误契约；
- 运行时配置和部署契约测试。

## 5. 路由授权设计

### 5.1 四层边界

页面和操作采用四层独立控制：

1. **登录状态：** 未登录用户只能访问登录页和错误页等公开路由；
2. **后端授权路由白名单：** 已登录用户的普通业务页面必须匹配 `/system/menu/getRouters` 返回的原始完整路由树；
3. **显式敏感路由权限：** 平台根管理员、OAuth、Billing 运营等页面继续使用 Umi `access`；
4. **按钮与接口权限：** 页面内操作继续使用权限码，后端接口鉴权保持最终裁决。

这四层不能互相替代。`hideInMenu` 和后端 `activeMenu` 只决定视觉展示与高亮，不决定授权结果。

### 5.2 路由分类

以下路由不依赖业务菜单白名单：

- `/user/login`；
- `/exception/403`、`/exception/404`、`/exception/500`；
- 已登录用户的 `/account`、`/account/center`、`/account/settings`；
- 根路径 `/`，用于根据授权菜单选择首页；

Admin、Recov、Sales、Billing 的静态业务页面必须通过后端授权路由白名单。`/account/credit` 是 Billing 业务页，不属于账户框架例外，也必须由后端授权树显式返回。显式 `access` 只能进一步收紧，不能绕过白名单放行普通业务页面。

### 5.3 匹配规则

授权匹配使用 `/system/menu/getRouters` 返回的原始完整树，包括 `hidden` 路由，不使用经过视觉过滤后的侧边菜单：

- 统一去除尾部 `/`；
- 支持后端路径中的 `:param` 动态段；
- 精确匹配优先；
- 详情页必须由后端授权树显式返回；`activeMenu` 只控制菜单高亮，不授予路由权限，也不根据授权父路径或前缀推断准入；
- 外部链接不参与站内授权；
- 目录节点本身只在后端确实返回对应目录路径时允许访问；
- 不根据 `productCode` 推断模块准入。

新增静态业务路由时，测试必须证明它能够匹配后端原始授权路由树。

### 5.4 加载、失败和重试状态

授权边界具有四种状态：

- `loading`：首次加载授权路由，页面展示稳定的全局加载状态，不提前渲染业务页面；
- `allowed`：匹配成功，渲染页面；
- `denied`：请求成功但路径不在授权树，展示 403；
- `error`：授权路由请求失败，展示“授权信息加载失败”和“重新加载”按钮。

错误状态不能按未授权处理，也不能 fail-open。点击“重新加载”时清除失败的请求状态并重新调用 `/system/menu/getRouters`。租户切换后必须清空菜单和授权缓存，重新计算当前路径；若新租户无权访问当前页面，跳转到新租户首个授权页面或 403。

## 6. Recov 扩展激活

`AppExtensions` 不再以“已经登录”作为加载 Recov 流程事件扩展的唯一条件。

启用条件为：

- 用户已经登录；
- 授权路由已经成功加载；
- 完整授权路由树包含流程事件对应能力路径。

未启用时不导入运行逻辑、不发起 Recov 未读/列表请求、不显示浮动面板，也不提供 `/flow-events` 跳转。判断依据是授权能力，不是 `productCode`，因此多个产品可以复用同一 Recov 能力。

## 7. 示例与生产 Mock 清理

### 7.1 Chatbot

删除：

- `/chatbot` 路由；
- Chatbot 页面、服务和相关国际化文案；
- 默认 Ant Design 第三方模型地址；
- 仅由该示例使用的 `@ant-design/x`、Markdown、Mermaid 或 Swagger 示例依赖。

正式构建中不得再出现 `/chatbot` 静态页面或第三方模型地址。

### 7.2 律师庭审示例

删除：

- `/test11` 路由；
- Lawyer Court 页面、服务、本地数据和薄入口；
- 本地数据的替换律师、撤回、自动匹配等假成功逻辑。

### 7.3 Runtime Mock

删除智能外呼中的查询参数 Mock 和所有正式运行时假成功分支。Jest 测试内的 Mock 保留，不属于运行时 Mock。

## 8. PDF 鉴权安全

PDF URL 分为两类：

1. 有 `ossId`：通过项目同源 OSS 下载接口取得 Blob，再交给 PDF 组件；
2. 只有 URL：解析为绝对 URL 后，仅当 `target.origin === window.location.origin` 时附加 Bearer Token 和 `withCredentials`。

以下条件不再允许携带认证信息：

- 仅 hostname 相同但协议或端口不同；
- `localhost` 或 `127.0.0.1` 特例；
- 外部 URL 仅因路径包含 `/resource/oss/`；
- 无法解析的 URL。

跨源 PDF 仍可匿名加载，但绝不附加登录令牌。测试覆盖同源、跨端口、跨协议、localhost、恶意 OSS 路径和非法 URL。

## 9. 文书 HTML 预览安全

文书 HTML 在进入 `srcDoc` 前必须使用项目直接声明并锁定版本的 DOMPurify 进行净化，同时 iframe 使用不允许脚本且不保留同源权限的 `sandbox`。

净化策略：

- 禁止 `script`、`iframe`、`object`、`embed`、`form`、表单控件、`svg`、`math`、`link`、`meta`；
- 删除所有事件属性；
- 删除 `javascript:`、`data:`、`file:` 等危险资源协议及实体编码变体；
- 保留文书排版所需的普通结构、表格、内联样式和 `data-seal-*` 属性；
- 不允许脚本访问父窗口、LocalStorage 或应用同源资源。

后端校验继续保留，但前端预览不能假设后端正则等同于浏览器安全隔离。测试覆盖脚本、事件属性、编码后的危险链接、表单、远程 iframe 和合法文书样式。

## 10. 主 API 与路径安全

### 10.1 主 API 请求

`src/api/main.ts` 对外只接受同源业务路径。请求构建必须拒绝：

- 带协议的绝对 URL；
- `//host/path` 协议相对 URL；
- 反斜杠；
- 明文或编码后的 `.`、`..` 路径段；
- 解码后包含 `/` 或 `\` 的单个路径段；
- 无法安全解码的路径。

拒绝发生在附加 Token 和发起网络请求之前。错误信息不得包含 Token。

### 10.2 运行时和本地配置

`baseApi`、`adminApi` 和 `ssePath` 继续只接受同源绝对路径，并与请求层共享相同的危险路径段规则；SSE 最终路由不得与主 API 或遗留 Admin API 精确路径冲突。`voiceApi` 被删除。

本地开发配置脚本使用等价校验，避免浏览器运行时与本地 Proxy 对同一路径给出不同结论。向导同时管理真实登录必需的 Web clientId、加密开关和请求 RSA 公钥；标准后端登录接口启用 `@ApiEncrypt`，因此默认开启加密并拒绝无效或低于 2048 位的公钥。

生产构建不信任构建机继承的 `UMI_APP_*`：API、clientId、RSA、登录布局和菜单分组 define 均固定为中性空值，正式配置只来自部署时生成的 `runtime-config.js`。已无消费者的环境 Commit 覆盖不再写入浏览器 bundle。

### 10.3 下载错误响应

JSON 错误响应通过 MIME 主类型判断，兼容 `application/json;charset=UTF-8` 和大小写差异。识别为 JSON 后解析并展示后端错误，不创建下载文件。

## 11. 品牌与离线资源

站点配置解析结果进入全局初始状态，并统一驱动：

- 登录页标题、Logo 和文案；
- ProLayout 标题与 Logo；
- 浏览器标题；
- Footer 产品名；
- 页面刷新后的品牌恢复。

默认品牌使用中性的 `LingChen AI`，只在站点配置不可用时使用。产品品牌来自后端站点配置，不根据当前路由或 `productCode` 硬编码推断。

删除登录页和主布局中的支付宝 CDN 背景图，使用本地 CSS 渐变、主题 Token 或仓库内静态资源。正式页面加载后不得因布局和品牌资源主动请求第三方 CDN。

站点配置失败时：

- 登录流程继续按现有失败策略处理；
- 已登录布局使用中性默认品牌；
- 不回退到 Recov 品牌；
- 不因品牌加载失败阻断业务 API。

## 12. 模块依赖和兼容层

### 12.1 Shared 依赖方向

把 `RoleItem`、`PostItem`、`MenuTreeItem` 等稳定 DTO 移到 `src/shared/types`，使依赖方向保持：

```text
modules/* → shared
shared -X→ modules/*
```

本次只处理已确认的类型反向依赖，不借机大规模移动用户管理业务服务。

### 12.2 兼容导入

登录布局、站点配置和 Admin 新模块改为直接依赖真实所有者：

- Auth 使用 `src/app/auth`；
- Menu 使用 `src/app/menu`；
- 普通业务请求使用 `src/api/main.ts`；
- 模块服务使用对应 `src/modules/*/services`。

旧薄入口继续允许兼容导出，但新增和本次修改代码不得从 `src/services/ruoyi` 导入。

## 13. 依赖与质量检查

依赖处理遵循以下规则：

- 删除 Chatbot、Voice 和 Swagger 示例失去调用者后的直接依赖；
- DOMPurify 作为直接生产依赖声明，使用官方源中已修复当前安全公告的兼容版本；
- 剩余直接依赖只升级到兼容版本，不使用 `npm audit fix --force`；
- `package-lock.json` 通过 npm 正常更新，不手工编辑；
- 官方 npm Registry 的 `npm audit --omit=dev` 不得保留已知生产依赖漏洞；
- 开发构建链漏洞单独记录，不能把生产 dist 与构建机供应链风险混为一谈。

Ant Design 专项检查目标为零问题，包括废弃属性和无障碍问题。React Doctor 只处理能够由代码证据确认的正确性和无障碍问题，对 Umi 路由约定、薄入口和兼容导出误报通过配置或说明处理。

应用自有样式和运行时布局不得引用支付宝 CDN。当前 Umi layout 插件仍会把其旧版默认头像兜底字面量静态打入依赖 chunk，但运行时已显式设置 `rightContentRender: false`，该分支不可达且不会产生网络请求；不通过修改 `node_modules` 或构建后字符串替换来制造脆弱的“扫描清零”。后续升级或替换 layout 插件时再移除这段上游死代码。

## 14. 测试策略

行为变更使用 TDD，每项先看到测试因目标缺失而失败，再写最少实现通过：

- Runtime config 不再接受 `voiceApi`，并拒绝危险路径；
- 本地配置不再生成 Voice 变量和 Proxy；
- 主 API 拒绝绝对、协议相对和目录跳转 URL，且不调用底层请求；
- PDF 认证头只用于严格同源 URL；
- HTML 净化和 iframe sandbox 阻断危险内容并保留合法模板；
- 路由授权覆盖公开、授权、未授权、动态段、嵌套路由、加载失败和重试；
- 租户切换后重新授权当前路径；
- Recov 扩展只在授权能力存在时启用；
- JSON MIME 带 charset 时进入错误解析；
- 品牌配置驱动登录后布局，中性 fallback 不包含 Recov；
- 路由表不包含 `/chatbot`、`/test11`；
- 非测试生产源码和构建产物不再包含 Voice 直连键、SIP 凭据或 Runtime Mock；负向测试可以保留被拒绝字段的字面量。

## 15. 验收标准

必须同时满足：

1. `npm run lint` 通过；
2. 全量 Jest 通过；
3. `npx antd lint ./src` 零问题；
4. `npm run build` 通过；
5. 官方 npm Registry 的生产依赖审计无已知漏洞；
6. dist 中不存在 SIP 凭据、Ant Chatbot 第三方接口、`/chatbot`、`/test11`、`voiceApi` 和 `mockHandoff`；
7. 未授权业务路由无法通过直接 URL 渲染，授权加载错误可重试；
8. Sales、Billing 或纯 Admin 授权树不包含 Recov 能力时，不请求 Recov 流程事件接口；
9. 跨源 PDF 请求不携带登录令牌；
10. 文书预览中的恶意 HTML 无法执行脚本或访问父页面；
11. 登录后品牌由站点配置驱动，应用自有样式不引用支付宝 CDN，离线部署的可达布局分支不加载支付宝 CDN 资源；
12. CodeGraph 同步后索引为最新；
13. Git 暂存和最终提交不包含 `.superpowers/`、验证码截图、主题预览或其他用户素材。

## 16. 实施顺序

按以下顺序降低风险：

1. 删除凭据、Voice 直连、Chatbot 和 Runtime Mock；
2. 修复 PDF、HTML、主 API 和路径安全；
3. 建立路由授权边界和 Recov 扩展激活条件；
4. 收敛品牌、离线资源、下载和模块依赖；
5. 清理依赖和 Ant Design 警告；
6. 运行全量验证、生产构建、dist 扫描、依赖审计和 CodeGraph 同步。

每个阶段都必须保持现有工作区改动，不使用 `git reset`、`git clean` 或 checkout 覆盖，不启动开发服务。
