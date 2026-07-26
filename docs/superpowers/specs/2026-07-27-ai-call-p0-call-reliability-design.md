# AI Call 通话可靠性第一批修复设计

## 背景

2026 年 7 月 27 日最新双机通话 `call_339815847924006912` 已跑通 AI 会话、转人工、录音、离线 ASR、语义分析和话后处理，但暴露出四个会直接影响商用可用性的可靠性问题：

- 人工坐席成功接入后，坐席分轨讲话平均电平约为 `-50 dBFS`，客户基本听不到坐席。
- 客户结束通话后，坐席端把正常的远端断开误当成网络故障并申请重连；后端已进入终态，因此返回 `HANDOFF_STATE_CONFLICT`，公共请求层又把它显示成 `Response status:409`。
- 失去坐席控制权的标签页仍持续发送心跳和待接池查询，产生重复的 `CONSOLE_SESSION_CONFLICT`。
- 浏览器未进入 `browser_ready` 时，已创建的模型会话没有及时回收，最终等待供应商 300 秒空闲超时，形成幽灵会话。

本设计只处理上述第一批可靠性问题。实时 ASR、话术长度、立即转人工与稍后跟进的意图拆分、语义分析质量在本批真实复测通过后单独设计和实施。

## 目标

- 只有检测到可用麦克风和有效讲话电平的坐席才能上线。
- 正常结束通话后，坐席直接进入话后处理，不显示 409，也不发起无意义重连。
- 标签页失去坐席控制权后立即停止心跳和待接池查询，除非用户主动重新接管。
- 浏览器连接失败、刷新或关闭导致未进入 `browser_ready` 时，后端会话能被及时回收。
- 保持现有录音完整性、转人工状态机、权限模型和公共待接池边界不变。

## 非目标

- 不修改 Qwen Realtime、Qwen3 离线 ASR、转写合并或语义分析策略。
- 不修改 AI 话术、转人工工具定义或跟进任务业务规则。
- 不把结束接口的录音停止流程改成异步任务。
- 不新增复杂设备管理、自动麦克风增益调节或浏览器外系统音频控制。
- 不处理或提交 `.playwright-cli/`、律师业务页面及其他无关工作区改动。

## 方案选择

采用前后端协同方案：

- React 坐席工作台负责设备预检、终态断开识别、控制权冲突收敛和预期错误的本地展示。
- React 通话测试台在本次创建的 LiveKit 连接失败时主动结束后端会话。
- Python AI Call 后端以 90 秒 `browser_ready` 超时作为最终兜底，覆盖刷新、崩溃、断网和前端来不及清理的情况。

不采用纯前端方案，因为页面崩溃或浏览器被强制关闭时前端无法可靠发送清理请求；也不在本批同时修改 ASR 和转人工语义，以免扩大运行主链的回归范围。

## 麦克风预检

### 触发时机

坐席点击“上线”后、调用后端上线接口之前执行。页面提示“请正常说一句话以检测麦克风”，不要求固定口令，不播放倒计时。

### 检查顺序

1. 检查 `getUserMedia`、`AudioContext` 和 `RTCPeerConnection` 能力。
2. 检查网络在线状态。
3. 使用与真实接听相同的音频约束申请麦克风：
   - `autoGainControl: true`
   - `echoCancellation: true`
   - `noiseSuppression: true`
4. 连续采样约 2 秒，不再使用创建分析器后立即读取一次的瞬时值。
5. 计算采样窗口内的最大 RMS 和峰值，并转换为 dBFS。
6. 最大 RMS 低于 `-42 dBFS` 时判定“未检测到有效讲话声音”，不允许上线。
7. 预检结束后立即停止临时音轨并关闭 `AudioContext`。

### 页面反馈

- 成功：显示当前输入设备名称和检测到的输入电平，允许上线。
- 权限失败：提示在浏览器地址栏允许麦克风。
- 无设备：提示检查麦克风连接和系统输入设备。
- 电平过低：提示检查是否静音、是否选错设备以及系统输入音量。

设备名称只用于当前页面展示，不发送到后端，不持久化。

## 正常结束与重连

LiveKit `Disconnected` 事件不能直接等价为网络故障。

处理顺序调整为：

1. 若本地正在主动断开，直接忽略。
2. 若当前通话已处于 `ending`、`ended` 或 `wrap_up_quick`，直接进入或保持话后处理。
3. 其他情况下才申请 reconnect token。
4. reconnect token 返回 `HANDOFF_STATE_CONFLICT` 或 `CUSTOMER_NOT_CONNECTED` 时，视为通话已经结束，进入 `wrap_up_quick`。
5. `AGENT_RECONNECT_TIMEOUT` 仍按异常断线进入快速话后处理。
6. 只有其余未知错误进入通话错误状态。

reconnect token 请求设置 `skipErrorHandler: true`。预期的终态冲突由坐席 Hook 自己解释，公共请求层不得再弹出 `Response status:409`。

## 坐席控制权冲突

### 状态判定

坐席控制权以服务端 `console_session_id` 为权威。以下任一情况都进入本标签页的 `conflicted` 状态：

- bootstrap 返回的在线 presence 所属 `console_session_id` 与本标签页不一致。
- 心跳返回 `CONSOLE_SESSION_CONFLICT`。
- 待接池查询返回 `CONSOLE_SESSION_CONFLICT`。

### conflicted 状态行为

- 清空本标签页可接听状态，不再把服务端另一个标签页的 `available` 当成本页可接听。
- 立即停止心跳、SSE 事实刷新和 5 秒待接池查询。
- 清空本页待接列表。
- 显示“坐席已在其他标签页接管，本页已停止接单”。
- 保留一个明确的“重新接管”操作；只有用户主动点击后才调用上线接口并恢复轮询。

心跳、待接池和 reconnect token 请求均关闭公共错误弹窗。业务组件负责显示一次可理解的状态，不产生循环错误提示。

## 未入会会话回收

### 前端即时回滚

通话测试台在创建会话后连接 LiveKit 或发布麦克风失败时：

1. 断开已部分创建的本地 Room 和音轨。
2. 调用当前 Call ID 的结束接口，结束原会话。
3. 刷新该 Call ID 的观测结果。
4. 提示“麦克风连接失败，会话已自动结束”。

如果结束接口也失败，页面保留 Call ID 和手动结束操作，不创建第二通会话覆盖现场。

### 后端最终兜底

Web 会话创建成功后启动 90 秒 ready watchdog：

- 收到该 Call ID 的 `browser_ready` 后取消 watchdog。
- 90 秒内未收到 `browser_ready`，且会话仍未进入终态时，以 `browser_ready_timeout` 结束会话并清理模型、Room 和录音资源。
- 会话已经结束时 watchdog 幂等退出。
- 记录 `browser_ready_timeout` 和正常 `session_completed` 事件，便于测试台复盘。
- SIP 会话不启用该 watchdog。

应用关闭时取消所有尚未完成的 watchdog task，避免任务泄漏。

## 错误契约

前端统一从以下形态读取业务错误码：

- `RuoyiError.response.data.errorCode`
- Axios `error.response.data.data.errorCode`
- 测试或内部调用的 `error.data.errorCode`
- 直接的 `error.errorCode`

`HANDOFF_STATE_CONFLICT`、`CUSTOMER_NOT_CONNECTED` 和 `CONSOLE_SESSION_CONFLICT` 是可预期业务状态，不进入公共 HTTP 错误弹窗；未知 4xx/5xx 仍按现有方式展示。

## 测试策略

### React

- 麦克风连续采样检测到有效电平时通过。
- 只有权限但 2 秒内没有有效声音时失败，且不调用上线接口。
- 实际 Axios/RuoYi 嵌套错误能提取业务错误码。
- 正常终态断开不显示 409，并进入 `wrap_up_quick`。
- 心跳或待接池返回 `CONSOLE_SESSION_CONFLICT` 后停止后续轮询。
- 用户主动重新接管后才恢复在线状态。
- LiveKit 连接失败会结束刚创建的 Call ID；结束失败时保留手动恢复入口。

### Python

- Web 会话 90 秒未收到 `browser_ready` 时自动结束。
- `browser_ready` 会取消 watchdog。
- 已终态会话的 watchdog 不重复结束。
- SIP 会话不创建 browser ready watchdog。
- 服务关闭会取消剩余 watchdog。

## 验收标准

1. 坐席不说话或输入电平低于阈值时无法上线，并看到明确设备提示。
2. 正常讲话时预检通过，现有上线、待接和认领流程不受影响。
3. 客户点击结束后，坐席直接进入话后处理，不再看到 409。
4. 失去控制权的标签页停止心跳和待接池请求，后端不再持续产生 `CONSOLE_SESSION_CONFLICT`。
5. LiveKit 连接失败后，刚创建的会话被结束。
6. 页面崩溃等前端无法清理的情况下，Web 会话在 90 秒内自动进入 `browser_ready_timeout` 终态。
7. 前端定向 Jest、TypeScript、Ant Design lint 和 build 通过。
8. 后端定向 pytest、Ruff 和运行时健康检查通过。
9. 双机复测中人工坐席分轨能够稳定识别正常讲话，客户侧能清晰听到坐席。
