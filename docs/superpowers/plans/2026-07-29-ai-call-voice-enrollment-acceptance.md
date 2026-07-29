# 自定义音色真实集成验收计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在自动化主流程通过后，用明确授权样本验证真实 Qwen 创建、产品试听、租户隔离、任务快照和删除闭环，并把 SIP 验收保持为单独的用户确认门禁。

**架构：** 先验证 provider 与数据库，再验证浏览器试听和产品交互，最后验证正式任务引用与删除。所有证据按 Qwen、数据库、对象存储、浏览器和 SIP 分层记录，任何一层不能替代另一层。

**技术栈：** AI Call FastAPI、Qwen Voice Enrollment、Qwen Realtime、LiveKit、MinIO、React 浏览器、PostgreSQL/SQLite 测试环境。

---

## 前置条件

- 后端计划任务 1～12 全部通过。
- 前端计划任务 1～9 全部通过。
- 使用声音权利人明确授权的 10～20 秒样本。
- 样本满足单声道、24 kHz 以上、WAV 16 bit 或 MP3/M4A、`<10 MB`。
- 测试环境有隔离租户 A 和租户 B。
- 真实 DashScope Key 仅通过服务端环境变量注入，不写入命令、截图或报告。
- 未获得用户“确认拨打”前，不触发真实 SIP/Linphone 电话。

### 任务 1：真实 Qwen 创建与本地发布

**证据文件：**

- 创建：`docs/livekit-ai-outbound/reports/2026-07-29-voice-enrollment-acceptance.md`

- [ ] **步骤 1：记录运行态来源**

记录：

```text
backend cwd
backend branch + commit
frontend cwd
frontend branch + commit
API listener PID 与 cwd
QWEN_REALTIME_MODEL
AI_CALL_VOICE_ENROLLMENT_ENABLED
数据库类型和隔离库名
```

不得记录任何密钥值。

- [ ] **步骤 2：通过产品上传授权样本**

浏览器 Network 必须显示：

```text
POST /ai-call/voice-enrollments
Idempotency-Key: <uuid>
Content-Type: multipart/form-data; boundary=<浏览器生成值>
HTTP 202
```

同一次未知结果重试时 Key 不变；新提交 Key 改变。

- [ ] **步骤 3：验证 provider 与数据库**

验证并记录：

- Qwen `action=list` 返回本任务 `preferred_name` 对应 voice。
- `ai_call_voice_enrollment.status = SUCCEEDED`。
- `ai_call_tenant_voice_profile.status = ENABLED`。
- `provider_voice` 与资产 `voice` 一致。
- tenant、target model 和 provider request ID 存在。
- 不记录 API Key、Base64 或完整录音。

- [ ] **步骤 4：验证临时样本清理**

对象存储中 `sample_object_key` 不存在，任务表该字段已清空，`sample_sha256` 保留。

- [ ] **步骤 5：验证租户隔离**

租户 A 可见该音色；租户 B 的管理列表和正式任务音色列表均不可见。

### 任务 2：真实浏览器 Realtime 试听

- [ ] **步骤 1：创建试听**

从音色管理页点击“试听”，Network 只出现试听会话 API 和 LiveKit 连接，不出现正式
外呼任务创建或 SIP 拨号请求。

- [ ] **步骤 2：验证固定文案和音频**

实际听到：

```text
您好，我是您的智能语音助手，很高兴为您服务。
```

记录浏览器音轨已订阅、实际播放、会话 call ID 和结束事件；不把页面按钮成功当成音频
成功。

- [ ] **步骤 3：验证隔离和释放**

播放完成或 30 秒后：

- LiveKit Room 已断开。
- 页面 audio 元素已移除。
- 没有创建正式 `ai_call_record`。
- 没有创建正式 `ai_call_outbound_task`。

### 任务 3：正式任务快照和删除门禁

- [ ] **步骤 1：创建但不拨打的定时任务**

用该音色创建一个未来时间的 `SCHEDULED` 任务，验证任务保存：

```text
voice
voice_name
voice_type
voice_target_model
```

- [ ] **步骤 2：验证阻塞删除**

删除预检查返回：

```text
deletable=false
blockingTaskCount>=1
blockingTaskIds 包含刚创建任务
```

DELETE 二次检查同样返回 409，Qwen delete 未被调用。

- [ ] **步骤 3：终结任务后发起删除**

把任务安全取消到 `CANCELLED`，再次预检查应：

```text
deletable=true
blockingTaskCount=0
historicalTaskCount>=1
```

确认删除后资产立即变为 `DELETING` 并退出正式任务可选列表。

- [ ] **步骤 4：验证 provider 删除和历史快照**

- Qwen `action=list` 不再返回该 voice。
- 本地资产状态 `DELETED`。
- 历史任务仍展示四项音色快照。
- 新任务不能选择或提交该 voice。

### 任务 4：真实失败与清理证据

- [ ] **步骤 1：使用明确非法但不敏感的测试样本**

分别验证：

- 前端可提前识别的扩展名/大小错误不发请求。
- 后端识别的采样率、声道或时长错误返回 422。
- Provider 明确拒绝时资产进入 `CREATE_FAILED`。

- [ ] **步骤 2：验证失败终态样本清理**

`CREATE_FAILED` 对应对象不存在、`sample_object_key` 清空、错误文案不包含密钥或
Base64，并可通过“重新上传”创建新 enrollment。

- [ ] **步骤 3：验证可重试故障**

在 Fake/代理故障注入环境验证 429、5xx、连接失败的 5/30/120 秒退避；验证结果未知进入
`RECONCILING`，provider create 只调用一次。

真实环境不通过重复制造收费创建请求来验证重试。

### 任务 5：SIP 验收单独门禁

- [ ] **步骤 1：等待用户明确确认拨打**

没有用户当次明确的“确认拨打”，本任务保持未勾选，不发起电话。

- [ ] **步骤 2：确认环境来源**

拨打前重新核对 listener PID/cwd、端口、数据库、Redis、LiveKit、FreeSWITCH 和
Linphone 注册状态，不跨 worktree 推断运行态。

- [ ] **步骤 3：执行一通受控测试**

使用明确测试号码和已授权音色，通过正式任务状态机发起，不创建独立产品“测试拨打”
路径。

- [ ] **步骤 4：验收真实媒体**

同时检查：

- SIP/LiveKit 事件链。
- 客户侧实际听到复刻音色。
- 主录音与参与者分轨。
- 对话文本和最终任务/目标状态。
- `session.update.voice` 使用预期 provider voice。

浏览器试听、health 200、代码存在或 `wait_for_playout` 均不能单独证明 SIP 客户已听到。

### 任务 6：完成报告

- [ ] **步骤 1：整理分层结论**

报告分别标记：

```text
AUTOMATED PASS/FAIL
QWEN CREATE PASS/FAIL
BROWSER PREVIEW PASS/FAIL
TENANT ISOLATION PASS/FAIL
DELETE GATE PASS/FAIL
TEMP OBJECT CLEANUP PASS/FAIL
SIP CUSTOMER AUDIO PASS/FAIL/NOT RUN
```

- [ ] **步骤 2：附最小必要证据**

只附脱敏 request ID、资产 ID、任务 ID、call ID、状态、时间和日志片段；不附手机号明文、
API Key、Authorization Header、Base64 或原始录音。

- [ ] **步骤 3：验证报告与 Git 范围**

```bash
git diff --check
git status --short
```

只有实际运行的门禁才能写 PASS；未运行项写 `NOT RUN` 并说明所缺权限或确认。
