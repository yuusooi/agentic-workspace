package com.ai.taskboard.service;

import com.ai.taskboard.dto.ai.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public interface AiService {
    SseEmitter sendCommand(Long userId, CommandRequest request);
    void confirmAction(Long userId, ConfirmRequest request);
    SuggestTagsVO suggestTags(Long userId, SuggestRequest request);
    SuggestEffortVO suggestEffort(Long userId, SuggestRequest request);
    SuggestAssigneeVO suggestAssignee(Long userId, SuggestRequest request);
    GenerateSummaryVO generateSummary(Long userId, SuggestRequest request);
    SseEmitter streamProjectHealth(Long userId, Long projectId);
    AIChatResponse chat(Long userId, AIChatRequest request);
}
