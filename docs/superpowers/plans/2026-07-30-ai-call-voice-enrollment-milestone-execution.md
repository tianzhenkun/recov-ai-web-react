# AI Call 自定义音色里程碑执行计划

> **面向 AI 代理的工作者：** 必需子技能：使用
> superpowers:subagent-driven-development 的风险分级变体执行。高风险任务逐任务双审，
> 中低风险任务在里程碑末统一双审。步骤使用复选框跟踪进度。

**目标：** 在保持 TDD、独立审查、全量回归和真实验收的前提下，将剩余工作重组为
7 个里程碑，减少小任务之间重复的审查等待。

**架构：** 后端继续以租户资产、异步任务、Provider、私有存储和 Worker 为边界；
前端以领域类型、API 客户端、管理页和正式任务接入为边界。高风险外部副作用维持
逐任务双审，纯类型、页面和配置工作批量实现后统一审查。

**技术栈：** FastAPI、SQLAlchemy Async、PostgreSQL/SQLite、httpx、MinIO SigV4、
Qwen Voice Enrollment、React、TypeScript、Ant Design Pro、Jest、Biome。

---

## 0. 权威规格与工作区

- 产品与技术规格：
  `docs/superpowers/specs/2026-07-29-ai-call-voice-enrollment-design.md`
- 执行策略：
  `docs/superpowers/specs/2026-07-30-ai-call-voice-enrollment-execution-strategy-design.md`
- 后端详细 TDD 步骤：
  `docs/superpowers/plans/2026-07-29-ai-call-voice-enrollment-backend.md`
- 前端详细 TDD 步骤：
  `docs/superpowers/plans/2026-07-29-ai-call-voice-enrollment-frontend.md`
- 真实验收步骤：
  `docs/superpowers/plans/2026-07-29-ai-call-voice-enrollment-acceptance.md`
- 后端工作区：
  `/Users/liuhongli/.codex/worktrees/ed81/ai-call`
- 前端工作区：
  `/Users/liuhongli/.codex/worktrees/a3cd/recov-ai-web-react`

执行者必须从对应详细计划提取完整任务内容放入提示词，不让子代理自行猜测或只读取
任务标题。

## M1：完成受理事务

**基线：**

- 后端实现提交：`285afce006be9ee773ef99c89800e3fe5f3456b5`
- 已完成规格复审，待最终代码质量复审。

- [ ] **步骤 1：独立质量复审**

审查 `de66f76f114c5abb38a54bee4bfca62d376a976b..285afce006be9ee773ef99c89800e3fe5f3456b5`，
重点验证预生成 object key、精确 PUT、短 CAS、flush/commit 分流、commit 对账、
cleanup 冲突分类和异常链脱敏。

- [ ] **步骤 2：修复并复审阻塞问题**

如果审查出现 Critical 或 Important，由任务 5 原实现者补失败测试、追加修复提交，
原质量审查者复审直至通过。不得用实现者自评替代复审。

- [ ] **步骤 3：主代理新鲜验证**

```bash
uv run pytest \
  tests/test_ai_call_voice_models.py \
  tests/test_ai_call_voice_provider.py \
  tests/test_ai_call_voice_sample.py \
  tests/test_minio_util.py \
  tests/test_ai_call_voice_service.py -q
uv run ruff check --no-fix \
  app/api/v1/ai_call/voice \
  app/services/ai_call/providers/qwen_voice_enrollment.py \
  app/services/ai_call/voice_sample.py \
  app/utils/minio_util.py \
  tests/test_ai_call_voice_models.py \
  tests/test_ai_call_voice_provider.py \
  tests/test_ai_call_voice_sample.py \
  tests/test_minio_util.py \
  tests/test_ai_call_voice_service.py
git diff --check de66f76f114c5abb38a54bee4bfca62d376a976b..HEAD
```

预期：全部通过；用户原有 MinIO 改动仍未进入提交。

## M2：创建 Worker 与清理状态机

**实现范围：** 后端详细计划任务 6。

- [ ] **步骤 1：实现任务 6 的失败测试**

覆盖 `PENDING/RETRY_WAIT/PROCESSING/RECONCILING` claim、租约过期、固定退避、
Provider 明确失败/可重试失败/结果未知、`voice_list` 对账、终态样本清理和
`ai_call_voice_sample_cleanup` 引用检查。

运行：

```bash
uv run pytest tests/test_ai_call_voice_worker.py -q
```

预期：Worker 模块不存在或新行为未实现而失败。

- [ ] **步骤 2：实现 Worker 并提交**

严格按后端详细计划任务 6 的签名和状态机实现；孤儿清理删除前必须查询
`AiCallVoiceEnrollmentModel.sample_object_key` 是否仍有引用。

```bash
uv run pytest tests/test_ai_call_voice_worker.py -q
uv run ruff check --no-fix \
  app/services/ai_call/voice_enrollment_worker.py \
  tests/test_ai_call_voice_worker.py
git diff --check
git add app/services/ai_call/voice_enrollment_worker.py \
  tests/test_ai_call_voice_worker.py
git commit -m "feat(ai-call): 执行音色创建与对账任务"
```

- [ ] **步骤 3：逐任务规格审查和质量审查**

该任务涉及租约、并发、Provider 副作用和删除，规格与质量必须分别独立审查；
Critical/Important 修复后由原审查者复审。

- [ ] **步骤 4：里程碑回归**

运行 M1 命令并追加 `tests/test_ai_call_voice_worker.py`。

## M3：后端管理 API

**实现范围：** 后端详细计划任务 7～9。

- [ ] **步骤 1：批量实现任务 7 租户鉴权 API**

按任务 7 完整步骤先写 `tests/test_ai_call_voice_api.py` 失败测试，再实现 Router、
权限声明、multipart 解析和 camelCase 查询。

```bash
uv run pytest \
  tests/test_ai_call_voice_api.py \
  tests/test_auth_context.py \
  tests/test_ai_call_phase_b4_prompt_config.py -q
```

- [ ] **步骤 2：实现并独立审查任务 8 Realtime 试听**

按任务 8 先验证只能解析当前租户 `ENABLED` 音色，试听 session 使用真实
Qwen Realtime voice 且不复用正式通话业务记录。

```bash
uv run pytest \
  tests/test_ai_call_voice_preview.py \
  tests/test_ai_call_phase_a_core.py -q
```

任务 8 属于高风险外部资源操作，单独规格和质量审查。

- [ ] **步骤 3：实现并独立审查任务 9 删除**

删除提交前重新查询正式任务引用；存在引用返回 409，无引用才进入 `DELETING`；
Provider 删除失败进入 `DELETE_FAILED`，重试使用新 Key。

```bash
uv run pytest \
  tests/test_ai_call_voice_service.py \
  tests/test_ai_call_voice_worker.py -q
```

任务 9 属于高风险删除操作，单独规格和质量审查。

- [ ] **步骤 4：里程碑合并审查与回归**

统一检查任务 7～9 API 字段、权限、跨租户 404/403、试听资源释放和删除状态机。

```bash
uv run pytest \
  tests/test_ai_call_voice_api.py \
  tests/test_ai_call_voice_preview.py \
  tests/test_ai_call_voice_service.py \
  tests/test_ai_call_voice_worker.py \
  tests/test_auth_context.py \
  tests/test_ai_call_phase_a_core.py \
  tests/test_ai_call_phase_b4_prompt_config.py -q
```

## M4：正式外呼集成和后端门禁

**实现范围：** 后端详细计划任务 10～12。

- [ ] **步骤 1：实现并独立审查任务 10**

正式任务解析必须区分全局内置与当前租户 `ENABLED` 自定义音色，并把
`scope/voice/profileId/targetModel` 固化到任务快照。

```bash
uv run pytest \
  tests/test_ai_call_outbound_rule_task.py \
  tests/test_ai_call_outbound_task_executor.py -q
```

- [ ] **步骤 2：实现并独立审查任务 11**

设置 Qwen endpoint/key/model、Worker 批大小和轮询间隔；应用启动创建后台任务，
关闭时停止并等待，不允许重复启动。

```bash
uv run pytest tests/test_ai_call_voice_worker.py -q
```

- [ ] **步骤 3：执行任务 12 后端总回归**

使用后端详细计划任务 12 的完整 pytest 与 Ruff 文件清单，并额外执行：

```bash
uv run ruff check --no-fix app tests
git diff --check
```

预期：阶段 A 自动化门禁全部通过；不把 Fake Provider 结果写成真实 Qwen 已验收。

## M5：前端基础闭环

**实现范围：** 前端详细计划任务 1～5。

- [ ] **步骤 1：批量 TDD 实现领域层、客户端和菜单**

按任务 1～3 顺序运行各自 RED，再实现领域类型、文件预检、API 客户端、
`/ai-call/voices` 路由及权限菜单。

- [ ] **步骤 2：批量 TDD 实现弹窗和统一列表**

按任务 4～5 实现同步提交锁、loading/disabled、新操作生成 Key、同次网络重试复用
Key、创建成功关闭弹窗、活动状态轮询和页面隐藏暂停。

- [ ] **步骤 3：一次合并规格审查和质量审查**

统一审查任务 1～5，不为每个纯前端小任务分别创建两名审查者。必须检查 multipart
不手写 `Content-Type`、bigint ID 字符串和状态动作映射。

- [ ] **步骤 4：里程碑回归**

```bash
npx jest \
  src/pages/aiCallVoices/domain.test.ts \
  src/services/ruoyi/ai-call-voices.test.ts \
  config/routes.test.ts \
  src/adapters/ruoyi/menu.test.tsx \
  src/pages/aiCallVoices/VoiceEnrollmentModal.test.tsx \
  src/pages/aiCallVoices/index.test.tsx \
  --runInBand
npm run tsc
npx biome check \
  src/services/ruoyi/ai-call-voices.types.ts \
  src/services/ruoyi/ai-call-voices.ts \
  src/pages/aiCallVoices \
  config/routes.ts config/routes.test.ts \
  src/adapters/ruoyi/menu.tsx src/adapters/ruoyi/menu.test.tsx
```

## M6：前端外部操作闭环

**实现范围：** 前端详细计划任务 6～9。

- [ ] **步骤 1：实现任务 6 浏览器试听**

覆盖 token/session、音频输出、重复点击、停止和资源释放。

- [ ] **步骤 2：实现任务 7 删除**

预检查只用于展示；最终删除仍由后端原子复检。阻塞引用展示任务数量与名称，
危险确认说明影响范围和不可恢复性。

- [ ] **步骤 3：实现任务 8 正式任务接入**

正式任务创建页只请求 `availableOnly=true`，提交稳定的 voice/profile 标识，
不得选择 `CREATING/FAILED/DELETING/DELETED`。

- [ ] **步骤 4：任务 6～8 合并双审和任务 9 总回归**

执行前端详细计划任务 9 的 Jest、TypeScript、Biome、Ant Design lint 和 build
命令。浏览器交互使用真实 DOM/hit-test 验证，不只依赖截图。

## M7：真实联调验收

**实现范围：** 验收详细计划任务 1～6。

- [ ] **步骤 1：真实 Qwen 创建与发布**

保存脱敏请求 ID、voice、Provider list 结果、本地任务状态和清理证据。

- [ ] **步骤 2：真实浏览器 Realtime 试听**

确认 WebSocket session 使用新 voice 并产生可听音频；仅创建 token 或连接成功不算。

- [ ] **步骤 3：正式任务快照和删除门禁**

验证新任务快照、历史任务引用阻塞、无引用异步删除和重复 Key 行为。

- [ ] **步骤 4：真实失败与清理证据**

验证 4xx、429/5xx、结果未知对账、临时样本和孤儿清理。

- [ ] **步骤 5：SIP 独立门禁**

最后确认拨打后，核对事件链、RTP、非零混音/客户/AI 分轨和实际可播放录音；
health、浏览器试听或代码存在均不能代替 SIP 验收。

- [ ] **步骤 6：完成报告**

在 `docs/livekit-ai-outbound/reports/2026-07-29-voice-enrollment-acceptance.md`
区分“自动化通过”“真实 Qwen 通过”“浏览器通过”“SIP 通过”和未完成风险。

## 进度更新规则

每完成一个原任务，更新 `已完成任务数/27`；每完成一个里程碑，更新
`已完成里程碑数/7`。工作超过 60 秒时提供一次简短状态更新，说明正在执行的门禁、
最近证据和是否存在阻塞。
