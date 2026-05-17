package com.ai.taskboard.dto.ai;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class AiOperationLogVO {
    private Long id;
    private Long userId;
    private String userName;
    private String prompt;
    private String aiThinking;
    private Object toolCalls;
    private String aiOutput;
    private Object diffPreview;
    private String userAction;
    private Object executedAction;
    private LocalDateTime createdAt;
}
