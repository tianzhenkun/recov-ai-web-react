# 坐席转人工可靠性与完整对话区实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 修复首次认领事务异常和 `media-ready` 缺失，增加只读网关错误恢复与单条完整上下文接口，并按 B3 方案展示摘要和完整 AI/客户对话。

**架构：** 待接池继续使用批量轻量响应；选中或认领单条请求时，通过独立上下文接口加载完整会话。认领服务在有效事务内准备响应快照，提交后不再查询已关闭事务；浏览器在 LiveKit 连接和麦克风发布后携带 `participant_identity` 上报 `media-ready`。所有自动重试只覆盖 GET 类读取。

**技术栈：** FastAPI、SQLAlchemy AsyncSession、SQLite/PostgreSQL、pytest、React、TypeScript、Ant Design、LiveKit Client、Jest、Testing Library、Biome。

---

## 文件结构

后端工作区：`/Users/liuhongli/.codex/worktrees/ed81/ai-call`

- 修改 `app/services/ai_call/agent_console_service.py`：拆分认领结果快照、增加单条完整上下文读取。
- 修改 `app/api/v1/ai_call/agent_console_controller.py`：认领响应不再在提交后查询；注册单条上下文接口。
- 修改 `app/api/v1/ai_call/crud.py`：增加不限制 6 条、仅按单个 `call_id` 读取最终对话的仓储方法。
- 修改 `tests/test_ai_call_agent_console_claim.py`：覆盖原子认领、完整上下文过滤与顺序。
- 修改 `tests/test_ai_call_agent_console_api.py`：使用真实事务上下文复现并防止 closed transaction 回归；覆盖新路由。

前端工作区：`/Users/liuhongli/.codex/worktrees/a3cd/recov-ai-web-react`

- 修改 `src/services/ruoyi/agent-console.ts`：补齐 `media-ready` 参数和上下文 DTO/API。
- 修改 `src/services/ruoyi/agent-console.test.ts`：冻结新增接口与请求体契约。
- 创建 `src/pages/agentWorkbench/utils/readRetry.ts`：仅供 GET 读取使用的 502/503/504 有界重试。
- 创建 `src/pages/agentWorkbench/utils/readRetry.test.ts`：覆盖重试次数、间隔、可重试判断。
- 修改 `src/pages/agentWorkbench/hooks/useAgentPresence.ts`：bootstrap 恢复状态与手动重连。
- 修改 `src/pages/agentWorkbench/hooks/useAgentPresence.test.tsx`：覆盖 3 秒、最多 5 次和恢复行为。
- 修改 `src/pages/agentWorkbench/hooks/useAgentCall.ts`：暴露细分媒体阶段，并携带 `participant_identity`。
- 修改 `src/pages/agentWorkbench/hooks/useAgentCall.test.tsx`：覆盖阶段顺序、请求体和错误文案。
- 修改 `src/pages/agentWorkbench/components/CurrentCallPanel.tsx`：展示准确的接入阶段。
- 修改 `src/pages/agentWorkbench/components/HandoffContextPanel.tsx`：B3 摘要和完整气泡对话。
- 修改 `src/pages/agentWorkbench/components/HandoffContextPanel.css`：480px 右栏内的气泡、600px 滚动区。
- 修改 `src/pages/agentWorkbench/components/HandoffContextPanel.test.tsx`：覆盖完整对话、左右角色、无时间和无待办。
- 修改 `src/pages/agentWorkbench/index.tsx`：加载单条上下文、展示恢复提示。
- 修改 `src/pages/agentWorkbench/index.css`：桌面三栏与窄屏下移，消除横向滚动。
- 修改 `src/pages/agentWorkbench/agentWorkflow.test.tsx`：覆盖端到端前端状态链。

### 任务 1：用真实事务测试锁定首次认领异常

- [ ] **步骤 1：编写失败的控制器回归测试**

在 `tests/test_ai_call_agent_console_api.py` 新增真实 `AsyncSession` 场景：使用 `async with db.begin()` 模拟 `db_getter`，完成认领后继续构建响应。断言整个控制器调用不抛出 `InvalidRequestError`，响应包含 handoff 与 seat token。

```python
@pytest.mark.anyio
async def test_claim_controller_does_not_query_after_claim_transaction_commit(
    seeded_claim_session,
    monkeypatch,
) -> None:
    db, auth, console_session_id = seeded_claim_session
    monkeypatch.setattr(
        agent_console_controller,
        "_issue_handoff_token",
        lambda _auth, _handoff: {"participant_token": "token"},
    )
    monkeypatch.setattr(agent_console_controller, "_publish", AsyncMock())

    async with db.begin():
        response = await agent_console_controller.claim_handoff_controller(
            "handoff-1",
            AgentHandoffClaimIn(console_session_id=console_session_id),
            auth,
            AiCallAgentConsoleService(db),
        )

    assert response.data["handoff"]["status"] == "accepted"
    assert response.data["seat_token"]["participant_token"] == "token"
```

- [ ] **步骤 2：运行测试确认复现**

运行：

```bash
cd /Users/liuhongli/.codex/worktrees/ed81/ai-call
uv run pytest tests/test_ai_call_agent_console_api.py::test_claim_controller_does_not_query_after_claim_transaction_commit -q
```

预期：FAIL，错误包含 `Can't operate on closed transaction inside context manager`。

- [ ] **步骤 3：增加认领结果快照方法**

在 `agent_console_service.py` 增加不可变结果类型，并让新方法在 `commit()` 前生成 payload：

```python
@dataclass(frozen=True)
class HandoffClaimResult:
    handoff: AiCallHandoffModel
    payload: dict

async def claim_handoff_with_payload(
    self,
    auth: AuthSchema,
    *,
    handoff_id: str,
    console_session_id: str,
) -> HandoffClaimResult:
    handoff = await self.claim_handoff(
        auth,
        handoff_id=handoff_id,
        console_session_id=console_session_id,
        commit=False,
    )
    payload = await self.handoff_payload(handoff)
    await self.db.commit()
    return HandoffClaimResult(handoff=handoff, payload=payload)
```

在现有 `claim_handoff()` 增加仅供上述组合方法使用的 keyword-only 参数
`commit: bool = True`，并把方法末尾改为：

```python
if commit:
    await self.db.commit()
return handoff
```

这样现有服务调用保持返回 handoff，控制器改用
`claim_handoff_with_payload()`，响应直接使用 `result.payload`，提交后只签
Token 和发事件。

- [ ] **步骤 4：运行认领与并发测试**

运行：

```bash
uv run pytest \
  tests/test_ai_call_agent_console_api.py::test_claim_controller_does_not_query_after_claim_transaction_commit \
  tests/test_ai_call_agent_console_claim.py -k "claim" -q
```

预期：PASS；并发场景仍只有一个坐席认领成功，同一坐席同一会话重试保持幂等。

- [ ] **步骤 5：提交后端认领修复**

```bash
git add app/services/ai_call/agent_console_service.py \
  app/api/v1/ai_call/agent_console_controller.py \
  tests/test_ai_call_agent_console_api.py \
  tests/test_ai_call_agent_console_claim.py
git commit -m "fix: 修复坐席认领事务边界"
```

### 任务 2：增加单条完整转人工上下文

- [ ] **步骤 1：编写完整上下文失败测试**

在 `tests/test_ai_call_agent_console_claim.py` 新增 8 条混合对话，包含 `draft`、`human_agent` 和空文本。调用 `handoff_context_payload()` 后断言只返回按 `segment_no` 升序排列的全部 `final + ai/customer`：

```python
assert [turn["speaker_type"] for turn in payload["dialogue"]] == [
    "ai",
    "customer",
    "ai",
    "customer",
    "ai",
    "customer",
]
assert all(turn["text"].strip() for turn in payload["dialogue"])
assert "pending_items" not in payload
```

同时增加以下拒绝测试：

```python
with pytest.raises(CustomException) as conflict:
    await service.handoff_context_payload(
        _auth(db, user_id=20),
        handoff_id="handoff-1",
        console_session_id="other-session",
    )
assert _error_code(conflict.value) == "CONSOLE_SESSION_CONFLICT"
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
uv run pytest tests/test_ai_call_agent_console_claim.py -k "handoff_context" -q
```

预期：FAIL，提示 `handoff_context_payload` 或完整对话仓储方法不存在。

- [ ] **步骤 3：实现仓储与服务**

在 `crud.py` 增加单次通话完整最终对话查询：

```python
async def list_handoff_context_dialogue(
    self,
    call_id: str,
) -> list[AiCallDialogueSegmentModel]:
    result = await self.db.execute(
        select(AiCallDialogueSegmentModel)
        .where(
            AiCallDialogueSegmentModel.call_id == call_id,
            AiCallDialogueSegmentModel.segment_status == "final",
            AiCallDialogueSegmentModel.speaker_type.in_({"ai", "customer"}),
            func.length(func.trim(AiCallDialogueSegmentModel.segment_text)) > 0,
        )
        .order_by(
            asc(AiCallDialogueSegmentModel.segment_no),
            asc(AiCallDialogueSegmentModel.id),
        )
    )
    return list(result.scalars().all())
```

在 service 中校验当前坐席档案、console session、场景权限和租户后，返回：

```python
{
    **base_payload,
    "masked_customer_name": customer_name,
    "masked_contact": masked_contact,
    "handoff_summary": summary,
    "dialogue": [
        {
            "id": str(segment.id),
            "speaker_type": segment.speaker_type,
            "text": segment.segment_text.strip(),
            "occurred_at": self._api_datetime(segment.started_at or segment.ended_at),
        }
        for segment in segments
    ],
}
```

- [ ] **步骤 4：注册并测试 GET 接口**

在 controller 中增加：

```python
@AgentConsoleRouter.get(
    "/handoffs/{handoff_id}/context",
    summary="获取单条转人工完整上下文",
)
async def handoff_context_controller(
    handoff_id: str,
    auth: AuthenticatedUser,
    service: Annotated[AiCallAgentConsoleService, Depends(get_agent_console_service)],
    console_session_id: Annotated[UUID, Query()],
):
    return SuccessResponse(
        data=await service.handoff_context_payload(
            auth,
            handoff_id=handoff_id,
            console_session_id=str(console_session_id),
        )
    )
```

在 API 测试中断言路由存在，并断言 service 以 handoff ID 与 session ID 被调用。

- [ ] **步骤 5：运行后端相关回归**

```bash
uv run pytest \
  tests/test_ai_call_agent_console_claim.py \
  tests/test_ai_call_agent_console_api.py -q
```

预期：全部 PASS。

- [ ] **步骤 6：提交上下文接口**

```bash
git add app/api/v1/ai_call/crud.py \
  app/services/ai_call/agent_console_service.py \
  app/api/v1/ai_call/agent_console_controller.py \
  tests/test_ai_call_agent_console_claim.py \
  tests/test_ai_call_agent_console_api.py
git commit -m "feat: 增加单条转人工完整上下文"
```

### 任务 3：补齐 `media-ready` 契约并暴露真实接入阶段

- [ ] **步骤 1：先写前端失败测试**

在 `src/services/ruoyi/agent-console.test.ts` 调用：

```ts
await call('confirmHandoffMediaReady', 'handoff-1', {
  consoleSessionId: 'session-1',
  participantIdentity: 'human-agent-handoff-1',
  idempotencyKey: 'media-1',
});
expect(mockedRequest).toHaveBeenCalledWith(
  '/ai-call/agent-console/handoffs/handoff-1/media-ready',
  expect.objectContaining({
    data: {
      console_session_id: 'session-1',
      participant_identity: 'human-agent-handoff-1',
    },
  }),
);
```

在 `useAgentCall.test.tsx` 断言阶段依次出现：

```ts
expect(seenStages).toEqual(
  expect.arrayContaining([
    'livekit_connecting',
    'livekit_connected',
    'microphone_publishing',
    'microphone_published',
    'media_ready_reporting',
    'connected',
  ]),
);
```

并断言 `mediaReady` 收到 credential 中的 `participant_identity`。

- [ ] **步骤 2：运行测试确认失败**

```bash
npx jest src/services/ruoyi/agent-console.test.ts \
  src/pages/agentWorkbench/hooks/useAgentCall.test.tsx --runInBand
```

预期：FAIL，现有请求体缺少 `participant_identity`，hook 也没有细分阶段。

- [ ] **步骤 3：实现最小契约修复**

新增输入类型：

```ts
export type MediaReadyInput = IdempotentSessionInput & {
  participantIdentity: string;
};
```

`confirmHandoffMediaReady()` 请求体增加：

```ts
data: {
  ...presenceData(input),
  participant_identity: input.participantIdentity,
},
```

将 `MediaCredentialDto.participant_identity` 改为必填。hook 调用时传：

```ts
await services.mediaReady(nextCredential.handoff.handoff_id, {
  ...idempotencyInput(consoleSessionId),
  participantIdentity: nextCredential.participant_identity,
});
```

- [ ] **步骤 4：实现阶段状态和阶段错误**

增加 `AgentCallStage`，在每个 await 前后更新；catch 时把当前阶段映射为固定文案：

```ts
const stageErrorMessages: Record<AgentCallStage, string> = {
  livekit_connecting: '已认领，但无法连接通话房间',
  microphone_publishing: '已连接房间，但麦克风发布失败',
  media_ready_reporting: '麦克风已就绪，但坐席状态确认失败',
  // 其他阶段保持对应业务文案
};
```

错误信息可以附加底层 message，但首句必须是上述业务阶段。

- [ ] **步骤 5：运行 hook、服务和工作流测试**

```bash
npx jest \
  src/services/ruoyi/agent-console.test.ts \
  src/pages/agentWorkbench/hooks/useAgentCall.test.tsx \
  src/pages/agentWorkbench/agentWorkflow.test.tsx --runInBand
```

预期：PASS，并证明发布麦克风先于 `media-ready`。

- [ ] **步骤 6：提交媒体链修复**

```bash
git add src/services/ruoyi/agent-console.ts \
  src/services/ruoyi/agent-console.test.ts \
  src/pages/agentWorkbench/hooks/useAgentCall.ts \
  src/pages/agentWorkbench/hooks/useAgentCall.test.tsx \
  src/pages/agentWorkbench/components/CurrentCallPanel.tsx \
  src/pages/agentWorkbench/agentWorkflow.test.tsx
git commit -m "fix: 补齐坐席媒体就绪上报"
```

### 任务 4：实现只读 502/503/504 有界恢复

- [ ] **步骤 1：编写重试工具失败测试**

创建 `readRetry.test.ts`，使用 fake timers 覆盖：

```ts
const operation = jest
  .fn()
  .mockRejectedValueOnce({ response: { status: 504 } })
  .mockRejectedValueOnce({ response: { status: 503 } })
  .mockResolvedValue('ok');
const promise = readWithGatewayRetry(operation, { delayMs: 3_000, attempts: 5 });
await jest.advanceTimersByTimeAsync(6_000);
await expect(promise).resolves.toBe('ok');
expect(operation).toHaveBeenCalledTimes(3);
```

另测 400 只调用一次，以及连续 5 次 504 后抛出最后一次原错误。

- [ ] **步骤 2：运行测试确认失败**

```bash
npx jest src/pages/agentWorkbench/utils/readRetry.test.ts --runInBand
```

预期：FAIL，模块不存在。

- [ ] **步骤 3：实现纯函数工具**

```ts
export const isRetryableGatewayError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const status =
    Reflect.get(error, 'status') ??
    Reflect.get(Reflect.get(error, 'response') || {}, 'status');
  const code = String(Reflect.get(error, 'code') || '');
  const message = error instanceof Error ? error.message : '';
  return (
    [502, 503, 504].includes(Number(status)) ||
    ['ERR_NETWORK', 'ECONNRESET', 'ECONNREFUSED'].includes(code) ||
    /network error|failed to fetch/i.test(message)
  );
};

export const readWithGatewayRetry = async <T>(
  operation: () => Promise<T>,
  { delayMs = 3_000, attempts = 5 }: ReadRetryOptions = {},
) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableGatewayError(error) || attempt === attempts) throw error;
      await delay(delayMs);
    }
  }
  throw new Error('unreachable');
};
```

只允许 bootstrap、待接池和单条上下文调用该工具；POST/PUT 不得引入此包装。

- [ ] **步骤 4：接入 presence 与页面恢复状态**

`useAgentPresence` 增加 `serviceRecovering: boolean` 与
`retryBootstrap()`。bootstrap 遇到网关错误时显示：

```text
坐席服务暂不可用，正在重新连接
```

五次耗尽后保留页面框架并暴露显式“重新连接”操作。成功后清空错误、恢复 profile/presence。

`index.tsx` 的待接池和上下文 GET 使用同一工具；失败不清空当前稳定内容。

- [ ] **步骤 5：运行恢复测试**

```bash
npx jest \
  src/pages/agentWorkbench/utils/readRetry.test.ts \
  src/pages/agentWorkbench/hooks/useAgentPresence.test.tsx \
  src/pages/agentWorkbench/agentWorkflow.test.tsx --runInBand
```

预期：PASS；测试明确断言 `online/pause/offline/claim/media-ready/complete` 没有被重试工具调用。

- [ ] **步骤 6：提交恢复能力**

```bash
git add src/pages/agentWorkbench/utils/readRetry.ts \
  src/pages/agentWorkbench/utils/readRetry.test.ts \
  src/pages/agentWorkbench/hooks/useAgentPresence.ts \
  src/pages/agentWorkbench/hooks/useAgentPresence.test.tsx \
  src/pages/agentWorkbench/index.tsx \
  src/pages/agentWorkbench/agentWorkflow.test.tsx
git commit -m "feat: 增加坐席只读请求有界恢复"
```

### 任务 5：接入单条上下文与 B3 对话布局

- [ ] **步骤 1：冻结前端接口契约**

在 DTO 中增加：

```ts
export type HandoffContextDto = Omit<
  HandoffDto,
  'pending_items' | 'recent_dialogue'
> & {
  dialogue: DialogueTurnDto[];
};
```

增加：

```ts
export const getHandoffContext = (
  handoffId: BigintString,
  consoleSessionId: string,
) =>
  agentConsoleRequest<HandoffContextDto>(
    `${AGENT_CONSOLE_API_PREFIX}/handoffs/${encodeId(handoffId)}/context`,
    {
      method: 'get',
      params: { console_session_id: consoleSessionId },
    },
  );
```

服务测试断言 URL、GET 和 query 参数。

- [ ] **步骤 2：先写 B3 组件失败测试**

测试数据至少 8 条，带 `occurred_at`。断言：

```ts
expect(screen.getAllByTestId('dialogue-turn')).toHaveLength(8);
expect(screen.queryByText('待处理事项')).toBeNull();
expect(screen.queryByText('最近对话')).toBeNull();
expect(screen.getByText('完整会话')).toBeTruthy();
expect(screen.queryByText(/2026-07-31/)).toBeNull();
expect(screen.getByText('AI 开场').closest('[data-speaker]'))
  .toHaveAttribute('data-speaker', 'ai');
expect(screen.getByText('客户回复').closest('[data-speaker]'))
  .toHaveAttribute('data-speaker', 'customer');
```

- [ ] **步骤 3：查询 Ant Design API 后实现组件**

运行：

```bash
npx antd info Card --format json
npx antd info Typography --format json
npx antd info Spin --format json
npx antd info Alert --format json
```

按项目当前 Ant Design 版本确认属性后实现：

- 摘要始终位于对话前；
- `dialogue` 全量渲染，不做 `slice()`；
- AI 气泡左对齐、客户气泡右对齐；
- 不渲染 `occurred_at`；
- loading/error/retry 只占右侧卡片；
- 用 ref 在首次加载完成后执行 `scrollTop = scrollHeight`。

- [ ] **步骤 4：实现样式和响应式网格**

关键 CSS：

```css
.agent-handoff-dialogue-scroll {
  max-height: 600px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.agent-handoff-dialogue-turn[data-speaker='customer'] {
  justify-self: end;
  background: #f4f0ff;
}

.agent-handoff-dialogue-turn[data-speaker='ai'] {
  justify-self: start;
  background: #eef6ff;
}

.agent-workbench-grid {
  grid-template-columns:
    minmax(280px, 0.8fr)
    minmax(380px, 1fr)
    minmax(420px, 480px);
  min-width: 0;
}
```

在可用内容宽度不足以容纳三栏前让最后一栏 `grid-column: 1 / -1`，768px 以下单栏。所有 grid child 设置 `min-width: 0`。

- [ ] **步骤 5：在页面加载当前单条上下文**

`index.tsx` 根据 `currentHandoff ?? nextHandoff` 的 ID 加载上下文。使用 generation/cancel 标记防止旧请求覆盖新选中请求：

```ts
useEffect(() => {
  let active = true;
  if (!contextHandoff || !agent.consoleSessionId) return;
  void loadContext(contextHandoff.handoff_id, agent.consoleSessionId).then(
    (next) => {
      if (active) setHandoffContext(next);
    },
  );
  return () => {
    active = false;
  };
}, [contextHandoff?.handoff_id, agent.consoleSessionId]);
```

认领成功后继续显示旧稳定内容，直到对应完整上下文加载成功。

- [ ] **步骤 6：运行组件、服务和页面测试**

```bash
npx jest \
  src/services/ruoyi/agent-console.test.ts \
  src/pages/agentWorkbench/components/HandoffContextPanel.test.tsx \
  src/pages/agentWorkbench/agentWorkflow.test.tsx --runInBand
```

预期：PASS。

- [ ] **步骤 7：提交上下文与布局**

```bash
git add src/services/ruoyi/agent-console.ts \
  src/services/ruoyi/agent-console.test.ts \
  src/pages/agentWorkbench/components/HandoffContextPanel.tsx \
  src/pages/agentWorkbench/components/HandoffContextPanel.css \
  src/pages/agentWorkbench/components/HandoffContextPanel.test.tsx \
  src/pages/agentWorkbench/index.tsx \
  src/pages/agentWorkbench/index.css \
  src/pages/agentWorkbench/agentWorkflow.test.tsx
git commit -m "feat: 展示转人工摘要与完整会话"
```

### 任务 6：全量验证与浏览器验收

- [ ] **步骤 1：同步代码图索引**

```bash
codegraph sync
```

预期：如果本机仍未安装 `codegraph`，记录为工具不可用，不修改 `.codegraph/`，继续使用精确文件级验证。

- [ ] **步骤 2：运行后端完整相关测试**

```bash
cd /Users/liuhongli/.codex/worktrees/ed81/ai-call
uv run pytest \
  tests/test_ai_call_agent_console_claim.py \
  tests/test_ai_call_agent_console_api.py \
  tests/test_ai_call_agent_console_reconciler.py -q
```

预期：全部 PASS。

- [ ] **步骤 3：运行前端相关测试、类型与构建**

```bash
cd /Users/liuhongli/.codex/worktrees/a3cd/recov-ai-web-react
npx jest src/pages/agentWorkbench src/services/ruoyi/agent-console.test.ts --runInBand
npm run tsc
npx biome check \
  src/pages/agentWorkbench \
  src/services/ruoyi/agent-console.ts \
  src/services/ruoyi/agent-console.test.ts
npm run build
```

预期：测试、TypeScript、Biome 和构建全部成功。

- [ ] **步骤 4：浏览器验证 504 恢复**

保持页面框架打开，临时停止本地后端读取服务，确认页面显示“坐席服务暂不可用，正在重新连接”；恢复后端后确认 bootstrap、待接池和上下文自动恢复。不得在此步骤启用外呼执行器。

- [ ] **步骤 5：浏览器验证 B3**

在常见桌面宽度与窄屏分别确认：

- 无页面横向滚动；
- 摘要常驻；
- 完整对话全部渲染；
- AI 左、客户右；
- 无逐条时间；
- 无“待处理事项”；
- 超过 600px 后仅会话区滚动；
- 窄屏时右栏下移。

- [ ] **步骤 6：提交验证修正**

仅当验证发现并修正问题时，重新运行对应任务测试，然后提交本计划范围内的精确文件：

```bash
git add src/pages/agentWorkbench \
  src/services/ruoyi/agent-console.ts \
  src/services/ruoyi/agent-console.test.ts
git commit -m "fix: 收口坐席转人工验收问题"
```

### 任务 7：第二轮真实 SIP 转人工验收门禁

- [ ] **步骤 1：保持执行器关闭并报告自动化结果**

确认当前运行态仍未自动执行正式任务，向用户报告自动化、浏览器、后端和前端验证结果。

- [ ] **步骤 2：单独请求真实拨打确认**

必须收到用户新的明确回复“确认拨打”后，才允许启用 SIP 执行器并创建/执行新的正式任务。

- [ ] **步骤 3：真实验收**

按以下证据逐层记录：

```text
首次 claim 200
handoff accepted / agent claiming
LiveKit connected
microphone published
media-ready 200
handoff connected / agent in_call
Linphone -> 浏览器音频可听
浏览器 -> Linphone 音频可听
正常结束
录音 / 离线 ASR / 语义分析 / 摘要 / 终态完成
```

- [ ] **步骤 4：关闭执行器**

真实任务结束后恢复“执行器关闭、SIP 配置保留”的安全状态，并核对 listener PID、cwd 和关键环境变量。
