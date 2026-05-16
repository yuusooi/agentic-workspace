# AI Module - 详细规格

> 主文档引用文件。包含 AI 架构、Function Calling 工具层、智能推荐、命令面板、健康度分析、自动化规则、上下文管理、RAG 知识库的完整规格。

---

## 1. AI 整体架构

```
用户交互层
  ├── AI Command Panel（全局命令面板 Ctrl+K）
  ├── Task Detail（任务详情中的 AI 推荐按钮）
  ├── Project Dashboard（项目健康度面板）
  └── Knowledge Base（知识库问答入口，P3）
        │
        ▼
AI Service Layer（后端）
  ├── Prompt Template Engine（模板引擎 + {{变量}}替换）
  ├── Function Calling Tool Registry（工具注册中心）
  ├── AI Context Manager（上下文构建器）
  └── Streaming Response Handler（SSE 流式推送）
        │
        ▼
LLM API（OpenAI / Claude / 通义千问）
```

---

## 2. Function Calling 工具层

### 核心机制：工具注册中心（Tool Registry）

AI 通过注册工具"做事"，而非仅生成文本。具体实现方式：

**后端（Spring Boot）：**

- 维护一个 `ToolRegistry`，每个工具是一个实现统一接口 `AITool` 的 Spring Bean
- 每个 Bean 声明自己的 `name`、`description`、`parameters`（JSON Schema 格式）
- 后端在初始化时自动扫描所有 `AITool` 实现类，注册到工具注册中心
- AI 调用 LLM 时，将所有已注册工具的 schema 序列化为 `tools` 参数传给 LLM API
- LLM 返回 `tool_calls` 后，后端通过反射调用对应 Bean 的 `execute()` 方法

**前端（React）：**

- 前端不需要硬编码工具列表，通过 SSE 事件流中的 `tool_call` 事件获知 AI 调用了哪个工具
- Diff Preview 组件根据 `diff_preview` 事件动态渲染变更对比卡片
- 新增工具只需后端添加 Bean + 数据库适配，前端无需改动

### 2.1 已注册工具

| 工具                     | 功能             | 参数                                                                      |
| ------------------------ | ---------------- | ------------------------------------------------------------------------- |
| `search_tasks`           | 按条件搜索任务   | project_id, status, priority, assignee_id, overdue, keyword               |
| `update_task`            | 更新单个任务     | task_id, project_id, updates{title, description, deadline, priority, ...} |
| `update_task_status`     | 更新单个任务状态 | task_id, project_id, new_status                                           |
| `batch_update_tasks`     | 批量更新任务     | project_id, task_ids[], updates{}                                         |
| `assign_task`            | 分配负责人       | task_id, project_id, assignee_id                                          |
| `set_priority`           | 设置优先级       | task_id, project_id, priority                                             |
| `create_task`            | 创建任务         | project_id, title, description, priority, deadline                        |
| `suggest_tags`           | 推荐标签         | description, project_context                                              |
| `estimate_effort`        | 预估工时         | description, tags, history_context                                        |
| `recommend_assignee`     | 推荐负责人       | task_description, team_skills, workload_map                               |
| `generate_summary`       | 生成摘要         | task_id, project_id, title, description                                   |
| `analyze_project_health` | 分析健康度       | project_id, metrics_range                                                 |

### 2.2 调用流程

```
用户："把所有逾期任务标记为紧急"
  ↓
前端 → POST /api/ai/command（SSE 连接建立）
  ↓
后端 → 组装 Prompt + 注入已注册工具 schema → 调用 LLM API
  ↓
LLM 返回 tool_calls: search_tasks({overdue: true})
  ↓
后端执行 search_tasks → 将结果拼回 Prompt → 再次调用 LLM
  ↓
LLM 返回 tool_calls: batch_update_tasks({priority: "urgent"})
  ↓
后端生成 Diff Preview → SSE 推送 diff_preview 事件
  ↓
前端渲染变更对比卡片 → 用户确认（confirmed/rejected）
  ↓
后端收到确认 → 乐观锁更新数据库 + 写入 AIOperationLog
```

---

## 3. AI 智能推荐

### 3.1 标签推荐

- 触发：创建/编辑任务时自动触发，或手动点击"AI 推荐"
- 输入：标题 + 描述 + 项目历史标签
- 输出：3-5 个标签（含置信度百分比）

```
"支付接口联调" → [支付(95%)] [后端(88%)] [联调(82%)] [第三方对接(70%)]
```

### 3.2 工时预估

- 输入：描述 + 标签 + 历史同类任务平均工时
- 输出：工时范围 + 依据

```
"实现用户注册登录功能，包含表单验证、短信验证码"
→ 预估 8-12 小时（基于历史 5 个类似任务平均值）
```

### 3.3 智能任务分配

- 输入：描述 + 团队成员技能 + 当前工作量
- 输出：推荐负责人 + 理由

```
"前端登录页面开发" →
1. 张三（React 匹配，2 个任务，负载轻）★
2. 李四（React 匹配，5 个任务，负载重）
```

### 3.4 Prompt 模板

```
你是项目管理助手。根据以下任务信息提供智能推荐。

项目上下文：{{project_context}}
任务标题：{{task_title}}
任务描述：{{task_description}}
项目已有标签：{{existing_tags}}
团队成员技能：{{team_skills}}
团队成员当前任务量：{{team_workload}}
历史同类任务数据：{{history_metrics}}

请返回JSON：
{
  "suggested_tags": [{"name": "标签名", "confidence": 0.95}],
  "estimated_hours": {"min": 8, "max": 12, "reason": "..."},
  "suggested_assignee": {"user_id": "xxx", "reason": "..."}
}
```

---

## 4. AI 任务摘要

- 功能：为长描述生成一句话摘要，显示在看板卡片上
- 触发：保存任务时自动生成，可手动"重新生成"

```
原描述："需要对接微信支付和支付宝支付两个渠道，包含下单、支付回调、
退款三个接口。需要处理并发支付、重复支付、超时未支付等异常场景。
预计需要与后端联调，前端需要实现收银台页面和支付结果页。"

AI 摘要："对接微信/支付宝双渠道支付，含下单/回调/退款接口及异常处理"
```

---

## 5. 自然语言命令面板

### 5.1 交互

- 入口：全局 `Ctrl+K` 呼出浮层
- 流程：输入 → AI 解析（SSE 流式展示）→ Function Calling → Diff Preview → 用户确认 → 执行

### 5.2 SSE 事件协议

```
event: thinking
data: {"content": "正在分析您的指令..."}

event: tool_call
data: {"tool": "search_tasks", "params": {"overdue": true}, "result_count": 5}

event: answer
data: {"content": "本周共有 5 个到期任务：\n1. 登录页重构（高优先级，周三到期）\n2. 支付联调（紧急，周四到期）..."}

event: diff_preview
data: {
  "changes": [
    {"task": "登录页重构", "field": "priority", "old": "medium", "new": "urgent"},
    {"task": "支付联调", "field": "priority", "old": "high", "new": "urgent"}
  ]
}

event: confirmation_required
data: {"operation_id": "uuid-xxx", "message": "确认将以上 2 个任务的优先级更新为紧急？"}
```

**完整 SSE 事件类型说明：**

| 事件类型               | 说明                                           | 出现场景               |
| ---------------------- | ---------------------------------------------- | ---------------------- |
| `thinking`             | AI 分析过程（打字机效果）                      | 所有场景               |
| `tool_call`            | AI 调用的工具、参数、结果数量                  | 涉及工具调用的操作场景 |
| `answer`               | AI 的纯文本回复（查询结果、分析结论）          | 纯查询/分析场景        |
| `diff_preview`         | 变更对比（任务名 \| 字段 \| 旧值 → 新值）     | 涉及数据修改的操作场景 |
| `confirmation_required`| 确认/拒绝按钮（含 operation_id）               | 涉及数据修改的操作场景 |
| `error`                | 错误提示                                       | 异常场景               |

**交互流程分支：**

- **纯查询场景**（如"本周到期的任务有哪些"）：`thinking → tool_call → answer` → 连接关闭
- **数据修改场景**（如"把所有逾期任务标记为紧急"）：`thinking → tool_call → diff_preview → confirmation_required` → 连接关闭 → 用户确认 → `POST /api/ai/confirm`

**确认流程（异步架构）：**

SSE 推送 `confirmation_required` 后连接立即关闭（`emitter.complete()`），预览数据以 `operation_id` 为 key 存入 Redis（TTL 30 分钟）。用户点击确认/拒绝时，前端调用 `POST /api/ai/confirm`，后端从 Redis 取出预览数据执行操作。此设计解决了 SSE 连接超时与用户思考时间的冲突。

### 5.3 前端 SSE 实现方案

由于 `/api/ai/command` 是 POST 端点且需要 Bearer Token 鉴权，浏览器原生 `EventSource` 不适用（仅支持 GET，无法设置自定义 Header）。前端使用 `eventsource-parser` 库配合 `fetch + ReadableStream` 手动解析：

```typescript
import { createParser } from "eventsource-parser";

const response = await fetch("/api/ai/command", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ project_id: projectId, command }),
});

const reader = response.body.getReader();
const parser = createParser((event) => {
  if (event.type === "event") {
    const data = JSON.parse(event.data);
    switch (event.event) {
      case "thinking": // 打字机效果渲染
      case "tool_call": // 展示工具调用卡片
      case "answer": // 纯文本回复（查询结果、分析结论）
      case "diff_preview": // 渲染变更对比
      case "confirmation_required": // 显示确认按钮
    }
  }
});

const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  parser.feed(decoder.decode(value));
}
```

### 5.4 支持的指令类型

| 类型         | 示例                                         |
| ------------ | -------------------------------------------- |
| 批量状态变更 | "把所有逾期任务标记为紧急"                   |
| 批量分配     | "把测试阶段的任务都分配给张三"               |
| 条件查询     | "本周到期的任务有哪些"                       |
| 任务创建     | "创建'首页性能优化'任务，优先级高，截止周五" |
| 数据分析     | "这个项目目前的进度怎么样"                   |
| 智能分配     | "把新创建的任务分配给最合适的人"             |

---

## 6. 项目健康度分析

### 6.1 分析维度

| 维度       | 指标                     |
| ---------- | ------------------------ |
| 进度健康   | 已完成/总任务比例        |
| 逾期风险   | 逾期任务数及占比         |
| 负载均衡   | 成员任务分布             |
| 阻塞识别   | 长期停滞在同一状态的任务 |
| 优先级分布 | 各优先级占比             |

### 6.2 报告示例

```
项目：电商平台重构
健康度：72/100（注意）

风险项：
- 3 个任务逾期 > 3 天（支付联调、物流对接、退款流程）
- 张三负载 8 个任务，建议重新分配
- 5 个高优先级待办超过一周

建议：
1. 支付联调提升为紧急
2. 张三 2 个低优先级任务转给李四
3. 高优先级待办尽快启动
```

### 6.3 触发方式与响应模式

- 项目面板点击"AI 健康度分析" → 调用 `POST /api/projects/{id}/health`（SSE 流式返回，与命令面板一致）
- 自动化规则（每周一自动生成，P2）
- 命令面板输入"分析项目健康度" → 走 `/api/ai/command` 通用 SSE 通道

**注意：** 健康度分析涉及 LLM 调用，响应时间较长，因此使用 SSE 流式推送而非同步 GET 返回。

### 6.4 健康度评分算法

健康度评分采用加权评分模型，基础分 100 分，按各维度扣减。最终分数映射到三个等级。

**各维度权重与扣分规则：**

| 维度       | 权重 | 满分 | 扣分规则                                                 |
| ---------- | ---- | ---- | -------------------------------------------------------- |
| 进度健康   | 30%  | 30   | 已完成/总任务比例。每低于 10% 扣 3 分                    |
| 逾期风险   | 30%  | 30   | 逾期任务占比。每 1% 逾期率扣 1 分，扣完为止             |
| 负载均衡   | 20%  | 20   | 成员任务标准差/平均任务数。标准差 > 2 时开始扣分，每增加 1 扣 5 分 |
| 阻塞识别   | 10%  | 10   | 停滞 > 7 天的任务占比。每 1% 扣 1 分，扣完为止          |
| 优先级分布 | 10%  | 10   | 高优先级+紧急待办占比 > 40% 时扣 5 分；无任务记满分     |

**分数与等级映射：**

| 等级 | 分数范围 | 含义           |
| ---- | -------- | -------------- |
| 健康 | 80~100   | 项目运转正常   |
| 注意 | 60~79    | 存在风险需关注 |
| 危险 | 0~59     | 需立即干预     |

**说明：** 以上为基础评分框架。LLM 在此基础上结合上下文生成文字分析报告和具体建议，评分结果中的文字描述由 LLM 生成，不受固定模板限制。

---

## 7. AI 安全原则

### 7.1 Human-in-the-Loop

所有批量操作必须经过用户确认。AI 不直接自动执行危险操作。

### 7.2 安全限制

- AI 操作受当前用户权限约束
- 禁止直接删除项目或任务
- 禁止自动审批
- 禁止跨项目访问
- 单次批量操作上限 50 个任务

### 7.3 操作前重新读取

每次操作前重新读取最新状态，不假设上一步状态仍成立。适用于所有 AI 直接操作场景。

### 7.4 操作审计

记录完整交互链路：Prompt → AI 分析 → Tool Calls → Diff Preview → 用户操作（confirmed/rejected/modified）→ 实际执行。

### 7.5 工具权限校验

每个工具的 `execute()` 方法接收 `userId` 参数，执行前进行以下校验：

1. **项目成员校验：** 查询 `ProjectMember` 表，确认用户是否为项目成员
2. **操作范围校验：** 确认操作目标（任务、标签等）属于用户参与的项目
3. **角色权限校验：** 部分敏感操作（如删除任务）仅限项目负责人

```java
public JsonNode execute(JsonNode params, Long userId) {
    Long projectId = params.get("project_id").asLong();
    ProjectMember member = memberMapper.findByProjectAndUser(projectId, userId);
    if (member == null) {
        throw new ForbiddenException("您不是该项目成员");
    }
    // ... 执行具体逻辑
}
```

### 7.6 降级策略

AI 调用涉及多个外部依赖（LLM API、Embedding API），需要为每个环节设计降级方案：

| 故障环节                   | 降级方案                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| LLM API 调用失败           | SSE 推送 `error` 事件，前端展示错误提示 + 重试按钮。不重试，避免雪崩                      |
| Embedding API 失败         | 文档标记为 `processing_failed` 状态，允许用户重新触发处理                                 |
| RAG 检索失败（知识库问答） | 降级为无知识库的普通对话，SSE 推送提示："知识库检索暂时不可用，已切换为普通对话模式"      |
| 工具执行失败               | 中止当前操作，SSE 推送 `error` 事件，已执行的工具操作不回滚（因为是预览阶段，未真正写入） |
| SSE 连接超时（60s）        | 后端 `SseEmitter` 超时自动关闭，前端检测到连接关闭后展示"操作超时"提示                    |

**关键原则：** 保存用户消息和 AI 回复的写入操作使用异步非阻塞方式（不阻塞主流程），写入失败不影响对话进行。

---

## 8. 自动化规则引擎（P2）

> 设计思路：将通用的工作流编排能力简化为 if-then 规则模式，降低使用门槛。用户通过 UI 下拉选择触发器和动作，无需编写代码即可实现自动化。

**前后端协作实现：**

**后端（Spring Boot）：**

- `AutomationRule` 实体存储 trigger_type + conditions(JSON) + actions(JSON)
- Spring Event 机制：任务创建/状态变更时发布 `TaskEvent`，`AutomationEventListener` 监听并匹配规则
- 条件匹配引擎：解析 conditions JSON，逐条比对任务属性
- 动作执行器：解析 actions JSON，调用对应的 `ActionExecutor`（状态更新、通知发送、优先级变更等）
- Cron 规则使用 `@Scheduled` + 动态任务调度（`TaskScheduler`），支持运行时增删

**前端（React）：**

- 规则编辑器：三个步骤选择器（触发器 → 条件 → 动作），数据驱动渲染
- 规则列表：开关组件调用 `PUT /api/rules/{id}/toggle`
- 触发器/动作选项从后端枚举接口获取，前端不做硬编码

### 8.1 规则结构

```
触发器（Trigger）        条件（Condition，可选）   动作（Action）
─────────────────       ──────────────────       ──────────────────
· 任务创建时             · 优先级 = 高             · 更新任务状态
· 状态变更时             · 标签包含 [bug]          · 设置优先级
· 截止日期临近时         · 负责人 = 张三           · 分配负责人
· 逾期时                · 描述含关键词             · 发送通知
· 定时（Cron）           · 逾期天数 > 3            · AI 分析 + 添加标签
```

### 8.2 触发器枚举

- `TASK_CREATED` — 任务创建时
- `TASK_STATUS_CHANGED` — 状态变更时
- `TASK_DEADLINE_APPROACHING` — 截止日期临近时
- `TASK_OVERDUE` — 逾期时
- `SCHEDULED` — 定时触发（Cron 表达式）

### 8.3 示例规则

```
规则1：高优先级自动通知
  触发：任务创建时 | 条件：优先级 = Urgent | 动作：通知项目负责人

规则2：逾期自动升级
  触发：逾期时 | 条件：逾期 > 3 天 | 动作：优先级→Urgent + 邮件通知负责人

规则3：每周进度报告
  触发：每周一 9:00 | 条件：无 | 动作：AI 健康度分析 + 摘要通知项目负责人
```

### 8.4 UI 交互

- 项目设置页 → "自动化规则"标签页
- 规则列表（启用/禁用开关）
- 规则编辑器（下拉选择触发器、条件、动作）

### 8.5 触发器与条件字段映射

不同触发器支持的条件字段不同，前端规则编辑器应根据所选触发器动态展示可用的条件字段。

| 触发器类型                   | 支持的条件字段                                               |
| ---------------------------- | ------------------------------------------------------------ |
| `TASK_CREATED`               | priority, tag, assignee, description                         |
| `TASK_STATUS_CHANGED`        | priority, tag, assignee, description, old_status, new_status |
| `TASK_DEADLINE_APPROACHING`  | priority, tag, assignee, deadline_hours                      |
| `TASK_OVERDUE`               | priority, tag, assignee, overdue_days                        |
| `SCHEDULED`                  | 无（定时触发不支持条件过滤）                                 |

**条件运算符：**

| 条件字段       | 运算符             | 值类型                     |
| -------------- | ------------------ | -------------------------- |
| priority       | =, !=              | 枚举（LOW/MEDIUM/HIGH/URGENT） |
| tag            | contains           | 标签名称（字符串）         |
| assignee       | =, !=              | 用户 ID                    |
| description    | contains           | 关键词（字符串）           |
| old_status     | =                  | 枚举（TODO/IN_PROGRESS/DONE） |
| new_status     | =                  | 枚举（TODO/IN_PROGRESS/DONE） |
| overdue_days   | >, >=, <, <=, =    | 数字（天数）               |
| deadline_hours | >, >=, <, <=, =    | 数字（小时数）             |

---

## 9. AI 上下文管理

### 9.1 上下文类型

| 类型         | 数据来源                  | 注入场景 |
| ------------ | ------------------------- | -------- |
| 用户技能标签 | 个人资料 + 历史任务标签   | 智能分配 |
| 项目历史标签 | 项目内所有任务标签统计    | 标签推荐 |
| 历史工时统计 | 已完成任务的预估/实际工时 | 工时预估 |
| 团队工作量   | 成员当前未完成任务数      | 负载建议 |
| 高频任务模板 | 常见任务模式分析          | 快速创建 |

### 9.2 数据表

- `user_skill`（用户技能标签）
- `task_metrics`（任务度量统计，按 project_id + tag 聚合）
- `project_template`（项目模板）

### 9.3 注入机制

AI 调用时 Context Manager 自动组装：用户技能→分配时注入，历史标签→标签推荐时注入，工时统计→预估时注入，工作量→负载建议时注入。

---

## 10. RAG 知识库（P3）

> 技术实现方案：文档 → 分块 → 向量化 → 存储 → 相似度检索，完整 RAG 管线。

**具体实现：**

**后端（Spring Boot）：**

1. 文档上传后提取纯文本。分两档格式支持：
   - **基础格式：** TXT、Markdown、JSON、CSV、YAML — 直接读取文本内容，无需额外依赖
   - **扩展格式（需 Apache Tika）：** PDF、DOCX — 通过 Apache Tika 提取纯文本。引入 `tika-core` 依赖即可，Tika 是 Java 生态成熟的文档解析方案
2. 文本分块：使用滑动窗口算法实现。分块参数为知识库级别可配置（默认：chunk_size=2000，chunk_overlap=200，top_k=5，similarity_threshold=0.5），见 `KnowledgeBase` 表的配置字段。每篇文档分块上限可配置（默认 50 个 chunk）
3. 向量化：每个文本块调用 Embedding API。优先使用通义千问 `text-embedding-v3`，备选 OpenAI `text-embedding-3-small`。返回向量维度由所选模型决定
4. 向量存储：P3 阶段使用 MySQL 8 + 应用层检索方案。`DocumentChunk` 表增加 `embedding` 列（JSON 类型存储向量数组）。检索时加载目标知识库全量 chunk，在应用层计算余弦相似度，取 Top-K（K=5）。此方案适合中小规模知识库（万级 chunk 以下），无需引入额外中间件。如后续数据量增长，可迁移至专业向量数据库（如 Milvus）。详见 §10.6 性能评估与迁移策略
5. 检索：用户提问时，先将问题向量化，再通过余弦相似度检索 Top-K 最相关文本块（K=5）
6. 将检索到的文本块作为上下文拼入 Prompt，调用 LLM 生成回答，并在回答中标注来源文档和段落

**前端（React）：**

- 文档上传组件：拖拽上传 + 进度条 + 状态显示（处理中/已完成/失败）
- 问答界面：对话框形式，流式展示回答，底部标注引用来源
- 文档管理：列表展示已上传文档、分块数量、处理状态，支持删除

### 10.1 支持格式

| 格式                           | 支持方式         |
| ------------------------------ | ---------------- |
| TXT、Markdown、JSON、CSV、YAML | 直接读取         |
| PDF（简单文本提取）            | Apache Tika 提取 |
| DOCX                           | Apache Tika 提取 |

不支持：图片 OCR、扫描件、Excel

### 10.2 处理流程

```
文档上传 → 文本提取 → 2000字分块（200字重叠）→ Embedding API → MySQL 存储（JSON向量）
```

### 10.3 问答示例

```
问："上次迭代遗留了哪些 bug？"
答：根据《Sprint 10 回顾会议纪要》，遗留 bug 3 个：
1. 用户头像上传偶发不显示（高）
2. 搜索结果分页异常（中）
3. 暗色模式文字不可见（低）
来源：《Sprint 10 回顾会议纪要》第 3 段
```

### 10.4 检索结果数据结构

RAG 检索接口返回的 JSON 结构：

```json
{
  "results": [
    {
      "chunk_id": "uuid",
      "content": "Sprint 10 回顾会议纪要第三段内容...",
      "document_id": "uuid",
      "document_name": "Sprint 10 回顾会议纪要",
      "chunk_index": 3,
      "similarity": 0.87
    }
  ],
  "query": "上次迭代遗留了哪些 bug？",
  "total_chunks_searched": 128
}
```

- `similarity`：余弦相似度分数（0~1），低于 `similarity_threshold` 的结果不返回
- `document_name`：来源文档名称，前端用于展示引用来源
- `total_chunks_searched`：本次检索扫描的总 chunk 数，用于调试和性能监控

### 10.5 对话历史持久化

AI 命令面板和知识库问答的交互记录需要持久化存储，用于交互回溯和上下文保持。

**存储方案：**

- `AIChatSession`：每次打开命令面板或知识库问答时创建一个新会话，关联 `user_id` + `project_id`
- `AIChatMessage`：按时间顺序存储每条消息，`role` 区分 user / assistant / system
- `tool_calls`（JSON）：记录 AI 调用的工具链（工具名、参数、结果摘要）
- `references`（JSON）：记录 RAG 检索的来源文档 chunk 信息

**前端交互：**

- 命令面板（Ctrl+K）：每次打开为新会话，关闭时保存完整交互链路
- 知识库问答：支持多轮对话，前端通过 `session_id` 维持上下文，后端加载历史消息构建完整 Prompt
- AI 操作日志页面：展示历史会话列表，支持查看每次 AI 交互的详细内容

### 10.6 性能评估与迁移策略

**MySQL JSON 方案性能基准（应用层余弦相似度）：**

| 指标               | 预估值                          | 说明                                         |
| ------------------ | ------------------------------- | -------------------------------------------- |
| 单次检索（1000 chunk）  | < 100ms                    | 加载全量 JSON + 应用层计算，单线程           |
| 单次检索（10000 chunk） | 500ms ~ 1s                 | 接近可接受上限，需关注                       |
| 单次检索（50000 chunk） | 3s ~ 5s                    | 不可接受，需迁移                            |
| 并发检索（10 QPS，1000 chunk） | < 500ms           | 每次检索独立，无锁竞争                       |
| 内存占用（10000 chunk） | ~50MB                     | 向量数组加载到 JVM 堆内存                    |

**并发场景保障措施：**

1. **知识库级别隔离：** 检索时只加载目标知识库的 chunk，而非全局全量。不同知识库的检索互不影响
2. **异步处理：** Embedding 生成和文档分块使用异步线程池（`@Async`），不阻塞检索请求
3. **缓存优化：** 高频知识库的 chunk 数据可缓存到 Redis（key: `chunks:{kb_id}`），避免重复从 MySQL 加载 JSON 解析
4. **检索超时保护：** 应用层检索设置 5 秒超时上限，超时返回部分结果 + 提示"检索超时，请缩小知识库范围"

**迁移至向量数据库的触发条件：**

当满足以下任一条件时，启动从 MySQL JSON 到 Milvus（或其他向量数据库）的迁移：

| 触发条件                     | 阈值                          |
| ---------------------------- | ----------------------------- |
| 单个知识库 chunk 数量        | > 10,000                      |
| 单次检索 P95 延迟            | > 1 秒                        |
| JVM 堆内存中向量数据占用     | > 500MB                       |
| 系统总 chunk 数量            | > 100,000                     |

**迁移策略：**

1. **抽象层设计：** 后端定义 `VectorStore` 接口（`store`、`search`、`delete`），MySQL 方案和 Milvus 方案分别实现。切换时只需更换 Spring Bean 实现，不影响业务代码
2. **数据迁移：** 编写一次性迁移脚本，从 `DocumentChunk.embedding` JSON 列读取向量数据，批量写入 Milvus Collection
3. **双写过渡：** 迁移期间新数据同时写入 MySQL 和 Milvus，验证 Milvus 检索结果与 MySQL 一致后，切换读取至 Milvus
4. **MySQL JSON 列保留：** 迁移完成后不删除 `embedding` 列，作为数据备份和回滚保障

---

## 11. 并发 SSE 连接管理

### 11.1 连接限制

| 维度           | 限制             | 说明                                                      |
| -------------- | ---------------- | --------------------------------------------------------- |
| 单用户并发 SSE | 最多 3 个        | 同一用户同时建立的 `/api/ai/command`、`/api/projects/{id}/health`、`/api/knowledge-bases/{id}/ask` 连接总数上限 |
| 单项目并发 SSE | 最多 10 个       | 同一项目所有用户的 SSE 连接总数上限                        |
| 全局 SSE 连接  | 最多 100 个      | 服务器级别的总 SSE 连接上限                                |

### 11.2 超限处理

- 用户已有 3 个活跃 SSE 连接时，新请求返回 `429 RATE_LIMITED`，`message: "您有正在进行的 AI 操作，请等待完成后再试"`
- 后端使用 Redis 维护连接计数（key: `sse:user:{userId}`，TTL = SseEmitter 超时时间 + 30s），连接建立时 +1，连接关闭/超时时 -1

### 11.3 多标签页场景

- 用户在多个浏览器标签页中同时触发 AI 命令：每个标签页独立建立 SSE 连接，受单用户并发上限约束
- 前端检测到 429 响应时，在命令面板中展示"您有其他 AI 操作正在进行中"的提示，并提供"查看进行中的操作"链接

---

## 12. 自动化规则 AI 动作错误处理

自动化规则中涉及 LLM 调用的动作（`ADD_TAGS`、`AI_HEALTH_ANALYSIS`）需要独立的错误处理策略，与命令面板的降级策略（§7.6）不同——自动化规则没有用户在线确认的交互通道。

### 12.1 错误处理策略

| 错误场景                         | 处理方式                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| LLM API 调用超时或失败           | 静默失败，不重试。记录到 `AIOperationLog`（`user_action: AUTOMATION_FAILED`），发送站内通知给规则创建者（"规则'{rule_name}'执行失败：AI 服务暂时不可用"） |
| LLM 返回结果解析失败（JSON 格式错误） | 静默失败，记录到 `AIOperationLog`，通知规则创建者。不执行任何部分动作，避免数据不一致                              |
| `ADD_TAGS` 推荐的标签不存在       | 自动创建推荐标签（标签项目隔离，`Tag` 表会自动创建），无需人工干预                                                 |
| `AI_HEALTH_ANALYSIS` 生成的摘要过长 | 截断至 500 字符存入通知内容                                                                                       |
| 规则动作执行链中部分失败          | 采用"尽力执行"策略：前序动作成功的不回滚，失败的动作跳过并记录。最终汇总执行结果写入日志                           |

### 12.2 频率保护

- 同一自动化规则的 LLM 调用间隔最少 30 秒，防止规则配置不当导致 LLM API 调用雪崩
- 单个项目每小时 AI 自动化动作总数上限 20 次
- 超限时该规则的后续触发跳过执行，记录到日志

### 12.3 审计与可观测性

- 自动化规则的 AI 动作执行记录写入 `AIOperationLog`，`source` 标记为 `AUTOMATION`
- 规则详情页展示最近 10 次执行记录（成功/失败/跳过），方便排查
- 连续失败 3 次的规则自动禁用，并通知规则创建者
