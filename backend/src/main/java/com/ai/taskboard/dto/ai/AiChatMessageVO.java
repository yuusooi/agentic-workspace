package com.ai.taskboard.dto.ai;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class AiChatMessageVO {
    private Long id;
    private Long sessionId;
    private String role;
    private String content;
    private Object toolCalls;
    private Object references;
    private LocalDateTime createdAt;
}
