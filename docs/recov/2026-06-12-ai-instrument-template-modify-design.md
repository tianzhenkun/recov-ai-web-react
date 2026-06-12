# AI 文书模板修改方案

## 1. 目标

在“文书模板维护”页面增加 AI 修改能力。用户基于当前富文本模板输入修改要求，系统调用大模型生成修改后的模板草稿。草稿先展示在弹窗中，用户可继续编辑，确认后再应用到主编辑器。最终是否保存仍由用户点击页面“保存”决定。

本方案关注三部分：

- 前端交互：如何发起 AI 修改、展示加载态、承接草稿。
- Java 后端：如何做业务校验、变量白名单、签章规则和 Python 调用。
- Python 服务：如何组织提示词、调用大模型、返回 HTML 草稿。

## 2. 核心原则

1. Java 是业务可信边界，负责权限、租户、模板规则、变量白名单和结果校验。
2. Python 是 AI 能力服务，负责提示词编排、模型调用和 HTML 草稿生成。
3. 变量清单由 Java 动态传给 Python，不在 Python 提示词里写死。
4. AI 修改接口只返回草稿，不直接保存模板。
5. 用户确认“应用修改”后只替换主编辑器内容，最终落库仍走现有保存接口。
6. V1 使用同步接口，不设计异步任务和进度轮询。

## 3. 前端交互

### 3.1 页面入口

在模板编辑页工具区保留 `AI 修改` 按钮。

展示条件建议：

- 已选中模板；
- 模板详情已加载完成；
- 当前用户具备模板维护权限。

### 3.2 弹窗结构

弹窗标题：`AI 修改模板`

弹窗主体采用上下结构：

- 上方：`修改要求`
- 下方：`修改草稿`

不再单独展示“当前模板”信息，当前模板名称已经体现在页面上下文和默认修改要求中。

### 3.3 操作按钮

底部按钮：

- `取消`：关闭弹窗，不影响主编辑器。
- `开始修改`：首次调用 AI 修改接口。
- `重新修改`：已有草稿后再次调用 AI 修改接口。
- `应用修改`：将弹窗中的草稿 HTML 写入主编辑器，但不保存数据库。

### 3.4 加载态

用户点击 `开始修改` 或 `重新修改` 后：

- 按钮进入 loading，文案可保持按钮 loading 态，不需要额外展示假进度。
- 禁用 `应用修改`。
- 修改要求输入框可临时禁用，避免请求过程中继续编辑导致语义不一致。
- `修改草稿` 区域展示居中的 Spin 或骨架屏。
- 成功后展示富文本草稿编辑器。
- 失败后保留修改要求和原草稿，展示错误提示，允许再次点击 `重新修改`。

不要展示多阶段进度条，除非后端真实提供阶段状态。V1 是同步接口，前端只表达“请求处理中”即可。

### 3.5 前端调用 Java 接口

建议新增前端 service：

```ts
export type InstrumentTemplateAiModifyPayload = {
  requirement: string;
  currentTemplateHtml: string;
};

export type InstrumentTemplateAiModifyResult = {
  templateHtml: string;
  warnings?: string[];
};
```

接口：

```http
POST /system/instrument/type/{id}/template/ai-modify
```

请求示例：

```json
{
  "requirement": "语气更正式，强化法律后果，保留全部变量和签章位",
  "currentTemplateHtml": "<h1>企业催收函</h1><p>...</p>"
}
```

返回示例：

```json
{
  "templateHtml": "<h1>企业催收函</h1><p>...</p>",
  "warnings": []
}
```

## 4. Java 侧方案

### 4.1 新增接口

在文书类型模板控制器中新增接口：

```http
POST /system/instrument/type/{id}/template/ai-modify
```

该接口语义是“生成 AI 修改草稿”，不是“保存模板”。

### 4.2 请求对象

建议新增 BO：

```java
public class InstrumentTypeTemplateAiModifyBo {
    @NotBlank(message = "修改要求不能为空")
    @Size(max = 600, message = "修改要求不能超过600字")
    private String requirement;

    @NotBlank(message = "当前模板内容不能为空")
    private String currentTemplateHtml;
}
```

建议补充 HTML 大小校验，例如限制 100KB 或 200KB，避免超大请求打到 Python 和模型服务。

### 4.3 返回对象

建议新增 VO：

```java
public class InstrumentTypeTemplateAiModifyVo {
    private String templateHtml;
    private List<String> warnings;
}
```

### 4.4 Java 处理流程

1. 根据 `{id}` 查询文书类型。
2. 校验模板存在、属于当前租户、当前用户有维护权限。
3. 校验 `requirement` 和 `currentTemplateHtml`。
4. 根据文书类型读取模板名称、模板编码、分类、状态、是否要求签章位。
5. 查询系统当前允许使用的模板变量。
6. 从 `currentTemplateHtml` 提取已有变量，形成 `existingVariables`。
7. 组装 Python 请求。
8. 调用 Python AI 文书模板修改接口。
9. 解析 Python 返回。
10. 对返回的 `templateHtml` 做后置校验。
11. 返回草稿给前端。

### 4.5 Java 到 Python 的请求

建议请求体：

```json
{
  "templateId": "123",
  "templateCode": "ENTERPRISE_COLLECTION_LETTER",
  "templateName": "企业催收函",
  "requirement": "语气更正式，强化法律后果",
  "currentTemplateHtml": "<h1>企业催收函</h1><p>...</p>",
  "allowedVariables": [
    {
      "code": "debtAmount",
      "name": "债务金额",
      "description": "基础债务金额，单位为元",
      "example": "12800.00"
    }
  ],
  "existingVariables": ["debtAmount", "customerTitle"],
  "requireSealPlaceholder": true,
  "traceId": "..."
}
```

字段说明：

| 字段 | 含义 | 来源 |
| --- | --- | --- |
| `templateId` | 文书类型 ID | 路径参数 |
| `templateCode` | 文书类型编码 | Java 查询文书类型 |
| `templateName` | 文书类型名称 | Java 查询文书类型 |
| `requirement` | 用户修改要求 | 前端输入 |
| `currentTemplateHtml` | 当前编辑器 HTML | 前端传入 |
| `allowedVariables` | 当前允许使用的变量白名单 | Java 变量服务 |
| `existingVariables` | 当前模板已经使用的变量 | Java 从 HTML 提取 |
| `requireSealPlaceholder` | 是否必须保留签章位 | Java 根据业务规则判断 |
| `traceId` | 调用链路追踪 ID | Java 生成 |

### 4.6 Java 后置校验

Python 返回的结果不能直接信任。Java 必须再次校验：

- `templateHtml` 非空。
- HTML 结构符合富文本编辑器要求。
- 不包含脚本、事件属性等危险内容。
- 模板变量格式合法。
- 使用的变量全部存在于 `allowedVariables`。
- 原模板已有变量原则上不能被无故删除。
- 如果 `requireSealPlaceholder = true`，返回 HTML 必须包含签章位。

当前已有模板保存与校验逻辑应尽量复用，例如变量校验、签章位校验、HTML 校验等。

### 4.7 日志

建议记录：

- tenantId；
- userId；
- templateId；
- traceId；
- Python 调用耗时；
- 是否成功；
- 失败原因；
- Python 返回 warnings；
- 输入 HTML 长度、输出 HTML 长度。

不建议默认记录完整 HTML 和完整用户输入，文书模板可能包含敏感内容。必要时记录 hash 或截断摘要。

### 4.8 错误处理

建议错误分类：

| 场景 | Java 返回建议 |
| --- | --- |
| 修改要求为空 | `修改要求不能为空` |
| 当前模板为空 | `当前模板内容不能为空` |
| Python 连接失败 | `AI 修改服务暂时不可用，请稍后重试` |
| Python 超时 | `AI 修改超时，请稍后重试` |
| Python 返回空内容 | `AI 修改结果为空，请重新修改` |
| 返回变量不合法 | `AI 修改结果包含不支持的变量，请重新修改` |
| 签章位缺失 | `AI 修改结果缺少签章位，请重新修改` |

## 5. Python 侧方案

### 5.1 服务边界

Python 侧建议提供独立的文书模板 AI 能力，不要复用 AI 外呼链路。

推荐接口：

```http
POST /instrument-template/modify
```

Python 不负责：

- 用户权限；
- 租户校验；
- 业务数据库读写；
- 模板最终保存；
- 变量白名单的事实来源。

### 5.2 Python 请求对象

Python 接收 Java 传入的结构化请求：

```json
{
  "templateId": "123",
  "templateCode": "ENTERPRISE_COLLECTION_LETTER",
  "templateName": "企业催收函",
  "requirement": "语气更正式，强化法律后果",
  "currentTemplateHtml": "<h1>企业催收函</h1><p>...</p>",
  "allowedVariables": [],
  "existingVariables": [],
  "requireSealPlaceholder": true,
  "traceId": "..."
}
```

### 5.3 提示词规则

Python 固定提示词模板，但变量清单必须从 Java 请求中动态注入。

提示词核心约束：

- 只基于当前 HTML 和修改要求进行修改。
- 只输出修改后的 HTML，不输出解释、Markdown 代码块或额外说明。
- 只能使用 `allowedVariables` 中列出的变量。
- 不得编造变量。
- 不得改变变量占位格式。
- 尽量保留 `existingVariables` 中已有变量。
- 如果要求签章位，必须保留签章位。
- 不要引入脚本、外链或不可控样式。

### 5.4 Python 返回对象

```json
{
  "templateHtml": "<h1>企业催收函</h1><p>...</p>",
  "warnings": []
}
```

Python 可做轻量规整：

- 去掉 Markdown 代码块包裹。
- 去掉模型解释性前后缀。
- 确保返回 JSON 结构稳定。

最终合法性仍由 Java 校验。

## 6. 是否异步

V1 不做异步。

原因：

- 这是单个模板的单次 AI 修改。
- 用户在弹窗内等待草稿即可。
- 前端只需要 loading 态，不需要任务列表、轮询、取消和进度状态。
- 异步会引入任务表、状态机、清理策略和更多异常分支，当前收益不高。

后续满足以下条件再考虑异步：

- 模型调用经常超过 60 秒。
- 一次生成多个候选版本。
- 批量修改多个模板。
- 需要取消、排队、任务进度。
- 需要长期保存 AI 生成历史。

## 7. 临时草稿是否落库

V1 不落业务库。

AI 返回结果属于“用户确认前的临时草稿”，不是最终业务事实。推荐流程：

```text
AI 修改接口返回草稿
-> 前端弹窗展示草稿
-> 用户可继续编辑草稿
-> 用户点击应用修改
-> 替换主编辑器内容
-> 用户点击页面保存
-> 走现有模板保存接口落库
```

如果后续明确需要以下能力，再设计草稿持久化：

- 关闭弹窗后恢复 AI 草稿；
- AI 修改历史；
- 多版本对比；
- 审计用户采纳了哪版 AI 草稿；
- 统计 AI 生成质量；
- 排查模型输出问题。

届时可以新增 AI 修改任务表或草稿表，但不建议 V1 先做。

## 8. 前后端状态流转

```text
未生成
  -> 用户点击开始修改
修改中
  -> 成功：生成草稿
  -> 失败：回到未生成或保留旧草稿
生成草稿
  -> 用户编辑草稿：仍为生成草稿
  -> 用户重新修改：修改中
  -> 用户应用修改：已应用到主编辑器
已应用到主编辑器
  -> 用户保存：模板落库
  -> 用户关闭或离开未保存：按现有未保存提示处理
```

## 9. 重试策略

前端：

- 请求失败后允许用户点击 `重新修改`。
- 不做自动重试，避免重复消耗模型资源。

Java：

- V1 不建议对大模型请求做自动重试。
- 连接失败、超时、5xx 直接返回可重试提示。
- 如果后续要加自动重试，最多 1 次，并且要结合幂等 traceId 和成本控制。

Python：

- 可以对模型供应商的瞬时网络错误做有限重试。
- 重试次数和超时时间通过配置控制。
- 返回错误时保留 traceId，便于 Java 日志串联。

## 10. 推荐落地顺序

1. Python 先提供 mock 接口，固定返回一段合法 HTML。
2. Java 接入 Python mock，完成 BO、VO、Client、Service 和后置校验。
3. 前端替换当前 mock，调用 Java AI 修改接口。
4. 联调变量白名单、签章位、错误提示。
5. Python 接入真实大模型。
6. 增加后端单元测试和接口测试。
7. 根据真实耗时决定是否需要异步化。
