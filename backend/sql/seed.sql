USE `taskboard`;

-- ============================================================
-- 种子数据说明
-- ============================================================
-- 用户角色与权限配置：
--   zhangsan (ID=1): 系统管理员 (ADMIN, can_create_project=1)
--     → 可见「用户管理」入口、「创建项目」按钮
--     → 所有项目中 my_role 始终为 PROJECT_OWNER（后端逻辑）
--   lisi (ID=2): 项目负责人 (USER, can_create_project=1)
--     → 可见「创建项目」按钮，不可见「用户管理」
--     → 自建项目为 OWNER，参与项目为 MEMBER
--   wangwu (ID=3): 普通成员 (USER, can_create_project=0)
--     → 不可见「创建项目」按钮和「用户管理」
--     → 所有参与项目均为 MEMBER
--   zhaoliu (ID=4): 普通成员 (USER, can_create_project=0)
--     → 同王五
--   sunqi (ID=5): 有创建权限的普通成员 (USER, can_create_project=1)
--     → 可见「创建项目」按钮，不可见「用户管理」
--     → 参与项目均为 MEMBER
--   zhouba (ID=6): 被锁定的普通成员 (USER, status=1, login_fail_count=5, lock_time=当前)
--     → 用于测试登录锁定/解锁流程
--   wujiu (ID=7): 被禁用的普通成员 (USER, status=0)
--     → 用于测试账户禁用状态
--
-- username 为唯一标识（账号名），nickname 为中文显示名称，
-- username 符合后端注册校验规则：^[a-zA-Z][a-zA-Z0-9_-]{2,19}$
-- 邀请成员通过 username 查找用户
--
-- 密码统一为 Abc12345 (BCrypt加密)，符合密码强度规则：
--   ≥8字符、至少1大写、1小写、1数字
-- ============================================================

-- ============================================================
-- 1. 用户表 (7人: 1系统管理员 + 1项目负责人 + 3普通成员 + 1锁定成员 + 1禁用成员)
-- ============================================================
INSERT INTO `user` (`id`, `username`, `nickname`, `email`, `password`, `avatar`, `role`, `status`, `can_create_project`, `login_fail_count`, `lock_time`) VALUES
(1, 'zhangsan', '张三', 'zhangsan@example.com', '$2a$10$YKqHzqseMCnnRs6cs9nRrOjuNJMc4f3nsG2b4.gxb.5ryd4X23B0.', '/uploads/avatars/zhangsan.png', 'ADMIN', 1, 1, 0, NULL),
(2, 'lisi',     '李四', 'lisi@example.com',     '$2a$10$YKqHzqseMCnnRs6cs9nRrOjuNJMc4f3nsG2b4.gxb.5ryd4X23B0.', '/uploads/avatars/lisi.png',     'USER', 1, 1, 0, NULL),
(3, 'wangwu',   '王五', 'wangwu@example.com',   '$2a$10$YKqHzqseMCnnRs6cs9nRrOjuNJMc4f3nsG2b4.gxb.5ryd4X23B0.', '/uploads/avatars/wangwu.png',   'USER', 1, 0, 0, NULL),
(4, 'zhaoliu',  '赵六', 'zhaoliu@example.com',  '$2a$10$YKqHzqseMCnnRs6cs9nRrOjuNJMc4f3nsG2b4.gxb.5ryd4X23B0.', '/uploads/avatars/zhaoliu.png',  'USER', 1, 0, 0, NULL),
(5, 'sunqi',    '孙七', 'sunqi@example.com',    '$2a$10$YKqHzqseMCnnRs6cs9nRrOjuNJMc4f3nsG2b4.gxb.5ryd4X23B0.', '/uploads/avatars/sunqi.png',    'USER', 1, 1, 0, NULL),
(6, 'zhouba',   '周八', 'zhouba@example.com',   '$2a$10$YKqHzqseMCnnRs6cs9nRrOjuNJMc4f3nsG2b4.gxb.5ryd4X23B0.', '/uploads/avatars/zhouba.png',   'USER', 1, 0, 5, '2026-05-16 10:00:00'),
(7, 'wujiu',    '吴九', 'wujiu@example.com',    '$2a$10$YKqHzqseMCnnRs6cs9nRrOjuNJMc4f3nsG2b4.gxb.5ryd4X23B0.', '/uploads/avatars/wujiu.png',    'USER', 0, 0, 0, NULL);

-- ============================================================
-- 2. 用户偏好表
-- ============================================================
INSERT INTO `user_preference` (`user_id`, `email_notification`, `deadline_reminder`, `overdue_warning`, `status_change_notify`, `mention_notify`, `member_change_notify`) VALUES
(1, 1, 1, 1, 1, 1, 1),
(2, 1, 1, 1, 1, 1, 1),
(3, 1, 1, 1, 1, 1, 0),
(4, 0, 1, 1, 0, 1, 0),
(5, 1, 0, 1, 1, 1, 1),
(6, 1, 1, 1, 1, 1, 1),
(7, 1, 1, 1, 1, 1, 1);

-- ============================================================
-- 3. 项目表 (4个项目)
-- 项目1: PUBLIC — 可测试非成员只读访问
-- 项目2/3/4: PRIVATE — 可测试成员权限隔离
-- ============================================================
INSERT INTO `project` (`id`, `name`, `description`, `icon`, `visibility`, `owner_id`) VALUES
(1, '电商平台重构', '对现有电商平台进行全面重构，采用微前端架构，优化用户体验和性能。', '/uploads/icons/ecommerce.png', 'PUBLIC', 1),
(2, 'App v3.0', '移动应用大版本升级，新增 AI 推荐功能、社交分享模块。', '/uploads/icons/app.png', 'PRIVATE', 1),
(3, '营销活动管理', '营销活动创建、审批、执行全流程管理系统。', '/uploads/icons/marketing.png', 'PRIVATE', 2),
(4, '内部工具平台', '公司内部使用的工具集合平台，包含工单系统、审批流等。', '/uploads/icons/tools.png', 'PRIVATE', 2);

-- ============================================================
-- 4. 项目成员表
-- 权限验证说明：
--   zhangsan(ADMIN)在所有项目中后端返回 my_role=PROJECT_OWNER
--   lisi 在项目3、4为OWNER，在项目1、2为MEMBER
--   wangwu、zhaoliu 在所有参与项目中均为MEMBER
--   sunqi 在项目2、3为MEMBER，不在项目1、4中（可测试非成员访问PUBLIC项目1）
--   zhouba、wujiu 不在任何项目中（可测试锁定/禁用用户无法访问项目）
-- ============================================================
INSERT INTO `project_member` (`project_id`, `user_id`, `role`, `joined_at`) VALUES
(1, 1, 'OWNER',  '2026-04-01 09:00:00'),
(1, 2, 'MEMBER', '2026-04-01 09:30:00'),
(1, 3, 'MEMBER', '2026-04-02 10:00:00'),
(1, 4, 'MEMBER', '2026-04-03 14:00:00'),
(2, 1, 'OWNER',  '2026-04-10 09:00:00'),
(2, 2, 'MEMBER', '2026-04-10 10:00:00'),
(2, 3, 'MEMBER', '2026-04-11 09:00:00'),
(2, 5, 'MEMBER', '2026-04-12 14:00:00'),
(3, 2, 'OWNER',  '2026-04-15 09:00:00'),
(3, 3, 'MEMBER', '2026-04-15 10:00:00'),
(3, 4, 'MEMBER', '2026-04-16 11:00:00'),
(3, 5, 'MEMBER', '2026-04-17 09:00:00'),
(4, 2, 'OWNER',  '2026-04-20 09:00:00'),
(4, 3, 'MEMBER', '2026-04-20 10:00:00'),
(4, 4, 'MEMBER', '2026-04-21 09:00:00');

-- ============================================================
-- 5. 看板列表 (每个项目3列: 待办/进行中/已完成)
-- is_default=1 表示系统默认列（不可删除）
-- color 为列头颜色（十六进制）
-- ============================================================
INSERT INTO `board_column` (`id`, `project_id`, `name`, `sort_order`, `status_mapping`, `is_default`, `color`) VALUES
(1,  1, '待办',   0, 'TODO',        1, '#a39e98'),
(2,  1, '进行中', 1, 'IN_PROGRESS', 1, '#0075de'),
(3,  1, '已完成', 2, 'DONE',        1, '#2fce5a'),
(4,  2, '待办',   0, 'TODO',        1, '#a39e98'),
(5,  2, '进行中', 1, 'IN_PROGRESS', 1, '#0075de'),
(6,  2, '已完成', 2, 'DONE',        1, '#2fce5a'),
(7,  3, '待办',   0, 'TODO',        1, '#a39e98'),
(8,  3, '进行中', 1, 'IN_PROGRESS', 1, '#0075de'),
(9,  3, '已完成', 2, 'DONE',        1, '#2fce5a'),
(10, 4, '待办',   0, 'TODO',        1, '#a39e98'),
(11, 4, '进行中', 1, 'IN_PROGRESS', 1, '#0075de'),
(12, 4, '已完成', 2, 'DONE',        1, '#2fce5a');

-- ============================================================
-- 6. 标签表 (各项目独立标签)
-- ============================================================
INSERT INTO `tag` (`id`, `project_id`, `name`, `color`) VALUES
(1,  1, '前端',   '#0075DE'),
(2,  1, '后端',   '#615D59'),
(3,  1, '用户',   '#1AAE39'),
(4,  1, '性能',   '#A39E98'),
(5,  1, 'Bug',    '#DD5B00'),
(6,  1, 'UI',     '#615D59'),
(7,  1, '第三方', '#A39E98'),
(8,  1, '支付',   '#A39E98'),
(9,  1, 'DevOps', '#0075DE'),
(10, 2, '移动端', '#0075DE'),
(11, 2, 'AI',     '#615D59'),
(12, 2, '社交',   '#1AAE39'),
(13, 3, '营销',   '#DD5B00'),
(14, 3, '审批',   '#615D59'),
(15, 3, '活动',   '#1AAE39'),
(16, 4, '工单',   '#A39E98'),
(17, 4, '审批流', '#615D59'),
(18, 4, '内部',   '#0075DE');

-- ============================================================
-- 7. 任务表 (4个项目共27个任务)
-- 项目1: 12个任务 | 项目2: 6个任务 | 项目3: 5个任务 | 项目4: 4个任务
-- 逾期任务: ID=2(05-15), ID=6(05-12), ID=7(05-14) — 截止日期早于2026-05-16
-- 无负责人任务: ID=4 — 测试"无负责人"边界场景
-- ai_summary: AI自动生成的任务摘要（最大200字符）
-- estimated_hours: AI预估或手动设置的预估工时
-- actual_hours: 任务完成后填写的实际工时（仅DONE状态有值）
-- ============================================================
INSERT INTO `task` (`id`, `project_id`, `column_id`, `title`, `description`, `ai_summary`, `priority`, `status`, `sort_order`, `due_date`, `estimated_hours`, `actual_hours`, `creator_id`, `version`) VALUES
(1,  1, 1, '用户注册登录功能',         '实现邮箱注册、短信验证码登录、OAuth 第三方登录',                                           '实现邮箱注册、验证码登录及OAuth第三方登录',             'HIGH',   'TODO',        0, '2026-05-16', 16.0,  NULL, 1, 0),
(2,  1, 1, '首页性能优化',             'LCP 从 4s 优化至 1.5s 以内',                                                              '优化LCP从4s至1.5s以内',                                'URGENT', 'TODO',        1, '2026-05-15', 8.0,   NULL, 1, 0),
(3,  1, 1, '搜索结果分页异常修复',     '修复搜索结果第二页数据为空',                                                               '修复搜索第二页数据为空问题',                            'MEDIUM', 'TODO',        2, '2026-05-18', 4.0,   NULL, 3, 0),
(4,  1, 1, '暗色模式文字不可见',       '暗色模式下部分页面文字颜色与背景混淆',                                                      '修复暗色模式下文字与背景色混淆',                        'LOW',    'TODO',        3, '2026-05-20', 2.0,   NULL, 4, 0),
(5,  1, 1, '物流对接接口开发',         '对接顺丰、中通物流 API',                                                                   '对接顺丰、中通物流API',                                 'HIGH',   'TODO',        4, '2026-05-17', 12.0,  NULL, 2, 0),
(6,  1, 2, '支付联调（微信+支付宝）',  '对接微信支付和支付宝双渠道，需要处理并发支付、重复支付、超时未支付等异常场景。',                '对接微信/支付宝双渠道支付，含下单/回调/退款接口及异常处理', 'URGENT', 'IN_PROGRESS', 0, '2026-05-12', 24.0,  NULL, 2, 0),
(7,  1, 2, '退款流程开发',             '实现退款申请、审批、退款到账全流程',                                                        '实现退款申请、审批、退款到账全流程',                     'HIGH',   'IN_PROGRESS', 1, '2026-05-14', 16.0,  NULL, 3, 0),
(8,  1, 2, '收银台页面开发',           '前端收银台 UI 开发',                                                                      '前端收银台UI开发',                                     'MEDIUM', 'IN_PROGRESS', 2, '2026-05-19', 8.0,   NULL, 1, 0),
(9,  1, 2, '订单列表接口优化',         '查询性能优化，添加缓存层',                                                                 '查询性能优化，添加缓存层',                              'MEDIUM', 'IN_PROGRESS', 3, '2026-05-20', 6.0,   NULL, 2, 0),
(10, 1, 3, '项目基础架构搭建',         'React 18 + TypeScript + Zustand',                                                          'React 18 + TypeScript + Zustand 架构搭建',              'HIGH',   'DONE',        0, '2026-05-08', 8.0,   10.0, 1, 0),
(11, 1, 3, '数据库表结构设计',         '24 张核心业务表建表',                                                                      '24张核心业务表建表',                                   'HIGH',   'DONE',        1, '2026-05-06', 12.0,  14.0, 2, 0),
(12, 1, 3, 'CI/CD 流水线配置',         'GitHub Actions 自动化构建部署',                                                            'GitHub Actions 自动化构建部署',                        'MEDIUM', 'DONE',        2, '2026-05-05', 4.0,   5.0,  4, 0),
(13, 2, 4, 'AI 推荐引擎集成',          '集成通义千问 API，实现商品推荐功能',                                                        '集成通义千问API实现商品推荐',                           'URGENT', 'TODO',        0, '2026-05-18', 20.0,  NULL, 1, 0),
(14, 2, 4, '社交分享模块',             '支持微信、微博、QQ 分享',                                                                  '支持微信、微博、QQ分享',                               'HIGH',   'TODO',        1, '2026-05-20', 12.0,  NULL, 2, 0),
(15, 2, 5, '首页信息流改版',           '基于用户画像的个性化信息流',                                                                '基于用户画像的个性化信息流',                            'HIGH',   'IN_PROGRESS', 0, '2026-05-16', 16.0,  NULL, 1, 0),
(16, 2, 5, '推送服务优化',             '降低推送延迟至 500ms 以内',                                                                '降低推送延迟至500ms以内',                              'MEDIUM', 'IN_PROGRESS', 1, '2026-05-19', 8.0,   NULL, 3, 0),
(17, 2, 5, '用户画像数据管道',         '构建实时用户行为数据管道',                                                                  '构建实时用户行为数据管道',                              'MEDIUM', 'IN_PROGRESS', 2, '2026-05-22', 24.0,  NULL, 5, 0),
(18, 2, 6, 'App 架构升级',             'React Native 升级至 0.73，适配新架构',                                                     'React Native升级至0.73适配新架构',                     'HIGH',   'DONE',        0, '2026-05-10', 16.0,  18.0, 1, 0),
(19, 3, 7, '618 大促活动页',           '618 促销活动落地页设计与开发',                                                              '618促销活动落地页设计与开发',                           'URGENT', 'TODO',        0, '2026-05-25', 20.0,  NULL, 2, 0),
(20, 3, 7, '活动审批流程',             '实现活动创建-审核-发布的审批流',                                                            '实现活动创建-审核-发布审批流',                          'HIGH',   'TODO',        1, '2026-05-22', 16.0,  NULL, 2, 0),
(21, 3, 8, '优惠券系统对接',           '对接优惠券中心，支持满减/折扣/赠品',                                                        '对接优惠券中心，支持满减/折扣/赠品',                     'HIGH',   'IN_PROGRESS', 0, '2026-05-18', 12.0,  NULL, 3, 0),
(22, 3, 8, '活动数据看板',             '实时展示活动 PV/UV/转化率',                                                                '实时展示活动PV/UV/转化率',                             'MEDIUM', 'IN_PROGRESS', 1, '2026-05-20', 10.0,  NULL, 4, 0),
(23, 3, 9, '活动模板系统',             '可复用的活动创建模板',                                                                     '可复用的活动创建模板',                                 'MEDIUM', 'DONE',        0, '2026-05-12', 8.0,   9.0,  2, 0),
(24, 4, 10, '工单系统核心功能',         '工单创建、分配、流转、关闭全流程',                                                          '工单创建、分配、流转、关闭全流程',                      'HIGH',   'TODO',        0, '2026-05-22', 24.0,  NULL, 2, 0),
(25, 4, 10, '审批流引擎',              '可视化审批流配置与执行引擎',                                                                '可视化审批流配置与执行引擎',                            'HIGH',   'TODO',        1, '2026-05-25', 32.0,  NULL, 2, 0),
(26, 4, 11, '权限管理模块',            'RBAC 权限模型，支持角色、权限、菜单配置',                                                   'RBAC权限模型，支持角色/权限/菜单配置',                  'MEDIUM', 'IN_PROGRESS', 0, '2026-05-20', 16.0,  NULL, 3, 0),
(27, 4, 12, '基础框架搭建',            'Spring Boot 3 + MyBatis Plus 项目初始化',                                                  'Spring Boot 3 + MyBatis Plus 项目初始化',              'HIGH',   'DONE',        0, '2026-05-08', 8.0,   7.0,  2, 0);

-- ============================================================
-- 8. 任务负责人表
-- 任务4(暗色模式文字不可见)无负责人 — 测试"无负责人"边界场景
-- ============================================================
INSERT INTO `task_assignee` (`task_id`, `user_id`, `assigned_at`) VALUES
(1,  1, '2026-05-08 10:00:00'),
(1,  2, '2026-05-08 10:00:00'),
(2,  1, '2026-05-09 09:00:00'),
(3,  3, '2026-05-10 11:00:00'),
(5,  2, '2026-05-11 09:00:00'),
(5,  3, '2026-05-11 09:00:00'),
(6,  2, '2026-05-10 14:30:00'),
(7,  3, '2026-05-12 09:00:00'),
(8,  1, '2026-05-13 10:00:00'),
(9,  2, '2026-05-14 09:00:00'),
(10, 1, '2026-05-03 09:00:00'),
(11, 2, '2026-05-03 10:00:00'),
(11, 3, '2026-05-03 10:00:00'),
(12, 4, '2026-05-04 09:00:00'),
(13, 1, '2026-05-12 10:00:00'),
(14, 2, '2026-05-13 09:00:00'),
(14, 5, '2026-05-13 09:30:00'),
(15, 1, '2026-05-14 10:00:00'),
(16, 3, '2026-05-15 09:00:00'),
(17, 5, '2026-05-15 14:00:00'),
(18, 1, '2026-05-08 09:00:00'),
(19, 2, '2026-05-16 09:00:00'),
(19, 3, '2026-05-16 09:30:00'),
(20, 2, '2026-05-17 10:00:00'),
(21, 3, '2026-05-18 09:00:00'),
(22, 4, '2026-05-18 14:00:00'),
(23, 2, '2026-05-10 09:00:00'),
(24, 2, '2026-05-18 09:00:00'),
(24, 3, '2026-05-18 09:30:00'),
(25, 2, '2026-05-19 10:00:00'),
(26, 3, '2026-05-19 14:00:00'),
(26, 4, '2026-05-19 14:30:00'),
(27, 2, '2026-05-06 09:00:00');

-- ============================================================
-- 9. 任务标签关联表
-- ============================================================
INSERT INTO `task_tag` (`task_id`, `tag_id`) VALUES
(1,  1),
(1,  3),
(2,  1),
(2,  4),
(3,  5),
(5,  2),
(5,  7),
(6,  8),
(6,  2),
(7,  8),
(7,  2),
(8,  1),
(8,  8),
(9,  2),
(10, 1),
(11, 2),
(12, 9),
(13, 11),
(13, 10),
(14, 12),
(14, 10),
(15, 10),
(15, 11),
(16, 10),
(17, 11),
(18, 10),
(19, 13),
(19, 15),
(20, 13),
(20, 14),
(21, 13),
(22, 13),
(23, 15),
(24, 16),
(24, 17),
(25, 17),
(26, 17),
(26, 18),
(27, 18);

-- ============================================================
-- 10. 评论表 (含@提及和嵌套回复)
-- @提及使用 @nickname 格式，与后端解析逻辑一致
-- ============================================================
INSERT INTO `comment` (`id`, `task_id`, `content`, `author_id`, `parent_id`, `mentions`) VALUES
(1,  6, '微信支付沙箱环境已配置完成，可以开始联调了',                                                   2, NULL, NULL),
(2,  6, '收到，我今天开始对接微信支付API',                                                             1, 1, NULL),
(3,  6, '@wangwu 退款接口的返回格式确认一下，和微信文档不一致',                                        2, NULL, '[3]'),
(4,  7, '退款流程需要增加审批环节，产品经理确认中',                                                     3, NULL, NULL),
(5,  1, '注册接口已开发完成，等待验证码服务对接',                                                       1, NULL, NULL),
(6,  1, '@lisi 验证码服务你那边什么时候能好？',                                                         1, 5, '[2]'),
(7,  2, 'LCP 已从 4s 优化到 2.1s，还需要继续优化图片加载',                                              1, NULL, NULL),
(8,  10, '基础架构已搭建完成，Zustand 状态管理方案已确定',                                              1, NULL, NULL),
(9,  11, '24张表结构设计完成，已提交评审',                                                              2, NULL, NULL),
(10, 12, 'CI/CD 流水线已配置，支持自动构建和部署到测试环境',                                             4, NULL, NULL),
(11, 13, '通义千问 API 已申请，等待审批通过',                                                           1, NULL, NULL),
(12, 15, '信息流推荐算法初步方案已完成，准确率 78%',                                                    1, NULL, NULL),
(13, 15, '@sunqi 用户画像数据准备好了吗？推荐引擎依赖画像特征',                                         1, NULL, '[5]'),
(14, 19, '618 活动页设计稿已出，需要评审',                                                              2, NULL, NULL),
(15, 21, '优惠券中心接口文档已收到，开始对接',                                                          3, NULL, NULL),
(16, 24, '工单系统需求已确认，开始技术方案设计',                                                         2, NULL, NULL),
(17, 26, 'RBAC 模型参考了 Casbin 方案',                                                                3, NULL, NULL),
(18, 26, '@zhaoliu 审批流的权限节点你来设计一下',                                                       3, 17, '[4]');

-- ============================================================
-- 11. 附件表
-- ============================================================
INSERT INTO `attachment` (`task_id`, `file_name`, `file_path`, `file_size`, `file_type`, `uploader_id`) VALUES
(6,  '微信支付接口文档v3.pdf',  '/uploads/attachments/wxpay_doc.pdf',      2048576, 'application/pdf', 2),
(6,  '支付宝对接指南.pdf',      '/uploads/attachments/alipay_guide.pdf',   1536000, 'application/pdf', 2),
(11, '数据库ER图.png',          '/uploads/attachments/db_er_diagram.png',  512000,  'image/png',       2),
(10, '技术架构图.png',          '/uploads/attachments/arch_diagram.png',   384000,  'image/png',       1),
(13, 'AI推荐方案.docx',         '/uploads/attachments/ai_recommend.docx',  1024000, 'application/docx', 1),
(19, '618活动设计稿.pdf',       '/uploads/attachments/618_design.pdf',     3072000, 'application/pdf', 2),
(24, '工单系统需求文档.pdf',    '/uploads/attachments/ticket_req.pdf',     819200,  'application/pdf', 2),
(27, '内部工具技术选型.pdf',    '/uploads/attachments/tech_stack.pdf',     256000,  'application/pdf', 2);

-- ============================================================
-- 12. 通知表
-- type 枚举值: DEADLINE_REMINDER / OVERDUE_WARNING / STATUS_CHANGED / MENTION / ASSIGNEE_CHANGED / AI_OPERATION / HEALTH_WARNING
-- related_type 枚举值: TASK / PROJECT / RULE / COMMENT
-- is_read: 0=未读, 1=已读
-- ============================================================
INSERT INTO `notification` (`id`, `user_id`, `type`, `title`, `content`, `related_id`, `related_type`, `is_read`) VALUES
(1,  1, 'OVERDUE_WARNING',  '逾期警告',   '支付联调任务已逾期 2 天',                                             6,  'TASK',    0),
(2,  1, 'DEADLINE_REMINDER','截止提醒',   '首页性能优化将于明天到期',                                            2,  'TASK',    0),
(3,  1, 'STATUS_CHANGED',   '状态变更',   '物流对接已变更为"已完成"',                                            5,  'TASK',    0),
(4,  1, 'MENTION',         '@提及',      'lisi 在评论中提到了你',                                               6,  'TASK',    0),
(5,  1, 'ASSIGNEE_CHANGED', '成员变更',   '批量更新了 5 个任务的优先级',                                        NULL, 'PROJECT', 1),
(6,  1, 'STATUS_CHANGED',   '任务完成',   '用户注册登录功能已完成',                                              1,  'TASK',    1),
(7,  2, 'DEADLINE_REMINDER','截止提醒',  '支付联调（微信+支付宝）已逾期，请尽快处理',                             6,  'TASK',    0),
(8,  2, 'MENTION',         '@提及',      'zhangsan 在评论中提到了你',                                           6,  'TASK',    0),
(9,  2, 'DEADLINE_REMINDER','截止提醒',  '618 大促活动页将于 2026-05-25 到期',                                   19, 'TASK',    0),
(10, 3, 'STATUS_CHANGED',   '状态变更',   '退款流程开发状态已更新',                                              7,  'TASK',    0),
(11, 3, 'ASSIGNEE_CHANGED', '成员变更',   '你被分配了任务：搜索结果分页异常修复',                                  3,  'TASK',    1),
(12, 3, 'MENTION',         '@提及',      'lisi 在评论中提到了你',                                               6,  'TASK',    0),
(13, 4, 'ASSIGNEE_CHANGED', '成员变更',   '你被分配了任务：暗色模式文字不可见',                                    4,  'TASK',    1),
(14, 5, 'MENTION',         '@提及',      'zhangsan 在评论中提到了你',                                           15, 'TASK',    0),
(15, 2, 'STATUS_CHANGED',   '状态变更',   '活动模板系统已完成',                                                 23, 'TASK',    1),
(16, 1, 'AI_OPERATION',    'AI操作完成', 'AI已将2个逾期任务优先级提升为紧急',                                     6,  'TASK',    0),
(17, 2, 'AI_OPERATION',    'AI操作完成', 'AI已为支付联调任务推荐标签：支付、后端',                                 6,  'TASK',    0),
(18, 1, 'HEALTH_WARNING',  '项目健康预警','电商平台重构项目健康度评分72分（注意），存在3个逾期任务',                  1,  'PROJECT', 0);

-- ============================================================
-- 13. 任务状态历史表
-- ============================================================
INSERT INTO `task_status_history` (`task_id`, `old_status`, `new_status`, `changed_by`, `changed_at`) VALUES
(1,  NULL,          'TODO',        1, '2026-05-08 10:00:00'),
(2,  NULL,          'TODO',        1, '2026-05-09 09:00:00'),
(3,  NULL,          'TODO',        3, '2026-05-10 11:00:00'),
(4,  NULL,          'TODO',        4, '2026-05-10 14:00:00'),
(5,  NULL,          'TODO',        2, '2026-05-11 09:00:00'),
(6,  NULL,          'TODO',        2, '2026-05-10 10:00:00'),
(6,  'TODO',        'IN_PROGRESS', 1, '2026-05-10 14:30:00'),
(7,  NULL,          'TODO',        3, '2026-05-12 09:00:00'),
(7,  'TODO',        'IN_PROGRESS', 3, '2026-05-12 14:00:00'),
(8,  NULL,          'TODO',        1, '2026-05-13 10:00:00'),
(8,  'TODO',        'IN_PROGRESS', 1, '2026-05-14 09:00:00'),
(9,  NULL,          'TODO',        2, '2026-05-14 09:00:00'),
(9,  'TODO',        'IN_PROGRESS', 2, '2026-05-15 10:00:00'),
(10, NULL,          'TODO',        1, '2026-05-03 09:00:00'),
(10, 'TODO',        'IN_PROGRESS', 1, '2026-05-04 10:00:00'),
(10, 'IN_PROGRESS', 'DONE',        1, '2026-05-08 16:00:00'),
(11, NULL,          'TODO',        2, '2026-05-03 10:00:00'),
(11, 'TODO',        'IN_PROGRESS', 2, '2026-05-04 14:00:00'),
(11, 'IN_PROGRESS', 'DONE',        2, '2026-05-06 15:00:00'),
(12, NULL,          'TODO',        4, '2026-05-04 09:00:00'),
(12, 'TODO',        'IN_PROGRESS', 4, '2026-05-04 14:00:00'),
(12, 'IN_PROGRESS', 'DONE',        4, '2026-05-05 18:00:00'),
(13, NULL,          'TODO',        1, '2026-05-12 10:00:00'),
(14, NULL,          'TODO',        2, '2026-05-13 09:00:00'),
(15, NULL,          'TODO',        1, '2026-05-14 10:00:00'),
(15, 'TODO',        'IN_PROGRESS', 1, '2026-05-15 09:00:00'),
(16, NULL,          'TODO',        3, '2026-05-15 09:00:00'),
(16, 'TODO',        'IN_PROGRESS', 3, '2026-05-16 10:00:00'),
(17, NULL,          'TODO',        5, '2026-05-15 14:00:00'),
(17, 'TODO',        'IN_PROGRESS', 5, '2026-05-16 09:00:00'),
(18, NULL,          'TODO',        1, '2026-05-08 09:00:00'),
(18, 'TODO',        'IN_PROGRESS', 1, '2026-05-09 10:00:00'),
(18, 'IN_PROGRESS', 'DONE',        1, '2026-05-10 16:00:00'),
(19, NULL,          'TODO',        2, '2026-05-16 09:00:00'),
(20, NULL,          'TODO',        2, '2026-05-17 10:00:00'),
(21, NULL,          'TODO',        3, '2026-05-18 09:00:00'),
(21, 'TODO',        'IN_PROGRESS', 3, '2026-05-19 10:00:00'),
(22, NULL,          'TODO',        4, '2026-05-18 14:00:00'),
(22, 'TODO',        'IN_PROGRESS', 4, '2026-05-19 09:00:00'),
(23, NULL,          'TODO',        2, '2026-05-10 09:00:00'),
(23, 'TODO',        'IN_PROGRESS', 2, '2026-05-11 10:00:00'),
(23, 'IN_PROGRESS', 'DONE',        2, '2026-05-12 16:00:00'),
(24, NULL,          'TODO',        2, '2026-05-18 09:00:00'),
(25, NULL,          'TODO',        2, '2026-05-19 10:00:00'),
(26, NULL,          'TODO',        3, '2026-05-19 14:00:00'),
(26, 'TODO',        'IN_PROGRESS', 3, '2026-05-20 09:00:00'),
(27, NULL,          'TODO',        2, '2026-05-06 09:00:00'),
(27, 'TODO',        'IN_PROGRESS', 2, '2026-05-07 10:00:00'),
(27, 'IN_PROGRESS', 'DONE',        2, '2026-05-08 16:00:00');

-- ============================================================
-- 14. 操作日志表
-- source: MANUAL=手动操作, AI_ASSISTED=AI辅助, AUTOMATION=自动化规则触发
-- ============================================================
INSERT INTO `operation_log` (`user_id`, `module`, `action`, `target_id`, `detail`, `ip`, `source`) VALUES
(1, 'PROJECT',  'CREATE',       1,    '创建项目：电商平台重构',                             '192.168.1.100', 'MANUAL'),
(1, 'PROJECT',  'CREATE',       2,    '创建项目：App v3.0',                                '192.168.1.100', 'MANUAL'),
(1, 'MEMBER',   'INVITE',       1,    '邀请 李四(lisi) 加入项目电商平台重构',                 '192.168.1.100', 'MANUAL'),
(1, 'MEMBER',   'INVITE',       1,    '邀请 王五(wangwu) 加入项目电商平台重构',               '192.168.1.100', 'MANUAL'),
(1, 'MEMBER',   'INVITE',       1,    '邀请 赵六(zhaoliu) 加入项目电商平台重构',              '192.168.1.100', 'MANUAL'),
(1, 'TASK',     'CREATE',       1,    '创建任务：用户注册登录功能',                           '192.168.1.100', 'MANUAL'),
(1, 'TASK',     'CREATE',       2,    '创建任务：首页性能优化',                              '192.168.1.100', 'MANUAL'),
(1, 'TASK',     'CREATE',       10,   '创建任务：项目基础架构搭建',                           '192.168.1.100', 'MANUAL'),
(1, 'TASK',     'STATUS_CHANGE',10,   '任务状态从 IN_PROGRESS 变更为 DONE',                  '192.168.1.100', 'MANUAL'),
(2, 'TASK',     'CREATE',       6,    '创建任务：支付联调（微信+支付宝）',                     '192.168.1.101', 'MANUAL'),
(2, 'TASK',     'STATUS_CHANGE',6,    '任务状态从 TODO 变更为 IN_PROGRESS',                  '192.168.1.101', 'MANUAL'),
(2, 'PROJECT',  'CREATE',       3,    '创建项目：营销活动管理',                              '192.168.1.101', 'MANUAL'),
(2, 'PROJECT',  'CREATE',       4,    '创建项目：内部工具平台',                              '192.168.1.101', 'MANUAL'),
(2, 'MEMBER',   'INVITE',       3,    '邀请 王五(wangwu) 加入项目营销活动管理',               '192.168.1.101', 'MANUAL'),
(2, 'MEMBER',   'INVITE',       3,    '邀请 赵六(zhaoliu) 加入项目营销活动管理',              '192.168.1.101', 'MANUAL'),
(2, 'MEMBER',   'INVITE',       3,    '邀请 孙七(sunqi) 加入项目营销活动管理',                '192.168.1.101', 'MANUAL'),
(2, 'TASK',     'CREATE',       19,   '创建任务：618 大促活动页',                            '192.168.1.101', 'MANUAL'),
(3, 'TASK',     'CREATE',       3,    '创建任务：搜索结果分页异常修复',                        '192.168.1.102', 'MANUAL'),
(3, 'TASK',     'STATUS_CHANGE',7,    '任务状态从 TODO 变更为 IN_PROGRESS',                  '192.168.1.102', 'MANUAL'),
(4, 'TASK',     'CREATE',       4,    '创建任务：暗色模式文字不可见',                          '192.168.1.103', 'MANUAL'),
(5, 'TASK',     'STATUS_CHANGE',17,   '任务状态从 TODO 变更为 IN_PROGRESS',                  '192.168.1.104', 'MANUAL'),
(1, 'TASK',     'BATCH_UPDATE', NULL, 'AI批量更新2个逾期任务优先级为URGENT',                  '192.168.1.100', 'AI_ASSISTED'),
(1, 'TASK',     'CREATE',       13,   'AI创建任务：AI推荐引擎集成',                           '192.168.1.100', 'AI_ASSISTED'),
(2, 'TASK',     'PRIORITY_CHANGE', 6, '自动化规则触发：逾期任务优先级提升为URGENT',            '192.168.1.101', 'AUTOMATION');

-- ============================================================
-- 15. 项目模板表 (8个系统预置模板)
-- ============================================================
INSERT INTO `project_template` (`id`, `name`, `description`, `category`, `is_system`, `column_config`, `default_tasks`, `created_by`) VALUES
(1, '软件开发（Scrum）', '适用于敏捷 Scrum 团队的看板模板', 'DEVELOPMENT', 1, '[{"name":"待办","status_mapping":"TODO","position":0},{"name":"Sprint 规划","status_mapping":"TODO","position":1},{"name":"进行中","status_mapping":"IN_PROGRESS","position":2},{"name":"测试","status_mapping":"IN_PROGRESS","position":3},{"name":"已完成","status_mapping":"DONE","position":4}]', NULL, NULL),
(2, '软件开发（Kanban）', '适用于看板方法团队的看板模板', 'DEVELOPMENT', 1, '[{"name":"待办","status_mapping":"TODO","position":0},{"name":"进行中","status_mapping":"IN_PROGRESS","position":1},{"name":"测试","status_mapping":"IN_PROGRESS","position":2},{"name":"已完成","status_mapping":"DONE","position":3}]', NULL, NULL),
(3, 'Bug 跟踪', '适用于缺陷跟踪和修复流程', 'DEVELOPMENT', 1, '[{"name":"待修复","status_mapping":"TODO","position":0},{"name":"修复中","status_mapping":"IN_PROGRESS","position":1},{"name":"验证中","status_mapping":"IN_PROGRESS","position":2},{"name":"已关闭","status_mapping":"DONE","position":3}]', NULL, NULL),
(4, '产品发布', '适用于产品版本发布管理', 'DEVELOPMENT', 1, '[{"name":"规划","status_mapping":"TODO","position":0},{"name":"开发","status_mapping":"IN_PROGRESS","position":1},{"name":"测试","status_mapping":"IN_PROGRESS","position":2},{"name":"预发布","status_mapping":"IN_PROGRESS","position":3},{"name":"已发布","status_mapping":"DONE","position":4}]', NULL, NULL),
(5, '市场营销', '适用于营销活动策划与执行', 'MARKETING', 1, '[{"name":"策划","status_mapping":"TODO","position":0},{"name":"执行","status_mapping":"IN_PROGRESS","position":1},{"name":"审核","status_mapping":"IN_PROGRESS","position":2},{"name":"已发布","status_mapping":"DONE","position":3}]', NULL, NULL),
(6, '客户支持', '适用于客户问题处理流程', 'OPERATIONS', 1, '[{"name":"待处理","status_mapping":"TODO","position":0},{"name":"处理中","status_mapping":"IN_PROGRESS","position":1},{"name":"等待客户","status_mapping":"IN_PROGRESS","position":2},{"name":"已解决","status_mapping":"DONE","position":3}]', NULL, NULL),
(7, '招聘管理', '适用于人才招聘全流程', 'OPERATIONS', 1, '[{"name":"简历筛选","status_mapping":"TODO","position":0},{"name":"面试","status_mapping":"IN_PROGRESS","position":1},{"name":"Offer","status_mapping":"IN_PROGRESS","position":2},{"name":"已入职","status_mapping":"DONE","position":3}]', NULL, NULL),
(8, '通用项目', '适用于一般项目管理的简洁看板', 'GENERAL', 1, '[{"name":"待办","status_mapping":"TODO","position":0},{"name":"进行中","status_mapping":"IN_PROGRESS","position":1},{"name":"已完成","status_mapping":"DONE","position":2}]', NULL, NULL);

-- ============================================================
-- 16. 用户技能标签表
-- 用于AI智能分配：根据用户技能标签匹配任务，结合当前工作量推荐负责人
-- ============================================================
INSERT INTO `user_skill` (`user_id`, `skill_tag`) VALUES
(1, 'React'),
(1, 'TypeScript'),
(1, '前端架构'),
(1, '性能优化'),
(2, 'Java'),
(2, 'Spring Boot'),
(2, '后端'),
(2, '支付'),
(3, '测试'),
(3, 'Bug修复'),
(3, '后端'),
(4, 'UI设计'),
(4, 'CSS'),
(4, '前端'),
(5, 'AI'),
(5, 'Python'),
(5, '数据分析'),
(5, '推荐算法');

-- ============================================================
-- 17. 任务度量统计表
-- 按 project_id + tag 聚合，用于AI工时预估
-- 统计口径：仅统计已完成任务（status=DONE）
-- sample_count 为该标签下已完成任务的数量
-- ============================================================
INSERT INTO `task_metrics` (`project_id`, `tag`, `avg_estimated_hours`, `avg_actual_hours`, `completion_rate`, `sample_count`) VALUES
(1, '前端',   8.0,  10.0,  100.00, 1),
(1, '后端',   12.0, 14.0,  100.00, 1),
(1, 'DevOps', 4.0,  5.0,   100.00, 1),
(2, '移动端', 16.0, 18.0,  100.00, 1),
(3, '活动',   8.0,  9.0,   100.00, 1),
(4, '内部',   8.0,  7.0,   100.00, 1);

-- ============================================================
-- 18. AI操作日志表
-- 记录完整交互链路：prompt → thinking → tool_calls → output → diff → user_action → executed
-- source: AI_ASSISTED=用户通过命令面板触发, AUTOMATION=自动化规则触发
-- user_action: CONFIRMED/REJECTED/MODIFIED/AUTOMATION_FAILED
-- ============================================================
INSERT INTO `ai_operation_log` (`id`, `user_id`, `project_id`, `prompt`, `ai_thinking`, `tool_calls`, `ai_output`, `diff_preview`, `user_action`, `executed_action`, `source`) VALUES
(1, 1, 1, '把所有逾期任务标记为紧急', '正在分析您的指令...搜索逾期任务...找到3个逾期任务', '[{"tool":"search_tasks","params":{"overdue":true,"project_id":1},"result_count":3},{"tool":"batch_update_tasks","params":{"project_id":1,"task_ids":[2,6,7],"updates":{"priority":"URGENT"}},"result_count":3}]', '已找到3个逾期任务，建议将优先级提升为紧急', '[{"task":"首页性能优化","field":"priority","old":"URGENT","new":"URGENT"},{"task":"支付联调（微信+支付宝）","field":"priority","old":"URGENT","new":"URGENT"},{"task":"退款流程开发","field":"priority","old":"HIGH","new":"URGENT"}]', 'CONFIRMED', '[{"action":"batch_update","task_ids":[2,6,7],"updates":{"priority":"URGENT"}}]', 'AI_ASSISTED'),
(2, 2, 1, '为支付联调任务推荐标签', '分析任务描述...匹配项目历史标签...', '[{"tool":"suggest_tags","params":{"description":"对接微信支付和支付宝双渠道","project_context":"电商平台重构"},"result_count":4}]', '推荐标签：支付(95%)、后端(88%)、第三方对接(70%)、联调(65%)', NULL, 'CONFIRMED', '[{"action":"add_tags","task_id":6,"tags":["支付","后端"]}]', 'AI_ASSISTED'),
(3, 1, 1, '分析项目健康度', '正在计算项目健康度评分...进度健康25/30，逾期风险20/30，负载均衡15/20，阻塞识别8/10，优先级分布5/10', '[{"tool":"analyze_project_health","params":{"project_id":1},"result_count":1}]', '项目健康度：72/100（注意）\n风险项：3个任务逾期>3天，张三负载8个任务\n建议：支付联调提升为紧急，张三2个低优先级任务转给李四', NULL, NULL, NULL, 'AI_ASSISTED'),
(4, 2, 3, NULL, '自动化规则触发：逾期任务优先级提升', '[{"tool":"update_task","params":{"task_id":6,"project_id":1,"updates":{"priority":"URGENT"}}}]', '逾期任务支付联调优先级已提升为URGENT', NULL, 'AUTOMATION_FAILED', NULL, 'AUTOMATION');

-- ============================================================
-- 19. AI对话会话表
-- 每次打开命令面板或知识库问答时创建一个新会话
-- ============================================================
INSERT INTO `ai_chat_session` (`id`, `user_id`, `project_id`, `title`, `created_at`) VALUES
(1, 1, 1, '把所有逾期任务标记为紧急',       '2026-05-16 09:30:00'),
(2, 2, 1, '为支付联调任务推荐标签',          '2026-05-16 10:00:00'),
(3, 1, 1, '分析项目健康度',                 '2026-05-16 11:00:00'),
(4, 1, 1, '本周到期的任务有哪些',            '2026-05-16 14:00:00');

-- ============================================================
-- 20. AI对话消息表
-- role: user=用户消息, assistant=AI回复, system=系统提示
-- tool_calls: AI调用的工具链（JSON数组）
-- references: RAG检索来源（JSON数组，P3知识库问答时使用）
-- ============================================================
INSERT INTO `ai_chat_message` (`id`, `session_id`, `role`, `content`, `tool_calls`, `references`) VALUES
(1,  1, 'user',      '把所有逾期任务标记为紧急',                                                                                          NULL, NULL),
(2,  1, 'assistant', '正在分析您的指令...搜索逾期任务...找到3个逾期任务',                                                                   NULL, NULL),
(3,  1, 'assistant', '已找到3个逾期任务，建议将优先级提升为紧急',  '[{"tool":"search_tasks","params":{"overdue":true},"result_count":3},{"tool":"batch_update_tasks","params":{"task_ids":[2,6,7],"updates":{"priority":"URGENT"}},"result_count":3}]', NULL),
(4,  1, 'assistant', '变更预览：首页性能优化(URGENT→URGENT)、支付联调(URGENT→URGENT)、退款流程(HIGH→URGENT)，确认将以上变更应用到3个任务？',  NULL, NULL),
(5,  2, 'user',      '为支付联调任务推荐标签',                                                                                          NULL, NULL),
(6,  2, 'assistant', '推荐标签：支付(95%)、后端(88%)、第三方对接(70%)、联调(65%)',                                                          '[{"tool":"suggest_tags","params":{"description":"对接微信支付和支付宝双渠道"},"result_count":4}]', NULL),
(7,  3, 'user',      '分析项目健康度',                                                                                                  NULL, NULL),
(8,  3, 'assistant', '项目健康度：72/100（注意）\n风险项：3个任务逾期>3天，张三负载8个任务\n建议：支付联调提升为紧急，张三2个低优先级任务转给李四',  '[{"tool":"analyze_project_health","params":{"project_id":1},"result_count":1}]', NULL),
(9,  4, 'user',      '本周到期的任务有哪些',                                                                                             NULL, NULL),
(10, 4, 'assistant', '本周共有5个到期任务：\n1. 用户注册登录功能（高优先级，05-16到期）\n2. 首页性能优化（紧急，已逾期）\n3. 支付联调（紧急，已逾期）\n4. 物流对接（高优先级，05-17到期）\n5. 退款流程（高优先级，已逾期）', '[{"tool":"search_tasks","params":{"project_id":1,"overdue":true},"result_count":5}]', NULL);

-- ============================================================
-- 21. 自动化规则表
-- trigger_type: TASK_CREATED/TASK_STATUS_CHANGED/TASK_DEADLINE_APPROACHING/TASK_OVERDUE/SCHEDULED
-- conditions: JSON数组，条件列表（可选）
-- actions: JSON数组，动作列表
-- consecutive_failures: 连续失败次数，达3次自动禁用
-- ============================================================
INSERT INTO `automation_rule` (`id`, `project_id`, `name`, `trigger_type`, `trigger_config`, `conditions`, `actions`, `enabled`, `consecutive_failures`, `created_by`) VALUES
(1, 1, '高优先级自动通知',       'TASK_CREATED',       NULL,                                                                                          '[{"field":"priority","operator":"=","value":"URGENT"}]',                         '[{"type":"SEND_NOTIFICATION","config":{"target":"PROJECT_OWNER","message":"新建紧急任务：{{task_title}}"}}]',                    1, 0, 1),
(2, 1, '逾期自动升级',           'TASK_OVERDUE',        NULL,                                                                                          '[{"field":"overdue_days","operator":">","value":3}]',                             '[{"type":"SET_PRIORITY","config":{"priority":"URGENT"}},{"type":"SEND_NOTIFICATION","config":{"target":"ASSIGNEE","message":"任务{{task_title}}已逾期超过3天，优先级已提升为紧急"}}]', 1, 0, 1),
(3, 1, '每周进度报告',           'SCHEDULED',           '{"cron":"0 0 9 ? * MON"}',                                                                     NULL,                                                                             '[{"type":"AI_HEALTH_ANALYSIS","config":{}},{"type":"SEND_NOTIFICATION","config":{"target":"PROJECT_OWNER","message":"本周项目健康度报告已生成"}}]', 1, 0, 1),
(4, 3, '活动任务自动打标签',      'TASK_CREATED',       NULL,                                                                                          '[{"field":"description","operator":"contains","value":"活动"}]',                  '[{"type":"ADD_TAGS","config":{"tags":["活动"]}}]',                                                                               1, 0, 2),
(5, 2, '截止日期临近提醒',        'TASK_DEADLINE_APPROACHING', NULL,                                                                                     '[{"field":"deadline_hours","operator":"<=","value":24}]',                         '[{"type":"SEND_NOTIFICATION","config":{"target":"ASSIGNEE","message":"任务{{task_title}}将于24小时内到期"}}]',                     1, 0, 1);

-- ============================================================
-- 22. 知识库表 (P3)
-- 每个项目可创建知识库，配置分块参数
-- ============================================================
INSERT INTO `knowledge_base` (`id`, `project_id`, `name`, `description`, `chunk_size`, `chunk_overlap`, `top_k`, `similarity_threshold`) VALUES
(1, 1, '电商平台技术文档', '电商平台重构项目的技术文档、接口规范、架构设计', 2000, 200, 5, 0.50),
(2, 3, '营销活动规范',     '营销活动管理流程规范、审批制度、活动模板说明',     2000, 200, 5, 0.50);

-- ============================================================
-- 23. 文档表 (P3)
-- status: PENDING=待处理, PROCESSING=处理中, COMPLETED=已完成, PROCESSING_FAILED=处理失败
-- ============================================================
INSERT INTO `document` (`id`, `knowledge_base_id`, `file_name`, `file_url`, `chunk_count`, `status`) VALUES
(1, 1, '电商平台技术架构.md',      '/uploads/knowledge/ecommerce-arch.md',       3, 'COMPLETED'),
(2, 1, '支付接口规范v3.pdf',       '/uploads/knowledge/payment-api-v3.pdf',      5, 'COMPLETED'),
(3, 1, 'Sprint10回顾会议纪要.md',  '/uploads/knowledge/sprint10-review.md',      2, 'COMPLETED'),
(4, 2, '营销活动审批流程.docx',    '/uploads/knowledge/marketing-approval.docx', 4, 'COMPLETED'),
(5, 1, '微前端架构设计.md',        '/uploads/knowledge/micro-frontend.md',       0, 'PENDING');

-- ============================================================
-- 24. 文档分块表 (P3)
-- chunk_index: 在原文中的序号（从0开始）
-- embedding: 向量嵌入JSON（由Embedding API生成，此处仅示例结构）
-- ============================================================
INSERT INTO `document_chunk` (`id`, `document_id`, `content`, `chunk_index`, `embedding`) VALUES
(1,  1, '电商平台重构技术架构\n\n本项目采用微前端架构，主框架使用 qiankun，子应用基于 React 18 + TypeScript。状态管理采用 Zustand（slice模式按功能模块拆分）。后端使用 Spring Boot 3 + MyBatis Plus，数据库 MySQL 8，缓存 Redis。', 0, NULL),
(2,  1, '核心模块划分：\n1. 用户中心：注册、登录、权限管理\n2. 商品中心：商品CRUD、分类、搜索\n3. 订单中心：下单、支付、退款\n4. 营销中心：优惠券、活动、推荐\n5. 物流中心：物流查询、运费计算', 1, NULL),
(3,  1, '部署架构：\n- 前端：Nginx 静态资源 + CDN 加速\n- 后端：K8s 容器化部署，HPA 自动扩缩容\n- 数据库：主从复制 + 读写分离\n- 缓存：Redis Cluster 三主三从\n- 消息队列：RocketMQ', 2, NULL),
(4,  2, '支付接口规范 v3\n\n1. 统一下单接口 POST /api/pay/order\n   - 参数：amount, currency, subject, notify_url\n   - 返回：order_id, pay_url\n\n2. 支付回调接口 POST /api/pay/notify\n   - 验签规则：RSA2\n   - 幂等处理：基于 order_id 去重', 0, NULL),
(5,  2, '3. 退款接口 POST /api/pay/refund\n   - 参数：order_id, refund_amount, refund_reason\n   - 返回：refund_id, status\n\n4. 查询接口 GET /api/pay/query\n   - 参数：order_id\n   - 返回：order_status, pay_time\n\n异常处理：并发支付使用分布式锁，超时未支付30分钟自动关闭订单', 1, NULL),
(6,  3, 'Sprint 10 回顾会议纪要\n\n日期：2026-05-10\n参与人：张三、李四、王五、赵六\n\n已完成：\n- 项目基础架构搭建\n- 数据库表结构设计\n- CI/CD 流水线配置', 0, NULL),
(7,  3, '遗留 Bug 3 个：\n1. 用户头像上传偶发不显示（高）\n2. 搜索结果分页异常（中）\n3. 暗色模式文字不可见（低）\n\n改进措施：\n- 加强 Code Review\n- 增加前端 E2E 测试覆盖率\n- 优化需求评审流程', 1, NULL),
(8,  4, '营销活动审批流程\n\n一、活动创建\n1. 市场部提交活动方案\n2. 方案需包含：活动名称、时间、预算、目标KPI\n3. 系统自动生成活动编号', 0, NULL),
(9,  4, '二、审批流程\n1. 直属上级审批（1个工作日内）\n2. 财务部预算审批（2个工作日内）\n3. 总经理审批（预算>10万时）\n\n三、活动执行\n1. 审批通过后自动创建活动看板\n2. 分配任务给执行团队\n3. 实时监控活动数据', 1, NULL),
(10, 4, '四、活动总结\n1. 活动结束后3个工作日内提交总结报告\n2. 报告需包含：实际花费、达成KPI、ROI分析\n3. 归档至知识库供后续参考\n\n五、紧急活动\n1. 紧急活动可走快速审批通道\n2. 需总经理口头授权后补签', 2, NULL);
