# 通用 AI 外呼任务 API 契约

## 1. 适用范围

本文约定 `recov-ai-web-react` 通用外呼任务 V1 使用的前后端接口、字段、状态和异步语义。

- 外呼接口统一通过前端代理前缀 `/ai-call-agent-api` 访问。
- 下文业务路径均以 `/ai-call` 开头。
- 公共 OSS 上传沿用若依接口 `POST /resource/oss/upload`。
- 所有 ID 均以字符串返回，禁止以前端 `number` 承载 `bigint`。
- 本契约不包含物业催收适配、数据看板、任务事件页和真实 SIP 调度实现。

## 2. 统一响应

普通接口：

```ts
type ApiResponse<T> = {
  code: number;
  msg?: string;
  data?: T;
};
```

分页接口：

```ts
type TableDataInfo<T> = {
  code: number;
  msg?: string;
  rows: T[];
  total: number;
};
```

规则：

- `code === 200` 表示请求成功，其他值由若依请求层统一抛错。
- 普通业务数据必须位于 `data`。
- 分页数据必须位于顶层 `rows` 和 `total`，不能嵌套到 `data`。
- 前端拒绝没有 `code` 的裸对象、裸数组和 `{ data: { rows, total } }`。
- 下载成功直接返回 Blob；下载失败返回 `{ code, msg }` JSON。
- 异步创建或动作接口成功仅表示“已受理”，不表示业务状态已经完成。

## 3. 核心类型

```ts
type TaskStatus =
  | 'SCHEDULED'
  | 'RUNNING'
  | 'PAUSING'
  | 'PAUSED'
  | 'STOPPING'
  | 'STOPPED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

type TargetStatus =
  | 'PENDING'
  | 'DIALING'
  | 'IN_CALL'
  | 'RETRY_WAIT'
  | 'COMPLETED'
  | 'CANCELLED';

type ValidationStatus =
  | 'VALIDATING'
  | 'PASSED'
  | 'FAILED'
  | 'SYSTEM_ERROR';

type TaskMode = 'single' | 'batch';
type ExecutionMode = 'immediate' | 'scheduled';

type AiCallTask = {
  taskId: string;
  taskName: string;
  taskMode: TaskMode;
  status: TaskStatus;
  totalTargets: number;
  completedTargets: number;
  connectedTargets: number;
  failedTargets: number;
  executionMode: ExecutionMode;
  scheduledAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  promptProfileId?: string | null;
  promptName: string;
  sceneCode: string;
  voice: string;
  voiceName?: string | null;
  ruleId: string;
  ruleName: string;
  ruleSummary: string;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string | null;
};

type AiCallTaskTarget = {
  targetId: string;
  taskId: string;
  customerName?: string | null;
  phoneNumber: string;
  status: TargetStatus;
  attemptCount: number;
  latestResult?: string | null;
  updatedAt: string;
};

type ValidationIssue = {
  issueId: string;
  rowNumber: number;
  phoneNumber?: string | null;
  customerName?: string | null;
  reasons: string[];
  duplicateRowNumbers?: number[];
};

type CallWindow = {
  startTime: string;
  endTime: string;
};

type AiCallRule = {
  ruleId: string;
  ruleName: string;
  enabled: boolean;
  callWindows: CallWindow[];
  retryCount: number;
  retryIntervalsMinutes: number[];
  retryableResults: string[];
  updatedAt: string;
};

type AiCallRuleMetadata = {
  maxRetryCount: number;
  retryableResults: Array<{
    value: 'no_answer' | 'busy' | 'call_failed';
    label: string;
  }>;
};
```

## 4. 任务接口

| 方法 | 路径 | 响应 | 说明 |
| --- | --- | --- | --- |
| GET | `/ai-call/outbound-tasks` | `TableDataInfo<AiCallTask>` | 任务分页 |
| GET | `/ai-call/outbound-tasks/{taskId}` | `ApiResponse<AiCallTask>` | 任务详情 |
| POST | `/ai-call/outbound-tasks` | `ApiResponse<{ taskId: string; accepted: true }>` | 根据已通过的校验结果创建任务 |
| PUT | `/ai-call/outbound-tasks/{taskId}/schedule` | `ApiResponse<{ accepted: true }>` | 修改待执行任务名称和时间 |
| POST | `/ai-call/outbound-tasks/{taskId}/pause` | `ApiResponse<{ accepted: true }>` | 受理暂停 |
| POST | `/ai-call/outbound-tasks/{taskId}/resume` | `ApiResponse<{ accepted: true }>` | 受理恢复 |
| POST | `/ai-call/outbound-tasks/{taskId}/stop` | `ApiResponse<{ accepted: true }>` | 受理停止 |
| POST | `/ai-call/outbound-tasks/{taskId}/cancel` | `ApiResponse<{ accepted: true }>` | 受理取消待执行任务 |
| GET | `/ai-call/outbound-tasks/{taskId}/targets` | `TableDataInfo<AiCallTaskTarget>` | 外呼对象分页 |

任务分页请求示例：

```http
GET /ai-call/outbound-tasks?pageNum=1&pageSize=20&status=RUNNING&taskName=回访
```

```json
{
  "code": 200,
  "msg": "操作成功",
  "rows": [
    {
      "taskId": "210000000000000001",
      "taskName": "合同审查客户回访",
      "taskMode": "batch",
      "status": "RUNNING",
      "totalTargets": 100,
      "completedTargets": 35,
      "connectedTargets": 18,
      "failedTargets": 5,
      "executionMode": "immediate",
      "promptName": "合同审查产品介绍",
      "sceneCode": "intro_contract",
      "voice": "Cherry",
      "ruleId": "rule-1",
      "ruleName": "工作日规则",
      "ruleSummary": "09:00–18:00，最多重试 2 次",
      "createdAt": "2026-07-27 09:00:00",
      "updatedAt": "2026-07-27 09:10:00"
    }
  ],
  "total": 1
}
```

创建任务请求必须携带 `Idempotency-Key`：

```http
POST /ai-call/outbound-tasks
Idempotency-Key: 9f00ca51-2f6a-4b93-8771-214a9c23ca0a
Content-Type: application/json
```

```json
{
  "validationId": "validation-1",
  "taskName": "合同审查客户回访",
  "taskMode": "batch",
  "promptProfileId": "prompt-1",
  "sceneCode": "intro_contract",
  "voice": "Cherry",
  "ruleId": "rule-1",
  "executionMode": "immediate"
}
```

```json
{
  "code": 200,
  "msg": "任务创建已受理",
  "data": {
    "taskId": "210000000000000001",
    "accepted": true
  }
}
```

前端收到上述结果后必须继续查询任务详情，不能直接显示“任务已执行”。

## 5. 名单校验接口

| 方法 | 路径 | 响应 | 说明 |
| --- | --- | --- | --- |
| POST | `/ai-call/outbound-targets/import-template` | Blob | 下载 `外呼名单导入模板.xlsx` |
| POST | `/ai-call/outbound-validations/single` | `ApiResponse<ValidationResult>` | 同步校验单号码任务 |
| POST | `/ai-call/outbound-validations/batch` | `ApiResponse<ValidationResult>` | 创建批量异步校验 |
| GET | `/ai-call/outbound-validations/{validationId}` | `ApiResponse<ValidationResult>` | 查询校验状态与摘要 |
| GET | `/ai-call/outbound-validations/{validationId}/issues` | `TableDataInfo<ValidationIssue>` | 问题数据分页 |
| GET | `/ai-call/outbound-validations/{validationId}/issues/export` | Blob | 下载全部问题明细 |

`ValidationResult`：

```ts
type ValidationResult = {
  validationId: string;
  status: ValidationStatus;
  validTargetCount: number;
  issueCount: number;
  issueStats?: Record<string, number>;
  errorMessage?: string | null;
  accepted?: boolean;
};
```

批量名单固定使用两段式处理：

1. 前端调用 `POST /resource/oss/upload` 上传原文件，取得字符串 `ossId`。
2. 前端以 JSON 调用批量校验接口。

批量校验请求示例：

```json
{
  "ossId": "220000000000000001",
  "originalFilename": "外呼名单.xlsx",
  "request": {
    "taskName": "合同审查客户回访",
    "taskMode": "batch",
    "promptProfileId": "prompt-1",
    "sceneCode": "intro_contract",
    "voice": "Cherry",
    "ruleId": "rule-1",
    "executionMode": "scheduled",
    "scheduledAt": "2026-07-28 10:00:00"
  }
}
```

受理响应：

```json
{
  "code": 200,
  "msg": "名单校验已受理",
  "data": {
    "validationId": "validation-1",
    "status": "VALIDATING",
    "validTargetCount": 0,
    "issueCount": 0,
    "accepted": true
  }
}
```

前端每 2 秒查询校验结果，直到 `PASSED`、`FAILED` 或 `SYSTEM_ERROR`。网络超时不能被当作业务校验失败。

- `PASSED`：显示有效对象数量与人工确认摘要。
- `FAILED`：禁止创建任务，分页显示原文件行号、手机号、原因和重复行。
- `SYSTEM_ERROR`：显示 `errorMessage`；文件仍有效时允许复用原 `ossId` 重新创建校验。

批量校验接口不接收 `multipart/form-data`，也不接收公开文件 URL。

## 6. 呼叫规则接口

| 方法 | 路径 | 响应 | 说明 |
| --- | --- | --- | --- |
| GET | `/ai-call/outbound-rules` | `TableDataInfo<AiCallRule>` | 可用规则分页 |
| GET | `/ai-call/outbound-rules/meta` | `ApiResponse<AiCallRuleMetadata>` | 查询平台上限和结果枚举 |
| POST | `/ai-call/outbound-rules` | `ApiResponse<AiCallRule>` | 创建规则 |
| PUT | `/ai-call/outbound-rules/{ruleId}` | `ApiResponse<AiCallRule>` | 更新规则 |
| DELETE | `/ai-call/outbound-rules/{ruleId}` | `ApiResponse<null>` | 软删除规则 |

规则保存请求示例：

```json
{
  "ruleName": "工作日规则",
  "enabled": true,
  "callWindows": [
    {
      "startTime": "09:00",
      "endTime": "12:00"
    },
    {
      "startTime": "14:00",
      "endTime": "18:00"
    }
  ],
  "retryCount": 2,
  "retryIntervalsMinutes": [30, 120],
  "retryableResults": ["no_answer", "busy"]
}
```

软删除后：

- 规则不再出现在规则列表和新任务选项中。
- 已创建任务继续使用创建时的规则快照。
- 引用该规则但尚未创建任务的校验结果失效。
- 确认创建时发现规则已删除，后端返回明确错误。

## 7. 状态流转

任务主状态：

```text
立即任务：RUNNING → PAUSING → PAUSED → RUNNING
                 └──────────────→ STOPPING → STOPPED
                 └──────────────────────────→ COMPLETED
                 └──────────────────────────→ FAILED

定时任务：SCHEDULED → RUNNING
                    └→ CANCELLED
```

- 暂停和停止均为平滑操作，不强制挂断已振铃或已接通的通话。
- `PAUSING`、`STOPPING` 期间前端只允许查看。
- 单个号码无人接听或呼叫失败不等于任务 `FAILED`。
- 任务进度按 `completedTargets / totalTargets` 计算，不按通话记录数量计算。

外呼对象状态：

```text
PENDING → DIALING → IN_CALL → COMPLETED
                  └→ RETRY_WAIT → DIALING
PENDING / RETRY_WAIT → CANCELLED
```

对象处理状态与最近一次拨打结果分开保存。同一对象每次重试产生独立 `callId` 和通话记录。

## 8. 错误语义

| 场景 | 建议 `code` | `msg` / `errorMessage` 语义 |
| --- | --- | --- |
| 参数或手机号格式错误 | 400 | 指明字段或原文件行 |
| 未认证 | 401 | 由统一登录流程处理 |
| 无权限 | 403 | 指明缺少任务或规则权限 |
| 任务、规则或校验不存在 | 404 | 指明失效对象 |
| 状态冲突或配置已失效 | 409 | 指明当前状态及允许动作 |
| 幂等键冲突 | 409 | 返回原任务或明确冲突原因 |
| 文件不存在或租户无权读取 | 422 | 要求重新上传完整名单 |
| 名单业务校验失败 | 422 | 返回 `FAILED` 和问题明细 |
| 系统内部错误 | 500 | 返回可展示的 `errorMessage` |

任务级系统失败统一保存 `errorMessage`。单次拨打失败保存到对应通话记录，并根据规则决定是否重试。

## 9. 前端轮询

- 任务列表存在 `RUNNING`、`PAUSING`、`STOPPING` 时每 10 秒刷新当前页。
- 任务详情处于上述活动状态时每 5 秒刷新摘要和当前对象页。
- 批量校验处于 `VALIDATING` 时每 2 秒查询。
- 页面不可见、组件卸载或进入终态后必须停止轮询。
- 暂停、恢复、停止、取消成功后提示“操作已受理”，并以服务端后续状态为准。
