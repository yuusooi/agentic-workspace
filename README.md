# Agentic Workspace - AI智能任务协作平台

一个基于AI驱动的智能任务管理与协作平台，支持自然语言交互、智能任务分配、项目健康度分析等功能。

## 功能特性

### 核心功能

- **项目管理** - 创建、管理项目，支持公开/私有项目
- **任务看板** - 可视化看板，支持拖拽排序、状态流转
- **团队协作** - 成员管理、任务分配、评论互动
- **标签系统** - 任务标签分类，支持颜色自定义

### AI智能功能

- **AI智能助手** - 自然语言交互，执行任务操作
- **任务状态更新** - 通过对话修改任务状态、优先级
- **负责人推荐** - 基于成员负载和技能智能推荐
- **项目健康度分析** - 多维度评估项目状态
- **知识库问答** - 上传文档，基于文档内容智能问答

### 其他功能

- **自动化规则** - 自定义触发条件和执行动作
- **消息通知** - 实时通知提醒
- **知识库管理** - 文档上传、分块、向量化存储

## 技术栈

### 后端

| 技术                | 版本     | 说明         |
| ----------------- | ------ | ---------- |
| Spring Boot       | 3.1.5  | 核心框架       |
| MyBatis-Plus      | 3.5.5  | ORM框架      |
| MySQL             | 8.0+   | 数据库        |
| Redis             | 7.0+   | 缓存/Token存储 |
| Spring Security   | -      | 安全框架       |
| JWT               | 0.12.3 | 认证方案       |
| Springdoc OpenAPI | 2.2.0  | API文档      |
| WebFlux           | -      | 响应式HTTP客户端 |

### 前端

| 技术           | 版本   | 说明      |
| ------------ | ---- | ------- |
| React        | 18.3 | UI框架    |
| TypeScript   | 6.0  | 类型系统    |
| Vite         | 8.0  | 构建工具    |
| Ant Design   | 6.4  | UI组件库   |
| Zustand      | 5.0  | 状态管理    |
| React Router | 6.30 | 路由管理    |
| dnd-kit      | 6.3  | 拖拽功能    |
| Axios        | 1.16 | HTTP客户端 |

## 项目结构

```
agentic-workspace/
├── backend/                          # 后端项目
│   ├── sql/                          # 数据库脚本
│   │   ├── init.sql                  # 数据库初始化
│   │   └── seed.sql                  # 测试数据
│   ├── src/main/java/com/ai/taskboard/
│   │   ├── common/                   # 公共模块
│   │   │   ├── config/               # 配置类
│   │   │   ├── exception/            # 异常处理
│   │   │   ├── result/               # 统一响应
│   │   │   └── util/                 # 工具类
│   │   ├── config/                   # AI配置
│   │   ├── controller/               # 控制器层
│   │   ├── dto/                      # 数据传输对象
│   │   ├── entity/                   # 实体类
│   │   ├── mapper/                   # MyBatis Mapper
│   │   ├── security/                 # 安全模块
│   │   ├── service/                  # 服务层
│   │   │   └── impl/                 # 服务实现
│   │   └── TaskBoardApplication.java # 启动类
│   ├── src/main/resources/
│   │   ├── application.yml           # 主配置
│   │   ├── application-dev.yml       # 开发环境配置
│   │   └── application-prod.yml      # 生产环境配置
│   ├── uploads/                      # 上传文件存储
│   │   ├── attachments/              # 任务附件
│   │   ├── avatars/                  # 用户头像
│   │   ├── icons/                    # 项目图标
│   │   └── knowledge/                # 知识库文档
│   └── pom.xml                       # Maven配置
│
├── frontend/                         # 前端项目
│   ├── src/
│   │   ├── components/               # 公共组件
│   │   ├── layouts/                  # 布局组件
│   │   ├── lib/                      # API客户端
│   │   ├── pages/                    # 页面组件
│   │   │   ├── ai/                   # AI助手页面
│   │   │   ├── board/                # 看板页面
│   │   │   ├── knowledge/            # 知识库页面
│   │   │   ├── project/              # 项目管理页面
│   │   │   └── settings/             # 设置页面
│   │   ├── stores/                   # Zustand状态
│   │   ├── styles/                   # 样式文件
│   │   ├── types/                    # TypeScript类型
│   │   ├── App.tsx                   # 根组件
│   │   └── main.tsx                  # 入口文件
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── README.md
```

## 环境要求

- **JDK**: 17+
- **Node.js**: 18+
- **MySQL**: 8.0+
- **Redis**: 7.0+
- **Maven**: 3.8+

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd agentic-workspace
```

### 2. 数据库配置

```sql
-- 创建数据库
CREATE DATABASE taskboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 执行初始化脚本
USE taskboard;
SOURCE backend/sql/init.sql;
```

### 3. 后端配置

编辑 `backend/src/main/resources/application-dev.yml`:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/taskboard?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=Asia/Shanghai
    username: root
    password: your_password

  data:
    redis:
      host: localhost
      port: 6379
      password: your_redis_password

file:
  upload-path: /path/to/uploads

ai:
  llm:
    base-url: https://api.moonshot.cn/v1
    api-key: your_api_key
    model: moonshot-v1-auto
```

### 4. 启动后端

```bash
cd backend
mvn spring-boot:run
```

后端服务将在 `http://localhost:8080` 启动。

API文档地址: `http://localhost:8080/swagger-ui.html`

### 5. 前端配置

```bash
cd frontend
npm install
```

### 6. 启动前端

```bash
npm run dev
```

前端服务将在 `http://localhost:3000` 启动。

## 默认账号

系统预置了测试账号：

| 用户名      | 密码     | 角色   |
| -------- | ------ | ---- |
| zhangsan | 123456 | 管理员  |
| lisi     | 123456 | 普通用户 |
| wangwu   | 123456 | 普通用户 |

## API接口

### 认证接口

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/refresh` - 刷新Token

### 项目接口

- `GET /api/projects/mine` - 获取我的项目
- `GET /api/projects/public` - 获取公开项目
- `POST /api/projects` - 创建项目
- `PUT /api/projects/{id}` - 更新项目
- `DELETE /api/projects/{id}` - 删除项目

### 任务接口

- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/{id}` - 获取任务详情
- `POST /api/tasks` - 创建任务
- `PUT /api/tasks/{id}` - 更新任务
- `DELETE /api/tasks/{id}` - 删除任务

### AI接口

- `POST /api/ai/command` - 发送AI指令（SSE流式响应）
- `POST /api/ai/confirm` - 确认AI操作
- `POST /api/ai/chat` - AI对话
- `GET /api/ai/health/{projectId}` - 项目健康度分析

### 知识库接口

- `GET /api/knowledge` - 获取知识库列表
- `POST /api/knowledge` - 创建知识库
- `POST /api/knowledge/{id}/documents` - 上传文档
- `POST /api/knowledge/{id}/ask` - 知识问答（SSE流式响应）

## AI功能说明

### 智能助手支持的操作

| 操作    | 示例指令             |
| ----- | ---------------- |
| 搜索任务  | "帮我找一下支付相关的任务"   |
| 更新状态  | "把任务5的状态改为已完成"   |
| 设置优先级 | "将首页优化标记为紧急"     |
| 分配任务  | "把任务3分配给王五"      |
| 创建任务  | "创建一个新任务：用户登录优化" |
| 推荐负责人 | "推荐一个负责人来处理支付任务" |
| 分析健康度 | "分析一下项目的健康状态"    |

### 知识库问答

1. 创建知识库
2. 上传文档（支持 PDF、Word、TXT、Markdown、图片）
3. 开始问答，AI将基于文档内容回答

## 配置说明

### JWT Token配置

```yaml
jwt:
  secret: YourSecretKeyMustBeLongEnough
  access-token-expiration: 900000    # 15分钟
  refresh-token-expiration: 604800000  # 7天
```

### 文件上传配置

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 50MB
      max-request-size: 50MB
```

### AI配置

```yaml
ai:
  llm:
    base-url: https://api.moonshot.cn/v1
    api-key: your_api_key
    model: moonshot-v1-auto
    max-tokens: 4096
    temperature: 0.7
  embedding:
    enabled: true
    model: text-embedding-v1
  knowledge:
    default-chunk-size: 2000
    default-chunk-overlap: 200
    default-top-k: 5
```

## 部署说明

### 后端打包

```bash
cd backend
mvn clean package -DskipTests
java -jar target/taskboard-1.0.0.jar --spring.profiles.active=prod
```

### 前端打包

```bash
cd frontend
npm run build
```

打包产物在 `frontend/dist` 目录。

### Docker部署（可选）

```dockerfile
# 后端 Dockerfile
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY target/taskboard-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

## 常见问题

### 1. Token过期问题

Access Token有效期为15分钟，过期后需要重新登录或使用Refresh Token刷新。

### 2. 文件上传失败

检查 `file.upload-path` 配置是否正确，确保目录存在且有写入权限。

### 3. AI功能无响应

检查AI API Key是否有效，网络是否可达。

### 4. 端口被占用

后端默认端口8080，前端默认端口3000。如需修改，请调整配置文件。

