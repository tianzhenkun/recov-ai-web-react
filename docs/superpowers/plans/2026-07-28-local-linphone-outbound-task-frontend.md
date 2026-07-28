# 本机 Linphone 外呼任务前端实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在通用外呼任务详情页提供受后端资格控制的“测试拨打”入口，支持 AI 通话、转人工验收、可见性轮询、明确失败反馈和主动结束当前通话。

**架构：** `service.ts` 只负责四个后端接口和统一响应解包，`domain.ts` 固化页面需要的类型，新增独立 `LinphoneTaskTest` 组件管理资格、确认弹窗和进行中状态。任务详情页只负责装配组件和刷新任务/对象表，不复制后端白名单、租户、任务状态或 SIP 门禁。

**技术栈：** React 19、TypeScript 6、Ant Design 6、Ant Design Pro、Umi Max、Jest、Testing Library。

---

## 文件结构

### 新建

- `src/pages/aiCallTasks/components/LinphoneTaskTest.tsx`：资格查询、测试确认、状态展示、轮询和结束当前通话。
- `src/pages/aiCallTasks/components/LinphoneTaskTest.test.tsx`：组件交互与异常反馈测试。

### 修改

- `src/pages/aiCallTasks/domain.ts`：测试场景、资格、阶段和状态类型。
- `src/pages/aiCallTasks/service.ts`：四个 Linphone 任务测试接口。
- `src/pages/aiCallTasks/service.test.ts`：接口路径、Header、请求体和 envelope 测试。
- `src/pages/aiCallTasks/detail/index.tsx`：在任务详情头部装配测试组件。
- `src/pages/aiCallTasks/detail/index.test.tsx`：锁定任务详情与测试组件的刷新边界。
- `src/pages/aiCallTasks/_mock.ts`：本地 UI 演示的资格和状态 mock。
- `src/pages/aiCallTasks/_mock.test.ts`：mock 接口状态流测试。

### 查阅但不修改

- `src/pages/aiCallTasks/hooks/useVisiblePolling.ts`：页面隐藏时停止轮询的既有 Hook。
- `src/adapters/ruoyi/request.ts`：统一请求和错误抛出。
- `src/pages/aiCallTasks/components/TaskStatusTag.tsx`：任务状态展示。
- `/Users/liuhongli/.codex/worktrees/ed81/ai-call/docs/superpowers/specs/2026-07-28-local-linphone-outbound-task-adapter-design.md`：已确认规格与 API 契约。

---

### 任务 1：锁定 Linphone 测试领域类型和 API 契约

**文件：**

- 修改：`src/pages/aiCallTasks/domain.ts`
- 修改：`src/pages/aiCallTasks/service.ts`
- 测试：`src/pages/aiCallTasks/service.test.ts`

- [ ] **步骤 1：增加前端领域类型**

```ts
export type LinphoneTestScenario = 'ai_only' | 'handoff';

export type LinphoneTestPhase =
  | 'dialing'
  | 'ai_call'
  | 'waiting_handoff'
  | 'human_call'
  | 'completed'
  | 'failed';

export type AiCallTaskTestCapability = {
  enabled: boolean;
  eligible: boolean;
  reasons: string[];
  availableAgentCount: number;
  activeCallId?: string | null;
  canEndActiveCall: boolean;
};

export type AiCallTaskTestStatus = {
  taskId: string;
  targetId: string;
  attemptId: string;
  callId: string;
  targetStatus: TargetStatus;
  attemptStatus: 'DIALING' | 'IN_CALL' | 'COMPLETED' | 'FAILED';
  callStatus?: string | null;
  handoffStatus?: string | null;
  phase: LinphoneTestPhase;
  elapsedSeconds: number;
  endReason?: string | null;
  errorMessage?: string | null;
  canEndActiveCall: boolean;
};
```

- [ ] **步骤 2：编写失败测试，锁定四个请求**

```ts
it('maps Linphone task test APIs and idempotency headers', async () => {
  mockedRuoyiRequest
    .mockResolvedValueOnce({
      code: 200,
      data: {
        enabled: true,
        eligible: true,
        reasons: [],
        availableAgentCount: 1,
        activeCallId: null,
        canEndActiveCall: false,
      },
    })
    .mockResolvedValueOnce({
      code: 200,
      data: {
        accepted: true,
        taskId: 'task-1',
        attemptId: 'attempt-1',
        callId: 'call-1',
      },
    })
    .mockResolvedValueOnce({
      code: 200,
      data: {
        taskId: 'task-1',
        targetId: 'target-1',
        attemptId: 'attempt-1',
        callId: 'call-1',
        targetStatus: 'IN_CALL',
        attemptStatus: 'IN_CALL',
        callStatus: 'connected',
        phase: 'ai_call',
        elapsedSeconds: 8,
        canEndActiveCall: true,
      },
    })
    .mockResolvedValueOnce({ code: 200, data: { accepted: true } });

  await getAiCallTaskTestCapability('task-1');
  await runAiCallTaskTest('task-1', 'handoff', 'run-key');
  await getAiCallTaskTestStatus('task-1');
  await endAiCallTaskActiveCall('task-1', 'end-key');

  expect(mockedRuoyiRequest.mock.calls).toEqual([
    [
      '/ai-call/outbound-tasks/task-1/test-capability',
      { baseApi: '/ai-call-agent-api', method: 'get' },
    ],
    [
      '/ai-call/outbound-tasks/task-1/test-run',
      {
        baseApi: '/ai-call-agent-api',
        method: 'post',
        headers: { 'Idempotency-Key': 'run-key' },
        data: { scenario: 'handoff' },
      },
    ],
    [
      '/ai-call/outbound-tasks/task-1/test-status',
      { baseApi: '/ai-call-agent-api', method: 'get' },
    ],
    [
      '/ai-call/outbound-tasks/task-1/active-call/end',
      {
        baseApi: '/ai-call-agent-api',
        method: 'post',
        headers: { 'Idempotency-Key': 'end-key' },
      },
    ],
  ]);
});
```

- [ ] **步骤 3：运行测试确认失败**

运行：

```bash
npx jest src/pages/aiCallTasks/service.test.ts --runInBand
```

预期：FAIL，四个 service 函数尚未导出。

- [ ] **步骤 4：实现四个 service 函数**

```ts
export const getAiCallTaskTestCapability = async (
  taskId: string,
): Promise<AiCallTaskTestCapability> =>
  unwrapData(
    await ruoyiRequest<AiCallTaskTestCapability>(
      `${TASKS_PATH}/${taskId}/test-capability`,
      { ...requestOptions, method: 'get' },
    ),
  );

export const runAiCallTaskTest = async (
  taskId: string,
  scenario: LinphoneTestScenario,
  idempotencyKey: string,
): Promise<AiCallTaskTestAccepted> =>
  unwrapData(
    await ruoyiRequest<AiCallTaskTestAccepted>(
      `${TASKS_PATH}/${taskId}/test-run`,
      {
        ...requestOptions,
        method: 'post',
        headers: { 'Idempotency-Key': idempotencyKey },
        data: { scenario },
      },
    ),
  );

export const getAiCallTaskTestStatus = async (
  taskId: string,
): Promise<AiCallTaskTestStatus> =>
  unwrapData(
    await ruoyiRequest<AiCallTaskTestStatus>(
      `${TASKS_PATH}/${taskId}/test-status`,
      { ...requestOptions, method: 'get' },
    ),
  );

export const endAiCallTaskActiveCall = async (
  taskId: string,
  idempotencyKey: string,
): Promise<AcceptedCommand> =>
  unwrapData(
    await ruoyiRequest<AcceptedCommand>(
      `${TASKS_PATH}/${taskId}/active-call/end`,
      {
        ...requestOptions,
        method: 'post',
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    ),
  );
```

`AiCallTaskTestAccepted` 定义为：

```ts
export type AiCallTaskTestAccepted = AcceptedCommand & {
  taskId: string;
  attemptId: string;
  callId: string;
};
```

- [ ] **步骤 5：运行 service 测试确认通过**

运行：

```bash
npx jest src/pages/aiCallTasks/service.test.ts --runInBand
```

预期：全部 PASS。

- [ ] **步骤 6：提交本任务**

```bash
git add src/pages/aiCallTasks/domain.ts \
  src/pages/aiCallTasks/service.ts \
  src/pages/aiCallTasks/service.test.ts
git commit -m "feat(ai-call): add Linphone task test API client"
```

---

### 任务 2：实现资格入口和测试确认弹窗

**文件：**

- 创建：`src/pages/aiCallTasks/components/LinphoneTaskTest.tsx`
- 创建：`src/pages/aiCallTasks/components/LinphoneTaskTest.test.tsx`
- 修改：`src/pages/aiCallTasks/detail/index.tsx`
- 修改：`src/pages/aiCallTasks/detail/index.test.tsx`

- [ ] **步骤 1：编写失败测试，锁定入口显示规则**

```tsx
it('hides the entry when the backend capability is disabled', async () => {
  mockedGetCapability.mockResolvedValue({
    enabled: false,
    eligible: false,
    reasons: ['本地测试能力未开启'],
    availableAgentCount: 0,
    activeCallId: null,
    canEndActiveCall: false,
  });

  render(<LinphoneTaskTest task={scheduledTask} onTaskChanged={jest.fn()} />);

  await waitFor(() => expect(mockedGetCapability).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: '测试拨打' })).toBeNull();
});

it('shows a disabled entry and backend reasons when task is ineligible', async () => {
  mockedGetCapability.mockResolvedValue({
    enabled: true,
    eligible: false,
    reasons: ['任务不是待执行状态'],
    availableAgentCount: 1,
    activeCallId: null,
    canEndActiveCall: false,
  });

  render(<LinphoneTaskTest task={runningTask} onTaskChanged={jest.fn()} />);

  const button = await screen.findByRole('button', { name: '测试拨打' });
  expect(button).toBeDisabled();
  fireEvent.mouseOver(button.parentElement as HTMLElement);
  expect(await screen.findByText('任务不是待执行状态')).toBeTruthy();
});
```

- [ ] **步骤 2：编写失败测试，锁定弹窗内容和 Handoff 提示**

```tsx
it('shows frozen task data and handoff steps before starting', async () => {
  mockedGetCapability.mockResolvedValue(eligibleCapability);
  render(<LinphoneTaskTest task={scheduledTask} onTaskChanged={jest.fn()} />);

  fireEvent.click(await screen.findByRole('button', { name: '测试拨打' }));

  expect(screen.getByText('张先生')).toBeTruthy();
  expect(screen.getByText('199****1001')).toBeTruthy();
  expect(screen.getByText('客户回访 / intro_follow_up')).toBeTruthy();
  expect(screen.getByText('芊悦 / Cherry')).toBeTruthy();
  expect(screen.getByText('工作日规则')).toBeTruthy();

  fireEvent.click(screen.getByLabelText('AI 转人工通话'));
  expect(screen.getByText('保持坐席工作台在线')).toBeTruthy();
  expect(screen.getByText('在坐席工作台接单')).toBeTruthy();
});
```

- [ ] **步骤 3：运行组件测试确认失败**

运行：

```bash
npx jest \
  src/pages/aiCallTasks/components/LinphoneTaskTest.test.tsx \
  src/pages/aiCallTasks/detail/index.test.tsx \
  --runInBand
```

预期：FAIL，组件不存在或任务详情没有装配入口。

- [ ] **步骤 4：实现资格加载和确认弹窗**

组件 Props：

```ts
type LinphoneTaskTestProps = {
  task: AiCallTask;
  onTaskChanged: () => Promise<void> | void;
};
```

入口规则：

```tsx
if (!capability?.enabled) return null;

<Tooltip title={capability.eligible ? undefined : capability.reasons.join('；')}>
  <span>
    <Button
      disabled={!capability.eligible}
      icon={<PhoneOutlined />}
      onClick={() => setModalOpen(true)}
    >
      测试拨打
    </Button>
  </span>
</Tooltip>
```

弹窗使用 `Descriptions` 展示客户名称、脱敏号码、提示词、音色、呼叫规则；用 `Radio.Group` 提供：

```tsx
<Radio value="ai_only">AI 完整通话</Radio>
<Radio
  value="handoff"
  disabled={capability.availableAgentCount === 0}
>
  AI 转人工通话
</Radio>
```

Handoff 为禁用状态时显示“暂无可用坐席，请先到坐席工作台上线”，不允许前端提交。

- [ ] **步骤 5：从任务对象而不是明文常量取得客户数据**

当前 `AiCallTask` 不含单对象手机号。组件第一次打开弹窗时调用：

```ts
const response = await listAiCallTaskTargets(task.taskId, {
  pageNum: 1,
  pageSize: 1,
});
const target = response.rows[0];
```

只用于单对象资格已通过的任务；仍由后端验证对象数量和号码。脱敏函数：

```ts
const maskPhone = (value: string) =>
  value.replace(/^(\d{3})\d+(\d{4})$/, '$1****$2');
```

- [ ] **步骤 6：在任务详情右上角装配组件**

```tsx
<Space>
  <LinphoneTaskTest
    task={task}
    onTaskChanged={async () => {
      await Promise.all([loadTask(), actionRef.current?.reload()]);
    }}
  />
  <Button onClick={() => history.push(buildRecordsUrl(task.taskId))}>
    查看全部通话记录
  </Button>
  <Button onClick={() => history.push('/ai-call/tasks')}>返回任务列表</Button>
</Space>
```

更新详情页测试 mock，显式 mock `LinphoneTaskTest`，断言它收到 `task-1` 和刷新回调，避免详情测试依赖组件内部异步行为。

- [ ] **步骤 7：运行组件与详情测试**

运行：

```bash
npx jest \
  src/pages/aiCallTasks/components/LinphoneTaskTest.test.tsx \
  src/pages/aiCallTasks/detail/index.test.tsx \
  --runInBand
```

预期：全部 PASS。

- [ ] **步骤 8：提交本任务**

```bash
git add src/pages/aiCallTasks/components/LinphoneTaskTest.tsx \
  src/pages/aiCallTasks/components/LinphoneTaskTest.test.tsx \
  src/pages/aiCallTasks/detail/index.tsx \
  src/pages/aiCallTasks/detail/index.test.tsx
git commit -m "feat(ai-call): add guarded Linphone test entry"
```

---

### 任务 3：实现启动幂等、可见性轮询和阶段展示

**文件：**

- 修改：`src/pages/aiCallTasks/components/LinphoneTaskTest.tsx`
- 修改：`src/pages/aiCallTasks/components/LinphoneTaskTest.test.tsx`

- [ ] **步骤 1：编写失败测试，锁定启动请求**

```tsx
it('starts once with one idempotency key and begins status polling', async () => {
  mockedGetCapability.mockResolvedValue(eligibleCapability);
  mockedListTargets.mockResolvedValue({
    rows: [singleTarget],
    total: 1,
  });
  mockedRunTest.mockResolvedValue({
    accepted: true,
    taskId: 'task-1',
    attemptId: 'attempt-1',
    callId: 'call-1',
  });
  mockedGetStatus.mockResolvedValue({
    ...activeStatus,
    phase: 'dialing',
  });
  render(<LinphoneTaskTest task={scheduledTask} onTaskChanged={jest.fn()} />);

  fireEvent.click(await screen.findByRole('button', { name: '测试拨打' }));
  fireEvent.click(screen.getByRole('button', { name: '确认拨打' }));

  await waitFor(() =>
    expect(mockedRunTest).toHaveBeenCalledWith(
      'task-1',
      'ai_only',
      expect.stringMatching(/^linphone-test-/),
    ),
  );
  await waitFor(() =>
    expect(mockedGetStatus).toHaveBeenCalledWith('task-1'),
  );
});
```

- [ ] **步骤 2：编写阶段和失败展示测试**

```tsx
it.each([
  ['dialing', '正在拨号'],
  ['ai_call', 'AI 通话中'],
  ['waiting_handoff', '等待坐席接单'],
  ['human_call', '人工通话中'],
  ['completed', '通话已完成'],
  ['failed', '测试失败'],
] as const)('renders %s as %s', async (phase, text) => {
  mockedGetCapability.mockResolvedValue(activeCapability);
  mockedGetStatus.mockResolvedValue({
    ...activeStatus,
    phase,
    errorMessage: phase === 'failed' ? 'Linphone 未注册' : null,
  });

  render(<LinphoneTaskTest task={runningTask} onTaskChanged={jest.fn()} />);

  expect(await screen.findByText(text)).toBeTruthy();
  if (phase === 'failed') {
    expect(screen.getByText('Linphone 未注册')).toBeTruthy();
  }
});
```

- [ ] **步骤 3：运行测试确认失败**

运行：

```bash
npx jest src/pages/aiCallTasks/components/LinphoneTaskTest.test.tsx --runInBand
```

预期：FAIL，启动、轮询和阶段展示尚未实现。

- [ ] **步骤 4：实现单次幂等键**

点击确认时生成一次：

```ts
const commandKey = `linphone-test-${task.taskId}-${crypto.randomUUID()}`;
```

在该请求成功或失败前保持同一 key，按钮 `loading` 且不可重复点击。只有用户关闭失败弹窗并重新发起新测试时才生成新 key。

- [ ] **步骤 5：复用可见性轮询**

```ts
const isTerminal =
  testStatus?.phase === 'completed' || testStatus?.phase === 'failed';

useVisiblePolling({
  enabled: Boolean(activeCallId && !isTerminal),
  intervalMs: 1_000,
  onTick: loadTestStatus,
});
```

启动成功后立即调用一次 `loadTestStatus()`；页面重载时若 capability 返回 `activeCallId`，直接恢复状态轮询。

- [ ] **步骤 6：实现紧凑状态面板**

状态面板展示：

- 阶段中文标签；
- `callId`，支持复制；
- `elapsedSeconds` 格式化为 `mm:ss`；
- Handoff 状态，无值显示“未触发”；
- 后端 `errorMessage`；
- “查看通话记录”和“结束当前通话”操作。

格式化函数：

```ts
const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};
```

- [ ] **步骤 7：终态时刷新任务和资格**

首次观察到 `completed` 或 `failed` 时：

```ts
await Promise.all([
  onTaskChanged(),
  loadCapability(),
]);
```

用 `useRef` 保存已处理的终态 `attemptId`，避免每次渲染重复刷新。

- [ ] **步骤 8：运行组件测试**

运行：

```bash
npx jest src/pages/aiCallTasks/components/LinphoneTaskTest.test.tsx --runInBand
```

预期：全部 PASS；失败原因显示后端原文，页面隐藏时现有 Hook 停止轮询。

- [ ] **步骤 9：提交本任务**

```bash
git add src/pages/aiCallTasks/components/LinphoneTaskTest.tsx \
  src/pages/aiCallTasks/components/LinphoneTaskTest.test.tsx
git commit -m "feat(ai-call): show Linphone test lifecycle"
```

---

### 任务 4：实现“结束当前通话”并区分“停止任务”

**文件：**

- 修改：`src/pages/aiCallTasks/components/LinphoneTaskTest.tsx`
- 修改：`src/pages/aiCallTasks/components/LinphoneTaskTest.test.tsx`

- [ ] **步骤 1：编写失败测试，锁定确认文案和接口**

```tsx
it('ends only the active call after explicit confirmation', async () => {
  mockedGetCapability.mockResolvedValue(activeCapability);
  mockedGetStatus.mockResolvedValue(activeStatus);
  mockedEndActiveCall.mockResolvedValue({ accepted: true });
  render(<LinphoneTaskTest task={runningTask} onTaskChanged={jest.fn()} />);

  fireEvent.click(
    await screen.findByRole('button', { name: '结束当前通话' }),
  );
  expect(
    screen.getByText('仅结束当前通话，不会停止整个外呼任务'),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '确认结束通话' }));

  await waitFor(() =>
    expect(mockedEndActiveCall).toHaveBeenCalledWith(
      'task-1',
      expect.stringMatching(/^linphone-end-/),
    ),
  );
});
```

- [ ] **步骤 2：编写接口失败测试**

```tsx
it('keeps the panel open and shows the backend end error', async () => {
  mockedGetCapability.mockResolvedValue(activeCapability);
  mockedGetStatus.mockResolvedValue(activeStatus);
  mockedEndActiveCall.mockRejectedValue(
    new RuoyiError('当前通话已经结束', {
      code: 409,
      msg: '当前通话已经结束',
    }),
  );

  render(<LinphoneTaskTest task={runningTask} onTaskChanged={jest.fn()} />);
  fireEvent.click(
    await screen.findByRole('button', { name: '结束当前通话' }),
  );
  fireEvent.click(screen.getByRole('button', { name: '确认结束通话' }));

  expect(await screen.findByText('当前通话已经结束')).toBeTruthy();
  expect(screen.getByText('AI 通话中')).toBeTruthy();
});
```

- [ ] **步骤 3：运行测试确认失败**

运行：

```bash
npx jest src/pages/aiCallTasks/components/LinphoneTaskTest.test.tsx --runInBand
```

预期：FAIL，结束确认尚未实现。

- [ ] **步骤 4：实现独立危险操作确认**

使用 `Modal.confirm`：

```tsx
Modal.confirm({
  title: '结束当前通话',
  content: '仅结束当前通话，不会停止整个外呼任务。通话结束后将按真实结果更新任务。',
  okText: '确认结束通话',
  okButtonProps: { danger: true },
  cancelText: '取消',
  onOk: async () => {
    await endAiCallTaskActiveCall(
      task.taskId,
      `linphone-end-${testStatus.callId}-${crypto.randomUUID()}`,
    );
    await loadTestStatus();
  },
});
```

按钮只在 `testStatus.canEndActiveCall` 为 true 时显示。不要调用现有 `stopAiCallTask()`。

- [ ] **步骤 5：运行组件测试**

运行：

```bash
npx jest src/pages/aiCallTasks/components/LinphoneTaskTest.test.tsx --runInBand
```

预期：全部 PASS。

- [ ] **步骤 6：提交本任务**

```bash
git add src/pages/aiCallTasks/components/LinphoneTaskTest.tsx \
  src/pages/aiCallTasks/components/LinphoneTaskTest.test.tsx
git commit -m "feat(ai-call): end active Linphone call safely"
```

---

### 任务 5：补齐本地 Mock 演示状态流

**文件：**

- 修改：`src/pages/aiCallTasks/_mock.ts`
- 修改：`src/pages/aiCallTasks/_mock.test.ts`

- [ ] **步骤 1：编写失败测试，锁定 Mock 接口**

```ts
it('simulates one guarded Linphone test lifecycle', async () => {
  const capability = await invoke(
    'GET /ai-call-agent-api/ai-call/outbound-tasks/:taskId/test-capability',
    { taskId: 'task-created-1' },
  );
  expect(capability.data).toMatchObject({
    enabled: true,
    eligible: true,
    activeCallId: null,
  });

  const accepted = await invoke(
    'POST /ai-call-agent-api/ai-call/outbound-tasks/:taskId/test-run',
    { taskId: 'task-created-1' },
    { scenario: 'ai_only' },
  );
  expect(accepted.data.callId).toMatch(/^call-test-/);

  const status = await invoke(
    'GET /ai-call-agent-api/ai-call/outbound-tasks/:taskId/test-status',
    { taskId: 'task-created-1' },
  );
  expect(status.data.phase).toBe('dialing');
});
```

- [ ] **步骤 2：运行 Mock 测试确认失败**

运行：

```bash
npx jest src/pages/aiCallTasks/_mock.test.ts --runInBand
```

预期：FAIL，测试接口 handler 尚未注册。

- [ ] **步骤 3：实现进程内单通 Mock**

增加单个模块变量：

```ts
let activeLinphoneTest:
  | {
      taskId: string;
      targetId: string;
      attemptId: string;
      callId: string;
      scenario: LinphoneTestScenario;
      startedAt: number;
      phaseIndex: number;
    }
  | undefined;
```

固定演示阶段：

```ts
const aiOnlyPhases = ['dialing', 'ai_call', 'completed'] as const;
const handoffPhases = [
  'dialing',
  'ai_call',
  'waiting_handoff',
  'human_call',
  'completed',
] as const;
```

每次 `test-status` 请求推进一个阶段；`active-call/end` 立即进入 `completed`。Mock 只服务页面演示，后端仍是安全门禁真源。

- [ ] **步骤 4：注册四个 Mock 路由**

```ts
'GET /ai-call-agent-api/ai-call/outbound-tasks/:taskId/test-capability':
  getTestCapability,
'POST /ai-call-agent-api/ai-call/outbound-tasks/:taskId/test-run':
  startTestRun,
'GET /ai-call-agent-api/ai-call/outbound-tasks/:taskId/test-status':
  getTestStatus,
'POST /ai-call-agent-api/ai-call/outbound-tasks/:taskId/active-call/end':
  endActiveTestCall,
```

- [ ] **步骤 5：运行 Mock 测试**

运行：

```bash
npx jest src/pages/aiCallTasks/_mock.test.ts --runInBand
```

预期：全部 PASS。

- [ ] **步骤 6：提交本任务**

```bash
git add src/pages/aiCallTasks/_mock.ts \
  src/pages/aiCallTasks/_mock.test.ts
git commit -m "test(ai-call): mock Linphone task lifecycle"
```

---

### 任务 6：前端回归、构建和浏览器无拨号验收

**文件：**

- 验证：`src/pages/aiCallTasks/`

- [ ] **步骤 1：同步 CodeGraph**

运行：

```bash
codegraph sync
```

预期：索引同步成功。若本机仍未安装 `codegraph`，记录“命令不可用”，继续执行 Jest、TypeScript、Biome 和浏览器验证。

- [ ] **步骤 2：运行 AI Call 任务测试**

运行：

```bash
npx jest src/pages/aiCallTasks --runInBand
```

预期：全部 PASS。

- [ ] **步骤 3：运行 TypeScript**

运行：

```bash
npm run tsc
```

预期：退出码 0。

- [ ] **步骤 4：运行定向 Biome**

运行：

```bash
npx biome check \
  src/pages/aiCallTasks/domain.ts \
  src/pages/aiCallTasks/service.ts \
  src/pages/aiCallTasks/service.test.ts \
  src/pages/aiCallTasks/components/LinphoneTaskTest.tsx \
  src/pages/aiCallTasks/components/LinphoneTaskTest.test.tsx \
  src/pages/aiCallTasks/detail/index.tsx \
  src/pages/aiCallTasks/detail/index.test.tsx \
  src/pages/aiCallTasks/_mock.ts \
  src/pages/aiCallTasks/_mock.test.ts
```

预期：退出码 0，无格式或 lint 错误。

- [ ] **步骤 5：运行生产构建**

运行：

```bash
npm run build
```

预期：构建成功；已有非阻断 warning 必须单独记录，不得写成“无警告”。

- [ ] **步骤 6：在 Mock 模式做浏览器自动验收**

启动当前前端工作树：

```bash
npm run start -- --port 8077
```

使用浏览器访问：

```text
http://localhost:8077/ai-call/tasks/task-created-1
```

自动验证：

1. “测试拨打”只在 capability enabled 时出现；
2. 不符合条件时按钮禁用并显示后端原因；
3. 弹窗展示客户、脱敏手机号、提示词、音色和规则；
4. Handoff 场景显示五步提示；
5. 状态阶段按顺序变化；
6. “查看通话记录”跳到
   `/ai-call/records?taskId=task-created-1&targetId=target-task-created-1-18`；
7. “结束当前通话”的确认文案不包含“停止任务”含义。

预期：全部通过；Mock 模式不会请求 SIP，也不会让 Linphone 响铃。

- [ ] **步骤 7：在真实代理模式做接口联调，但不点击确认拨打**

启动：

```bash
npm run start:no-mock -- --port 8077
```

登录后访问真实单号码任务详情，检查 capability、按钮状态和弹窗数据。

预期：请求走
`/ai-call-agent-api/ai-call/outbound-tasks/task-created-1/test-capability`；
在用户未准备好 Linphone 前不点击“确认拨打”。

- [ ] **步骤 8：与后端真人验收合并执行**

只有后端计划任务 9 的运行实例、SIP、Linphone 和坐席门禁全部通过后，才执行：

- AI-only 接听与挂断；
- Handoff 坐席接单；
- 主动结束；
- 未接听；
- API 重启恢复。

前端记录页面状态与错误文案，后端记录数据库终态。两边证据都通过后，才能声明该功能完成。

- [ ] **步骤 9：请求代码审查**

使用 `requesting-code-review` 重点检查：

- 前端是否复制了后端白名单和租户判断；
- Handoff 无坐席时是否仍可提交；
- 页面隐藏时是否继续高频轮询；
- 终态是否重复刷新；
- “停止任务”与“结束当前通话”是否混淆；
- 失败时是否丢失后端 `errorMessage`。
