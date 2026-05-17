package com.ai.taskboard.service;

import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.dto.ai.AiChatSessionDetailVO;
import com.ai.taskboard.dto.ai.AiChatSessionVO;

public interface AiChatService {
    PageResult<AiChatSessionVO> getChatSessions(Long userId, Integer page, Integer size);
    AiChatSessionDetailVO getChatSessionDetail(Long userId, Long sessionId);
    void deleteChatSession(Long userId, Long sessionId);
}
