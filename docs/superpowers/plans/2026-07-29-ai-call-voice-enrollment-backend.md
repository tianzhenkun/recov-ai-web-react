# AI Call 自定义音色后端实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在 AI Call 后端实现租户隔离的 Qwen 自定义音色创建、对账、试听、删除及正式外呼引用闭环。

**架构：** 保留 `ai_call_voice_profile` 作为全局内置音色表，新增租户音色资产、创建任务和删除任务三张表。HTTP Controller 只负责鉴权和协议转换，领域服务负责状态机和事务，Qwen Provider Adapter、私有样本存储和后台 Worker 均通过接口注入以支持 Fake 测试。

**技术栈：** Python 3.10+、FastAPI、Pydantic v2、SQLAlchemy 2 async、httpx、MinIO/S3 SigV4、pytest、ruff。

---

## 执行仓库与前置约束

- 工作目录：`/Users/liuhongli/.codex/worktrees/ed81/ai-call`
- 当前分支：`codex/ai-call-workflow-split`
- 当前工作区已有未提交改动。每个任务开始前运行 `git status --short` 和
  `git diff -- <本任务文件>`，只暂存本任务明确列出的文件。
- `codegraph` 当前不可用，结构分析使用定向 `rg`。
- 不写入真实 DashScope Key、OSS 密钥、录音或本地数据库。
- 阶段 A 使用 Fake Provider 和 Fake Storage；真实 Qwen 只在集成验收计划启用。

## 文件结构

**创建：**

- `app/api/v1/ai_call/voice/__init__.py`：把音色 Router 挂到 AI Call Router。
- `app/api/v1/ai_call/voice/model.py`：三张租户音色表。
- `app/api/v1/ai_call/voice/schema.py`：API 输入输出和状态枚举。
- `app/api/v1/ai_call/voice/repository.py`：租户隔离查询、claim、状态更新和引用计数。
- `app/api/v1/ai_call/voice/service.py`：创建、列表、重传、试听和删除领域规则。
- `app/api/v1/ai_call/voice/controller.py`：FastAPI multipart 与 JSON API。
- `app/services/ai_call/providers/qwen_voice_enrollment.py`：Qwen create/list/delete Adapter。
- `app/services/ai_call/voice_sample.py`：音频校验、Data URL 和临时对象存储接口。
- `app/services/ai_call/voice_enrollment_worker.py`：创建、对账、删除和清理 Worker。
- `docs/livekit-ai-outbound/sql/phase-h6-voice-enrollment-postgres.sql`：PostgreSQL 迁移。
- `tests/test_ai_call_voice_models.py`：表结构和 SQL 契约。
- `tests/test_ai_call_voice_provider.py`：Qwen Adapter 请求和错误分类。
- `tests/test_ai_call_voice_service.py`：领域状态机、租户和幂等。
- `tests/test_ai_call_voice_api.py`：HTTP 契约和鉴权。
- `tests/test_ai_call_voice_worker.py`：claim、重试、对账和清理。
- `tests/test_ai_call_voice_preview.py`：隔离试听会话。

**修改：**

- `app/api/v1/ai_call/__init__.py`：挂载音色 Router。
- `app/api/v1/ai_call/outbound/rule_task_model.py`：增加音色快照字段。
- `app/api/v1/ai_call/outbound/rule_task_schema.py`：返回音色快照字段。
- `app/api/v1/ai_call/outbound/rule_task_service.py`：按租户、模型、状态解析音色。
- `app/api/v1/ai_call/service.py`：提供不落正式记录的隔离试听入口。
- `app/services/ai_call/orchestrator.py`：允许试听使用固定 PromptEffectiveConfig。
- `app/api/v1/system/auth/schema.py`：携带当前用户权限集合。
- `app/core/dependencies.py`：解析 JWT 权限声明并提供音色管理权限依赖。
- `app/utils/minio_util.py`：增加私有对象读取与删除。
- `app/config/setting.py`：增加 Worker 和 Qwen Enrollment 配置。
- `app/plugin/init_app.py`：启动和停止音色 Worker。
- `pyproject.toml`、`uv.lock`：加入 `mutagen==1.47.0`。
- `tests/test_ai_call_outbound_rule_task.py`：音色解析与快照回归。
- `tests/test_minio_util.py`：对象读取和删除签名测试。
- `tests/test_auth_context.py`：JWT 权限声明解析和拒绝路径。

### 任务 1：建立租户音色数据模型和迁移

**文件：**

- 创建：`app/api/v1/ai_call/voice/model.py`
- 创建：`docs/livekit-ai-outbound/sql/phase-h6-voice-enrollment-postgres.sql`
- 创建：`tests/test_ai_call_voice_models.py`

- [ ] **步骤 1：编写失败的模型契约测试**

```python
from sqlalchemy import Index, UniqueConstraint

from app.api.v1.ai_call.voice.model import (
    AiCallTenantVoiceProfileModel,
    AiCallVoiceDeletionModel,
    AiCallVoiceEnrollmentModel,
)


def _unique_columns(model) -> set[tuple[str, ...]]:
    return {
        tuple(column.name for column in item.columns)
        for item in model.__table__.constraints
        if isinstance(item, UniqueConstraint)
    }


def _index_columns(model) -> set[tuple[str, ...]]:
    return {
        tuple(column.name for column in item.columns)
        for item in model.__table__.indexes
        if isinstance(item, Index)
    }


def test_voice_models_preserve_tenant_and_idempotency_boundaries() -> None:
    assert ("tenant_id", "target_model", "voice") in _unique_columns(
        AiCallTenantVoiceProfileModel
    )
    assert ("tenant_id", "idempotency_key") in _unique_columns(
        AiCallVoiceEnrollmentModel
    )
    assert ("tenant_id", "idempotency_key") in _unique_columns(
        AiCallVoiceDeletionModel
    )
    assert ("tenant_id", "status", "updated_at") in _index_columns(
        AiCallTenantVoiceProfileModel
    )
    assert AiCallTenantVoiceProfileModel.__table__.foreign_keys == set()
    assert AiCallVoiceEnrollmentModel.__table__.foreign_keys == set()
    assert AiCallVoiceDeletionModel.__table__.foreign_keys == set()
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
uv run pytest tests/test_ai_call_voice_models.py -q
```

预期：FAIL，`app.api.v1.ai_call.voice` 尚不存在。

- [ ] **步骤 3：实现四张模型表**

在 `model.py` 定义以下公开类型和字段：

```python
class AiCallTenantVoiceProfileModel(MappedBase):
    __tablename__ = "ai_call_tenant_voice_profile"
    # id, tenant_id, display_name, voice(nullable), voice_type, gender,
    # language, target_model, provider, status, latest_enrollment_id,
    # provider_created_at, error_message, created_by, deleted_by,
    # deleted_at, created_at, updated_at


class AiCallVoiceEnrollmentModel(MappedBase):
    __tablename__ = "ai_call_voice_enrollment"
    # id, tenant_id, voice_profile_id, idempotency_key, request_hash,
    # preferred_name, language, transcript, sample_object_key,
    # sample_sha256, status, provider_voice, provider_request_id,
    # attempt_count, next_retry_at, lease_owner, lease_expires_at,
    # error_message, cleanup_error_message, consent_user_id, consent_at,
    # started_at, finished_at, created_at, updated_at


class AiCallVoiceDeletionModel(MappedBase):
    __tablename__ = "ai_call_voice_deletion"
    # id, tenant_id, voice_profile_id, idempotency_key, status,
    # provider_request_id, attempt_count, next_retry_at, lease_owner,
    # lease_expires_at, historical_task_count, error_message,
    # requested_by, started_at, finished_at, created_at, updated_at


class AiCallVoiceSampleCleanupModel(MappedBase):
    __tablename__ = "ai_call_voice_sample_cleanup"
    # id, tenant_id, object_key, status, attempt_count, next_retry_at,
    # lease_owner, lease_expires_at, error_message, created_at, updated_at
```

所有 bigint 关系均为逻辑 ID，不声明 `ForeignKey`。JSON 内容不用数据库 JSON 类型。

- [ ] **步骤 4：编写与模型一致的 PostgreSQL 迁移**

迁移必须使用 `CREATE TABLE IF NOT EXISTS`，显式建立：

```sql
CONSTRAINT uk_tenant_voice_model_voice
    UNIQUE (tenant_id, target_model, voice);
CONSTRAINT uk_voice_enrollment_tenant_key
    UNIQUE (tenant_id, idempotency_key);
CONSTRAINT uk_voice_deletion_tenant_key
    UNIQUE (tenant_id, idempotency_key);
CONSTRAINT uk_voice_sample_cleanup_object_key
    UNIQUE (object_key);
```

并为 Worker 建立：

```sql
CREATE INDEX IF NOT EXISTS idx_voice_enrollment_claim
    ON ai_call_voice_enrollment (status, next_retry_at, id);
CREATE INDEX IF NOT EXISTS idx_voice_deletion_claim
    ON ai_call_voice_deletion (status, next_retry_at, id);
CREATE INDEX IF NOT EXISTS idx_voice_sample_cleanup_claim
    ON ai_call_voice_sample_cleanup (status, next_retry_at, id);
```

- [ ] **步骤 5：运行模型、SQL 和格式验证**

运行：

```bash
uv run pytest tests/test_ai_call_voice_models.py -q
uv run ruff check app/api/v1/ai_call/voice/model.py tests/test_ai_call_voice_models.py
git diff --check
```

预期：测试 PASS，ruff 输出 `All checks passed!`，diff check 无输出。

- [ ] **步骤 6：Commit**

```bash
git add app/api/v1/ai_call/voice/model.py \
  docs/livekit-ai-outbound/sql/phase-h6-voice-enrollment-postgres.sql \
  tests/test_ai_call_voice_models.py
git commit -m "feat(ai-call): 增加租户音色数据模型"
```

### 任务 2：实现 Qwen Voice Enrollment Provider Adapter

**文件：**

- 创建：`app/services/ai_call/providers/qwen_voice_enrollment.py`
- 创建：`tests/test_ai_call_voice_provider.py`

- [ ] **步骤 1：编写请求与错误分类失败测试**

```python
import httpx
import pytest

from app.services.ai_call.providers.qwen_voice_enrollment import (
    QwenVoiceEnrollmentProvider,
    VoiceProviderResultUnknownError,
    VoiceProviderRetryableError,
)


@pytest.mark.asyncio
async def test_provider_create_uses_server_owned_model_and_bearer_key() -> None:
    seen = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        seen["headers"] = dict(request.headers)
        seen["body"] = request.read().decode()
        return httpx.Response(
            200,
            json={"output": {"voice": "qwen-omni-vc-demo"}, "request_id": "req-1"},
        )

    provider = QwenVoiceEnrollmentProvider(
        api_key="secret",
        target_model="qwen3.5-omni-plus-realtime",
        transport=httpx.MockTransport(handler),
    )
    result = await provider.create(
        preferred_name="vc123",
        audio_data_url="data:audio/mpeg;base64,AA==",
    )

    assert result.voice == "qwen-omni-vc-demo"
    assert seen["headers"]["authorization"] == "Bearer secret"
    assert '"model":"qwen-voice-enrollment"' in seen["body"]
    assert '"target_model":"qwen3.5-omni-plus-realtime"' in seen["body"]


@pytest.mark.asyncio
async def test_provider_classifies_429_as_retryable() -> None:
    provider = QwenVoiceEnrollmentProvider(
        api_key="secret",
        target_model="qwen3.5-omni-plus-realtime",
        transport=httpx.MockTransport(
            lambda _: httpx.Response(429, json={"message": "rate limited"})
        ),
    )
    with pytest.raises(VoiceProviderRetryableError):
        await provider.list()
```

- [ ] **步骤 2：运行测试确认失败**

```bash
uv run pytest tests/test_ai_call_voice_provider.py -q
```

预期：FAIL，Provider 类型尚不存在。

- [ ] **步骤 3：实现 Provider 接口**

公开签名固定为：

```python
@dataclass(frozen=True)
class VoiceCreateResult:
    voice: str
    request_id: str | None


@dataclass(frozen=True)
class VoiceListItem:
    voice: str
    target_model: str | None
    gmt_create: str | None


class QwenVoiceEnrollmentProvider:
    async def create(
        self,
        *,
        preferred_name: str,
        audio_data_url: str,
    ) -> VoiceCreateResult:
        payload = {
            "action": "create",
            "target_model": self.target_model,
            "preferred_name": preferred_name,
            "audio": {"data": audio_data_url},
        }
        body, request_id = await self._request(payload)
        voice = str(body.get("output", {}).get("voice") or "").strip()
        if not voice:
            raise VoiceProviderProtocolError("Qwen 创建响应缺少 voice")
        return VoiceCreateResult(voice=voice, request_id=request_id)

    async def list(
        self,
        *,
        page_index: int = 0,
        page_size: int = 1000,
    ) -> list[VoiceListItem]:
        body, _ = await self._request(
            {
                "action": "list",
                "page_index": page_index,
                "page_size": page_size,
            }
        )
        voices = body.get("output", {}).get("voice_list") or []
        return [
            VoiceListItem(
                voice=str(item["voice"]),
                target_model=(
                    str(item["target_model"]) if item.get("target_model") else None
                ),
                gmt_create=str(item["gmt_create"]) if item.get("gmt_create") else None,
            )
            for item in voices
            if isinstance(item, dict) and item.get("voice")
        ]

    async def delete(self, *, voice: str) -> str | None:
        _, request_id = await self._request({"action": "delete", "voice": voice})
        return request_id
```

共用 `_request(action, input_values)`，请求体顶层固定包含
`model=qwen-voice-enrollment` 和 `input`，只记录脱敏错误。4xx 抛
`VoiceProviderRejectedError`；429、5xx、连接失败抛
`VoiceProviderRetryableError`；创建请求发生读写超时时抛
`VoiceProviderResultUnknownError`，由 Worker 进入 `RECONCILING`，禁止盲目重试；
响应缺少 `voice` 抛 `VoiceProviderProtocolError`。

- [ ] **步骤 4：补齐 create/list/delete 和敏感信息测试**

测试必须断言：

- `action=create/list/delete` 的 JSON 正确。
- create 不发送当前官方契约未声明的 `language`、`text` 字段。
- list 发送 `page_index`、`page_size`，解析 `output.voice_list`。
- create 读写超时分类为 `VoiceProviderResultUnknownError`。
- 错误对象和日志字符串不包含 API Key 与 Data URL。
- `request_id` 同时兼容 `request_id` 和 `requestId`。

- [ ] **步骤 5：验证并 Commit**

```bash
uv run pytest tests/test_ai_call_voice_provider.py -q
uv run ruff check app/services/ai_call/providers/qwen_voice_enrollment.py \
  tests/test_ai_call_voice_provider.py
git diff --check
git add app/services/ai_call/providers/qwen_voice_enrollment.py \
  tests/test_ai_call_voice_provider.py
git commit -m "feat(ai-call): 增加 Qwen 音色复刻适配器"
```

### 任务 3：实现音频校验与私有临时样本存储

**文件：**

- 创建：`app/services/ai_call/voice_sample.py`
- 修改：`app/utils/minio_util.py`
- 修改：`tests/test_minio_util.py`
- 创建：`tests/test_ai_call_voice_sample.py`
- 修改：`pyproject.toml`
- 修改：`uv.lock`

- [ ] **步骤 1：先写音频约束失败测试**

```python
import pytest

from app.services.ai_call.voice_sample import VoiceSampleValidationError, inspect_sample


def test_wav_requires_mono_24khz_16bit(wav_factory) -> None:
    valid = inspect_sample(
        wav_factory(seconds=10, sample_rate=24000, channels=1, sample_width=2),
        filename="voice.wav",
        content_type="audio/wav",
    )
    assert valid.duration_seconds == pytest.approx(10, rel=0.01)

    with pytest.raises(VoiceSampleValidationError, match="单声道"):
        inspect_sample(
            wav_factory(seconds=10, sample_rate=24000, channels=2, sample_width=2),
            filename="voice.wav",
            content_type="audio/wav",
        )
```

同时覆盖：

- 扩展名仅 `.wav/.mp3/.m4a`。
- 文件 `< 10 MB` 且非空。
- 时长 3～60 秒。
- 采样率 `>= 24000`。
- WAV sample width 为 2 bytes。

- [ ] **步骤 2：运行测试确认失败**

```bash
uv run pytest tests/test_ai_call_voice_sample.py -q
```

预期：FAIL，`voice_sample` 尚不存在。

- [ ] **步骤 3：加入 Mutagen 并实现校验**

```bash
uv add "mutagen==1.47.0"
```

实现：

```python
@dataclass(frozen=True)
class VoiceSampleMetadata:
    filename: str
    content_type: str
    size_bytes: int
    duration_seconds: float
    sample_rate: int
    channels: int
    sha256: str


def to_data_url(data: bytes, content_type: str) -> str:
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{content_type};base64,{encoded}"
```

WAV 使用标准库 `wave` 读取 bit depth；MP3/M4A 使用 Mutagen 读取时长、采样率和声道。
`inspect_sample()` 完整执行扩展名、大小、时长、采样率、声道和 WAV sample width
检查，返回上面的 `VoiceSampleMetadata`；任一约束失败抛带稳定中文消息的
`VoiceSampleValidationError`。

- [ ] **步骤 4：先写对象读取和删除失败测试**

在 `tests/test_minio_util.py` 用 `httpx.MockTransport` 断言：

```python
data = await MinioUtil.get_object(config, "voice-samples/a.mp3")
await MinioUtil.delete_object(config, "voice-samples/a.mp3")
assert data == b"sample"
assert seen_methods == ["GET", "DELETE"]
```

- [ ] **步骤 5：实现私有存储接口**

`voice_sample.py` 公开：

```python
class VoiceSampleStorage(Protocol):
    async def put(
        self,
        *,
        object_key: str,
        data: bytes,
        content_type: str,
    ) -> None:
        raise NotImplementedError

    async def get(self, object_key: str) -> bytes:
        raise NotImplementedError

    async def delete(self, object_key: str) -> None:
        raise NotImplementedError
```

object key 由受理服务预先生成，固定在 `ai-call/voice-samples` 前缀下；
`MinioVoiceSampleStorage` 按指定 key 幂等上传，不返回公开 URL。在 `MinioUtil`
增加按指定 key 的 SigV4 `PUT` 以及 `GET`、`DELETE`。

- [ ] **步骤 6：验证并 Commit**

```bash
uv run pytest tests/test_ai_call_voice_sample.py tests/test_minio_util.py -q
uv run ruff check app/services/ai_call/voice_sample.py app/utils/minio_util.py \
  tests/test_ai_call_voice_sample.py tests/test_minio_util.py
git diff --check
git add pyproject.toml uv.lock app/services/ai_call/voice_sample.py \
  app/utils/minio_util.py tests/test_ai_call_voice_sample.py tests/test_minio_util.py
git commit -m "feat(ai-call): 校验并私有存储音色样本"
```

### 任务 4：实现租户 Repository 与统一列表

**文件：**

- 创建：`app/api/v1/ai_call/voice/repository.py`
- 创建：`app/api/v1/ai_call/voice/schema.py`
- 创建：`tests/test_ai_call_voice_service.py`

- [ ] **步骤 1：编写租户合并列表失败测试**

```python
@pytest.mark.asyncio
async def test_list_merges_global_and_current_tenant_only(database) -> None:
    async with database() as db:
        await seed_builtin(db, voice="Tina")
        await seed_tenant_voice(db, tenant_id="tenant-a", voice="vc-a", status="ENABLED")
        await seed_tenant_voice(db, tenant_id="tenant-b", voice="vc-b", status="ENABLED")
        rows, total = await VoiceRepository(db).list_profiles(
            tenant_id="tenant-a",
            target_model="qwen3.5-omni-plus-realtime",
            available_only=False,
            include_deleted=False,
            page_num=1,
            page_size=20,
        )
    assert [row.voice for row in rows] == ["vc-a", "Tina"]
    assert total == 2
```

- [ ] **步骤 2：运行测试确认失败**

```bash
uv run pytest tests/test_ai_call_voice_service.py::test_list_merges_global_and_current_tenant_only -q
```

预期：FAIL，Repository 尚不存在。

- [ ] **步骤 3：实现统一 DTO 和分页**

`schema.py` 定义：

```python
VoiceStatus = Literal[
    "CREATING", "ENABLED", "CREATE_FAILED",
    "DELETING", "DELETE_FAILED", "DELETED",
]

class VoiceProfileOut(BaseModel):
    id: str
    scope: Literal["GLOBAL", "TENANT"]
    voice: str | None
    display_name: str
    voice_type: str
    gender: str
    language: str | None
    target_model: str
    status: VoiceStatus
    error_message: str | None
    can_preview: bool
    can_delete: bool
    created_at: datetime
    updated_at: datetime
```

Repository 必须在两条独立查询中读取全局和租户数据，再在服务层稳定排序和分页；
禁止关闭租户过滤读取全部自定义音色。`available_only=True` 只包含 `ENABLED`。

- [ ] **步骤 4：覆盖筛选、删除记录和 bigint 字符串**

增加测试验证 `voiceType/gender/status/includeDeleted/availableOnly`，并断言所有
`id` 输出为字符串。

- [ ] **步骤 5：验证并 Commit**

```bash
uv run pytest tests/test_ai_call_voice_service.py -q
uv run ruff check app/api/v1/ai_call/voice/repository.py \
  app/api/v1/ai_call/voice/schema.py tests/test_ai_call_voice_service.py
git diff --check
git add app/api/v1/ai_call/voice/repository.py \
  app/api/v1/ai_call/voice/schema.py tests/test_ai_call_voice_service.py
git commit -m "feat(ai-call): 提供租户音色统一列表"
```

### 任务 5：实现创建与重新上传的幂等受理

**文件：**

- 创建：`app/api/v1/ai_call/voice/service.py`
- 修改：`app/api/v1/ai_call/voice/model.py`
- 修改：`app/api/v1/ai_call/voice/schema.py`
- 修改：`docs/livekit-ai-outbound/sql/phase-h6-voice-enrollment-postgres.sql`
- 修改：`tests/test_ai_call_voice_models.py`
- 修改：`tests/test_ai_call_voice_service.py`

- [ ] **步骤 1：编写幂等和授权失败测试**

```python
@pytest.mark.asyncio
async def test_create_reuses_same_key_and_hash(
    voice_service, db_session, valid_sample
) -> None:
    request = VoiceEnrollmentRequest(
        display_name=" 客服小林 ",
        gender="女声",
        language="zh",
        transcript="您好",
        consent_confirmed=True,
    )
    first = await voice_service.create(
        db_session,
        tenant_id="tenant-a",
        user_id=7,
        idempotency_key="key-1",
        request=request,
        sample=valid_sample,
    )
    second = await voice_service.create(
        db_session,
        tenant_id="tenant-a",
        user_id=7,
        idempotency_key="key-1",
        request=request,
        sample=valid_sample,
    )
    assert second.voice_profile_id == first.voice_profile_id
    assert second.enrollment_id == first.enrollment_id


@pytest.mark.asyncio
async def test_create_rejects_same_key_with_different_payload(
    voice_service, db_session, valid_sample
) -> None:
    first_request = VoiceEnrollmentRequest(
        display_name="A",
        gender="女声",
        language="zh",
        transcript=None,
        consent_confirmed=True,
    )
    second_request = first_request.model_copy(update={"display_name": "B"})
    await voice_service.create(
        db_session,
        tenant_id="tenant-a",
        user_id=7,
        idempotency_key="key-1",
        request=first_request,
        sample=valid_sample,
    )
    with pytest.raises(CustomException) as exc:
        await voice_service.create(
            db_session,
            tenant_id="tenant-a",
            user_id=7,
            idempotency_key="key-1",
            request=second_request,
            sample=valid_sample,
        )
    assert exc.value.status_code == 409
```

同时验证 `consent_confirmed=False` 返回 422，`tenant_id` 和 target model 不取请求字段。

- [ ] **步骤 2：运行测试确认失败**

```bash
uv run pytest tests/test_ai_call_voice_service.py -q
```

预期：FAIL，创建服务尚未实现。

- [ ] **步骤 3：实现事务内受理**

公开签名：

```python
class VoiceEnrollmentRequest(BaseModel):
    display_name: str
    gender: Literal["未知", "女声", "男声"]
    language: str
    transcript: str | None = None
    consent_confirmed: bool


class VoiceEnrollmentAcceptedOut(BaseModel):
    voice_profile_id: str
    enrollment_id: str
    status: Literal["CREATING"]
    display_name: str


async def create(
    self,
    db: AsyncSession,
    *,
    tenant_id: str,
    user_id: int,
    idempotency_key: str,
    request: VoiceEnrollmentRequest,
    sample: UploadFile,
) -> VoiceEnrollmentAcceptedOut:
    return await self._accept_enrollment(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        idempotency_key=idempotency_key,
        request=request,
        sample=sample,
        existing_profile_id=None,
    )
```

执行顺序固定：

1. 校验 Key、授权和规范化字段。
2. 读取文件并执行 `inspect_sample`。
3. 计算 `request_hash`。
4. 查询 `(tenant_id, idempotency_key)`。
5. 相同摘要返回原记录；不同摘要抛 409。
6. 预生成 profile/enrollment ID 和确定的私有 object key。
7. 在数据库事务外按指定 key 幂等上传；上传结果未知时也能按已知 key 清理或补偿。
8. 开启短事务；`reenroll` 在此处原子占用 `CREATE_FAILED`。
9. 同一事务新增资产 `CREATING` 和任务 `PENDING`。
10. `preferred_name = f"vc{profile_id}"[-16:]`。

`flush` 明确失败时删除刚上传对象。`commit` 抛错属于结果未知，必须使用独立 session
按 `(tenant_id, idempotency_key)` 对账；确认任务已提交则返回原受理结果，确认不存在
才删除对象，对账本身失败则登记清理补偿且清理 Worker 必须先检查引用。对象删除失败
时，在独立事务写入
`ai_call_voice_sample_cleanup`，保存唯一 object key 供 Worker 重试。清理记录本身
持久化失败时仅记录不含 object key、文件名、幂等 Key 和底层异常的安全日志。

- [ ] **步骤 4：实现失败资产重新上传**

`reenroll` 只接受当前租户 `CREATE_FAILED` 资产，并在上传后的短事务中使用条件更新
原子占用该状态；并发使用不同 Key 时只有一个请求可以生成 enrollment。同 Key 的
CAS 失败请求必须回滚并查询赢家，摘要一致时返回原受理结果。成功后更新
`latest_enrollment_id`，清空 `error_message`，状态回到 `CREATING`。

- [ ] **步骤 5：验证并 Commit**

```bash
uv run pytest tests/test_ai_call_voice_service.py -q
uv run ruff check app/api/v1/ai_call/voice/model.py \
  app/api/v1/ai_call/voice/service.py app/api/v1/ai_call/voice/schema.py \
  tests/test_ai_call_voice_models.py tests/test_ai_call_voice_service.py
git diff --check
git add app/api/v1/ai_call/voice/model.py app/api/v1/ai_call/voice/service.py \
  app/api/v1/ai_call/voice/schema.py \
  docs/livekit-ai-outbound/sql/phase-h6-voice-enrollment-postgres.sql \
  tests/test_ai_call_voice_models.py tests/test_ai_call_voice_service.py
git commit -m "feat(ai-call): 幂等受理音色复刻任务"
```

### 任务 6：实现创建 Worker、重试、对账和样本清理

**文件：**

- 创建：`app/services/ai_call/voice_enrollment_worker.py`
- 创建：`tests/test_ai_call_voice_worker.py`

- [ ] **步骤 1：编写成功、重试和结果未知失败测试**

```python
@pytest.mark.asyncio
async def test_worker_publishes_voice_and_deletes_sample(harness) -> None:
    task = await harness.seed_enrollment(status="PENDING")
    harness.provider.create_result = VoiceCreateResult(
        voice="qwen-omni-vc-a", request_id="req-1"
    )

    await harness.worker.run_once()

    profile = await harness.profile(task.voice_profile_id)
    enrollment = await harness.enrollment(task.id)
    assert profile.status == "ENABLED"
    assert profile.voice == "qwen-omni-vc-a"
    assert enrollment.status == "SUCCEEDED"
    assert enrollment.sample_object_key is None
    assert harness.storage.deleted == ["voice-samples/a.mp3"]


@pytest.mark.asyncio
async def test_worker_reconciles_timeout_without_second_create(harness) -> None:
    harness.provider.create_error = VoiceProviderResultUnknownError("timeout")
    harness.provider.list_result = ["qwen-omni-vc-vc123"]
    await harness.worker.run_once()
    await harness.worker.run_once()
    assert harness.provider.create_calls == 1
    assert (await harness.profile()).status == "ENABLED"
```

- [ ] **步骤 2：运行测试确认失败**

```bash
uv run pytest tests/test_ai_call_voice_worker.py -q
```

预期：FAIL，Worker 尚不存在。

- [ ] **步骤 3：实现原子 claim 和租约**

Worker 每批最多 N 条，claim 条件：

```text
PENDING
RETRY_WAIT 且 next_retry_at <= now
PROCESSING/RECONCILING 且 lease_expires_at < now
```

claim 后写 `lease_owner`、`lease_expires_at`、`attempt_count + 1`。PostgreSQL 使用
`FOR UPDATE SKIP LOCKED`；SQLite 测试使用单事务条件更新。

- [ ] **步骤 4：实现状态机与退避**

固定退避：

```python
RETRY_DELAYS = (5, 30, 120)
```

- 明确 4xx：`FAILED`，资产 `CREATE_FAILED`。
- 429/5xx/连接失败：`RETRY_WAIT`，最多 3 次。
- 结果未知：`RECONCILING`，用 `preferred_name` 从 list 结果匹配。
- 成功：先落 provider voice 和资产 `ENABLED`，再清理对象。
- 成功或失败都清理对象并清空 `sample_object_key`。
- 清理失败写 `cleanup_error_message`，下一次清理扫描继续尝试。
- 同一 Worker 同时扫描 `ai_call_voice_sample_cleanup`；删除成功进入 `SUCCEEDED`，
  失败按相同退避进入 `RETRY_WAIT`。删除前查询 enrollment 是否仍引用 object key；
  存在引用时不删除对象，只把孤儿清理记录置为 `SUCCEEDED`。不得把 object key 或
  底层存储异常写入日志。

- [ ] **步骤 5：验证并 Commit**

```bash
uv run pytest tests/test_ai_call_voice_worker.py -q
uv run ruff check app/services/ai_call/voice_enrollment_worker.py \
  tests/test_ai_call_voice_worker.py
git diff --check
git add app/services/ai_call/voice_enrollment_worker.py \
  tests/test_ai_call_voice_worker.py
git commit -m "feat(ai-call): 执行音色创建与对账任务"
```

### 任务 7：实现租户鉴权 API 契约

**文件：**

- 创建：`app/api/v1/ai_call/voice/controller.py`
- 创建：`app/api/v1/ai_call/voice/__init__.py`
- 修改：`app/api/v1/ai_call/__init__.py`
- 修改：`app/api/v1/system/auth/schema.py`
- 修改：`app/core/dependencies.py`
- 创建：`tests/test_ai_call_voice_api.py`
- 修改：`tests/test_auth_context.py`

- [ ] **步骤 1：编写 HTTP 契约失败测试**

```python
def test_create_voice_accepts_multipart_and_returns_202(client, wav_bytes) -> None:
    response = client.post(
        "/ai-call/voice-enrollments",
        headers={"Idempotency-Key": "key-1"},
        files={
            "file": ("voice.wav", wav_bytes, "audio/wav"),
            "request": (
                None,
                '{"displayName":"客服小林","gender":"女声",'
                '"language":"zh","consentConfirmed":true}',
                "application/json",
            ),
        },
    )
    assert response.status_code == 202
    assert response.json()["data"]["status"] == "CREATING"
```

同时测试：

- 无 Key 返回 422/400。
- JWT 权限声明缺少 `ai_call:voice:manage` 时，写操作和管理列表返回 403。
- 跨租户查询、重传、试听、删除返回 404 或 403。
- 列表接收 camelCase 查询参数。
- ID 以字符串返回。

- [ ] **步骤 2：运行测试确认失败**

```bash
uv run pytest tests/test_ai_call_voice_api.py -q
```

预期：FAIL，Router 尚未挂载。

- [ ] **步骤 3：实现 Controller**

先让 `AuthSchema` 增加 `permissions: frozenset[str]`，并从 JWT subject 的
`permissions` 字符串数组解析。新增依赖：

```python
async def get_voice_manager(
    auth: AuthSchema = Depends(get_current_user),
) -> AuthSchema:
    if settings.JWT_ENABLE and "ai_call:voice:manage" not in auth.permissions:
        raise CustomException(msg="无权限操作", code=10403, status_code=403)
    return auth
```

本地 `JWT_ENABLE=False` 继续使用项目现有开发兜底；生产 JWT 模式默认拒绝缺少声明的
请求。管理列表和所有写操作使用 `get_voice_manager`，正式任务
`availableOnly=true` 的读取仍使用 `get_current_user`。

路由固定为：

```text
GET    /ai-call/voice-profiles
POST   /ai-call/voice-enrollments
POST   /ai-call/tenant-voice-profiles/{id}/enrollments
GET    /ai-call/voice-enrollments/{id}
POST   /ai-call/voice-preview-sessions
POST   /ai-call/voice-preview-sessions/{callId}/ready
DELETE /ai-call/voice-preview-sessions/{callId}
GET    /ai-call/tenant-voice-profiles/{id}/deletion-check
DELETE /ai-call/tenant-voice-profiles/{id}
```

所有路由从认证上下文解析 tenant 和 user。multipart `request` 通过 `Form()` 读取字符串后
`VoiceEnrollmentRequest.model_validate_json()`。

- [ ] **步骤 4：迁移旧音色路由并删除直接登记入口**

从原 `app/api/v1/ai_call/controller.py` 移除 GET/POST 两个
`/voice-profiles` 路由，GET 由新 Router 提供统一租户列表，避免重复路由；旧的公开
POST 不再暴露，避免任何客户端绕过 Qwen 创建流程直接写 `voice`。内置音色种入逻辑和
Repository 保留。

- [ ] **步骤 5：验证并 Commit**

```bash
uv run pytest tests/test_ai_call_voice_api.py tests/test_ai_call_phase_b4_prompt_config.py -q
uv run ruff check app/api/v1/ai_call/voice app/api/v1/ai_call/controller.py \
  app/api/v1/ai_call/__init__.py app/api/v1/system/auth/schema.py \
  app/core/dependencies.py tests/test_ai_call_voice_api.py tests/test_auth_context.py
git diff --check
git add app/api/v1/ai_call/voice app/api/v1/ai_call/__init__.py \
  app/api/v1/ai_call/controller.py app/api/v1/system/auth/schema.py \
  app/core/dependencies.py tests/test_ai_call_voice_api.py tests/test_auth_context.py
git commit -m "feat(ai-call): 开放租户音色管理接口"
```

### 任务 8：实现隔离的真实 Realtime 试听

**文件：**

- 修改：`app/api/v1/ai_call/service.py`
- 修改：`app/services/ai_call/orchestrator.py`
- 修改：`app/api/v1/ai_call/voice/service.py`
- 修改：`app/api/v1/ai_call/voice/controller.py`
- 创建：`tests/test_ai_call_voice_preview.py`

- [ ] **步骤 1：编写不落正式记录的试听失败测试**

```python
@pytest.mark.asyncio
async def test_preview_uses_fixed_opening_without_formal_record(preview_harness) -> None:
    result = await preview_harness.service.create_preview_session(
        tenant_id="tenant-a",
        voice="qwen-omni-vc-a",
    )
    assert result.effective_config.opening_message == (
        "您好，我是您的智能语音助手，很高兴为您服务。"
    )
    assert preview_harness.record_repository.created_records == []
    assert result.participant_identity.startswith("browser-")
```

再覆盖内置音色允许、其他租户音色拒绝、非 ENABLED 拒绝、30 秒超时释放。

- [ ] **步骤 2：运行测试确认失败**

```bash
uv run pytest tests/test_ai_call_voice_preview.py -q
```

预期：FAIL，试听入口尚不存在。

- [ ] **步骤 3：实现试听会话**

增加常量：

```python
VOICE_PREVIEW_OPENING_MESSAGE = "您好，我是您的智能语音助手，很高兴为您服务。"
VOICE_PREVIEW_TIMEOUT_SECONDS = 30
```

服务按 tenant、target model、voice 和 `ENABLED` 解析资产，然后直接调用
`orchestrator.create_web_session(voice=voice, prompt=None,
prompt_effective_config=preview_config)`。试听会话不调用
`record_service.create_web_record`；前端调用独立 `ready` 接口后，服务直接调用
`orchestrator.report_browser_event()` 触发现有 opening 流程，避免正式
`AiCallService.report_browser_event()` 写通话记录。独立 DELETE 接口调用
`orchestrator.end_session()`，同时保留服务端 30 秒兜底释放。

- [ ] **步骤 4：验证并 Commit**

```bash
uv run pytest tests/test_ai_call_voice_preview.py tests/test_ai_call_phase_a_core.py -q
uv run ruff check app/api/v1/ai_call/service.py \
  app/services/ai_call/orchestrator.py app/api/v1/ai_call/voice \
  tests/test_ai_call_voice_preview.py
git diff --check
git add app/api/v1/ai_call/service.py app/services/ai_call/orchestrator.py \
  app/api/v1/ai_call/voice/service.py app/api/v1/ai_call/voice/controller.py \
  tests/test_ai_call_voice_preview.py
git commit -m "feat(ai-call): 增加隔离音色试听会话"
```

### 任务 9：实现删除引用检查与异步删除

**文件：**

- 修改：`app/api/v1/ai_call/voice/repository.py`
- 修改：`app/api/v1/ai_call/voice/service.py`
- 修改：`app/services/ai_call/voice_enrollment_worker.py`
- 修改：`tests/test_ai_call_voice_service.py`
- 修改：`tests/test_ai_call_voice_worker.py`

- [ ] **步骤 1：编写引用门禁失败测试**

```python
BLOCKING = {"SCHEDULED", "RUNNING", "PAUSING", "PAUSED", "STOPPING"}
HISTORICAL = {"STOPPED", "COMPLETED", "FAILED", "CANCELLED"}


@pytest.mark.asyncio
@pytest.mark.parametrize("task_status", sorted(BLOCKING))
async def test_deletion_check_blocks_nonterminal_tasks(service, task_status) -> None:
    await seed_task(tenant_id="tenant-a", voice="vc-a", status=task_status)
    result = await service.deletion_check("tenant-a", profile_id)
    assert result.deletable is False
    assert result.blocking_task_count == 1


@pytest.mark.asyncio
@pytest.mark.parametrize("task_status", sorted(HISTORICAL))
async def test_deletion_check_allows_terminal_history(service, task_status) -> None:
    await seed_task(tenant_id="tenant-a", voice="vc-a", status=task_status)
    result = await service.deletion_check("tenant-a", profile_id)
    assert result.deletable is True
    assert result.historical_task_count == 1
```

- [ ] **步骤 2：运行测试确认失败**

```bash
uv run pytest tests/test_ai_call_voice_service.py -q
```

预期：FAIL，删除检查尚不存在。

- [ ] **步骤 3：实现预检查和 DELETE 二次检查**

DELETE 事务必须锁定音色资产，重新统计阻塞任务。存在阻塞时抛 409 并返回
`blockingTaskCount/historicalTaskCount/blockingTaskIds`。允许时新增删除任务
`PENDING`，资产立即改 `DELETING`。

相同删除 Key + 相同 profile 返回原任务；相同 Key + 不同 profile 返回 409。
内置音色没有租户资产 ID，因此不可进入删除接口。

- [ ] **步骤 4：实现 Worker 删除**

Provider 成功后资产 `DELETED`；明确或重试耗尽失败后资产 `DELETE_FAILED`。
`DELETE_FAILED` 允许新 Key 重试，但任何删除态均不回到新任务可选列表。

- [ ] **步骤 5：验证并 Commit**

```bash
uv run pytest tests/test_ai_call_voice_service.py tests/test_ai_call_voice_worker.py -q
uv run ruff check app/api/v1/ai_call/voice \
  app/services/ai_call/voice_enrollment_worker.py \
  tests/test_ai_call_voice_service.py tests/test_ai_call_voice_worker.py
git diff --check
git add app/api/v1/ai_call/voice app/services/ai_call/voice_enrollment_worker.py \
  tests/test_ai_call_voice_service.py tests/test_ai_call_voice_worker.py
git commit -m "feat(ai-call): 增加音色引用检查与异步删除"
```

### 任务 10：强化正式外呼音色解析和快照

**文件：**

- 修改：`app/api/v1/ai_call/outbound/rule_task_model.py`
- 修改：`app/api/v1/ai_call/outbound/rule_task_schema.py`
- 修改：`app/api/v1/ai_call/outbound/rule_task_service.py`
- 修改：`docs/livekit-ai-outbound/sql/phase-h6-voice-enrollment-postgres.sql`
- 修改：`tests/test_ai_call_outbound_rule_task.py`

- [ ] **步骤 1：编写租户与状态失败测试**

```python
@pytest.mark.asyncio
async def test_task_rejects_other_tenant_custom_voice(database) -> None:
    await seed_tenant_voice(
        tenant_id="tenant-b", voice="vc-private", status="ENABLED"
    )
    with pytest.raises(CustomException, match="音色不存在或不可用"):
        await create_task(database, tenant_id="tenant-a", voice="vc-private")


@pytest.mark.asyncio
async def test_task_saves_voice_snapshot(database) -> None:
    await seed_tenant_voice(
        tenant_id="tenant-a", voice="vc-a", status="ENABLED",
        display_name="客服小林", voice_type="自定义复刻"
    )
    task = await create_task(database, tenant_id="tenant-a", voice="vc-a")
    assert task.voice_name == "客服小林"
    assert task.voice_type == "自定义复刻"
    assert task.voice_target_model == "qwen3.5-omni-plus-realtime"
```

- [ ] **步骤 2：运行测试确认失败**

```bash
uv run pytest tests/test_ai_call_outbound_rule_task.py -q
```

预期：至少新增的租户隔离和快照断言 FAIL。

- [ ] **步骤 3：实现统一音色解析器**

新增 `VoiceRepository.resolve_available_voice()`：

1. 先按 `target_model + voice` 查全局内置音色。
2. 再按 `tenant_id + target_model + voice + status=ENABLED` 查租户音色。
3. 返回统一 `ResolvedVoice`，包含 `voice/display_name/voice_type/target_model`。

`_resolve_references` 不再只按裸 `voice` 查询。

- [ ] **步骤 4：保存四项快照**

任务模型和 SQL 增加：

```python
voice_type: Mapped[str] = mapped_column(String(32), nullable=False)
voice_target_model: Mapped[str] = mapped_column(String(64), nullable=False)
```

`config_snapshot_json["voice"]` 同时保存四项。历史任务查询只读任务列/快照，不回查
当前音色资产。

- [ ] **步骤 5：验证并 Commit**

```bash
uv run pytest tests/test_ai_call_outbound_rule_task.py \
  tests/test_ai_call_voice_service.py -q
uv run ruff check app/api/v1/ai_call/outbound/rule_task_model.py \
  app/api/v1/ai_call/outbound/rule_task_schema.py \
  app/api/v1/ai_call/outbound/rule_task_service.py \
  tests/test_ai_call_outbound_rule_task.py
git diff --check
git add app/api/v1/ai_call/outbound/rule_task_model.py \
  app/api/v1/ai_call/outbound/rule_task_schema.py \
  app/api/v1/ai_call/outbound/rule_task_service.py \
  docs/livekit-ai-outbound/sql/phase-h6-voice-enrollment-postgres.sql \
  tests/test_ai_call_outbound_rule_task.py
git commit -m "feat(ai-call): 固化正式任务音色快照"
```

### 任务 11：接入 Worker 生命周期和配置

**文件：**

- 修改：`app/config/setting.py`
- 修改：`app/plugin/init_app.py`
- 修改：`tests/test_ai_call_voice_worker.py`

- [ ] **步骤 1：编写生命周期失败测试**

```python
@pytest.mark.asyncio
async def test_voice_worker_start_is_guarded_by_settings(monkeypatch) -> None:
    monkeypatch.setattr(settings, "SQL_DB_ENABLE", True)
    monkeypatch.setattr(settings, "AI_CALL_VOICE_ENROLLMENT_ENABLED", False)
    assert await _start_ai_call_voice_worker() is None
```

再验证 enabled 时 `start()` 被调用，应用 shutdown 时 `stop()` 被调用一次。

- [ ] **步骤 2：运行测试确认失败**

```bash
uv run pytest tests/test_ai_call_voice_worker.py -q
```

预期：FAIL，启动函数和配置尚不存在。

- [ ] **步骤 3：增加配置**

```python
AI_CALL_VOICE_ENROLLMENT_ENABLED: bool = False
AI_CALL_VOICE_ENROLLMENT_POLL_SECONDS: float = 2.0
AI_CALL_VOICE_ENROLLMENT_BATCH_SIZE: int = 10
AI_CALL_VOICE_ENROLLMENT_LEASE_SECONDS: int = 60
AI_CALL_VOICE_SAMPLE_PREFIX: str = "ai-call/voice-samples"
QWEN_VOICE_ENROLLMENT_ENDPOINT: str = (
    "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/customization"
)
```

API Key 继续复用现有服务端 DashScope 配置，禁止增加前端或请求级 Key。

- [ ] **步骤 4：接入 lifespan**

在所有正常、standalone、异常启动和 finally 路径中对称调用
`_start_ai_call_voice_worker` / `_stop_ai_call_voice_worker`。

- [ ] **步骤 5：验证并 Commit**

```bash
uv run pytest tests/test_ai_call_voice_worker.py -q
uv run ruff check app/config/setting.py app/plugin/init_app.py \
  tests/test_ai_call_voice_worker.py
git diff --check
git add app/config/setting.py app/plugin/init_app.py tests/test_ai_call_voice_worker.py
git commit -m "feat(ai-call): 接入音色任务后台执行器"
```

### 任务 12：后端回归与阶段 A 门禁

**文件：**

- 检查：本计划全部后端文件

- [ ] **步骤 1：运行音色专项测试**

```bash
uv run pytest \
  tests/test_ai_call_voice_models.py \
  tests/test_ai_call_voice_provider.py \
  tests/test_ai_call_voice_sample.py \
  tests/test_ai_call_voice_service.py \
  tests/test_ai_call_voice_api.py \
  tests/test_ai_call_voice_worker.py \
  tests/test_ai_call_voice_preview.py -q
```

预期：全部 PASS。

- [ ] **步骤 2：运行受影响回归**

```bash
uv run pytest \
  tests/test_ai_call_phase_b4_prompt_config.py \
  tests/test_ai_call_outbound_rule_task.py \
  tests/test_ai_call_phase_a_core.py \
  tests/test_minio_util.py -q
```

预期：全部 PASS。

- [ ] **步骤 3：运行静态检查**

```bash
uv run ruff check \
  app/api/v1/ai_call/voice \
  app/api/v1/ai_call/outbound/rule_task_model.py \
  app/api/v1/ai_call/outbound/rule_task_schema.py \
  app/api/v1/ai_call/outbound/rule_task_service.py \
  app/services/ai_call/providers/qwen_voice_enrollment.py \
  app/services/ai_call/voice_sample.py \
  app/services/ai_call/voice_enrollment_worker.py \
  app/utils/minio_util.py \
  app/config/setting.py \
  app/plugin/init_app.py \
  tests/test_ai_call_voice_*.py
git diff --check
```

预期：ruff 输出 `All checks passed!`，diff check 无输出。

- [ ] **步骤 4：审计提交范围**

```bash
git status --short
git log --oneline --max-count=12
```

确认每个音色 commit 只包含计划文件；既有用户改动仍保持原状态。

- [ ] **步骤 5：阶段 A 结论**

只有 Fake Provider、Fake Storage、SQLite/PostgreSQL SQL 契约和自动化测试全部通过，
才能进入前端联调。此阶段不声称真实 Qwen 创建成功，也不拨打电话。
