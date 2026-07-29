# 通用外呼自定义音色设计规格

**状态：** 已完成产品与技术设计，等待书面规格审查

**日期：** 2026-07-29
**涉及项目：**

- 前端：`/Users/liuhongli/.codex/worktrees/a3cd/recov-ai-web-react`
- AI Call 后端：`/Users/liuhongli/.codex/worktrees/ed81/ai-call`

## 1. 背景与当前事实

通用外呼创建页当前通过 `/ai-call-lab-api/ai-call/voice-profiles?pageSize=200`
读取 AI Call 后端音色列表，并把选中的 `voice` 写入正式外呼任务。

当前存在两套不同的音色概念：

1. `/sys/voice` 使用 Java Recov 后端的 `/system/recov/call-config/voice/page`，
   服务于既有数字员工音色配置。
2. 通用外呼使用 AI Call 后端的 `/ai-call/voice-profiles`，最终把 Qwen
   `voice` 传给 `session.update.voice`。

两套接口的 ID、供应商和运行语义不同，本功能不得把它们直接合并。

AI Call 当前的 `POST /ai-call/voice-profiles` 只接收已经由百炼返回的
`voice` 并登记到本地 `ai_call_voice_profile`，没有在项目内调用
`qwen-voice-enrollment` 创建音色。因此当前能力只完成了“登记”，没有完成
“上传声音样本、创建 Qwen 音色、发布到通用外呼”的产品闭环。

## 2. 目标

第一版交付以下闭环：

1. 在通用外呼下新增独立的“音色管理”二级菜单。
2. 租户用户上传已获授权的声音样本。
3. AI Call 后端异步调用 Qwen Omni 声音复刻接口。
4. 单列表展示内置音色和当前租户自定义音色的生命周期状态。
5. 创建成功的音色可以通过浏览器隔离会话进行真实 Qwen Realtime 试听。
6. 正式外呼任务只能选择当前模型下状态为“可用”的音色。
7. 自定义音色在没有未结束任务引用时可以异步删除。
8. 成功或失败终态都删除原始声音样本，只保留必要审计元数据。

## 3. 非目标

第一版不包含：

- 合并或迁移现有 `/sys/voice` Java Recov 音色库。
- 从百炼全量同步官方内置音色或全部历史自定义音色。
- 删除、隐藏或修改 Qwen 官方内置音色。
- 自定义试听文案、语速、情绪或音量。
- 将复刻音色模型下载到本地部署。
- 用浏览器试听结果替代真实 SIP 客户侧验收。
- 未经用户再次确认发起真实电话拨打。

## 4. 架构与职责

### 4.1 Recov React 前端

前端负责：

- 菜单、权限和音色管理页面。
- 音色单列表、筛选、分页和状态展示。
- 创建弹窗、文件选择、授权确认和提交防重复。
- 创建、删除状态轮询。
- 删除引用结果和二次确认展示。
- 创建隔离试听会话并播放真实 Qwen 音频。
- 通用外呼创建页只展示可用音色。

前端不得：

- 持有 DashScope API Key。
- 直接调用 Qwen。
- 自己决定 `target_model`。
- 把 `tenant_id` 作为请求字段传给后端。
- 手写 multipart 的 `Content-Type`。

### 4.2 AI Call 后端

AI Call 是本功能唯一的音色能力负责人，负责：

- 从认证上下文解析 `tenant_id` 和操作人。
- 音频校验、临时私有存储和终态清理。
- 持久化音色资产、创建任务和删除任务。
- 调用 Qwen 创建、查询和删除音色。
- 外部调用幂等、重试、结果未知对账和本地落库补偿。
- 合并全局内置音色与当前租户自定义音色。
- 在正式外呼任务创建、校验和执行前重新校验音色。
- 创建和释放隔离的浏览器试听会话。

### 4.3 Qwen

Qwen 负责：

- 通过 `qwen-voice-enrollment` 创建自定义 `voice`。
- 通过 `action=list` 对账创建结果。
- 通过 `action=delete` 删除自定义 `voice`。
- 通过 `qwen3.5-omni-plus-realtime` 使用自定义音色生成试听和正式通话音频。

创建音色使用的 `target_model` 必须与后续 Realtime 会话模型完全一致。

## 5. 菜单与页面

### 5.1 菜单

在现有 AI Call／通用外呼菜单组下新增：

```text
通用外呼
├── 外呼任务
├── 通话记录
├── 音色管理
├── 线路配置
└── 呼叫规则
```

- 菜单名：`音色管理`
- 路径：`/ai-call/voices`
- 权限：`ai_call:voice:manage`

这不是新的顶级菜单，也不复用 `/sys/voice`。

### 5.2 单列表

页面不再使用“可用音色 / 创建记录”两个标签。所有音色资产放在同一个列表，
通过状态表达生命周期。

列表字段：

- 音色展示名与 provider `voice`
- 类型：内置／自定义复刻
- 性别
- 适用模型
- 状态
- 创建时间
- 操作

筛选条件：

- 类型
- 性别
- 状态

默认状态筛选为“未删除”，已删除记录只在用户主动选择时展示。

### 5.3 用户可见状态

| 状态 | 含义 | 允许操作 |
|---|---|---|
| `CREATING` | 已受理，正在调用或对账 Qwen | 无 |
| `ENABLED` | 可用于试听和正式外呼 | 试听；自定义音色可删除 |
| `CREATE_FAILED` | 创建失败，原始录音已删除 | 重新上传 |
| `DELETING` | 已退出外呼可选列表，正在删除 provider 音色 | 无 |
| `DELETE_FAILED` | provider 删除失败，仍不可用于新任务 | 重试删除 |
| `DELETED` | provider 已删除，本地仅保留审计 | 无 |

内置音色始终以 `ENABLED` 展示，不允许删除。

### 5.4 创建弹窗

字段：

- 音色展示名：必填，1～100 字符。
- 性别：必填，`未知 / 女声 / 男声`。
- 录音语种：必填，第一版默认 `zh`，使用 Qwen 支持的枚举值。
- 声音样本：必填，WAV、MP3 或 M4A。
- 录音文本：可选，必须与声音样本内容一致。
- 授权确认：必选。

授权文案：

> 我已获得声音权利人明确授权，并同意将录音发送至阿里云百炼进行声音复刻。

未勾选时不允许提交。

音频要求：

- WAV 仅支持 16 bit；同时支持 MP3、M4A。
- 推荐 10～20 秒，最长 60 秒。
- 小于 10 MB。
- 采样率不低于 24 kHz。
- 单声道。
- 至少 3 秒连续清晰人声，不包含背景音乐、噪声或其他人声。

### 5.5 提交后的交互

后端返回 `202` 后：

1. 关闭弹窗。
2. 新音色记录置顶，状态为“创建中”。
3. 页面可见时每 2 秒刷新活动状态；页面隐藏时停止轮询。
4. 成功后同一行变为“可用”。
5. 失败后同一行展示明确错误，并提供“重新上传”。
6. 不自动跳转或弹出其他页面。

## 6. 数据模型

数据库不使用 `jsonb`，不创建物理外键。所有 bigint ID 对前端按字符串输出。

### 6.1 全局内置音色

保留现有 `ai_call_voice_profile`：

- 保存 Qwen 官方内置音色。
- 继续由 `BUILTIN_QWEN_OMNI_REALTIME_VOICES` 幂等种入。
- 唯一约束保持 `target_model + voice`。
- 不增加租户字段。

### 6.2 租户音色资产

新增 `ai_call_tenant_voice_profile`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | bigint | 雪花主键 |
| `tenant_id` | varchar(64) | 租户 |
| `display_name` | varchar(100) | 展示名 |
| `voice` | varchar(128), nullable | Qwen 返回的 voice；创建中为空 |
| `voice_type` | varchar(32) | 固定为“自定义复刻” |
| `gender` | varchar(16) | 未知／女声／男声 |
| `language` | varchar(32) | 录音语种 |
| `target_model` | varchar(64) | 服务端绑定的 Realtime 模型 |
| `provider` | varchar(32) | 固定为 `aliyun_qwen` |
| `status` | varchar(32) | 资产状态 |
| `latest_enrollment_id` | bigint, nullable | 最新创建任务逻辑 ID |
| `provider_created_at` | timestamp, nullable | provider 创建时间 |
| `error_message` | varchar(1000), nullable | 当前可展示错误 |
| `created_by` | bigint | 创建用户 |
| `deleted_by` | bigint, nullable | 删除用户 |
| `deleted_at` | timestamp, nullable | 删除完成时间 |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

约束与索引：

- 唯一约束：`tenant_id + target_model + voice`。
- 索引：`tenant_id + status + updated_at`。
- 索引：`tenant_id + id`。
- 不创建物理外键。

### 6.3 音色创建任务

新增 `ai_call_voice_enrollment`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | bigint | 雪花主键 |
| `tenant_id` | varchar(64) | 租户 |
| `voice_profile_id` | bigint | 租户音色资产逻辑 ID |
| `idempotency_key` | varchar(128) | 一次提交的幂等 Key |
| `request_hash` | varchar(64) | 规范化请求与文件 SHA-256 |
| `preferred_name` | varchar(16) | 后端生成的 Qwen 名称前缀 |
| `language` | varchar(32) | 录音语种 |
| `transcript` | varchar(2000), nullable | 用户提供的录音文本 |
| `sample_object_key` | varchar(500), nullable | 临时私有对象键；终态后清空 |
| `sample_sha256` | varchar(64) | 原始文件摘要 |
| `status` | varchar(32) | 内部任务状态 |
| `provider_voice` | varchar(128), nullable | Qwen 返回的 voice |
| `provider_request_id` | varchar(128), nullable | Qwen request ID |
| `attempt_count` | integer | 已执行次数 |
| `next_retry_at` | timestamp, nullable | 下次重试时间 |
| `lease_owner` | varchar(128), nullable | Worker 租约持有者 |
| `lease_expires_at` | timestamp, nullable | 租约到期时间 |
| `error_message` | varchar(1000), nullable | 统一失败原因 |
| `consent_user_id` | bigint | 授权确认用户 |
| `consent_at` | timestamp | 授权确认时间 |
| `started_at` | timestamp, nullable | 开始时间 |
| `finished_at` | timestamp, nullable | 终态时间 |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

约束与索引：

- 唯一约束：`tenant_id + idempotency_key`。
- 索引：`status + next_retry_at + id`。
- 索引：`tenant_id + voice_profile_id + created_at`。
- 不创建物理外键。

内部状态：

```text
PENDING
  → PROCESSING
    → SUCCEEDED
    → RETRY_WAIT → PROCESSING
    → RECONCILING → SUCCEEDED / FAILED
    → FAILED
```

### 6.4 音色删除任务

新增 `ai_call_voice_deletion`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | bigint | 雪花主键 |
| `tenant_id` | varchar(64) | 租户 |
| `voice_profile_id` | bigint | 租户音色资产逻辑 ID |
| `idempotency_key` | varchar(128) | 删除提交幂等 Key |
| `status` | varchar(32) | PENDING／PROCESSING／RETRY_WAIT／SUCCEEDED／FAILED |
| `provider_request_id` | varchar(128), nullable | Qwen request ID |
| `attempt_count` | integer | 已执行次数 |
| `next_retry_at` | timestamp, nullable | 下次重试时间 |
| `lease_owner` | varchar(128), nullable | Worker 租约持有者 |
| `lease_expires_at` | timestamp, nullable | 租约到期时间 |
| `historical_task_count` | integer | 删除时历史任务引用数量 |
| `error_message` | varchar(1000), nullable | 统一失败原因 |
| `requested_by` | bigint | 删除用户 |
| `started_at` | timestamp, nullable | 开始时间 |
| `finished_at` | timestamp, nullable | 终态时间 |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

约束：

- 唯一约束：`tenant_id + idempotency_key`。
- 同一音色只能存在一个未结束的删除任务。
- 不创建物理外键。

## 7. API 契约

### 7.1 查询音色单列表

```http
GET /ai-call/voice-profiles
```

查询参数：

- `voiceType`
- `gender`
- `status`
- `targetModel`
- `includeDeleted=false`
- `pageNum`
- `pageSize`
- `availableOnly=false`

管理页面使用 `availableOnly=false`。正式外呼创建页使用
`availableOnly=true`，后端只返回：

- 当前模型的全局内置音色。
- 当前租户、当前模型、状态为 `ENABLED` 的自定义音色。

统一输出字段：

- `id: string`
- `scope: GLOBAL | TENANT`
- `voice: string | null`
- `displayName`
- `voiceType`
- `gender`
- `language`
- `targetModel`
- `status`
- `errorMessage`
- `canPreview`
- `canDelete`
- `createdAt`
- `updatedAt`

### 7.2 创建自定义音色

```http
POST /ai-call/voice-enrollments
Idempotency-Key: <uuid>
Content-Type: multipart/form-data; boundary=<browser-generated>
```

Parts：

- `file`：原始声音样本。
- `request`：JSON 字符串。

```json
{
  "displayName": "客服小林",
  "gender": "女声",
  "language": "zh",
  "transcript": "可选的录音对应文本",
  "consentConfirmed": true
}
```

`tenantId`、`targetModel` 和 `preferredName` 均不接受前端传入。

返回 `202`：

```json
{
  "data": {
    "voiceProfileId": "123456789",
    "enrollmentId": "123456790",
    "status": "CREATING",
    "displayName": "客服小林"
  }
}
```

### 7.3 创建失败后重新上传

```http
POST /ai-call/tenant-voice-profiles/{id}/enrollments
Idempotency-Key: <new-uuid>
```

只允许当前租户、状态为 `CREATE_FAILED` 的资产。请求仍使用 multipart，成功后同一
资产状态回到 `CREATING`。

### 7.4 查询创建任务

```http
GET /ai-call/voice-enrollments/{id}
```

仅用于状态详情和诊断；页面主要通过音色单列表刷新状态。

### 7.5 创建试听会话

```http
POST /ai-call/voice-preview-sessions
```

请求：

```json
{
  "voice": "qwen-omni-vc-..."
}
```

后端必须按当前租户和当前模型解析音色；前端不能传 `tenantId` 或
`targetModel`。内置音色和当前租户 `ENABLED` 自定义音色允许试听。

固定试听文案：

> 您好，我是您的智能语音助手，很高兴为您服务。

试听通过隔离 LiveKit/Qwen Realtime 会话生成真实音频：

- 不拨打电话。
- 不创建正式外呼任务。
- 不混入正式通话记录。
- 播放完成或 30 秒后自动释放。

浏览器连接成功后通过独立接口触发固定开场白，不复用会写正式通话记录的通用
browser-event 入口：

```http
POST /ai-call/voice-preview-sessions/{callId}/ready
DELETE /ai-call/voice-preview-sessions/{callId}
```

两个接口都必须校验当前租户对试听会话的所有权。DELETE 用于主动停止；服务端仍保留
30 秒兜底释放。

### 7.6 删除引用检查

```http
GET /ai-call/tenant-voice-profiles/{id}/deletion-check
```

输出：

```json
{
  "data": {
    "deletable": false,
    "blockingTaskCount": 2,
    "historicalTaskCount": 18,
    "blockingTaskIds": ["1001", "1002"]
  }
}
```

阻止删除的任务状态：

```text
SCHEDULED / RUNNING / PAUSING / PAUSED / STOPPING
```

不阻止删除的历史状态：

```text
STOPPED / COMPLETED / FAILED / CANCELLED
```

当前通用外呼没有独立持久化的“场景默认音色配置”，因此第一版引用检查只查询正式
外呼任务。未来新增持久化默认音色配置时，必须接入同一引用检查。

### 7.7 删除自定义音色

```http
DELETE /ai-call/tenant-voice-profiles/{id}
Idempotency-Key: <uuid>
```

删除接口必须在提交删除任务前再次执行引用检查，不能只信任预检查结果。

允许删除时返回 `202`，资产状态改为 `DELETING`，立即退出正式外呼可选列表。

如果存在阻塞引用，返回 `409`，并返回与预检查相同的阻塞信息。

## 8. Qwen Provider Adapter

新增独立的 Qwen 音色 Provider Adapter，不把 HTTP 调用写进 Controller 或数据库
Repository。

### 8.1 创建

请求：

```json
{
  "model": "qwen-voice-enrollment",
  "input": {
    "action": "create",
    "target_model": "qwen3.5-omni-plus-realtime",
    "preferred_name": "vc123456789",
    "audio": {
      "data": "data:audio/mp4;base64,..."
    },
    "text": "可选",
    "language": "zh"
  }
}
```

`preferred_name` 由后端根据音色资产 ID 生成，只包含数字、字母或下划线，最长
16 个字符。用户不填写该字段。

### 8.2 对账

创建调用超时且 provider 结果未知时：

1. 保存已有 `provider_request_id`。
2. 状态进入 `RECONCILING`。
3. 调用 `action=list` 查询由该任务生成的 `preferred_name` 对应音色。
4. 找到后补写本地资产并进入成功。
5. 未确认结果前禁止盲目再次执行 `action=create`。

### 8.3 删除

删除使用：

```json
{
  "model": "qwen-voice-enrollment",
  "input": {
    "action": "delete",
    "voice": "qwen-omni-vc-..."
  }
}
```

provider 删除成功后，资产进入 `DELETED`。失败进入 `DELETE_FAILED`，允许使用新的
幂等 Key 重试删除，但不得重新进入正式外呼可选列表。

## 9. 临时声音样本

1. 后端校验文件后上传到 AI Call 管理的私有对象存储前缀。
2. 任务表只保存私有 `sample_object_key`，不生成长期公开 URL。
3. 调用 Qwen 时优先把不超过限制的文件编码为 Data URL，避免公开 OSS URL。
4. Worker 在 `finally` 中删除临时对象。
5. `SUCCEEDED`、`FAILED` 两种终态都必须删除。
6. 删除成功后清空 `sample_object_key`，保留 `sample_sha256` 用于审计和幂等。
7. 清理失败不得伪装为成功；记录清理错误并由清理任务继续回收。

## 10. 幂等与前端防重复提交

### 10.1 Key 生成

一次新的用户操作生成一次 Key：

```ts
globalThis.crypto?.randomUUID?.() ||
  `voice-enrollment-${Date.now()}-${Math.random().toString(16).slice(2)}`
```

同一次请求发生超时或结果未知时必须复用原 Key。用户更换录音、修改业务字段后重新
提交，或后端已经明确受理后，下一次操作生成新 Key。

### 10.2 请求摘要

后端对以下内容生成规范化 SHA-256：

- 文件 SHA-256。
- 去除多余空白后的 `displayName`。
- `gender`。
- `language`。
- `transcript`。
- `consentConfirmed`。

相同租户、相同 Key：

- `request_hash` 相同：返回原资产和原任务，不重复调用 Qwen。
- `request_hash` 不同：返回 `409`。

### 10.3 前端三层保护

1. `submittingRef` 在发起异步请求前同步置为 `true`，拦截连续点击。
2. 提交按钮设置 `loading` 和 `disabled`，给用户明确反馈。
3. 后端 `Idempotency-Key` 处理网络重试、结果未知、刷新或多标签页重复请求。

不使用延迟首次操作的传统 300 ms debounce 作为主要防重手段。

## 11. 外呼任务集成

正式外呼创建、校验和执行前必须按以下条件解析音色：

- 内置：`target_model + voice` 匹配全局内置音色。
- 自定义：`tenant_id + target_model + voice + status=ENABLED` 匹配租户音色。

禁止只按裸 `voice` 查询。

任务必须保存以下快照：

- `voice`
- `voice_name`
- `voice_type`
- `voice_target_model`

音色删除后，历史任务仍展示快照，但不能用已删除音色创建或继续调度新任务。

任务创建页的音色字段旁增加“前往音色管理”链接，不在任务表单中直接创建音色。

## 12. 错误与重试

### 12.1 同步接口错误

- `422`：字段、授权或音频要求不合法。
- `403`：访问其他租户资产、任务或试听。
- `404`：资源不存在。
- `409`：幂等冲突、状态冲突或删除存在阻塞引用。

### 12.2 外部调用重试

- Qwen 参数、音频、鉴权类 4xx 不自动重试。
- `429`、`5xx`、连接失败最多自动重试 3 次。
- 退避时间：5 秒、30 秒、120 秒。
- 创建结果未知进入 `RECONCILING`，不直接再次创建。
- 删除重试前再次确认资产仍为 `DELETING` 或 `DELETE_FAILED`。

### 12.3 错误字段

所有可展示失败原因统一写入 `error_message`。不得保存或返回：

- DashScope API Key。
- 完整 Authorization Header。
- 原始声音 Base64。
- 含敏感内容的完整 provider 请求。

## 13. 权限与租户隔离

- 管理页面和写操作要求 `ai_call:voice:manage`。
- 正式外呼音色列表可按现有外呼任务权限读取可用音色。
- 生产环境必须从可信 JWT 或网关身份上下文解析权限声明；缺少
  `ai_call:voice:manage` 时管理列表和写操作返回 `403`，不能只依赖前端隐藏菜单。
- `tenant_id` 只取认证上下文。
- 所有租户自定义音色、创建任务、删除任务查询都必须带 `tenant_id`。
- 全局内置音色与租户自定义音色在服务层合并，不能通过关闭租户过滤读取所有自定义
  音色。

## 14. 测试设计

### 14.1 后端自动化测试

模型与 SQL：

- 租户字段、唯一约束和索引正确。
- 无物理外键、无 `jsonb`。
- bigint API 输出为字符串。

创建：

- multipart 文件和 JSON part 解析。
- 格式、大小、时长、采样率、声道、授权校验。
- `preferred_name` 生成规则。
- target model 由服务端决定。
- 相同幂等请求返回同一资产。
- 相同 Key、不同摘要返回 `409`。
- Provider 成功、明确失败、可重试失败、结果未知和本地落库补偿。
- 成功和失败都删除临时对象。

列表与租户：

- 全局内置音色对所有租户可见。
- 自定义音色只对所属租户可见。
- `availableOnly=true` 只返回 `ENABLED`。
- 其他租户不能试听、重新上传或删除。

试听：

- 只允许可用音色。
- 固定试听文案。
- 创建隔离会话。
- 超时或播放完成后释放。
- 不创建正式外呼任务和正式通话记录。

删除：

- 内置音色不能删除。
- 五种未结束任务状态阻止删除。
- 四种终态历史任务不阻止删除。
- DELETE 提交时再次检查引用。
- Provider 删除成功、失败和重试。
- 删除中、删除失败音色均不能进入任务可选列表。

外呼任务：

- 校验包含 tenant、target model、voice 和 ENABLED 状态。
- 保存四个音色快照字段。
- 删除后的历史任务仍可展示快照。

### 14.2 前端自动化测试

- 路由、菜单、权限和菜单注入。
- FormData 不手写 `Content-Type`。
- 请求携带 `Idempotency-Key`。
- 同一次结果未知重试复用 Key。
- `submittingRef + loading + disabled` 阻止重复提交。
- 授权未勾选不能提交。
- 音频基础校验和错误文案。
- 新记录置顶和活动状态可见轮询。
- 页面隐藏时停止轮询。
- 各状态对应操作正确。
- 删除阻塞与允许删除两种确认弹窗。
- 试听连接、播放、失败和自动释放。
- 外呼任务下拉框只消费可用音色。

### 14.3 集成测试

- Fake Qwen + Fake 对象存储跑通创建、失败、重试、清理和删除。
- Fake LiveKit + Fake Qwen 跑通固定文案试听。
- 数据库真实事务验证 claim、lease、唯一约束和并发删除引用检查。

## 15. 真实验收门禁

真实验收必须逐层记录证据：

1. 使用已明确授权的录音创建 Qwen 自定义音色。
2. Qwen `action=list` 能查到对应 `voice`。
3. 本租户音色列表显示“可用”，其他租户不可见。
4. 产品内试听真实播放该 Qwen Realtime 音色。
5. 通用外呼任务能够选择并保存音色快照。
6. 未结束任务引用时删除被阻止，并能查看阻塞任务。
7. 任务进入终态后允许删除。
8. Qwen 删除和本地 `DELETED` 状态均有证据。
9. 创建成功、创建失败两条路径都确认临时声音对象不存在。

浏览器真实试听只证明 Qwen/LiveKit 浏览器链路，不证明 SIP 客户已听到。真实电话验收必须
另行获得用户“确认拨打”，并继续检查 SIP 事件、录音、分轨和实际音频。

## 16. 分阶段门禁

### 阶段 A：数据与 Mock 主流程

- 新表、状态机、Repository、Provider Adapter 接口和 Worker。
- Fake Qwen 创建、对账、删除。
- 后端 API 与自动化测试通过。

阶段门禁：不接真实 Qwen，不修改正式外呼主链。

### 阶段 B：前端产品闭环

- 菜单、单列表、创建弹窗、状态刷新、试听 UI、删除 UI。
- 新建任务页可用音色筛选和跳转。
- 前端测试通过。

阶段门禁：Fake 后端环境完成浏览器交互回归。

### 阶段 C：真实 Qwen 创建与试听

- 使用明确授权样本。
- Provider 创建、list 对账、本地发布、浏览器试听和临时对象清理全部有证据。

阶段门禁：不拨打真实电话。

### 阶段 D：正式外呼集成验收

- 任务保存音色快照。
- 删除引用门禁有效。
- 用户明确确认后再安排真实 SIP/Linphone 验收。

阶段门禁：浏览器试听、健康检查或代码存在都不能替代真实 SIP 证据。
