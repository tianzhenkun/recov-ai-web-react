# 通用 AI 外呼任务前端 V1 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在 `recov-ai-web-react` 中实现通用外呼任务、呼叫规则、名单校验、任务运行管理及与统一通话记录的前端闭环。

**架构：** 新增 `aiCallTasks` 和 `aiCallRules` 两个独立页面模块，页面级 service 统一访问 `/ai-call-agent-api/ai-call/outbound-*` 契约；开发环境使用同契约的 Umi Mock 跑通流程，生产环境不回退 Mock。外呼任务只保存对提示词配置的选择，真正的配置快照、名单处理、调度和 SIP 拨号由后端负责；通话记录页面只做字段与筛选增量，不复制到任务详情。

**技术栈：** React 19、TypeScript 6、Umi Max 4、Ant Design 6、Ant Design ProComponents 3、Jest 30、Testing Library、Umi Mock。

---

## 0. 实施边界与成功口径

本计划只覆盖当前前端仓库：

- 页面、交互、权限路由、服务契约、开发 Mock、单元测试和浏览器验收。
- Mock 模式验收表示前端流程可用，不表示真实后端、任务调度、SIP 外呼或配置快照已经接通。
- 真实联调前，后端必须在所属仓库实现第 2 节列出的接口，并返回字符串 ID。
- 第一阶段不创建数据看板路由或页面。
- 不修改物业催收页面及接口。
- 不修改浏览器通话测试台的 LiveKit、麦克风或会话创建逻辑。

完成口径分两层：

1. **前端完成：** 定向测试、TypeScript、Ant Design lint、生产构建和 Mock 浏览器流程全部通过。
2. **真实联调完成：** 后端接口可用，并以真实任务验证校验、确认、暂停、恢复、停止、通话归档及记录跳转。

## 1. 文件结构

### 1.1 新建文件

- `docs/recov/2026-07-27-ai-call-outbound-api-contract.md`：给前后端共同使用的接口、字段、状态和异步语义。
- `src/pages/aiCallTasks/domain.ts`：任务、外呼对象、校验结果、状态和展示映射。
- `src/pages/aiCallTasks/domain.test.ts`：状态动作、终态、轮询条件和进度计算测试。
- `src/pages/aiCallTasks/service.ts`：任务、名单校验、外呼对象和任务动作请求。
- `src/pages/aiCallTasks/service.test.ts`：路径、参数、FormData、幂等头和 Blob 下载测试。
- `src/pages/aiCallTasks/_mock.ts`：开发环境任务、校验、问题明细和状态动作 Mock。
- `src/pages/aiCallTasks/hooks/useVisiblePolling.ts`：页面可见时的定时刷新。
- `src/pages/aiCallTasks/hooks/useVisiblePolling.test.tsx`：计时器、页面隐藏和卸载清理测试。
- `src/pages/aiCallTasks/components/TaskStatusTag.tsx`：任务状态标签。
- `src/pages/aiCallTasks/components/TaskActions.tsx`：按状态生成任务操作。
- `src/pages/aiCallTasks/index.tsx`：任务列表。
- `src/pages/aiCallTasks/index.test.tsx`：筛选、分页、状态动作和轮询测试。
- `src/pages/aiCallTasks/create/index.tsx`：单页创建任务。
- `src/pages/aiCallTasks/create/index.test.tsx`：单号码、批量名单、校验与确认测试。
- `src/pages/aiCallTasks/create/BatchTargetUpload.tsx`：完整名单上传与替换。
- `src/pages/aiCallTasks/create/ValidationResult.tsx`：校验摘要、问题分页和下载。
- `src/pages/aiCallTasks/create/TaskConfirmation.tsx`：人工确认摘要。
- `src/pages/aiCallTasks/detail/index.tsx`：任务摘要和外呼对象列表。
- `src/pages/aiCallTasks/detail/index.test.tsx`：详情、分页、轮询和记录跳转测试。
- `src/pages/aiCallRules/domain.ts`：呼叫规则字段和校验函数。
- `src/pages/aiCallRules/domain.test.ts`：时段、重试次数和间隔校验测试。
- `src/pages/aiCallRules/service.ts`：呼叫规则查询和保存请求。
- `src/pages/aiCallRules/service.test.ts`：规则接口请求测试。
- `src/pages/aiCallRules/_mock.ts`：开发环境呼叫规则和规则元数据 Mock。
- `src/pages/aiCallRules/index.tsx`：呼叫规则列表及新增/编辑弹窗。
- `src/pages/aiCallRules/index.test.tsx`：规则表单和状态展示测试。

### 1.2 修改文件

- `config/routes.ts`：注册任务列表、创建、详情和呼叫规则隐藏路由。
- `config/routes.test.ts`：锁定路由组件和权限。
- `src/adapters/ruoyi/menu.tsx`：将现有通话记录注入逻辑扩展为 AI Call 管理菜单注入。
- `src/adapters/ruoyi/menu.test.tsx`：锁定“外呼任务、通话记录、呼叫规则”顺序及去重。
- `src/pages/aiCallRecords/service.ts`：增加任务、对象、客户、AI 结论、摘要和录音快捷地址字段。
- `src/pages/aiCallRecords/service.test.ts`：增加任务筛选参数测试。
- `src/pages/aiCallRecords/index.tsx`：增加 URL 预筛选、复合列、摘要和录音快捷播放。
- `src/pages/aiCallRecords/index.test.tsx`：增加任务跳转、目标跳转和复合列测试。

### 1.3 不修改文件

- `src/pages/aiCallLab/customer/*`
- `src/pages/aiCallLab/promptConfig/*`
- `src/pages/agentWorkbench/*`
- `src/pages/recov/*`
- `src/services/ant-design-pro/*`

## 2. 后端接口契约

所有接口经 `/ai-call-agent-api` 代理访问 `19011`。以下路径是前端实现的唯一契约；真实后端路径若需调整，必须先修改契约文档、service 测试和 service，再修改页面。

### 2.1 任务

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/ai-call/outbound-tasks` | 任务分页 |
| GET | `/ai-call/outbound-tasks/{taskId}` | 任务详情 |
| POST | `/ai-call/outbound-tasks` | 以校验结果创建任务 |
| PUT | `/ai-call/outbound-tasks/{taskId}/schedule` | 修改待执行任务名称和时间 |
| POST | `/ai-call/outbound-tasks/{taskId}/pause` | 受理暂停 |
| POST | `/ai-call/outbound-tasks/{taskId}/resume` | 受理恢复 |
| POST | `/ai-call/outbound-tasks/{taskId}/stop` | 受理停止 |
| POST | `/ai-call/outbound-tasks/{taskId}/cancel` | 取消待执行任务 |
| GET | `/ai-call/outbound-tasks/{taskId}/targets` | 外呼对象分页 |

`POST` 创建和状态动作成功只代表“已受理”。前端必须继续查询任务状态。

### 2.2 校验

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| POST | `/ai-call/outbound-validations/single` | 同步校验单号码任务 |
| POST | `/ai-call/outbound-validations/batch` | 上传完整名单并创建异步校验 |
| GET | `/ai-call/outbound-validations/{validationId}` | 查询校验状态和摘要 |
| GET | `/ai-call/outbound-validations/{validationId}/issues` | 问题数据分页 |
| GET | `/ai-call/outbound-validations/{validationId}/issues/export` | 下载全部问题明细 |

批量上传使用 `multipart/form-data`，字段名固定为 `file` 和 `request`。`request` 是任务配置 JSON 字符串。

### 2.3 呼叫规则

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/ai-call/outbound-rules` | 可用规则分页 |
| GET | `/ai-call/outbound-rules/meta` | 查询重试上限和可重试结果枚举 |
| POST | `/ai-call/outbound-rules` | 创建规则 |
| PUT | `/ai-call/outbound-rules/{ruleId}` | 更新规则 |

V1 不提供删除规则。

### 2.4 统一响应

接口响应与现有若依及催收接口保持一致，只接受以下两种外壳：

```ts
type ApiResponse<T> = {
  code: number;
  msg?: string;
  data?: T;
};

type TableDataInfo<T> = {
  code: number;
  msg?: string;
  rows: T[];
  total: number;
};
```

普通详情、创建和状态操作返回 `ApiResponse<T>`；分页查询返回 `TableDataInfo<T>`，分页结果不能嵌套进 `data`。`code === 200` 表示成功，其他状态码由现有若依错误处理流程统一抛错。页面 service 对外再把分页响应归一化为 `{ rows, total }`，但不能兼容没有 `code` 的裸对象、裸数组或 `data.rows` 结构。

Blob 下载成功时直接返回文件流，失败时返回 `{ code, msg }` JSON。任务级系统失败统一返回或保存 `errorMessage`。所有 ID 使用字符串。

## 3. 核心类型

`src/pages/aiCallTasks/domain.ts` 使用以下字段，后续任务不得重新命名：

```ts
export type TaskStatus =
  | 'SCHEDULED'
  | 'RUNNING'
  | 'PAUSING'
  | 'PAUSED'
  | 'STOPPING'
  | 'STOPPED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type TargetStatus =
  | 'PENDING'
  | 'DIALING'
  | 'IN_CALL'
  | 'RETRY_WAIT'
  | 'COMPLETED'
  | 'CANCELLED';

export type ValidationStatus =
  | 'VALIDATING'
  | 'PASSED'
  | 'FAILED'
  | 'SYSTEM_ERROR';

export type TaskMode = 'single' | 'batch';
export type ExecutionMode = 'immediate' | 'scheduled';

export type AiCallTask = {
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

export type AiCallTaskTarget = {
  targetId: string;
  taskId: string;
  customerName?: string | null;
  phoneNumber: string;
  status: TargetStatus;
  attemptCount: number;
  latestResult?: string | null;
  updatedAt: string;
};

export type ValidationIssue = {
  issueId: string;
  rowNumber: number;
  phoneNumber?: string | null;
  customerName?: string | null;
  reasons: string[];
  duplicateRowNumbers?: number[];
};
```

呼叫规则使用：

```ts
export type CallWindow = {
  startTime: string;
  endTime: string;
};

export type AiCallRule = {
  ruleId: string;
  ruleName: string;
  enabled: boolean;
  callWindows: CallWindow[];
  retryCount: number;
  retryIntervalsMinutes: number[];
  retryableResults: string[];
  updatedAt: string;
};

export type AiCallRuleMetadata = {
  maxRetryCount: number;
  retryableResults: Array<{
    value: 'no_answer' | 'busy' | 'call_failed';
    label: string;
  }>;
};
```

## 4. 任务拆分

### 任务 1：锁定领域类型、状态动作和 API 契约

**文件：**

- 创建：`docs/recov/2026-07-27-ai-call-outbound-api-contract.md`
- 创建：`src/pages/aiCallTasks/domain.ts`
- 创建：`src/pages/aiCallTasks/domain.test.ts`

- [ ] **步骤 1：编写状态动作失败测试**

```ts
expect(getAllowedTaskActions('SCHEDULED')).toEqual([
  'editSchedule',
  'cancel',
  'view',
]);
expect(getAllowedTaskActions('RUNNING')).toEqual(['pause', 'stop', 'view']);
expect(getAllowedTaskActions('PAUSED')).toEqual(['resume', 'stop', 'view']);
expect(getAllowedTaskActions('PAUSING')).toEqual(['view']);
expect(getAllowedTaskActions('STOPPING')).toEqual(['view']);
for (const status of ['STOPPED', 'COMPLETED', 'FAILED', 'CANCELLED'] as const) {
  expect(getAllowedTaskActions(status)).toEqual(['view']);
}
expect(isTaskPollingStatus('RUNNING')).toBe(true);
expect(isTaskPollingStatus('COMPLETED')).toBe(false);
```

- [ ] **步骤 2：运行测试并确认失败**

运行：

```bash
npx jest src/pages/aiCallTasks/domain.test.ts --runInBand
```

预期：FAIL，`domain.ts` 或导出函数不存在。

- [ ] **步骤 3：实现最小领域函数**

```ts
export const getAllowedTaskActions = (
  status: TaskStatus,
): TaskActionKey[] => TASK_ACTIONS[status];

export const isTaskPollingStatus = (status: TaskStatus) =>
  status === 'RUNNING' ||
  status === 'PAUSING' ||
  status === 'STOPPING';

export const getTaskProgress = (task: AiCallTask) =>
  task.totalTargets === 0
    ? 0
    : Math.round((task.completedTargets / task.totalTargets) * 100);
```

- [ ] **步骤 4：写入接口契约文档**

契约文档必须逐项复制第 2、3 节，补充请求示例、响应示例、状态流转和错误码语义；不得把“已受理”写成“已完成”。

- [ ] **步骤 5：运行测试并确认通过**

运行：

```bash
npx jest src/pages/aiCallTasks/domain.test.ts --runInBand
```

预期：PASS。

- [ ] **步骤 6：提交**

```bash
git add docs/recov/2026-07-27-ai-call-outbound-api-contract.md src/pages/aiCallTasks/domain.ts src/pages/aiCallTasks/domain.test.ts
git commit -m "feat: 定义通用外呼任务契约"
```

### 任务 2：实现 service、下载能力和开发 Mock

**文件：**

- 创建：`src/pages/aiCallTasks/service.ts`
- 创建：`src/pages/aiCallTasks/service.test.ts`
- 创建：`src/pages/aiCallTasks/_mock.ts`

- [ ] **步骤 1：编写请求契约失败测试**

至少覆盖：

```ts
mockedRuoyiRequest.mockResolvedValueOnce({
  code: 200,
  rows: [runningTask],
  total: 1,
});

await listAiCallTasks({ pageNum: 1, pageSize: 20, status: 'RUNNING' });
expect(mockedRuoyiRequest).toHaveBeenCalledWith(
  '/ai-call/outbound-tasks',
  {
    baseApi: '/ai-call-agent-api',
    method: 'get',
    params: { pageNum: 1, pageSize: 20, status: 'RUNNING' },
  },
);

mockedRuoyiRequest.mockResolvedValueOnce({
  code: 200,
  data: { taskId: 'task-1', accepted: true },
});

await createAiCallTask(payload, 'validation-1', 'idem-1');
expect(mockedRuoyiRequest).toHaveBeenCalledWith(
  '/ai-call/outbound-tasks',
  expect.objectContaining({
    baseApi: '/ai-call-agent-api',
    method: 'post',
    headers: { 'Idempotency-Key': 'idem-1' },
    data: { ...payload, validationId: 'validation-1' },
  }),
);

mockedRuoyiRequest.mockResolvedValueOnce({
  rows: [runningTask],
  total: 1,
});
await expect(listAiCallTasks({ pageNum: 1, pageSize: 20 })).rejects.toThrow(
  '接口响应缺少 code',
);
```

响应契约测试还必须覆盖：

- `{ code: 200, data }` 能正确解包普通数据；
- `{ code: 200, rows, total }` 能归一化为页面使用的 `{ rows, total }`；
- 缺少 `code` 的裸对象、裸数组和 `{ data: { rows, total } }` 均被拒绝；
- 非 `200` 响应由 `ruoyiRequest` 抛出 `RuoyiError`，service 不吞掉错误；
- Mock 接口不得返回裸数据。

批量上传测试必须断言 `FormData` 同时包含 `file` 和序列化后的 `request`。

- [ ] **步骤 2：运行测试并确认失败**

```bash
npx jest src/pages/aiCallTasks/service.test.ts --runInBand
```

预期：FAIL，service 函数不存在。

- [ ] **步骤 3：实现 response 解包和任务请求**

统一使用现有若依请求适配器，通过 `baseApi` 指向独立 AI Call 代理：

```ts
import { ruoyiRequest } from '@/adapters/ruoyi/request';
import type { RuoyiResponse } from '@/adapters/ruoyi/response';

const AI_CALL_AGENT_BASE_API = '/ai-call-agent-api';
const OUTBOUND_PREFIX = '/ai-call';
const TASKS_PATH = `${OUTBOUND_PREFIX}/outbound-tasks`;
const VALIDATIONS_PATH = `${OUTBOUND_PREFIX}/outbound-validations`;

const requireEnvelope = <T>(response: RuoyiResponse<T> | T) => {
  if (!response || typeof response !== 'object' || !('code' in response)) {
    throw new Error('接口响应缺少 code');
  }
  return response as RuoyiResponse<T>;
};

const unwrapData = <T>(response: RuoyiResponse<T> | T): T => {
  const envelope = requireEnvelope(response);
  if (envelope.data === undefined) {
    throw new Error('接口响应缺少 data');
  }
  return envelope.data;
};

const unwrapPage = <T>(response: RuoyiResponse<T> | T) => {
  const envelope = requireEnvelope(response);
  if (!Array.isArray(envelope.rows) || typeof envelope.total !== 'number') {
    throw new Error('分页响应缺少 rows 或 total');
  }
  return { rows: envelope.rows, total: envelope.total };
};
```

每个 `ruoyiRequest` 调用都传入 `baseApi: AI_CALL_AGENT_BASE_API`。普通接口使用 `unwrapData`，分页接口使用 `unwrapPage`；不能复制 `aiCallRecords/service.ts` 中兼容裸响应和 `data.rows` 的历史逻辑。

实现：

- `listAiCallTasks`
- `getAiCallTask`
- `createAiCallTask`
- `updateAiCallTaskSchedule`
- `pauseAiCallTask`
- `resumeAiCallTask`
- `stopAiCallTask`
- `cancelAiCallTask`
- `listAiCallTaskTargets`
- `validateSingleTarget`
- `uploadBatchValidation`
- `getValidationResult`
- `listValidationIssues`
- `downloadValidationIssues`

Blob 下载使用 `responseType: 'blob'`、`URL.createObjectURL`、临时 `<a download>`，完成后调用 `URL.revokeObjectURL`。

- [ ] **步骤 4：实现同契约 Mock**

Mock 初始数据必须覆盖：

- 1 个 `RUNNING` 批量任务；
- 1 个 `SCHEDULED` 单号码任务；
- 1 个 `PAUSED` 任务；
- 1 个 `COMPLETED` 任务；
- 同一对象两次拨打的关联数据；
- 批量校验 `VALIDATING → FAILED`；
- 问题行包含手机号格式错误和重复行号；
- 第二次上传后 `VALIDATING → PASSED`；
- 暂停 `RUNNING → PAUSING → PAUSED`；
- 停止 `RUNNING → STOPPING → STOPPED`。

Mock 的普通响应固定使用 `{ code: 200, msg, data }`，分页响应固定使用 `{ code: 200, msg, rows, total }`。Mock 只在 Umi Mock 模式加载，生产构建不得导入它。

- [ ] **步骤 5：运行 service 测试**

```bash
npx jest src/pages/aiCallTasks/service.test.ts --runInBand
```

预期：PASS。

- [ ] **步骤 6：提交**

```bash
git add src/pages/aiCallTasks/service.ts src/pages/aiCallTasks/service.test.ts src/pages/aiCallTasks/_mock.ts
git commit -m "feat: 增加外呼任务服务与开发数据"
```

### 任务 3：注册路由和 AI Call 菜单

**文件：**

- 修改：`config/routes.ts`
- 修改：`config/routes.test.ts`
- 修改：`src/adapters/ruoyi/menu.tsx`
- 修改：`src/adapters/ruoyi/menu.test.tsx`

- [ ] **步骤 1：先扩展路由测试**

```ts
it.each([
  ['/ai-call/tasks', './aiCallTasks'],
  ['/ai-call/tasks/create', './aiCallTasks/create'],
  ['/ai-call/tasks/:taskId', './aiCallTasks/detail'],
  ['/ai-call/rules', './aiCallRules'],
])('maps %s to %s', (path, component) => {
  expect(flattenRoutes(routes).find((item) => item.path === path)).toMatchObject({
    path,
    component,
    hideInMenu: true,
    access: 'hasRoutePermission',
    requiredPermission: 'ai_call:agent:manage',
  });
});
```

V1 复用当前 AI Call 管理权限 `ai_call:agent:manage`，不在前端虚构尚未注册的权限字符。真实后端拆分任务权限后，再单独迁移。

- [ ] **步骤 2：先扩展菜单测试**

断言 AI Call 根菜单中依次出现：

```ts
[
  expect.objectContaining({ path: '/ai-call/tasks', name: '外呼任务' }),
  expect.objectContaining({ path: '/ai-call/records', name: '通话记录' }),
  expect.objectContaining({ path: '/ai-call/rules', name: '呼叫规则' }),
]
```

再次执行注入函数时不得重复添加。

- [ ] **步骤 3：运行测试并确认失败**

```bash
npx jest config/routes.test.ts src/adapters/ruoyi/menu.test.tsx --runInBand
```

预期：FAIL，路由和菜单项尚不存在。

- [ ] **步骤 4：实现最小路由和菜单增量**

将 `attachAiCallRecordsMenu` 重命名为 `attachAiCallManagementMenu`，复用现有 AI Call 根菜单识别和管理型子菜单门控，只增加三个固定管理入口。图标使用 `PhoneOutlined`、`HistoryOutlined`、`FieldTimeOutlined`。

- [ ] **步骤 5：运行测试并确认通过**

```bash
npx jest config/routes.test.ts src/adapters/ruoyi/menu.test.tsx --runInBand
```

预期：PASS。

- [ ] **步骤 6：提交**

```bash
git add config/routes.ts config/routes.test.ts src/adapters/ruoyi/menu.tsx src/adapters/ruoyi/menu.test.tsx
git commit -m "feat: 增加外呼任务与呼叫规则入口"
```

### 任务 4：实现呼叫规则页面

**文件：**

- 创建：`src/pages/aiCallRules/domain.ts`
- 创建：`src/pages/aiCallRules/domain.test.ts`
- 创建：`src/pages/aiCallRules/service.ts`
- 创建：`src/pages/aiCallRules/service.test.ts`
- 创建：`src/pages/aiCallRules/_mock.ts`
- 创建：`src/pages/aiCallRules/index.tsx`
- 创建：`src/pages/aiCallRules/index.test.tsx`

- [ ] **步骤 1：编写规则校验失败测试**

```ts
expect(
  validateCallRule({
    callWindows: [{ startTime: '18:00', endTime: '09:00' }],
    retryCount: 1,
    retryIntervalsMinutes: [30],
    retryableResults: ['no_answer'],
  }),
).toContain('呼叫时段开始时间必须早于结束时间');

expect(
  validateCallRule({
    callWindows: [
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '11:30', endTime: '18:00' },
    ],
    retryCount: 2,
    retryIntervalsMinutes: [30],
    retryableResults: ['no_answer'],
  }),
).toEqual(
  expect.arrayContaining([
    '呼叫时段不能重叠',
    '重试间隔数量必须与重试次数一致',
  ]),
);
```

- [ ] **步骤 2：运行领域测试并确认失败**

```bash
npx jest src/pages/aiCallRules/domain.test.ts --runInBand
```

预期：FAIL。

- [ ] **步骤 3：实现规则校验函数**

`validateCallRule` 接收 `AiCallRuleMetadata`，并检查：

- 至少一个时段；
- `startTime < endTime`；
- 排序后的相邻时段不重叠；
- `retryCount` 为非负整数且不超过 `metadata.maxRetryCount`；
- 间隔数量等于重试次数；
- 每个间隔为正整数；
- 可重试结果来自 `no_answer`、`busy`、`call_failed`。

- [ ] **步骤 4：编写 service 和页面失败测试**

页面测试断言：

- 列表显示名称、时段、重试摘要和启用状态；
- 点击“新建规则”打开 Modal；
- 时段重叠时不调用保存接口；
- 合法表单调用创建接口；
- 编辑时调用 `PUT /outbound-rules/{ruleId}`；
- 页面从 `/outbound-rules/meta` 读取 `maxRetryCount` 和可重试结果选项；
- 页面没有删除按钮。

- [ ] **步骤 5：实现 service 和页面**

service 固定实现 `getAiCallRuleMetadata`、`listAiCallRules`、`createAiCallRule` 和 `updateAiCallRule`。`_mock.ts` 返回 `maxRetryCount: 5`、三个可重试结果和两条规则。页面使用 `ProTable` 展示规则；使用受控 `Modal destroyOnHidden` 和 `Form.List` 编辑时段、重试间隔。操作列固定右侧，只提供“编辑”。

- [ ] **步骤 6：运行测试**

```bash
npx jest src/pages/aiCallRules/domain.test.ts src/pages/aiCallRules/service.test.ts src/pages/aiCallRules/index.test.tsx --runInBand
```

预期：PASS。

- [ ] **步骤 7：提交**

```bash
git add src/pages/aiCallRules
git commit -m "feat: 增加外呼呼叫规则配置"
```

### 任务 5：实现任务列表、状态操作和可见性轮询

**文件：**

- 创建：`src/pages/aiCallTasks/hooks/useVisiblePolling.ts`
- 创建：`src/pages/aiCallTasks/hooks/useVisiblePolling.test.tsx`
- 创建：`src/pages/aiCallTasks/components/TaskStatusTag.tsx`
- 创建：`src/pages/aiCallTasks/components/TaskActions.tsx`
- 创建：`src/pages/aiCallTasks/index.tsx`
- 创建：`src/pages/aiCallTasks/index.test.tsx`

- [ ] **步骤 1：编写轮询 Hook 失败测试**

使用 Jest fake timers 断言：

```ts
expect(refresh).toHaveBeenCalledTimes(1);
jest.advanceTimersByTime(10_000);
expect(refresh).toHaveBeenCalledTimes(2);
```

将 `document.visibilityState` 改为 `hidden` 并派发 `visibilitychange` 后，推进计时器不得继续调用；卸载后不得残留 timer。

- [ ] **步骤 2：编写任务列表失败测试**

断言：

- 查询条件只有任务名称、任务状态、创建时间；
- 分页参数使用 `pageNum/pageSize`；
- 页面存在运行中任务时启用 10 秒轮询；
- `RUNNING` 行显示暂停、停止、查看；
- `PAUSED` 行显示恢复、停止、查看；
- `PAUSING` 和 `STOPPING` 只显示查看；
- `STOPPED`、`COMPLETED`、`FAILED` 和 `CANCELLED` 只显示查看；
- `FAILED` 行显示后端 `errorMessage`；
- 危险操作确认文案包含任务名称和影响；
- 动作接口成功后先显示“操作已受理”，不能显示“已暂停”或“已停止”；
- `SCHEDULED` 只允许修改名称/时间、取消和查看。

- [ ] **步骤 3：运行测试并确认失败**

```bash
npx jest src/pages/aiCallTasks/hooks/useVisiblePolling.test.tsx src/pages/aiCallTasks/index.test.tsx --runInBand
```

预期：FAIL。

- [ ] **步骤 4：实现 Hook 和状态组件**

`useVisiblePolling` 接收：

```ts
type VisiblePollingOptions = {
  enabled: boolean;
  intervalMs: number;
  onTick: () => void | Promise<void>;
};
```

Hook 只在 `enabled && document.visibilityState === 'visible'` 时创建 interval，并在依赖变化、页面隐藏和卸载时清理。

- [ ] **步骤 5：实现任务列表**

页面使用 `RecovListPage`、`RecovTableCard` 和 `ProTable`。顶部只显示“外呼任务”和“新建任务”，统计总数只在分页 `showTotal` 展示。

列：

- 任务名称/外呼方式；
- 对象总数；
- 完成进度；
- 接通数；
- 状态；
- 计划或开始时间；
- 创建人；
- 固定右侧操作。

`SCHEDULED` 的修改使用 Modal，只提交 `taskName` 和 `scheduledAt`。

- [ ] **步骤 6：运行测试**

```bash
npx jest src/pages/aiCallTasks/hooks/useVisiblePolling.test.tsx src/pages/aiCallTasks/index.test.tsx --runInBand
```

预期：PASS。

- [ ] **步骤 7：提交**

```bash
git add src/pages/aiCallTasks/hooks src/pages/aiCallTasks/components src/pages/aiCallTasks/index.tsx src/pages/aiCallTasks/index.test.tsx
git commit -m "feat: 增加外呼任务运行列表"
```

### 任务 6：实现单号码任务创建与确认

**文件：**

- 创建：`src/pages/aiCallTasks/create/index.tsx`
- 创建：`src/pages/aiCallTasks/create/index.test.tsx`
- 创建：`src/pages/aiCallTasks/create/TaskConfirmation.tsx`

- [ ] **步骤 1：编写单号码流程失败测试**

页面测试必须断言：

- 页面是单页，不存在“草稿”“上一步”“下一步”；
- 默认外呼方式为单号码；
- 手机号必填，客户名称选填；
- 不存在公司名称、产品名称、业务 ID 和业务参数；
- 提示词下拉展示 `name / sceneCode`，不展示版本；
- 呼叫规则只读展示时段和重试摘要；
- 立即执行在规则时段外时阻止校验；
- 定时执行必须在未来且处于允许时段；
- 校验通过后出现确认摘要；
- 确认摘要显示提示词名称和场景编码；
- 连续点击确认只调用一次创建接口；
- 创建成功后跳转 `/ai-call/tasks/{taskId}`。

- [ ] **步骤 2：运行测试并确认失败**

```bash
npx jest src/pages/aiCallTasks/create/index.test.tsx --runInBand
```

预期：FAIL。

- [ ] **步骤 3：实现单页表单**

表单值固定为：

```ts
type TaskFormValues = {
  taskName: string;
  taskMode: 'single' | 'batch';
  phoneNumber?: string;
  customerName?: string;
  promptProfileId?: string;
  sceneCode: string;
  voice: string;
  ruleId: string;
  executionMode: 'immediate' | 'scheduled';
  scheduledAt?: string;
};
```

提示词和音色复用 `getAiCallLabPromptProfiles`、`getAiCallLabVoiceProfiles`；规则使用 `listAiCallRules`。下拉值使用 `String(profile.id ?? profile.sceneCode)`，选择后保存必填的 `sceneCode`，只有接口实际返回 `id` 时才保存 `promptProfileId`。任务页面不复制提示词正文。

- [ ] **步骤 4：实现校验与确认**

单号码点击“校验任务”后：

1. 执行表单校验；
2. 执行规则时间校验；
3. 调用 `validateSingleTarget`；
4. 仅在返回 `PASSED` 时显示 `TaskConfirmation`；
5. 表单任一字段改变后立即清除旧校验结果；
6. 点击“确认启动”时生成一次 UUID 幂等键；
7. 请求期间按钮 `loading` 且 `disabled`；
8. 返回 `taskId` 后跳转详情。

- [ ] **步骤 5：运行测试**

```bash
npx jest src/pages/aiCallTasks/create/index.test.tsx --runInBand
```

预期：PASS。

- [ ] **步骤 6：提交**

```bash
git add src/pages/aiCallTasks/create
git commit -m "feat: 增加单号码外呼任务创建"
```

### 任务 7：实现完整名单上传、异步校验和问题明细

**文件：**

- 创建：`src/pages/aiCallTasks/create/BatchTargetUpload.tsx`
- 创建：`src/pages/aiCallTasks/create/ValidationResult.tsx`
- 修改：`src/pages/aiCallTasks/create/index.tsx`
- 修改：`src/pages/aiCallTasks/create/index.test.tsx`

- [ ] **步骤 1：增加批量流程失败测试**

断言：

- 模板字段说明只有 `phoneNumber` 必填、`customerName` 选填；
- `Upload.Dragger` 限制单文件，接受 `.xlsx,.xls,.csv`；
- 新文件替换旧文件和旧校验结果；
- 上传返回 `VALIDATING` 后每 2 秒查询；
- 页面隐藏或终态后停止校验轮询；
- `FAILED` 时确认按钮不可用；
- 问题列表展示原文件行号、手机号、客户名称、多个错误原因和重复行号；
- 问题列表使用服务端分页；
- 支持手机号和错误类型筛选；
- 下载调用问题明细 Blob 接口；
- 页面没有在线编辑、删除错误行或跳过错误行按钮；
- 第二次完整上传 `PASSED` 后才显示确认摘要。

- [ ] **步骤 2：运行测试并确认失败**

```bash
npx jest src/pages/aiCallTasks/create/index.test.tsx --runInBand
```

预期：FAIL。

- [ ] **步骤 3：实现 BatchTargetUpload**

使用受控 `fileList` 和 `beforeUpload={() => false}` 拦截自动上传；点击“校验任务”时才调用 `uploadBatchValidation`。`onChange` 接收到新文件后清空 `validationId`、状态、摘要和问题页。

可见文案固定为：

> 请根据问题行号修正原文件，并重新上传完整名单。

- [ ] **步骤 4：实现 ValidationResult**

`VALIDATING` 显示 Spin 和“名单校验中”；`FAILED` 显示错误统计、筛选、分页表格和下载按钮；`SYSTEM_ERROR` 显示后端 `errorMessage` 和“重新校验”；`PASSED` 显示有效对象数量。

- [ ] **步骤 5：接入创建页**

单号码和批量名单共用 AI 配置、执行计划、规则摘要和确认组件。切换外呼方式时清除当前校验结果，但保留任务名称、提示词、音色、规则和执行计划。

- [ ] **步骤 6：运行测试**

```bash
npx jest src/pages/aiCallTasks/create/index.test.tsx --runInBand
```

预期：PASS。

- [ ] **步骤 7：提交**

```bash
git add src/pages/aiCallTasks/create
git commit -m "feat: 增加批量名单校验闭环"
```

### 任务 8：实现任务详情、对象分页和记录跳转

**文件：**

- 创建：`src/pages/aiCallTasks/detail/index.tsx`
- 创建：`src/pages/aiCallTasks/detail/index.test.tsx`

- [ ] **步骤 1：编写详情失败测试**

断言：

- 页面没有“执行概览”“任务事件”“通话记录”Tab；
- 顶部展示任务状态、总数、完成数、接通数、失败数和进度；
- 配置摘要展示提示词名称、场景编码、音色和呼叫规则；
- 对象列表支持手机号、客户名称、处理状态筛选和服务端分页；
- 对象列包含拨打次数、最近结果和更新时间；
- 点击任务级记录跳转 `/ai-call/records?taskId={taskId}`；
- 点击对象级记录跳转 `/ai-call/records?taskId={taskId}&targetId={targetId}`；
- 活动状态每 5 秒刷新摘要和当前对象页；
- 页面隐藏或终态后停止轮询。

- [ ] **步骤 2：运行测试并确认失败**

```bash
npx jest src/pages/aiCallTasks/detail/index.test.tsx --runInBand
```

预期：FAIL。

- [ ] **步骤 3：实现详情**

通过 `useParams<{ taskId?: string }>()` 读取字符串 ID。主接口失败显示 Result；对象列表失败只影响列表区域。使用 `RecovStatsStrip` 呈现紧凑指标，统计总数不在卡片标题重复显示。

- [ ] **步骤 4：实现跳转和轮询**

任务级和对象级跳转使用 `URLSearchParams` 生成查询串。详情轮询复用 `useVisiblePolling`，以 `isTaskPollingStatus(task.status)` 控制开关。

- [ ] **步骤 5：运行测试**

```bash
npx jest src/pages/aiCallTasks/detail/index.test.tsx --runInBand
```

预期：PASS。

- [ ] **步骤 6：提交**

```bash
git add src/pages/aiCallTasks/detail
git commit -m "feat: 增加外呼任务详情"
```

### 任务 9：扩展统一通话记录

**文件：**

- 修改：`src/pages/aiCallRecords/service.ts`
- 修改：`src/pages/aiCallRecords/service.test.ts`
- 修改：`src/pages/aiCallRecords/index.tsx`
- 修改：`src/pages/aiCallRecords/index.test.tsx`

- [ ] **步骤 1：扩展记录类型**

在 `AiCallRecord` 增加可空字段：

```ts
taskId?: string | null;
targetId?: string | null;
taskName?: string | null;
customerName?: string | null;
phoneNumber?: string | null;
attemptNo?: number | null;
callResult?: string | null;
aiOutcome?: string | null;
summary?: string | null;
recordingPlayUrl?: string | null;
```

在 `AiCallRecordQuery` 增加：

```ts
taskId?: string;
targetId?: string;
phoneNumber?: string;
customerName?: string;
callResult?: string;
```

在 `AiCallRecordDetail` 增加：

```ts
executionConfig?: {
  promptProfileId?: string | null;
  promptName?: string | null;
  sceneCode?: string | null;
  promptText?: string | null;
  openingMessage?: string | null;
  voice?: string | null;
  voiceName?: string | null;
  ruleName?: string | null;
} | null;
```

- [ ] **步骤 2：先增加 service 失败测试**

```ts
await listAiCallRecords({
  pageNum: 1,
  pageSize: 20,
  taskId: 'task-1',
  targetId: 'target-1',
});
expect(request).toHaveBeenCalledWith(
  '/ai-call-agent-api/ai-call/records',
  expect.objectContaining({
    params: expect.objectContaining({
      taskId: 'task-1',
      targetId: 'target-1',
    }),
  }),
);
```

- [ ] **步骤 3：增加页面失败测试**

使用 `window.history.pushState` 设置：

```ts
'/ai-call/records?taskId=task-1&targetId=target-1'
```

断言首次请求自动携带两个 ID，并展示：

- 所属任务、手机号、客户名称、通话来源、呼叫结果和通话时间筛选；
- 客户信息；
- 任务信息；
- 呼叫情况；
- AI 分析；
- 录音；
- 查看详情。

还要断言：

- `web` 显示“浏览器测试”；
- `sip_outbound` 显示“SIP 外呼”；
- `sip_inbound` 显示“SIP 呼入”；
- 未知 `entryType` 显示原始值；
- 摘要最多显示两行；
- 没有 AI 结论时显示“—”；
- 有 `recordingPlayUrl` 时可播放，无地址时不渲染播放按钮。
- 详情抽屉的“执行配置”显示提示词名称、场景编码、音色和规则；没有配置时显示空状态。

- [ ] **步骤 4：运行测试并确认失败**

```bash
npx jest src/pages/aiCallRecords/service.test.ts src/pages/aiCallRecords/index.test.tsx --runInBand
```

预期：FAIL。

- [ ] **步骤 5：实现 URL 预筛选和复合列**

使用 `useSearchParams` 读取 `taskId/targetId`，并在 ProTable `request` 中合并查询。`targetId` 不展示为手输筛选项；“所属任务”使用可搜索 Select，显示任务名称、提交 `taskId`，选项通过 `listAiCallTasks` 按关键词获取。

筛选项固定为：

- 所属任务；
- 手机号；
- 客户名称；
- 通话来源；
- 呼叫结果；
- 通话时间范围。

复合列固定为：

- 通话时间；
- 客户信息；
- 任务信息；
- 呼叫情况；
- AI 分析；
- 录音；
- 固定右侧操作。

完整转写、完整分析、执行配置和技术事件继续留在详情抽屉。执行配置只读取后端随通话保存的快照，不能回查当前提示词配置后冒充历史值。

- [ ] **步骤 6：运行记录测试**

```bash
npx jest src/pages/aiCallRecords/service.test.ts src/pages/aiCallRecords/index.test.tsx --runInBand
```

预期：PASS。

- [ ] **步骤 7：提交**

```bash
git add src/pages/aiCallRecords
git commit -m "feat: 关联外呼任务与通话记录"
```

### 任务 10：综合验证和浏览器验收

**文件：**

- 验证：本计划列出的全部新增和修改文件

- [ ] **步骤 1：运行全部定向测试**

```bash
npx jest \
  config/routes.test.ts \
  src/adapters/ruoyi/menu.test.tsx \
  src/pages/aiCallTasks/domain.test.ts \
  src/pages/aiCallTasks/service.test.ts \
  src/pages/aiCallTasks/hooks/useVisiblePolling.test.tsx \
  src/pages/aiCallTasks/index.test.tsx \
  src/pages/aiCallTasks/create/index.test.tsx \
  src/pages/aiCallTasks/detail/index.test.tsx \
  src/pages/aiCallRules/domain.test.ts \
  src/pages/aiCallRules/service.test.ts \
  src/pages/aiCallRules/index.test.tsx \
  src/pages/aiCallRecords/service.test.ts \
  src/pages/aiCallRecords/index.test.tsx \
  --runInBand
```

预期：所有测试套件 PASS，0 个失败测试。

- [ ] **步骤 2：运行类型检查**

```bash
npm run tsc
```

预期：退出码 0。

- [ ] **步骤 3：运行 Ant Design 检查**

```bash
npx antd lint ./src --format json
```

预期：无 error。

- [ ] **步骤 4：运行生产构建**

```bash
npm run build
```

预期：退出码 0。

- [ ] **步骤 5：启动 Mock 模式**

```bash
npm start
```

浏览器验收：

1. `/ai-call/tasks` 能筛选、分页和进入创建/详情。
2. 单号码填写、校验、确认后进入任务详情。
3. 批量名单第一次校验失败，能看到行号、手机号、原因和重复行。
4. 下载问题明细后，替换上传完整名单，第二次校验通过。
5. 运行中任务平滑进入暂停中和已暂停，恢复后继续。
6. 停止任务先进入停止中，再进入已停止。
7. 定时任务只能修改名称和执行时间。
8. 任务详情只显示配置摘要和外呼对象，不显示三套 Tab。
9. 任务级和对象级按钮跳转统一通话记录并自动筛选。
10. 通话记录列表直接显示 AI 结论、摘要和录音入口。
11. AI Call 菜单中没有第一阶段数据看板。

- [ ] **步骤 6：真实接口联调门禁**

切换到 `npm run dev` 后，逐项记录以下证据：

- 任务列表 HTTP 200；
- 单号码校验最终 `PASSED`；
- 批量校验出现一次真实 `FAILED` 和问题明细；
- 任务创建返回 `taskId`，且重复幂等请求不创建第二个任务；
- 暂停最终进入 `PAUSED`；
- 恢复最终进入 `RUNNING` 或 `COMPLETED`；
- 停止最终进入 `STOPPED`；
- 每次真实拨打产生独立 `callId`；
- 任务和对象跳转记录中心后返回匹配记录。

任一接口缺失或仍为 Mock 时，只能报告“前端完成，真实联调未完成”。

- [ ] **步骤 7：提交验收修正**

如果综合验证引发必要修正，只提交本功能文件：

```bash
git add \
  config/routes.ts \
  config/routes.test.ts \
  src/adapters/ruoyi/menu.tsx \
  src/adapters/ruoyi/menu.test.tsx \
  src/pages/aiCallTasks \
  src/pages/aiCallRules \
  src/pages/aiCallRecords
git commit -m "test: 完成通用外呼任务前端验收"
```

若没有文件变化，不创建空提交。

## 5. 实施顺序与停止规则

必须按任务 1 至任务 10 顺序实施。

- 任务 1 至任务 9 每个任务先失败测试、再最小实现、再通过测试、再提交。
- 任何已有定向测试失败，停止进入下一任务并先查明是否由本功能引起。
- 真实后端接口不存在时，可以完成 Mock 前端，但不得伪造真实联调结论。
- 发现需要修改物业催收、坐席工作台、测试台媒体逻辑或 Python AI Call 后端时，停止当前前端计划并为目标仓库编写独立规格与计划。
- 不删除或覆盖当前工作区中其他会话的未提交改动。
