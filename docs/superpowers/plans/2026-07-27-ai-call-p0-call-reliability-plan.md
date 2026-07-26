# AI Call 通话可靠性第一批修复实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐任务实现此计划。步骤使用复选框，严格执行 RED → GREEN → REFACTOR。

**目标：** 修复浏览器坐席和通话测试台最影响真实联调的五类可靠性问题：低电平麦克风仍允许上线、终态 409 冒泡、控制权丢失后持续请求、LiveKit 入会失败遗留会话、测试台孤儿会话长期占用。

**边界：** 第一批不调整 ASR、语义分析、转人工触发规则、提示词和 SIP 呼叫流程。只处理通话建立、坐席控制权、终态收口和孤儿会话回收。

**实现约束：**

- 前端工作区和后端工作树均存在用户的未提交改动；只做目标文件内的外科手术式修改。
- 除本计划文档外，不自动提交业务代码，避免把原有未提交变更一并纳入提交。
- 每个任务必须先新增失败测试并观察预期失败，再写最小实现。
- 前端使用现有 Ant Design Pro 交互模式，不引入新的 UI 框架或抽象层。

---

## 任务 1：统一解析和静默处理坐席控制台业务错误

**文件：**

- 修改：`src/services/ruoyi/agent-console.ts`
- 修改：`src/services/ruoyi/agent-console.test.ts`
- 修改：`src/pages/agentWorkbench/hooks/useAgentCall.ts`
- 修改：`src/pages/agentWorkbench/hooks/useAgentCall.test.tsx`

**验收标准：**

- 能从直返对象、`RuoyiError.response.data`、Axios `response.data.data` 三种结构读取 `errorCode` / `error_code`。
- `heartbeat`、待接列表和重连 token 请求使用 `skipErrorHandler: true`，预期业务冲突不再触发全局 “Response status:409”。
- `HANDOFF_STATE_CONFLICT`、`CUSTOMER_NOT_CONNECTED` 和 `AGENT_RECONNECT_TIMEOUT` 仍按终态进入话后处理，不显示网络错误。

**步骤：**

- [ ] 在 `agent-console.test.ts` 添加嵌套 409 错误码解析测试和三类请求的 `skipErrorHandler` 契约测试。
- [ ] 运行：

  ```bash
  npm test -- --runInBand src/services/ruoyi/agent-console.test.ts
  ```

  确认因缺少解析函数或请求选项而失败。

- [ ] 在 `agent-console.ts` 增加单一共享解析函数，并仅给上述预期冲突请求加静默选项。
- [ ] 在 `useAgentCall.test.tsx` 用真实 Axios/RuoYi 嵌套结构新增终态 409 测试。
- [ ] 运行：

  ```bash
  npm test -- --runInBand src/pages/agentWorkbench/hooks/useAgentCall.test.tsx
  ```

  确认旧解析逻辑无法收口。

- [ ] 让 `useAgentCall.ts` 复用共享解析函数；再次运行两个测试文件并确认通过。

## 任务 2：控制台 Session 冲突进入稳定的“控制权已转移”状态

**文件：**

- 修改：`src/pages/agentWorkbench/hooks/useAgentPresence.ts`
- 修改：`src/pages/agentWorkbench/hooks/useAgentPresence.test.tsx`
- 修改：`src/pages/agentWorkbench/index.tsx`
- 修改：`src/pages/agentWorkbench/index.test.tsx`

**验收标准：**

- 服务端活动 `console_session_id` 与当前标签页不一致时，页面进入 `conflicted`，不伪装成正常在线。
- 心跳返回 `CONSOLE_SESSION_CONFLICT` 后停止后续心跳和待接列表轮询。
- 页面明确提示“坐席控制权已转移到其他窗口”，并提供用户主动点击的“重新接管”操作。
- 只有用户主动重新接管后才重新执行麦克风预检并调用上线接口。

**步骤：**

- [ ] 在 `useAgentPresence.test.tsx` 添加 bootstrap Session 不一致、心跳冲突停止循环、显式重新接管三个失败测试。
- [ ] 运行：

  ```bash
  npm test -- --runInBand src/pages/agentWorkbench/hooks/useAgentPresence.test.tsx
  ```

  确认当前实现会持续 bootstrap/heartbeat 或错误进入 ready。

- [ ] 在 hook 中增加 `conflicted` phase 和统一冲突收口函数；冲突时清空本标签页可轮询的 presence 状态。
- [ ] 在 `index.test.tsx` 添加冲突提示和“重新接管”按钮测试。
- [ ] 查询当前 Ant Design 组件契约后，最小调整工作台按钮和提示文案。
- [ ] 运行：

  ```bash
  npm test -- --runInBand \
    src/pages/agentWorkbench/hooks/useAgentPresence.test.tsx \
    src/pages/agentWorkbench/index.test.tsx \
    src/pages/agentWorkbench/hooks/useAgentEvents.test.tsx
  ```

  确认冲突状态不会继续拉取业务数据。

## 任务 3：把麦克风预检改为约 2 秒的真实有效声压检测

**文件：**

- 新增：`src/pages/agentWorkbench/audio/devicePreflight.ts`
- 新增：`src/pages/agentWorkbench/audio/devicePreflight.test.ts`
- 修改：`src/pages/agentWorkbench/hooks/useAgentPresence.ts`
- 修改：`src/pages/agentWorkbench/hooks/useAgentPresence.test.tsx`
- 修改：`src/pages/agentWorkbench/index.tsx`

**验收标准：**

- 预检连续采样约 2 秒，不再只读一个瞬时样本。
- 采用 Float32 时域样本计算 RMS/dBFS；最高有效窗口低于 `-42 dBFS` 时阻止上线。
- 预检只提示用户“请正常说一句话”，不要求固定口令、不播报倒计时。
- 成功时返回输入设备名称、峰值 dBFS 和近似电平；失败时区分权限拒绝、无设备、信号过低。
- 所有 MediaStream track、AudioNode 和 AudioContext 均在结束后释放。

**步骤：**

- [ ] 为 RMS/dBFS、静音、正常语音和阈值判定编写纯函数失败测试。
- [ ] 为连续采样器编写 fake analyser / fake timer 失败测试，确认不是单帧判断。
- [ ] 运行：

  ```bash
  npm test -- --runInBand src/pages/agentWorkbench/audio/devicePreflight.test.ts
  ```

- [ ] 最小实现纯函数和连续采样器，并将 `runAgentDevicePreflight` 委托给新模块。
- [ ] 在 presence 测试中补充“检测中提示”和低电平不调用上线接口的测试。
- [ ] 运行：

  ```bash
  npm test -- --runInBand \
    src/pages/agentWorkbench/audio/devicePreflight.test.ts \
    src/pages/agentWorkbench/hooks/useAgentPresence.test.tsx
  ```

## 任务 4：测试台 LiveKit 入会失败立即回滚后端 Session

**文件：**

- 修改：`src/pages/aiCallLab/customer/livekitClient.ts`
- 修改：`src/pages/aiCallLab/customer/livekitClient.test.ts`
- 修改：`src/pages/aiCallLab/customer/index.tsx`
- 修改：`src/pages/aiCallLab/customer/index.test.tsx`

**验收标准：**

- LiveKit connect/publish 任一步失败时，停止本地音轨、断开 room、清理远端音频元素。
- 前端创建会话成功但入会失败时，立即调用后端结束接口并刷新状态。
- 后端结束成功时页面不再保留“正在通话”；结束失败时保留当前会话和“结束会话”按钮供人工收口，并显示可操作错误。

**步骤：**

- [ ] 在 `livekitClient.test.ts` 添加 connect/publish 失败释放资源测试并观察失败。
- [ ] 在 `index.test.tsx` 添加入会失败自动 end、end 失败保留手工结束入口两个测试并观察失败。
- [ ] 运行：

  ```bash
  npm test -- --runInBand \
    src/pages/aiCallLab/customer/livekitClient.test.ts \
    src/pages/aiCallLab/customer/index.test.tsx
  ```

- [ ] 实现本地媒体清理和前端回滚；再次运行测试确认通过。

## 任务 5：后端增加 90 秒 browser_ready 孤儿会话看门狗

**文件：**

- 修改：`/Users/liuhongli/.codex/worktrees/ed81/ai-call/app/services/ai_call/orchestrator.py`
- 修改：`/Users/liuhongli/.codex/worktrees/ed81/ai-call/tests/test_ai_call_phase_a_core.py`

**验收标准：**

- 仅 Web Session 在创建完成后启动看门狗；SIP Session 不受影响。
- 90 秒内收到 `browser_ready` 时取消看门狗。
- 超时且会话仍未 CONNECTED 时记录 `browser_ready_timeout` 并以同名 end reason 收口。
- 手工结束、浏览器断开、失败终态均取消对应任务，不产生重复完成事件。
- 测试可注入极短 timeout，不等待真实 90 秒。

**步骤：**

- [ ] 先为超时自动结束、ready 取消、提前结束无重复、SIP 不启动四个场景添加失败测试。
- [ ] 运行：

  ```bash
  cd /Users/liuhongli/.codex/worktrees/ed81/ai-call
  uv run pytest tests/test_ai_call_phase_a_core.py \
    -k "browser_ready_watchdog or browser_ready_report" -q
  ```

- [ ] 在 orchestrator 构造器增加默认 90 秒且可测试注入的 timeout；用按 call_id 管理的任务字典实现调度和取消。
- [ ] 在 `create_web_session` 成功返回前调度，在 `browser_ready` 和 `end_session` 中取消；避免看门狗任务取消自身。
- [ ] 再次运行定向测试确认通过。

## 任务 6：联合验证与变更审查

**文件：** 不新增功能，只验证和审查上述目标文件。

**步骤：**

- [ ] 运行全部前端定向测试：

  ```bash
  npm test -- --runInBand \
    src/services/ruoyi/agent-console.test.ts \
    src/pages/agentWorkbench/hooks/useAgentCall.test.tsx \
    src/pages/agentWorkbench/hooks/useAgentPresence.test.tsx \
    src/pages/agentWorkbench/hooks/useAgentEvents.test.tsx \
    src/pages/agentWorkbench/index.test.tsx \
    src/pages/agentWorkbench/audio/devicePreflight.test.ts \
    src/pages/aiCallLab/customer/livekitClient.test.ts \
    src/pages/aiCallLab/customer/index.test.tsx
  ```

- [ ] 运行前端类型检查：

  ```bash
  npm run tsc
  ```

- [ ] 运行后端定向测试：

  ```bash
  cd /Users/liuhongli/.codex/worktrees/ed81/ai-call
  uv run pytest tests/test_ai_call_phase_a_core.py \
    -k "browser_ready_watchdog or browser_ready_report or end_session" -q
  ```

- [ ] 对前后端目标文件执行 `git diff --check`，再逐文件审查 diff，确认没有夹带无关重构。
- [ ] 如果本地服务可用，完成一次浏览器冒烟：低电平阻止上线、正常语音通过、双标签页抢占、入会失败自动回滚、结束后无 409 冒泡。
- [ ] 如实记录无法完成的真实媒体链路验证和剩余风险。
