# 通用外呼音色管理轻量试听边界修正规格

**状态：** 已完成设计，待书面规格审查
**日期：** 2026-08-01
**涉及项目：**

- 前端：`/Users/liuhongli/.codex/worktrees/a3cd/recov-ai-web-react`
- AI Call 后端：`/Users/liuhongli/.codex/worktrees/ed81/ai-call`

## 1. 决策

音色管理页的“试听”只负责快速验证克隆音色的听感，不再创建 LiveKit Room，
不再复用完整 Web 通话会话，也不进入 DB-only Runtime/Owner/Command 控制面。

完整的 Qwen Realtime、LiveKit 音频、麦克风、打断和多轮对话验证保留在独立的
AI 通话测试功能中。正式 SIP 外呼仍是另一条需要单独授权和验收的业务链路。

本规格仅修正试听边界，不改变音色上传、异步复刻、租户隔离、删除、任务选择或
正式通话设计。

## 2. 对旧规格的覆盖关系

本规格覆盖以下文档中把产品试听定义为隔离 LiveKit/Qwen Realtime 会话的条款：

- `docs/superpowers/specs/2026-07-29-ai-call-voice-enrollment-design.md` 的
  第 2 节第 5 项目标、4.1、4.2、7.5 及其试听验收条款。
- `docs/superpowers/plans/2026-07-29-ai-call-voice-enrollment-backend.md` 的任务 8。
- `docs/superpowers/plans/2026-07-29-ai-call-voice-enrollment-frontend.md` 的任务 6。
- `docs/superpowers/plans/2026-07-29-ai-call-voice-enrollment-acceptance.md` 的任务 2。
- `docs/superpowers/plans/2026-07-30-ai-call-voice-enrollment-milestone-execution.md`
  中对应的 Realtime 试听步骤。

旧文档保留为实施历史；发生冲突时以本规格为准。

## 3. 用户体验

### 3.1 音色管理试听

用户在 `ENABLED` 音色行点击“试听”后：

1. 按钮进入“生成中”状态并禁止重复点击。
2. 后端使用所选音色生成固定试听文案。
3. 生成成功后，浏览器直接播放返回的音频。
4. 用户可以停止播放；切换音色或离开页面时停止当前音频并释放浏览器资源。
5. 生成失败时显示明确错误，不改变音色资产状态。

固定试听文案：

> 您好，我是您的智能语音助手，很高兴为您服务，请问现在方便沟通吗？

第一版不允许自定义试听文本、语速、情绪或音量，也不持久化试听音频。

### 3.2 AI 通话测试

AI 通话测试是独立入口。用户在该入口选择音色和业务场景后，才连接 LiveKit Room，
使用麦克风与 AI 进行实时多轮对话，并验证延迟、打断和上下文。

音色管理的“试听”不得跳转或隐式升级为 AI 通话测试。

## 4. 后端边界

### 4.1 API

新增轻量接口：

```http
POST /ai-call/voice-previews
Content-Type: application/json

{
  "voice": "qwen-omni-vc-..."
}
```

成功响应为 `audio/wav`，并设置 `Cache-Control: no-store`。前端将响应读取为 Blob
后播放。本接口不返回 `callId`、`roomName`、LiveKit URL 或 participant token。

### 4.2 音色解析与权限

后端必须从认证上下文取得租户和用户，并按服务端当前 `target_model` 解析音色：

- 允许当前模型的内置 `ENABLED` 音色。
- 允许当前租户、当前模型的自定义 `ENABLED` 音色。
- 其他租户、错误模型、不存在或非 `ENABLED` 音色不得生成试听。
- 前端不得提交 `tenantId`、`targetModel` 或 Provider 凭据。

### 4.3 音频生成

当前自定义音色绑定 `qwen3.5-omni-plus-realtime`。后端可以为生成音频建立最小的
Provider 连接，但不得创建 LiveKit Room 或完整 AI Call 会话。

后端通过专用 `VoicePreviewGenerator` 边界完成：

```text
voice + target_model + 固定文案
    -> Provider 音频生成
    -> 收集完整 PCM
    -> 封装为 WAV
    -> HTTP 响应
```

该生成器不得调用 `AiCallOrchestrator.create_web_session()`，不得依赖浏览器 ready
事件，也不得写入正式通话记录。

Provider 调用设置不超过 30 秒的硬超时。超时、取消或 Provider 错误时必须终止连接，
丢弃不完整音频，并分别返回可识别的超时或上游失败响应。

### 4.4 不产生的业务状态

一次音色试听不得创建、修改或占用：

- LiveKit Room、Participant 或麦克风轨道；
- 正式外呼任务、通话记录、Attempt、Handoff 或录音；
- Runtime Owner、Command、Effect、Reservation 或 Worker 容量；
- SIP Line、SIP Reservation、FreeSWITCH 或真实号码。

## 5. 前端边界

音色管理页继续保留一行一个“试听”按钮，但实现改为普通音频播放：

- 调用 `POST /ai-call/voice-previews` 获取音频 Blob。
- 使用浏览器 `Audio`/`HTMLAudioElement` 播放。
- 同一时间只播放一个音色。
- 停止、切换和卸载时暂停音频并 `URL.revokeObjectURL()`。
- 不导入 `livekit-client`，不申请麦克风权限，不连接 Room。

旧的 `/ai-call/voice-preview-sessions`、`ready`、`DELETE` 会话接口不再由音色管理页
调用。确认没有其他调用方后，在实现阶段删除对应前后端会话代码；AI 通话测试继续使用
自己的正式 Web/Realtime 会话入口。

## 6. 错误行为

- 音色不存在、越权或不属于当前模型：返回 `404`，不泄露其他租户资产。
- 音色未启用：返回 `409`。
- Provider 超时：返回 `504`，前端提示“试听生成超时，请重试”。
- Provider 失败或音频无效：返回 `502`，前端提示“试听生成失败，请稍后重试”。
- 浏览器播放被阻止：保留生成结果到当前 Blob，提示用户再次点击播放；不得重新调用
  Provider。

失败不得把音色改为不可用，也不得生成残留 Room、Runtime 记录或持久化试听文件。

## 7. 验收标准

### 7.1 自动化测试

后端使用 Provider Stub 验证：

- 固定文案、正确 voice 和当前模型传给生成器。
- 内置音色和当前租户 `ENABLED` 音色允许试听。
- 跨租户、错误模型和非 `ENABLED` 音色拒绝。
- 成功返回可解析的 WAV。
- 超时、取消、Provider 异常和空音频都不返回成功音频。
- 不创建 Room、正式记录或 Runtime 控制面事实。

前端验证：

- 点击“试听”只请求轻量音频接口。
- 成功后播放 Blob；停止、切换和卸载均释放对象 URL。
- 生成期间阻止重复请求。
- 失败提示准确且不会显示“播放中”。
- 测试中不实例化 LiveKit `Room`，不请求麦克风权限。

### 7.2 分层验收

- 音色管理试听通过，只证明该音色能生成并播放固定文案。
- AI 通话测试通过，才证明 Qwen Realtime + LiveKit 浏览器对话链路。
- 真实 SIP 客户端验收通过，才证明正式电话媒体链路。

三层证据不得互相替代。

## 8. 非目标

本次不包含：

- 自定义试听文案或多段试听音频。
- 试听音频持久化、CDN、跨会话缓存或下载。
- 修改 AI 通话测试、正式外呼、SIP 或 LiveKit 的既有业务链路。
- 真实 Provider、真实 LiveKit、真实 SIP 或真实号码验收。
- 为试听引入新的 Runtime Command、Owner、Reservation 或恢复状态机。
