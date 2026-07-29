# 通用外呼音色管理前端实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在通用外呼下交付单列表音色管理、创建弹窗、状态刷新、试听、受引用保护的删除，以及任务创建页可用音色选择。

**架构：** 新页面使用 Ant Design Pro 的 `ProTable` 和项目既有列表布局，API 统一走 `ruoyiRequest` 以携带认证。创建操作使用 FormData、一次操作一个 Idempotency-Key 和同步提交锁；活动状态复用可见页面轮询 Hook；试听复用 LiveKit 浏览器播放能力但不启用麦克风。

**技术栈：** React 19、TypeScript strict、Umi Max v4、Ant Design v6、ProComponents v3、Jest、Testing Library、Biome。

---

## 执行仓库与前置约束

- 工作目录：`/Users/liuhongli/.codex/worktrees/a3cd/recov-ai-web-react`
- 当前分支：`codex/generic-outbound-task-v1`
- 当前工作区已有未提交改动，并且 `config/routes.ts`、菜单、任务创建页和
  `ai-call-lab.ts` 均有重叠改动。执行前逐文件检查 diff，只暂存本任务 hunks。
- 编写任何 antd 组件前运行对应 `npx antd info <Component>`。
- 不手写 multipart `Content-Type`。
- 页面不出现“可用音色 / 创建记录”双 Tab。

## 文件结构

**创建：**

- `src/services/ruoyi/ai-call-voices.types.ts`：共享音色 DTO 和请求类型。
- `src/pages/aiCallVoices/domain.ts`：页面状态元数据和文件校验。
- `src/pages/aiCallVoices/domain.test.ts`：状态和文件校验测试。
- `src/services/ruoyi/ai-call-voices.ts`：共享的列表、创建、重传、试听和删除 API。
- `src/services/ruoyi/ai-call-voices.test.ts`：请求契约测试。
- `src/pages/aiCallVoices/VoiceEnrollmentModal.tsx`：创建/重新上传弹窗。
- `src/pages/aiCallVoices/VoiceEnrollmentModal.test.tsx`：表单与防重复测试。
- `src/pages/aiCallVoices/VoicePreview.ts`：无麦克风 LiveKit 试听连接。
- `src/pages/aiCallVoices/VoicePreview.test.ts`：音轨播放和清理测试。
- `src/pages/aiCallVoices/index.tsx`：单列表页面。
- `src/pages/aiCallVoices/index.test.tsx`：筛选、轮询、操作和删除测试。

**修改：**

- `config/routes.ts`、`config/routes.test.ts`：增加 `/ai-call/voices`。
- `src/adapters/ruoyi/menu.tsx`、`src/adapters/ruoyi/menu.test.tsx`：注入“音色管理”。
- `src/pages/aiCallTasks/create/index.tsx`、`index.test.tsx`：只查询可用音色和管理入口。
- `src/services/ruoyi/ai-call-lab.ts`、`ai-call-lab.test.ts`：旧 Lab 获取音色时显式
  `availableOnly=true`，兼容统一 DTO。

### 任务 1：定义领域类型、状态元数据和文件预检

**文件：**

- 创建：`src/services/ruoyi/ai-call-voices.types.ts`
- 创建：`src/pages/aiCallVoices/domain.ts`
- 创建：`src/pages/aiCallVoices/domain.test.ts`

- [ ] **步骤 1：编写失败测试**

```ts
import {
  canPollVoiceStatus,
  getVoiceStatusMeta,
  validateVoiceSample,
} from './domain';

describe('voice domain', () => {
  it('only polls active states', () => {
    expect(canPollVoiceStatus('CREATING')).toBe(true);
    expect(canPollVoiceStatus('DELETING')).toBe(true);
    expect(canPollVoiceStatus('ENABLED')).toBe(false);
    expect(canPollVoiceStatus('CREATE_FAILED')).toBe(false);
  });

  it('labels deletion failures without making them selectable', () => {
    expect(getVoiceStatusMeta('DELETE_FAILED')).toMatchObject({
      label: '删除失败',
      selectable: false,
    });
  });

  it('rejects files at or above 10 MB', () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024)], 'voice.mp3', {
      type: 'audio/mpeg',
    });
    expect(validateVoiceSample(file)).toBe('声音样本必须小于 10 MB');
  });
});
```

- [ ] **步骤 2：运行测试确认失败**

```bash
npx jest src/pages/aiCallVoices/domain.test.ts --runInBand
```

预期：FAIL，模块尚不存在。

- [ ] **步骤 3：实现共享类型与页面纯函数**

```ts
// src/services/ruoyi/ai-call-voices.types.ts
export type VoiceStatus =
  | 'CREATING'
  | 'ENABLED'
  | 'CREATE_FAILED'
  | 'DELETING'
  | 'DELETE_FAILED'
  | 'DELETED';

export type AiCallVoiceProfile = {
  id: string;
  scope: 'GLOBAL' | 'TENANT';
  voice: string | null;
  displayName: string;
  voiceType: string;
  gender: string;
  language?: string | null;
  targetModel: string;
  status: VoiceStatus;
  errorMessage?: string | null;
  canPreview: boolean;
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
};

// src/pages/aiCallVoices/domain.ts
export const ACTIVE_VOICE_STATUSES = new Set<VoiceStatus>([
  'CREATING',
  'DELETING',
]);
```

文件预检只检查扩展名、MIME、非空和 `<10 MB`；时长、采样率、声道和 WAV bit depth
由后端作为权威校验。

- [ ] **步骤 4：验证并 Commit**

```bash
npx jest src/pages/aiCallVoices/domain.test.ts --runInBand
npx biome check src/services/ruoyi/ai-call-voices.types.ts \
  src/pages/aiCallVoices/domain.ts \
  src/pages/aiCallVoices/domain.test.ts
git diff --check
git add src/services/ruoyi/ai-call-voices.types.ts \
  src/pages/aiCallVoices/domain.ts src/pages/aiCallVoices/domain.test.ts
git commit -m "feat(ai-call): 定义音色管理领域模型"
```

### 任务 2：实现音色管理 API 客户端

**文件：**

- 创建：`src/services/ruoyi/ai-call-voices.ts`
- 创建：`src/services/ruoyi/ai-call-voices.test.ts`

- [ ] **步骤 1：编写 multipart 和幂等失败测试**

```ts
it('submits FormData without manually setting Content-Type', async () => {
  mockRuoyiRequest.mockResolvedValue({
    code: 200,
    data: {
      voiceProfileId: '1',
      enrollmentId: '2',
      status: 'CREATING',
      displayName: '客服小林',
    },
  });
  await createVoiceEnrollment(
    {
      file: new File(['voice'], 'voice.mp3', { type: 'audio/mpeg' }),
      request: {
        displayName: '客服小林',
        gender: '女声',
        language: 'zh',
        consentConfirmed: true,
      },
    },
    'uuid-1',
  );
  const [, options] = mockRuoyiRequest.mock.calls[0];
  expect(options.data).toBeInstanceOf(FormData);
  expect(options.headers).toEqual({ 'Idempotency-Key': 'uuid-1' });
  expect(options.headers).not.toHaveProperty('Content-Type');
});
```

同时覆盖列表 camelCase 参数、重传 URL、试听、deletion-check 和 DELETE Key。

- [ ] **步骤 2：运行测试确认失败**

```bash
npx jest src/services/ruoyi/ai-call-voices.test.ts --runInBand
```

预期：FAIL，service 尚不存在。

- [ ] **步骤 3：实现 API**

共享 service 从 `ai-call-voices.types.ts` 导入类型，公开 API 形状固定为：

```ts
export type AiCallVoiceApi = {
  listVoiceProfiles: (
    query: VoiceProfileQuery,
  ) => Promise<PageResult<AiCallVoiceProfile>>;
  createVoiceEnrollment: (
    payload: VoiceEnrollmentPayload,
    idempotencyKey: string,
  ) => Promise<VoiceEnrollmentAccepted>;
  reenrollVoice: (
    profileId: string,
    payload: VoiceEnrollmentPayload,
    idempotencyKey: string,
  ) => Promise<VoiceEnrollmentAccepted>;
  createVoicePreviewSession: (voice: string) => Promise<VoicePreviewSession>;
  markVoicePreviewReady: (callId: string) => Promise<void>;
  endVoicePreviewSession: (callId: string) => Promise<void>;
  getVoiceDeletionCheck: (profileId: string) => Promise<VoiceDeletionCheck>;
  deleteTenantVoice: (
    profileId: string,
    idempotencyKey: string,
  ) => Promise<VoiceDeletionAccepted>;
};
```

`FormData` 写入：

```ts
formData.append('file', payload.file);
formData.append('request', JSON.stringify(payload.request));
```

所有请求使用 `baseApi: '/ai-call-agent-api'`。

- [ ] **步骤 4：验证并 Commit**

```bash
npx jest src/services/ruoyi/ai-call-voices.test.ts --runInBand
npx biome check src/services/ruoyi/ai-call-voices.ts \
  src/services/ruoyi/ai-call-voices.test.ts
git diff --check
git add src/services/ruoyi/ai-call-voices.ts \
  src/services/ruoyi/ai-call-voices.test.ts
git commit -m "feat(ai-call): 增加音色管理接口客户端"
```

### 任务 3：增加独立菜单、路由与权限

**文件：**

- 修改：`config/routes.ts`
- 修改：`config/routes.test.ts`
- 修改：`src/adapters/ruoyi/menu.tsx`
- 修改：`src/adapters/ruoyi/menu.test.tsx`

- [ ] **步骤 1：先扩展失败测试**

路由断言：

```ts
[
  '/ai-call/voices',
  './aiCallVoices',
  'ai_call:voice:manage',
]
```

菜单期望顺序：

```ts
[
  '/ai-call/tasks',
  '/ai-call/records',
  '/ai-call/voices',
  '/ai-call/lines',
  '/ai-call/rules',
]
```

- [ ] **步骤 2：运行测试确认失败**

```bash
npx jest config/routes.test.ts src/adapters/ruoyi/menu.test.tsx --runInBand
```

预期：FAIL，voices 路由和菜单尚不存在。

- [ ] **步骤 3：最小修改路由和注入菜单**

路由对象：

```ts
{
  path: '/ai-call/voices',
  component: './aiCallVoices',
  hideInMenu: true,
  access: 'hasRoutePermission',
  requiredPermission: 'ai_call:voice:manage',
}
```

菜单项名称固定“音色管理”，图标使用 `SoundOutlined`，不新增顶级菜单。

- [ ] **步骤 4：验证并 Commit**

```bash
npx jest config/routes.test.ts src/adapters/ruoyi/menu.test.tsx --runInBand
npx biome check config/routes.ts config/routes.test.ts \
  src/adapters/ruoyi/menu.tsx src/adapters/ruoyi/menu.test.tsx
git diff --check
git add -p config/routes.ts config/routes.test.ts \
  src/adapters/ruoyi/menu.tsx src/adapters/ruoyi/menu.test.tsx
git commit -m "feat(ai-call): 增加音色管理菜单入口"
```

`git add -p` 只选择本任务新增 hunks，不暂存当前文件里的既有用户改动。

### 任务 4：实现创建和重新上传弹窗

**文件：**

- 创建：`src/pages/aiCallVoices/VoiceEnrollmentModal.tsx`
- 创建：`src/pages/aiCallVoices/VoiceEnrollmentModal.test.tsx`

- [ ] **步骤 1：查询 antd API**

```bash
npx antd info Modal
npx antd info Form
npx antd info Upload
```

预期：命令成功输出当前 antd v6 API。

- [ ] **步骤 2：编写授权和防重复失败测试**

```tsx
it('requires consent and ignores a synchronous second submit', async () => {
  const submit = jest.fn(
    () => new Promise<void>((resolve) => setTimeout(resolve, 100)),
  );
  render(<VoiceEnrollmentModal open onSubmit={submit} onCancel={jest.fn()} />);

  await fillRequiredFields();
  await user.click(screen.getByRole('button', { name: '提交复刻' }));
  await user.click(screen.getByRole('button', { name: '提交复刻' }));
  expect(submit).not.toHaveBeenCalled();

  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: '提交复刻' }));
  await user.click(screen.getByRole('button', { name: '提交复刻' }));
  expect(submit).toHaveBeenCalledTimes(1);
});
```

同时断言 WAV/MP3/M4A、大小错误、取消清空表单、重传时保留展示名。

- [ ] **步骤 3：运行测试确认失败**

```bash
npx jest src/pages/aiCallVoices/VoiceEnrollmentModal.test.tsx --runInBand
```

预期：FAIL，组件尚不存在。

- [ ] **步骤 4：实现弹窗**

字段和授权文案完全使用设计规格。核心提交逻辑：

```ts
if (submittingRef.current) return;
submittingRef.current = true;
setSubmitting(true);
try {
  await onSubmit(values, file);
} finally {
  submittingRef.current = false;
  setSubmitting(false);
}
```

按钮同时设置 `loading={submitting}` 和 `disabled={submitting}`。不使用延迟首次点击的
300 ms debounce。

- [ ] **步骤 5：验证并 Commit**

```bash
npx jest src/pages/aiCallVoices/VoiceEnrollmentModal.test.tsx --runInBand
npx biome check src/pages/aiCallVoices/VoiceEnrollmentModal.tsx \
  src/pages/aiCallVoices/VoiceEnrollmentModal.test.tsx
git diff --check
git add src/pages/aiCallVoices/VoiceEnrollmentModal.tsx \
  src/pages/aiCallVoices/VoiceEnrollmentModal.test.tsx
git commit -m "feat(ai-call): 增加自定义音色创建弹窗"
```

### 任务 5：实现单列表、状态轮询和创建闭环

**文件：**

- 创建：`src/pages/aiCallVoices/index.tsx`
- 创建：`src/pages/aiCallVoices/index.test.tsx`

- [ ] **步骤 1：查询 antd/ProComponents API**

```bash
npx antd info Button
npx antd info Tag
npx antd info Tooltip
```

- [ ] **步骤 2：编写单列表和轮询失败测试**

```tsx
it('renders one table and polls only while active rows exist', async () => {
  mockList
    .mockResolvedValueOnce({
      rows: [voice({ id: '1', status: 'CREATING' })],
      total: 1,
    })
    .mockResolvedValue({
      rows: [voice({ id: '1', status: 'ENABLED' })],
      total: 1,
    });
  render(<AiCallVoicesPage />);
  expect(await screen.findByText('创建中')).toBeInTheDocument();
  expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  act(() => jest.advanceTimersByTime(2_000));
  expect(mockList).toHaveBeenCalledTimes(2);
  expect(await screen.findByText('可用')).toBeInTheDocument();
});
```

再覆盖页面 hidden 时停轮询、新创建记录置顶、筛选和分页 `showTotal`。

- [ ] **步骤 3：运行测试确认失败**

```bash
npx jest src/pages/aiCallVoices/index.test.tsx --runInBand
```

预期：FAIL，页面尚不存在。

- [ ] **步骤 4：实现页面**

使用 `PageContainer + ProTable` 或项目 `RecovListPage/RecovTableCard`。查询区左侧为
类型、性别、状态和查询/重置，右侧为刷新与“创建自定义音色”。

提交处理必须保持 Key 生命周期：

```ts
const enrollmentKeyRef = useRef<string>();
const getOrCreateEnrollmentKey = () =>
  (enrollmentKeyRef.current ||= createIdempotencyKey('voice-enrollment'));

// 202 受理后清空；结果未知保留，供用户重试同一提交。
```

202 后关闭弹窗，把 accepted row 临时置顶并 reload；服务器返回行后按 ID 去重。

- [ ] **步骤 5：验证并 Commit**

```bash
npx jest src/pages/aiCallVoices/index.test.tsx \
  src/pages/aiCallVoices/VoiceEnrollmentModal.test.tsx --runInBand
npx biome check src/pages/aiCallVoices/index.tsx \
  src/pages/aiCallVoices/index.test.tsx
git diff --check
git add src/pages/aiCallVoices/index.tsx src/pages/aiCallVoices/index.test.tsx
git commit -m "feat(ai-call): 增加音色生命周期单列表"
```

### 任务 6：实现浏览器真实音色试听

**文件：**

- 创建：`src/pages/aiCallVoices/VoicePreview.ts`
- 创建：`src/pages/aiCallVoices/VoicePreview.test.ts`
- 修改：`src/pages/aiCallVoices/index.tsx`
- 修改：`src/pages/aiCallVoices/index.test.tsx`

- [ ] **步骤 1：编写无麦克风试听失败测试**

```ts
it('connects, plays remote audio and never creates a microphone track', async () => {
  const preview = await connectVoicePreview(session);
  expect(mockCreateLocalAudioTrack).not.toHaveBeenCalled();
  emitTrackSubscribed(remoteAudioTrack);
  expect(document.body.querySelector('audio')).not.toBeNull();
  await preview.disconnect();
  expect(document.body.querySelector('audio')).toBeNull();
});
```

再覆盖连接失败清理、30 秒自动断开和重复点击只保留一个会话。

- [ ] **步骤 2：运行测试确认失败**

```bash
npx jest src/pages/aiCallVoices/VoicePreview.test.ts --runInBand
```

预期：FAIL，试听连接器尚不存在。

- [ ] **步骤 3：实现播放连接器**

复用 `livekit-client` 的 `Room` 和 `RoomEvent.TrackSubscribed`，但不调用
`createLocalAudioTrack()`。连接成功后调用
`POST /voice-preview-sessions/{callId}/ready`，触发服务端固定开场白；主动停止或页面
卸载时调用 `DELETE /voice-preview-sessions/{callId}`。

页面只在 `status=ENABLED && canPreview && voice` 时显示“试听”；切换音色、页面卸载或
超时均断开旧 Room。

- [ ] **步骤 4：验证并 Commit**

```bash
npx jest src/pages/aiCallVoices/VoicePreview.test.ts \
  src/pages/aiCallVoices/index.test.tsx --runInBand
npx biome check src/pages/aiCallVoices/VoicePreview.ts \
  src/pages/aiCallVoices/VoicePreview.test.ts src/pages/aiCallVoices/index.tsx
git diff --check
git add src/pages/aiCallVoices/VoicePreview.ts \
  src/pages/aiCallVoices/VoicePreview.test.ts \
  src/pages/aiCallVoices/index.tsx src/pages/aiCallVoices/index.test.tsx
git commit -m "feat(ai-call): 增加浏览器音色试听"
```

### 任务 7：实现删除引用检查和危险确认

**文件：**

- 修改：`src/pages/aiCallVoices/index.tsx`
- 修改：`src/pages/aiCallVoices/index.test.tsx`

- [ ] **步骤 1：编写阻塞与允许删除失败测试**

```tsx
it('does not call DELETE when active tasks reference the voice', async () => {
  mockDeletionCheck.mockResolvedValue({
    deletable: false,
    blockingTaskCount: 2,
    historicalTaskCount: 18,
    blockingTaskIds: ['1001', '1002'],
  });
  await clickDelete();
  expect(await screen.findByText(/仍被 2 个未结束任务引用/)).toBeInTheDocument();
  expect(mockDelete).not.toHaveBeenCalled();
});

it('deletes after explicit confirmation when only history remains', async () => {
  mockDeletionCheck.mockResolvedValue({
    deletable: true,
    blockingTaskCount: 0,
    historicalTaskCount: 18,
    blockingTaskIds: [],
  });
  await clickDelete();
  await user.click(screen.getByRole('button', { name: '确认删除' }));
  expect(mockDelete).toHaveBeenCalledWith('1', expect.any(String));
});
```

- [ ] **步骤 2：运行测试确认失败**

```bash
npx jest src/pages/aiCallVoices/index.test.tsx --runInBand
```

预期：FAIL，删除操作尚未实现。

- [ ] **步骤 3：实现删除交互**

确认文案包含对象名、历史引用数量、删除后不可用于新任务、不可恢复。预检查阻塞时只展示
信息和阻塞任务 ID，不展示危险确认按钮。DELETE 返回 202 后立即把行显示为“删除中”。

相同删除点击在结果未知时复用 Key；明确 202 或明确失败关闭本次 Key 生命周期。

- [ ] **步骤 4：验证并 Commit**

```bash
npx jest src/pages/aiCallVoices/index.test.tsx --runInBand
npx biome check src/pages/aiCallVoices/index.tsx \
  src/pages/aiCallVoices/index.test.tsx
git diff --check
git add src/pages/aiCallVoices/index.tsx src/pages/aiCallVoices/index.test.tsx
git commit -m "feat(ai-call): 增加音色引用保护删除"
```

### 任务 8：接入正式外呼创建页

**文件：**

- 修改：`src/services/ruoyi/ai-call-lab.ts`
- 修改：`src/services/ruoyi/ai-call-lab.test.ts`
- 修改：`src/pages/aiCallTasks/create/index.tsx`
- 修改：`src/pages/aiCallTasks/create/index.test.tsx`

- [ ] **步骤 1：编写可用音色查询失败测试**

```ts
it('loads only available voices for formal tasks', async () => {
  await getAiCallLabVoiceProfiles({ availableOnly: true });
  expect(mockRequest).toHaveBeenCalledWith(
    '/ai-call-lab-api/ai-call/voice-profiles',
    expect.objectContaining({
      params: expect.objectContaining({ availableOnly: true }),
    }),
  );
});
```

页面测试断言存在“前往音色管理”链接并跳转 `/ai-call/voices`，下拉框忽略
`voice=null` 或 `status !== ENABLED`。

- [ ] **步骤 2：运行测试确认失败**

```bash
npx jest src/services/ruoyi/ai-call-lab.test.ts \
  src/pages/aiCallTasks/create/index.test.tsx --runInBand
```

预期：新增断言 FAIL。

- [ ] **步骤 3：扩展兼容类型和请求**

`AiCallLabVoiceProfile` 直接复用共享 `AiCallVoiceProfile`。把
`getAiCallLabVoiceProfiles` 改为调用 `listVoiceProfiles`，确保请求经过
`ruoyiRequest` 携带认证；函数接受可选查询参数：

```ts
getAiCallLabVoiceProfiles({ availableOnly: true, pageSize: 200 })
```

任务页过滤：

```ts
const selectableVoices = result.rows.filter(
  (item): item is AiCallLabVoiceProfile & { voice: string } =>
    item.status === 'ENABLED' && Boolean(item.voice),
);
```

- [ ] **步骤 4：保持当前任务提交防重复逻辑**

不得移除现有 `creatingRef + creating loading + Idempotency-Key`。新链接只负责导航，
不在任务表单中打开音色创建弹窗。

- [ ] **步骤 5：验证并 Commit**

```bash
npx jest src/services/ruoyi/ai-call-lab.test.ts \
  src/pages/aiCallTasks/create/index.test.tsx --runInBand
npx biome check src/services/ruoyi/ai-call-lab.ts \
  src/services/ruoyi/ai-call-lab.test.ts \
  src/pages/aiCallTasks/create/index.tsx \
  src/pages/aiCallTasks/create/index.test.tsx
git diff --check
git add -p src/services/ruoyi/ai-call-lab.ts \
  src/services/ruoyi/ai-call-lab.test.ts \
  src/pages/aiCallTasks/create/index.tsx \
  src/pages/aiCallTasks/create/index.test.tsx
git commit -m "feat(ai-call): 正式任务只使用可用音色"
```

### 任务 9：前端回归和阶段 B 门禁

**文件：**

- 检查：本计划全部前端文件

- [ ] **步骤 1：运行音色专项测试**

```bash
npx jest \
  src/pages/aiCallVoices/domain.test.ts \
  src/services/ruoyi/ai-call-voices.test.ts \
  src/pages/aiCallVoices/VoiceEnrollmentModal.test.tsx \
  src/pages/aiCallVoices/VoicePreview.test.ts \
  src/pages/aiCallVoices/index.test.tsx --runInBand
```

预期：全部 PASS。

- [ ] **步骤 2：运行受影响回归**

```bash
npx jest \
  config/routes.test.ts \
  src/adapters/ruoyi/menu.test.tsx \
  src/services/ruoyi/ai-call-lab.test.ts \
  src/pages/aiCallTasks/create/index.test.tsx \
  src/pages/aiCallTasks/hooks/useVisiblePolling.test.tsx --runInBand
```

预期：全部 PASS。

- [ ] **步骤 3：运行静态检查和构建**

```bash
npm run tsc
npx biome check \
  config/routes.ts config/routes.test.ts \
  src/adapters/ruoyi/menu.tsx src/adapters/ruoyi/menu.test.tsx \
  src/pages/aiCallVoices \
  src/pages/aiCallTasks/create/index.tsx \
  src/pages/aiCallTasks/create/index.test.tsx \
  src/services/ruoyi/ai-call-voices.ts \
  src/services/ruoyi/ai-call-voices.types.ts \
  src/services/ruoyi/ai-call-voices.test.ts \
  src/services/ruoyi/ai-call-lab.ts \
  src/services/ruoyi/ai-call-lab.test.ts
npx antd lint ./src
npm run build
git diff --check
```

预期：所有命令退出码 0。

- [ ] **步骤 4：Fake 后端浏览器回归**

在本地页面验证：

1. 菜单顺序正确且权限不足不可见。
2. 单列表没有 Tab。
3. 未勾授权不能提交。
4. 连续点击只发出一个 POST。
5. 202 后弹窗关闭、创建中行置顶并轮询。
6. 页面隐藏停止轮询。
7. 失败可重新上传。
8. 阻塞引用不能删除。
9. 允许删除必须二次确认。
10. 试听结束后音频元素和 Room 均释放。

- [ ] **步骤 5：审计提交范围**

```bash
git status --short
git log --oneline --max-count=10
```

阶段 B 只证明前端与 Fake/测试契约闭环，不声称真实 Qwen 或真实 SIP 已通过。
