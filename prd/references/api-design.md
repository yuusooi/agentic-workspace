# API Design - 接口设计详细规格

> 主文档引用文件。包含全部 REST API 端点、请求/响应说明。

---

## 1. 认证 API

| 方法 | 路径                     | 说明                                  |
| ---- | ------------------------ | ------------------------------------- |
| POST | /api/auth/register       | 用户注册                              |
| POST | /api/auth/login          | 用户登录，返回 Access + Refresh Token |
| POST | /api/auth/refresh        | 刷新 Access Token                     |
| POST | /api/auth/logout         | 退出登录，清除 Refresh Token          |
| POST | /api/auth/send-code      | 发送邮箱验证码（注册 / 忘记密码）     |
| POST | /api/auth/reset-password | 忘记密码 — 验证码校验 + 重置密码      |

### 请求/响应示例

```
POST /api/auth/register
Request:  { "username": "zhangsan", "email": "...", "code": "123456", "password": "..." }
Response: { "accessToken": "...", "refreshToken": "...", "user": {
  "id": "uuid",
  "username": "zhangsan",
  "name": "张三",
  "email": "zhangsan@example.com",
  "role": "USER",
  "can_create_project": false,
  "avatar": "https://..."
} }

POST /api/auth/login
Request:  { "email": "...", "password": "..." }
Response: { "accessToken": "...", "refreshToken": "...", "user": {
  "id": "uuid",
  "username": "zhangsan",
  "name": "张三",
  "email": "zhangsan@example.com",
  "role": "USER",
  "can_create_project": false,
  "avatar": "https://..."
} }

POST /api/auth/refresh
Request:  { "refreshToken": "..." }
Response: { "accessToken": "..." }

POST /api/auth/send-code
Request:  { "email": "user@example.com", "purpose": "register" | "reset_password" }
Response: { "message": "验证码已发送" }

POST /api/auth/reset-password
Request:  { "email": "user@example.com", "code": "123456", "new_password": "..." }
Response: { "message": "密码重置成功" }
```

### 验证码错误响应

| 场景                     | HTTP | code              | 说明                         |
| ------------------------ | ---- | ----------------- | ---------------------------- |
| 验证码错误               | 400  | INVALID_CODE      | 验证码不正确                 |
| 验证码已过期             | 400  | CODE_EXPIRED      | 验证码超过 5 分钟已失效      |
| 发送频率过高             | 429  | CODE_RATE_LIMITED | 同一邮箱 60 秒内不可重复发送 |
| 邮箱未注册（重置密码时） | 404  | EMAIL_NOT_FOUND   | 该邮箱未注册                 |
| 邮箱已注册（注册时）     | 409  | EMAIL_EXISTS      | 该邮箱已被注册               |

### 登录错误响应

| 场景           | HTTP | code                | 说明                                                                         |
| -------------- | ---- | ------------------- | ---------------------------------------------------------------------------- |
| 邮箱或密码错误 | 401  | INVALID_CREDENTIALS | `failed_login_attempts` 递增。响应包含 `remaining_attempts` 字段             |
| 账户已锁定     | 423  | ACCOUNT_LOCKED      | `locked_until` 有效期间。响应包含 `locked_until` 和 `remaining_seconds` 字段 |

```
POST /api/auth/login（密码错误）
Response: {
  "code": "INVALID_CREDENTIALS",
  "message": "邮箱或密码错误",
  "remaining_attempts": 3,
  "timestamp": "2026-05-14T10:00:00Z"
}

POST /api/auth/login（账户锁定）
Response: {
  "code": "ACCOUNT_LOCKED",
  "message": "账户已锁定，请稍后重试",
  "locked_until": "2026-05-14T10:15:00Z",
  "remaining_seconds": 840,
  "timestamp": "2026-05-14T10:01:00Z"
}
```

---

## 2. 项目 API

| 方法   | 路径                                     | 说明                       | 权限                             |
| ------ | ---------------------------------------- | -------------------------- | -------------------------------- |
| GET    | /api/projects                            | 项目列表（当前用户参与的） | 登录用户                         |
| GET    | /api/projects/public                     | 公开项目列表（浏览）       | 登录用户                         |
| POST   | /api/projects                            | 创建项目                   | ADMIN 或 can_create_project=true |
| GET    | /api/projects/{id}                       | 项目详情                   | 项目成员                         |
| PUT    | /api/projects/{id}                       | 更新项目                   | PROJECT_OWNER                    |
| DELETE | /api/projects/{id}                       | 删除项目                   | PROJECT_OWNER                    |
| POST   | /api/projects/{id}/members               | 邀请成员（账号）           | PROJECT_OWNER                    |
| GET    | /api/projects/{id}/members               | 项目成员列表               | 项目成员                         |
| DELETE | /api/projects/{id}/members/{userId}      | 移除成员                   | PROJECT_OWNER                    |
| PUT    | /api/projects/{id}/members/{userId}/role | 设置角色                   | PROJECT_OWNER                    |
| GET    | /api/projects/{id}/members/search        | 搜索成员（@提及候选）      | 项目成员                         |

### 成员相关请求/响应示例

```
POST /api/projects/{id}/members
Request:  { "username": "newuser" }
Response: { "id": "uuid", "user_id": "uuid", "role": "PROJECT_MEMBER", "user": {...} }

GET /api/projects/{id}/members
Response: [
  { "id": "uuid", "user_id": "uuid", "role": "PROJECT_OWNER", "user": {...} },
  { "id": "uuid", "user_id": "uuid", "role": "PROJECT_MEMBER", "user": {...} }
]

PUT /api/projects/{id}/members/{userId}/role
Request:  { "role": "PROJECT_MEMBER" }
Response: { "id": "uuid", "user_id": "uuid", "role": "PROJECT_MEMBER" }

GET /api/projects/{id}/members/search?q=张
Response: [
  { "id": "uuid", "username": "zhangsan", "name": "张三", "email": "zhangsan@example.com", "avatar": "..." }
]
```

### 项目详情响应（含当前用户角色）

```
GET /api/projects/{id}
Response: {
  "id": "uuid",
  "name": "电商平台重构",
  "description": "...",
  "icon": "...",
  "visibility": "PRIVATE",
  "created_by": "uuid",
  "created_at": "2026-05-01T10:00:00Z",
  "my_role": "PROJECT_OWNER",
  "owner": { "id": "uuid", "name": "张三", "avatar": "..." }
}
```

`my_role` 字段说明：返回当前请求用户在该项目中的角色（`PROJECT_OWNER` 或 `PROJECT_MEMBER`）。系统管理员（`User.role = ADMIN`）始终返回 `PROJECT_OWNER`。前端据此进行按钮/菜单级鉴权。

### 看板响应（含当前用户角色）

```
GET /api/projects/{id}/board
Response: {
  "my_role": "PROJECT_OWNER",
  "columns": [
    {
      "id": "uuid",
      "name": "待办",
      "status_mapping": "TODO",
      "color": "#a39e98",
      "position": 0,
      "is_default": true,
      "tasks": [...]
    }
  ]
}
```

`my_role` 与项目详情接口一致。前端在看板页面直接使用此字段，无需额外请求。

**权限说明：** 移除成员和修改角色操作仅限 `PROJECT_OWNER`。不能移除自己，不能修改自己的角色。

---

## 3. 看板 API

| 方法   | 路径                            | 说明                           | 权限                                   |
| ------ | ------------------------------- | ------------------------------ | -------------------------------------- |
| GET    | /api/projects/{id}/board        | 获取看板（含所有列和任务）     | 项目成员（公开项目可被非成员只读访问） |
| POST   | /api/projects/{id}/columns      | 新增列（每项目上限 10 列）     | PROJECT_OWNER                          |
| PUT    | /api/columns/{id}               | 更新列（名称、颜色、状态映射） | PROJECT_OWNER                          |
| DELETE | /api/columns/{id}               | 删除列（需指定目标列迁移任务） | PROJECT_OWNER                          |
| PUT    | /api/columns/reorder            | 列排序                         | PROJECT_OWNER                          |
| PUT    | /api/columns/{id}/tasks/reorder | 同列内任务排序                 | 项目成员                               |

### 任务排序请求体

```
PUT /api/columns/{id}/tasks/reorder
Request:  { "task_orders": [
  { "task_id": "uuid-1", "position": 0 },
  { "task_id": "uuid-2", "position": 1 },
  { "task_id": "uuid-3", "position": 2 }
]}
Response: 200 OK
```

前端拖拽同列内任务后，计算受影响任务的 position 值，批量提交。后端校验所有任务属于该列，然后更新 position 字段。

### 列删除请求体

```
DELETE /api/columns/{id}
Request:  { "target_column_id": "uuid-of-target-column" }
Response: 200 OK
```

删除列时，必须指定 `target_column_id`（同项目内的另一列），后端将该列所有任务的 `column_id` 和 `status` 更新为目标列的值，然后删除该列。系统默认列（`is_default = true`）不可删除。如果列内无任务，`target_column_id` 可省略。

---

## 4. 任务 API

| 方法   | 路径                               | 说明                                       | 权限                          |
| ------ | ---------------------------------- | ------------------------------------------ | ----------------------------- |
| GET    | /api/projects/{id}/tasks           | 任务列表（分页、筛选、排序）               | 项目成员                      |
| POST   | /api/projects/{id}/tasks           | 创建任务                                   | 项目成员                      |
| GET    | /api/tasks/{id}                    | 任务详情（含进度、附件、指派）             | 项目成员                      |
| PUT    | /api/tasks/{id}                    | 更新任务（乐观锁：需传 version）           | OWNER 或任务负责人/创建者     |
| DELETE | /api/tasks/{id}                    | 删除任务                                   | PROJECT_OWNER                 |
| PUT    | /api/tasks/{id}/status             | 更新状态（同步更新 BoardColumn 映射）      | 项目成员                      |
| POST   | /api/tasks/{id}/assignees          | 添加负责人                                 | OWNER 或任务创建者/当前负责人 |
| DELETE | /api/tasks/{id}/assignees/{userId} | 移除负责人                                 | OWNER 或任务创建者/当前负责人 |
| POST   | /api/tasks/{id}/attachments        | 上传附件（multipart/form-data）            | 项目成员                      |
| DELETE | /api/attachments/{id}              | 删除附件                                   | OWNER 或上传者                |
| GET    | /api/tasks/{id}/comments           | 进度列表（Comment 实体，业务语义为"进度"） | 项目成员                      |
| POST   | /api/tasks/{id}/comments           | 添加进度                                   | 项目成员                      |
| PUT    | /api/tasks/{id}/tags               | 设置标签                                   | 项目成员                      |
| GET    | /api/tasks/{id}/history            | 状态变更历史                               | 项目成员                      |

### 进度请求/响应示例

```
POST /api/tasks/{id}/comments
Request:  { "content": "@张三 请看一下这个bug，@李四 也帮忙review一下" }
Response: {
  "id": "uuid",
  "task_id": "uuid",
  "user_id": "uuid",
  "content": "@张三 请看一下这个bug，@李四 也帮忙review一下",
  "mentions": ["u1", "u2"],
  "created_at": "2026-05-14T10:00:00Z",
  "user": { "id": "uuid", "name": "王五", ... }
}
```

后端自动从 content 中解析 `@username`，通过 `User.username` 匹配项目成员后写入 `mentions` 字段，并触发 `MENTION` 类型通知。

### 状态变更历史响应示例

```
GET /api/tasks/{id}/history
Response: [
  {
    "id": "uuid",
    "task_id": "uuid",
    "old_status": "TODO",
    "new_status": "IN_PROGRESS",
    "changed_by": "uuid",
    "changed_at": "2026-05-10T14:30:00Z",
    "user": { "id": "uuid", "name": "张三", ... }
  },
  {
    "id": "uuid",
    "task_id": "uuid",
    "old_status": "IN_PROGRESS",
    "new_status": "DONE",
    "changed_by": "uuid",
    "changed_at": "2026-05-12T16:00:00Z",
    "user": { "id": "uuid", "name": "李四", ... }
  }
]
```

历史记录按 `changed_at` DESC 排序（最新在前）。此接口为只读，不可修改或删除历史记录。

### 查询参数（GET /api/projects/{id}/tasks）

| 参数        | 说明                                       |
| ----------- | ------------------------------------------ |
| page, size  | 分页                                       |
| status      | 按状态筛选                                 |
| priority    | 按优先级筛选                               |
| assignee_id | 按负责人筛选                               |
| keyword     | 关键词搜索（标题+描述）                    |
| overdue     | true=仅逾期任务                            |
| sort        | 排序字段（deadline, priority, created_at） |

---

## 5. 标签 API

| 方法   | 路径                    | 说明                         | 权限     |
| ------ | ----------------------- | ---------------------------- | -------- |
| GET    | /api/projects/{id}/tags | 项目标签列表                 | 项目成员 |
| POST   | /api/projects/{id}/tags | 创建标签                     | 项目成员 |
| DELETE | /api/tags/{id}          | 删除标签（需先解除任务关联） | 项目成员 |

---

## 5.5 系统管理员 API

| 方法 | 路径                              | 说明                                  | 权限  |
| ---- | --------------------------------- | ------------------------------------- | ----- |
| GET  | /api/admin/users                  | 用户列表（分页、搜索）                | ADMIN |
| PUT  | /api/admin/users/{id}/role        | 修改用户角色（ADMIN/USER）            | ADMIN |
| PUT  | /api/admin/users/{id}/status      | 启用/禁用用户                         | ADMIN |
| PUT  | /api/admin/users/{id}/permissions | 设置用户权限（can_create_project 等） | ADMIN |
| GET  | /api/admin/projects               | 全部项目列表（分页）                  | ADMIN |

**说明：** 系统管理员（`User.role = ADMIN`）拥有全局管理权限，可管理所有用户和项目。系统管理员同时自动拥有所有项目的 PROJECT_OWNER 权限。JWT Token 中包含 `role` 字段，后端通过 `User.role = ADMIN` 校验系统管理员权限。

### 权限管理请求/响应示例

```
PUT /api/admin/users/{id}/permissions
Request:  { "can_create_project": true }
Response: { "id": "uuid", "username": "zhangsan", "role": "USER", "can_create_project": true, "status": "ACTIVE" }

PUT /api/admin/users/{id}/status
Request:  { "status": "DISABLED" }
Response: { "id": "uuid", "username": "zhangsan", "role": "USER", "can_create_project": false, "status": "DISABLED" }
```

---

## 6. 用户设置 API

| 方法 | 路径                      | 说明                           |
| ---- | ------------------------- | ------------------------------ |
| GET  | /api/users/me             | 当前用户信息                   |
| PUT  | /api/users/me             | 更新用户信息（名称、头像）     |
| POST | /api/users/me/avatar      | 上传头像（multipart）          |
| GET  | /api/users/me/preferences | 获取用户偏好（邮件通知开关等） |
| PUT  | /api/users/me/preferences | 更新用户偏好                   |

### 用户偏好请求体

```json
{
  "email_notification_enabled": true,
  "deadline_reminder_enabled": true,
  "mention_notification_enabled": true
}
```

---

## 7. 用户技能 API（P2）

| 方法   | 路径                      | 说明                 |
| ------ | ------------------------- | -------------------- |
| GET    | /api/users/me/skills      | 获取当前用户技能标签 |
| POST   | /api/users/me/skills      | 添加技能标签         |
| DELETE | /api/users/me/skills/{id} | 删除技能标签         |

---

## 8. 项目模板 API

| 方法   | 路径                             | 说明                                   |
| ------ | -------------------------------- | -------------------------------------- |
| GET    | /api/project-templates           | 模板列表（含系统模板和用户自建）       |
| POST   | /api/project-templates           | 创建模板                               |
| GET    | /api/project-templates/{id}      | 模板详情                               |
| DELETE | /api/project-templates/{id}      | 删除模板                               |
| POST   | /api/projects/from-template/{id} | 从模板创建项目（复制列配置和默认任务） |

---

## 9. AI API

| 方法 | 路径                      | 说明                              | 权限     |
| ---- | ------------------------- | --------------------------------- | -------- |
| POST | /api/ai/command           | 自然语言命令（**SSE 流式**）      | 项目成员 |
| POST | /api/ai/suggest/tags      | AI 标签推荐                       | 项目成员 |
| POST | /api/ai/suggest/effort    | AI 工时预估                       | 项目成员 |
| POST | /api/ai/suggest/assignee  | AI 负责人推荐                     | 项目成员 |
| POST | /api/ai/summary           | AI 任务摘要生成                   | 项目成员 |
| POST | /api/ai/confirm           | 确认执行 AI 预览操作              | 项目成员 |
| POST | /api/projects/{id}/health | AI 项目健康度分析（**SSE 流式**） | 项目成员 |
| GET  | /api/ai/logs              | AI 操作日志（分页）               | 登录用户 |

### SSE 端点说明

`POST /api/ai/command` 返回 `text/event-stream`：

```
Request:  { "project_id": "...", "command": "把所有逾期任务标记为紧急" }
Response: SSE 事件流（thinking → tool_call → diff_preview → confirmation_required）

POST /api/ai/confirm
Request:  { "operation_id": "...", "action": "confirmed" | "rejected" | "modified", "modifications": {...} }
```

### AI 对话历史 API

| 方法   | 路径                       | 说明                             |
| ------ | -------------------------- | -------------------------------- |
| GET    | /api/ai/chat-sessions      | 对话会话列表（分页，按时间倒序） |
| GET    | /api/ai/chat-sessions/{id} | 会话详情（含全部消息）           |
| DELETE | /api/ai/chat-sessions/{id} | 删除会话                         |

### 对话历史请求/响应示例

```
GET /api/ai/chat-sessions?page=0&size=20
Response: {
  "content": [
    {
      "id": "uuid",
      "title": "把所有逾期任务标记为紧急",
      "project_id": "uuid",
      "created_at": "2026-05-14T10:00:00Z",
      "message_count": 6
    }
  ],
  "totalElements": 45,
  "totalPages": 3,
  "number": 0,
  "size": 20
}

GET /api/ai/chat-sessions/{id}
Response: {
  "id": "uuid",
  "title": "把所有逾期任务标记为紧急",
  "project_id": "uuid",
  "created_at": "2026-05-14T10:00:00Z",
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "把所有逾期任务标记为紧急",
      "tool_calls": null,
      "references": null,
      "created_at": "2026-05-14T10:00:01Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "正在分析您的指令...",
      "tool_calls": [
        {"tool": "search_tasks", "params": {"overdue": true}, "result_count": 5},
        {"tool": "batch_update_tasks", "params": {"priority": "urgent"}, "result_count": 5}
      ],
      "references": null,
      "created_at": "2026-05-14T10:00:03Z"
    }
  ]
}
```

---

## 10. 通知 API

| 方法 | 路径                            | 说明                         |
| ---- | ------------------------------- | ---------------------------- |
| GET  | /api/notifications              | 通知列表（分页，按时间倒序） |
| GET  | /api/notifications/unread-count | 未读数量                     |
| PUT  | /api/notifications/{id}/read    | 标记已读                     |
| PUT  | /api/notifications/read-all     | 全部已读                     |

---

## 11. 自动化规则 API（P2）

| 方法   | 路径                     | 说明          | 权限          |
| ------ | ------------------------ | ------------- | ------------- |
| GET    | /api/projects/{id}/rules | 规则列表      | 项目成员      |
| POST   | /api/projects/{id}/rules | 创建规则      | PROJECT_OWNER |
| GET    | /api/rules/{id}          | 规则详情      | 项目成员      |
| PUT    | /api/rules/{id}          | 更新规则      | PROJECT_OWNER |
| DELETE | /api/rules/{id}          | 删除规则      | PROJECT_OWNER |
| PUT    | /api/rules/{id}/toggle   | 启用/禁用切换 | PROJECT_OWNER |

### 规则请求体

```json
{
  "name": "逾期自动升级",
  "trigger_type": "TASK_OVERDUE",
  "trigger_config": {},
  "conditions": [{ "field": "overdue_days", "operator": ">", "value": 3 }],
  "actions": [
    { "type": "SET_PRIORITY", "params": { "priority": "URGENT" } },
    {
      "type": "SEND_NOTIFICATION",
      "params": { "target": "ASSIGNEE", "channel": "EMAIL" }
    }
  ],
  "enabled": true
}
```

---

## 12. 知识库 API（P3）

| 方法   | 路径                                | 说明                         | 权限          |
| ------ | ----------------------------------- | ---------------------------- | ------------- |
| POST   | /api/projects/{id}/knowledge-bases  | 创建知识库                   | PROJECT_OWNER |
| GET    | /api/projects/{id}/knowledge-bases  | 知识库列表                   | 项目成员      |
| PUT    | /api/knowledge-bases/{id}           | 更新知识库（含分块参数配置） | PROJECT_OWNER |
| DELETE | /api/knowledge-bases/{id}           | 删除知识库                   | PROJECT_OWNER |
| POST   | /api/knowledge-bases/{id}/documents | 上传文档（multipart）        | PROJECT_OWNER |
| GET    | /api/knowledge-bases/{id}/documents | 文档列表                     | 项目成员      |
| GET    | /api/documents/{id}/chunks          | 查看文档分块详情             | 项目成员      |
| DELETE | /api/documents/{id}                 | 删除文档                     | PROJECT_OWNER |
| POST   | /api/knowledge-bases/{id}/retrieve  | 检索相似文档块（返回 JSON）  | 项目成员      |
| POST   | /api/knowledge-bases/{id}/ask       | 知识库问答（**SSE 流式**）   | 项目成员      |

### 检索接口响应格式

```
POST /api/knowledge-bases/{id}/retrieve
Request:  { "query": "上次迭代遗留了哪些 bug？", "top_k": 5 }
Response: {
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

---

## 13. 通用约定

### 鉴权

除 `/api/auth/register`、`/api/auth/login`、`/api/auth/send-code`、`/api/auth/reset-password` 外，所有接口需 Header：

```
Authorization: Bearer <accessToken>
```

**项目级角色鉴权规则：**

- 标注"项目成员"的接口：需为该 `project_id` 对应的 `ProjectMember` 记录存在（OWNER 或 MEMBER 均可）
- 标注"PROJECT_OWNER"的接口：需为该 `project_id` 对应的 `ProjectMember.role = PROJECT_OWNER`
- 标注"登录用户"的接口：仅需有效的 JWT Token
- 标注"ADMIN 或 can_create_project=true"的接口：系统管理员直接放行；普通用户需 `User.can_create_project = true`
- 标注"OWNER 或任务创建者/当前负责人"的接口：PROJECT_OWNER 可操作所有任务；MEMBER 仅可操作自己创建（`created_by`）或被指派（`TaskAssignee`）的任务
- 标注"OWNER 或上传者"的接口：PROJECT_OWNER 可删除所有附件；MEMBER 仅可删除自己上传的附件
- 权限不足时返回 `403 FORBIDDEN`，`code: INSUFFICIENT_PROJECT_ROLE`；项目创建权限不足返回 `code: CANNOT_CREATE_PROJECT`

### 分页响应格式

```json
{
  "content": [...],
  "totalElements": 100,
  "totalPages": 10,
  "number": 0,
  "size": 10
}
```

### 错误响应格式

```json
{
  "code": "VERSION_CONFLICT",
  "message": "任务已被其他人修改，请刷新后重试",
  "timestamp": "2026-05-14T10:00:00Z"
}
```

### 常见错误码

| HTTP | code                      | 说明                   |
| ---- | ------------------------- | ---------------------- |
| 400  | INVALID_CODE              | 验证码不正确           |
| 400  | CODE_EXPIRED              | 验证码已过期           |
| 401  | UNAUTHORIZED              | Token 无效或过期       |
| 401  | INVALID_CREDENTIALS       | 邮箱或密码错误         |
| 403  | FORBIDDEN                 | 权限不足               |
| 403  | INSUFFICIENT_PROJECT_ROLE | 项目角色权限不足       |
| 403  | CANNOT_CREATE_PROJECT     | 无项目创建权限         |
| 403  | NOT_PROJECT_MEMBER        | 非项目成员             |
| 403  | ACCOUNT_DISABLED          | 账户已被禁用           |
| 404  | NOT_FOUND                 | 资源不存在             |
| 404  | EMAIL_NOT_FOUND           | 邮箱未注册             |
| 409  | VERSION_CONFLICT          | 乐观锁冲突             |
| 409  | EMAIL_EXISTS              | 邮箱已被注册           |
| 422  | VALIDATION_ERROR          | 请求参数校验失败       |
| 423  | ACCOUNT_LOCKED            | 账户已锁定（登录失败） |
| 429  | RATE_LIMITED              | 请求频率超限           |
| 429  | CODE_RATE_LIMITED         | 验证码发送频率超限     |

### 全局速率限制

使用 Spring Boot + Redis（令牌桶算法）实现接口级别的速率限制。速率限制基于 `用户 ID + 接口分组` 维度，非登录状态基于 `IP + 接口分组`。

| 接口分组              | 限制规则                         | 说明                                                                                                               |
| --------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 认证（登录/注册）     | 同一 IP 10 次/分钟               | 防止暴力破解和恶意注册                                                                                             |
| 验证码发送            | 同一邮箱/IP 1 次/60秒            | 已在主文档定义，此处统一纳入速率限制体系                                                                           |
| 普通 API（CRUD）      | 同一用户 60 次/分钟              | 覆盖项目、任务、看板、标签、通知等常规接口                                                                         |
| AI 接口（全部）       | 同一用户 10 次/分钟              | `/api/ai/command`、`/api/ai/suggest/*`、`/api/ai/summary`、`/api/projects/{id}/health`。LLM 调用成本高，需严格限流 |
| AI 确认接口           | 同一用户 20 次/分钟              | `/api/ai/confirm`                                                                                                  |
| 知识库问答（SSE）     | 同一用户 10 次/分钟              | `/api/knowledge-bases/{id}/ask`                                                                                    |
| 文件上传（附件/头像） | 同一用户 20 次/分钟，单文件 20MB | 覆盖附件上传、头像上传、文档上传                                                                                   |

**实现方案：** 使用 `@RateLimit` 自定义注解 + AOP 切面，在 Redis 中维护令牌桶（key: `ratelimit:{userId/ip}:{group}`）。超限时返回 `429 RATE_LIMITED`，响应 Header 包含 `X-RateLimit-Limit`、`X-RateLimit-Remaining`、`X-RateLimit-Reset` 供前端展示。

### 附件校验规则

附件上传接口（`POST /api/tasks/{id}/attachments`）的前后端双重校验：

**前端校验（拦截无效请求，减少带宽浪费）：**

- 文件类型：仅允许 `image/png`、`image/jpeg`、`image/gif`、`application/pdf`、`text/plain`、`application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- 文件大小：单文件最大 20MB
- 超出限制时前端即时提示，禁止提交

**后端校验（安全防线，不信任前端）：**

- 文件类型：校验 `Content-Type` + 文件扩展名 + 文件头魔术字节（Magic Bytes）三重验证，防止伪造扩展名
- 文件大小：Spring Boot `spring.servlet.multipart.max-file-size=20MB`、`max-request-size=25MB`
- 文件名：最大 255 字符，过滤路径穿越字符（`../`、`\`）
- 单任务附件数量上限：20 个
