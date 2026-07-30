# AI Call 统一话后结果与跟进闭环实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为正式 AI 外呼增加结构化话后结果和最小跟进决策服务，并在通话记录中分别展示真实客户意向和跟进任务状态。

**架构：** 现有语义分析结果增加结构化 `follow_up` 对象，并将列表筛选所需字段物化到语义分析表。新的 `AiCallPostCallFollowUpService` 只执行固定决策：明确同意且高置信时幂等创建任务，模糊意向仅给出建议，拒绝或无需求不创建；通话记录列表以批量聚合方式返回语义与跟进快照，前端不按行请求。

**技术栈：** Python 3.11、FastAPI、SQLAlchemy Async、PostgreSQL/SQLite、Pytest；React、TypeScript、Umi Max、Ant Design v6、ProComponents v3、Jest。

---

## 0. 工作区与提交约束

后端工作区：

```text
/Users/liuhongli/.codex/worktrees/ed81/ai-call
branch: codex/ai-call-workflow-split
```

前端工作区：

```text
/Users/liuhongli/.codex/worktrees/a3cd/recov-ai-web-react
branch: codex/generic-outbound-task-v1
```

两个 worktree 都已有与 AI Call 相关的未提交修改。每次提交前必须：

```bash
git status --short --branch
git diff --cached --name-status
git diff --cached
```

只使用 `git add -p <精确文件>` 或对新文件使用精确 `git add <文件>`，确认暂存区不包含既有脏改动后再提交。不得清理、还原、格式化或提交不属于本计划的修改。

本计划的自动化验证不得启动 Linphone、SIP trunk 或真实号码拨打。19012 属于独立运行环境，不停止、不重启、不复用。

## 1. 文件结构

### 后端：`/Users/liuhongli/.codex/worktrees/ed81/ai-call`

| 文件 | 职责 |
| --- | --- |
| `app/api/v1/ai_call/model.py` | 增加语义分析物化字段、跟进任务幂等来源键和可空 handoff 来源 |
| `app/api/v1/ai_call/crud.py` | 持久化话后字段、幂等创建 AI 话后跟进、列表批量聚合与筛选 |
| `app/api/v1/ai_call/controller.py` | 接收 `customerIntent`、`followUpStatus` 列表筛选参数 |
| `app/api/v1/ai_call/service.py` | 透传通话记录筛选参数 |
| `app/services/ai_call/record_service.py` | 输出列表所需的语义分析与跟进快照 |
| `app/services/ai_call/semantic_analysis.py` | 扩展结构化话后结果、证据约束和物化字段 |
| `app/services/ai_call/post_call_follow_up_service.py` | 新增固定、可测试的最小跟进决策服务 |
| `app/services/ai_call/follow_up_service.py` | 允许坐席认领 AI 话后生成的未分配任务 |
| `app/services/ai_call/agent_console_reconciler.py` | 管理端/坐席端输出新的来源类型并保持详情关联 |
| `docs/livekit-ai-outbound/sql/phase-h7-post-call-follow-up-postgres.sql` | PostgreSQL 可重复执行迁移 |
| `tests/test_ai_call_post_call_follow_up.py` | 结构化结果、固定决策、幂等和认领测试 |
| `tests/test_ai_call_outbound_record_filter.py` | 通话记录聚合、分页筛选和租户隔离测试 |
| `tests/test_ai_call_follow_up.py` | 新来源任务认领和既有 ACW/未接回访回归 |

### 前端：`/Users/liuhongli/.codex/worktrees/a3cd/recov-ai-web-react`

| 文件 | 职责 |
| --- | --- |
| `src/pages/aiCallRecords/service.ts` | 增加列表字段和查询类型 |
| `src/pages/aiCallRecords/service.test.ts` | 验证筛选参数和接口契约 |
| `src/pages/aiCallRecords/status.tsx` | 集中维护客户意向、分析状态和跟进状态映射 |
| `src/pages/aiCallRecords/status.test.tsx` | 验证标签文案、颜色、优先级和 Mock 降级 |
| `src/pages/aiCallRecords/index.tsx` | 增加两个独立列、筛选、点击行为和有界轮询 |
| `src/pages/aiCallRecords/index.test.tsx` | 验证列表、跳转、筛选和单飞轮询 |
| `src/services/ruoyi/agent-console.ts` | 增加 `ai_post_call` 来源并允许空 handoff ID |
| `src/services/ruoyi/agent-console.test.ts` | 验证跟进详情请求和新增类型不改变接口路径 |
| `src/pages/agentWorkbench/admin/followUps/index.tsx` | 支持 `followUpId` 深链接和 AI 话后来源 |
| `src/pages/agentWorkbench/admin/followUps/index.test.tsx` | 验证深链接、错误提示和来源文案 |

## 2. 数据契约

语义分析 `analysis_result` 从五字段扩展为六字段，保留原字段：

```json
{
  "summary": "客户希望顾问明天下午联系",
  "feedback_type": "正向",
  "key_points": ["客户明确要求后续联系"],
  "time_hint": {
    "time_text": "明天下午",
    "time_value": "2026-07-31T14:00:00+08:00",
    "original_texts": ["明天下午两点联系我"]
  },
  "tags": ["明确回访"],
  "follow_up": {
    "required": true,
    "consent": "explicit",
    "reason": "客户明确要求顾问回访",
    "preferred_time": "2026-07-31T14:00:00+08:00",
    "confidence": "high"
  }
}
```

允许值：

```python
FOLLOW_UP_CONSENTS = {"explicit", "missing", "refused"}
FOLLOW_UP_CONFIDENCES = {"high", "medium", "low"}
CUSTOMER_INTENT_BY_FEEDBACK = {
    "正向": "positive",
    "中性": "neutral",
    "负向": "negative",
}
```

自动创建条件固定为：

```python
auto_create = (
    follow_up["required"] is True
    and follow_up["consent"] == "explicit"
    and follow_up["confidence"] == "high"
)
```

`followUpSuggested` 固定为：

```python
follow_up_suggested = (
    follow_up["required"] is True
    and follow_up["consent"] != "refused"
)
```

列表输出字段：

```typescript
type AiCallRecord = {
  analysisStatus?: '0' | '1' | '2' | '3' | '4' | null;
  customerIntent?: 'positive' | 'neutral' | 'negative' | null;
  followUpSuggested?: boolean;
  followUpId?: string | null;
  followUpStatus?: 'pending' | 'processing' | 'completed' | 'closed' | null;
};
```

## 3. 任务分解

### 任务 1：增加可移植的数据字段和迁移

**文件：**

- 修改：`app/api/v1/ai_call/model.py:535-622`
- 修改：`app/api/v1/ai_call/model.py:875-916`
- 创建：`docs/livekit-ai-outbound/sql/phase-h7-post-call-follow-up-postgres.sql`
- 测试：`tests/test_ai_call_post_call_follow_up.py`

- [ ] **步骤 1：编写失败的模型契约测试**

创建 `tests/test_ai_call_post_call_follow_up.py`，先验证物化字段和幂等来源键：

```python
from sqlalchemy import inspect as sa_inspect

from app.api.v1.ai_call.model import (
    AiCallFollowUpTaskModel,
    AiCallSemanticAnalysisModel,
)


def test_post_call_models_keep_portable_scalar_contract() -> None:
    semantic_columns = {
        column.key: column for column in sa_inspect(AiCallSemanticAnalysisModel).columns
    }
    assert semantic_columns["customer_intent"].type.length == 16
    assert semantic_columns["follow_up_suggested"].nullable is False
    assert semantic_columns["follow_up_consent"].type.length == 16
    assert semantic_columns["follow_up_reason"].type.length == 500
    assert semantic_columns["follow_up_confidence"].type.length == 16
    assert "follow_up_preferred_at" in semantic_columns

    task_columns = {
        column.key: column for column in sa_inspect(AiCallFollowUpTaskModel).columns
    }
    assert task_columns["source_key"].nullable is False
    assert task_columns["source_handoff_id"].nullable is True
    assert not sa_inspect(AiCallFollowUpTaskModel).relationships
```

- [ ] **步骤 2：运行测试并确认失败**

运行：

```bash
uv run pytest tests/test_ai_call_post_call_follow_up.py::test_post_call_models_keep_portable_scalar_contract -q
```

预期：FAIL，缺少 `customer_intent` 或 `source_key`。

- [ ] **步骤 3：实现最小 ORM 变更**

在 `AiCallSemanticAnalysisModel` 增加：

```python
customer_intent: Mapped[str | None] = mapped_column(String(16), nullable=True)
follow_up_suggested: Mapped[bool] = mapped_column(
    Boolean, nullable=False, default=False
)
follow_up_consent: Mapped[str | None] = mapped_column(String(16), nullable=True)
follow_up_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
follow_up_preferred_at: Mapped[datetime | None] = mapped_column(
    DateTime(timezone=True), nullable=True
)
follow_up_confidence: Mapped[str | None] = mapped_column(String(16), nullable=True)
```

增加索引：

```python
Index(
    "idx_ai_call_semantic_scene_intent",
    "analysis_scene_code",
    "customer_intent",
),
Index(
    "idx_ai_call_semantic_scene_follow_up",
    "analysis_scene_code",
    "follow_up_suggested",
),
```

在 `AiCallFollowUpTaskModel` 增加：

```python
source_key: Mapped[str] = mapped_column(String(160), nullable=False)
source_handoff_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
```

增加唯一约束：

```python
UniqueConstraint(
    "tenant_id",
    "source_type",
    "source_key",
    name="uk_ai_call_follow_up_source_key",
),
```

既有 ACW 和未接回访使用 `source_key=f"handoff:{handoff_id}"`；AI 话后任务使用 `source_key=f"call:{call_id}"`。

- [ ] **步骤 4：编写可重复执行 PostgreSQL 迁移**

`phase-h7-post-call-follow-up-postgres.sql` 使用 `add column if not exists`，先回填再设置非空：

```sql
alter table ai_call_semantic_analysis
    add column if not exists customer_intent varchar(16);
alter table ai_call_semantic_analysis
    add column if not exists follow_up_suggested boolean not null default false;
alter table ai_call_semantic_analysis
    add column if not exists follow_up_consent varchar(16);
alter table ai_call_semantic_analysis
    add column if not exists follow_up_reason varchar(500);
alter table ai_call_semantic_analysis
    add column if not exists follow_up_preferred_at timestamptz;
alter table ai_call_semantic_analysis
    add column if not exists follow_up_confidence varchar(16);

alter table ai_call_follow_up_task
    add column if not exists source_key varchar(160);
update ai_call_follow_up_task
set source_key = 'handoff:' || source_handoff_id
where source_key is null and source_handoff_id is not null;
alter table ai_call_follow_up_task
    alter column source_key set not null;
alter table ai_call_follow_up_task
    alter column source_handoff_id drop not null;

create unique index if not exists uk_ai_call_follow_up_source_key
    on ai_call_follow_up_task (tenant_id, source_type, source_key);
```

迁移在设置非空前执行只读重复检查；发现 `source_key` 为空或重复时中止并报告，不自动删除或合并历史数据。

- [ ] **步骤 5：运行模型测试**

运行：

```bash
uv run pytest tests/test_ai_call_post_call_follow_up.py::test_post_call_models_keep_portable_scalar_contract -q
uv run ruff check app/api/v1/ai_call/model.py tests/test_ai_call_post_call_follow_up.py
```

预期：测试 PASS，Ruff 无错误。

- [ ] **步骤 6：精确提交**

```bash
git add -p app/api/v1/ai_call/model.py
git add docs/livekit-ai-outbound/sql/phase-h7-post-call-follow-up-postgres.sql
git add tests/test_ai_call_post_call_follow_up.py
git diff --cached
git commit -m "feat(ai-call): 增加结构化话后结果字段"
```

### 任务 2：扩展语义分析为统一话后结果

**文件：**

- 修改：`app/services/ai_call/semantic_analysis.py:132-160`
- 修改：`app/services/ai_call/semantic_analysis.py:1519-1610`
- 修改：`app/services/ai_call/semantic_analysis.py:1648-1685`
- 修改：`app/api/v1/ai_call/crud.py:816-852`
- 测试：`tests/test_ai_call_post_call_follow_up.py`
- 回归：`tests/test_ai_call_phase_b1_records.py:1320-1390`

- [ ] **步骤 1：编写失败的规范化和证据降级测试**

增加：

```python
def test_normalize_post_call_result_maps_intent_and_follow_up() -> None:
    result = normalize_analysis_result(
        {
            "summary": "客户要求顾问回访",
            "feedback_type": "正向",
            "key_points": ["客户要求回访"],
            "time_hint": {
                "time_text": "明天下午",
                "time_value": "2026-07-31T14:00:00+08:00",
                "original_texts": ["明天下午联系"],
            },
            "tags": ["明确回访"],
            "follow_up": {
                "required": True,
                "consent": "explicit",
                "reason": "客户明确要求回访",
                "preferred_time": "2026-07-31T14:00:00+08:00",
                "confidence": "high",
            },
        }
    )
    assert result["feedback_type"] == "正向"
    assert result["follow_up"] == {
        "required": True,
        "consent": "explicit",
        "reason": "客户明确要求回访",
        "preferred_time": "2026-07-31T14:00:00+08:00",
        "confidence": "high",
    }


def assistant_only_snapshot() -> dict[str, object]:
    return {
        "call_id": "call-assistant-only",
        "turns": [
            {
                "role": "assistant",
                "speaker_type": "ai",
                "text": "我可以安排顾问联系您。",
            }
        ],
    }


def test_follow_up_explicit_consent_is_downgraded_without_customer_evidence() -> None:
    result = enforce_semantic_evidence_on_result(
        {
            "summary": "AI 说可以安排顾问联系",
            "feedback_type": "正向",
            "key_points": [],
            "time_hint": {},
            "tags": [],
            "follow_up": {
                "required": True,
                "consent": "explicit",
                "reason": "安排顾问联系",
                "preferred_time": None,
                "confidence": "high",
            },
        },
        assistant_only_snapshot(),
    )
    assert result["follow_up"]["consent"] == "missing"
    assert result["follow_up"]["confidence"] == "low"
```

`assistant_only_snapshot()` 使用现有 transcript snapshot 结构，只有 `role=assistant` 的承诺，不包含客户证据。

- [ ] **步骤 2：运行测试并确认失败**

```bash
uv run pytest \
  tests/test_ai_call_post_call_follow_up.py::test_normalize_post_call_result_maps_intent_and_follow_up \
  tests/test_ai_call_post_call_follow_up.py::test_follow_up_explicit_consent_is_downgraded_without_customer_evidence \
  -q
```

预期：FAIL，现有规范化函数丢弃 `follow_up`。

- [ ] **步骤 3：扩展分析提示词和规范化函数**

将“只返回五字段”改为“只返回六字段”，新增固定对象：

```text
- follow_up: 对象，包含 required、consent、reason、preferred_time、confidence。
  required 仅表示客户侧存在后续联系需求；
  consent 只能是 explicit、missing、refused；
  confidence 只能是 high、medium、low；
  assistant 自己提出或承诺联系不能作为客户同意证据。
```

新增：

```python
def _normalize_follow_up(value: Any) -> dict[str, Any]:
    raw = value if isinstance(value, dict) else {}
    consent = _string_value(raw.get("consent"))
    confidence = _string_value(raw.get("confidence"))
    return {
        "required": raw.get("required") is True,
        "consent": consent if consent in FOLLOW_UP_CONSENTS else "missing",
        "reason": _string_value(raw.get("reason")),
        "preferred_time": _string_value(raw.get("preferred_time")) or None,
        "confidence": (
            confidence if confidence in FOLLOW_UP_CONFIDENCES else "low"
        ),
    }
```

`normalize_analysis_result()` 必须始终返回完整 `follow_up` 对象。证据约束必须检查客户轮次；只有 assistant 话术、低置信来源或 `record_only` 证据时，将 `explicit/high` 降为 `missing/low`。

- [ ] **步骤 4：物化稳定字段**

新增纯函数：

```python
def post_call_materialized_fields(result: dict[str, Any]) -> dict[str, Any]:
    follow_up = result["follow_up"]
    return {
        "customer_intent": CUSTOMER_INTENT_BY_FEEDBACK[result["feedback_type"]],
        "follow_up_suggested": (
            follow_up["required"] is True
            and follow_up["consent"] != "refused"
        ),
        "follow_up_consent": follow_up["consent"],
        "follow_up_reason": follow_up["reason"] or None,
        "follow_up_preferred_at": parse_rfc3339_or_none(
            follow_up["preferred_time"]
        ),
        "follow_up_confidence": follow_up["confidence"],
    }
```

`update_semantic_analysis_success()` 接收这些字段并与 `analysis_result` 在同一事务写入。失败、无有效客户话术和强制重分析开始时清空旧物化字段，避免旧意向继续显示。

- [ ] **步骤 5：运行语义分析回归**

```bash
uv run pytest \
  tests/test_ai_call_post_call_follow_up.py \
  tests/test_ai_call_phase_b1_records.py -q
uv run ruff check app/services/ai_call/semantic_analysis.py app/api/v1/ai_call/crud.py
```

预期：新增测试和既有语义分析测试通过。

- [ ] **步骤 6：精确提交**

```bash
git add -p app/services/ai_call/semantic_analysis.py
git add -p app/api/v1/ai_call/crud.py
git add -p tests/test_ai_call_post_call_follow_up.py
git diff --cached
git commit -m "feat(ai-call): 输出统一结构化话后结果"
```

### 任务 3：实现最小跟进决策服务

**文件：**

- 创建：`app/services/ai_call/post_call_follow_up_service.py`
- 修改：`app/services/ai_call/semantic_analysis.py:1519-1610`
- 修改：`app/api/v1/ai_call/crud.py:1281-1315`
- 修改：`app/services/ai_call/handoff_unanswered_service.py:12-46`
- 修改：`app/services/ai_call/follow_up_service.py:138-210`
- 测试：`tests/test_ai_call_post_call_follow_up.py`
- 回归：`tests/test_ai_call_follow_up.py`

- [ ] **步骤 1：编写失败的决策矩阵测试**

先用纯函数覆盖固定决策矩阵；数据库集成测试再使用内存 SQLite 创建正式
`sip_outbound` 记录、任务、对象和尝试：

```python
from types import SimpleNamespace


@pytest.mark.parametrize(
    ("required", "consent", "confidence", "expected_action"),
    [
        (True, "explicit", "high", "create"),
        (True, "missing", "high", "suggest"),
        (True, "refused", "high", "none"),
        (True, "explicit", "medium", "suggest"),
        (False, "missing", "low", "none"),
    ],
)
def test_post_call_follow_up_decision_matrix(
    required,
    consent,
    confidence,
    expected_action,
) -> None:
    analysis = SimpleNamespace(
        follow_up_suggested=required and consent != "refused",
        follow_up_consent=consent,
        follow_up_confidence=confidence,
        follow_up_reason="客户要求回访" if required else None,
        follow_up_preferred_at=None,
    )
    assert decide_post_call_follow_up(analysis).action == expected_action
```

另加四个数据库集成测试，测试名固定为：

- `test_post_call_follow_up_is_idempotent_for_same_call`：对同一 `call_id`
  连续应用两次相同成功分析，断言返回同一个任务 ID，数据库只有一条
  `ai_post_call` 任务。
- `test_post_call_follow_up_ignores_mock_and_web_records`：分别写入
  `outbound_mock` 和 Web 记录，断言不创建任务。
- `test_reanalysis_never_reopens_or_replaces_terminal_task`：先把任务置为
  `completed`，再重跑分析，断言任务 ID 和终态都不变。
- `test_ai_post_call_task_can_be_claimed_by_scoped_agent`：创建未分配的
  `ai_post_call` 任务，由场景匹配且启用的坐席认领，断言负责人和
  `processing` 状态一次性写入。

- [ ] **步骤 2：运行测试并确认失败**

```bash
uv run pytest tests/test_ai_call_post_call_follow_up.py -q
```

预期：FAIL，`AiCallPostCallFollowUpService` 尚不存在。

- [ ] **步骤 3：实现纯决策和服务边界**

创建：

```python
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class PostCallFollowUpDecision:
    action: str
    reason: str | None
    customer_callback_at: datetime | None


def decide_post_call_follow_up(
    analysis: AiCallSemanticAnalysisModel,
) -> PostCallFollowUpDecision:
    if analysis.follow_up_consent == "refused":
        return PostCallFollowUpDecision("none", None, None)
    if (
        analysis.follow_up_suggested
        and analysis.follow_up_consent == "explicit"
        and analysis.follow_up_confidence == "high"
    ):
        return PostCallFollowUpDecision(
            "create",
            analysis.follow_up_reason or "客户明确要求后续联系",
            analysis.follow_up_preferred_at,
        )
    if analysis.follow_up_suggested:
        return PostCallFollowUpDecision(
            "suggest",
            analysis.follow_up_reason,
            analysis.follow_up_preferred_at,
        )
    return PostCallFollowUpDecision("none", None, None)
```

服务只对能够通过 `AiCallOutboundAttemptModel.call_id` 找到租户的 `sip_outbound` 正式任务执行。`create` 使用：

```python
{
    "source_type": "ai_post_call",
    "source_key": f"call:{call_id}",
    "source_call_id": call_id,
    "source_handoff_id": None,
    "owner_agent_identity": None,
    "status": "pending",
}
```

仓储新增 `create_post_call_follow_up_if_missing()`，对 `(tenant_id, source_type, source_key)` 使用 PostgreSQL/SQLite/MySQL 方言原生 upsert；未知方言先查询再插入，并在唯一冲突后查询既有任务。服务返回既有或新建任务，不删除、不重开终态任务。

- [ ] **步骤 4：接到语义分析成功事务**

`analyze_call_once()` 在成功持久化结构化结果后调用：

```python
await AiCallPostCallFollowUpService(self.repository).apply(succeeded)
```

调用与语义结果使用同一数据库会话。外部模型 I/O 已在写入之前完成，不能把数据库写事务跨越到模型请求阶段。

- [ ] **步骤 5：兼容既有来源并允许认领**

既有任务创建补充：

```python
"source_key": f"handoff:{handoff.handoff_id}"
```

在 `AiCallFollowUpService` 集中定义：

```python
CLAIMABLE_UNASSIGNED_SOURCE_TYPES = {
    "handoff_unanswered",
    "ai_post_call",
}
```

列表和 `claim_follow_up()` 都使用该集合；场景范围、坐席启用状态、原子认领和终态保护保持不变。

- [ ] **步骤 6：运行决策和既有跟进回归**

```bash
uv run pytest \
  tests/test_ai_call_post_call_follow_up.py \
  tests/test_ai_call_follow_up.py \
  tests/test_ai_call_agent_console_reconcile.py -q
uv run ruff check \
  app/services/ai_call/post_call_follow_up_service.py \
  app/services/ai_call/follow_up_service.py \
  app/services/ai_call/handoff_unanswered_service.py \
  app/api/v1/ai_call/crud.py
```

预期：决策矩阵、幂等、认领和既有两类来源全部通过。

- [ ] **步骤 7：精确提交**

```bash
git add app/services/ai_call/post_call_follow_up_service.py
git add -p app/services/ai_call/semantic_analysis.py
git add -p app/api/v1/ai_call/crud.py
git add -p app/services/ai_call/handoff_unanswered_service.py
git add -p app/services/ai_call/follow_up_service.py
git add -p tests/test_ai_call_post_call_follow_up.py
git add -p tests/test_ai_call_follow_up.py
git diff --cached
git commit -m "feat(ai-call): 增加最小话后跟进决策"
```

### 任务 4：在通话记录列表批量聚合和筛选状态

**文件：**

- 修改：`app/api/v1/ai_call/crud.py:129-221`
- 修改：`app/services/ai_call/record_service.py:360-455`
- 修改：`app/api/v1/ai_call/service.py:772-815`
- 修改：`app/api/v1/ai_call/controller.py:270-312`
- 测试：`tests/test_ai_call_outbound_record_filter.py`

- [ ] **步骤 1：编写失败的列表契约测试**

增加同一租户的以下记录：

```text
call-positive-none       positive   无建议、无任务
call-positive-suggested  positive   建议跟进、无任务
call-pending-task        neutral    pending 任务
call-completed-task      negative   completed 任务
call-analysis-running    无意向     analysis_status=1
```

断言：

```python
payload = service.record_to_dict(row_by_call_id["call-pending-task"])
assert payload["analysisStatus"] == "2"
assert payload["customerIntent"] == "neutral"
assert payload["followUpSuggested"] is True
assert payload["followUpId"] == "9001"
assert payload["followUpStatus"] == "pending"
```

分别调用：

```python
await service.list_records(
    tenant_id="tenant-a",
    customer_intent="positive",
)
await service.list_records(
    tenant_id="tenant-a",
    follow_up_status="suggested",
)
await service.list_records(
    tenant_id="tenant-a",
    follow_up_status="none",
)
```

确认筛选作用于完整数据集和总数，而不是当前页。

- [ ] **步骤 2：运行测试并确认失败**

```bash
uv run pytest tests/test_ai_call_outbound_record_filter.py -q
```

预期：FAIL，服务不接收新筛选参数或列表缺少新增字段。

- [ ] **步骤 3：实现数据库级筛选**

`_record_filters()` 使用 `exists()` 子查询，不解析 JSON：

```python
semantic_exists = exists(
    select(AiCallSemanticAnalysisModel.id).where(
        AiCallSemanticAnalysisModel.call_id == AiCallRecordModel.call_id,
        AiCallSemanticAnalysisModel.analysis_scene_code
        == DEFAULT_SEMANTIC_ANALYSIS_SCENE_CODE,
        AiCallSemanticAnalysisModel.customer_intent == customer_intent,
    )
)
```

实际任务状态使用 `AiCallFollowUpTaskModel.source_call_id` 或回拨记录的 `AiCallRecordModel.follow_up_id`。`suggested` 必须满足“语义建议为真且不存在真实任务”；`none` 必须满足“无建议且不存在真实任务”。查询继续应用现有 tenant/attempt 约束。

- [ ] **步骤 4：批量附加列表快照**

把 `_attach_semantic_analysis()` 扩展为一次查询返回：

```python
(
    call_id,
    analysis_status,
    analysis_result,
    customer_intent,
    follow_up_suggested,
)
```

新增 `_attach_follow_up_context(records, tenant_id)`，一次查询当前页所有 `source_call_id` 和 `record.follow_up_id` 对应任务。禁止每行查询。

真实任务选择顺序固定为：

```text
record.follow_up_id 精确关联
  > source_call_id 的非终态任务
  > source_call_id 最近更新的终态任务
  > AI 建议
```

把快照放入 `_semantic_analysis_context` 和 `_follow_up_context`，`record_to_dict()` 统一输出 camelCase 字段。

- [ ] **步骤 5：透传 API 参数**

控制器增加：

```python
customer_intent: Annotated[str | None, Query(alias="customerIntent")] = None
follow_up_status: Annotated[str | None, Query(alias="followUpStatus")] = None
```

服务和仓储签名同步增加参数。非法值返回 422，不把未知值当成无筛选。

- [ ] **步骤 6：运行记录测试**

```bash
uv run pytest \
  tests/test_ai_call_outbound_record_filter.py \
  tests/test_ai_call_phase_b1_records.py -q
uv run ruff check \
  app/api/v1/ai_call/controller.py \
  app/api/v1/ai_call/service.py \
  app/api/v1/ai_call/crud.py \
  app/services/ai_call/record_service.py
```

预期：列表聚合、总数、租户隔离和既有记录回归通过。

- [ ] **步骤 7：精确提交**

```bash
git add -p app/api/v1/ai_call/controller.py
git add -p app/api/v1/ai_call/service.py
git add -p app/api/v1/ai_call/crud.py
git add -p app/services/ai_call/record_service.py
git add -p tests/test_ai_call_outbound_record_filter.py
git diff --cached
git commit -m "feat(ai-call): 聚合通话意向与跟进状态"
```

### 任务 5：扩展前端服务契约

**文件：**

- 修改：`src/pages/aiCallRecords/service.ts:10-105`
- 修改：`src/pages/aiCallRecords/service.test.ts:18-53`
- 修改：`src/services/ruoyi/agent-console.ts:39-46`
- 修改：`src/services/ruoyi/agent-console.ts:199-219`
- 测试：`src/services/ruoyi/agent-console.test.ts`

- [ ] **步骤 1：编写失败的服务测试**

扩展 `listAiCallRecords()` 用例：

```typescript
await listAiCallRecords({
  pageNum: 1,
  pageSize: 10,
  customerIntent: 'positive',
  followUpStatus: 'pending',
});

expect(mockedRuoyiRequest).toHaveBeenCalledWith('/ai-call/records', {
  baseApi: '/ai-call-agent-api',
  method: 'get',
  params: {
    pageNum: 1,
    pageSize: 10,
    customerIntent: 'positive',
    followUpStatus: 'pending',
  },
});
```

增加类型断言，`FollowUpSourceType` 接受 `ai_post_call`，`source_handoff_id` 允许 `null`。

- [ ] **步骤 2：运行测试并确认失败**

```bash
npm test -- --runInBand \
  src/pages/aiCallRecords/service.test.ts \
  src/services/ruoyi/agent-console.test.ts
```

预期：类型或期望参数失败。

- [ ] **步骤 3：实现最小类型变更**

在 `AiCallRecord` 增加第 2 节定义的五个字段，在 `AiCallRecordQuery` 增加：

```typescript
customerIntent?: 'positive' | 'neutral' | 'negative' | 'pending' | 'failed';
followUpStatus?:
  | 'suggested'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'closed'
  | 'none';
```

更新：

```typescript
export type FollowUpSourceType =
  | 'after_call_work'
  | 'handoff_unanswered'
  | 'ai_post_call';
```

并把 `source_handoff_id` 改为 `string | null`。

- [ ] **步骤 4：运行服务测试和类型检查**

```bash
npm test -- --runInBand \
  src/pages/aiCallRecords/service.test.ts \
  src/services/ruoyi/agent-console.test.ts
npm run tsc
```

预期：测试与 TypeScript 检查通过。

- [ ] **步骤 5：精确提交**

```bash
git add -p src/pages/aiCallRecords/service.ts
git add -p src/pages/aiCallRecords/service.test.ts
git add -p src/services/ruoyi/agent-console.ts
git add -p src/services/ruoyi/agent-console.test.ts
git diff --cached
git commit -m "feat(ai-call): 扩展通话跟进列表契约"
```

### 任务 6：实现客户意向和跟进状态双列

**文件：**

- 创建：`src/pages/aiCallRecords/status.tsx`
- 创建：`src/pages/aiCallRecords/status.test.tsx`
- 修改：`src/pages/aiCallRecords/index.tsx:1-36`
- 修改：`src/pages/aiCallRecords/index.tsx:341-495`
- 修改：`src/pages/aiCallRecords/index.tsx:512-543`
- 修改：`src/pages/aiCallRecords/index.test.tsx:210-299`

- [ ] **步骤 1：查询 Ant Design API**

```bash
npx antd info Tag --format json
npx antd info Tooltip --format json
npx antd info Table --format json
```

确认当前 antd v6 支持计划使用的 `Tag`、`Tooltip` 和表格滚动属性。

- [ ] **步骤 2：编写失败的状态映射测试**

`status.test.tsx` 覆盖：

```typescript
expect(describeCustomerIntent({
  customerIntent: 'positive',
  analysisStatus: '2',
  entryType: 'sip_outbound',
})).toEqual({ text: '正向', color: 'success', actionable: true });

expect(describeFollowUpStatus({
  followUpSuggested: true,
  followUpId: '9001',
  followUpStatus: 'completed',
})).toEqual({
  text: '已完成',
  color: 'success',
  actionable: true,
});

expect(describeFollowUpStatus({
  followUpSuggested: true,
  followUpId: null,
  followUpStatus: null,
})).toEqual({
  text: '建议跟进',
  color: 'warning',
  actionable: true,
});
```

同时断言 Mock 和无有效客户话术返回 `null`，真实任务覆盖 AI 建议，有任务但非法状态返回“状态异常”。

- [ ] **步骤 3：运行测试并确认失败**

```bash
npm test -- --runInBand src/pages/aiCallRecords/status.test.tsx
```

预期：FAIL，`status.tsx` 尚不存在。

- [ ] **步骤 4：实现纯映射组件**

`status.tsx` 只包含：

```typescript
type StatusDescription = {
  text: string;
  color: string;
  actionable: boolean;
};

export const customerIntentValueEnum = {
  positive: { text: '正向' },
  neutral: { text: '中性' },
  negative: { text: '负向' },
  pending: { text: '待分析' },
  failed: { text: '分析失败' },
};

export const followUpStatusValueEnum = {
  suggested: { text: '建议跟进' },
  pending: { text: '待跟进' },
  processing: { text: '跟进中' },
  completed: { text: '已完成' },
  closed: { text: '已关闭' },
  none: { text: '无跟进' },
};

const intentDescriptions: Record<string, StatusDescription> = {
  positive: { text: '正向', color: 'success', actionable: true },
  neutral: { text: '中性', color: 'default', actionable: true },
  negative: { text: '负向', color: 'error', actionable: true },
};

const followUpDescriptions: Record<string, StatusDescription> = {
  pending: { text: '待跟进', color: 'processing', actionable: true },
  processing: { text: '跟进中', color: 'purple', actionable: true },
  completed: { text: '已完成', color: 'success', actionable: true },
  closed: { text: '已关闭', color: 'default', actionable: true },
};

export const describeCustomerIntent = (
  record: IntentRecord,
): StatusDescription | null => {
  if (record.entryType === 'outbound_mock' || record.analysisStatus === '4') {
    return null;
  }
  if (record.analysisStatus === '0' || record.analysisStatus === '1') {
    return { text: '待分析', color: 'processing', actionable: true };
  }
  if (record.analysisStatus === '3') {
    return { text: '分析失败', color: 'error', actionable: true };
  }
  return record.customerIntent
    ? intentDescriptions[record.customerIntent] || null
    : null;
};

export const describeFollowUpStatus = (
  record: FollowUpRecord,
): StatusDescription | null => {
  if (record.followUpId) {
    return record.followUpStatus && followUpDescriptions[record.followUpStatus]
      ? followUpDescriptions[record.followUpStatus]
      : { text: '状态异常', color: 'error', actionable: false };
  }
  return record.followUpSuggested
    ? { text: '建议跟进', color: 'warning', actionable: true }
    : null;
};
```

该文件不请求接口、不读取摘要、不解析 `analysisResult.tags`。

- [ ] **步骤 5：在列表增加筛选和两个独立列**

在 `index.tsx` 增加：

```typescript
{
  title: '客户意向',
  dataIndex: 'customerIntent',
  valueType: 'select',
  valueEnum: customerIntentValueEnum,
  width: 96,
  render: (_, row) => renderCustomerIntentTag(row, () => openDetail(row.callId)),
},
{
  title: '跟进状态',
  dataIndex: 'followUpStatus',
  valueType: 'select',
  valueEnum: followUpStatusValueEnum,
  width: 112,
  render: (_, row) =>
    renderFollowUpStatusTag(row, () => {
      if (row.followUpId) {
        history.push(`/ai-call/follow-ups?followUpId=${encodeURIComponent(row.followUpId)}`);
      } else {
        void openDetail(row.callId);
      }
    }),
},
```

筛选列使用 `hideInTable` 的独立查询字段，展示列使用 `search: false`，避免 ProTable 同一个 `dataIndex` 同时产生重复查询控件。表格 `scroll.x` 增加两个列宽。

- [ ] **步骤 6：增加有界单飞轮询**

在列表 `request` 成功后记录当前页是否存在：

```typescript
const unstable = page.rows.some(
  (row) =>
    ['created', 'starting', 'running', 'active', 'ending'].includes(row.status) ||
    ['0', '1'].includes(row.analysisStatus || ''),
);
```

仅当页面可见且 `unstable=true` 时每 5 秒调用 `actionRef.current?.reload()`；请求进行中时不发起第二次 reload，稳定后清理定时器，窗口重新聚焦时刷新一次。

- [ ] **步骤 7：扩展页面测试**

验证：

```typescript
expect(screen.getByText('客户意向')).toBeTruthy();
expect(screen.getByText('跟进状态')).toBeTruthy();
expect(screen.getByText('正向').closest('.ant-tag')).toBeTruthy();
expect(screen.getByText('待跟进').closest('.ant-tag')).toBeTruthy();
```

再覆盖：

- 点击“正向”打开当前通话详情。
- 点击“待跟进”调用
  `history.push('/ai-call/follow-ups?followUpId=9001')`。
- Mock 两列均为 `-`。
- 真实任务覆盖“建议跟进”。
- 使用 Jest fake timers 验证单飞轮询和稳定后停止。

- [ ] **步骤 8：运行前端定向验证**

```bash
npm test -- --runInBand \
  src/pages/aiCallRecords/status.test.tsx \
  src/pages/aiCallRecords/index.test.tsx \
  src/pages/aiCallRecords/service.test.ts
npm run tsc
npx biome check \
  src/pages/aiCallRecords/status.tsx \
  src/pages/aiCallRecords/status.test.tsx \
  src/pages/aiCallRecords/index.tsx \
  src/pages/aiCallRecords/index.test.tsx \
  src/pages/aiCallRecords/service.ts \
  src/pages/aiCallRecords/service.test.ts
```

预期：测试、类型检查和 Biome 全部通过。

- [ ] **步骤 9：精确提交**

```bash
git add src/pages/aiCallRecords/status.tsx
git add src/pages/aiCallRecords/status.test.tsx
git add -p src/pages/aiCallRecords/index.tsx
git add -p src/pages/aiCallRecords/index.test.tsx
git add -p src/pages/aiCallRecords/service.ts
git add -p src/pages/aiCallRecords/service.test.ts
git diff --cached
git commit -m "feat(ai-call): 展示客户意向与跟进状态"
```

### 任务 7：支持跟进任务深链接

**文件：**

- 修改：`src/pages/agentWorkbench/admin/followUps/index.tsx:1-82`
- 修改：`src/pages/agentWorkbench/admin/followUps/index.tsx:203-275`
- 修改：`src/pages/agentWorkbench/admin/followUps/index.test.tsx`
- 修改：`src/services/ruoyi/agent-console.ts:199-219`

- [ ] **步骤 1：编写失败的深链接测试**

把现有源码字符串测试扩展为组件测试，Mock：

```typescript
jest.mock('@umijs/max', () => ({
  useSearchParams: () => [new URLSearchParams('followUpId=9001')],
}));

(getAdminFollowUp as jest.Mock).mockResolvedValue({
  data: {
    task: {
      id: '9001',
      source_type: 'ai_post_call',
      source_call_id: 'call-1',
      source_handoff_id: null,
      status: 'pending',
      follow_up_reason: '客户明确要求顾问回访',
    },
    attempts: [],
    callback_records: [],
  },
});
```

断言页面自动请求 `9001`、打开详情、显示“AI 话后跟进”，并把空 handoff 展示为 `-`。

再让接口返回 404/403，断言显示“关联跟进任务不存在或无权查看”，且不会打开任意列表行。

- [ ] **步骤 2：运行测试并确认失败**

```bash
npm test -- --runInBand \
  src/pages/agentWorkbench/admin/followUps/index.test.tsx
```

预期：FAIL，页面尚未读取 `followUpId`。

- [ ] **步骤 3：实现深链接和来源文案**

增加：

```typescript
const sourceLabels: Record<string, string> = {
  after_call_work: '接通后跟进',
  handoff_unanswered: '人工未接回访',
  ai_post_call: 'AI 话后跟进',
};
```

使用 `useSearchParams()` 读取 `followUpId`。在 `useEffect` 中精确调用 `getAdminFollowUp(followUpId)`；使用取消标记防止组件卸载后写状态。错误只设置专用 `deepLinkError`，不影响列表查询。

- [ ] **步骤 4：运行跟进页面验证**

```bash
npm test -- --runInBand \
  src/pages/agentWorkbench/admin/followUps/index.test.tsx \
  src/services/ruoyi/agent-console.test.ts
npm run tsc
npx biome check \
  src/pages/agentWorkbench/admin/followUps/index.tsx \
  src/pages/agentWorkbench/admin/followUps/index.test.tsx \
  src/services/ruoyi/agent-console.ts \
  src/services/ruoyi/agent-console.test.ts
```

预期：深链接、错误提示和既有管理页测试通过。

- [ ] **步骤 5：精确提交**

```bash
git add -p src/pages/agentWorkbench/admin/followUps/index.tsx
git add -p src/pages/agentWorkbench/admin/followUps/index.test.tsx
git add -p src/services/ruoyi/agent-console.ts
git add -p src/services/ruoyi/agent-console.test.ts
git diff --cached
git commit -m "feat(ai-call): 支持跟进任务深链接"
```

### 任务 8：完成无拨号副作用的回归验收

**文件：**

- 验证：前后端本计划全部修改

- [ ] **步骤 1：后端完整定向测试**

```bash
uv run pytest \
  tests/test_ai_call_post_call_follow_up.py \
  tests/test_ai_call_outbound_record_filter.py \
  tests/test_ai_call_follow_up.py \
  tests/test_ai_call_agent_console_api.py \
  tests/test_ai_call_agent_console_reconcile.py \
  tests/test_ai_call_phase_b1_records.py -q
uv run ruff check \
  app/api/v1/ai_call/model.py \
  app/api/v1/ai_call/crud.py \
  app/api/v1/ai_call/controller.py \
  app/api/v1/ai_call/service.py \
  app/services/ai_call/record_service.py \
  app/services/ai_call/semantic_analysis.py \
  app/services/ai_call/post_call_follow_up_service.py \
  app/services/ai_call/follow_up_service.py \
  app/services/ai_call/handoff_unanswered_service.py
git diff --check
```

预期：全部退出码为 0。

- [ ] **步骤 2：前端完整定向测试**

```bash
npm test -- --runInBand \
  src/pages/aiCallRecords/status.test.tsx \
  src/pages/aiCallRecords/index.test.tsx \
  src/pages/aiCallRecords/service.test.ts \
  src/pages/agentWorkbench/admin/followUps/index.test.tsx \
  src/services/ruoyi/agent-console.test.ts
npm run tsc
npx biome check \
  src/pages/aiCallRecords \
  src/pages/agentWorkbench/admin/followUps \
  src/services/ruoyi/agent-console.ts \
  src/services/ruoyi/agent-console.test.ts
npm run build
git diff --check
```

预期：Jest、TypeScript、Biome、构建和 diff 检查全部退出码为 0。

- [ ] **步骤 3：用临时 SQLite 做服务级闭环**

只使用测试创建的临时 SQLite：

```text
正式通话记录
  -> 结构化语义分析成功
  -> 明确同意、高置信
  -> 创建一条 ai_post_call 跟进任务
  -> 通话列表返回 positive + pending + followUpId
  -> 重放分析仍只有一条任务
  -> 任务认领后列表返回 processing
  -> 任务完成后列表返回 completed
```

该步骤不连接 `/tmp/ai_call_ed81_local.db`，不启动 19011，不调用 SIP/LiveKit。

- [ ] **步骤 4：运行态变更前设置人工检查点**

如需让 8077/19011 加载新能力，先现场核对：

```bash
pwd
git status --short --branch
git worktree list
lsof -nP -iTCP:8077 -sTCP:LISTEN
lsof -nP -iTCP:19011 -sTCP:LISTEN
```

再确认 listener PID 的 `cwd`、当前数据库路径和执行器开关。备份 `/tmp/ai_call_ed81_local.db` 后才能应用本地 schema 变更。不得停止或重启 19012。

运行态重启、迁移和浏览器验收属于独立检查点；没有新的运行证据前，不宣称 8077 页面或 19011 本地库已经加载本实现。

- [ ] **步骤 5：真实拨号前保持门禁**

Linphone 或真实手机号拨打仍需用户单独明确确认。完成本计划的自动化和页面数据验收，不等于已完成 SIP 振铃、接听、媒体、录音和回拨验收。

## 4. 完成标准

- 语义分析输出结构化客户意向和跟进决定，不从摘要或开放标签临时猜测。
- 明确回访意愿、明确同意且高置信时幂等创建 `ai_post_call` 跟进任务。
- 模糊意向只展示“建议跟进”，拒绝或勿扰不创建。
- ACW、转人工未接回访和外呼重试的既有职责不变。
- 通话记录分页接口批量返回客户意向和真实跟进状态，并支持数据库级筛选。
- 前端使用两个独立列，真实任务状态优先于 AI 建议。
- 跟进任务深链接能够精确打开关联任务，失败时不打开错误记录。
- 自动化和临时数据库验收不产生任何拨号副作用。
