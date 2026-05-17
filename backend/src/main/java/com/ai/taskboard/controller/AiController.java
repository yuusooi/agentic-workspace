package com.ai.taskboard.controller;

import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.common.result.Result;
import com.ai.taskboard.common.util.UserContext;
import com.ai.taskboard.dto.ai.*;
import com.ai.taskboard.service.AiChatService;
import com.ai.taskboard.service.AiOperationLogService;
import com.ai.taskboard.service.AiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Tag(name = "AI助手接口")
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final AiChatService aiChatService;
    private final AiOperationLogService aiOperationLogService;

    @Operation(summary = "发送AI命令（SSE流式）")
    @PostMapping("/command")
    public SseEmitter sendCommand(@Valid @RequestBody CommandRequest request) {
        return aiService.sendCommand(UserContext.getUserId(), request);
    }

    @Operation(summary = "确认AI操作")
    @PostMapping("/confirm")
    public Result<Void> confirmAction(@Valid @RequestBody ConfirmRequest request) {
        aiService.confirmAction(UserContext.getUserId(), request);
        return Result.success();
    }

    @Operation(summary = "推荐标签")
    @PostMapping("/suggest/tags")
    public Result<SuggestTagsVO> suggestTags(@Valid @RequestBody SuggestRequest request) {
        return Result.success(aiService.suggestTags(UserContext.getUserId(), request));
    }

    @Operation(summary = "估算工时")
    @PostMapping("/suggest/effort")
    public Result<SuggestEffortVO> suggestEffort(@Valid @RequestBody SuggestRequest request) {
        return Result.success(aiService.suggestEffort(UserContext.getUserId(), request));
    }

    @Operation(summary = "推荐负责人")
    @PostMapping("/suggest/assignee")
    public Result<SuggestAssigneeVO> suggestAssignee(@Valid @RequestBody SuggestRequest request) {
        return Result.success(aiService.suggestAssignee(UserContext.getUserId(), request));
    }

    @Operation(summary = "生成摘要")
    @PostMapping("/summary")
    public Result<GenerateSummaryVO> generateSummary(@Valid @RequestBody SuggestRequest request) {
        return Result.success(aiService.generateSummary(UserContext.getUserId(), request));
    }

    @Operation(summary = "获取聊天会话列表")
    @GetMapping("/chat-sessions")
    public Result<PageResult<AiChatSessionVO>> getChatSessions(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(aiChatService.getChatSessions(UserContext.getUserId(), page, size));
    }

    @Operation(summary = "获取聊天会话详情")
    @GetMapping("/chat-sessions/{id}")
    public Result<AiChatSessionDetailVO> getChatSessionDetail(@PathVariable Long id) {
        return Result.success(aiChatService.getChatSessionDetail(UserContext.getUserId(), id));
    }

    @Operation(summary = "删除聊天会话")
    @DeleteMapping("/chat-sessions/{id}")
    public Result<Void> deleteChatSession(@PathVariable Long id) {
        aiChatService.deleteChatSession(UserContext.getUserId(), id);
        return Result.success();
    }

    @Operation(summary = "获取AI操作日志")
    @GetMapping("/logs")
    public Result<PageResult<AiOperationLogVO>> getOperationLogs(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(aiOperationLogService.getOperationLogs(UserContext.getUserId(), page, size));
    }

    @Operation(summary = "AI聊天问答")
    @PostMapping("/chat")
    public Result<AIChatResponse> chat(@RequestBody AIChatRequest request) {
        return Result.success(aiService.chat(UserContext.getUserId(), request));
    }
}
