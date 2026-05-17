package com.ai.taskboard.dto.ai;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class AiChatSessionVO {
    private Long id;
    private Long userId;
    private Long projectId;
    private String title;
    private LocalDateTime createdAt;
    private Integer messageCount;
}
