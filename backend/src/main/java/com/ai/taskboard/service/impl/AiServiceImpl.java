package com.ai.taskboard.service.impl;

import com.ai.taskboard.config.AiLlmConfig;
import com.ai.taskboard.dto.ai.*;
import com.ai.taskboard.entity.*;
import com.ai.taskboard.mapper.*;
import com.ai.taskboard.service.AiService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiServiceImpl implements AiService {

    private final AiLlmConfig aiLlmConfig;
    private final AiOperationLogMapper aiOperationLogMapper;
    private final AiChatSessionMapper aiChatSessionMapper;
    private final AiChatMessageMapper aiChatMessageMapper;
    private final TaskMapper taskMapper;
    private final TaskAssigneeMapper taskAssigneeMapper;
    private final TaskTagMapper taskTagMapper;
    private final TagMapper tagMapper;
    private final UserMapper userMapper;
    private final UserSkillMapper userSkillMapper;
    private final TaskMetricsMapper taskMetricsMapper;
    private final ProjectMapper projectMapper;
    private final ProjectMemberMapper projectMemberMapper;
    private final BoardColumnMapper boardColumnMapper;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final WebClient aiWebClient;

    private final ConcurrentHashMap<Long, AtomicInteger> userSseCount = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, AtomicInteger> projectSseCount = new ConcurrentHashMap<>();
    private final AtomicInteger globalSseCount = new AtomicInteger(0);

    private static final String REDIS_CONFIRM_PREFIX = "ai:confirm:";

    @Override
    public SseEmitter sendCommand(Long userId, CommandRequest request) {
        Long projectId = request.getProjectId();
        SseEmitter emitter = new SseEmitter(aiLlmConfig.getSse().getTimeout());

        if (!acquireSseSlot(userId, projectId)) {
            try {
                emitter.send(SseEmitter.event().name("error").data("{\"message\":\"并发连接数超限，请稍后再试\"}"));
                emitter.complete();
            } catch (IOException ignored) {
            }
            return emitter;
        }

        emitter.onCompletion(() -> releaseSseSlot(userId, projectId));
        emitter.onTimeout(() -> releaseSseSlot(userId, projectId));
        emitter.onError(e -> releaseSseSlot(userId, projectId));

        AiChatSession session = getOrCreateSession(userId, projectId);
        saveMessage(session.getId(), "user", request.getCommand(), null, null);

        String systemPrompt = buildSystemPrompt(projectId);
        List<Map<String, Object>> messages = buildChatMessages(session.getId(), systemPrompt, request.getCommand());
        ArrayNode tools = buildToolDefinitions();
        ObjectNode requestBody = buildRequestBody(messages, tools, true);

        StringBuilder thinkingContent = new StringBuilder();
        StringBuilder answerContent = new StringBuilder();
        List<Map<String, Object>> toolCallsList = new ArrayList<>();
        List<Map<String, Object>> allMessages = new ArrayList<>(messages);
        AtomicBoolean toolCallInProgress = new AtomicBoolean(false);

        aiWebClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .retrieve()
                .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                        response -> response.bodyToMono(String.class)
                                .map(body -> new RuntimeException("LLM API error: " + body))
                                .map(RuntimeException::new))
                .bodyToFlux(String.class)
                .subscribe(
                        chunk -> handleStreamChunk(chunk, emitter, thinkingContent, answerContent, toolCallsList, allMessages, userId, projectId, session, toolCallInProgress, request.getCommand()),
                        error -> handleStreamError(error, emitter, userId, projectId, session, request.getCommand(), thinkingContent, answerContent, toolCallsList),
                        () -> {
                            log.debug("第一轮流完成, toolCallInProgress={}", toolCallInProgress.get());
                            if (!toolCallInProgress.get()) {
                                handleStreamComplete(emitter, userId, projectId, session, request.getCommand(), thinkingContent, answerContent, toolCallsList);
                            }
                        }
                );

        return emitter;
    }

    @Override
    public void confirmAction(Long userId, ConfirmRequest request) {
        String redisKey = REDIS_CONFIRM_PREFIX + request.getOperationId();
        String previewJson = redisTemplate.opsForValue().get(redisKey);

        if (previewJson == null) {
            throw new com.ai.taskboard.common.exception.BusinessException("操作已过期或不存在");
        }

        try {
            JsonNode preview = objectMapper.readTree(previewJson);
            String action = request.getAction();

            if ("confirmed".equals(action)) {
                JsonNode operations = preview.get("operations");
                if (operations != null && operations.isArray()) {
                    for (JsonNode op : operations) {
                        executeToolCall(op.get("name").asText(), op.get("arguments"), userId);
                    }
                }
                updateOperationLog(request.getOperationId(), "confirmed", objectMapper.writeValueAsString(request.getModifications()));
            } else if ("rejected".equals(action)) {
                updateOperationLog(request.getOperationId(), "rejected", null);
            } else if ("modified".equals(action) && request.getModifications() != null) {
                String modifiedOps = objectMapper.writeValueAsString(request.getModifications());
                JsonNode modOps = objectMapper.readTree(modifiedOps);
                if (modOps.isArray()) {
                    for (JsonNode op : modOps) {
                        executeToolCall(op.get("name").asText(), op.get("arguments"), userId);
                    }
                }
                updateOperationLog(request.getOperationId(), "modified", modifiedOps);
            }

            redisTemplate.delete(redisKey);
        } catch (com.ai.taskboard.common.exception.BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("确认操作失败", e);
            throw new com.ai.taskboard.common.exception.BusinessException("确认操作失败");
        }
    }

    @Override
    public SuggestTagsVO suggestTags(Long userId, SuggestRequest request) {
        Task task = taskMapper.selectById(request.getTaskId());
        if (task == null) {
            throw new com.ai.taskboard.common.exception.BusinessException(com.ai.taskboard.common.result.ResultCode.NOT_FOUND);
        }

        List<Tag> projectTags = tagMapper.selectList(
                new LambdaQueryWrapper<Tag>().eq(Tag::getProjectId, task.getProjectId()));
        List<TaskMetrics> metrics = taskMetricsMapper.selectList(
                new LambdaQueryWrapper<TaskMetrics>().eq(TaskMetrics::getProjectId, task.getProjectId()));

        String tagContext = projectTags.stream().map(Tag::getName).collect(Collectors.joining(", "));
        String metricsContext = metrics.stream()
                .map(m -> m.getTag() + "(完成率:" + m.getCompletionRate() + ",样本:" + m.getSampleCount() + ")")
                .collect(Collectors.joining("; "));

        String prompt = "基于以下信息为任务推荐标签：\n" +
                "任务标题：" + task.getTitle() + "\n" +
                "任务描述：" + (task.getDescription() != null ? task.getDescription() : "无") + "\n" +
                "项目已有标签：" + tagContext + "\n" +
                "标签历史指标：" + metricsContext + "\n" +
                "请返回JSON格式：{\"suggested_tags\":[{\"name\":\"标签名\",\"confidence\":0.9}]}\n" +
                "只返回JSON，不要其他内容。";

        String response = callLlmSync(prompt);
        return parseSuggestTagsResponse(response);
    }

    @Override
    public SuggestEffortVO suggestEffort(Long userId, SuggestRequest request) {
        Task task = taskMapper.selectById(request.getTaskId());
        if (task == null) {
            throw new com.ai.taskboard.common.exception.BusinessException(com.ai.taskboard.common.result.ResultCode.NOT_FOUND);
        }

        List<TaskTag> taskTags = taskTagMapper.selectList(
                new LambdaQueryWrapper<TaskTag>().eq(TaskTag::getTaskId, task.getId()));
        List<String> tagNames = new ArrayList<>();
        for (TaskTag tt : taskTags) {
            Tag t = tagMapper.selectById(tt.getTagId());
            if (t != null) tagNames.add(t.getName());
        }

        List<TaskMetrics> metrics = taskMetricsMapper.selectList(
                new LambdaQueryWrapper<TaskMetrics>()
                        .eq(TaskMetrics::getProjectId, task.getProjectId())
                        .in(TaskMetrics::getTag, tagNames));

        String metricsContext = metrics.stream()
                .map(m -> m.getTag() + "(预估:" + m.getAvgEstimatedHours() + "h,实际:" + m.getAvgActualHours() + "h,完成率:" + m.getCompletionRate() + ")")
                .collect(Collectors.joining("; "));

        String prompt = "基于以下信息估算任务工时：\n" +
                "任务标题：" + task.getTitle() + "\n" +
                "任务描述：" + (task.getDescription() != null ? task.getDescription() : "无") + "\n" +
                "任务优先级：" + task.getPriority() + "\n" +
                "相关标签指标：" + metricsContext + "\n" +
                "请返回JSON格式：{\"estimated_hours\":{\"min\":2.0,\"max\":5.0,\"reason\":\"原因说明\"}}\n" +
                "只返回JSON，不要其他内容。";

        String response = callLlmSync(prompt);
        return parseSuggestEffortResponse(response);
    }

    @Override
    public SuggestAssigneeVO suggestAssignee(Long userId, SuggestRequest request) {
        Task task = taskMapper.selectById(request.getTaskId());
        if (task == null) {
            throw new com.ai.taskboard.common.exception.BusinessException(com.ai.taskboard.common.result.ResultCode.NOT_FOUND);
        }

        List<ProjectMember> members = projectMemberMapper.selectList(
                new LambdaQueryWrapper<ProjectMember>().eq(ProjectMember::getProjectId, task.getProjectId()));

        List<Map<String, Object>> memberInfos = new ArrayList<>();
        for (ProjectMember pm : members) {
            User u = userMapper.selectById(pm.getUserId());
            if (u == null) continue;
            List<UserSkill> skills = userSkillMapper.selectList(
                    new LambdaQueryWrapper<UserSkill>().eq(UserSkill::getUserId, u.getId()));
            Long taskCount = taskAssigneeMapper.selectCount(
                    new LambdaQueryWrapper<TaskAssignee>().eq(TaskAssignee::getUserId, u.getId()));

            Map<String, Object> info = new HashMap<>();
            info.put("userId", u.getId());
            info.put("name", u.getNickname());
            info.put("skills", skills.stream().map(UserSkill::getSkillTag).collect(Collectors.toList()));
            info.put("currentTaskCount", taskCount);
            memberInfos.add(info);
        }

        String prompt = "基于以下信息推荐任务负责人：\n" +
                "任务标题：" + task.getTitle() + "\n" +
                "任务描述：" + (task.getDescription() != null ? task.getDescription() : "无") + "\n" +
                "任务优先级：" + task.getPriority() + "\n" +
                "项目成员信息：" + memberInfos + "\n" +
                "请返回JSON格式：{\"suggested_assignee\":[{\"userId\":1,\"name\":\"姓名\",\"reason\":\"推荐原因\"}]}\n" +
                "只返回JSON，不要其他内容。";

        String response = callLlmSync(prompt);
        return parseSuggestAssigneeResponse(response);
    }

    @Override
    public GenerateSummaryVO generateSummary(Long userId, SuggestRequest request) {
        Task task = taskMapper.selectById(request.getTaskId());
        if (task == null) {
            throw new com.ai.taskboard.common.exception.BusinessException(com.ai.taskboard.common.result.ResultCode.NOT_FOUND);
        }

        List<TaskAssignee> assignees = taskAssigneeMapper.selectList(
                new LambdaQueryWrapper<TaskAssignee>().eq(TaskAssignee::getTaskId, task.getId()));
        List<String> assigneeNames = new ArrayList<>();
        for (TaskAssignee ta : assignees) {
            User u = userMapper.selectById(ta.getUserId());
            if (u != null) assigneeNames.add(u.getNickname());
        }

        List<TaskTag> taskTags = taskTagMapper.selectList(
                new LambdaQueryWrapper<TaskTag>().eq(TaskTag::getTaskId, task.getId()));
        List<String> tagNames = new ArrayList<>();
        for (TaskTag tt : taskTags) {
            Tag t = tagMapper.selectById(tt.getTagId());
            if (t != null) tagNames.add(t.getName());
        }

        String prompt = "请为以下任务生成简洁的摘要：\n" +
                "任务标题：" + task.getTitle() + "\n" +
                "任务描述：" + (task.getDescription() != null ? task.getDescription() : "无") + "\n" +
                "状态：" + task.getStatus() + "\n" +
                "优先级：" + task.getPriority() + "\n" +
                "负责人：" + String.join(", ", assigneeNames) + "\n" +
                "标签：" + String.join(", ", tagNames) + "\n" +
                "截止日期：" + task.getDueDate() + "\n" +
                "请返回JSON格式：{\"summary\":\"摘要内容\"}\n" +
                "只返回JSON，不要其他内容。";

        String response = callLlmSync(prompt);
        return parseGenerateSummaryResponse(response);
    }

    @Override
    public SseEmitter streamProjectHealth(Long userId, Long projectId) {
        SseEmitter emitter = new SseEmitter(aiLlmConfig.getSse().getTimeout());

        if (!acquireSseSlot(userId, projectId)) {
            try {
                emitter.send(SseEmitter.event().name("error").data("{\"message\":\"并发连接数超限\"}"));
                emitter.complete();
            } catch (IOException ignored) {
            }
            return emitter;
        }

        emitter.onCompletion(() -> releaseSseSlot(userId, projectId));
        emitter.onTimeout(() -> releaseSseSlot(userId, projectId));
        emitter.onError(e -> releaseSseSlot(userId, projectId));

        new Thread(() -> {
            try {
                emitter.send(SseEmitter.event().name("thinking").data("{\"content\":\"正在分析项目健康度...\"}"));

                List<Task> allTasks = taskMapper.selectList(
                        new LambdaQueryWrapper<Task>().eq(Task::getProjectId, projectId));
                long totalTasks = allTasks.size();

                if (totalTasks == 0) {
                    ProjectHealthVO health = new ProjectHealthVO();
                    health.setScore(100.0);
                    health.setDimensions(List.of());
                    health.setRisks(List.of());
                    health.setSuggestions(List.of());
                    emitter.send(SseEmitter.event().name("answer").data(objectMapper.writeValueAsString(health)));
                    emitter.complete();
                    return;
                }

                long completedTasks = allTasks.stream().filter(t -> "DONE".equals(t.getStatus()) || "COMPLETED".equals(t.getStatus())).count();
                double progressScore = (double) completedTasks / totalTasks * 100;

                long overdueTasks = allTasks.stream()
                        .filter(t -> t.getDueDate() != null && t.getDueDate().isBefore(LocalDate.now())
                                && !"DONE".equals(t.getStatus()) && !"COMPLETED".equals(t.getStatus()))
                        .count();
                double overdueScore = (1.0 - (double) overdueTasks / totalTasks) * 100;

                Map<Long, Long> assigneeTaskCount = new HashMap<>();
                for (Task t : allTasks) {
                    List<TaskAssignee> tas = taskAssigneeMapper.selectList(
                            new LambdaQueryWrapper<TaskAssignee>().eq(TaskAssignee::getTaskId, t.getId()));
                    for (TaskAssignee ta : tas) {
                        assigneeTaskCount.merge(ta.getUserId(), 1L, Long::sum);
                    }
                }
                double loadBalanceScore = calculateLoadBalance(assigneeTaskCount);

                long blockedTasks = allTasks.stream()
                        .filter(t -> "BLOCKED".equals(t.getStatus()) || "STALE".equals(t.getStatus())).count();
                double blockageScore = (1.0 - (double) blockedTasks / totalTasks) * 100;

                long highPriorityTasks = allTasks.stream().filter(t -> "HIGH".equals(t.getPriority()) || "URGENT".equals(t.getPriority())).count();
                double priorityScore = Math.max(0, 100 - (double) highPriorityTasks / totalTasks * 50);

                double overallScore = progressScore * 0.3 + overdueScore * 0.3 + loadBalanceScore * 0.2 + blockageScore * 0.1 + priorityScore * 0.1;

                List<ProjectHealthVO.HealthDimension> dimensions = new ArrayList<>();
                dimensions.add(buildDimension("progress", progressScore, "项目进度"));
                dimensions.add(buildDimension("overdue_risk", overdueScore, "逾期风险"));
                dimensions.add(buildDimension("load_balance", loadBalanceScore, "负载均衡"));
                dimensions.add(buildDimension("blockage", blockageScore, "阻塞情况"));
                dimensions.add(buildDimension("priority", priorityScore, "优先级分布"));

                emitter.send(SseEmitter.event().name("tool_call").data("{\"tool\":\"analyze_project_health\",\"params\":{\"projectId\":" + projectId + "}}"));

                List<ProjectHealthVO.HealthRisk> risks = new ArrayList<>();
                if (overdueScore < 60) {
                    ProjectHealthVO.HealthRisk risk = new ProjectHealthVO.HealthRisk();
                    risk.setId("overdue_risk");
                    risk.setTitle("逾期风险较高");
                    risk.setSeverity("high");
                    risk.setDescription("项目中有" + overdueTasks + "个任务已逾期，占比" + String.format("%.1f", (double) overdueTasks / totalTasks * 100) + "%");
                    risks.add(risk);
                }
                if (loadBalanceScore < 60) {
                    ProjectHealthVO.HealthRisk risk = new ProjectHealthVO.HealthRisk();
                    risk.setId("load_imbalance");
                    risk.setTitle("负载不均衡");
                    risk.setSeverity("medium");
                    risk.setDescription("部分成员任务过多，建议重新分配");
                    risks.add(risk);
                }
                if (blockageScore < 60) {
                    ProjectHealthVO.HealthRisk risk = new ProjectHealthVO.HealthRisk();
                    risk.setId("blockage");
                    risk.setTitle("存在阻塞任务");
                    risk.setSeverity("high");
                    risk.setDescription("项目中有" + blockedTasks + "个任务处于阻塞状态");
                    risks.add(risk);
                }

                List<ProjectHealthVO.HealthSuggestion> suggestions = new ArrayList<>();
                if (progressScore < 50) {
                    ProjectHealthVO.HealthSuggestion sug = new ProjectHealthVO.HealthSuggestion();
                    sug.setId("accelerate");
                    sug.setTitle("加快进度");
                    sug.setDescription("项目完成度较低，建议集中资源推进关键任务");
                    suggestions.add(sug);
                }
                if (overdueTasks > 0) {
                    ProjectHealthVO.HealthSuggestion sug = new ProjectHealthVO.HealthSuggestion();
                    sug.setId("review_overdue");
                    sug.setTitle("处理逾期任务");
                    sug.setDescription("建议重新评估逾期任务的优先级和截止日期");
                    suggestions.add(sug);
                }
                if (loadBalanceScore < 70) {
                    ProjectHealthVO.HealthSuggestion sug = new ProjectHealthVO.HealthSuggestion();
                    sug.setId("rebalance");
                    sug.setTitle("均衡负载");
                    sug.setDescription("建议将部分任务从高负载成员转移给低负载成员");
                    suggestions.add(sug);
                }

                ProjectHealthVO health = new ProjectHealthVO();
                health.setScore(Math.round(overallScore * 10.0) / 10.0);
                health.setDimensions(dimensions);
                health.setRisks(risks);
                health.setSuggestions(suggestions);

                emitter.send(SseEmitter.event().name("answer").data(objectMapper.writeValueAsString(health)));
                emitter.complete();
            } catch (Exception e) {
                log.error("项目健康度分析失败", e);
                try {
                    emitter.send(SseEmitter.event().name("error").data("{\"message\":\"分析失败\"}"));
                    emitter.complete();
                } catch (IOException ignored) {
                }
            }
        }).start();

        return emitter;
    }

    private boolean acquireSseSlot(Long userId, Long projectId) {
        AiLlmConfig.SseConfig sseConfig = aiLlmConfig.getSse();
        int globalCount = globalSseCount.incrementAndGet();
        if (globalCount > sseConfig.getMaxConcurrentGlobal()) {
            globalSseCount.decrementAndGet();
            return false;
        }
        int userCount = userSseCount.computeIfAbsent(userId, k -> new AtomicInteger(0)).incrementAndGet();
        if (userCount > sseConfig.getMaxConcurrentPerUser()) {
            userSseCount.get(userId).decrementAndGet();
            globalSseCount.decrementAndGet();
            return false;
        }
        if (projectId != null) {
            int projectCount = projectSseCount.computeIfAbsent(projectId, k -> new AtomicInteger(0)).incrementAndGet();
            if (projectCount > sseConfig.getMaxConcurrentPerProject()) {
                projectSseCount.get(projectId).decrementAndGet();
                userSseCount.get(userId).decrementAndGet();
                globalSseCount.decrementAndGet();
                return false;
            }
        }
        return true;
    }

    private void releaseSseSlot(Long userId, Long projectId) {
        globalSseCount.decrementAndGet();
        AtomicInteger userCounter = userSseCount.get(userId);
        if (userCounter != null) userCounter.decrementAndGet();
        if (projectId != null) {
            AtomicInteger projectCounter = projectSseCount.get(projectId);
            if (projectCounter != null) projectCounter.decrementAndGet();
        }
    }

    private AiChatSession getOrCreateSession(Long userId, Long projectId) {
        List<AiChatSession> sessions = aiChatSessionMapper.selectList(
                new LambdaQueryWrapper<AiChatSession>()
                        .eq(AiChatSession::getUserId, userId)
                        .eq(AiChatSession::getProjectId, projectId)
                        .eq(AiChatSession::getDeleted, 0)
                        .orderByDesc(AiChatSession::getCreatedAt)
                        .last("LIMIT 1"));

        if (!sessions.isEmpty()) {
            return sessions.get(0);
        }

        AiChatSession session = new AiChatSession();
        session.setUserId(userId);
        session.setProjectId(projectId);
        session.setTitle("AI助手对话");
        session.setCreatedAt(LocalDateTime.now());
        session.setDeleted(0);
        aiChatSessionMapper.insert(session);
        return session;
    }

    private void saveMessage(Long sessionId, String role, String content, String toolCalls, String references) {
        AiChatMessage message = new AiChatMessage();
        message.setSessionId(sessionId);
        message.setRole(role);
        message.setContent(content);
        message.setToolCalls(toolCalls);
        message.setReferences(references);
        message.setCreatedAt(LocalDateTime.now());
        aiChatMessageMapper.insert(message);
    }

    private String buildSystemPrompt(Long projectId) {
        Project project = projectMapper.selectById(projectId);
        String projectName = project != null ? project.getName() : "未知项目";

        List<Task> tasks = taskMapper.selectList(
                new LambdaQueryWrapper<Task>().eq(Task::getProjectId, projectId).last("LIMIT 50"));
        StringBuilder taskSummary = new StringBuilder();
        for (Task t : tasks) {
            taskSummary.append("- [").append(t.getStatus()).append("] ").append(t.getTitle())
                    .append(" (优先级:").append(t.getPriority()).append(")").append("\n");
        }

        List<ProjectMember> members = projectMemberMapper.selectList(
                new LambdaQueryWrapper<ProjectMember>().eq(ProjectMember::getProjectId, projectId));
        StringBuilder memberSummary = new StringBuilder();
        for (ProjectMember pm : members) {
            User u = userMapper.selectById(pm.getUserId());
            if (u != null) {
                memberSummary.append("- ").append(u.getNickname()).append(" (角色:").append(pm.getRole()).append(")").append("\n");
            }
        }

        return "你是AI任务助手，帮助用户管理项目任务。当前项目ID：" + projectId + "，项目名称：" + projectName + "\n" +
                "项目任务列表：\n" + taskSummary + "\n" +
                "项目成员：\n" + memberSummary + "\n" +
                "你可以通过工具来搜索、创建、更新任务，分配负责人，设置优先级等。" +
                "调用工具时请使用当前项目ID：" + projectId + "。" +
                "对于批量操作，你需要先展示变更预览，等待用户确认后再执行。" +
                "请用中文回复。";
    }

    private List<Map<String, Object>> buildChatMessages(Long sessionId, String systemPrompt, String userCommand) {
        List<Map<String, Object>> messages = new ArrayList<>();

        Map<String, Object> systemMsg = new HashMap<>();
        systemMsg.put("role", "system");
        systemMsg.put("content", systemPrompt);
        messages.add(systemMsg);

        List<AiChatMessage> history = aiChatMessageMapper.selectList(
                new LambdaQueryWrapper<AiChatMessage>()
                        .eq(AiChatMessage::getSessionId, sessionId)
                        .orderByAsc(AiChatMessage::getCreatedAt)
                        .last("LIMIT 20"));

        for (AiChatMessage msg : history) {
            if ("tool".equals(msg.getRole())) continue;
            String content = msg.getContent();
            if (content == null || content.isBlank()) continue;
            Map<String, Object> m = new HashMap<>();
            m.put("role", msg.getRole());
            m.put("content", content);
            messages.add(m);
        }

        Map<String, Object> userMsg = new HashMap<>();
        userMsg.put("role", "user");
        userMsg.put("content", userCommand);
        messages.add(userMsg);

        while (messages.size() > 1 && "assistant".equals(messages.get(messages.size() - 2).get("role"))) {
            messages.remove(messages.size() - 2);
        }

        return messages;
    }

    private ArrayNode buildToolDefinitions() {
        ObjectMapper mapper = objectMapper;
        ArrayNode tools = mapper.createArrayNode();

        tools.add(createTool("search_tasks", "根据条件搜索任务",
                createParamObject(new String[]{"project_id", "status", "priority", "keyword"},
                        new String[]{"integer", "string", "string", "string"},
                        new boolean[]{true, false, false, false},
                        new String[]{"项目ID", "任务状态", "优先级", "关键词"})));

        tools.add(createTool("update_task", "更新单个任务字段",
                createParamObject(new String[]{"task_id", "field", "value"},
                        new String[]{"integer", "string", "string"},
                        new boolean[]{true, true, true},
                        new String[]{"任务ID", "要更新的字段名", "新值"})));

        tools.add(createTool("update_task_status", "更改任务状态",
                createParamObject(new String[]{"task_id", "status"},
                        new String[]{"integer", "string"},
                        new boolean[]{true, true},
                        new String[]{"任务ID", "新状态"})));

        tools.add(createTool("batch_update_tasks", "批量更新多个任务（需要用户确认）",
                createParamObject(new String[]{"operations"},
                        new String[]{"array"},
                        new boolean[]{true},
                        new String[]{"操作列表，每项包含task_id、field、value"})));

        tools.add(createTool("assign_task", "分配任务给用户",
                createParamObject(new String[]{"task_id", "user_id"},
                        new String[]{"integer", "integer"},
                        new boolean[]{true, true},
                        new String[]{"任务ID", "被分配用户ID"})));

        tools.add(createTool("set_priority", "设置任务优先级",
                createParamObject(new String[]{"task_id", "priority"},
                        new String[]{"integer", "string"},
                        new boolean[]{true, true},
                        new String[]{"任务ID", "优先级(LOW/MEDIUM/HIGH/URGENT)"})));

        tools.add(createTool("create_task", "创建新任务",
                createParamObject(new String[]{"project_id", "title", "description", "priority"},
                        new String[]{"integer", "string", "string", "string"},
                        new boolean[]{true, true, false, false},
                        new String[]{"项目ID", "任务标题", "任务描述", "优先级"})));

        tools.add(createTool("suggest_tags", "为任务推荐标签",
                createParamObject(new String[]{"task_id"},
                        new String[]{"integer"},
                        new boolean[]{true},
                        new String[]{"任务ID"})));

        tools.add(createTool("estimate_effort", "估算任务工时",
                createParamObject(new String[]{"task_id"},
                        new String[]{"integer"},
                        new boolean[]{true},
                        new String[]{"任务ID"})));

        tools.add(createTool("recommend_assignee", "推荐任务负责人",
                createParamObject(new String[]{"task_id"},
                        new String[]{"integer"},
                        new boolean[]{true},
                        new String[]{"任务ID"})));

        tools.add(createTool("generate_summary", "生成任务摘要",
                createParamObject(new String[]{"task_id"},
                        new String[]{"integer"},
                        new boolean[]{true},
                        new String[]{"任务ID"})));

        tools.add(createTool("analyze_project_health", "分析项目健康度",
                createParamObject(new String[]{"project_id"},
                        new String[]{"integer"},
                        new boolean[]{true},
                        new String[]{"项目ID"})));

        return tools;
    }

    private ObjectNode createTool(String name, String description, ObjectNode parameters) {
        ObjectNode tool = objectMapper.createObjectNode();
        tool.put("type", "function");
        ObjectNode function = objectMapper.createObjectNode();
        function.put("name", name);
        function.put("description", description);
        function.set("parameters", parameters);
        tool.set("function", function);
        return tool;
    }

    private ObjectNode createParamObject(String[] names, String[] types, boolean[] required, String[] descriptions) {
        ObjectNode params = objectMapper.createObjectNode();
        params.put("type", "object");
        ObjectNode properties = objectMapper.createObjectNode();
        for (int i = 0; i < names.length; i++) {
            ObjectNode prop = objectMapper.createObjectNode();
            prop.put("type", types[i]);
            prop.put("description", descriptions[i]);
            properties.set(names[i], prop);
        }
        params.set("properties", properties);
        ArrayNode requiredArray = objectMapper.createArrayNode();
        for (int i = 0; i < names.length; i++) {
            if (required[i]) requiredArray.add(names[i]);
        }
        params.set("required", requiredArray);
        return params;
    }

    private ObjectNode buildRequestBody(List<Map<String, Object>> messages, ArrayNode tools, boolean stream) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", aiLlmConfig.getLlm().getModel());
        body.put("temperature", aiLlmConfig.getLlm().getTemperature());
        body.put("max_tokens", aiLlmConfig.getLlm().getMaxTokens());
        body.put("stream", stream);

        try {
            ArrayNode messagesNode = objectMapper.valueToTree(messages);
            body.set("messages", messagesNode);
        } catch (Exception e) {
            ArrayNode messagesNode = objectMapper.createArrayNode();
            for (Map<String, Object> msg : messages) {
                ObjectNode msgNode = objectMapper.createObjectNode();
                msgNode.put("role", (String) msg.get("role"));
                msgNode.put("content", objectMapper.valueToTree(msg.get("content")).toString());
                messagesNode.add(msgNode);
            }
            body.set("messages", messagesNode);
        }

        if (tools != null && !tools.isEmpty()) {
            body.set("tools", tools);
        }

        return body;
    }

    private void handleStreamChunk(String chunk, SseEmitter emitter,
                                   StringBuilder thinkingContent, StringBuilder answerContent,
                                   List<Map<String, Object>> toolCallsList,
                                   List<Map<String, Object>> allMessages,
                                   Long userId, Long projectId, AiChatSession session,
                                   AtomicBoolean toolCallInProgress, String userCommand) {
        if (chunk == null || chunk.trim().isEmpty() || "[DONE]".equals(chunk.trim())) {
            return;
        }

        try {
            JsonNode node = objectMapper.readTree(chunk);
            JsonNode choices = node.get("choices");
            if (choices == null || choices.isEmpty()) return;

            JsonNode choice = choices.get(0);
            JsonNode delta = choice.get("delta");
            if (delta == null) return;

            if (delta.has("reasoning_content") && !delta.get("reasoning_content").isNull()) {
                String content = delta.get("reasoning_content").asText();
                thinkingContent.append(content);
                try {
                    emitter.send(SseEmitter.event().name("thinking").data(
                            objectMapper.writeValueAsString(Map.of("content", content))));
                } catch (IllegalStateException ignored) {
                    return;
                }
            }

            if (delta.has("content") && !delta.get("content").isNull()) {
                String content = delta.get("content").asText();
                if (!content.isEmpty()) {
                    answerContent.append(content);
                    try {
                        emitter.send(SseEmitter.event().name("answer").data(
                                objectMapper.writeValueAsString(Map.of("content", content))));
                    } catch (IllegalStateException ignored) {
                        return;
                    }
                }
            }

            if (delta.has("tool_calls") && !delta.get("tool_calls").isNull()) {
                JsonNode toolCallsDelta = delta.get("tool_calls");
                for (JsonNode tcDelta : toolCallsDelta) {
                    int index = tcDelta.has("index") ? tcDelta.get("index").asInt() : toolCallsList.size();

                    while (toolCallsList.size() <= index) {
                        Map<String, Object> tc = new HashMap<>();
                        tc.put("id", "");
                        tc.put("name", "");
                        tc.put("arguments", new StringBuilder());
                        toolCallsList.add(tc);
                    }

                    Map<String, Object> tc = toolCallsList.get(index);
                    if (tcDelta.has("id")) {
                        tc.put("id", tcDelta.get("id").asText());
                    }
                    if (tcDelta.has("function")) {
                        JsonNode func = tcDelta.get("function");
                        if (func.has("name")) {
                            tc.put("name", func.get("name").asText());
                        }
                        if (func.has("arguments")) {
                            ((StringBuilder) tc.get("arguments")).append(func.get("arguments").asText());
                        }
                    }
                }
            }

            if (choice.has("finish_reason") && !choice.get("finish_reason").isNull()) {
                String finishReason = choice.get("finish_reason").asText();
                if ("tool_calls".equals(finishReason) && !toolCallsList.isEmpty()) {
                    toolCallInProgress.set(true);
                    processToolCalls(toolCallsList, emitter, allMessages, userId, projectId, session,
                            thinkingContent, answerContent, toolCallInProgress, userCommand);
                }
            }
        } catch (Exception e) {
            log.error("处理流式响应块失败: {}", chunk, e);
        }
    }

    private void processToolCalls(List<Map<String, Object>> toolCallsList, SseEmitter emitter,
                                  List<Map<String, Object>> allMessages,
                                  Long userId, Long projectId, AiChatSession session,
                                  StringBuilder thinkingContent, StringBuilder answerContent,
                                  AtomicBoolean toolCallInProgress, String userCommand) {
        try {
            List<Map<String, Object>> assistantToolCalls = new ArrayList<>();
            for (Map<String, Object> tc : toolCallsList) {
                Map<String, Object> toolCall = new HashMap<>();
                toolCall.put("id", tc.get("id"));
                Map<String, Object> function = new HashMap<>();
                function.put("name", tc.get("name"));
                function.put("arguments", tc.get("arguments").toString());
                toolCall.put("function", function);
                toolCall.put("type", "function");
                assistantToolCalls.add(toolCall);
            }

            Map<String, Object> assistantMsg = new HashMap<>();
            assistantMsg.put("role", "assistant");
            assistantMsg.put("content", answerContent.length() > 0 ? answerContent.toString() : null);
            assistantMsg.put("tool_calls", assistantToolCalls);
            allMessages.add(assistantMsg);

            boolean needsConfirmation = false;
            List<Map<String, Object>> confirmOperations = new ArrayList<>();

            for (Map<String, Object> tc : toolCallsList) {
                String toolName = (String) tc.get("name");
                String argsStr = tc.get("arguments").toString();

                emitter.send(SseEmitter.event().name("tool_call").data(
                        objectMapper.writeValueAsString(Map.of("tool", toolName, "params", objectMapper.readValue(argsStr, Map.class)))));

                if ("batch_update_tasks".equals(toolName)) {
                    needsConfirmation = true;
                    JsonNode args = objectMapper.readTree(argsStr);
                    confirmOperations.add(Map.of("name", toolName, "arguments", args));
                } else {
                    try {
                        JsonNode args = objectMapper.readTree(argsStr);
                        Object result = executeToolCall(toolName, args, userId);
                        Map<String, Object> toolResultMsg = new HashMap<>();
                        toolResultMsg.put("role", "tool");
                        toolResultMsg.put("tool_call_id", tc.get("id"));
                        toolResultMsg.put("content", objectMapper.writeValueAsString(result));
                        allMessages.add(toolResultMsg);
                    } catch (Exception e) {
                        Map<String, Object> toolResultMsg = new HashMap<>();
                        toolResultMsg.put("role", "tool");
                        toolResultMsg.put("tool_call_id", tc.get("id"));
                        toolResultMsg.put("content", "{\"error\":\"" + e.getMessage() + "\"}");
                        allMessages.add(toolResultMsg);
                    }
                }
            }

            if (needsConfirmation) {
                Long dbLogId = saveOperationLog(userId, projectId, userCommand, thinkingContent.toString(),
                        toolCallsList, answerContent.toString(),
                        objectMapper.writeValueAsString(confirmOperations), "pending", null, "command");

                String operationId = dbLogId != null ? String.valueOf(dbLogId) : String.valueOf(System.currentTimeMillis());
                String previewJson = objectMapper.writeValueAsString(Map.of("operations", confirmOperations, "projectId", projectId));

                redisTemplate.opsForValue().set(REDIS_CONFIRM_PREFIX + operationId, previewJson,
                        aiLlmConfig.getConfirmation().getTtlMinutes(), TimeUnit.MINUTES);

                emitter.send(SseEmitter.event().name("diff_preview").data(
                        objectMapper.writeValueAsString(Map.of("changes", confirmOperations))));

                emitter.send(SseEmitter.event().name("confirmation_required").data(
                        objectMapper.writeValueAsString(Map.of("operation_id", operationId, "preview", confirmOperations))));

                saveMessage(session.getId(), "assistant", answerContent.toString(),
                        objectMapper.writeValueAsString(assistantToolCalls), null);

                toolCallInProgress.set(false);
                emitter.complete();
                return;
            }

            List<Map<String, Object>> originalToolCalls = new ArrayList<>(toolCallsList);
            toolCallsList.clear();
            answerContent.setLength(0);
            thinkingContent.setLength(0);

            ArrayNode tools = buildToolDefinitions();
            ObjectNode requestBody = buildRequestBody(allMessages, tools, true);

            aiWebClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .accept(MediaType.TEXT_EVENT_STREAM)
                    .retrieve()
                    .bodyToFlux(String.class)
                    .subscribe(
                            chunk -> handleStreamChunk(chunk, emitter, thinkingContent, answerContent, toolCallsList, allMessages, userId, projectId, session, toolCallInProgress, userCommand),
                            error -> {
                                toolCallInProgress.set(false);
                                handleStreamError(error, emitter, userId, projectId, session, userCommand, thinkingContent, answerContent, toolCallsList);
                            },
                            () -> {
                                toolCallInProgress.set(false);
                                if (!originalToolCalls.isEmpty()) {
                                    toolCallsList.addAll(originalToolCalls);
                                }
                                handleStreamComplete(emitter, userId, projectId, session, userCommand, thinkingContent, answerContent, toolCallsList);
                            }
                    );

        } catch (Exception e) {
            log.error("处理工具调用失败", e);
            toolCallInProgress.set(false);
            try {
                emitter.send(SseEmitter.event().name("error").data("{\"message\":\"工具调用处理失败\"}"));
                emitter.complete();
            } catch (IOException ignored) {
            }
        }
    }

    private Object executeToolCall(String toolName, JsonNode args, Long userId) {
        switch (toolName) {
            case "search_tasks": {
                Long projectId = args.has("project_id") ? args.get("project_id").asLong() : null;
                String status = args.has("status") ? args.get("status").asText() : null;
                String priority = args.has("priority") ? args.get("priority").asText() : null;
                String keyword = args.has("keyword") ? args.get("keyword").asText() : null;

                LambdaQueryWrapper<Task> wrapper = new LambdaQueryWrapper<Task>()
                        .eq(Task::getProjectId, projectId);
                if (status != null) wrapper.eq(Task::getStatus, status);
                if (priority != null) wrapper.eq(Task::getPriority, priority);
                if (keyword != null) wrapper.like(Task::getTitle, keyword);
                wrapper.last("LIMIT 20");

                List<Task> tasks = taskMapper.selectList(wrapper);
                return Map.of("tasks", tasks.stream().map(t -> Map.of(
                        "id", t.getId(),
                        "title", t.getTitle(),
                        "status", t.getStatus() != null ? t.getStatus() : "",
                        "priority", t.getPriority() != null ? t.getPriority() : ""
                )).collect(Collectors.toList()));
            }

            case "update_task": {
                Long taskId = args.get("task_id").asLong();
                String field = args.get("field").asText();
                String value = args.get("value").asText();

                Task task = taskMapper.selectById(taskId);
                if (task == null) return Map.of("error", "任务不存在");

                switch (field) {
                    case "title": task.setTitle(value); break;
                    case "description": task.setDescription(value); break;
                    case "priority": task.setPriority(value); break;
                    case "status": task.setStatus(value); break;
                    default: return Map.of("error", "不支持的字段: " + field);
                }
                taskMapper.updateById(task);
                return Map.of("success", true, "task_id", taskId, "field", field, "value", value);
            }

            case "update_task_status": {
                Long taskId = args.get("task_id").asLong();
                String status = args.get("status").asText();

                Task task = taskMapper.selectById(taskId);
                if (task == null) return Map.of("error", "任务不存在");

                task.setStatus(status);

                BoardColumn targetColumn = boardColumnMapper.selectOne(
                        new LambdaQueryWrapper<BoardColumn>()
                                .eq(BoardColumn::getProjectId, task.getProjectId())
                                .eq(BoardColumn::getStatusMapping, status));
                if (targetColumn != null) {
                    task.setColumnId(targetColumn.getId());
                }

                taskMapper.updateById(task);
                return Map.of("success", true, "task_id", taskId, "status", status, "column_updated", targetColumn != null);
            }

            case "assign_task": {
                Long taskId = args.get("task_id").asLong();
                Long assignUserId = args.get("user_id").asLong();

                Long count = taskAssigneeMapper.selectCount(
                        new LambdaQueryWrapper<TaskAssignee>()
                                .eq(TaskAssignee::getTaskId, taskId)
                                .eq(TaskAssignee::getUserId, assignUserId));
                if (count > 0) return Map.of("error", "该用户已被分配此任务");

                TaskAssignee ta = new TaskAssignee();
                ta.setTaskId(taskId);
                ta.setUserId(assignUserId);
                ta.setAssignedAt(LocalDateTime.now());
                taskAssigneeMapper.insert(ta);
                return Map.of("success", true, "task_id", taskId, "user_id", assignUserId);
            }

            case "set_priority": {
                Long taskId = args.get("task_id").asLong();
                String priority = args.get("priority").asText();

                Task task = taskMapper.selectById(taskId);
                if (task == null) return Map.of("error", "任务不存在");

                task.setPriority(priority);
                taskMapper.updateById(task);
                return Map.of("success", true, "task_id", taskId, "priority", priority);
            }

            case "create_task": {
                Long projectId = args.get("project_id").asLong();
                String title = args.get("title").asText();
                String description = args.has("description") ? args.get("description").asText() : null;
                String priority = args.has("priority") ? args.get("priority").asText() : "MEDIUM";

                Task task = new Task();
                task.setProjectId(projectId);
                task.setTitle(title);
                task.setDescription(description);
                task.setPriority(priority);
                task.setStatus("TODO");
                task.setSortOrder(0);
                task.setCreatorId(userId);
                taskMapper.insert(task);
                return Map.of("success", true, "task_id", task.getId(), "title", title);
            }

            case "suggest_tags":
            case "estimate_effort":
            case "generate_summary":
                return Map.of("message", "请使用对应的专用API接口");

            case "recommend_assignee": {
                Long taskId = args.get("task_id").asLong();
                Task task = taskMapper.selectById(taskId);
                if (task == null) return Map.of("error", "任务不存在");

                Long projectId = task.getProjectId();
                List<ProjectMember> members = projectMemberMapper.selectList(
                        new LambdaQueryWrapper<ProjectMember>().eq(ProjectMember::getProjectId, projectId));

                if (members.isEmpty()) return Map.of("error", "项目暂无成员");

                List<Map<String, Object>> candidates = new ArrayList<>();
                for (ProjectMember member : members) {
                    User user = userMapper.selectById(member.getUserId());
                    if (user == null) continue;

                    Long assignedCount = taskAssigneeMapper.selectCount(
                            new LambdaQueryWrapper<TaskAssignee>().eq(TaskAssignee::getUserId, member.getUserId()));

                    List<UserSkill> skills = userSkillMapper.selectList(
                            new LambdaQueryWrapper<UserSkill>().eq(UserSkill::getUserId, member.getUserId()));
                    String skillTags = skills.stream().map(UserSkill::getSkillTag).collect(Collectors.joining(", "));

                    int score = 100 - assignedCount.intValue() * 10;
                    if (score < 10) score = 10;

                    candidates.add(Map.of(
                            "user_id", member.getUserId(),
                            "nickname", user.getNickname() != null ? user.getNickname() : user.getUsername(),
                            "role", member.getRole() != null ? member.getRole() : "member",
                            "assigned_count", assignedCount,
                            "skills", skillTags,
                            "score", score
                    ));
                }

                candidates.sort((a, b) -> (Integer) b.get("score") - (Integer) a.get("score"));
                if (candidates.size() > 5) candidates = candidates.subList(0, 5);

                return Map.of("task_id", taskId, "recommendations", candidates);
            }

            case "analyze_project_health": {
                Long projectId = args.get("project_id").asLong();
                Project project = projectMapper.selectById(projectId);
                if (project == null) return Map.of("error", "项目不存在");

                List<Task> allTasks = taskMapper.selectList(
                        new LambdaQueryWrapper<Task>().eq(Task::getProjectId, projectId));

                int totalTasks = allTasks.size();
                if (totalTasks == 0) {
                    return Map.of("project_id", projectId, "health_score", 100, "message", "项目暂无任务");
                }

                long todoCount = allTasks.stream().filter(t -> "TODO".equals(t.getStatus())).count();
                long inProgressCount = allTasks.stream().filter(t -> "IN_PROGRESS".equals(t.getStatus())).count();
                long doneCount = allTasks.stream().filter(t -> "DONE".equals(t.getStatus())).count();
                long overdueCount = allTasks.stream().filter(t -> t.getDueDate() != null && t.getDueDate().isBefore(LocalDate.now()) && !"DONE".equals(t.getStatus())).count();
                long highPriorityCount = allTasks.stream().filter(t -> "HIGH".equals(t.getPriority()) || "URGENT".equals(t.getPriority())).count();

                int completionRate = (int) (doneCount * 100 / totalTasks);
                int overdueRate = (int) (overdueCount * 100 / totalTasks);

                int healthScore = 100;
                healthScore -= overdueRate;
                healthScore -= (int) (highPriorityCount * 2);
                if (healthScore < 0) healthScore = 0;

                List<Map<String, Object>> risks = new ArrayList<>();
                if (overdueRate > 20) {
                    risks.add(Map.of("type", "overdue", "severity", "high", "message", "逾期任务占比" + overdueRate + "%"));
                }
                if (highPriorityCount > totalTasks * 0.3) {
                    risks.add(Map.of("type", "priority", "severity", "medium", "message", "高优先级任务过多"));
                }
                if (inProgressCount > totalTasks * 0.5) {
                    risks.add(Map.of("type", "wip", "severity", "low", "message", "进行中任务过多，可能存在瓶颈"));
                }

                return Map.of(
                        "project_id", projectId,
                        "health_score", healthScore,
                        "total_tasks", totalTasks,
                        "todo_count", todoCount,
                        "in_progress_count", inProgressCount,
                        "done_count", doneCount,
                        "overdue_count", overdueCount,
                        "completion_rate", completionRate,
                        "risks", risks
                );
            }

            case "batch_update_tasks":
                return Map.of("message", "批量操作需要用户确认");

            default:
                return Map.of("error", "未知工具: " + toolName);
        }
    }

    private void handleStreamError(Throwable error, SseEmitter emitter,
                                   Long userId, Long projectId, AiChatSession session,
                                   String userCommand, StringBuilder thinkingContent,
                                   StringBuilder answerContent, List<Map<String, Object>> toolCallsList) {
        log.error("AI流式调用失败: {} - {}", error.getClass().getSimpleName(), error.getMessage(), error);
        try {
            emitter.send(SseEmitter.event().name("error").data(
                    objectMapper.writeValueAsString(Map.of("message", "AI服务调用失败，请稍后重试"))));
            emitter.complete();
        } catch (IOException ignored) {
        }

        saveOperationLog(userId, projectId, userCommand, thinkingContent.toString(),
                toolCallsList, answerContent.toString(), null, "error", null, "command");
    }

    private void handleStreamComplete(SseEmitter emitter, Long userId, Long projectId,
                                      AiChatSession session, String userCommand,
                                      StringBuilder thinkingContent, StringBuilder answerContent,
                                      List<Map<String, Object>> toolCallsList) {
        try {
            saveMessage(session.getId(), "assistant", answerContent.toString(),
                    toolCallsList.isEmpty() ? null : objectMapper.writeValueAsString(toolCallsList), null);

            saveOperationLog(userId, projectId, userCommand, thinkingContent.toString(),
                    toolCallsList, answerContent.toString(), null,
                    toolCallsList.isEmpty() ? "chat" : "auto_confirmed",
                    toolCallsList.isEmpty() ? null : objectMapper.writeValueAsString(toolCallsList),
                    "command");
        } catch (Exception e) {
            log.error("保存AI操作记录失败", e);
        }
        try {
            emitter.complete();
        } catch (IllegalStateException ignored) {
        }
    }

    private Long saveOperationLog(Long userId, Long projectId, String prompt, String aiThinking,
                                  List<Map<String, Object>> toolCalls, String aiOutput,
                                  String diffPreview, String userAction, String executedAction, String source) {
        try {
            AiOperationLog logEntry = new AiOperationLog();
            logEntry.setUserId(userId);
            logEntry.setProjectId(projectId);
            logEntry.setPrompt(prompt);
            logEntry.setAiThinking(aiThinking);
            logEntry.setToolCalls(toolCalls != null && !toolCalls.isEmpty() ? objectMapper.writeValueAsString(toolCalls) : null);
            logEntry.setAiOutput(aiOutput);
            logEntry.setDiffPreview(diffPreview);
            logEntry.setUserAction(userAction);
            logEntry.setExecutedAction(executedAction);
            logEntry.setSource(source);
            logEntry.setCreatedAt(LocalDateTime.now());
            aiOperationLogMapper.insert(logEntry);
            return logEntry.getId();
        } catch (Exception e) {
            log.error("保存AI操作日志失败", e);
            return null;
        }
    }

    private void updateOperationLog(Long operationId, String userAction, String executedAction) {
        AiOperationLog logEntry = aiOperationLogMapper.selectById(operationId);
        if (logEntry != null) {
            logEntry.setUserAction(userAction);
            logEntry.setExecutedAction(executedAction);
            aiOperationLogMapper.updateById(logEntry);
        }
    }

    private String callLlmSync(String prompt) {
        try {
            List<Map<String, Object>> messages = new ArrayList<>();
            Map<String, Object> systemMsg = new HashMap<>();
            systemMsg.put("role", "system");
            systemMsg.put("content", "你是AI任务助手，请严格按照要求的JSON格式返回结果，不要包含其他内容。");
            messages.add(systemMsg);

            Map<String, Object> userMsg = new HashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", prompt);
            messages.add(userMsg);

            ObjectNode body = objectMapper.createObjectNode();
            body.put("model", aiLlmConfig.getLlm().getModel());
            body.put("temperature", aiLlmConfig.getLlm().getTemperature());
            body.put("max_tokens", aiLlmConfig.getLlm().getMaxTokens());
            body.put("stream", false);
            body.set("messages", objectMapper.valueToTree(messages));

            String response = aiWebClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode responseNode = objectMapper.readTree(response);
            JsonNode choices = responseNode.get("choices");
            if (choices != null && !choices.isEmpty()) {
                return choices.get(0).get("message").get("content").asText();
            }
            return null;
        } catch (Exception e) {
            log.error("同步调用LLM失败", e);
            throw new com.ai.taskboard.common.exception.BusinessException("AI服务调用失败");
        }
    }

    private SuggestTagsVO parseSuggestTagsResponse(String response) {
        try {
            String json = extractJson(response);
            return objectMapper.readValue(json, SuggestTagsVO.class);
        } catch (Exception e) {
            log.error("解析标签推荐响应失败: {}", response, e);
            SuggestTagsVO vo = new SuggestTagsVO();
            vo.setSuggestedTags(List.of());
            return vo;
        }
    }

    private SuggestEffortVO parseSuggestEffortResponse(String response) {
        try {
            String json = extractJson(response);
            return objectMapper.readValue(json, SuggestEffortVO.class);
        } catch (Exception e) {
            log.error("解析工时估算响应失败: {}", response, e);
            SuggestEffortVO vo = new SuggestEffortVO();
            SuggestEffortVO.EffortEstimate estimate = new SuggestEffortVO.EffortEstimate();
            estimate.setMin(0.0);
            estimate.setMax(0.0);
            estimate.setReason("解析失败");
            vo.setEstimatedHours(estimate);
            return vo;
        }
    }

    private SuggestAssigneeVO parseSuggestAssigneeResponse(String response) {
        try {
            String json = extractJson(response);
            return objectMapper.readValue(json, SuggestAssigneeVO.class);
        } catch (Exception e) {
            log.error("解析负责人推荐响应失败: {}", response, e);
            SuggestAssigneeVO vo = new SuggestAssigneeVO();
            vo.setSuggestedAssignee(List.of());
            return vo;
        }
    }

    private GenerateSummaryVO parseGenerateSummaryResponse(String response) {
        try {
            String json = extractJson(response);
            return objectMapper.readValue(json, GenerateSummaryVO.class);
        } catch (Exception e) {
            log.error("解析摘要生成响应失败: {}", response, e);
            GenerateSummaryVO vo = new GenerateSummaryVO();
            vo.setSummary(response != null ? response : "生成摘要失败");
            return vo;
        }
    }

    private String extractJson(String text) {
        if (text == null) return "{}";
        text = text.trim();
        if (text.startsWith("```json")) {
            text = text.substring(7);
        } else if (text.startsWith("```")) {
            text = text.substring(3);
        }
        if (text.endsWith("```")) {
            text = text.substring(0, text.length() - 3);
        }
        text = text.trim();
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        return text;
    }

    private double calculateLoadBalance(Map<Long, Long> assigneeTaskCount) {
        if (assigneeTaskCount.isEmpty()) return 100.0;
        if (assigneeTaskCount.size() == 1) return 50.0;

        double mean = assigneeTaskCount.values().stream().mapToLong(Long::longValue).average().orElse(0.0);
        if (mean == 0) return 100.0;

        double variance = assigneeTaskCount.values().stream()
                .mapToDouble(count -> Math.pow(count - mean, 2))
                .average().orElse(0.0);
        double stdDev = Math.sqrt(variance);
        double cv = stdDev / mean;

        return Math.max(0, Math.min(100, 100 - cv * 100));
    }

    private ProjectHealthVO.HealthDimension buildDimension(String name, double score, String label) {
        ProjectHealthVO.HealthDimension dim = new ProjectHealthVO.HealthDimension();
        dim.setName(name);
        dim.setScore(Math.round(score * 10.0) / 10.0);
        dim.setLabel(label);
        return dim;
    }

    @Override
    public AIChatResponse chat(Long userId, AIChatRequest request) {
        try {
            List<Map<String, Object>> messages = new ArrayList<>();

            String systemContent;
            Long projectId = request.getProjectId();
            if (projectId != null) {
                systemContent = buildChatSystemPrompt(userId, projectId);
            } else {
                systemContent = buildGenericSystemPrompt(userId);
            }

            Map<String, Object> systemMsg = new HashMap<>();
            systemMsg.put("role", "system");
            systemMsg.put("content", systemContent);
            messages.add(systemMsg);

            Map<String, Object> userMsg = new HashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", request.getPrompt());
            messages.add(userMsg);

            ObjectNode body = objectMapper.createObjectNode();
            body.put("model", aiLlmConfig.getLlm().getModel());
            body.put("temperature", aiLlmConfig.getLlm().getTemperature());
            body.put("max_tokens", aiLlmConfig.getLlm().getMaxTokens());
            body.put("stream", false);
            body.set("messages", objectMapper.valueToTree(messages));

            String response = aiWebClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode responseNode = objectMapper.readTree(response);
            JsonNode choices = responseNode.get("choices");
            String answer = "抱歉，我暂时无法回答这个问题。";
            if (choices != null && !choices.isEmpty()) {
                answer = choices.get(0).get("message").get("content").asText();
            }

            return AIChatResponse.builder()
                    .response(answer)
                    .build();
        } catch (Exception e) {
            log.error("AI聊天调用失败", e);
            return AIChatResponse.builder()
                    .response("抱歉，AI服务暂时不可用，请稍后重试。")
                    .build();
        }
    }

    private String buildChatSystemPrompt(Long userId, Long projectId) {
        Project project = projectMapper.selectById(projectId);
        String projectName = project != null ? project.getName() : "未知项目";

        List<Task> tasks = taskMapper.selectList(
                new LambdaQueryWrapper<Task>().eq(Task::getProjectId, projectId).last("LIMIT 50"));
        StringBuilder taskSummary = new StringBuilder();
        for (Task t : tasks) {
            taskSummary.append("- [").append(t.getStatus()).append("] ").append(t.getTitle())
                    .append(" (优先级:").append(t.getPriority()).append(")").append("\n");
        }

        List<ProjectMember> members = projectMemberMapper.selectList(
                new LambdaQueryWrapper<ProjectMember>().eq(ProjectMember::getProjectId, projectId));
        StringBuilder memberSummary = new StringBuilder();
        for (ProjectMember pm : members) {
            User u = userMapper.selectById(pm.getUserId());
            if (u != null) {
                memberSummary.append("- ").append(u.getNickname()).append(" (角色:").append(pm.getRole()).append(")").append("\n");
            }
        }

        User currentUser = userMapper.selectById(userId);
        String userName = currentUser != null ? currentUser.getNickname() : "用户";

        return "你是AI智能助手，专为Agentic Workspace任务管理平台设计。当前用户：" + userName + "。\n" +
                "当前项目ID：" + projectId + "，项目名称：" + projectName + "\n" +
                "项目任务列表：\n" + taskSummary + "\n" +
                "项目成员：\n" + memberSummary + "\n" +
                "你可以帮助用户解答关于项目的问题、分析任务进展、提供建议等。" +
                "请根据项目上下文给出具体、有针对性的回答。" +
                "请用友好、专业的中文回复用户的问题。";
    }

    private String buildGenericSystemPrompt(Long userId) {
        User currentUser = userMapper.selectById(userId);
        String userName = currentUser != null ? currentUser.getNickname() : "用户";

        return "你是AI智能助手，专为Agentic Workspace任务管理平台设计。当前用户：" + userName + "。\n" +
                "你可以帮助用户解答问题、分析项目、提供建议等。如果用户询问具体项目问题，请提醒用户先进入项目再提问，这样你可以提供更精准的回答。" +
                "请用友好、专业的中文回复用户的问题。";
    }
}
