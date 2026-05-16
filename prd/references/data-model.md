# Data Model - 数据模型详细规格

> 主文档引用文件。包含核心实体、枚举、ER 关系、建表说明。

---

## 1. 核心实体

| 实体              | 关键字段                                                                                                                                            | 关联                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| User              | id, username, name, email, password, role, can_create_project, avatar, status, failed_login_attempts, locked_until                                  | —                                       |
| Project           | id, name, description, icon, visibility, created_by                                                                                                 | → Members                               |
| ProjectMember     | id, project_id, user_id, role                                                                                                                       | → Project, User                         |
| BoardColumn       | id, project_id, name, status_mapping, position, is_default, color                                                                                   | → Project                               |
| Task              | id, project_id, column_id, title, description, ai_summary, status, priority, deadline, estimated_hours, actual_hours, position, version, created_by | → Project, BoardColumn, Assignees, Tags |
| TaskAssignee      | id, task_id, user_id                                                                                                                                | → Task, User                            |
| Tag               | id, project_id, name, color                                                                                                                         | → Tasks (many-to-many)                  |
| TaskTag           | id, task_id, tag_id                                                                                                                                 | → Task, Tag                             |
| Attachment        | id, task_id, file_url, file_name, file_type, file_size                                                                                              | → Task                                  |
| Comment（进度）   | id, task_id, user_id, content, mentions                                                                                                             | → Task, User                            |
| TaskStatusHistory | id, task_id, old_status, new_status, changed_by, changed_at                                                                                         | → Task, User                            |
| Notification      | id, user_id, type, title, content, entity_type, entity_id, read, created_at                                                                         | → User                                  |
| OperationLog      | id, operator_id, operation_type, entity_type, entity_id, before_value, after_value, source, created_at                                              | → User                                  |
| AIOperationLog    | id, user_id, prompt, ai_thinking, tool_calls, ai_output, diff_preview, user_action, executed_action, created_at                                     | → User                                  |
| UserSkill         | id, user_id, skill_tag                                                                                                                              | → User                                  |
| TaskMetrics       | id, project_id, tag, avg_estimated_hours, avg_actual_hours, completion_rate, sample_count                                                           | → Project                               |
| ProjectTemplate   | id, name, description, category, is_system, column_config, default_tasks, created_by                                                                | —                                       |
| AutomationRule    | id, project_id, name, trigger_type, trigger_config, conditions, actions, enabled, created_by                                                        | → Project, User                         |
| KnowledgeBase     | id, project_id, name, description, chunk_size, chunk_overlap, top_k, similarity_threshold                                                           | → Project                               |
| Document          | id, knowledge_base_id, file_name, file_url, chunk_count, status                                                                                     | → KnowledgeBase                         |
| DocumentChunk     | id, document_id, content, chunk_index, embedding                                                                                                    | → Document                              |
| AIChatSession     | id, user_id, project_id, title, created_at                                                                                                          | → User, Project                         |
| AIChatMessage     | id, session_id, role, content, tool_calls, references, created_at                                                                                   | → AIChatSession                         |
| UserPreference    | id, user_id, email_notification_enabled, deadline_reminder_enabled, mention_notification_enabled                                                    | → User                                  |

---

## 2. 枚举

### User Role

- `ADMIN` — 系统管理员（全局角色，存储在 `User.role` 字段）
- `USER` — 普通用户

系统管理员与项目级角色（PROJECT_OWNER / PROJECT_MEMBER）是独立的维度。系统管理员自动拥有所有项目的 PROJECT_OWNER 权限，且可访问全局管理 API。

### 项目创建权限

`User.can_create_project`（boolean，默认 false）控制用户是否有权创建项目。系统管理员（`User.role = ADMIN`）无论此字段值如何，始终拥有创建项目权限。此字段由系统管理员通过 `PUT /api/admin/users/{id}/permissions` 设置，标记较高职级的用户可创建项目。

### User Status

- `ACTIVE` — 正常（默认）
- `DISABLED` — 已禁用

`User.status` 字段控制用户账号的启用/禁用状态。禁用后用户无法登录（登录时返回 `403 FORBIDDEN`，`code: ACCOUNT_DISABLED`），已有的 JWT Token 失效（后端每次请求校验 status）。由系统管理员通过 `PUT /api/admin/users/{id}/status` 设置。

### Task Status

- `TODO` — 待办
- `IN_PROGRESS` — 进行中
- `DONE` — 已完成

BoardColumn 通过 `status_mapping` 映射到上述枚举。自定义列也必须映射到三者之一。

### Task Priority

- `LOW` — 低
- `MEDIUM` — 中
- `HIGH` — 高
- `URGENT` — 紧急

### Notification Type

- `DEADLINE_REMINDER` — 截止提醒（24h前）
- `OVERDUE_WARNING` — 逾期警告
- `STATUS_CHANGED` — 状态变更
- `MENTION` — @提及
- `ASSIGNEE_CHANGED` — 成员变更
- `AI_OPERATION` — AI 操作完成
- `HEALTH_WARNING` — 项目健康预警（P2）

### Operation Source

- `MANUAL` — 手动操作
- `AI_ASSISTED` — AI 辅助
- `AUTOMATION` — 自动化规则触发

### Automation Trigger Type

- `TASK_CREATED` — 任务创建时
- `TASK_STATUS_CHANGED` — 任务状态变更时
- `TASK_DEADLINE_APPROACHING` — 截止日期临近时
- `TASK_OVERDUE` — 任务逾期时
- `SCHEDULED` — 定时触发（Cron 表达式）

### Notification Entity Type

- `TASK` — 任务（点击跳转到任务详情）
- `PROJECT` — 项目（点击跳转到项目面板）
- `RULE` — 自动化规则（点击跳转到规则编辑页）
- `COMMENT` — 进度（Comment 实体，点击跳转到任务详情并定位进度）

### Automation Action Type

- `UPDATE_STATUS` — 更新任务状态
- `SET_PRIORITY` — 设置优先级
- `ASSIGN_USER` — 分配负责人
- `SEND_NOTIFICATION` — 发送通知（站内/邮件）
- `ADD_TAGS` — AI 分析并添加标签
- `AI_HEALTH_ANALYSIS` — AI 健康度分析并发送摘要

### Template Category

- `DEVELOPMENT` — 开发
- `MARKETING` — 营销
- `OPERATIONS` — 运维
- `GENERAL` — 通用
- `CUSTOM` — 用户自建

### Automation Condition Field

不同触发器支持不同的条件字段，具体映射关系见 [ai-module.md 8.5 节](./ai-module.md)。

- `priority` — 优先级（枚举：LOW / MEDIUM / HIGH / URGENT）
- `tag` — 标签（动态：项目标签列表）
- `assignee` — 负责人（动态：项目成员列表）
- `description` — 描述含关键词（文本）
- `old_status` — 原状态（枚举：TODO / IN_PROGRESS / DONE）
- `new_status` — 新状态（枚举：TODO / IN_PROGRESS / DONE）
- `overdue_days` — 逾期天数（数字）
- `deadline_hours` — 距截止时间小时数（数字）

---

## 3.5 通用字段约定

所有实体均包含以下通用字段，核心实体表中不再逐一列出：

| 字段         | 类型     | 说明                                       |
| ------------ | -------- | ------------------------------------------ |
| `id`         | UUID     | 主键，雪花算法或 UUID 生成                 |
| `created_at` | datetime | 创建时间，由后端自动填充                   |
| `updated_at` | datetime | 最后更新时间，由后端自动更新（每次写入时） |

**例外：** 以下实体因业务语义不使用 `updated_at`：

- `TaskStatusHistory`、`OperationLog`、`AIOperationLog`、`AIChatMessage` — 只写不改的日志/历史记录，仅有 `created_at`
- `Notification` — 仅 `created_at`，状态变更通过 `read` 布尔字段表示
- `AIChatSession` — 仅 `created_at`，会话元数据不可变

---

## 3. 关键设计说明

### 登录安全

User 表含 `failed_login_attempts`（int，默认 0）和 `locked_until`（datetime，可为 null）。连续登录失败 5 次后 `locked_until` 设为当前时间 +15 分钟，期间拒绝登录请求。

### 密码强度规则

注册和重置密码均需满足以下密码复杂度要求：

- **最小长度：** 8 个字符
- **最大长度：** 128 个字符
- **必须包含：** 至少 1 个大写字母（A-Z）、1 个小写字母（a-z）、1 个数字（0-9）
- **禁止：** 密码不能与用户名或邮箱相同
- **后端校验：** 使用正则 `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$` 校验
- **前端校验：** 注册/重置密码表单实时提示密码强度，不满足要求时禁用提交按钮

### 用户名格式规则

User 表的 `username` 字段需满足以下格式约束：

- **长度：** 3 ~ 20 个字符
- **允许字符：** 字母（a-z, A-Z）、数字（0-9）、下划线（\_）、连字符（-）
- **起始字符：** 必须以字母开头
- **唯一性：** 全局唯一，不区分大小写（存储时转为小写比对）
- **后端校验：** 使用正则 `^[a-zA-Z][a-zA-Z0-9_-]{2,19}$` 校验
- **前端校验：** 输入框实时校验并提示格式要求

### 邮箱验证码

注册和忘记密码均使用邮箱验证码机制。验证码由后端生成（6 位数字），通过邮件发送至用户邮箱，同时存入 Redis（key: `verify:{email}`，TTL 5 分钟）。同一邮箱 60 秒内不可重复发送。验证码校验通过后立即删除 Redis key，防止重复使用。

**注册流程：** 填写用户名 + 邮箱 → 发送验证码 → 填写验证码 + 密码 + 确认密码 → 校验通过后创建用户

**忘记密码流程：** 填写邮箱 → 发送验证码 → 填写验证码 + 新密码 + 确认密码 → 校验通过后更新密码

### 项目级角色鉴权

角色定义在 `ProjectMember` 表中，以 `project_id + user_id` 为联合维度。同一用户在不同项目中可拥有不同角色（如项目 A 的 OWNER 同时是项目 B 的 MEMBER）。所有项目资源的操作鉴权均基于该用户在**当前操作资源所属项目**中的角色。

**鉴权流程：**

1. 请求到达后端，从 JWT 中解析 `current_user_id` 和 `role`
2. 若 `User.role = ADMIN` → 系统管理员直接放行所有项目级操作（等同于所有项目的 PROJECT_OWNER），并跳过后续项目成员校验
3. 若为项目创建请求（`POST /api/projects`）→ 校验 `User.can_create_project = true`，不通过返回 `403 FORBIDDEN`，`code: CANNOT_CREATE_PROJECT`
4. 从请求路径或请求体中获取目标资源（Task / BoardColumn / Tag 等）所属的 `project_id`
5. 查询 `ProjectMember WHERE project_id = ? AND user_id = ?`
6. 若记录不存在 → 403 FORBIDDEN（非项目成员）
7. 若记录存在 → 根据 role 判断是否有权执行该操作

**角色权限矩阵：**

| 操作                             | ADMIN | PROJECT_OWNER                    | PROJECT_MEMBER |
| -------------------------------- | ----- | -------------------------------- | -------------- |
| 查看项目看板和任务               | ✅    | ✅                               | ✅             |
| 创建任务                         | ✅    | ✅                               | ✅             |
| 编辑任务（标题、描述、优先级等） | ✅    | ✅                               | ✅\*           |
| 删除任务                         | ✅    | ✅                               | ❌             |
| 更改任务状态 / 拖拽排序          | ✅    | ✅                               | ✅             |
| 添加/移除任务负责人              | ✅    | ✅                               | ✅\*\*         |
| 邀请项目成员                     | ✅    | ✅                               | ❌             |
| 移除项目成员 / 修改成员角色      | ✅    | ✅                               | ❌             |
| 创建/删除看板列                  | ✅    | ✅                               | ❌             |
| 创建/删除标签                    | ✅    | ✅                               | ✅             |
| 管理自动化规则                   | ✅    | ✅                               | ❌             |
| 管理知识库                       | ✅    | ✅                               | ❌             |
| 上传/删除附件                    | ✅    | ✅                               | ✅             |
| 添加进度                         | ✅    | ✅                               | ✅             |
| AI 操作                          | ✅    | ✅                               | ✅             |
| 删除项目 / 更新项目信息          | ✅    | ✅                               | ❌             |
| 创建项目                         | ✅    | ✅（需 can_create_project=true） | ❌             |
| 全局用户管理                     | ✅    | ❌                               | ❌             |

> \*MEMBER 可编辑自己创建或被指派的任务；OWNER 可编辑项目内所有任务。
>
> \*\*MEMBER 只能给自己创建或自己负责的任务添加/移除负责人；OWNER 可操作项目内所有任务的负责人。

**附加规则：**

- 项目创建者自动成为该项目的 `PROJECT_OWNER`
- 每个项目有且仅有至少一个 `PROJECT_OWNER`（最后一个 OWNER 不能退出或被降级）
- 用户只能对自己所属项目中的资源进行操作
- OWNER 不能移除自己、不能修改自己的角色（需先转让 OWNER 身份）

### 成员邀请（账号）

User 表含 `username`（varchar，唯一，用于系统标识和成员邀请）和 `name`（varchar，显示名称，用于 UI 展示）。两者区别：

- `username`：唯一标识符，用于邀请成员时定位用户、搜索候选。不可与其他用户重复
- `name`：显示名称，用于看板卡片、评论署名、通知、成员列表等所有 UI 展示场景。允许重复

邀请成员接口通过 `username` 定位用户并加入项目成员表。

### 用户偏好

`UserPreference` 表存储用户个人偏好设置，与 User 一对一关联。字段包括 `email_notification_enabled`（是否接收邮件通知）、`deadline_reminder_enabled`（是否接收截止提醒）、`mention_notification_enabled`（是否接收@提及通知）。用户首次登录时自动创建默认偏好记录。

### 乐观锁

Task 表含 `version` 字段。更新时 `WHERE id=? AND version=?`，冲突时返回 409。

### Task 字段长度限制

| 字段        | 长度限制        | 说明                                                |
| ----------- | --------------- | --------------------------------------------------- |
| title       | 1 ~ 100 字符    | 前后端双重校验                                      |
| description | 最大 10000 字符 | Markdown 格式，前后端双重校验                       |
| ai_summary  | 最大 200 字符   | AI 自动生成，超长时截断。Prompt 中指示 LLM 控制长度 |

### status_mapping 机制

BoardColumn 的 `status_mapping` 字段存储 `TODO`/`IN_PROGRESS`/`DONE` 枚举值。UI 上的列名可自定义（如"测试中"），但底层状态固定。确保看板列增删不影响任务状态。

### 项目可见性（visibility）

Project 实体的 `visibility` 字段控制项目的访问范围：

| 可见性 | 值        | 行为                                                                                                                   |
| ------ | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| 私有   | `PRIVATE` | 仅项目成员可查看和操作。`GET /api/projects` 不返回给非成员。项目列表 API 仅返回用户参与的项目                          |
| 公开   | `PUBLIC`  | 所有登录用户可通过 `GET /api/projects/public` 浏览公开项目列表。非成员可查看看板（只读），不可编辑任务、添加进度等操作 |

**公开项目的只读范围：** 非成员可查看看板列和任务列表（标题、优先级、状态、标签、截止日期），但不可查看任务描述详情、评论、附件。非成员执行写操作时返回 `403 NOT_PROJECT_MEMBER`。默认创建项目为私有。

### Tag 项目隔离

Tag 含 `project_id`，标签按项目隔离。不同项目可有同名标签。

### TaskMetrics 统计口径

TaskMetrics 按 `project_id` + `tag` 聚合。由于一个任务可有多个标签（TaskTag 多对多），统计时按每个标签独立计算——即一个带有 `[前端, 支付]` 两个标签的任务，会分别计入"前端"和"支付"两个 tag 行的统计。`sample_count` 为该标签下已完成任务的数量。

**统计时机与更新机制：**

TaskMetrics 采用**事件触发 + 定时补偿**的双重更新机制：

1. **事件触发（实时）：** 任务状态变更为 `DONE` 时，Spring Event 监听器同步触发该任务关联的所有标签对应的 TaskMetrics 行更新（重新聚合计算 `avg_estimated_hours`、`avg_actual_hours`、`completion_rate`、`sample_count`）
2. **定时补偿（每日）：** `@Scheduled(cron = "0 0 3 * * ?")` 凌晨 3 点全量重新计算所有 TaskMetrics 行，修复因并发、异常导致的数据漂移
3. **缓存策略：** TaskMetrics 查询结果通过 Redis 缓存（key: `metrics:{project_id}:{tag}`，TTL 1 小时），事件触发时主动失效对应缓存

### Comment（进度）说明

Comment 实体在业务语义上表示"进度更新"——用户在任务详情中添加的进展记录。数据模型和 API 路径保留 `Comment` 命名（`/api/tasks/{id}/comments`），与通用技术术语保持一致。用户界面和产品文档统一使用"进度"一词。

### Comment mentions 字段

`mentions` 为 JSON 数组类型，存储被 @提及的用户 ID 列表（如 `[1, 5, 12]`）。进度保存时由后端从 content 中解析 `@用户名` 模式提取，避免通知触发时重复解析 Markdown。

### AI 操作日志

AIOperationLog 记录完整交互链路：prompt → thinking → tool_calls → output → diff → user_action → executed。用于审计和回溯。

### AutomationRule 结构

- `trigger_config`：JSON，触发器配置（如 Cron 表达式）
- `conditions`：JSON 数组，条件列表
- `actions`：JSON 数组，动作列表

### DocumentChunk 向量存储

- `content`：分块文本内容
- `chunk_index`：在原文中的序号
- `embedding`：JSON 类型，存储 Embedding API 返回的向量数组。P3 阶段使用 MySQL JSON 列存储，检索时在应用层计算余弦相似度

### KnowledgeBase 分块配置

- `chunk_size`：分块大小（字数），默认 2000
- `chunk_overlap`：相邻块重叠字数，默认 200
- `top_k`：检索返回的最大结果数，默认 5
- `similarity_threshold`：相似度阈值，低于此值的结果不返回，默认 0.5

### AI 对话历史

- `AIChatSession`：AI 对话会话，关联用户和项目。`title` 为会话标题（取首条消息摘要）
- `AIChatMessage`：对话消息，`role` 区分 user / assistant / system。`tool_calls` 存储 AI 调用的工具链（JSON），`references` 存储 RAG 检索来源（JSON）
- 用于命令面板的交互回溯和知识库问答的上下文保持

### Task position 排序字段

Task 表含 `position` 字段（int，默认值按创建顺序递增）。同列内任务按 `position` ASC 排序。拖拽排序时，前端计算目标位置并批量更新受影响任务的 position 值。跨列移动时，position 设为目标列末尾（MAX(position)+1）。

### ProjectTemplate 分类与结构

- `category`：模板分类枚举，取值：`DEVELOPMENT`（开发）、`MARKETING`（营销）、`OPERATIONS`（运维）、`GENERAL`（通用）、`CUSTOM`（用户自建）
- `is_system`：布尔值，标记是否为系统预置模板（系统模板不可删除，用户只能禁用）
- `created_by`：创建者用户 ID，系统模板此字段为 null
- `column_config` JSON 结构定义：

```json
[
  {
    "name": "待办",
    "status_mapping": "TODO",
    "color": "#a39e98",
    "position": 0
  },
  {
    "name": "进行中",
    "status_mapping": "IN_PROGRESS",
    "color": "#0075de",
    "position": 1
  }
]
```

- `default_tasks` JSON 结构定义：

```json
[
  {
    "title": "需求评审",
    "description": "与产品经理确认需求细节",
    "priority": "HIGH",
    "column_position": 0
  }
]
```

`column_position` 对应 `column_config` 中的 `position`，表示任务创建到哪一列。

### 登录锁定机制

- `failed_login_attempts`：累计失败次数，登录成功后重置为 0
- `locked_until`：锁定截止时间（datetime，可为 null）。连续失败达 5 次后设为 `当前时间 + 15 分钟`
- 锁定期间所有登录尝试直接拒绝，不增加失败计数
- 锁定过期后 `failed_login_attempts` 重置为 0，`locked_until` 置 null，允许重新尝试

### Comment mentions 解析规则

- 前端在进度内容中使用 `@username` 格式（如 `@zhangsan 请看一下这个bug`）。选中成员时插入的是 `username`（唯一标识），UI 渲染时替换为 `name`（显示名称）高亮展示
- 后端保存进度时，通过正则 `/@([^\s@]+)/g` 提取所有 username，与 `User.username` 字段匹配（唯一索引），将匹配到的用户 ID 写入 `mentions` 字段
- 前端展示进度时，将 `@username` 渲染为 `@显示名称` 的蓝色高亮链接（点击跳转至用户信息）
- @提及触发 `MENTION` 类型通知，通知内容包含任务标题和进度摘要

### 成员移除级联处理

当 PROJECT_OWNER 从项目中移除一个成员时（`DELETE /api/projects/{id}/members/{userId}`），后端执行以下级联操作：

1. **任务指派（TaskAssignee）：** 自动删除该成员的所有 `TaskAssignee` 记录。如果该成员是某个任务的唯一负责人，任务变为"无负责人"状态（`TaskAssignee` 表无对应记录），看板卡片上不显示负责人头像
2. **进度（Comment）：** 保留该成员创建的所有进度记录（不删除），`user_id` 字段保持不变。前端展示时仍显示该用户的名称和头像
3. **附件（Attachment）：** 保留该成员上传的所有附件（不删除）
4. **通知（Notification）：** 该成员的未读通知保留在数据库中，但由于不再是项目成员，无法通过 API 访问。不主动清理
5. **操作日志（OperationLog）：** 保留该成员的历史操作日志（不删除），用于审计
6. **自动化规则（AutomationRule）：** 如果该成员是某条规则的 `created_by`，规则保留不变，继续正常执行
7. **项目成员记录（ProjectMember）：** 删除 `ProjectMember` 记录

### 项目删除级联处理

当 PROJECT_OWNER 删除项目时（`DELETE /api/projects/{id}`），后端执行以下级联操作：

1. **软删除优先：** `Project` 表增加 `deleted` 字段（布尔值，默认 false）。删除时设置 `deleted = true`，而非物理删除。前端不展示已删除的项目
2. **关联数据保留：** 已删除项目的所有关联数据（任务、看板列、标签、评论、附件、通知、自动化规则、知识库）保留在数据库中不删除，但通过 `project_id` 关联查询时自动过滤 `deleted = true` 的项目
3. **AI 操作日志（AIOperationLog）：** 保留，不受项目删除影响（日志不通过 project_id 关联查询）
4. **操作日志（OperationLog）：** 保留，不受项目删除影响
5. **物理删除策略：** 系统管理员可通过管理 API 永久删除项目及其所有关联数据（级联物理删除），用于数据清理
6. **文件存储：** 软删除时保留文件，物理删除时同步删除对象存储中的文件
