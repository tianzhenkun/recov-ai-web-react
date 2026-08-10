# Recov 移除 AI Call 实施计划

**目标：** 从 Recov 前端彻底移除已迁往 AI Reach 的 AI Call 页面、菜单、路由、服务和开发代理；保留 Recov 自身的智能外呼、催收策略、运行控制与数据分析逻辑。

**工作区：** `/Users/liuhongli/.config/superpowers/worktrees/recov-ai-web-react/remove-ai-call`

**分支：** `codex/remove-ai-call-from-recov`

**已知基线：** `npm test -- --runInBand` 共 125 个测试套件，仅 `src/pages/aiCallStatistics/index.test.tsx` 因旧断言失败；该模块属于本次删除范围。

## 任务 1：先建立边界回归测试

修改：

- `config/routes.test.ts`
- `config/proxy.test.ts`
- `src/adapters/ruoyi/menu.test.tsx`

步骤：

1. 路由测试改为断言不存在 `/agent-workbench`、`/ai-call/*`、`/ai-call-lab/*`。
2. 代理测试改为断言开发环境不存在 `/ai-call-agent-api`。
3. 菜单测试改为断言若依返回的 AI Call 根菜单和嵌套入口会被删除，而 `/intelligent-outbound` 保留。
4. 运行：
   `npm test -- --runInBand config/routes.test.ts config/proxy.test.ts src/adapters/ruoyi/menu.test.tsx`
5. 预期：新断言先失败，证明测试能约束待删除逻辑。

## 任务 2：移除前端接入点

修改：

- `config/routes.ts`
- `config/proxy.ts`
- `src/adapters/ruoyi/menu.tsx`
- `src/app.tsx`
- `src/access.test.ts`
- `src/app.test.tsx`
- `src/adapters/ruoyi/request.test.ts`

步骤：

1. 删除全部 AI Call、AI Call Lab 和旧坐席工作台路由，保留 `/intelligent-outbound`。
2. 删除 `/ai-call-agent-api` 开发代理配置。
3. 删除 AI Call 菜单注入和权限分支；在统一菜单构建入口递归过滤已迁出的 AI Call 路径。
4. 删除 `app.tsx` 对 AI Call 菜单注入函数的引用。
5. 将通用访问、登录跳转、请求异常测试中的 AI Call 示例替换为非 AI Call 示例。
6. 运行任务 1 的三个测试文件及：
   `npm test -- --runInBand src/access.test.ts src/app.test.tsx src/adapters/ruoyi/request.test.ts`
7. 预期：全部通过。

## 任务 3：删除 AI Call 页面与服务

删除：

- `src/pages/agentWorkbench`
- `src/pages/aiCall*`
- `src/services/ruoyi/agent-console*`
- `src/services/ruoyi/ai-call-browser-session*`
- `src/services/ruoyi/ai-call-lab*`
- `src/services/ruoyi/ai-call-runtime*`
- `src/services/ruoyi/ai-call-voices*`

保留：

- `src/pages/recov/intelligentOutbound`
- 催收策略中的 `ai_call` 角色与节点
- Recov 运行控制中的 `ai_call`
- 数据分析中的 `aiCallFeedbackCount`
- 若依全局 SSE 和通知中心

步骤：

1. 删除上述页面、样式、测试和专用服务。
2. 移除仅被这些模块使用的 `livekit-client` 依赖并更新锁文件。
3. 运行 `rg` 检查外部代码中不存在 `/ai-call/`、`/ai-call-lab/`、`/agent-workbench`、`ai-call-agent-api` 和已删除服务导入。
4. 运行 `npm run tsc`。
5. 预期：引用检查无命中，TypeScript 检查通过。

## 任务 4：完整验证、提交与部署

步骤：

1. 运行 `npm test -- --runInBand`，预期全部通过。
2. 运行生产构建命令，预期构建成功。
3. 本地启动 Recov，验证登录、非 AI Call 菜单、通知中心和 `/intelligent-outbound`；不创建任务、不发起真实外呼。
4. 检查 `git diff --check` 和 `git status --short`。
5. 只提交本清理工作区的改动。
6. 按现有 Recov 发布流程部署，线上验证 AI Call 菜单及旧深链已消失，其他 Recov 功能仍可进入。

