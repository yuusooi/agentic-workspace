# Agentic Workspace - 产品需求文档 (PRD)

> AI驱动的智能任务协同看板
> 详细规格: [data-model.md](./references/data-model.md) | [ai-module.md](./references/ai-module.md) | [api-design.md](./references/api-design.md)

---

## 1. 项目概述

构建一个看板驱动的任务协作平台，AI深度嵌入任务全生命周期。

**核心:** 项目管理 + 看板 + 任务协作 + AI（工具调用、上下文感知、知识库问答、自动化规则）

**AI 架构设计:** LLM Function Calling（工具注册模式）+ SSE 流式推送 + Prompt 模板引擎 + RAG（文档分块 + 文本向量化 + 向量检索）+ 轻量级规则引擎

### 1.1 解决的问题

- 团队任务混乱，状态不可追踪
- 协作信息分散，沟通成本高
- 重复性手动操作多（手动分配、手动打标签、手动排期）
- 项目风险发现滞后

### 1.2 角色定义

角色按项目维度隔离（`ProjectMember` 表：`project_id + user_id + role`）。同一用户在不同项目中可拥有不同角色。

| 角色       | 权限                                                                            | 作用域 | 说明 |
| ---------- | ------------------------------------------------------------------------------- | ------ | ---- |
| 系统管理员 | 管理用户与组织、所有项目的 OWNER 权限                                           | 全局   | `User.role = ADMIN`，通过「用户管理」入口管理用户、设置项目创建权限 |
| 项目负责人 | 邀请成员、管理成员角色、配置自动化规则、查看项目健康度、删除任务/项目、管理看板列 | 项目级 | 项目创建者自动成为 OWNER |
| 项目成员   | 查看/创建/编辑任务、使用 AI 助手、添加进度、管理标签                            | 项目级 | 仅可操作自己创建或负责的任务的负责人和编辑 |
| 有创建权限的用户 | 创建项目                                                                   | 全局   | `User.can_create_project = true`，由系统管理员标记 |

> 详细权限矩阵见 [data-model.md - 项目级角色鉴权](./references/data-model.md)，前端鉴权设计见 [interaction-spec.md - 前端鉴权体系](./references/interaction-spec.md)

---

## 2. 技术栈

| 层级      | 技术                                                                      |
| --------- | ------------------------------------------------------------------------- |
| 前端框架  | React 18 + TypeScript + Zustand（slice 模式按功能模块拆分）+ Ant Design   |
| 拖拽交互  | dnd-kit（看板卡片拖拽 + 看板列排序）                                      |
| SSE 解析  | eventsource-parser（POST + Bearer Token 场景下替代原生 EventSource）      |
| 后端框架  | Spring Boot 3 + MyBatis Plus                                              |
| 鉴权      | Spring Security + JWT（Access Token 15min + Refresh Token 7天，存 Redis）+ 前端角色/权限联动 |
| 数据库    | MySQL 8                                                                   |
| 缓存      | Redis（会话、缓存、消息队列）                                             |
| 邮件      | Spring Boot Mail（JavaMailSender）+ SMTP（兼容主流邮箱服务商）            |
| AI 大模型 | OpenAI / Claude / 通义千问 API（需支持 Function Calling）                 |
| 流式通信  | SSE（Server-Sent Events）                                                 |
| 文件存储  | MinIO / OSS                                                               |
| 向量存储  | MySQL JSON 列存储向量 + 应用层余弦相似度检索（P3 阶段）                   |
| 规则引擎  | 自研轻量版（P2 阶段）                                                     |

### 2.1 整体架构

```
React 前端                               Spring Boot 后端
  Kanban 看板 (dnd-kit)                    Auth 认证模块
  Task Drawer 任务详情抽屉                 Project 项目模块
  AI Command Panel (Ctrl+K)               Task 任务模块
  Notification 通知中心                    Notification 通知模块
  Automation Rule 规则编辑器 (P2)          AI Service Layer
  Knowledge Base 知识库管理 (P3)             ├─ Tool Registry 工具注册中心
       | REST / SSE                         ├─ Prompt Engine 模板引擎
                                            ├─ Context Manager 上下文管理
                                            └─ SSE Handler 流式推送
                                          Automation Engine 规则引擎 (P2)
                                          RAG Module 知识库模块 (P3)
       |                                      |
  MySQL | Redis | 向量存储-MySQL JSON (P3) | 对象存储
```

---

## 3. 功能模块

### 3.1 用户认证

- 注册：用户名 + 邮箱 + 邮箱验证码 + 密码 + 确认密码
- 登录：邮箱 + 密码
- 忘记密码：邮箱验证码校验 → 设置新密码 + 确认密码
- 自动登录状态恢复
- 安全：BCrypt 密码加密，连续 5 次登录失败锁定 15 分钟，验证码 5 分钟有效期

**密码强度规则（注册、重置密码均适用）：**

| 规则     | 要求                                      |
| -------- | ----------------------------------------- |
| 最小长度 | 8 个字符                                  |
| 最大长度 | 128 个字符                                |
| 必须包含 | 至少 1 个大写字母、1 个小写字母、1 个数字 |
| 可选包含 | 特殊字符（!@#$%^&\* 等）                  |
| 禁止     | 与用户名或邮箱相同                        |

**用户名格式规则：**

| 规则     | 要求                                                     |
| -------- | -------------------------------------------------------- |
| 长度     | 3 ~ 20 个字符                                            |
| 允许字符 | 字母（a-z, A-Z）、数字（0-9）、下划线（\_）、连字符（-） |
| 起始字符 | 必须以字母开头                                           |
| 唯一性   | 全局唯一（不区分大小写）                                 |

### 3.2 项目管理

- 创建项目：名称（必填）、描述、图标、可见性（公开/私有，默认私有）。仅系统管理员或被标记 `can_create_project = true` 的用户可创建
- 邀请成员（通过账号）、移除成员、设置角色（项目负责人/项目成员）
- 成员列表展示：头像、姓名、角色

### 3.3 看板系统

**设计原则:** 后端维护固定状态枚举 `TODO` / `IN_PROGRESS` / `DONE`。看板列只是状态的 UI 映射，通过 `status_mapping` 字段关联。

默认列：待办、进行中、已完成

**自定义列:** 新增、删除（需先迁移该列所有任务）、拖拽排序、自定义列名和颜色。系统默认列不可删除。每个项目最多 10 列。

**任务卡片展示:** 标题、优先级标记（颜色区分）、截止日期（逾期红色高亮）、负责人头像、标签、AI 推荐标记

**卡片交互:** 拖拽切换状态、点击弹出详情抽屉、逾期高亮、每列显示任务计数

### 3.4 任务详情

| 字段     | 类型                         | 说明                                      |
| -------- | ---------------------------- | ----------------------------------------- |
| 标题     | 必填，1~100 字符             | -                                         |
| 描述     | Markdown，最大 10000 字符    | 支持 Markdown 编辑器                      |
| AI 摘要  | 自动生成，最大 200 字符      | AI 自动生成的一句话摘要（只读）           |
| 优先级   | LOW / MEDIUM / HIGH / URGENT | 四级优先级                                |
| 截止日期 | datetime                     | -                                         |
| 状态     | enum                         | TODO / IN_PROGRESS / DONE                 |
| 标签     | 多选                         | 可从 AI 推荐中采纳                        |
| 预估工时 | number（小时）               | 可从 AI 建议中采纳                        |
| 实际工时 | number（小时）               | 任务完成后填写，用于 AI 工时预估统计      |
| 负责人   | 多人                         | 可从 AI 推荐中采纳                        |
| 附件     | 文件列表                     | PNG/JPG/GIF/PDF/TXT/DOCX，单文件最大 20MB |

**进度系统:** 支持 Markdown、@成员提及、自动记录变更日志

**附件存储:** MinIO / OSS

### 3.5 通知系统

| 类型         | 触发场景                |
| ------------ | ----------------------- |
| 截止提醒     | 到期前 24 小时          |
| 逾期警告     | 任务已逾期              |
| 状态变更     | 任务状态更新            |
| @提醒        | 进度提及                |
| 成员变更     | 任务分配/移除           |
| AI 操作完成  | AI 批量操作执行完毕     |
| 项目健康预警 | AI 检测到项目风险（P2） |

**推送方式:** 站内通知（数据库存储 + 前端 30 秒轮询）+ 邮件提醒（Spring Scheduler 每小时扫描）

**前端通知中心:** 顶部铃铛图标显示未读 Badge，支持标记已读、分类筛选、点击跳转到对应任务

---

## 4. AI 模块

> 详细规格: [ai-module.md](./references/ai-module.md)

### 4.1 AI 整体架构

```
用户交互层
  ├── AI Command Panel（全局命令面板 Ctrl+K）
  ├── Task Detail（任务详情中的 AI 推荐按钮）
  ├── Project Dashboard（项目健康度面板）
  └── Knowledge Base（知识库问答入口，P3）
        │
        ▼
AI Service Layer（Spring Boot 后端）
  ├── Prompt Template Engine（模板引擎 + {{变量}}替换）
  ├── Function Calling Tool Registry（工具注册中心）
  ├── AI Context Manager（上下文构建器）
  └── Streaming Response Handler（SSE 流式推送）
        │
        ▼
LLM API（OpenAI / Claude / 通义千问）
```

### 4.2 核心设计模式与前后端协作

#### 4.2.1 Function Calling 工具调用模式

**设计思路:** 让 AI 不仅能"说话"，还能通过注册的后端工具"做事"。后端定义一组 Java 工具类，注册到 AI Service Layer。当用户输入自然语言指令时，AI 通过 LLM 的 Function Calling 能力选择合适的工具并传参执行。

**后端实现方案（Spring Boot）:**

```java
// 1. 定义工具接口
public interface AITool {
    String getName();        // 工具名称，如 "search_tasks"
    String getDescription(); // 工具描述，供 LLM 理解何时调用
    JsonNode getParameters(); // JSON Schema 格式的参数定义
    JsonNode execute(JsonNode params, Long userId); // 实际执行逻辑
}

// 2. 工具注册中心（Spring Bean 自动扫描）
@Service
public class ToolRegistry {
    private final Map<String, AITool> tools; // @Autowired 自动注入所有 AITool 实现

    public List<ToolDefinition> getToolDefinitions() {
        // 转换为 OpenAI Function Calling 所需的 tools JSON 格式
    }

    public JsonNode callTool(String name, JsonNode args, Long userId) {
        AITool tool = tools.get(name);
        // 权限校验 + 参数校验 + 执行
    }
}

// 3. 工具示例：search_tasks
@Component
public class SearchTasksTool implements AITool {
    @Autowired private TaskMapper taskMapper;

    public String getName() { return "search_tasks"; }
    public String getDescription() { return "按条件搜索任务"; }
    // 参数：project_id, status, priority, assignee_id, overdue, keyword
    // 执行：调用 taskMapper 条件查询，返回任务列表 JSON
}
```

**前端实现方案（React）:**

```typescript
// 前端通过 SSE 连接后端 /api/ai/command 端点
// 使用 eventsource-parser 库解析流式响应（支持 POST + Bearer Token）
// npm install eventsource-parser
import { createParser } from "eventsource-parser";

function useAICommand() {
  const sendCommand = async (command: string, projectId: string) => {
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
        // 根据 event.eventName 分发: thinking / tool_call / answer / diff_preview / confirmation_required / error
      }
    });
    // 流式读取并 feed 给 parser
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value));
    }
  };
}
```

**已注册的 12 个 AI 工具:**

| 工具名称                 | 功能             | 后端实现依赖                  |
| ------------------------ | ---------------- | ----------------------------- |
| `search_tasks`           | 按条件搜索任务   | TaskMapper 条件查询           |
| `update_task`            | 更新单个任务     | TaskService.update()          |
| `update_task_status`     | 更新单个任务状态 | TaskService.updateStatus()    |
| `batch_update_tasks`     | 批量更新任务     | TaskService.batchUpdate()     |
| `assign_task`            | 分配任务负责人   | TaskAssigneeService           |
| `set_priority`           | 设置任务优先级   | TaskService.updatePriority()  |
| `create_task`            | 创建新任务       | TaskService.create()          |
| `suggest_tags`           | 根据描述推荐标签 | 调用 LLM + 项目历史标签       |
| `estimate_effort`        | 预估工时         | 调用 LLM + TaskMetrics 统计   |
| `recommend_assignee`     | 推荐负责人       | 调用 LLM + UserSkill + 工作量 |
| `generate_summary`       | 生成任务摘要     | 调用 LLM                      |
| `analyze_project_health` | 分析项目健康度   | 聚合查询 + 调用 LLM           |

#### 4.2.2 SSE 流式交互模式

**设计思路:** AI 响应采用 Server-Sent Events 流式推送，前端实时渲染 AI 的思考过程、工具调用过程、变更预览，让用户感知 AI 正在"工作"而非等待黑盒返回。

**后端实现（Spring Boot SseEmitter）:**

```java
@PostMapping(value = "/api/ai/command", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public SseEmitter command(@RequestBody AICommandRequest req, Principal principal) {
    SseEmitter emitter = new SseEmitter(60_000L); // 60秒超时

    executorService.submit(() -> {
        // 1. 推送 thinking 事件
        emitter.send(SseEmitter.event().name("thinking").data(...));

        // 2. 调用 LLM API，传入 tools 定义
        // 3. LLM 返回 function_call，推送 tool_call 事件
        emitter.send(SseEmitter.event().name("tool_call").data(...));

        // 4. 执行工具，生成变更预览，推送 diff_preview 事件
        emitter.send(SseEmitter.event().name("diff_preview").data(...));

        // 5. 生成 operation_id，将预览数据存入 Redis（TTL 30分钟）
        String operationId = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set("ai:op:" + operationId, previewData, 30, TimeUnit.MINUTES);

        // 6. 推送 confirmation_required 事件（含 operation_id），然后关闭 SSE 连接
        emitter.send(SseEmitter.event().name("confirmation_required").data(
            Map.of("operation_id", operationId, "message", "请确认以上变更")
        ));

        emitter.complete();
    });

    return emitter;
}
```

**前端 SSE 事件协议:**

```
event: thinking       → 展示 AI 分析过程（打字机效果）
event: tool_call      → 展示 AI 调用了哪个工具、参数、结果数量
event: answer         → 展示 AI 纯文本回复（查询结果、分析结论）
event: diff_preview   → 展示变更对比（任务名 | 字段 | 旧值 → 新值）
event: confirmation_required → 显示确认/拒绝按钮
event: error          → 错误提示（AI 调用失败、工具执行异常等）
```

**前端确认后，调用 `POST /api/ai/confirm` 接口真正执行操作。**

#### 4.2.3 Prompt 模板引擎

**设计思路:** 不同 AI 功能使用不同的 Prompt 模板，模板中用 `{{变量}}` 占位。运行时由后端 Context Manager 注入具体数据，发送给 LLM。

**后端实现:**

```java
@Service
public class PromptEngine {
    // 模板存储在数据库或 resources/prompts/ 目录下
    private final Map<String, String> templates; // key=场景, value=模板文本

    public String render(String scene, Map<String, String> variables) {
        String template = templates.get(scene);
        for (Map.Entry<String, String> entry : variables.entrySet()) {
            template = template.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return template;
    }
}
```

**示例（标签推荐场景）:**

```
你是项目管理助手。根据以下任务信息推荐标签。

项目已有标签：{{existing_tags}}
任务标题：{{task_title}}
任务描述：{{task_description}}

请返回JSON：{ "suggested_tags": [{"name": "标签", "confidence": 0.95}] }
```

后端调用时注入：`existing_tags` 从 Tag 表查询，`task_title` 和 `task_description` 从请求参数获取。

> 注：以上为简化示例。实际推荐场景使用综合模板（同时输出标签、工时、负责人推荐），详见 [ai-module.md 3.4 节](./references/ai-module.md)。

#### 4.2.4 上下文管理器

**设计思路:** AI 每次调用时，Context Manager 自动查询并组装相关业务上下文，注入到 Prompt 中，让 AI 的推荐更精准。

**上下文注入规则:**

| AI 场景  | 注入的上下文数据          | 数据来源                         |
| -------- | ------------------------- | -------------------------------- |
| 智能分配 | 用户技能标签 + 当前工作量 | user_skill 表 + 统计未完成任务数 |
| 标签推荐 | 项目历史标签 + 使用频率   | tag 表聚合查询                   |
| 工时预估 | 同类标签的历史平均工时    | task_metrics 表                  |
| 负载建议 | 团队成员当前任务分布      | 统计各成员进行中任务数           |
| 快速创建 | 高频任务模板              | project_template 表              |

### 4.3 核心 AI 功能

| 功能                    | 阶段 | 说明                                                |
| ----------------------- | ---- | --------------------------------------------------- |
| Function Calling 工具层 | P2   | 12 个注册工具，AI 通过工具调用执行任务操作          |
| 智能推荐                | P2   | 自动推荐标签 + 预估工时 + 推荐负责人                |
| 任务摘要                | P2   | 自动为长描述生成一句话摘要                          |
| 自然语言命令面板        | P2   | Ctrl+K 呼出，SSE 流式交互，Diff Preview，确认后执行 |
| 项目健康度分析          | P2   | 进度、逾期风险、负载均衡、阻塞识别、优先级分布      |
| 上下文管理              | P2   | 自动注入用户技能、历史标签、工时统计、团队工作量    |
| 自动化规则引擎          | P2   | 触发器 + 条件 + 动作，可视化编辑器                  |
| RAG 知识库              | P3   | 文档上传、自动分块、向量化、相似度检索、AI 问答     |

### 4.4 AI 安全原则

**Human-in-the-Loop:** 所有批量操作必须经过用户确认。AI 不直接自动执行。

**安全限制:**

- AI 操作受当前用户权限约束（后端 ToolRegistry 校验）
- 禁止直接删除项目或任务
- 禁止自动审批
- 禁止跨项目访问
- 单次批量操作上限 50 个任务
- 每次操作前重新读取最新状态，不假设上一步状态仍成立

**审计日志:** 记录完整交互链路 -- prompt -> AI 分析 -> tool_calls -> diff_preview -> 用户操作（confirmed/rejected/modified）-> 实际执行

---

## 5. 数据模型

> 详细规格: [data-model.md](./references/data-model.md)

### 5.1 核心实体（24 张表）

**业务核心:** User, Project, ProjectMember, BoardColumn, Task, TaskAssignee, Tag, TaskTag, Attachment, Comment, TaskStatusHistory

**通知:** Notification

**审计:** OperationLog, AIOperationLog

**AI 上下文:** UserSkill, TaskMetrics, ProjectTemplate

**AI 对话（P2）:** AIChatSession, AIChatMessage

**自动化规则（P2）:** AutomationRule

**知识库（P3）:** KnowledgeBase, Document, DocumentChunk

**用户偏好:** UserPreference

### 5.2 关键设计点

- **乐观锁:** Task.version，更新时 `WHERE id=? AND version=?`，冲突返回 409
- **status_mapping 机制:** BoardColumn 通过 `status_mapping` 映射到固定枚举，列名可自定义
- **标签项目隔离:** Tag 含 project_id，不同项目标签独立
- **操作来源标记:** OperationLog.source 区分 MANUAL / AI_ASSISTED / AUTOMATION

---

## 6. API 设计

> 详细规格: [api-design.md](./references/api-design.md)

### 6.1 API 分组

| 分组       | 主要端点                                                                                                    | 阶段 |
| ---------- | ----------------------------------------------------------------------------------------------------------- | ---- |
| 认证       | register, login, refresh, logout, send-code, reset-password                                                 | P1   |
| 项目       | CRUD + 成员管理                                                                                             | P1   |
| 公开项目   | 公开项目列表、公开项目看板（只读）                                                                          | P1   |
| 看板       | 获取看板、列 CRUD、列排序                                                                                   | P1   |
| 任务       | CRUD + 状态 + 负责人 + 附件 + 进度 + 标签 + 历史                                                            | P1   |
| 通知       | 列表、未读数量、标记已读、全部已读                                                                          | P1   |
| 标签       | 项目标签列表、创建、删除                                                                                    | P1   |
| 用户设置   | 用户信息、头像上传、偏好设置（邮件通知开关）                                                                | P1   |
| 系统管理   | 用户列表、修改角色、启用/禁用用户、设置权限、全部项目列表                                                    | P1   |
| 用户技能   | 技能标签 CRUD                                                                                               | P2   |
| 项目模板   | 模板 CRUD、从模板创建项目                                                                                   | P2   |
| AI         | command（SSE 流式）、suggest（标签/工时/负责人）、summary、confirm、health、logs、chat-sessions（对话历史） | P2   |
| 自动化规则 | CRUD + 启用/禁用切换                                                                                        | P2   |
| 知识库     | 创建、文档上传/列表/删除、问答（SSE 流式）                                                                  | P3   |

### 6.2 通用约定

- 鉴权：除 register/login/send-code/reset-password 外，所有接口需 `Authorization: Bearer <token>`
- 分页响应：`{ content, totalElements, totalPages, number, size }`
- 错误响应：`{ code, message, timestamp }`
- 错误码：400 INVALID_CODE、400 CODE_EXPIRED、401 UNAUTHORIZED、401 INVALID_CREDENTIALS、403 FORBIDDEN、403 INSUFFICIENT_PROJECT_ROLE、403 NOT_PROJECT_MEMBER、403 CANNOT_CREATE_PROJECT、404 NOT_FOUND、404 EMAIL_NOT_FOUND、409 VERSION_CONFLICT、409 EMAIL_EXISTS、422 VALIDATION_ERROR、423 ACCOUNT_LOCKED、429 RATE_LIMITED、429 CODE_RATE_LIMITED

---

## 7. 分期交付计划

### P1：核心协同

用户认证 + 项目管理 + 看板系统（拖拽） + 任务 CRUD + 进度 + 通知（24h 提醒 + 邮件）

### P2：AI 增强

Function Calling 工具层 + 智能推荐（标签/工时/负责人） + 任务摘要 + 自然语言命令面板（Ctrl+K + SSE） + 项目健康度分析 + 上下文管理 + 自动化规则引擎

### P3：知识库

RAG 知识库（文档上传、自动分块、向量化存储） + 知识库问答 + 历史经验总结与检索

---

## 8. 非功能要求

| 项目        | 要求                                                     |
| ----------- | -------------------------------------------------------- |
| 权限        | RBAC（系统管理员 / 有创建权限用户 / 项目负责人 / 项目成员）+ 前端按钮级鉴权        |
| 安全        | JWT + BCrypt + 登录失败锁定                              |
| 并发        | 乐观锁（Task.version）                                   |
| 审计        | 全链路操作日志 + AI 操作日志（含 Function Calling 链路） |
| 响应时间    | 普通接口 < 500ms；AI 同步接口（suggest/summary）< 15s                    |
| 文件上传    | 最大 20MB                                                |
| AI 请求超时 | SSE 连接超时 60s；用户确认操作无硬性超时（异步架构）     |
| SSE 流式    | AI 响应首 Token 延迟 < 2s                                |
| 数据备份    | 数据库每日自动备份                                       |
| 浏览器兼容  | Chrome / Edge / Firefox 最新两个版本                     |

---

## 9. MVP 原则

构建：**AI 原生的项目协作工具**

不构建：OA 系统 | 企业中台 | BPM 平台 | 通用 Agent 平台 | AI 工作流编排平台

优先级：任务协作闭环（P1 必须完整可用） > 数据一致性 > AI 操作安全性 > 可维护性 > 渐进式 AI 增强

---

## 10. 交付物要求

### 10.1 产品交付物

| 交付物       | 说明                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| PRD 需求文档 | 本文档，包含完整功能需求、技术架构、数据模型、API 设计                  |
| 需求原型     | 页面交互原型（看板、任务详情、AI 命令面板、自动化规则编辑器等核心页面） |

### 10.2 开发交付物

| 交付物             | 说明                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| 可运行源码（前端） | React 18 前端工程，含 README（启动教程、项目结构说明）               |
| 可运行源码（后端） | Spring Boot 3 后端工程，含 README（启动教程、项目结构说明）          |
| 数据库脚本         | 建表 SQL（含初始化数据、索引、注释）                                 |
| 设计文档           | 需求分析、数据库表结构说明、ER 图、API 设计文档                      |
| Spec 文档          | proposal.md（项目提案）、design.md（设计决策）、tasks.md（任务分解） |

### 10.3 测试交付物

| 交付物         | 说明                                    |
| -------------- | --------------------------------------- |
| 测试用例       | 覆盖全部功能模块的测试用例文档          |
| 接口自动化脚本 | 后端 API 自动化测试脚本（覆盖核心接口） |
| UI 自动化脚本  | 前端关键流程的 UI 自动化测试脚本        |
| 测试报告       | 测试执行结果报告（含覆盖率、缺陷统计）  |

### 10.4 其他交付物

| 交付物      | 说明                                                                                    |
| ----------- | --------------------------------------------------------------------------------------- |
| AI 辅助日志 | 记录在哪些环节使用了 AI，包括：提示词、项目规则、Skills、MCP 工具、智能体配置等说明文档 |
