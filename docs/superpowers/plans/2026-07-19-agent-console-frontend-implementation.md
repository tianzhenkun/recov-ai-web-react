# 通用浏览器坐席中心前端实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在 Ant Design Pro 宿主中建设独立 `agentWorkbench` 模块，完成浏览器坐席接听、快速话后确认、本人跟进，以及三个管理页面。

**架构：** 页面只通过统一 `agent-console` service 消费后端契约；LiveKit 媒体职责封装在独立 hook，服务端状态由 bootstrap + SSE/轮询恢复。模块位于顶层 `src/pages/agentWorkbench`，不继续耦合 `recov/intelligentOutbound` 或实验性的 `aiCallLab` 页面。

**技术栈：** React 19、TypeScript、Ant Design 6、Ant Design Pro Components、Umi Max、livekit-client 2.20、Jest/Testing Library、Biome。

**权威规格：** 后端仓库 `docs/superpowers/specs/2026-07-17-commercial-agent-console-design.md`；实施前记录其提交号并固定接口契约。

---

## 文件结构

- 创建 `src/services/ruoyi/agent-console.ts` 和测试：统一 DTO、请求和异步结果查询。
- 创建 `src/pages/agentWorkbench/index.tsx`、`index.css`：坐席工作台壳层。
- 创建 `src/pages/agentWorkbench/hooks/useAgentPresence.ts`、`useAgentEvents.ts`、`useAgentCall.ts`：状态、推送、LiveKit。
- 创建 `src/pages/agentWorkbench/components/WaitingPool.tsx`、`CurrentCallPanel.tsx`、`HandoffContextPanel.tsx`、`QuickWrapUp.tsx`、`FollowUpPanel.tsx`。
- 创建 `src/pages/agentWorkbench/admin/agents/index.tsx`、`handoffs/index.tsx`、`followUps/index.tsx`。
- 修改 `config/routes.ts`、`config/routes.test.ts`：四个菜单页面路由。
- 修改 `config/proxy.ts`、`config/proxy.test.ts`：开发环境 AI Call API/SSE/WebSocket 代理。
- 各目录创建同名 `.test.tsx`/`.test.ts`，不把商用逻辑写进 `aiCallLab`。

### 任务 1：建立独立路由、权限入口和 API 契约

**文件：**
- 创建：`src/services/ruoyi/agent-console.ts`
- 创建：`src/services/ruoyi/agent-console.test.ts`
- 修改：`config/routes.ts:530-555`
- 修改：`config/routes.test.ts`
- 修改：`config/proxy.ts`
- 修改：`config/proxy.test.ts`

- [ ] 编写失败测试，断言存在 `/agent-workbench`、`/ai-call/agents`、`/ai-call/handoffs`、`/ai-call/follow-ups` 四条路由，分别映射工作台和三个管理页面；前者要求 `ai_call:agent:console`，后三者要求 `ai_call:agent:manage`。
- [ ] 运行 `npm test -- config/routes.test.ts --runInBand`，预期 FAIL。
- [ ] 新增独立页面路由；菜单最终是否由后端动态菜单生成，静态路由仍作为组件映射与直接访问兜底，不在页面内重复判断角色名称。
- [ ] 在 service 中定义 bigint 字符串 ID、handoff/agent/follow-up 状态联合类型，并实现 bootstrap、presence、claim、media-ready、ACW、follow-up、admin 请求。统一使用 `ruoyiRequest`，不直接拼接浏览器登录 Token。
- [ ] 为 `/ai-call-agent-api` 增加代理，目标读取 `UMI_APP_AI_CALL_API_TARGET`；SSE/WS 开启长连接。不要复用仅供实验页的 `AI_CALL_LAB_PREFIX` 常量。
- [ ] 运行路由、service、proxy 测试和 `npm run tsc`，预期 PASS。
- [ ] 提交：`git commit -m "feat: 搭建通用坐席模块入口"`。

### 任务 2：实现 bootstrap、设备预检和坐席在线状态

**文件：**
- 创建：`src/pages/agentWorkbench/index.tsx`
- 创建：`src/pages/agentWorkbench/index.css`
- 创建：`src/pages/agentWorkbench/hooks/useAgentPresence.ts`
- 创建：`src/pages/agentWorkbench/hooks/useAgentPresence.test.tsx`

- [ ] 编写失败测试：未建档、停用、设备拒绝、上线、暂停、下线、心跳过期和刷新恢复当前状态。
- [ ] 运行 `npm test -- src/pages/agentWorkbench/hooks/useAgentPresence.test.tsx --runInBand`，预期 FAIL。
- [ ] bootstrap 后由服务端状态驱动 UI；`console_session_id` 使用 `crypto.randomUUID()` 每标签页生成并保存在 `sessionStorage`，不采集硬件信息。
- [ ] 上线前完成麦克风授权、输入电平、音频播放和浏览器能力检查；失败保持 `paused/offline` 并显示可执行修复文案。
- [ ] 心跳只在页面可用时发送；刷新、休眠恢复和网络恢复后先 bootstrap，不能直接假定本地状态仍有效。
- [ ] 运行定向测试、`npm run tsc`，预期 PASS。
- [ ] 提交：`git commit -m "feat: 实现坐席在线与设备预检"`。

### 任务 3：实现公共待接池、实时提醒和原子认领交互

**文件：**
- 创建：`src/pages/agentWorkbench/hooks/useAgentEvents.ts`
- 创建：`src/pages/agentWorkbench/hooks/useAgentEvents.test.tsx`
- 创建：`src/pages/agentWorkbench/components/WaitingPool.tsx`
- 创建：`src/pages/agentWorkbench/components/WaitingPool.test.tsx`

- [ ] 编写失败测试：按场景展示、等待倒计时分色、声音只在 available 播放、Notification 权限降级、两次点击只发一个幂等认领请求、冲突后立即移除任务。
- [ ] 运行两个测试文件确认 FAIL。
- [ ] 实现 SSE 优先、30 秒低频轮询兜底；事件只触发刷新提示，最终对象状态仍由服务端响应覆盖。
- [ ] 页面展示等待时间、业务场景、脱敏客户、转人工原因、AI 摘要和最多 3 条待处理事项；摘要未完成时显示客户原话和最近对话，不阻塞接听。
- [ ] 使用短提示音、页面未读数和 Web Notification；关闭浏览器后不承诺推送，权限拒绝时不反复弹窗。
- [ ] 认领按钮带 loading 并生成 idempotency key；`HANDOFF_ALREADY_CLAIMED` 显示“已被其他坐席接听”，不显示错误堆栈。
- [ ] 运行定向测试和 `npm run lint`，预期 PASS。
- [ ] 提交：`git commit -m "feat: 实现公共待接池和抢单提醒"`。

### 任务 4：实现 LiveKit 人工接听、媒体确认和重连

**文件：**
- 创建：`src/pages/agentWorkbench/hooks/useAgentCall.ts`
- 创建：`src/pages/agentWorkbench/hooks/useAgentCall.test.tsx`
- 创建：`src/pages/agentWorkbench/components/CurrentCallPanel.tsx`
- 创建：`src/pages/agentWorkbench/components/HandoffContextPanel.tsx`
- 参考但不修改：`src/pages/aiCallLab/customer/livekitClient.ts`

- [ ] 编写失败测试：拿到 Token 后才创建 Room；麦克风发布成功后上报 media-ready；远端音频可播放；15 秒接入失败断开并刷新；网络断开请求原坐席重连 Token；重连失败不再抢占其他任务。
- [ ] 运行定向测试确认 FAIL。
- [ ] 封装 LiveKit Room 生命周期，组件卸载只断开本地媒体，结束客户通话必须调用后端 complete；禁止复用实验页的全局状态。
- [ ] 当前通话区提供静音、设备切换、网络质量和结束通话二次确认；上下文区展示脱敏资料、交接摘要、待处理事项、最近对话和必要业务资料。
- [ ] 收到 `AGENT_RECONNECT_TIMEOUT` 后进入快速话后确认并展示异常原因，不把任务重新放回待接池。
- [ ] 运行定向测试、`npm run tsc`，预期 PASS。
- [ ] 提交：`git commit -m "feat: 实现浏览器坐席媒体接听"`。

### 任务 5：实现快速话后确认和本人跟进

**文件：**
- 创建：`src/pages/agentWorkbench/components/QuickWrapUp.tsx`
- 创建：`src/pages/agentWorkbench/components/QuickWrapUp.test.tsx`
- 创建：`src/pages/agentWorkbench/components/FollowUpPanel.tsx`
- 创建：`src/pages/agentWorkbench/components/FollowUpPanel.test.tsx`

- [ ] 编写失败测试：只强制处理结果与是否跟进；摘要可空；提交后立即恢复 available；未接回访只能一人认领；关闭原因条件必填；终态只读。
- [ ] 运行定向测试确认 FAIL。
- [ ] 快速确认使用按钮/Radio，不弹出大表单；AI 摘要显示为草稿，录音和语义分析“处理中”不阻塞提交。
- [ ] 跟进分“待认领回访”和“我的跟进”；普通未接通只留痕并回 pending，不显示 30 分钟/2 小时等虚构时间；只有客户明确预约才选择准确时间。
- [ ] 人工回拨响应显示“任务已受理”，通过 call_id 查询/推送最终结果；拨号期间坐席不可认领另一通。
- [ ] 运行定向测试和 lint，预期 PASS。
- [ ] 提交：`git commit -m "feat: 完成坐席话后与跟进闭环"`。

### 任务 6：实现三个管理页面

**文件：**
- 创建：`src/pages/agentWorkbench/admin/agents/index.tsx`
- 创建：`src/pages/agentWorkbench/admin/agents/index.test.tsx`
- 创建：`src/pages/agentWorkbench/admin/handoffs/index.tsx`
- 创建：`src/pages/agentWorkbench/admin/handoffs/index.test.tsx`
- 创建：`src/pages/agentWorkbench/admin/followUps/index.tsx`
- 创建：`src/pages/agentWorkbench/admin/followUps/index.test.tsx`

- [ ] 为三个页面先写失败测试，覆盖规格 5.6 的指标、筛选、列、抽屉和按钮展示条件。
- [ ] 运行 `npm test -- src/pages/agentWorkbench/admin --runInBand`，预期 FAIL。
- [ ] 使用 ProTable 和项目统一查询布局；统计卡复用现有首页风格；表格操作列固定右侧，危险操作二次确认。
- [ ] 坐席管理只编辑档案与场景；转人工记录只对异常显示 reconcile/release；跟进管理不提供转交、批量分配或替坐席修改正常结果。
- [ ] bigint ID 全程按 string；电话号码只展示后端脱敏值；模型与话术配置在详情底部默认折叠。
- [ ] 运行三个页面测试、`npm run lint`，预期 PASS。
- [ ] 提交：`git commit -m "feat: 增加坐席中心管理页面"`。

### 任务 7：全模块回归和浏览器验收准备

**文件：**
- 修改：`src/pages/agentWorkbench/**/*.test.tsx`
- 修改：`config/routes.test.ts`
- 修改：`config/proxy.test.ts`

- [ ] 增加跨组件集成测试：bootstrap → 上线 → 新任务 → claim → connected → complete → wrap_up_quick → available。
- [ ] 增加冲突、刷新、断网、SSE 失败、录音处理中和回拨未接场景。
- [ ] 运行：

```bash
npm test -- src/pages/agentWorkbench src/services/ruoyi/agent-console.test.ts config/routes.test.ts config/proxy.test.ts --runInBand
npm run lint
npm run build
```

预期 Jest 0 failure、Biome/tsc 0 error、构建成功。

- [ ] 使用独立前端 worktree 启动真实页面进行双浏览器验收；不要在当前含有 `aiCallLab`、路由和律师页面未提交修改的工作树直接实现。
- [ ] 提交：`git commit -m "test: 补全坐席中心前端验收场景"`。
