CREATE DATABASE IF NOT EXISTS `taskboard` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `taskboard`;

-- ============================================================
-- P1 核心业务表
-- ============================================================

CREATE TABLE `user` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名（唯一标识，用于登录和成员邀请）',
  `nickname` VARCHAR(50) NOT NULL COMMENT '显示名称（用于UI展示）',
  `email` VARCHAR(100) NOT NULL COMMENT '邮箱',
  `password` VARCHAR(255) NOT NULL COMMENT '密码',
  `avatar` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  `role` VARCHAR(20) NOT NULL DEFAULT 'USER' COMMENT '角色：ADMIN/USER',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用 1-启用',
  `can_create_project` TINYINT NOT NULL DEFAULT 0 COMMENT '是否可创建项目：0-否 1-是',
  `login_fail_count` INT NOT NULL DEFAULT 0 COMMENT '登录失败次数',
  `lock_time` DATETIME DEFAULT NULL COMMENT '锁定时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除：0-未删除 1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

CREATE TABLE `project` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` VARCHAR(100) NOT NULL COMMENT '项目名称',
  `description` TEXT COMMENT '项目描述',
  `icon` VARCHAR(500) DEFAULT NULL COMMENT '项目图标URL',
  `visibility` VARCHAR(10) NOT NULL DEFAULT 'PRIVATE' COMMENT '可见性：PUBLIC/PRIVATE',
  `owner_id` BIGINT NOT NULL COMMENT '项目负责人ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_owner_id` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目表';

CREATE TABLE `project_member` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `project_id` BIGINT NOT NULL COMMENT '项目ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `role` VARCHAR(20) NOT NULL DEFAULT 'MEMBER' COMMENT '角色：OWNER/MEMBER',
  `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_user` (`project_id`, `user_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目成员表';

CREATE TABLE `board_column` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `project_id` BIGINT NOT NULL COMMENT '项目ID',
  `name` VARCHAR(50) NOT NULL COMMENT '列名称',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `status_mapping` VARCHAR(20) NOT NULL DEFAULT 'TODO' COMMENT '状态映射：TODO/IN_PROGRESS/DONE',
  `is_default` TINYINT NOT NULL DEFAULT 0 COMMENT '是否系统默认列：0-否 1-是',
  `color` VARCHAR(7) DEFAULT NULL COMMENT '列颜色（十六进制）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='看板列表';

CREATE TABLE `task` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `project_id` BIGINT NOT NULL COMMENT '项目ID',
  `column_id` BIGINT NOT NULL COMMENT '看板列ID',
  `title` VARCHAR(100) NOT NULL COMMENT '任务标题',
  `description` TEXT COMMENT '任务描述',
  `ai_summary` VARCHAR(200) DEFAULT NULL COMMENT 'AI自动生成摘要（最大200字符）',
  `priority` VARCHAR(10) NOT NULL DEFAULT 'MEDIUM' COMMENT '优先级：LOW/MEDIUM/HIGH/URGENT',
  `status` VARCHAR(20) NOT NULL DEFAULT 'TODO' COMMENT '状态：TODO/IN_PROGRESS/DONE',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `due_date` DATE DEFAULT NULL COMMENT '截止日期',
  `estimated_hours` DECIMAL(6,1) DEFAULT NULL COMMENT '预估工时（小时）',
  `actual_hours` DECIMAL(6,1) DEFAULT NULL COMMENT '实际工时（小时）',
  `creator_id` BIGINT NOT NULL COMMENT '创建人ID',
  `version` INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_column_id` (`column_id`),
  KEY `idx_creator_id` (`creator_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务表';

CREATE TABLE `task_assignee` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `task_id` BIGINT NOT NULL COMMENT '任务ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_task_user` (`task_id`, `user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_task_id` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务负责人表';

CREATE TABLE `tag` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `project_id` BIGINT NOT NULL COMMENT '项目ID',
  `name` VARCHAR(50) NOT NULL COMMENT '标签名称',
  `color` VARCHAR(7) NOT NULL DEFAULT '#409EFF' COMMENT '标签颜色',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标签表';

CREATE TABLE `task_tag` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `task_id` BIGINT NOT NULL COMMENT '任务ID',
  `tag_id` BIGINT NOT NULL COMMENT '标签ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_task_tag` (`task_id`, `tag_id`),
  KEY `idx_tag_id` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务标签关联表';

CREATE TABLE `attachment` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `task_id` BIGINT NOT NULL COMMENT '任务ID',
  `file_name` VARCHAR(255) NOT NULL COMMENT '文件名',
  `file_path` VARCHAR(500) NOT NULL COMMENT '文件路径',
  `file_size` BIGINT NOT NULL DEFAULT 0 COMMENT '文件大小(字节)',
  `file_type` VARCHAR(50) DEFAULT NULL COMMENT '文件类型',
  `uploader_id` BIGINT NOT NULL COMMENT '上传人ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_uploader_id` (`uploader_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='附件表';

CREATE TABLE `comment` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `task_id` BIGINT NOT NULL COMMENT '任务ID',
  `content` TEXT NOT NULL COMMENT '评论内容',
  `author_id` BIGINT NOT NULL COMMENT '评论人ID',
  `parent_id` BIGINT DEFAULT NULL COMMENT '父评论ID',
  `mentions` JSON DEFAULT NULL COMMENT '@提及用户ID列表',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_author_id` (`author_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论表';

CREATE TABLE `notification` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` BIGINT NOT NULL COMMENT '接收用户ID',
  `type` VARCHAR(30) NOT NULL COMMENT '通知类型：DEADLINE_REMINDER/OVERDUE_WARNING/STATUS_CHANGED/MENTION/ASSIGNEE_CHANGED/AI_OPERATION/HEALTH_WARNING',
  `title` VARCHAR(200) NOT NULL COMMENT '通知标题',
  `content` TEXT COMMENT '通知内容',
  `related_id` BIGINT DEFAULT NULL COMMENT '关联实体ID',
  `related_type` VARCHAR(30) DEFAULT NULL COMMENT '关联实体类型：TASK/PROJECT/RULE/COMMENT',
  `is_read` TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读：0-未读 1-已读',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_user_read` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知表';

CREATE TABLE `task_status_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `task_id` BIGINT NOT NULL COMMENT '任务ID',
  `old_status` VARCHAR(20) DEFAULT NULL COMMENT '原状态',
  `new_status` VARCHAR(20) NOT NULL COMMENT '新状态',
  `changed_by` BIGINT NOT NULL COMMENT '变更人ID',
  `changed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '变更时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_changed_by` (`changed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务状态历史表';

CREATE TABLE `operation_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` BIGINT NOT NULL COMMENT '操作人ID',
  `module` VARCHAR(50) NOT NULL COMMENT '模块',
  `action` VARCHAR(50) NOT NULL COMMENT '操作',
  `target_id` BIGINT DEFAULT NULL COMMENT '目标ID',
  `detail` TEXT COMMENT '操作详情',
  `ip` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  `source` VARCHAR(20) NOT NULL DEFAULT 'MANUAL' COMMENT '操作来源：MANUAL/AI_ASSISTED/AUTOMATION',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_module_action` (`module`, `action`),
  KEY `idx_source` (`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

CREATE TABLE `user_preference` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `email_notification` TINYINT NOT NULL DEFAULT 1 COMMENT '邮件通知：0-关闭 1-开启',
  `deadline_reminder` TINYINT NOT NULL DEFAULT 1 COMMENT '截止提醒：0-关闭 1-开启',
  `overdue_warning` TINYINT NOT NULL DEFAULT 1 COMMENT '逾期警告：0-关闭 1-开启',
  `status_change_notify` TINYINT NOT NULL DEFAULT 1 COMMENT '状态变更通知：0-关闭 1-开启',
  `mention_notify` TINYINT NOT NULL DEFAULT 1 COMMENT '@提醒：0-关闭 1-开启',
  `member_change_notify` TINYINT NOT NULL DEFAULT 1 COMMENT '成员变更通知：0-关闭 1-开启',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户偏好表';

CREATE TABLE `project_template` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` VARCHAR(100) NOT NULL COMMENT '模板名称',
  `description` TEXT COMMENT '模板描述',
  `category` VARCHAR(20) NOT NULL DEFAULT 'GENERAL' COMMENT '分类：DEVELOPMENT/MARKETING/OPERATIONS/GENERAL/CUSTOM',
  `is_system` TINYINT NOT NULL DEFAULT 0 COMMENT '是否系统模板：0-否 1-是',
  `column_config` JSON NOT NULL COMMENT '列配置JSON',
  `default_tasks` JSON DEFAULT NULL COMMENT '默认任务JSON',
  `created_by` BIGINT DEFAULT NULL COMMENT '创建者ID（系统模板为NULL）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目模板表';

-- ============================================================
-- P2 AI增强表
-- ============================================================

CREATE TABLE `user_skill` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `skill_tag` VARCHAR(50) NOT NULL COMMENT '技能标签',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_skill` (`user_id`, `skill_tag`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户技能标签表';

CREATE TABLE `task_metrics` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `project_id` BIGINT NOT NULL COMMENT '项目ID',
  `tag` VARCHAR(50) NOT NULL COMMENT '标签名称',
  `avg_estimated_hours` DECIMAL(6,1) DEFAULT NULL COMMENT '平均预估工时（小时）',
  `avg_actual_hours` DECIMAL(6,1) DEFAULT NULL COMMENT '平均实际工时（小时）',
  `completion_rate` DECIMAL(5,2) DEFAULT NULL COMMENT '完成率（百分比）',
  `sample_count` INT NOT NULL DEFAULT 0 COMMENT '样本数量（该标签下已完成任务数）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_tag` (`project_id`, `tag`),
  KEY `idx_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务度量统计表（按project_id+tag聚合）';

CREATE TABLE `ai_operation_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` BIGINT NOT NULL COMMENT '操作用户ID',
  `project_id` BIGINT DEFAULT NULL COMMENT '项目ID',
  `prompt` TEXT COMMENT '用户输入的Prompt',
  `ai_thinking` TEXT COMMENT 'AI分析过程',
  `tool_calls` JSON DEFAULT NULL COMMENT 'AI调用的工具链JSON',
  `ai_output` TEXT COMMENT 'AI输出内容',
  `diff_preview` JSON DEFAULT NULL COMMENT '变更预览JSON',
  `user_action` VARCHAR(20) DEFAULT NULL COMMENT '用户操作：CONFIRMED/REJECTED/MODIFIED/AUTOMATION_FAILED',
  `executed_action` JSON DEFAULT NULL COMMENT '实际执行的操作JSON',
  `source` VARCHAR(20) NOT NULL DEFAULT 'AI_ASSISTED' COMMENT '来源：AI_ASSISTED/AUTOMATION',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_source` (`source`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI操作日志表（记录完整交互链路）';

CREATE TABLE `ai_chat_session` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `project_id` BIGINT DEFAULT NULL COMMENT '项目ID',
  `title` VARCHAR(200) DEFAULT NULL COMMENT '会话标题（取首条消息摘要）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI对话会话表';

CREATE TABLE `ai_chat_message` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `session_id` BIGINT NOT NULL COMMENT '会话ID',
  `role` VARCHAR(20) NOT NULL COMMENT '角色：user/assistant/system',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `tool_calls` JSON DEFAULT NULL COMMENT 'AI调用的工具链JSON',
  `references` JSON DEFAULT NULL COMMENT 'RAG检索来源JSON',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI对话消息表';

CREATE TABLE `automation_rule` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `project_id` BIGINT NOT NULL COMMENT '项目ID',
  `name` VARCHAR(100) NOT NULL COMMENT '规则名称',
  `trigger_type` VARCHAR(30) NOT NULL COMMENT '触发器类型：TASK_CREATED/TASK_STATUS_CHANGED/TASK_DEADLINE_APPROACHING/TASK_OVERDUE/SCHEDULED',
  `trigger_config` JSON DEFAULT NULL COMMENT '触发器配置JSON（如Cron表达式）',
  `conditions` JSON DEFAULT NULL COMMENT '条件列表JSON',
  `actions` JSON NOT NULL COMMENT '动作列表JSON',
  `enabled` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用：0-禁用 1-启用',
  `consecutive_failures` INT NOT NULL DEFAULT 0 COMMENT '连续失败次数（达3次自动禁用）',
  `created_by` BIGINT NOT NULL COMMENT '创建者ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_enabled` (`enabled`),
  KEY `idx_trigger_type` (`trigger_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='自动化规则表';

-- ============================================================
-- P3 知识库表
-- ============================================================

CREATE TABLE `knowledge_base` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `project_id` BIGINT NOT NULL COMMENT '项目ID',
  `name` VARCHAR(100) NOT NULL COMMENT '知识库名称',
  `description` TEXT COMMENT '知识库描述',
  `chunk_size` INT NOT NULL DEFAULT 2000 COMMENT '分块大小（字数）',
  `chunk_overlap` INT NOT NULL DEFAULT 200 COMMENT '相邻块重叠字数',
  `top_k` INT NOT NULL DEFAULT 5 COMMENT '检索返回最大结果数',
  `similarity_threshold` DECIMAL(3,2) NOT NULL DEFAULT 0.50 COMMENT '相似度阈值（低于此值不返回）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库表';

CREATE TABLE `document` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `knowledge_base_id` BIGINT NOT NULL COMMENT '知识库ID',
  `file_name` VARCHAR(255) NOT NULL COMMENT '文件名',
  `file_url` VARCHAR(500) NOT NULL COMMENT '文件存储路径',
  `chunk_count` INT NOT NULL DEFAULT 0 COMMENT '分块数量',
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING/PROCESSING/COMPLETED/PROCESSING_FAILED',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_knowledge_base_id` (`knowledge_base_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文档表';

CREATE TABLE `document_chunk` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `content` TEXT NOT NULL COMMENT '分块文本内容',
  `chunk_index` INT NOT NULL COMMENT '在原文中的序号',
  `embedding` JSON DEFAULT NULL COMMENT '向量嵌入JSON（Embedding API返回的向量数组）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '软删除',
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_document_chunk_index` (`document_id`, `chunk_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文档分块表';
